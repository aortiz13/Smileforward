'use server'

import { createClient } from '../supabase/server'

export interface DashboardMetrics {
    companyCount: number
    activePortalCount: number
    userCount: number
}

export async function getDashboardMetrics(): Promise<DashboardMetrics> {
    const supabase = await createClient()

    // 1. Get Company Counts (Total & Active)
    // We can do this in parallel or separate queries.
    // Given the small scale, separate queries are fine for clarity.

    // Total Client Companies
    const { count: companyCount, error: companyError } = await supabase
        .from('client_companies')
        .select('*', { count: 'exact', head: true })

    if (companyError) {
        console.error('Error fetching company count:', companyError)
    }

    // Active Portals (client_companies where is_active = true)
    // Adjust logic if "Active Portal" means something else, but based on schema implies "is_active"
    const { count: activeCount, error: activeError } = await supabase
        .from('client_companies')
        .select('*', { count: 'exact', head: true })
        .eq('is_active', true)

    if (activeError) {
        console.error('Error fetching active company count:', activeError)
    }

    // 2. Get User Count
    // Since we don't have access to auth.users in public schema, we approximate active users
    // by counting distinct user_ids in project_members.
    // This represents users who are actually assigned to at least one project/company.

    // Note: Supabase .select() with count doesn't easily support DISTINCT fast counting without a view or RPC
    // But for now, we can fetch unique user_ids from project_members since the table is likely small enough.
    // OR we can rely on a rough count of project_members if distinct is too heavy, but distinct is better.

    const { data: members, error: membersError } = await supabase
        .from('project_members_view')
        .select('user_id')

    let userCount = 0
    if (members && !membersError) {
        const uniqueUsers = new Set(members.map(m => m.user_id))
        userCount = uniqueUsers.size
    } else {
        console.error('Error fetching project members view for user count:', JSON.stringify(membersError, null, 2))
        // Non-critical, return 0
    }

    // Fallback: If project_members is empty (migration just happened), checks wa.admins?
    // Let's stick to project_members + wa.admins contact_ids?
    // Actually, `wa.admins` links distinct authenticated users to companies too.
    // Let's combine unique IDs from project_members and wa.admins to be thorough?
    // "Total Users" usually implies total registered users. Without admin access to auth.users, 
    // counting distinct people with access is the best proxy.

    return {
        companyCount: companyCount || 0,
        activePortalCount: activeCount || 0,
        userCount: userCount
    }
}
