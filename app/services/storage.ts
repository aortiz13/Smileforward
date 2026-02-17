'use server';

import { createClient } from '@/utils/supabase/server';
import { SmileSession } from '@/types/gemini';

/**
 * Uploads a file to Supabase Storage.
 * Note: Accepting FormData is necessary for Server Actions handling file uploads.
 */
export const uploadScan = async (formData: FormData): Promise<{ success: boolean; data?: string; error?: string }> => {
    console.log("[Storage] ENTRY: uploadScan called.");
    try {
        const file = formData.get('file') as File;
        const userId = formData.get('userId') as string;

        if (!file || !userId) return { success: false, error: "Missing file or userId" };

        const supabase = await createClient();
        const fileExt = file.name?.split('.').pop() || 'jpg';
        const fileName = `${userId}/${Date.now()}.${fileExt}`;
        const filePath = `${fileName}`;

        const { error: uploadError } = await supabase.storage
            .from('scans')
            .upload(filePath, file);

        if (uploadError) {
            console.error("Supabase Upload Error:", uploadError);
            return { success: false, error: `Upload Failed: ${uploadError.message}` };
        }

        const { data } = supabase.storage.from('scans').getPublicUrl(filePath);
        return { success: true, data: data.publicUrl };
    } catch (error: any) {
        console.error("[Storage] uploadScan critical error:", error);
        return { success: false, error: `Upload Failed: ${error.message || "Unknown error"}` };
    }
};

/**
 * Saves a generated image URL to Supabase (or re-uploads if needed).
 * In this implementation, we assume the image is already a URL (from Gemini/Veo) 
 * or we might need to fetch and re-upload if we want it in OUR storage.
 * The prototype `uploadGeneratedImage` took base64, fetched it, and uploaded.
 * We can do the same here using Server Actions.
 */
export const uploadGeneratedImage = async (imageUrlOrBase64: string, userId: string, type: string): Promise<string> => {
    try {
        const supabase = await createClient();
        const fileName = `${userId}/${Date.now()}_${type}.png`;

        let blob: Blob;

        if (imageUrlOrBase64.startsWith('data:')) {
            // Base64
            const base64Data = imageUrlOrBase64.split(',')[1];
            const buffer = Buffer.from(base64Data, 'base64');
            blob = new Blob([buffer], { type: 'image/png' });
        } else {
            // URL
            const res = await fetch(imageUrlOrBase64);
            blob = await res.blob();
        }

        const { error: uploadError } = await supabase.storage
            .from('generated')
            .upload(fileName, blob, {
                contentType: 'image/png'
            });

        if (uploadError) {
            console.error("Failed to upload generated image:", uploadError);
            return imageUrlOrBase64; // Fallback
        }

        const { data } = supabase.storage.from('generated').getPublicUrl(fileName);
        return data.publicUrl;
    } catch (error) {
        console.error("Critical Error in uploadGeneratedImage:", error);
        return imageUrlOrBase64; // Fail safe return original URL
    }
};

