import { createClient } from '@/lib/supabase/server'
import { NextResponse } from 'next/server'

export async function POST(
    request: Request,
    { params }: { params: Promise<{ id: string }> }
) {
    try {
        const supabase = await createClient()
        const { id } = await params

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
        const { agent_key, system_prompt, user_prompt_template } = body

        if (!agent_key) {
            return NextResponse.json({ error: 'agent_key is required' }, { status: 400 })
        }

        // Check if variant already exists
        const { data: existing } = await supabase
            .from('prompt_variants')
            .select('id')
            .eq('company_id', id)
            .eq('agent_key', agent_key)
            .single()

        let result
        if (existing) {
            // Update existing variant
            const { data, error } = await supabase
                .from('prompt_variants')
                .update({
                    system_prompt,
                    user_prompt_template,
                    updated_at: new Date().toISOString()
                })
                .eq('id', existing.id)
                .select()
                .single()

            if (error) {
                console.error('Error updating prompt variant:', error)
                return NextResponse.json({ error: error.message }, { status: 500 })
            }
            result = data
        } else {
            // Create new variant
            const { data, error } = await supabase
                .from('prompt_variants')
                .insert({
                    company_id: id,
                    agent_key,
                    system_prompt,
                    user_prompt_template
                })
                .select()
                .single()

            if (error) {
                console.error('Error creating prompt variant:', error)
                return NextResponse.json({ error: error.message }, { status: 500 })
            }
            result = data
        }

        return NextResponse.json({
            success: true,
            variant: result,
            message: 'Agent prompt updated successfully'
        })
    } catch (error: any) {
        console.error('Error in POST /api/admin/companies/[id]/agents:', error)
        return NextResponse.json({ error: error.message || 'Internal server error' }, { status: 500 })
    }
}

export async function DELETE(
    request: Request,
    { params }: { params: Promise<{ id: string }> }
) {
    try {
        const supabase = await createClient()
        const { id } = await params

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

        // Get agent_key from query params
        const { searchParams } = new URL(request.url)
        const agent_key = searchParams.get('agent_key')

        if (!agent_key) {
            return NextResponse.json({ error: 'agent_key is required' }, { status: 400 })
        }

        // Delete variant
        const { error } = await supabase
            .from('prompt_variants')
            .delete()
            .eq('company_id', id)
            .eq('agent_key', agent_key)

        if (error) {
            console.error('Error deleting prompt variant:', error)
            return NextResponse.json({ error: error.message }, { status: 500 })
        }

        return NextResponse.json({
            success: true,
            message: 'Agent prompt restored to default'
        })
    } catch (error: any) {
        console.error('Error in DELETE /api/admin/companies/[id]/agents:', error)
        return NextResponse.json({ error: error.message || 'Internal server error' }, { status: 500 })
    }
}
