/**
 * Server-side Database Actions
 * These server actions replace direct Supabase client-side DB operations.
 * Called from client components via fetch or Server Actions.
 */
import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';

const corsHeaders = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'content-type',
    'Access-Control-Allow-Methods': 'POST, OPTIONS',
};

export async function OPTIONS() {
    return new NextResponse('ok', { headers: corsHeaders, status: 200 });
}

export async function POST(req: NextRequest) {
    try {
        const body = await req.json();
        const { action, data } = body;

        switch (action) {
            case 'insert_lead': {
                const { id, name, email, phone, status } = data;
                await db.query(
                    `INSERT INTO leads (id, name, email, phone, status) VALUES ($1, $2, $3, $4, $5)`,
                    [id, name, email, phone, status || 'pending']
                );
                return NextResponse.json({ success: true }, { headers: corsHeaders });
            }

            case 'insert_generation': {
                const { lead_id, type, status, input_path, output_path, metadata } = data;
                await db.query(
                    `INSERT INTO generations (lead_id, type, status, input_path, output_path, metadata)
                     VALUES ($1, $2, $3, $4, $5, $6)`,
                    [lead_id, type, status, input_path, output_path, JSON.stringify(metadata || {})]
                );
                return NextResponse.json({ success: true }, { headers: corsHeaders });
            }

            case 'update_lead_survey': {
                const { lead_id, survey_data } = data;
                await db.query(
                    `UPDATE leads SET survey_data = $1 WHERE id = $2`,
                    [JSON.stringify(survey_data), lead_id]
                );
                return NextResponse.json({ success: true }, { headers: corsHeaders });
            }

            case 'update_lead_status': {
                const { lead_id, status } = data;
                await db.query(
                    `UPDATE leads SET status = $1 WHERE id = $2`,
                    [status, lead_id]
                );
                return NextResponse.json({ success: true }, { headers: corsHeaders });
            }

            case 'get_selfie_session': {
                const { session_id } = data;
                const result = await db.queryOne(
                    'SELECT * FROM selfie_sessions WHERE id = $1',
                    [session_id]
                );
                return NextResponse.json({ success: true, data: result }, { headers: corsHeaders });
            }

            default:
                return NextResponse.json({ error: 'Unknown action' }, { headers: corsHeaders, status: 400 });
        }
    } catch (error: any) {
        console.error('[api/db] Error:', error);
        return NextResponse.json(
            { error: error.message },
            { headers: corsHeaders, status: 500 }
        );
    }
}
