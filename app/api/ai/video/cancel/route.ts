import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';

export async function POST(req: NextRequest) {
    try {
        const { generation_id } = await req.json();

        if (!generation_id) {
            return NextResponse.json({ error: 'generation_id is required' }, { status: 400 });
        }

        // Update the generation status to cancelled
        await db.query(
            `UPDATE generations SET status = 'cancelled', metadata = COALESCE(metadata, '{}'::jsonb) || jsonb_build_object('cancelled_at', NOW()::text) WHERE id = $1`,
            [generation_id]
        );

        return NextResponse.json({ success: true });
    } catch (error: any) {
        console.error('[api/ai/video/cancel] Error:', error);
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}
