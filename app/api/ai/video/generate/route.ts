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

export async function OPTIONS() {
    return new NextResponse('ok', { headers: corsHeaders, status: 200 });
}

export async function POST(req: NextRequest) {
    try {
        const body = await req.json();
        const { lead_id, scenario_id } = body;

        if (!lead_id) throw new Error('lead_id is required');

        const apiKey = process.env.GOOGLE_API_KEY;
        if (!apiKey) throw new Error('GOOGLE_API_KEY not configured');

        // 1. Get the latest completed image for this lead
        const generation = await db.queryOne(
            `SELECT input_path, output_path FROM generations 
             WHERE lead_id = $1 AND type = 'image' AND status = 'completed' 
             ORDER BY created_at DESC LIMIT 1`,
            [lead_id]
        );

        if (!generation) throw new Error('No completed image generation found for this lead');

        // 2. Create video generation record
        const videoGen = await db.insertReturning(
            `INSERT INTO generations (lead_id, type, status, metadata)
             VALUES ($1, 'video', 'processing', $2)
             RETURNING id`,
            [lead_id, JSON.stringify({ scenario_id })]
        );

        const generation_id = videoGen.id;

        // 3. Download the source image
        const imagePath = generation.output_path;
        let imageBuffer: Buffer;

        if (imagePath.startsWith('http')) {
            const res = await fetch(imagePath);
            imageBuffer = Buffer.from(await res.arrayBuffer());
        } else {
            imageBuffer = await storage.downloadFileAsBuffer('generated', imagePath);
        }

        const imageBase64 = imageBuffer.toString('base64');

        // 4. Build scenario prompt
        const scenarioPrompts: Record<string, string> = {
            park: 'walking through a beautiful sunlit park, smiling naturally, gentle breeze, cinematic lighting',
            home: 'at home in a warm living room, laughing naturally while having a conversation, cozy atmosphere',
            office: 'in a modern office environment, smiling confidently while presenting, professional lighting',
            dinner: 'at an elegant dinner table, laughing and enjoying, warm ambient restaurant lighting',
            beach: 'on a beautiful beach at golden hour, smiling joyfully, ocean waves in background',
        };

        const scenarioPrompt = scenario_id
            ? scenarioPrompts[scenario_id] || scenarioPrompts.park
            : 'smiling naturally and turning their head slightly, in a well-lit environment, cinematic quality';

        const prompt = `Generate a short, smooth, photorealistic video of this exact person ${scenarioPrompt}. 
The person should look exactly like in the photo with the same enhanced smile.
The video should be 4-5 seconds, smooth and natural movement.`;

        // 5. Start Veo generation (async - fire and forget)
        const veoResponse = await fetch(
            `https://generativelanguage.googleapis.com/v1beta/models/veo-2.0-generate-001:predictLongRunning?key=${apiKey}`,
            {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    instances: [{
                        prompt,
                        image: {
                            bytesBase64Encoded: imageBase64,
                            mimeType: 'image/jpeg',
                        },
                    }],
                    parameters: {
                        aspectRatio: '9:16',
                        personGeneration: 'allow_all',
                        durationSeconds: 5,
                    },
                }),
            }
        );

        if (!veoResponse.ok) {
            const errText = await veoResponse.text();
            console.error('Veo API Error:', errText);
            await db.query(
                `UPDATE generations SET status = 'error', metadata = metadata || $1 WHERE id = $2`,
                [JSON.stringify({ error: errText }), generation_id]
            );
            throw new Error(`Veo API Error: ${veoResponse.status}`);
        }

        const veoData = await veoResponse.json();
        const operationName = veoData.name;

        // 6. Update generation record with operation name
        await db.query(
            `UPDATE generations SET metadata = metadata || $1 WHERE id = $2`,
            [JSON.stringify({ operation_name: operationName }), generation_id]
        );

        return NextResponse.json({
            success: true,
            generation_id,
            status: 'processing',
        }, { headers: corsHeaders });

    } catch (error: any) {
        console.error('[generate-video] Error:', error);
        return NextResponse.json(
            { error: error.message },
            { headers: corsHeaders, status: 500 }
        );
    }
}
