'use server';

import { db } from '@/lib/db';

export async function createSelfieSession() {
    try {
        const result = await db.insertReturning(
            `INSERT INTO selfie_sessions (status) VALUES ('pending') RETURNING id`
        );

        return { success: true, sessionId: result.id };
    } catch (err: any) {
        console.error("Server error creating session:", err);
        return { success: false, error: err.message };
    }
}

export async function updateSelfieSession(sessionId: string, status: string, imageUrl?: string) {
    try {
        const params: any[] = [status, sessionId];
        let query = 'UPDATE selfie_sessions SET status = $1 WHERE id = $2';

        if (imageUrl) {
            query = 'UPDATE selfie_sessions SET status = $1, image_url = $2 WHERE id = $3';
            params.splice(1, 0, imageUrl);
        }

        await db.query(query, params);
        return { success: true };
    } catch (err: any) {
        console.error("Server error updating session:", err);
        return { success: false, error: err.message };
    }
}

export async function getSelfieSession(sessionId: string) {
    try {
        const data = await db.queryOne(
            'SELECT * FROM selfie_sessions WHERE id = $1',
            [sessionId]
        );

        if (!data) {
            return { success: false, error: 'Session not found' };
        }

        return { success: true, session: data };
    } catch (err: any) {
        return { success: false, error: err.message };
    }
}
