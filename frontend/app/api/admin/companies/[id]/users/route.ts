import { createClient } from '@/lib/supabase/server'
import { createClient as createSupabaseClient } from '@supabase/supabase-js'
import { NextResponse } from 'next/server'

export async function POST(
    request: Request,
    { params }: { params: Promise<{ id: string }> }
) {
    try {
        const supabase = await createClient()
        // ... existing code ...
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
        const { email, role = 'user' } = body

        if (!email) {
            return NextResponse.json({ error: 'Email is required' }, { status: 400 })
        }

        // Check if user exists in auth.users
        const { data: existingAuthUser } = await supabase
            .rpc('get_user_by_email', { user_email: email })

        let authUserId: string

        if (existingAuthUser && existingAuthUser.length > 0) {
            // User exists in auth
            authUserId = existingAuthUser[0].id

            // Check if already an admin for this company
            const { data: existingAdmin } = await supabase
                .from('admins')
                .select('id')
                .eq('auth_user_id', authUserId)
                .eq('client_company_id', id)
                .single()

            if (existingAdmin) {
                return NextResponse.json({ error: 'User is already an admin for this company' }, { status: 400 })
            }

            // Add as admin
            const { data: admin, error: adminError } = await supabase
                .from('admins')
                .insert({
                    auth_user_id: authUserId,
                    client_company_id: id,
                    role,
                    scope: 'instance'
                })
                .select()
                .single()

            if (adminError) {
                console.error('Error creating admin:', adminError)
                return NextResponse.json({ error: adminError.message }, { status: 500 })
            }

            return NextResponse.json({
                success: true,
                admin,
                message: 'User added as admin successfully'
            })
        } else {
            // User doesn't exist - Invite them
            const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY

            if (!serviceRoleKey) {
                return NextResponse.json({
                    error: 'User not found. Cannot invite without SUPABASE_SERVICE_ROLE_KEY configured.'
                }, { status: 400 }) // 400 because it's a server config issue blocking the request
            }

            const supabaseAdmin = createSupabaseClient(
                process.env.NEXT_PUBLIC_SUPABASE_URL!,
                serviceRoleKey,
                {
                    auth: {
                        autoRefreshToken: false,
                        persistSession: false
                    }
                }
            )

            const { data: inviteData, error: inviteError } = await supabaseAdmin.auth.admin.inviteUserByEmail(email)

            if (inviteError) {
                console.error('Error inviting user:', inviteError)
                return NextResponse.json({ error: 'Failed to invite user: ' + inviteError.message }, { status: 500 })
            }

            authUserId = inviteData.user.id

            // Now add as admin
            const { data: admin, error: adminError } = await supabase
                .from('admins')
                .insert({
                    auth_user_id: authUserId,
                    client_company_id: id, // Correct field name for client companies
                    role,
                    scope: 'instance'
                })
                .select()
                .single()

            if (adminError) {
                console.error('Error creating admin after invite:', adminError)
                return NextResponse.json({ error: adminError.message }, { status: 500 })
            }

            return NextResponse.json({
                success: true,
                admin,
                message: 'User invited and added successfully'
            })
        }
    } catch (error: any) {
        console.error('Error in POST /api/admin/companies/[id]/users:', error)
        return NextResponse.json({ error: error.message || 'Internal server error' }, { status: 500 })
    }
}
