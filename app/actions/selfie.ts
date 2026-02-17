'use server';

import { createClient } from '@/utils/supabase/server';

export async function createSelfieSession() {
    try {
        const supabase = await createClient();
        const { data, error } = await supabase
            .from('selfie_sessions')
            .insert({})
            .select('id')
            .single();

        if (error) {
            console.error("Error creating selfie session:", error);
            return { success: false, error: error.message };
        }

        return { success: true, sessionId: data.id };
    } catch (err: any) {
        console.error("Server error creating session:", err);
        return { success: false, error: err.message };
    }
}

export async function updateSelfieSession(sessionId: string, status: string, imageUrl?: string) {
    try {
        const supabase = await createClient();

        const updateData: any = { status };
        if (imageUrl) {
            updateData.image_url = imageUrl;
        }

        const { error } = await supabase
            .from('selfie_sessions')
            .update(updateData)
            .eq('id', sessionId);

        if (error) {
            console.error("Error updating selfie session:", error);
            return { success: false, error: error.message };
        }

        return { success: true };
    } catch (err: any) {
        console.error("Server error updating session:", err);
        return { success: false, error: err.message };
    }
}

export async function getSelfieSession(sessionId: string) {
    try {
        const supabase = await createClient();
        const { data, error } = await supabase
            .from('selfie_sessions')
            .select('*')
            .eq('id', sessionId)
            .single();

        if (error) {
            return { success: false, error: error.message };
        }

        return { success: true, session: data };
    } catch (err: any) {
        return { success: false, error: err.message };
    }
}
