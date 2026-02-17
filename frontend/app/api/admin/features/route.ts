import { createClient } from '@/lib/supabase/server'
import { NextResponse } from 'next/server'

export async function POST(request: Request) {
    try {
        const supabase = await createClient()

        // Check if user is super admin
        const { data: { user } } = await supabase.auth.getUser()
        if (!user) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
        }

        const { data: adminCheck } = await supabase
            .from('admin_profiles')
            .select('role, scope')
            .eq('auth_user_id', user.id)
            .single()

        if (!adminCheck || (adminCheck.scope !== 'global' && adminCheck.role !== 'super_admin')) {
            return NextResponse.json({ error: 'Forbidden: Super admin privileges required' }, { status: 403 })
        }

        // Parse request body
        const body = await request.json()
        const { company_id, feature_key, enabled } = body

        // Validate required fields
        if (!company_id || !feature_key || enabled === undefined) {
            return NextResponse.json({ error: 'Missing required fields' }, { status: 400 })
        }

        // Upsert feature toggle
        const { data, error } = await supabase
            .from('instance_features')
            .upsert({
                company_id,
                feature_key,
                enabled,
            }, {
                onConflict: 'company_id,feature_key'
            })
            .select()
            .single()

        if (error) {
            console.error('Error toggling feature:', error)
            return NextResponse.json({ error: error.message }, { status: 500 })
        }

        // If disabling an agent, also set company_prompts.active = false
        if (feature_key.startsWith('agent:') && !enabled) {
            const agentType = feature_key.replace('agent:', '')
            await supabase
                .from('company_prompts')
                .update({ active: false })
                .eq('company_id', company_id)
                .eq('agent_type', agentType)
        }

        return NextResponse.json({
            success: true,
            feature: data,
        })
    } catch (error: any) {
        console.error('Error in POST /api/admin/features:', error)
        return NextResponse.json({ error: error.message || 'Internal server error' }, { status: 500 })
    }
}

export async function GET(request: Request) {
    try {
        const supabase = await createClient()

        // Check if user is authenticated
        const { data: { user } } = await supabase.auth.getUser()
        if (!user) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
        }

        // Get company_id from query params
        const { searchParams } = new URL(request.url)
        const companyId = searchParams.get('company_id')

        if (!companyId) {
            return NextResponse.json({ error: 'Missing company_id parameter' }, { status: 400 })
        }

        // Fetch features
        const { data: features, error } = await supabase
            .from('instance_features')
            .select('*')
            .eq('company_id', companyId)

        if (error) {
            return NextResponse.json({ error: error.message }, { status: 500 })
        }

        return NextResponse.json({ features })
    } catch (error: any) {
        console.error('Error in GET /api/admin/features:', error)
        return NextResponse.json({ error: error.message || 'Internal server error' }, { status: 500 })
    }
}
