import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

Deno.serve(async (req) => {
    if (req.method === 'OPTIONS') {
        return new Response('ok', { headers: corsHeaders })
    }

    try {
        try {
            const { image_path, image_base64, mode = 'analyze' } = await req.json()

            if (!image_path && !image_base64) {
                throw new Error('Image path or Base64 data is required')
            }

            // Initialize Supabase Client
            const supabaseUrl = Deno.env.get('SUPABASE_URL') ?? ''
            const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
            const supabase = createClient(supabaseUrl, supabaseKey)

            let base64Image = image_base64;

            // If no base64 provided, download from Storage
            if (!base64Image && image_path) {
                const { data: fileData, error: downloadError } = await supabase
                    .storage
                    .from('uploads') // Assuming 'uploads' bucket
                    .download(image_path)

                if (downloadError) {
                    throw new Error(`Failed to download image: ${downloadError.message}`)
                }
                // Convert to Base64
                const arrayBuffer = await fileData.arrayBuffer()
                base64Image = btoa(String.fromCharCode(...new Uint8Array(arrayBuffer)))
            }

            // Prepare Gemini Request
            const apiKey = Deno.env.get('GOOGLE_API_KEY')
            if (!apiKey) {
                throw new Error("GOOGLE_API_KEY is not configured")
            }

            // Use Gemini 2.0 Flash (Verified Working)
            const endpoint = `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent?key=${apiKey}`

            let prompt = "";

            if (mode === 'validate') {
                prompt = `
            You are a Strict Biometric Validator for a dental AI app. Analyze the image and determine if it is suitable for clinical smile design.
            
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
            }
          `;
            } else {
                // "analyze" mode - Needs to return the Restoration Plan with Variations
                // "analyze" mode - Needs to return the Restoration Plan with Variations
                prompt = `
            ROLE: Expert Dental Morphologist, Prosthodontist, and AI Prompt Engineer.
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
            - Editing_Instructions: "Restoration Strategy: NATURAL INTEGRATION. \n1. VITA SHADE: Apply [Target Shade]. \n2. EXISTING TEETH: Conserve healthy structure exactly. \n3. MISSING UNITS: Generate photorealistic teeth in [Target Shade]. \n4. GINGIVA: Restore pink esthetics only where missing."
            - Refining_Details: "Texture must match the user's natural enamel. NO OPAQUE WHITE. The goal is a natural, seamless restoration that preserves facial identity."
            - Reference_Instructions: "Maintain facial identity and ORIGINAL FRAMING strictly. DO NOT ZOOM IN ON THE DENTITION."
            - Clinical_Justification: "Detected natural shade [Detected Shade]. Applied [Target Shade] for natural brightness improvement (Max 2 steps)."

            2. lifestyle_social:
            - Subject: "The user in a high-end social context."
            - Action: "Laughing candidly."
            - Style: "Candid Event Photography, Flash."
            - Editing_Instructions: "Same integrated smile, exposed in a dynamic laugh."
            
            3. lifestyle_outdoor:
            - Subject: "The user in natural lighting."
            - Action: "Confident smile."
            - Style: "Golden Hour Portrait."
            - Editing_Instructions: "Same integrated smile, natural light reflection."
            `;
            }

            console.log("--- ANALYZE FACE PROMPT DEBUG ---");
            console.log(prompt);
            console.log("--------------------------------");
            console.log("Calling Gemini API with endpoint:", endpoint);
            // console.log("Payload sent:", JSON.stringify(body, null, 2)); // Uncomment for full payload debug if needed

            const response = await fetch(endpoint, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({
                    contents: [{
                        parts: [
                            { text: prompt },
                            { inlineData: { mimeType: 'image/jpeg', data: base64Image } }
                        ]
                    }],
                    generationConfig: {
                        responseMimeType: "application/json"
                    }
                })
            })

            console.log("Gemini Response Status:", response.status);

            if (!response.ok) {
                const errText = await response.text()
                console.error("Gemini API Error Body:", errText);
                throw new Error(`Gemini API Error (${response.status}): ${errText}`)
            }

            const result = await response.json()
            const analysisText = result.candidates?.[0]?.content?.parts?.[0]?.text;

            // Ensure we handle cases where text might be missing or malformed
            if (!analysisText) {
                throw new Error("Empty response from AI")
            }

            // Parse the JSON to save it structured
            let analysisJson;
            try {
                // Remove markdown code blocks if present
                const cleanText = analysisText.replace(/```json/g, '').replace(/```/g, '').trim();
                analysisJson = JSON.parse(cleanText);
            } catch (e) {
                console.error("Failed to parse Gemini response as JSON:", analysisText);
                // Fallback: Save as raw text wrapped in object if parsing fails, but for this specific flow we expect JSON.
                // If it fails, we might just return the text as before, but we can't save it effectively or secure it.
                // We'll throw because the app expects JSON.
                throw new Error("Invalid JSON from AI Analysis");
            }

            // --- SAVE TO DB (Server-Side Caching) ---
            const { data: insertedData, error: dbError } = await supabase
                .from('analysis_results')
                .insert({
                    result: analysisJson,
                    // If we had a lead_id, we would save it here. For now it's anonymous/session-based until lead is created?
                    // The prompt doesn't send lead_id yet. It's fine for now.
                })
                .select('id')
                .single();

            if (dbError) {
                console.error("Failed to save analysis to DB:", dbError);
                // We can continue but we won't have an ID. 
                // However, the security requirement implies we MUST rely on the ID.
                throw new Error("Database Error: Failed to secure analysis session.");
            }

            const analysisId = insertedData.id;

            // --- SANITIZE RESPONSE ---
            // Create a safe version for the client (Removing the "Secret Sauce" prompts)
            const safeAnalysis = {
                analysis_id: analysisId, // Client needs this for the next step
                variations: analysisJson.variations.map((v: any) => ({
                    type: v.type,
                    // We keep the descriptive fields for the UI (if used) but REMOVE the instructions
                    prompt_data: {
                        Subject: v.prompt_data.Subject, // Maybe keep Subject if needed for UI title? Or remove if too revealing?
                        // "Subject" in the prompt is actually the full image description. It might contain "scientific aligned smile...".
                        // User wanted to hide "instructions". 
                        // Let's hide everything except what's needed for the UI cards.
                        // Does the UI display these text fields?
                        // Looking at the code, WidgetContainer might use them.
                        // Checking types... usually UI just shows "Natural", "Social", "Outdoor".
                        // Let's assume we only need the keys or simple labels.
                        // But to be safe, let's include non-instruction fields if they exist, or just null them.

                        // Masking critical proprietary instructions:
                        Editing_Instructions: null,
                        Refining_Details: null,
                        Reference_Instructions: null,

                        // Keep benign fields if used by UI for preview text
                        Style: v.prompt_data.Style,
                        Location: v.prompt_data.Location
                    }
                }))
            };

            return new Response(JSON.stringify(safeAnalysis), {
                headers: { ...corsHeaders, 'Content-Type': 'application/json' },
            })

        } catch (error) {
            return new Response(JSON.stringify({ error: error.message }), {
                headers: { ...corsHeaders, 'Content-Type': 'application/json' },
                status: 400,
            })
        }
    } catch (error) {
        return new Response(JSON.stringify({ error: error.message }), {
            headers: { ...corsHeaders, 'Content-Type': 'application/json' },
            status: 500,
        })
    }
})
