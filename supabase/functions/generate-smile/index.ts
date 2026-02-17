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
        const { image_path, image_base64, analysisAsync, prompt_options } = await req.json()
        if (!image_path && !image_base64) throw new Error('Image path or Base64 data is required')

        // Initialize Supabase
        const supabaseUrl = Deno.env.get('SUPABASE_URL') ?? ''
        const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
        const supabase = createClient(supabaseUrl, supabaseKey)

        let base64Image = image_base64;

        if (!base64Image && image_path) {
            // Download original image
            const { data: fileData, error: downloadError } = await supabase.storage.from('uploads').download(image_path)
            if (downloadError) throw new Error(`Download failed: ${downloadError.message}`)

            const arrayBuffer = await fileData.arrayBuffer()
            base64Image = btoa(String.fromCharCode(...new Uint8Array(arrayBuffer)))
        }

        // --- PROMPT ENGINEERING STRATEGY ---
        let finalPrompt = "";

        // 1. Check for Secure Analysis ID (Proposed Optimized Flow)
        if (prompt_options?.analysis_id) {
            console.log(`Fetching secure prompt from DB: ${prompt_options.analysis_id}`);

            const { data: analysisRecord, error: dbError } = await supabase
                .from('analysis_results')
                .select('result')
                .eq('id', prompt_options.analysis_id)
                .single();

            if (dbError || !analysisRecord) {
                throw new Error("Security Error: Invalid or expired Analysis ID.");
            }

            // Find the requested variation (e.g. "original_bg")
            // The client sends `variationPrompt` which currently might be just the 'Subject' string or the type.
            // We need to know WHICH variation type validation to pick.
            // Let's assume `prompt_options.variation_type` is passed, or we infer it.
            // If `variationPrompt` contains the type name (e.g. "original_bg")...
            // Or we check `prompt_options.type`.

            // Fallback: If the client passes the "Subject" text that matches one of the variations...
            // Ideally, client should send `type: 'original_bg'`.
            // Let's assume `prompt_options.type` exists (we will add it to client).
            // If not, default to 'original_bg'.
            const targetType = prompt_options.type || 'original_bg';

            const variation = analysisRecord.result.variations.find((v: any) => v.type === targetType);

            if (!variation) {
                console.warn(`Variation ${targetType} not found in analysis. Using first available.`); // Fallback
            }
            const promptData = variation ? variation.prompt_data : analysisRecord.result.variations[0].prompt_data;

            // --- CONSTRUCT FULL DEMO-QUALITY PROMPT ---
            // Combining all the rich instructions into one block.
            finalPrompt = `
                Perform a ${promptData.Composition} of ${promptData.Subject} ${promptData.Action} in a ${promptData.Location}.
                Style: ${promptData.Style}. 
                IMPORTANT EDITING INSTRUCTIONS: ${promptData.Editing_Instructions}
                ${promptData.Refining_Details || ''}
                ${promptData.Reference_Instructions || ''}
                
                TECHNICAL CONSTRAINTS:
                - CRITICAL: Maintain the EXACT framing, zoom, and distance of the original image.
                - DO NOT zoom in on the mouth; keep the full face/head visible exactly as in the reference.
                - Do NOT crop the head or change the background.
                - Replace ONLY the teeth area while keeping the rest of the face, skin texture, and features identical to the reference image.
                - The input image must be the absolute reference for identity and composition.
            `;

            console.log("--- SECURE GENERATE SMILE PROMPT ---");
            console.log(finalPrompt);
            console.log("------------------------------------");

        } else {
            // 2. Fallback to Old Insecure/Simple Flow (if no analysis_id provided)
            finalPrompt = `
              Subject: ${prompt_options?.variationPrompt || "Portrait of the user with a perfect, natural smile."}
              Important: Maintain the EXACT framing, zoom, angle, and background of the original image. Do NOT zoom in or out. Do NOT crop.
              Action: Smiling confidently with a perfect, natural smile.
              Style: Photorealistic, cinematic lighting, 8k resolution, dental aesthetic high quality.
              Editing Input: Replace only the teeth with high quality veneers, keeping the face structure, skin texture, and background exactly the same.
            `;
        }

        // Call Imaging API (Imagen 3.0 via Google AI Studio)
        const apiKey = Deno.env.get('GOOGLE_API_KEY')
        if (!apiKey) throw new Error("GOOGLE_API_KEY missing")

        // Use Imagen 3.0 for high-quality generation/editing
        const modelEndpoint = `https://generativelanguage.googleapis.com/v1beta/models/imagen-3.0-generate-001:predict?key=${apiKey}`

        console.log("Calling Google AI (Imagen 3) with endpoint:", modelEndpoint);

        const imagenBody = {
            instances: [
                {
                    prompt: finalPrompt,
                    image: {
                        bytesBase64Encoded: base64Image,
                        mimeType: "image/jpeg"
                    }
                }
            ],
            parameters: {
                sampleCount: 1,
                aspectRatio: "1:1" // Or try to detect from original
            }
        };

        const response = await fetch(modelEndpoint, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify(imagenBody)
        })

        console.log("Imagen 3 Response Status:", response.status);

        if (!response.ok) {
            const err = await response.text();
            console.error("Imagen 3 API Error Body:", err);
            throw new Error(`Imagen 3 API Failed (${response.status}): ${err}`)
        }

        const result = await response.json();

        // Imagen 3 returns predictions[0].bytesBase64Encoded or similar
        const prediction = result.predictions?.[0];
        let generatedBase64 = null;
        let mimeType = "image/jpeg";

        if (prediction) {
            generatedBase64 = prediction.bytesBase64Encoded || prediction.image?.bytesBase64Encoded;
            mimeType = prediction.mimeType || "image/jpeg";
        }

        if (!generatedBase64) {
            console.error("No image in prediction:", JSON.stringify(result));
            throw new Error("AI did not return an image. Check content safety filters or quota.");
        }

        // Upload to Supabase Storage
        const fileName = `smile_${Date.now()}_${Math.random().toString(36).substring(7)}.jpg`;
        const binaryString = atob(generatedBase64);
        const bytes = new Uint8Array(binaryString.length);
        for (let i = 0; i < binaryString.length; i++) {
            bytes[i] = binaryString.charCodeAt(i);
        }

        // Assuming 'generated' bucket exists and is public
        const { data: uploadData, error: uploadError } = await supabase
            .storage
            .from('generated')
            .upload(fileName, bytes, {
                contentType: mimeType,
                upsert: false
            });

        if (uploadError) {
            console.error("Upload failed:", uploadError);
            throw new Error(`Failed to upload generated image: ${uploadError.message}`);
        }

        const { data: { publicUrl } } = supabase
            .storage
            .from('generated')
            .getPublicUrl(fileName);

        // --- OPTIMIZATION: Fire-and-Forget Watermarking ---
        // We trigger the watermark function but DO NOT await it.
        // This allows the UI to get the result immediately.
        console.log("Triggering background watermark...");
        const watermarkUrl = `${Deno.env.get('SUPABASE_URL')}/functions/v1/watermark-image`;
        fetch(watermarkUrl, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${apiKey}` // Using Google Key as generic secret or better use service role if possible, but anon key works for invoked functions if RLS allows or we use internal
            },
            body: JSON.stringify({
                image_path: fileName,
                original_public_url: publicUrl
            })
        }).catch(err => console.error("Background watermark trigger failed:", err));

        return new Response(JSON.stringify({
            success: true,
            public_url: publicUrl
        }), {
            headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        })

    } catch (error) {
        console.error("Edge Function Error:", error);
        return new Response(JSON.stringify({
            success: false,
            error: error.message
        }), {
            headers: { ...corsHeaders, 'Content-Type': 'application/json' },
            status: 500, // Return 500 so client knows it failed
        })
    }
})
