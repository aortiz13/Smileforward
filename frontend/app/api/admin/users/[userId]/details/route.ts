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

        // Fetch user details from wa_contacts_view
        // Try by contact id first (for WhatsApp-only contacts)
        const { data: contactData, error: contactError } = await supabase
            .from('wa_contacts_view')
            .select(`
                *,
                client_companies!company_id (
                    id,
                    name
                )
            `)
            .eq('id', userId)
            .single()

        // If not found by contact id, try by user_id (for contacts with auth accounts)
        let contact = contactData
        if (contactError || !contactData) {
            const { data: altContactData } = await supabase
                .from('wa_contacts_view')
                .select(`
                    *,
                    client_companies!company_id (
                        id,
                        name
                    )
                `)
                .eq('user_id', userId)
                .single()

            contact = altContactData
        }

        // Fetch admin user details if exists
        const { data: adminUser } = await supabase
            .from('admin_users_view')
            .select('*')
            .eq('auth_user_id', userId)
            .single()

        // Fetch associated projects
        const { data: projects } = await supabase
            .from('project_members')
            .select(`
                role,
                companies!project_id (
                    id,
                    name
                )
            `)
            .eq('user_id', userId)

        // Build comprehensive user details
        const userDetails = {
            id: contact?.id || userId,
            auth_user_id: userId,
            email: adminUser?.email,
            phone: contact?.phone,
            real_name: contact?.real_name,
            push_name: contact?.push_name,
            nickname: contact?.nickname,
            role: adminUser?.role,
            company_id: contact?.company_id || adminUser?.company_id,
            company_name: (contact?.client_companies as any)?.name || adminUser?.company_name,
            projects: projects?.map(p => ({
                id: (p.companies as any)?.id,
                name: (p.companies as any)?.name,
                role: p.role
            })).filter(p => p.id && p.name) || [],
            created_at: contact?.created_at || adminUser?.user_created_at,
            last_sign_in_at: adminUser?.last_sign_in_at,
            last_seen: contact?.last_seen,
            is_admin: !!adminUser,
            is_wa_only: userId === '00000000-0000-0000-0000-000000000000',
            tags: contact?.tags || [],
            attributes: contact?.attributes || {},
            notes: contact?.notes
        }

        return NextResponse.json({ user: userDetails })
    } catch (error: any) {
        console.error('Error in GET /api/admin/users/[userId]/details:', error)
        return NextResponse.json({ error: error.message || 'Internal server error' }, { status: 500 })
    }
}
