import { createClient } from '@/lib/supabase/server'
import { NextResponse } from 'next/server'

/**
 * Webhook endpoint for n8n "Trigger Error" nodes
 * Receives error details from n8n workflows and stores them in system_error_logs
 * 
 * Expected payload from n8n:
 * {
 *   "workflow_id": "string",
 *   "workflow_name": "string",
 *   "execution_id": "string",
 *   "error_type": "string",
 *   "error_message": "string",
 *   "stack_trace": "string",
 *   "severity": "critical" | "warning" | "info",
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
        if (!body.error_message || !body.error_type) {
            return NextResponse.json(
                { error: 'Missing required fields: error_message, error_type' },
                { status: 400 }
            )
        }

        // Create Supabase client with service role for insert permission
        const supabase = await createClient()

        // Insert error log
        const { data, error } = await supabase
            .from('system_error_logs')
            .insert({
                severity: body.severity || 'warning',
                origin: 'n8n_webhook',
                error_type: body.error_type,
                error_message: body.error_message,
                stack_trace: body.stack_trace || null,
                metadata: {
                    workflow_id: body.workflow_id,
                    workflow_name: body.workflow_name,
                    execution_id: body.execution_id,
                    ...body.metadata
                },
                company_id: body.company_id || null,
                contact_id: body.contact_id || null,
                resolved: false
            })
            .select()
            .single()

        if (error) {
            console.error('Error inserting error log:', error)
            return NextResponse.json(
                { error: 'Failed to insert error log', details: error.message },
                { status: 500 }
            )
        }

        return NextResponse.json({
            success: true,
            log_id: data.id,
            message: 'Error logged successfully'
        })

    } catch (error) {
        console.error('Webhook error:', error)
        return NextResponse.json(
            { error: 'Internal server error', details: error instanceof Error ? error.message : 'Unknown error' },
            { status: 500 }
        )
    }
}
