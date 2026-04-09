/**
 * Auth Session Helpers
 * Provides utility functions for authentication checks in Server Actions/Components.
 * Replaces supabase.auth.getUser() pattern.
 */
import { auth } from '@/lib/auth';
import { db } from '@/lib/db';

export interface SessionUser {
    id: string;
    email: string;
    name?: string;
    role: 'admin' | 'basic';
}

/**
 * Get the current authenticated session.
 * Returns null if not authenticated.
 * 
 * @example
 * const session = await getSession();
 * if (!session) redirect('/login');
 */
export async function getSession(): Promise<SessionUser | null> {
    const session = await auth();
    
    if (!session?.user?.id) {
        return null;
    }

    return {
        id: session.user.id,
        email: session.user.email || '',
        name: session.user.name || undefined,
        role: (session.user as any).role || 'basic',
    };
}

/**
 * Require authentication. Throws if not authenticated.
 * Optionally checks for a specific role.
 * 
 * @example
 * // In a Server Action:
 * const user = await requireAuth(); // Any authenticated user
 * const admin = await requireAuth('admin'); // Must be admin
 */
export async function requireAuth(role?: 'admin' | 'basic'): Promise<SessionUser> {
    const session = await getSession();
    
    if (!session) {
        throw new Error('Unauthorized: Not authenticated');
    }

    if (role && session.role !== role) {
        throw new Error(`Forbidden: Requires ${role} role`);
    }

    return session;
}

/**
 * Check if the current user is an admin.
 * Returns false if not authenticated or not admin.
 */
export async function isAdmin(): Promise<boolean> {
    const session = await getSession();
    return session?.role === 'admin';
}

/**
 * Get user role by user ID from database.
 * Used when session data might be stale.
 */
export async function getUserRole(userId: string): Promise<string | null> {
    const result = await db.queryOne(
        'SELECT role FROM user_roles WHERE user_id = $1',
        [userId]
    );
    return result?.role || null;
}
