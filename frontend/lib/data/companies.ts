import { SupabaseClient } from '@supabase/supabase-js'

export const getCompanyByDomain = async (supabase: SupabaseClient, domain: string) => {
    // 1. Try finding by custom domain
    const { data } = await supabase.rpc('get_company_by_domain', {
        domain_arg: domain
    }).single()

    if (data) return data as any;

    // 1.5. Try finding client_company by custom_domain (for tenant portals) using SECURE RPC
    // This bypasses RLS for public layout rendering
    const { data: clientByDomain } = await supabase.rpc('get_client_company_by_domain', {
        domain_arg: domain
    }).single()

    if (clientByDomain) return clientByDomain as any;

    // 2. Fallback: Try finding by ID (uuid)
    const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
    if (uuidRegex.test(domain)) {
        const { data: byId } = await supabase
            .from('companies')  // Query companies directly (RLS applies)
            .select('*')
            .eq('id', domain)
            .single()

        if (byId) return byId as any;
    }

    // 3. Last resort: Try finding client_company by ID
    if (uuidRegex.test(domain)) {
        const { data: clientById } = await supabase
            .from('client_companies')
            .select('*')
            .eq('id', domain)
            .single()

        if (clientById) return clientById as any;
    }

    return null
}
