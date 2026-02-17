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
        const { logo_url, primary_color, secondary_color, custom_domain } = body

        const updates: any = {}
        if (logo_url !== undefined) updates.logo_url = logo_url
        if (primary_color !== undefined) updates.primary_color = primary_color
        if (secondary_color !== undefined) updates.secondary_color = secondary_color
        if (custom_domain !== undefined) updates.custom_domain = custom_domain

        if (Object.keys(updates).length === 0) {
            return NextResponse.json({ error: 'No branding fields to update' }, { status: 400 })
        }

        // Update company branding
        const { data: company, error } = await supabase
            .from('companies')
            .update(updates)
            .eq('id', id)
            .select()
            .single()

        if (error) {
            console.error('Error updating branding:', error)
            return NextResponse.json({ error: error.message }, { status: 500 })
        }

        return NextResponse.json({
            success: true,
            company,
            message: 'Branding updated successfully'
        })
    } catch (error: any) {
        console.error('Error in POST /api/admin/companies/[id]/branding:', error)
        return NextResponse.json({ error: error.message || 'Internal server error' }, { status: 500 })
    }
}
