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
            const { data: fileData, error: downloadError } = await supabase.storage.from('uploads').download(image_path)
            if (downloadError) throw new Error(`Download failed: ${downloadError.message}`)

            const arrayBuffer = await fileData.arrayBuffer()
            base64Image = btoa(String.fromCharCode(...new Uint8Array(arrayBuffer)))
        }

        // --- PROMPT ENGINEERING STRATEGY ---
        let finalPrompt = "";

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

            const targetType = prompt_options.type || 'original_bg';
            const variation = analysisRecord.result.variations.find((v: any) => v.type === targetType);

            if (!variation) {
                console.warn(`Variation ${targetType} not found in analysis. Using first available.`);
            }
            const promptData = variation ? variation.prompt_data : analysisRecord.result.variations[0].prompt_data;

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
                - vertical portrait, full face visible, do not crop head.
            `;

            console.log("--- SECURE GENERATE SMILE PROMPT ---");
            console.log(finalPrompt);
            console.log("------------------------------------");

        } else {
            finalPrompt = `
              Subject: ${prompt_options?.variationPrompt || "Portrait of the user with a perfect, natural smile."}
              Important: Maintain the EXACT framing, zoom, angle, and background of the original image. Do NOT zoom in or out. Do NOT crop.
              Action: Smiling confidently with a perfect, natural smile.
              Style: Photorealistic, cinematic lighting, 8k resolution, dental aesthetic high quality.
              Editing Input: Replace only the teeth with high quality veneers, keeping the face structure, skin texture, and background exactly the same.
              - vertical portrait, full face visible, do not crop head.
            `;
        }

        const apiKey = Deno.env.get('GOOGLE_API_KEY')
        if (!apiKey) throw new Error("GOOGLE_API_KEY missing")

        const geminiBody = {
            contents: [{
                parts: [
                    { text: finalPrompt },
                    {
                        inline_data: {
                            mime_type: "image/jpeg",
                            data: base64Image
                        }
                    }
                ]
            }],
            generationConfig: {
                response_modalities: ["TEXT", "IMAGE"],
                imageConfig: {
                    aspectRatio: "9:16",
                    imageSize: "4K"
                }
            }
        };

        // --- MODELO CON FALLBACK ---
        const models = [
            'gemini-3-pro-image-preview',  // Nano Banana Pro - máxima calidad
            'gemini-2.5-flash-image',      // Nano Banana - fallback
        ]

        let result = null;
        let lastError = null;

        for (const model of models) {
            try {
                console.log(`Trying model: ${model}`);
                const modelEndpoint = `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${apiKey}`

                const response = await fetch(modelEndpoint, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify(geminiBody)
                })

                console.log(`Model ${model} response status:`, response.status);

                if (!response.ok) {
                    const err = await response.text();
                    console.warn(`Model ${model} failed (${response.status}): ${err}`);
                    lastError = `${model}: ${err}`;
                    continue;
                }

                result = await response.json();
                console.log(`Success with model: ${model}`);
                break;

            } catch (err) {
                console.warn(`Model ${model} threw error:`, err);
                lastError = err.message;
                continue;
            }
        }

        if (!result) throw new Error(`All models failed. Last error: ${lastError}`);

        // --- EXTRAER IMAGEN GENERADA ---
        let generatedBase64 = null;
        const candidate = result.candidates?.[0];

        if (candidate?.content?.parts) {
            for (const part of candidate.content.parts) {
                if (part.inlineData?.data) {
                    generatedBase64 = part.inlineData.data;
                    break;
                }
            }
        }

        if (!generatedBase64) {
            console.error("No image in response:", JSON.stringify(result));
            throw new Error("AI did not return an image. Check content safety filters or prompt.");
        }

        // --- UPLOAD TO SUPABASE ---
        const fileName = `smile_${Date.now()}_${Math.random().toString(36).substring(7)}.jpg`;
        const binaryString = atob(generatedBase64);
        const bytes = new Uint8Array(binaryString.length);
        for (let i = 0; i < binaryString.length; i++) {
            bytes[i] = binaryString.charCodeAt(i);
        }

        const { data: uploadData, error: uploadError } = await supabase
            .storage
            .from('generated')
            .upload(fileName, bytes, {
                contentType: 'image/jpeg',
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

        // --- FIRE-AND-FORGET WATERMARK ---
        console.log("Triggering background watermark...");
        const watermarkUrl = `${Deno.env.get('SUPABASE_URL')}/functions/v1/watermark-image`;
        fetch(watermarkUrl, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${supabaseKey}`
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
            status: 500,
        })
    }
})