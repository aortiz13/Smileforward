/**
 * MinIO/S3-Compatible Storage Client
 * Replaces Supabase Storage with direct S3 API calls.
 * 
 * Configured via MINIO_ENDPOINT, MINIO_ACCESS_KEY, MINIO_SECRET_KEY env vars.
 */
import {
    S3Client,
    PutObjectCommand,
    GetObjectCommand,
    DeleteObjectCommand,
    DeleteObjectsCommand,
    ListObjectsV2Command,
    HeadObjectCommand,
} from '@aws-sdk/client-s3';
import { getSignedUrl } from '@aws-sdk/s3-request-presigner';

// Singleton S3 client
let s3: S3Client | null = null;

function getS3Client(): S3Client {
    if (!s3) {
        const endpoint = process.env.MINIO_ENDPOINT;
        const accessKey = process.env.MINIO_ACCESS_KEY;
        const secretKey = process.env.MINIO_SECRET_KEY;

        if (!endpoint || !accessKey || !secretKey) {
            throw new Error(
                'Missing MinIO/S3 configuration. Required: MINIO_ENDPOINT, MINIO_ACCESS_KEY, MINIO_SECRET_KEY'
            );
        }

        s3 = new S3Client({
            endpoint,
            region: process.env.MINIO_REGION || 'us-east-1',
            credentials: {
                accessKeyId: accessKey,
                secretAccessKey: secretKey,
            },
            forcePathStyle: true, // Required for MinIO
        });
    }
    return s3;
}

/**
 * Get the public URL for a file.
 * Uses MINIO_PUBLIC_URL for externally accessible URLs.
 */
export function getPublicUrl(bucket: string, key: string): string {
    const publicUrl = process.env.MINIO_PUBLIC_URL || process.env.MINIO_ENDPOINT;
    return `${publicUrl}/${bucket}/${key}`;
}

/**
 * Upload a file to storage.
 * Returns the public URL of the uploaded file.
 * 
 * @example
 * const url = await uploadFile('scans', 'user123/photo.jpg', buffer, 'image/jpeg');
 */
export async function uploadFile(
    bucket: string,
    key: string,
    body: Buffer | Uint8Array | Blob | ReadableStream,
    contentType: string,
    options?: { upsert?: boolean }
): Promise<string> {
    const client = getS3Client();

    // Convert Blob to Buffer if needed
    let uploadBody: Buffer | Uint8Array | ReadableStream;
    if (body instanceof Blob) {
        const arrayBuffer = await body.arrayBuffer();
        uploadBody = Buffer.from(arrayBuffer);
    } else {
        uploadBody = body;
    }

    await client.send(new PutObjectCommand({
        Bucket: bucket,
        Key: key,
        Body: uploadBody as any,
        ContentType: contentType,
    }));

    return getPublicUrl(bucket, key);
}

/**
 * Download a file from storage.
 * Returns the file as a readable stream.
 */
export async function downloadFile(
    bucket: string,
    key: string
): Promise<{ body: ReadableStream | null; contentType: string | undefined }> {
    const client = getS3Client();

    const response = await client.send(new GetObjectCommand({
        Bucket: bucket,
        Key: key,
    }));

    return {
        body: response.Body as ReadableStream | null,
        contentType: response.ContentType,
    };
}

/**
 * Download a file as a Buffer.
 */
export async function downloadFileAsBuffer(
    bucket: string,
    key: string
): Promise<Buffer> {
    const client = getS3Client();

    const response = await client.send(new GetObjectCommand({
        Bucket: bucket,
        Key: key,
    }));

    if (!response.Body) {
        throw new Error(`File not found: ${bucket}/${key}`);
    }

    // Convert stream to buffer
    const chunks: Uint8Array[] = [];
    const reader = (response.Body as ReadableStream).getReader();
    
    while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        chunks.push(value);
    }

    return Buffer.concat(chunks);
}

/**
 * Generate a signed URL for temporary access.
 * Default expiry: 60 seconds.
 */
export async function createSignedUrl(
    bucket: string,
    key: string,
    expiresIn: number = 60
): Promise<string> {
    const client = getS3Client();

    const command = new GetObjectCommand({
        Bucket: bucket,
        Key: key,
    });

    return getSignedUrl(client, command, { expiresIn });
}

/**
 * Delete a single file from storage.
 */
export async function deleteFile(bucket: string, key: string): Promise<void> {
    const client = getS3Client();

    await client.send(new DeleteObjectCommand({
        Bucket: bucket,
        Key: key,
    }));
}

/**
 * Delete multiple files from storage.
 */
export async function deleteFiles(bucket: string, keys: string[]): Promise<void> {
    if (keys.length === 0) return;

    const client = getS3Client();

    await client.send(new DeleteObjectsCommand({
        Bucket: bucket,
        Delete: {
            Objects: keys.map(Key => ({ Key })),
        },
    }));
}

/**
 * List files in a bucket with optional prefix.
 */
export async function listFiles(
    bucket: string,
    prefix?: string,
    maxKeys: number = 100
): Promise<Array<{ key: string; lastModified?: Date; size?: number }>> {
    const client = getS3Client();

    const response = await client.send(new ListObjectsV2Command({
        Bucket: bucket,
        Prefix: prefix,
        MaxKeys: maxKeys,
    }));

    return (response.Contents || []).map(obj => ({
        key: obj.Key || '',
        lastModified: obj.LastModified,
        size: obj.Size,
    }));
}

/**
 * Check if a file exists.
 */
export async function fileExists(bucket: string, key: string): Promise<boolean> {
    try {
        const client = getS3Client();
        await client.send(new HeadObjectCommand({ Bucket: bucket, Key: key }));
        return true;
    } catch {
        return false;
    }
}

// Export convenience object
export const storage = {
    uploadFile,
    downloadFile,
    downloadFileAsBuffer,
    createSignedUrl,
    deleteFile,
    deleteFiles,
    listFiles,
    fileExists,
    getPublicUrl,
};

export default storage;
