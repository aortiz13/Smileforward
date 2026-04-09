/**
 * API Route: Admin Data Queries
 * Replaces client-side Supabase queries for admin pages.
 * All queries require authentication context (via cookies/session).
 */
import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { auth, hashPassword } from '@/lib/auth';

export async function POST(req: NextRequest) {
    try {
        const body = await req.json();
        const { action } = body;

        switch (action) {
            case 'get_leads': {
                const result = await db.query(
                    `SELECT l.*, 
                        COALESCE(
                            json_agg(g.* ORDER BY g.created_at DESC) 
                            FILTER (WHERE g.id IS NOT NULL), '[]'
                        ) as generations
                     FROM leads l
                     LEFT JOIN generations g ON g.lead_id = l.id
                     GROUP BY l.id
                     ORDER BY l.created_at DESC`
                );
                return NextResponse.json({ data: result.rows });
            }

            case 'get_generations': {
                const result = await db.query(
                    'SELECT * FROM generations ORDER BY created_at DESC'
                );
                return NextResponse.json({ data: result.rows });
            }

            case 'get_dashboard_stats': {
                const [leads, images, videos] = await Promise.all([
                    db.queryOne('SELECT COUNT(*) as count FROM leads'),
                    db.queryOne("SELECT COUNT(*) as count FROM generations WHERE type = 'image'"),
                    db.queryOne("SELECT COUNT(*) as count FROM generations WHERE type = 'video'"),
                ]);

                const thirtyDaysAgo = new Date();
                thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

                const chartResult = await db.query(
                    `SELECT created_at, type FROM generations 
                     WHERE created_at >= $1 ORDER BY created_at ASC`,
                    [thirtyDaysAgo.toISOString()]
                );

                const activityResult = await db.query(
                    'SELECT * FROM audit_logs ORDER BY created_at DESC LIMIT 5'
                );

                return NextResponse.json({
                    totalLeads: parseInt(leads?.count || '0'),
                    smileGenerations: parseInt(images?.count || '0'),
                    videoRequests: parseInt(videos?.count || '0'),
                    chartData: chartResult.rows,
                    recentActivity: activityResult.rows,
                });
            }

            case 'get_user_role': {
                const { user_id } = body;
                const result = await db.queryOne(
                    'SELECT role FROM user_roles WHERE user_id = $1',
                    [user_id]
                );
                return NextResponse.json({ role: result?.role || null });
            }

            case 'update_password': {
                // Get user from session
                const session = await auth();
                if (!session?.user?.id) {
                    return NextResponse.json({ error: 'No hay sesión activa' }, { status: 401 });
                }

                const { password } = body;
                if (!password || password.length < 6) {
                    return NextResponse.json({ error: 'La contraseña debe tener al menos 6 caracteres' }, { status: 400 });
                }

                const hashed = await hashPassword(password);
                await db.query(
                    'UPDATE users SET password_hash = $1 WHERE id = $2',
                    [hashed, session.user.id]
                );
                return NextResponse.json({ success: true });
            }

            default:
                return NextResponse.json({ error: 'Unknown action' }, { status: 400 });
        }
    } catch (error: any) {
        console.error('[api/admin] Error:', error);
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}

