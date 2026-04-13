/**
 * API Route: Image Proxy
 * Proxies images from MinIO storage to avoid CORS issues.
 * 
 * Usage: /api/storage/generated/smiles/smile_123.jpg
 *        /api/storage/uploads/user_id/photo.jpg
 */
import { NextRequest, NextResponse } from 'next/server';
import { storage } from '@/lib/storage';

export async function GET(
    req: NextRequest,
    { params }: { params: Promise<{ path: string[] }> }
) {
    const { path } = await params;

    if (!path || path.length < 2) {
        return new NextResponse('Invalid path', { status: 400 });
    }

    // First segment is the bucket, rest is the file key
    const bucket = path[0];
    const key = path.slice(1).join('/');

    // Only allow known buckets
    const allowedBuckets = ['generated', 'uploads'];
    if (!allowedBuckets.includes(bucket)) {
        return new NextResponse('Invalid bucket', { status: 403 });
    }

    try {
        const buffer = await storage.downloadFileAsBuffer(bucket, key);

        // Determine content type from extension
        const ext = key.split('.').pop()?.toLowerCase();
        const contentTypes: Record<string, string> = {
            jpg: 'image/jpeg',
            jpeg: 'image/jpeg',
            png: 'image/png',
            webp: 'image/webp',
            gif: 'image/gif',
            mp4: 'video/mp4',
        };

        const contentType = contentTypes[ext || ''] || 'application/octet-stream';

        return new NextResponse(buffer, {
            status: 200,
            headers: {
                'Content-Type': contentType,
                'Content-Length': buffer.length.toString(),
                'Cache-Control': 'public, max-age=3600, immutable',
                'Access-Control-Allow-Origin': '*',
            },
        });
    } catch (error: any) {
        console.error('[storage-proxy] Error:', error.message);
        return new NextResponse('File not found', { status: 404 });
    }
}
