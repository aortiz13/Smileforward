import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'

export default async function DashboardPage() {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()

    if (!user) {
        redirect('/login')
    }

    // Try to find the user's company to redirect to the correct tenant portal
    const { data: admin } = await supabase
        .from('admin_profiles')
        .select('company_id')
        .eq('auth_user_id', user.id)
        .single()

    if (admin) {
        // In a real multi-tenant app, we'd lookup the domain for this company_id
        // For now, let's redirect to /admin if they are an admin
        redirect('/admin/dashboard')
    }

    // Fallback or find first associated company in user_company_links (if implemented)
    redirect('/')
}
