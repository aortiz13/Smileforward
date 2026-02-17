import { createClient } from '@/lib/supabase/server'
import { NextResponse } from 'next/server'

/**
 * Webhook endpoint for n8n workflow execution status
 * Receives execution details from n8n workflows and stores them in n8n_workflow_status
 * 
 * Expected payload from n8n:
 * {
 *   "workflow_id": "string",
 *   "workflow_name": "string",
 *   "execution_id": "string",
 *   "status": "success" | "error" | "running" | "waiting",
 *   "started_at": "ISO timestamp",
 *   "finished_at": "ISO timestamp",
 *   "execution_time_ms": number,
 *   "error_message": "string" (optional),
 *   "metadata": { ... }
 * }
 */
export async function POST(request: Request) {
    try {
        // Validate API key from n8n
        const apiKey = request.headers.get('x-api-key')
        if (apiKey !== process.env.N8N_WEBHOOK_API_KEY) {
            return NextResponse.json(
                { error: 'Unauthorized' },
                { status: 401 }
            )
        }

        const body = await request.json()

        // Validate required fields
        if (!body.workflow_id || !body.workflow_name || !body.status) {
            return NextResponse.json(
                { error: 'Missing required fields: workflow_id, workflow_name, status' },
                { status: 400 }
            )
        }

        // Validate status enum
        const validStatuses = ['success', 'error', 'running', 'waiting']
        if (!validStatuses.includes(body.status)) {
            return NextResponse.json(
                { error: `Invalid status. Must be one of: ${validStatuses.join(', ')}` },
                { status: 400 }
            )
        }

        // Create Supabase client with service role for insert permission
        const supabase = await createClient()

        // Insert workflow execution status
        const { data, error } = await supabase
            .from('n8n_workflow_status')
            .insert({
                workflow_id: body.workflow_id,
                workflow_name: body.workflow_name,
                execution_id: body.execution_id || null,
                status: body.status,
                started_at: body.started_at || new Date().toISOString(),
                finished_at: body.finished_at || null,
                execution_time_ms: body.execution_time_ms || null,
                error_message: body.error_message || null,
                metadata: body.metadata || {}
            })
            .select()
            .single()

        if (error) {
            console.error('Error inserting workflow status:', error)
            return NextResponse.json(
                { error: 'Failed to insert workflow status', details: error.message },
                { status: 500 }
            )
        }

        return NextResponse.json({
            success: true,
            status_id: data.id,
            message: 'Workflow execution status logged successfully'
        })

    } catch (error) {
        console.error('Webhook error:', error)
        return NextResponse.json(
            { error: 'Internal server error', details: error instanceof Error ? error.message : 'Unknown error' },
            { status: 500 }
        )
    }
}
