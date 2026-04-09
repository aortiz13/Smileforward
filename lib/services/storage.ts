'use server';

import { storage as minioStorage } from '@/lib/storage';

/**
 * Uploads a file to MinIO Storage.
 * Note: Accepting FormData is necessary for Server Actions handling file uploads.
 */
export const uploadScan = async (formData: FormData): Promise<{ success: boolean; data?: string; path?: string; error?: string }> => {
    console.log("[Storage] ENTRY: uploadScan called.");
    try {
        const file = formData.get('file') as File;
        const userId = formData.get('userId') as string;

        if (!file || !userId) return { success: false, error: "Missing file or userId" };

        const fileExt = file.name?.split('.').pop() || 'jpg';
        const filePath = `${userId}/${Date.now()}.${fileExt}`;

        const arrayBuffer = await file.arrayBuffer();
        const buffer = Buffer.from(arrayBuffer);

        const publicUrl = await minioStorage.uploadFile(
            'uploads',
            filePath,
            buffer,
            file.type || 'image/jpeg'
        );

        return { success: true, data: publicUrl, path: filePath };
    } catch (error: any) {
        console.error("[Storage] uploadScan critical error:", error);
        return { success: false, error: `Upload Failed: ${error.message || "Unknown error"}` };
    }
};

/**
 * Saves a generated image URL to MinIO (or re-uploads if needed).
 */
export const uploadGeneratedImage = async (imageUrlOrBase64: string, userId: string, type: string): Promise<string> => {
    try {
        const fileName = `${userId}/${Date.now()}_${type}.png`;

        let buffer: Buffer;

        if (imageUrlOrBase64.startsWith('data:')) {
            // Base64
            const base64Data = imageUrlOrBase64.split(',')[1];
            buffer = Buffer.from(base64Data, 'base64');
        } else {
            // URL
            const res = await fetch(imageUrlOrBase64);
            const arrayBuffer = await res.arrayBuffer();
            buffer = Buffer.from(arrayBuffer);
        }

        const publicUrl = await minioStorage.uploadFile(
            'generated',
            fileName,
            buffer,
            'image/png'
        );

        return publicUrl;
    } catch (error) {
        console.error("Critical Error in uploadGeneratedImage:", error);
        return imageUrlOrBase64; // Fail safe return original URL
    }
};

/**
 * Server Action for high-res uploads using FormData.
 * This prevents RSC serialization limits for large base64 strings.
 */
export const uploadGeneratedImageAction = async (formData: FormData): Promise<string> => {
    try {
        const file = formData.get('file') as File;
        const userId = formData.get('userId') as string;
        const type = formData.get('type') as string || 'aligned';

        if (!file || !userId) {
            console.error("[Storage] Missing file or userId in FormData");
            return "";
        }

        const fileName = `${userId}/${Date.now()}_${type}.png`;
        const arrayBuffer = await file.arrayBuffer();
        const buffer = Buffer.from(arrayBuffer);

        const publicUrl = await minioStorage.uploadFile(
            'generated',
            fileName,
            buffer,
            'image/png'
        );

        return publicUrl;
    } catch (error) {
        console.error("Critical Error in uploadGeneratedImageAction:", error);
        return "";
    }
};
