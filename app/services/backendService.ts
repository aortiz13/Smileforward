
import { createClient } from '@/utils/supabase/server';

/**
 * Logs API usage to Supabase for tracking and quota management.
 */
export async function logApiUsage(serviceName: string) {
    try {
        const supabase = await createClient();
        const { error } = await supabase.from('api_usage_logs').insert({
            service_name: serviceName,
            timestamp: new Date().toISOString(),
        });

        if (error) {
            console.error('[BackendService] Failed to log API usage:', error);
        }
    } catch (e) {
        console.error('[BackendService] logApiUsage crashed:', e);
    }
}

/**
 * Persists detailed audit logs for AI interactions and system events.
 */
export async function logAudit(action: string, details: any) {
    try {
        console.log(`[AUDIT] ${action}:`, JSON.stringify(details, null, 2));
        const supabase = await createClient();
        const { error } = await supabase.from('audit_logs').insert({
            action,
            details,
            created_at: new Date().toISOString(),
        });

        if (error) {
            console.error('[BackendService] Failed to persist audit log:', error);
        }
    } catch (e) {
        console.error('[BackendService] logAudit crashed:', e);
    }
}

/**
 * Checks if the user has enough video generation quota.
 * For this MVP, we might just check a simple counter or boolean flag in the DB.
 */
export async function checkVideoQuota(): Promise<boolean> {
    // TODO: Implement real quota check logic
    // For now, return true to allow generation
    return true;
}

/**
 * Marks a video quota as used for the current user.
 */
export async function markVideoQuotaUsed() {
    // TODO: Implement quota decrement logic
    console.log('Video quota used');
}
