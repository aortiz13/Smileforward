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
        const {
            name,
            company_kind,
            contact_email,
            contact_phone,
            subscription_tier,
            instance_name,
            phone_number,
            custom_domain,
            primary_color,
            secondary_color,
            features,
            admin_email,
            admin_role,
        } = body

        // Validate required fields
        if (!name || !admin_email) {
            return NextResponse.json({ error: 'Missing required fields: name, admin_email' }, { status: 400 })
        }

        // 1. Create client company record
        const { data: company, error: companyError } = await supabase
            .from('client_companies')
            .insert({
                name,
                contact_email,
                contact_phone,
                custom_domain: custom_domain || null,
                primary_color: primary_color || '#6366f1',
                secondary_color: secondary_color || '#8b5cf6',
                subscription_tier: subscription_tier || 'starter',
                instance_status: 'trial', // New instances start as trial
                is_active: true,
            })
            .select()
            .single()

        if (companyError) {
            console.error('Error creating client company:', companyError)
            return NextResponse.json({ error: companyError.message }, { status: 500 })
        }

        // 2. Create WhatsApp instance if provided
        if (instance_name && phone_number) {
            const { error: instanceError } = await supabase
                .from('wa_instances')
                .insert({
                    client_company_id: company.id,
                    instance_name,
                    phone_number,
                })

            if (instanceError) {
                console.error('Error creating WA instance:', instanceError)
                // Don't fail the entire request, just log the error
            }
        }

        // 3. Insert instance features
        if (features && features.length > 0) {
            const featureRecords = features.map((feature_key: string) => ({
                client_company_id: company.id,
                feature_key,
                enabled: true,
            }))

            const { error: featuresError } = await supabase
                .from('instance_features')
                .insert(featureRecords)

            if (featuresError) {
                console.error('Error creating features:', featuresError)
                // Don't fail the entire request
            }
        }

        // 4. Create admin record
        // First, check if user exists in auth.users
        const { data: existingUser } = await supabase
            .from('auth.users')
            .select('id')
            .eq('email', admin_email)
            .single()

        if (existingUser) {
            // User exists, create admin record
            const { error: adminError } = await supabase
                .from('admins')
                .insert({
                    auth_user_id: existingUser.id,
                    client_company_id: company.id,
                    role: admin_role || 'owner',
                    scope: 'instance',
                })

            if (adminError) {
                console.error('Error creating admin:', adminError)
            }
        } else {
            // User doesn't exist, we'll need to invite them
            // For now, just log this - in production you'd send an invitation email
            console.log(`Need to invite user: ${admin_email} for company: ${company.id}`)
        }

        return NextResponse.json({
            success: true,
            company,
            message: 'Company created successfully',
        })
    } catch (error: any) {
        console.error('Error in POST /api/admin/companies:', error)
        return NextResponse.json({ error: error.message || 'Internal server error' }, { status: 500 })
    }
}

export async function GET(request: Request) {
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

        if (!adminCheck) {
            return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
        }

        // Fetch companies based on scope
        let query = supabase.from('admin_companies_unified').select('*')

        if (adminCheck.scope === 'instance') {
            // Instance admins only see their own company
            const { data: adminCompanies } = await supabase
                .from('admins')
                .select('client_company_id')
                .eq('auth_user_id', user.id)

            const companyIds = adminCompanies?.map(a => a.client_company_id) || []
            query = query.in('id', companyIds)
        }

        const { data: companies, error } = await query.order('created_at', { ascending: false })

        if (error) {
            return NextResponse.json({ error: error.message }, { status: 500 })
        }

        return NextResponse.json({ companies })
    } catch (error: any) {
        console.error('Error in GET /api/admin/companies:', error)
        return NextResponse.json({ error: error.message || 'Internal server error' }, { status: 500 })
    }
}
