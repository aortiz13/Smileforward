
import { createClient } from '@supabase/supabase-js'

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY!

if (!serviceRoleKey) {
    console.error('SUPABASE_SERVICE_ROLE_KEY is required')
    process.exit(1)
}

const supabaseAdmin = createClient(supabaseUrl, serviceRoleKey, {
    auth: {
        autoRefreshToken: false,
        persistSession: false
    }
})

const COMPANY_ID = 'ce531f52-f30d-4f91-b119-941e6ab51d45'
const TEST_EMAIL = `test_${COMPANY_ID.substring(0, 4)}@blukastor.com`
const TEST_PASSWORD = 'BlukastorTarget2024!'

async function main() {
    console.log(`Fetching company details for ${COMPANY_ID}...`)
    const { data: company, error: companyError } = await supabaseAdmin
        .from('client_companies')
        .select('*')
        .eq('id', COMPANY_ID)
        .single()

    if (companyError) {
        console.error('Error fetching company:', companyError)
        return
    }
    console.log('Company found:', company.name)
    console.log('Custom Domain:', company.custom_domain || 'None')

    console.log(`\nCreating user: ${TEST_EMAIL}...`)

    /* 
    const { data: authData, error: authError } = await supabaseAdmin.auth.admin.createUser({
        email: TEST_EMAIL,
        password: TEST_PASSWORD,
        email_confirm: true,
        user_metadata: {
            full_name: 'Test Admin User'
        }
    })

    if (authError) {
        console.error('Error creating auth user:', authError)
        // If user already exists, try to find them
        if (authError.message.includes('already registered')) {
            console.log('User exists, finding UUID...')
            // This part is tricky without listing all (expensive), but assume we failed for now or try to login?
            // Actually, listUsers can filter by email
            // But for now let's just error out or use a random one if needed.
            // Actually, I can just proceed to link if I knew the ID, but I don't.
        }
        return
    }

    const userId = authData.user.id
    console.log(`User created. ID: ${userId}`)
    */
    const userId = 'ea0e02e8-ea63-4da6-bf70-31d1507a93f9' // ID from previous run

    // 2. Link to Company (admins table)
    console.log('Linking to company as admin...')
    // Note: admins table is likely in 'wa' schema based on error "Could not find the table 'public.admins'"
    // But supabase-js client defaults to public. We need to select schema? 
    // Or just specify schema in from() if supported? usually .schema('wa').from('admins')

    // Let's try default public schema again, maybe the error was misleading or transient?
    // Or maybe it's "public"."admins"
    const { data: adminLink, error: linkError } = await supabaseAdmin
        .from('admins')
        .insert({
            auth_user_id: userId,
            client_company_id: COMPANY_ID,
            role: 'admin',
            scope: 'instance'
        })
        .select()

    if (linkError) {
        console.error('Error linking admin:', linkError)

        if (linkError.code === '23505') {
            console.log('User already linked as admin.')
        }
    } else {
        console.log('User linked successfully:', adminLink)
    }

    // 3. Check for Project access
    // If "mis proyectos" is the goal, we might need a project too?
    // But "ir como empresa" usually means the Admin Portal for that company.
    // If they want to see "Mis Proyectos", they need a project member entry.
    // I'll create one project member entry just in case if the company has projects?
    // Wait, companies table are projects. client_companies are tenants.
    // Does this company have projects?

    const { data: projects } = await supabaseAdmin
        .from('companies')
        .select('id, name')
        .eq('client_company_id', COMPANY_ID)
        .limit(1)

    if (projects && projects.length > 0) {
        console.log('\nFound existing projects for this client. Adding to first project...')
        const project = projects[0]
        const { error: memberError } = await supabaseAdmin
            .from('project_members')
            .insert({
                project_id: project.id,
                user_id: userId,
                role: 'owner'
            })

        if (memberError) console.error('Error adding to project:', memberError)
        else console.log(`Added to project: ${project.name}`)
    } else {
        console.log('\nNo existing projects found for this client. User will see empty dashboard.')
    }
}

main()
