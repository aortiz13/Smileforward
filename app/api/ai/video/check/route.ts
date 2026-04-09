/**
 * API Route: Check Video Status
 * Converted from Supabase Edge Function: check-video
 * 
 * Polls Google's Veo API for video generation status.
 * When complete, downloads and uploads the video to storage.
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
        const { generation_id } = await req.json();
        if (!generation_id) throw new Error('Generation ID is required');

        // 1. Fetch Generation Info
        const gen = await db.queryOne(
            'SELECT * FROM generations WHERE id = $1',
            [generation_id]
        );

        if (!gen) throw new Error('Generation record not found');

        // If already completed, return data
        if (gen.status === 'completed') {
            return NextResponse.json(gen, { headers: corsHeaders });
        }

        const operationName = gen.metadata?.operation_name;

        // If still initializing or missing operation name
        if (gen.status === 'processing' && !operationName) {
            return NextResponse.json(
                { status: 'pending', id: generation_id, message: 'Initializing generation...' },
                { headers: corsHeaders }
            );
        }

        // 2. Check Operation Status with Google
        const apiKey = process.env.GOOGLE_API_KEY;
        const endpoint = `https://generativelanguage.googleapis.com/v1beta/${operationName}?key=${apiKey}`;

        const response = await fetch(endpoint);
        if (!response.ok) throw new Error(`Google API Error: ${await response.text()}`);

        const operation = await response.json();

        // 3. Handle Result
        if (operation.done) {
            if (operation.error) {
                await db.query(
                    `UPDATE generations SET status = 'error', metadata = metadata || $1 WHERE id = $2`,
                    [JSON.stringify({ error: operation.error }), generation_id]
                );
                throw new Error(`Generation failed: ${operation.error.message}`);
            }

            // Check for Safety Filters
            const genResponse = operation.response?.generateVideoResponse || operation.response;
            if (genResponse?.raiMediaFilteredReasons?.length > 0) {
                const reason = genResponse.raiMediaFilteredReasons.join(', ');
                console.log(`Generation filtered: ${reason}`);
                await db.query(
                    `UPDATE generations SET status = 'failed', metadata = metadata || $1 WHERE id = $2`,
                    [JSON.stringify({ error: { message: reason, code: 'RAI_FILTERED' } }), generation_id]
                );
                return NextResponse.json(
                    { status: 'failed', error: reason },
                    { headers: corsHeaders }
                );
            }

            // Support both old and new generatedSamples structure
            const videoData = operation.response?.videos?.[0]
                || genResponse?.videos?.[0]
                || genResponse?.video
                || genResponse?.generatedSamples?.[0]?.video;

            if (!videoData) {
                throw new Error(`No video found. Structure: ${JSON.stringify(operation)}`);
            }

            // 4. Upload to Storage
            let videoBuffer: Buffer;
            if (videoData.uri) {
                const downloadUrl = new URL(videoData.uri);
                downloadUrl.searchParams.set('key', apiKey || '');
                const vidRes = await fetch(downloadUrl.toString());
                if (!vidRes.ok) throw new Error(`Failed to download video: ${await vidRes.text()}`);
                videoBuffer = Buffer.from(await vidRes.arrayBuffer());
            } else if (videoData.bytesBase64) {
                videoBuffer = Buffer.from(videoData.bytesBase64, 'base64');
            } else {
                throw new Error('Unsupported video data format');
            }

            const fileName = `video_${generation_id}.mp4`;
            const filePath = `videos/${fileName}`;
            await storage.uploadFile('generated', filePath, videoBuffer, 'video/mp4');

            // 5. Update Database
            const updatedGen = await db.queryOne(
                `UPDATE generations SET status = 'completed', output_path = $1 WHERE id = $2 RETURNING *`,
                [filePath, generation_id]
            );

            return NextResponse.json(updatedGen, { headers: corsHeaders });
        }

        // Still pending
        return NextResponse.json(
            { status: 'pending', id: generation_id },
            { headers: corsHeaders }
        );

    } catch (error: any) {
        console.error('[check-video] Error:', error);
        return NextResponse.json(
            { error: error.message },
            { headers: corsHeaders, status: 400 }
        );
    }
}
