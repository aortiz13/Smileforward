/**
 * API Route: Generate Video
 * Converted from Supabase Edge Function: generate-video
 * 
 * Triggers Veo video generation asynchronously.
 * The actual video is polled via check-video endpoint.
 */
import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { storage } from '@/lib/storage';

const corsHeaders = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
    'Access-Control-Allow-Methods': 'POST, OPTIONS',
};

// ─── Logger util ─────────────────────────────────────────────────────────────
const tag = (section: string) => `[generate-video][${section}]`;

function logStep(section: string, msg: string, data?: unknown) {
    if (data !== undefined) {
        console.log(`${tag(section)} ${msg}`, JSON.stringify(data, null, 2));
    } else {
        console.log(`${tag(section)} ${msg}`);
    }
}

function logError(section: string, msg: string, err?: unknown) {
    console.error(`${tag(section)} ❌ ${msg}`, err instanceof Error ? err.message : err);
}

// ─── Veo retry helper ─────────────────────────────────────────────────────────
async function fetchVeoWithRetry(
    endpoint: string,
    body: object,
    maxRetries = 3,
    backoffMs = 4000
): Promise<{ response: Response }> {
    let lastError = '';

    for (let attempt = 1; attempt <= maxRetries; attempt++) {
        logStep('veo-retry', `Attempt ${attempt}/${maxRetries} — sending request to Veo API...`);

        const response = await fetch(endpoint, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(body)
        });

        logStep('veo-retry', `Response status: ${response.status} ${response.statusText}`);

        if (response.ok) {
            logStep('veo-retry', `✅ Veo request succeeded on attempt ${attempt}`);
            return { response };
        }

        lastError = await response.text();
        const isRetryableError =
            lastError.includes('audio') ||
            lastError.includes('safety') ||
            lastError.includes('could not create your video') ||
            lastError.includes('RESOURCE_EXHAUSTED');

        logError('veo-retry', `Attempt ${attempt} failed. isRetryable=${isRetryableError}`, lastError);

        if (isRetryableError && attempt < maxRetries) {
            const waitMs = backoffMs * attempt;
            logStep('veo-retry', `Retryable error detected — waiting ${waitMs}ms before retry...`);
            await new Promise(r => setTimeout(r, waitMs));
            continue;
        }

        break;
    }

    throw new Error(`Veo generation failed after ${maxRetries} attempts. Last error: ${lastError}`);
}

export async function OPTIONS() {
    return new NextResponse('ok', { headers: corsHeaders, status: 200 });
}

export async function POST(req: NextRequest) {
    const requestStart = Date.now();

    try {
        // ── INPUT ─────────────────────────────────────────────────────────────
        const body = await req.json();
        const { lead_id, scenario_id } = body;
        logStep('input', '📥 Incoming request body', body);

        if (!lead_id) throw new Error('lead_id is required');

        const apiKey = process.env.GOOGLE_API_KEY;
        if (!apiKey) throw new Error('GOOGLE_API_KEY not configured');

        logStep('init', '✅ DB + Storage initialized. GOOGLE_API_KEY present.');

        // ── 1. LEAD DATA ──────────────────────────────────────────────────────
        logStep('lead', `Fetching lead data for id="${lead_id}"`);
        const lead = await db.queryOne(
            `SELECT survey_data, name FROM leads WHERE id = $1`,
            [lead_id]
        );

        if (!lead) {
            logError('lead', 'Lead not found');
            throw new Error('Lead not found');
        }

        const surveyData = lead.survey_data || {};
        const ageRange = surveyData.ageRange || '30-55';
        logStep('lead', '✅ Lead found', { name: lead.name, ageRange, surveyData });

        // ── 2. SCENARIO ───────────────────────────────────────────────────────
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
            logStep('scenario', `✅ Manual scenario selected: "${scenario_id}"`);
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
            logStep('scenario', `✅ Automatic scenario resolved: "${finalScenario}" (ageRange="${ageRange}")`);
        }

        logStep('scenario', 'Scene description + details', { sceneDescription, scenarioDetails });

        // ── 3. CREATE INITIAL RECORD ──────────────────────────────────────────
        logStep('db', 'Inserting initial generation record...');
        const newGen = await db.insertReturning(
            `INSERT INTO generations (lead_id, type, status, metadata)
             VALUES ($1, 'video', 'processing', $2)
             RETURNING id`,
            [lead_id, JSON.stringify({ scenario: finalScenario, status_note: "Background process started" })]
        );

        logStep('db', `✅ Generation record created`, { id: newGen.id, status: 'processing' });

        // ── 4. BACKGROUND TASK ────────────────────────────────────────────────
        // Fire-and-forget: we return the generation_id immediately
        const backgroundTask = async () => {
            const bgStart = Date.now();
            logStep('bg', `🚀 Background task started for generation_id="${newGen.id}"`);

            try {
                // ── A. FETCH SMILE IMAGE ──────────────────────────────────────
                logStep('bg:image', `Querying latest completed image for lead_id="${lead_id}"`);
                const sourceGen = await db.queryOne(
                    `SELECT output_path FROM generations 
                     WHERE lead_id = $1 AND type = 'image' AND status = 'completed' 
                     ORDER BY created_at DESC LIMIT 1`,
                    [lead_id]
                );

                if (!sourceGen) {
                    logError('bg:image', 'No completed smile image found');
                    throw new Error('No smile image found');
                }

                logStep('bg:image', '✅ Source image found', { output_path: sourceGen.output_path });

                // Download source image
                const imagePath = sourceGen.output_path;
                let imageBuffer: Buffer;

                if (imagePath.startsWith('http')) {
                    const res = await fetch(imagePath);
                    imageBuffer = Buffer.from(await res.arrayBuffer());
                } else {
                    imageBuffer = await storage.downloadFileAsBuffer('generated', imagePath);
                }

                const imgBase64 = imageBuffer.toString('base64');
                const mimeType = 'image/jpeg';

                logStep('bg:image', `✅ Image downloaded`, {
                    mimeType,
                    sizeBytes: imageBuffer.byteLength,
                    base64LengthChars: imgBase64.length
                });

                // ── B. SCENE GENERATION (Gemini) ──────────────────────────────
                let sceneImgBase64 = imgBase64;
                let sceneImgMimeType = mimeType;
                let generatedScenePath = sourceGen.output_path;

                const sceneGenerationPrompt = `Subject: The person in the input image.\nAction: ${ageRange === '18-30' ? 'Laughing naturally' : ageRange === '55+' ? 'Smiling warmly' : 'Smiling casually'}.\nLocation: ${sceneDescription}\nStyle: Photorealistic, cinematic lighting, 8k resolution, High Quality.\nEditing Input: Change the background to match the Location description. Keep the person's face, hair, and smile EXACTLY the same. Seamlessly blend the lighting.`;

                logStep('bg:scene', '📤 Sending request to Gemini image generation', { prompt: sceneGenerationPrompt });

                const visionEndpoint = `https://generativelanguage.googleapis.com/v1beta/models/gemini-3-pro-image-preview:generateContent?key=${apiKey}`;

                try {
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

                    logStep('bg:scene', `Gemini response status: ${sceneResponse.status} ${sceneResponse.statusText}`);

                    if (sceneResponse.ok) {
                        const result = await sceneResponse.json();
                        const candidates = result.candidates;

                        logStep('bg:scene', `Candidates received: ${candidates?.length ?? 0}`, {
                            finishReason: candidates?.[0]?.finishReason,
                        });

                        const foundBase64 = candidates?.[0]?.content?.parts?.find((p: any) => p.inline_data || p.inlineData);
                        const actualInlineData = foundBase64?.inline_data || foundBase64?.inlineData;

                        if (actualInlineData) {
                            sceneImgBase64 = actualInlineData.data;
                            sceneImgMimeType = actualInlineData.mime_type || actualInlineData.mimeType || "image/jpeg";

                            const sceneFileName = `${lead_id}/scene_${Date.now()}.png`;
                            const sceneBuffer = Buffer.from(sceneImgBase64, 'base64');

                            logStep('bg:scene', `Uploading generated scene image as "${sceneFileName}"`, {
                                mimeType: sceneImgMimeType,
                                sizeBytes: sceneBuffer.byteLength
                            });

                            try {
                                const sceneUrl = await storage.uploadFile('generated', sceneFileName, sceneBuffer, sceneImgMimeType);
                                generatedScenePath = sceneFileName;
                                logStep('bg:scene', `✅ Scene image uploaded`, { path: generatedScenePath, url: sceneUrl });
                            } catch (uploadErr) {
                                logError('bg:scene', 'Scene image upload failed', uploadErr);
                            }
                        } else {
                            logStep('bg:scene', '⚠️ No inline_data in Gemini response — using original image as scene input');
                        }
                    } else {
                        const sceneErrText = await sceneResponse.text();
                        logError('bg:scene', `Gemini request failed (status ${sceneResponse.status})`, sceneErrText);
                        logStep('bg:scene', '⚠️ Falling back to original image for Veo input');
                    }
                } catch (sceneErr) {
                    logError('bg:scene', 'Scene generation failed, falling back to original image', sceneErr);
                }

                // ── C. VEO GENERATION ─────────────────────────────────────────
                const baseInstructions = `- Subject: "The person from the input image."\n- Composition: "9:16 Vertical Portrait. FIXED CAMERA. NO ROTATION."\n- IMPORTANT: "Natural, warm facial expression that evolves gently. Warm, natural facial expression. Gentle head movement only. Eyes and cheeks express joy. Gentle, organic movement only. Maintain identical facial identity throughout."`;
                const scenarioPrompt = `${baseInstructions}\n${scenarioDetails}\n- Style: "Cinematic, Photorealistic, 4k High Quality."\n- NOTE: The video must start INSTANTLY in the target location. Do NOT fade in from the input image background.`;
                const negativePrompt = "talking, speaking, lip syncing, dialog, speech, distortion, morphing teeth, low quality, blurry, flashing pixels, jerky movement";

                const veoEndpoint = `https://generativelanguage.googleapis.com/v1beta/models/veo-3.1-fast-generate-preview:predictLongRunning?key=${apiKey}`;

                const veoBody = {
                    instances: [{
                        prompt: scenarioPrompt,
                        image: { bytesBase64Encoded: sceneImgBase64, mimeType: sceneImgMimeType }
                    }],
                    parameters: {
                        sampleCount: 1,
                        aspectRatio: "9:16",
                        personGeneration: "allow_adult",
                        resolution: "1080p",
                        durationSeconds: 8,
                        negativePrompt,
                    }
                };

                logStep('bg:veo', '📤 Sending request to Veo API', {
                    endpoint: veoEndpoint.replace(apiKey, '***'),
                    scenarioPrompt,
                    negativePrompt,
                    parameters: veoBody.parameters,
                    imageMimeType: sceneImgMimeType,
                    imageBase64LengthChars: sceneImgBase64.length
                });

                const { response: veoResponse } = await fetchVeoWithRetry(veoEndpoint, veoBody, 3, 4000);

                const operation = await veoResponse.json();

                logStep('bg:veo', '✅ Veo long-running operation created', {
                    operation_name: operation.name,
                    done: operation.done ?? false,
                    metadata: operation.metadata ?? null
                });

                // ── D. UPDATE RECORD ──────────────────────────────────────────
                const updateMetadata = JSON.stringify({
                    operation_name: operation.name,
                    scenario: finalScenario,
                    prompt: scenarioPrompt,
                    negative_prompt: negativePrompt
                });

                logStep('bg:db', 'Updating generation record with operation details', {
                    id: newGen.id,
                    operation_name: operation.name
                });

                await db.query(
                    `UPDATE generations SET status = 'processing', input_path = $1, metadata = $2 WHERE id = $3`,
                    [generatedScenePath, updateMetadata, newGen.id]
                );

                logStep('bg:db', `✅ Generation record updated — ready for polling`);

                const elapsed = Date.now() - bgStart;
                logStep('bg', `✅ Background task completed in ${elapsed}ms`);

            } catch (err: any) {
                const elapsed = Date.now() - bgStart;
                logError('bg', `Background task failed after ${elapsed}ms`, err);

                const isRetryableError =
                    err.message?.includes('audio') ||
                    err.message?.includes('safety') ||
                    err.message?.includes('could not create your video');

                const errorMetadata = JSON.stringify({
                    error: err.message,
                    error_type: isRetryableError ? 'audio_safety_filter' : 'fatal',
                    retryable: isRetryableError,
                    step: 'background_init',
                    elapsed_ms: elapsed
                });

                logStep('bg:db', 'Writing error to generation record', errorMetadata);

                await db.query(
                    `UPDATE generations SET status = 'error', metadata = $1 WHERE id = $2`,
                    [errorMetadata, newGen.id]
                );
            }
        };

        // Fire and forget — don't await the background task
        backgroundTask().catch(err => {
            logError('handler', 'Unhandled background task error', err);
        });

        const syncElapsed = Date.now() - requestStart;
        logStep('response', `✅ Returning early response after ${syncElapsed}ms`, {
            generation_id: newGen.id,
            status: 'initializing'
        });

        return NextResponse.json({
            success: true,
            generation_id: newGen.id,
            status: 'processing',
        }, { headers: corsHeaders });

    } catch (error: any) {
        const elapsed = Date.now() - requestStart;
        logError('handler', `Unhandled error after ${elapsed}ms`, error);
        return NextResponse.json(
            { error: error.message },
            { headers: corsHeaders, status: 500 }
        );
    }
}
