/**
 * API Route: Watermark Image
 * Converted from Supabase Edge Function: watermark-image
 * 
 * Adds a watermark to generated smile images using Sharp.
 */
import { NextRequest, NextResponse } from 'next/server';
import sharp from 'sharp';
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
        const { image_path, watermark_text = 'Smile Forward' } = await req.json();

        if (!image_path) {
            throw new Error('image_path is required');
        }

        // 1. Download original image from storage
        const imageBuffer = await storage.downloadFileAsBuffer('generated', image_path);

        // 2. Get image metadata
        const metadata = await sharp(imageBuffer).metadata();
        const width = metadata.width || 800;
        const height = metadata.height || 800;

        // 3. Create watermark SVG
        const fontSize = Math.max(Math.floor(width * 0.03), 14);
        const svgWatermark = `
        <svg width="${width}" height="${height}">
            <style>
                .watermark { 
                    fill: rgba(255,255,255,0.35); 
                    font-size: ${fontSize}px; 
                    font-family: Arial, sans-serif;
                    font-weight: bold;
                }
            </style>
            <text x="${width - 10}" y="${height - 15}" text-anchor="end" class="watermark">
                ${watermark_text}
            </text>
        </svg>`;

        // 4. Apply watermark
        const watermarkedBuffer = await sharp(imageBuffer)
            .composite([{
                input: Buffer.from(svgWatermark),
                gravity: 'southeast',
            }])
            .jpeg({ quality: 90 })
            .toBuffer();

        // 5. Upload watermarked version
        const watermarkedPath = image_path.replace('.jpg', '_watermarked.jpg');
        await storage.uploadFile('generated', watermarkedPath, watermarkedBuffer, 'image/jpeg');

        const publicUrl = storage.getPublicUrl('generated', watermarkedPath);

        return NextResponse.json(
            { success: true, watermarked_path: watermarkedPath, public_url: publicUrl },
            { headers: corsHeaders }
        );

    } catch (error: any) {
        console.error('[watermark-image] Error:', error);
        return NextResponse.json(
            { success: false, error: error.message },
            { headers: corsHeaders, status: 500 }
        );
    }
}
