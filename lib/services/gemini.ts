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

/**
 * Get the base URL for internal API calls.
 * In production, this resolves to the app's own URL.
 */
function getApiBaseUrl(): string {
    // Use NEXTAUTH_URL or APP_URL for server-side calls
    const appUrl = process.env.NEXTAUTH_URL || process.env.APP_URL || 'http://localhost:3000';
    return appUrl;
}

// Gatekeeper
export const validateImageStrict = async (base64Image: string): Promise<ServiceResult<{ isValid: boolean; reason: string }>> => {
    console.log("[Gemini] ENTRY: validateImageStrict called (Self-Hosted API).");
    if (!base64Image) {
        return { success: false, error: "Error: Imagen vacía o corrupta." };
    }

    try {
        const data = stripBase64Prefix(base64Image);
        const API_BASE = getApiBaseUrl();

        const response = await fetch(`${API_BASE}/api/ai/analyze`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                image_base64: data,
                mode: 'validate'
            })
        });

        if (!response.ok) {
            const errText = await response.text();
            console.error("API Error:", errText);
            const friendlyError = translateGeminiError(errText || response.status);
            return {
                success: false,
                error: friendlyError.message,
                errorDetails: friendlyError
            };
        }

        const resultKey = await response.json();
        console.log("[Gemini] API Response:", resultKey);

        if (resultKey) {
            await logAudit('AI_VALIDATION_RESULT', {
                mode: 'validate',
                is_valid: resultKey.is_valid,
                reason: resultKey.rejection_reason
            });
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
        console.error("[Gatekeeper] Error:", error);
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
    console.log("[Gemini] ENTRY: analyzeImageAndGeneratePrompts called (Self-Hosted API).");
    try {
        const file = formData.get('file');
        const imageUrl = formData.get('imageUrl') as string;
        const imagePath = formData.get('imagePath') as string;

        let data = "";

        // PRIORITY 1: if internal path exists, we don't need to send base64 data!
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

        const API_BASE = getApiBaseUrl();

        const response = await fetch(`${API_BASE}/api/ai/analyze`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                image_path: imagePath,
                image_base64: data || undefined,
                mode: 'analyze'
            })
        });

        if (!response.ok) {
            const errText = await response.text();
            console.error("API Error:", errText);
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

        // Safe JSON Parse
        const cleanText = rawText.replace(/```json/g, '').replace(/```/g, '').trim();
        let result: AnalysisResponse | null = null;
        try {
            result = JSON.parse(cleanText);
        } catch {
            console.error("[Gemini] JSON Parse Failed. Text:", cleanText.slice(0, 100));
        }

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
    console.log("[Gemini] generateSmileVariation STARTED (Self-Hosted API)");

    try {
        const file = formData.get('file');
        const imageUrl = formData.get('imageUrl') as string;
        const imagePath = formData.get('imagePath') as string;
        const variationPrompt = formData.get('variationPrompt') as string;
        const aspectRatio = (formData.get('aspectRatio') as any) || "1:1";
        const userId = formData.get('userId') as string || "anon";
        const analysisId = formData.get('analysisId') as string;
        const variationType = formData.get('variationType') as string;

        let data = "";

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

        const API_BASE = getApiBaseUrl();

        const response = await fetch(`${API_BASE}/api/ai/smile`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                image_path: imagePath,
                image_base64: data || undefined,
                prompt_options: {
                    variationPrompt,
                    aspectRatio,
                    analysis_id: analysisId,
                    type: variationType
                }
            })
        });

        if (!response.ok) {
            const errText = await response.text();
            console.error("API Error:", errText);

            let errorMessage = errText;
            try {
                const errJson = JSON.parse(errText);
                if (errJson.error) errorMessage = errJson.error;
            } catch { /* Fallback to raw text */ }

            const friendlyError = translateGeminiError(errorMessage || response.status);
            return {
                success: false,
                error: friendlyError.message,
                errorDetails: friendlyError
            };
        }

        const result = await response.json();
        console.log("[Gemini] API Response:", result);
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
