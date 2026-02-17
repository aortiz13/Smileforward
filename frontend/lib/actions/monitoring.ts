'use server'

import { createClient } from '../supabase/server'

export interface ErrorFilters {
    severity?: 'critical' | 'warning' | 'info'
    origin?: string
    startDate?: string
    endDate?: string
    resolved?: boolean
    companyId?: string
}

export interface AuditFilters {
    action?: string
    tableName?: string
    startDate?: string
    endDate?: string
    companyId?: string
}

export interface DateRange {
    startDate: string
    endDate: string
}

/**
 * Get system error logs with optional filters
 */
export async function getSystemErrors(filters: ErrorFilters = {}) {
    const supabase = await createClient()

    let query = supabase
        .from('system_error_logs')
        .select('*')
        .order('timestamp', { ascending: false })

    if (filters.severity) {
        query = query.eq('severity', filters.severity)
    }

    if (filters.origin) {
        query = query.eq('origin', filters.origin)
    }

    if (filters.resolved !== undefined) {
        query = query.eq('resolved', filters.resolved)
    }

    if (filters.companyId) {
        query = query.eq('company_id', filters.companyId)
    }

    if (filters.startDate) {
        query = query.gte('timestamp', filters.startDate)
    }

    if (filters.endDate) {
        query = query.lte('timestamp', filters.endDate)
    }

    const { data, error } = await query.limit(100)

    if (error) {
        console.error('Error fetching system errors:', error)
        throw new Error('Failed to fetch system errors')
    }

    return data
}

/**
 * Mark an error as resolved
 */
export async function resolveError(errorId: string, resolvedBy?: string) {
    const supabase = await createClient()

    const { data, error } = await supabase
        .from('system_error_logs')
        .update({
            resolved: true,
            resolved_at: new Date().toISOString(),
            resolved_by: resolvedBy || null
        })
        .eq('id', errorId)
        .select()
        .single()

    if (error) {
        console.error('Error resolving error:', error)
        throw new Error('Failed to resolve error')
    }

    return data
}

/**
 * Get n8n workflow execution status
 */
export async function getN8nWorkflowStatus(limit = 50) {
    const supabase = await createClient()

    const { data, error } = await supabase
        .from('n8n_workflow_status')
        .select('*')
        .order('created_at', { ascending: false })
        .limit(limit)

    if (error) {
        console.error('Error fetching workflow status:', error)
        throw new Error('Failed to fetch workflow status')
    }

    return data
}

/**
 * Get execution history for a specific workflow
 */
export async function getWorkflowExecutionHistory(workflowId: string, limit = 20) {
    const supabase = await createClient()

    const { data, error } = await supabase
        .from('n8n_workflow_status')
        .select('*')
        .eq('workflow_id', workflowId)
        .order('created_at', { ascending: false })
        .limit(limit)

    if (error) {
        console.error('Error fetching workflow execution history:', error)
        throw new Error('Failed to fetch workflow execution history')
    }

    return data
}

/**
 * Get user audit trail with optional filters
 */
export async function getUserAuditTrail(filters: AuditFilters = {}) {
    const supabase = await createClient()

    let query = supabase
        .from('user_audit_trail')
        .select('*')
        .order('timestamp', { ascending: false })

    if (filters.action) {
        query = query.eq('action', filters.action)
    }

    if (filters.tableName) {
        query = query.eq('table_name', filters.tableName)
    }

    if (filters.companyId) {
        query = query.eq('company_id', filters.companyId)
    }

    if (filters.startDate) {
        query = query.gte('timestamp', filters.startDate)
    }

    if (filters.endDate) {
        query = query.lte('timestamp', filters.endDate)
    }

    const { data, error } = await query.limit(100)

    if (error) {
        console.error('Error fetching audit trail:', error)
        throw new Error('Failed to fetch audit trail')
    }

    return data
}

/**
 * Get data quality issues
 */
export async function getDataQualityIssues() {
    const supabase = await createClient()

    const { data, error } = await supabase
        .from('data_quality_issues')
        .select('*')
        .order('detected_at', { ascending: false })
        .limit(100)

    if (error) {
        console.error('Error fetching data quality issues:', error)
        throw new Error('Failed to fetch data quality issues')
    }

    return data
}

/**
 * Get AI agent performance metrics
 */
export async function getAIAgentMetrics(dateRange?: DateRange) {
    const supabase = await createClient()

    let query = supabase
        .from('llm_invocations')
        .select('*')
        .order('started_at', { ascending: false })

    if (dateRange?.startDate) {
        query = query.gte('started_at', dateRange.startDate)
    }

    if (dateRange?.endDate) {
        query = query.lte('started_at', dateRange.endDate)
    }

    const { data, error } = await query.limit(1000)

    if (error) {
        console.error('Error fetching AI metrics:', error)
        throw new Error('Failed to fetch AI metrics')
    }

    // Calculate aggregated metrics
    const metrics = {
        totalInvocations: data.length,
        successRate: (data.filter(d => d.success).length / data.length) * 100,
        averageLatency: data.reduce((sum, d) => sum + (d.latency_ms || 0), 0) / data.length,
        byAgentType: {} as Record<string, {
            count: number
            avgLatency: number
            successRate: number
        }>
    }

    // Group by agent type
    data.forEach(invocation => {
        const agentType = invocation.agent_type || 'unknown'
        if (!metrics.byAgentType[agentType]) {
            metrics.byAgentType[agentType] = {
                count: 0,
                avgLatency: 0,
                successRate: 0
            }
        }
        metrics.byAgentType[agentType].count++
    })

    // Calculate averages per agent type
    Object.keys(metrics.byAgentType).forEach(agentType => {
        const agentData = data.filter(d => d.agent_type === agentType)
        metrics.byAgentType[agentType].avgLatency =
            agentData.reduce((sum, d) => sum + (d.latency_ms || 0), 0) / agentData.length
        metrics.byAgentType[agentType].successRate =
            (agentData.filter(d => d.success).length / agentData.length) * 100
    })

    return metrics
}

/**
 * Get agent performance by specific agent type
 */
export async function getAgentPerformanceByType(agentType: string, dateRange?: DateRange) {
    const supabase = await createClient()

    let query = supabase
        .from('llm_invocations')
        .select('*')
        .eq('agent_type', agentType)
        .order('started_at', { ascending: false })

    if (dateRange?.startDate) {
        query = query.gte('started_at', dateRange.startDate)
    }

    if (dateRange?.endDate) {
        query = query.lte('started_at', dateRange.endDate)
    }

    const { data, error } = await query.limit(500)

    if (error) {
        console.error('Error fetching agent performance:', error)
        throw new Error('Failed to fetch agent performance')
    }

    return data
}

// ============================================================================
// CONVERSATION AUDIT FUNCTIONS
// ============================================================================

export interface ConversationFilters {
    companyId?: string
    contactId?: string
    agentType?: string
    startDate?: string
    endDate?: string
    searchTerm?: string
    limit?: number
}

interface WhatsAppMessage {
    id: string
    role: string
    content: string
    timestamp: string
    agentType?: string
    agentSummary?: string
    media?: any
    metadata: {
        aiStatus?: string
        agentAction?: string
        wasSummarized?: boolean
        tokenCount?: number
    }
}

interface AIChatMessage {
    id: string
    role: string
    content: string
    timestamp: string
    agentType?: string
    contentType?: string
    metadata: Record<string, any>
}

type ConversationMessage = WhatsAppMessage | AIChatMessage

interface ConversationTranscript {
    source: 'whatsapp' | 'ai_chat'
    messages: ConversationMessage[]
}


/**
 * Get conversation sessions with optional filters
 */
export async function getConversationSessions(filters: ConversationFilters = {}) {
    const supabase = await createClient()

    let query = supabase
        .from('conversation_sessions')
        .select('*')
        .order('session_end', { ascending: false })

    if (filters.companyId) {
        query = query.eq('company_id', filters.companyId)
    }

    if (filters.contactId) {
        query = query.eq('contact_id', filters.contactId)
    }

    if (filters.agentType) {
        query = query.ilike('agent_types', `%${filters.agentType}%`)
    }

    if (filters.startDate) {
        query = query.gte('session_start', filters.startDate)
    }

    if (filters.endDate) {
        query = query.lte('session_end', filters.endDate)
    }

    if (filters.searchTerm) {
        query = query.or(`phone.ilike.%${filters.searchTerm}%,real_name.ilike.%${filters.searchTerm}%,push_name.ilike.%${filters.searchTerm}%`)
    }

    const { data, error } = await query.limit(filters.limit || 50)

    if (error) {
        console.error('Error fetching conversation sessions:', error)
        throw new Error('Failed to fetch conversation sessions')
    }

    return data
}

/**
 * Get full transcript for a conversation session
 */
export async function getConversationTranscript(sessionId: string): Promise<ConversationTranscript> {
    const supabase = await createClient()

    // Check if this is a WhatsApp session (format: {contact_id}_wa_{session_group})
    if (sessionId.includes('_wa_')) {
        // Extract contact_id and session_group from session_id
        const parts = sessionId.split('_wa_')
        const contactId = parts[0]
        const sessionGroup = parseInt(parts[1])

        // Get the session details to find the time range
        const { data: sessionData } = await supabase
            .from('conversation_sessions')
            .select('session_start, session_end')
            .eq('session_id', sessionId)
            .single()

        if (!sessionData) {
            throw new Error('Session not found')
        }

        // Fetch messages within the session time range for this contact
        const { data: waMessages, error: waError } = await supabase
            .from('wa_consolidated')
            .select('*')
            .eq('contact_id', contactId)
            .gte('timestamp', sessionData.session_start)
            .lte('timestamp', sessionData.session_end)
            .order('timestamp', { ascending: true })

        if (waError) {
            console.error('Error fetching WhatsApp transcript:', waError)
            throw new Error('Failed to fetch WhatsApp transcript')
        }

        return {
            source: 'whatsapp',
            messages: waMessages.map(msg => ({
                id: msg.id,
                role: msg.role || 'user',
                content: msg.content,
                timestamp: msg.timestamp,
                agentType: msg.agent_type,
                agentSummary: msg.agent_summary,
                media: msg.media,
                metadata: {
                    aiStatus: msg.ai_status,
                    agentAction: msg.agent_action,
                    wasSummarized: msg.was_summarized,
                    tokenCount: msg.token_count
                }
            })) as WhatsAppMessage[]
        }
    }

    // If not WhatsApp, try ai_chat_memory (uses native session_id)
    const { data: aiMessages, error: aiError } = await supabase
        .from('ai_chat_memory')
        .select('*')
        .eq('session_id', sessionId)
        .order('created_at', { ascending: true })

    if (aiError) {
        console.error('Error fetching conversation transcript:', aiError)
        throw new Error('Failed to fetch conversation transcript')
    }

    return {
        source: 'ai_chat',
        messages: aiMessages.map(msg => ({
            id: msg.id,
            role: msg.role,
            content: msg.content,
            timestamp: msg.created_at,
            agentType: msg.agent_type,
            contentType: msg.content_type,
            metadata: msg.metadata || {}
        })) as AIChatMessage[]
    }
}

/**
 * Get conversation metrics for dashboard KPIs
 */
export async function getConversationMetrics(dateRange?: DateRange) {
    const supabase = await createClient()

    let query = supabase
        .from('conversation_sessions')
        .select('*')

    if (dateRange?.startDate) {
        query = query.gte('session_start', dateRange.startDate)
    }

    if (dateRange?.endDate) {
        query = query.lte('session_end', dateRange.endDate)
    }

    const { data, error } = await query

    if (error) {
        console.error('Error fetching conversation metrics:', error)
        throw new Error('Failed to fetch conversation metrics')
    }

    // Calculate metrics
    const totalSessions = data.length
    const totalMessages = data.reduce((sum, session) => sum + (session.message_count || 0), 0)
    const avgMessagesPerSession = totalSessions > 0 ? totalMessages / totalSessions : 0
    const avgDuration = totalSessions > 0
        ? data.reduce((sum, session) => sum + (session.duration_seconds || 0), 0) / totalSessions
        : 0

    // Sessions today
    const today = new Date()
    today.setHours(0, 0, 0, 0)
    const sessionsToday = data.filter(session => {
        const sessionDate = new Date(session.session_start)
        return sessionDate >= today
    }).length

    // Group by agent type
    const byAgentType: Record<string, number> = {}
    data.forEach(session => {
        const agents = session.agent_types?.split(', ') || []
        agents.forEach((agent: string) => {
            byAgentType[agent] = (byAgentType[agent] || 0) + 1
        })
    })

    return {
        totalSessions,
        totalMessages,
        avgMessagesPerSession: Math.round(avgMessagesPerSession * 10) / 10,
        avgDurationMinutes: Math.round((avgDuration / 60) * 10) / 10,
        sessionsToday,
        byAgentType,
        rawData: data
    }
}

/**
 * Export conversation transcript as JSON or text
 */
export async function exportConversationTranscript(sessionId: string, format: 'json' | 'txt' = 'json') {
    const transcript = await getConversationTranscript(sessionId)

    if (format === 'json') {
        return JSON.stringify(transcript, null, 2)
    }

    // Format as readable text
    let text = `Conversation Transcript\n`
    text += `Session ID: ${sessionId}\n`
    text += `Source: ${transcript.source}\n`
    text += `Messages: ${transcript.messages.length}\n`
    text += `\n${'='.repeat(80)}\n\n`

    transcript.messages.forEach((msg, index) => {
        const timestamp = new Date(msg.timestamp).toLocaleString('es-CL')
        text += `[${index + 1}] ${timestamp} - ${msg.role.toUpperCase()}\n`
        if (msg.agentType) {
            text += `Agent: ${msg.agentType}\n`
        }
        text += `${msg.content}\n`

        // Check if message is WhatsAppMessage type (has agentSummary)
        if ('agentSummary' in msg && msg.agentSummary) {
            text += `Summary: ${msg.agentSummary}\n`
        }
        text += `\n${'-'.repeat(80)}\n\n`
    })

    return text
}



// ============================================================================
// N8N DEEP INTEGRATION (WORKFLOW VISUALIZATION)
// ============================================================================

/**
 * Get full workflow details (nodes, connections) from n8n API
 * Uses environment variables N8N_API_URL and N8N_API_KEY
 */
export async function getN8nWorkflowDetails(workflowId: string) {
    const n8nUrl = process.env.N8N_API_URL
    const n8nKey = process.env.N8N_API_KEY

    // If no credentials, return mock structure for demo/dev if needed, or null
    // But better to fail gracefully or return error
    if (!n8nUrl || !n8nKey) {
        console.warn('N8N credentials not configured')
        return null
    }

    try {
        const response = await fetch(`${n8nUrl}/api/v1/workflows/${workflowId}`, {
            headers: {
                'X-N8N-API-KEY': n8nKey
            },
            next: { revalidate: 0 } // No cache for live data
        })

        if (!response.ok) {
            console.error(`Failed to fetch workflow details: ${response.status} ${response.statusText}`)
            return null
        }

        const data = await response.json()
        return data
    } catch (error) {
        console.error('Error fetching n8n workflow details:', error)
        return null
    }
}

/**
 * Get all workflows from n8n API
 * detailed: true is required to get tags in the list response
 */
export async function getN8nWorkflows() {
    const n8nUrl = process.env.N8N_API_URL
    const n8nKey = process.env.N8N_API_KEY
    // Tag ID for "Diana" - Used to filter workflows for this app
    const TAG_ID = 'XmLOpjNMQk8o5AMf'

    if (!n8nUrl || !n8nKey) {
        return []
    }

    try {
        // Fetch ALL workflows (filtering via query param failed in tests)
        console.log('Fetching all workflows from:', `${n8nUrl}/api/v1/workflows`)
        const response = await fetch(`${n8nUrl}/api/v1/workflows`, {
            headers: {
                'X-N8N-API-KEY': n8nKey
            },
            next: { revalidate: 0 }
        })

        if (!response.ok) {
            console.error(`Failed to fetch workflows: ${response.status} ${await response.text()}`)
            return []
        }

        const data = await response.json()
        let workflows = []

        if (Array.isArray(data)) {
            workflows = data
        } else if (data.data && Array.isArray(data.data)) {
            workflows = data.data
        }

        // Client-side filtering by Tag ID
        // n8n returns tags as array of objects { id, name, ... }
        const filteredWorkflows = workflows.filter((w: any) => {
            if (!w.tags || !Array.isArray(w.tags)) return false
            return w.tags.some((t: any) => t.id === TAG_ID || t.name === 'Diana')
        })

        console.log(`Filtered ${workflows.length} workflows to ${filteredWorkflows.length} with tag ${TAG_ID}`)
        return filteredWorkflows

    } catch (error) {
        console.error('Error fetching n8n workflows:', error)
        return []
    }
}

/**
 * Get executions from n8n API
 */
export async function getN8nExecutions(workflowId?: string, limit = 20) {
    const n8nUrl = process.env.N8N_API_URL
    const n8nKey = process.env.N8N_API_KEY

    if (!n8nUrl || !n8nKey) {
        return []
    }

    try {
        const url = new URL(`${n8nUrl}/api/v1/executions`)
        url.searchParams.append('limit', limit.toString())
        if (workflowId) {
            url.searchParams.append('workflowId', workflowId)
        }

        const response = await fetch(url.toString(), {
            headers: {
                'X-N8N-API-KEY': n8nKey
            },
            next: { revalidate: 0 }
        })

        if (!response.ok) {
            console.error(`Failed to fetch executions: ${response.status}`)
            return []
        }

        const data = await response.json()
        const executions = data.data || []

        if (workflowId) {
            console.log(`Debug: Fetched ${executions.length} executions for workflow ${workflowId}`)
        }

        // Map to uniform format
        return executions.map((exec: any) => {
            const startedAt = new Date(exec.startedAt)
            const stoppedAt = exec.stoppedAt ? new Date(exec.stoppedAt) : new Date()
            const duration = stoppedAt.getTime() - startedAt.getTime()

            return {
                id: exec.id,
                workflow_id: exec.workflowId,
                workflow_name: exec.workflowName || 'Unknown Workflow', // n8n API might not return name here
                status: exec.status || (exec.finished ? 'success' : 'running'), // fallback
                started_at: exec.startedAt,
                finished_at: exec.stoppedAt,
                execution_time_ms: duration,
                created_at: exec.startedAt,
                metadata: { mode: exec.mode }
            }
        })

    } catch (error) {
        console.error('Error fetching n8n executions:', error)
        return []
    }
}
