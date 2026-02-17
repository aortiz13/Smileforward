import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'
import { Buffer } from 'node:buffer'

const corsHeaders = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
    'Access-Control-Allow-Methods': 'POST, GET, OPTIONS, PUT, DELETE',
}

Deno.serve(async (req) => {
    if (req.method === 'OPTIONS') {
        return new Response('ok', { headers: corsHeaders, status: 200 })
    }

    try {
        const { lead_id, scenario_id } = await req.json()
        if (!lead_id) throw new Error('Lead ID is required')

        // Initialize Supabase
        const supabaseUrl = Deno.env.get('SUPABASE_URL') ?? ''
        const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
        const supabase = createClient(supabaseUrl, supabaseKey)
        const apiKey = Deno.env.get('GOOGLE_API_KEY')
        if (!apiKey) throw new Error("GOOGLE_API_KEY missing")

        // 1. Fetch Lead Survey Data (Sync - needed for early return info)
        const { data: lead, error: leadError } = await supabase
            .from('leads')
            .select('survey_data, name')
            .eq('id', lead_id)
            .single()

        if (leadError || !lead) throw new Error('Lead not found')
        const surveyData = lead.survey_data || {}
        const ageRange = surveyData.ageRange || '30-55'

        // 2. Determine Scenario Details (Sync)
        let scenarioDetails = "";
        let sceneDescription = "";
        let finalScenario = scenario_id || "automatic";

        const scenarios: Record<string, { description: string, details: string }> = {
            park: {
                description: "Professional outdoor portrait in a vibrant green park with natural daylight.",
                details: "- Location: \"Vibrant green park. Natural daylight. Green background.\"\n- Action: \"Laughing naturally and warmly. Gentle head tilting in joy.\""
            },
            home: {
                description: "Warm, cozy portrait in a family dining room with indoor lighting.",
                details: "- Location: \"Warm family dining room. Indoor lighting.\"\n- Action: \"Smiling warmly or laughing gently. Continuous gentle movement.\""
            },
            office: {
                description: "Professional office environment with bright corporative lighting.",
                details: "- Location: \"Modern professional office. Bright windows. Corporate setting.\"\n- Action: \"Smiling professionally and confidently. Natural business interaction vibe.\""
            },
            dinner: {
                description: "Stylish portrait during a social dinner at a high-end restaurant with ambient lighting.",
                details: "- Location: \"Elegant restaurant. Warm ambient lighting. Blurred social background.\"\n- Action: \"Holding a toast glass and laughing joyfully. High-end social aesthetic.\""
            },
            beach: {
                description: "Sunny portrait on a beautiful beach during vacation with golden-hour lighting.",
                details: "- Location: \"Tropical beach. Ocean background. Golden hour sun.\"\n- Action: \"Smiling happily and relaxed. Vacation vibe. Wind gently in hair.\""
            }
        };

        if (scenarios[scenario_id]) {
            sceneDescription = scenarios[scenario_id].description;
            scenarioDetails = scenarios[scenario_id].details;
        } else {
            if (ageRange === '18-30') {
                sceneDescription = scenarios.park.description;
                scenarioDetails = scenarios.park.details;
                finalScenario = "automatic_park";
            } else if (ageRange === '55+') {
                sceneDescription = scenarios.home.description;
                scenarioDetails = scenarios.home.details;
                finalScenario = "automatic_home";
            } else {
                sceneDescription = "Stylish portrait on an urban rooftop terrace with a city sunset background.";
                scenarioDetails = "- Location: \"Stylish urban rooftop terrace. City sunset background.\"\n- Action: \"Holding a drink and laughing or smiling naturally. High-end social aesthetic.\"";
                finalScenario = "automatic_rooftop";
            }
        }

        // 3. Create INITIAL record (Sync and Return)
        const { data: newGen, error: insertError } = await supabase
            .from('generations')
            .insert({
                lead_id: lead_id,
                type: 'video',
                status: 'processing',
                metadata: {
                    scenario: finalScenario,
                    status_note: "Background process started"
                }
            })
            .select()
            .single()

        if (insertError) throw insertError

        // 4. PREPARE BACKGROUND TASK
        const backgroundTask = async () => {
            try {
                // A. Fetch Smile Image (Background)
                const { data: sourceGen, error: genError } = await supabase
                    .from('generations')
                    .select('output_path')
                    .eq('lead_id', lead_id)
                    .eq('type', 'image')
                    .eq('status', 'completed')
                    .order('created_at', { ascending: false })
                    .limit(1)
                    .single()

                if (genError || !sourceGen) throw new Error('No smile image found')

                // Optimized path cleaning and direct download
                let storagePath = sourceGen.output_path;
                if (storagePath.startsWith('http')) {
                    const urlObj = new URL(storagePath);
                    const pathParts = urlObj.pathname.split('/generated/');
                    if (pathParts.length > 1) storagePath = decodeURIComponent(pathParts[1]);
                }

                const { data: imgData, error: downloadError } = await supabase
                    .storage
                    .from('generated')
                    .download(storagePath);

                if (downloadError || !imgData) throw new Error(`Download failed: ${downloadError?.message}`);

                const arrayBuffer = await imgData.arrayBuffer();
                const imgBase64 = Buffer.from(arrayBuffer).toString('base64');
                const mimeType = imgData.type || 'image/jpeg';

                // B. Scene Generation
                let sceneImgBase64 = imgBase64;
                let sceneImgMimeType = mimeType;
                let generatedScenePath = sourceGen.output_path;

                const sceneGenerationPrompt = `Subject: The person in the input image.\nAction: ${ageRange === '18-30' ? 'Laughing naturally' : ageRange === '55+' ? 'Smiling warmly' : 'Smiling casually'}.\nLocation: ${sceneDescription}\nStyle: Photorealistic, cinematic lighting, 8k resolution, High Quality.\nEditing Input: Change the background to match the Location description. Keep the person's face, hair, and smile EXACTLY the same. Seamlessly blend the lighting.`;

                const visionEndpoint = `https://generativelanguage.googleapis.com/v1beta/models/gemini-3-pro-image-preview:generateContent?key=${apiKey}`;

                const sceneResponse = await fetch(visionEndpoint, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({
                        contents: [{
                            parts: [
                                { text: `Generate a photorealistic image based on: ${sceneGenerationPrompt}` },
                                { inline_data: { mime_type: mimeType, data: imgBase64 } }
                            ]
                        }]
                    })
                });

                if (sceneResponse.ok) {
                    const result = await sceneResponse.json();
                    const candidates = result.candidates;
                    let foundBase64 = candidates?.[0]?.content?.parts?.find((p: any) => p.inline_data || p.inlineData);
                    const actualInlineData = foundBase64?.inline_data || foundBase64?.inlineData;

                    if (actualInlineData) {
                        sceneImgBase64 = actualInlineData.data;
                        sceneImgMimeType = actualInlineData.mime_type || actualInlineData.mimeType || "image/jpeg";

                        const sceneFileName = `${lead_id}/scene_${Date.now()}.png`;
                        const sceneBuffer = Buffer.from(sceneImgBase64, 'base64');

                        const { data: uploadData } = await supabase.storage
                            .from('generated')
                            .upload(sceneFileName, sceneBuffer, { contentType: sceneImgMimeType, upsert: true });

                        if (uploadData) generatedScenePath = uploadData.path;
                    }
                }

                // C. Veo Generation
                const baseInstructions = `- Subject: "The person from the input image."\n- Composition: "9:16 Vertical Portrait. FIXED CAMERA. NO ROTATION."\n- IMPORTANT: "The subject has a warm, natural expression that evolves gently. The smile should look organic, with natural movements of the lips and cheeks. The subject can transition from a gentle closed-mouth smile to a joyful open-mouth smile. ABSOLUTELY NO SPEECH or talking. The mouth must NOT move to form words, mumble, or lip-sync. Movement must be purely expressive and organic, maintaining identical dental structure and facial identity throughout."`;

                const scenarioPrompt = `${baseInstructions}\n${scenarioDetails}\n- Style: "Cinematic, Photorealistic, 4k High Quality."\n- NOTE: The video must start INSTANTLY in the target location. Do NOT fade in from the input image background.`;

                const negativePrompt = "talking, speech, lip syncing, articulating words, conversing, dialog, whispering, chewing, mumbling, aggressive jaw movement, speaking, uttering, morphing teeth, morphing face, distortion, glitchy dental structure, low quality, flashing pixels, jerky head movement";

                const veoEndpoint = `https://generativelanguage.googleapis.com/v1beta/models/veo-3.1-fast-generate-preview:predictLongRunning?key=${apiKey}`;

                const veoResponse = await fetch(veoEndpoint, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({
                        instances: [{
                            prompt: scenarioPrompt,
                            image: { bytesBase64Encoded: sceneImgBase64, mimeType: sceneImgMimeType }
                        }],
                        parameters: { sampleCount: 1, aspectRatio: "9:16", resolution: "1080p", durationSeconds: 8, negativePrompt }
                    })
                });

                if (!veoResponse.ok) {
                    const errBody = await veoResponse.text();
                    console.error("Veo API Error:", errBody);
                    // Standardize error message for frontend interception
                    throw new Error(`AI did not return a video. Check safety filters or quota. Original Error: ${errBody}`);
                }

                const operation = await veoResponse.json();

                // D. UPDATE RECORD
                await supabase
                    .from('generations')
                    .update({
                        status: 'processing', // Signals check-video that it's ready to poll Gemini
                        input_path: generatedScenePath,
                        metadata: {
                            operation_name: operation.name,
                            scenario: finalScenario,
                            prompt: scenarioPrompt,
                            negative_prompt: negativePrompt
                        }
                    })
                    .eq('id', newGen.id);

            } catch (err: any) {
                console.error("Background Task Error:", err);
                await supabase
                    .from('generations')
                    .update({
                        status: 'error',
                        metadata: { error: err.message, step: 'background_init' }
                    })
                    .eq('id', newGen.id);
            }
        };

        // SCHEDULE BACKGROUND TASK
        // @ts-ignore: EdgeRuntime.waitUntil exists in Supabase
        EdgeRuntime.waitUntil(backgroundTask());

        return new Response(JSON.stringify({
            success: true,
            generation_id: newGen.id,
            status: 'initializing'
        }), {
            headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        })

    } catch (error: any) {
        console.error(error);
        return new Response(JSON.stringify({ error: error.message }), {
            headers: { ...corsHeaders, 'Content-Type': 'application/json' },
            status: 400,
        })
    }
})
