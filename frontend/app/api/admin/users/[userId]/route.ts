import { createClient } from '@/lib/supabase/server'
import { NextResponse } from 'next/server'

export async function GET(
    request: Request,
    { params }: { params: Promise<{ userId: string }> }
) {
    try {
        const supabase = await createClient()
        const { userId } = await params

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

        // Fetch user details
        const { data: userData, error } = await supabase
            .from('admin_users_view')
            .select('*')
            .eq('auth_user_id', userId)
            .single()

        if (error) {
            console.error('Error fetching user:', error)
            return NextResponse.json({ error: error.message }, { status: 500 })
        }

        return NextResponse.json({ user: userData })
    } catch (error: any) {
        console.error('Error in GET /api/admin/users/[userId]:', error)
        return NextResponse.json({ error: error.message || 'Internal server error' }, { status: 500 })
    }
}

export async function PATCH(
    request: Request,
    { params }: { params: Promise<{ userId: string }> }
) {
    try {
        const supabase = await createClient()
        const { userId } = await params

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
        const { role } = body

        if (!role) {
            return NextResponse.json({ error: 'Role is required' }, { status: 400 })
        }

        // Update admin role
        const { data: updatedAdmin, error } = await supabase
            .from('admins')
            .update({ role })
            .eq('auth_user_id', userId)
            .select()
            .single()

        if (error) {
            console.error('Error updating user role:', error)
            return NextResponse.json({ error: error.message }, { status: 500 })
        }

        return NextResponse.json({
            success: true,
            admin: updatedAdmin,
            message: 'User role updated successfully'
        })
    } catch (error: any) {
        console.error('Error in PATCH /api/admin/users/[userId]:', error)
        return NextResponse.json({ error: error.message || 'Internal server error' }, { status: 500 })
    }
}

export async function DELETE(
    request: Request,
    { params }: { params: Promise<{ userId: string }> }
) {
    try {
        const supabase = await createClient()
        const { userId } = await params

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

        // Remove user from admins table
        const { error: adminError } = await supabase
            .from('admins')
            .delete()
            .eq('auth_user_id', userId)

        if (adminError) {
            console.error('Error removing admin:', adminError)
            return NextResponse.json({ error: adminError.message }, { status: 500 })
        }

        // Also remove from project_members
        const { error: projectError } = await supabase
            .from('project_members')
            .delete()
            .eq('user_id', userId)

        if (projectError) {
            console.error('Error removing project memberships:', projectError)
            // Don't fail the request, just log it
        }

        return NextResponse.json({
            success: true,
            message: 'User removed successfully'
        })
    } catch (error: any) {
        console.error('Error in DELETE /api/admin/users/[userId]:', error)
        return NextResponse.json({ error: error.message || 'Internal server error' }, { status: 500 })
    }
}
