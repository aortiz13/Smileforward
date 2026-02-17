
import { createClient } from '@supabase/supabase-js'

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!

const supabase = createClient(supabaseUrl, supabaseKey)

async function main() {
    console.log('Fetching project members from view...')
    // Try to get email if available in the view
    const { data: members, error } = await supabase
        .from('project_members_view')
        .select('*')
        .limit(10)

    if (error) {
        console.error('Error fetching members:', error)
        return
    }

    console.log('Found members:', JSON.stringify(members, null, 2))

    if (members && members.length > 0) {
        console.log('\nPotential users to login as (look for email):')
        members.forEach((m: any) => {
            // Check for common email fields
            const email = m.email || m.user_email || m.username || 'Email not in view'
            console.log(`- Role: ${m.role}, User ID: ${m.user_id}, Email: ${email}, Project: ${m.project_id}`)
        })
    } else {
        console.log('No members found in project_members_view.')
    }
}

main()
