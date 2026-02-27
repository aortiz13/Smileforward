'use server';

import { AnalysisResponse } from "@/types/gemini";
import { logApiUsage, logAudit } from "./backendService";
import { translateGeminiError } from "@/utils/errorTranslator";

interface ErrorDetail {
    title?: string;
    message: string;
    icon?: string;
}

type ServiceResult<T = undefined> = {
    success: boolean;
    data?: T;
    error?: string;
    errorDetails?: ErrorDetail;
};

const getErrorMessage = (error: unknown): string => {
    if (error instanceof Error) return error.message;
    if (typeof error === 'string') return error;
    return String(error);
};

// Helper to strip base64 prefix
const stripBase64Prefix = (base64: string): string => {
    return base64.replace(/^data:image\/(png|jpeg|jpg|webp);base64,/, '');
};

const getMimeType = (base64: string): string => {
    const match = base64.match(/^data:(image\/[a-zA-Z+]+);base64,/);
    return match ? match[1] : 'image/jpeg';
};

const delay = (ms: number) => new Promise(resolve => setTimeout(resolve, ms));

const isModelOverloaded = (error: unknown): boolean => {
    if (typeof error !== 'object' || error === null) return false;
    const e = error as Record<string, unknown>;
    const inner = (typeof e.error === 'object' && e.error !== null) ? e.error as Record<string, unknown> : null;
    const resp = (typeof e.response === 'object' && e.response !== null) ? e.response as Record<string, unknown> : null;
    return (
        e.status === 'UNAVAILABLE' ||
        e.code === 503 ||
        (typeof e.message === 'string' && e.message.includes('overloaded')) ||
        inner?.code === 503 ||
        inner?.status === 'UNAVAILABLE' ||
        resp?.status === 503
    );
};

// Robust Text Extractor for @google/genai SDK
const extractText = (response: Record<string, unknown>): string => {
    try {
        console.log("[Gemini] Raw Response Keys:", Object.keys(response));
        if (response.text) {
            if (typeof response.text === 'function') {
                return response.text();
            }
            if (typeof response.text === 'string') {
                return response.text;
            }
        }
        const candidates = response.candidates;
        if (Array.isArray(candidates) && candidates[0]) {
            const parts = (candidates[0] as Record<string, unknown>).content as Record<string, unknown> | undefined;
            const partsArr = parts?.parts;
            if (Array.isArray(partsArr) && partsArr[0]) {
                const part = partsArr[0] as Record<string, unknown>;
                if (typeof part.text === 'string') return part.text;
                const inlineData = part.inlineData as Record<string, unknown> | undefined;
                if (typeof inlineData?.data === 'string') return inlineData.data;
            }
        }
        return "";
    } catch (e) {
        console.error("[Gemini] Failed to extract text:", e);
        return "";
    }
};

// Safe JSON Parse
const safeParseJSON = (text: string) => {
    try {
        // Remove markdown code blocks if present
        const cleanText = text.replace(/```json/g, '').replace(/```/g, '').trim();
        return JSON.parse(cleanText);
    } catch (e) {
        console.error("[Gemini] JSON Parse Failed. Text:", text.slice(0, 100));
        return null;
    }
};

// Gatekeeper
export const validateImageStrict = async (base64Image: string): Promise<ServiceResult<{ isValid: boolean; reason: string }>> => {
    console.log("[Gemini] ENTRY: validateImageStrict called (Edge Function Delegate).");
    if (!base64Image) {
        return { success: false, error: "Error: Imagen vacía o corrupta." };
    }

    try {
        const data = stripBase64Prefix(base64Image);

        // Delegate to Supabase Edge Function
        // This keeps the API KEY secure in Supabase Secrets
        const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL;
        const SUPABASE_ANON_KEY = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY; // Or Service Role if prefered server-side

        if (!SUPABASE_URL || !SUPABASE_ANON_KEY) {
            console.error("Missing Supabase Configuration in Next.js Server Env");
            return { success: false, error: "Configuration Error: Supabase URL/Key missing." };
        }

        const response = await fetch(`${SUPABASE_URL}/functions/v1/analyze-face`, {
            method: 'POST',
            headers: {
                'Authorization': `Bearer ${SUPABASE_ANON_KEY}`,
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                image_base64: data,
                mode: 'validate'
            })
        });

        if (!response.ok) {
            const errText = await response.text();
            console.error("Edge Function Error:", errText);
            const friendlyError = translateGeminiError(errText || response.status);
            return {
                success: false,
                error: friendlyError.message,
                errorDetails: friendlyError
            };
        }

        const resultKey = await response.json();
        console.log("[Gemini] Edge Function Response:", resultKey);

        if (resultKey) {
            await logAudit('AI_VALIDATION_RESULT', {
                mode: 'validate',
                is_valid: resultKey.is_valid,
                reason: resultKey.rejection_reason
            });
            // Check keys returned by the specific 'validate' prompt
            // "is_valid": boolean, "rejection_reason": string
            return {
                success: true,
                data: {
                    isValid: !!resultKey.is_valid,
                    reason: resultKey.rejection_reason || ""
                }
            };
        }

        return { success: false, error: "Respuesta inválida del analizador." };

    } catch (error: unknown) {
        console.error("[Gatekeeper] Delegate Error:", error);
        const errMsg = getErrorMessage(error);
        await logAudit('AI_VALIDATION_ERROR', { error: errMsg });
        const friendlyError = translateGeminiError(errMsg);
        return {
            success: false,
            error: friendlyError.message,
            errorDetails: friendlyError
        };
    }
};

// Analysis
export const analyzeImageAndGeneratePrompts = async (formData: FormData): Promise<ServiceResult<AnalysisResponse>> => {
    console.log("[Gemini] ENTRY: analyzeImageAndGeneratePrompts called (Edge Function Delegate).");
    try {
        const file = formData.get('file');
        const imageUrl = formData.get('imageUrl') as string;
        const imagePath = formData.get('imagePath') as string; // New: Internal storage path

        let data = "";

        // PRIORITY 1: if internal path exists, we don't need to send base64 data!
        // The Edge function can download it directly.
        if (imagePath) {
            console.log("[Gemini] Using internal path for analysis:", imagePath);
        } else if (imageUrl && imageUrl.startsWith('http')) {
            console.log("[Gemini] Fetching image from URL for analysis:", imageUrl);
            const res = await fetch(imageUrl);
            const arrayBuffer = await res.arrayBuffer();
            data = Buffer.from(arrayBuffer).toString('base64');
        } else if (file instanceof File) {
            const arrayBuffer = await file.arrayBuffer();
            data = Buffer.from(arrayBuffer).toString('base64');
        } else {
            return { success: false, error: "Missing file, path or imageUrl in FormData" };
        }

        const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL;
        const SUPABASE_ANON_KEY = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

        if (!SUPABASE_URL || !SUPABASE_ANON_KEY) {
            return { success: false, error: "Configuration Error: Supabase URL/Key missing." };
        }

        const response = await fetch(`${SUPABASE_URL}/functions/v1/analyze-face`, {
            method: 'POST',
            headers: {
                'Authorization': `Bearer ${SUPABASE_ANON_KEY}`,
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                image_path: imagePath,
                image_base64: data || undefined,
                mode: 'analyze' // Default
            })
        });

        if (!response.ok) {
            const errText = await response.text();
            console.error("Edge Function Error:", errText);
            const friendlyError = translateGeminiError(errText || response.status);
            return {
                success: false,
                error: friendlyError.message,
                errorDetails: friendlyError
            };
        }


        const rawBody = await response.text();
        let text: unknown;
        try {
            text = JSON.parse(rawBody);
        } catch {
            text = rawBody;
        }

        const rawText = typeof text === 'string' ? text : JSON.stringify(text);

        await logAudit('AI_ANALYSIS_RESULT', { raw_text: rawText });
        await logApiUsage('GEMINI_VISION_ANALYSIS');
        const result = safeParseJSON(rawText) as AnalysisResponse;

        if (!result) {
            if (typeof text === 'object' && text !== null) {
                return { success: true, data: text as AnalysisResponse };
            }
            throw new Error("Invalid JSON from AI");
        }
        return { success: true, data: result };

    } catch (criticalError: unknown) {
        console.error("[Gemini Analysis] Fatal Error Details:", criticalError);
        const errMsg = getErrorMessage(criticalError);
        await logAudit('AI_ANALYSIS_ERROR', { error: errMsg });
        const friendlyError = translateGeminiError(errMsg);
        return {
            success: false,
            error: friendlyError.message,
            errorDetails: friendlyError
        };
    }
};

// Generate Smile Variation
export const generateSmileVariation = async (formData: FormData): Promise<ServiceResult<string>> => {
    console.log("[Gemini] generateSmileVariation STARTED (Edge Function Delegate)");

    try {
        const file = formData.get('file');
        const imageUrl = formData.get('imageUrl') as string;
        const imagePath = formData.get('imagePath') as string; // New: Internal storage path
        const variationPrompt = formData.get('variationPrompt') as string;
        const aspectRatio = (formData.get('aspectRatio') as any) || "1:1";
        const userId = formData.get('userId') as string || "anon";
        const analysisId = formData.get('analysisId') as string;
        const variationType = formData.get('variationType') as string;

        let data = "";

        // PRIORITY 1: if internal path exists, we don't need to send base64 data!
        if (imagePath) {
            console.log("[Gemini] Using internal path for generation:", imagePath);
        } else if (imageUrl && imageUrl.startsWith('http')) {
            console.log("[Gemini] Fetching image from URL for generation:", imageUrl);
            const res = await fetch(imageUrl);
            const arrayBuffer = await res.arrayBuffer();
            data = Buffer.from(arrayBuffer).toString('base64');
        } else if (file instanceof File) {
            const arrayBuffer = await file.arrayBuffer();
            data = Buffer.from(arrayBuffer).toString('base64');
        } else {
            return { success: false, error: "Missing file, path or imageUrl in FormData" };
        }

        const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL;
        const SUPABASE_ANON_KEY = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

        if (!SUPABASE_URL || !SUPABASE_ANON_KEY) {
            throw new Error("Configuration Error: Supabase URL/Key missing.");
        }

        const response = await fetch(`${SUPABASE_URL}/functions/v1/generate-smile`, {
            method: 'POST',
            headers: {
                'Authorization': `Bearer ${SUPABASE_ANON_KEY}`,
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                image_path: imagePath,
                image_base64: data || undefined,
                prompt_options: {
                    variationPrompt, // Fallback / UI Text
                    aspectRatio,
                    analysis_id: analysisId, // Pass the ID
                    type: variationType // Pass the type (e.g. 'original_bg')
                }
            })
        });

        if (!response.ok) {
            const errText = await response.text();
            console.error("Edge Function Error:", errText);

            // Attempt to extract JSON error message if present
            let errorMessage = errText;
            try {
                const errJson = JSON.parse(errText);
                if (errJson.error) errorMessage = errJson.error;
            } catch (e) { /* Fallback to raw text */ }

            const friendlyError = translateGeminiError(errorMessage || response.status);
            return {
                success: false,
                error: friendlyError.message,
                errorDetails: friendlyError
            };
        }

        const result = await response.json();
        console.log("[Gemini] Edge Function Response:", result);
        await logAudit('AI_SMILE_GENERATION_RESULT', { result });

        if (result.success && result.public_url) {
            return { success: true, data: result.public_url };
        }

        if (result.error) return { success: false, error: result.error };
        return { success: false, error: "Failed to generate smile variation." };

    } catch (criticalGenError: unknown) {
        console.error("[Gemini] FATAL ERROR in generateSmileVariation:", criticalGenError);
        const errMsg = getErrorMessage(criticalGenError);
        await logAudit('AI_SMILE_GENERATION_ERROR', { error: errMsg });
        const friendlyError = translateGeminiError(errMsg);
        return {
            success: false,
            error: friendlyError.message,
            errorDetails: friendlyError
        };
    }
};
