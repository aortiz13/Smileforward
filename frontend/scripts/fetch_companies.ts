
import { createClient } from '@supabase/supabase-js'

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!

const supabase = createClient(supabaseUrl, supabaseKey)

async function main() {
    console.log('--- Client Companies (Tenants) ---')
    const { data: clientCompanies, error: clientError } = await supabase
        .from('client_companies')
        .select('id, name, custom_domain, instance_status')
        .limit(20)

    if (clientError) {
        console.error('Error fetching client_companies:', clientError)
    } else {
        console.log(JSON.stringify(clientCompanies, null, 2))

        // Check admins for these
        if (clientCompanies && clientCompanies.length > 0) {
            for (const company of clientCompanies) {
                console.log(`\nAdmins for ${company.name}:`)
                const { data: admins } = await supabase
                    .from('admins')
                    .select('*')
                    .eq('client_company_id', company.id)
                console.log(admins)
            }
        }
    }

    console.log('\n--- Regular Companies (User Projects) ---')
    const { data: companies, error: companiesError } = await supabase
        .from('companies')
        .select('id, name, client_company_id')
        .order('created_at', { ascending: false })
        .limit(20)

    if (companiesError) {
        console.error('Error fetching companies:', companiesError)
    } else {
        console.log(JSON.stringify(companies, null, 2))
    }
}

main()
