/**
 * API Route: Analyze Face
 * Ported from Supabase Edge Function: analyze-face
 * 
 * Handles face/dental analysis and smile validation using Google Gemini API.
 * Modes: 'validate' (pre-check) and 'analyze' (full analysis with prompts).
 */
import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { storage } from '@/lib/storage';

const corsHeaders = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
    'Access-Control-Allow-Methods': 'POST, OPTIONS',
};

export async function OPTIONS() {
    return new NextResponse('ok', { headers: corsHeaders, status: 200 });
}

export async function POST(req: NextRequest) {
    try {
        console.log("[analyze-face] ===== REQUEST RECEIVED =====");

        const body = await req.json();
        const { image_base64, image_path, mode = 'analyze' } = body;

        console.log("[analyze-face] Mode:", mode);
        console.log("[analyze-face] Has image_path:", !!image_path);
        console.log("[analyze-face] Has image_base64:", !!image_base64);

        const apiKey = process.env.GOOGLE_API_KEY;
        if (!apiKey) throw new Error('GOOGLE_API_KEY not configured');

        // Get image data
        let imageBase64 = image_base64;

        if (!imageBase64 && image_path) {
            console.log("[analyze-face] Downloading image from path:", image_path);
            const buffer = await storage.downloadFileAsBuffer('uploads', image_path);
            imageBase64 = buffer.toString('base64');
            console.log("[analyze-face] base64 length after download:", imageBase64.length);
        }

        if (!imageBase64) {
            throw new Error('Image path or Base64 data is required');
        }

        // Choose prompt based on mode
        const prompt = mode === 'validate'
            ? getValidationPrompt()
            : getAnalysisPrompt();

        // Call Gemini API
        const endpoint = `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent?key=${apiKey}`;

        console.log("[analyze-face] Calling Gemini API...");

        const geminiBody = {
            contents: [{
                parts: [
                    { text: prompt },
                    { inlineData: { mimeType: 'image/jpeg', data: imageBase64 } }
                ]
            }],
            generationConfig: {
                responseMimeType: 'application/json'
            }
        };

        const response = await fetch(endpoint, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(geminiBody)
        });

        console.log("[analyze-face] Gemini Response Status:", response.status);

        if (!response.ok) {
            const errText = await response.text();
            console.error('[analyze-face] Gemini API Error:', errText);
            throw new Error(`Gemini API Error (${response.status}): ${errText}`);
        }

        const data = await response.json();

        // Extract text from response
        const analysisText = data.candidates?.[0]?.content?.parts?.[0]?.text;
        console.log("[analyze-face] analysisText present:", !!analysisText);

        if (!analysisText) {
            console.error("[analyze-face] Empty response from AI. Full result:", JSON.stringify(data));
            throw new Error('Empty response from AI');
        }

        // Parse JSON response
        let analysisJson;
        try {
            const cleanText = analysisText.replace(/```json/g, '').replace(/```/g, '').trim();
            analysisJson = JSON.parse(cleanText);
            console.log("[analyze-face] JSON parsed OK. Keys:", Object.keys(analysisJson));
        } catch {
            console.error("[analyze-face] JSON parse failed. Raw text:", analysisText);
            throw new Error('Invalid JSON from AI Analysis');
        }

        // If validate mode, return directly
        if (mode === 'validate') {
            return NextResponse.json(analysisJson, { headers: corsHeaders });
        }

        // If analysis mode, store result and return safe version
        console.log("[analyze-face] Saving to DB...");
        const analysisRow = await db.insertReturning(
            `INSERT INTO analysis_results (lead_id, result)
             VALUES ($1, $2)
             RETURNING id`,
            [null, JSON.stringify(analysisJson)]
        );

        const analysisId = analysisRow.id;
        console.log("[analyze-face] DB insert OK. analysis_id:", analysisId);

        // Return safe analysis — strip sensitive prompt data from client response
        const safeAnalysis = {
            analysis_id: analysisId,
            variations: analysisJson.variations.map((v: any) => ({
                type: v.type,
                prompt_data: {
                    Subject: v.prompt_data.Subject,
                    Editing_Instructions: null,
                    Refining_Details: null,
                    Reference_Instructions: null,
                    Style: v.prompt_data.Style,
                    Location: v.prompt_data.Location,
                }
            }))
        };

        console.log("[analyze-face] Returning safeAnalysis. variations count:", safeAnalysis.variations.length);
        console.log("[analyze-face] ===== REQUEST COMPLETE =====");

        return NextResponse.json(safeAnalysis, { headers: corsHeaders });

    } catch (error: any) {
        console.error('[analyze-face] Error:', error);
        return NextResponse.json(
            { error: error.message },
            { headers: corsHeaders, status: 400 }
        );
    }
}

function getValidationPrompt(): string {
    return `You are a Strict Biometric Validator for a dental AI app. Analyze the image and determine if it is suitable for clinical smile design.
            
THE RULES (Rejection Criteria):
1. Non-Human: Reject cars, animals, cartoons, landscapes, objects. MUST BE A REAL HUMAN.
2. No Face: Reject if face is not clearly visible or too far away.
3. Obstruction: Reject if mouth is covered (hands, mask, phone).
4. Angle: Reject extreme profiles.
5. Quality: Reject if too dark, too blurry, or pixelated.

OUTPUT REQUIREMENT:
Return ONLY a JSON object.
{
  "is_valid": boolean,
  "rejection_reason": "string (Max 6 words, in Spanish)"
}`;
}

function getAnalysisPrompt(): string {
    return `ROLE: Expert Dental Morphologist, Prosthodontist, and AI Prompt Engineer.
TASK: Perform a comprehensive facial and dental analysis to design a clinically accurate smile restoration.

SCIENTIFIC ANALYSIS PARAMETERS (The "Secret Sauce"):

1.  **Existing Dentition Inventory (Partial Restoration Strategy):**
    - **Analyze:** Identify which teeth are PRESENT and which are MISSING/BROKEN.
    - **RULE:** Do NOT replace valid biological structure if it's healthy. The goal is INTEGRATION.
    - **Gap Assessment:** Specifically target edentulous spaces (missing teeth) for generation.

2.  **Advanced VITA Shade Analysis (Full Classical Scale):**
    - **CONTEXT:** The user wants a NATURAL restorative look, not "Hollywood White".
    - **VITA CLASSICAL GUIDE REFERENCE:**
        - **Group A (Reddish-Brownish):** A1, A2, A3, A3.5, A4 (The most common natural shades).
        - **Group B (Reddish-Yellowish):** B1, B2, B3, B4.
        - **Group C (Greyish):** C1, C2, C3, C4.
        - **Group D (Reddish-Grey):** D2, D3, D4.
        - **Bleach (Forbidden unless naturally bright):** OM1, OM2, OM3, BL1-4.
    - **ALGORITHM:**
        1. **Detect** the current shade of existing teeth (e.g., "A3.5").
        2. **Select** a target shade that is **1 or 2 steps brighter** (Value) but maintains the same **Hue Family** (e.g., "A3.5" -> "A3" or "A2"). 
        3. **PROHIBITION:** Do NOT jump from A3.5 to OM1. Do NOT produce opaque "toilet bowl white".
        4. **Output:** "Detected: [Shade], Target: [Shade]".

3.  **Dental Proportions (Golden Proportion & W/L Ratio):**
    - **Central Incisors:** Must have a Width-to-Length ratio of **75-80%**. 
    - **Golden Progression:** Visible width of Lateral must be 62% of Central.
    - **Axis:** Long axis must incline slightly distally.

4.  **Gingival Architecture (Pink Esthetics):**
    - **Zenith Points:** High-scalloped, class II (distal) zeniths.
    - **Texture:** Stippled pink gingiva. Pointed papillae filling embrasures.

5.  **Smile Arc & Consonance:**
    - **CRITICAL RULE:** The incisal edges must form a convex curve parallel to the lower lip.

OUTPUT FORMAT: Strictly JSON.
Structure:
{
    "variations": [
        { 
            "type": "original_bg" | "lifestyle_social" | "lifestyle_outdoor",
            "prompt_data": { 
                "Subject": string, 
                "Composition": string, 
                "Action": string, 
                "Location": string, 
                "Style": string, 
                "Editing_Instructions": string, 
                "Refining_Details": string, 
                "Reference_Instructions": string,
                "Clinical_Justification": string 
            } 
        }
    ]
}

REQUIRED VARIATIONS & GUIDELINES:

1. original_bg (Scientific Natural Restoration):
- Subject: "A photorealistic professional portrait of the user with a biologically integrated natural smile."
- Composition: "Identical to the input image. Ensure the full head and shoulders are visible exactly as in the original."
- Action: "Smiling naturally."
- Location: "Original background."
- Style: "High-end Portrait Photography, 8K, Soft Studio Lighting."
- Editing_Instructions: "Restoration Strategy: NATURAL INTEGRATION."
- Refining_Details: "Texture must match the user's natural enamel. NO OPAQUE WHITE."
- Reference_Instructions: "Maintain facial identity and ORIGINAL FRAMING strictly."
- Clinical_Justification: "Detected natural shade. Applied target shade for natural brightness improvement."

2. lifestyle_social:
- Subject: "The user in a high-end social context."
- Action: "Laughing candidly."
- Style: "Candid Event Photography, Flash."
- Editing_Instructions: "Same integrated smile, exposed in a dynamic laugh."

3. lifestyle_outdoor:
- Subject: "The user in natural lighting."
- Action: "Confident smile."
- Style: "Golden Hour Portrait."
- Editing_Instructions: "Same integrated smile, natural light reflection."`;
}
