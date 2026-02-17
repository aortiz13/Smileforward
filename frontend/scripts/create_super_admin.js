require('dotenv').config({ path: '../.env.local' });
const { createClient } = require('@supabase/supabase-js');

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !serviceRoleKey) {
    console.error('Missing Supabase URL or Service Role Key');
    process.exit(1);
}

const supabase = createClient(supabaseUrl, serviceRoleKey, {
    auth: {
        autoRefreshToken: false,
        persistSession: false
    }
});

async function createSuperAdmin() {
    const email = 'superadmin@blukastor.com';
    const password = 'password123';

    console.log(`Attempting to create super admin: ${email}`);

    const { data, error } = await supabase.auth.admin.createUser({
        email,
        password,
        email_confirm: true
    });

    if (error) {
        console.error('Error creating user:', error.message);
        // If user already exists, try to get their ID
        if (error.message.includes('already registered')) {
            console.log('User already exists, attempting to fetch ID...');
            const { data: userData, error: userError } = await supabase.auth.admin.listUsers();
            if (userData && userData.users) {
                const user = userData.users.find(u => u.email === email);
                if (user) {
                    console.log('User found:');
                    console.log('ID:', user.id);
                    return;
                }
            }
        }
        return;
    }

    console.log('User created successfully:');
    console.log('ID:', data.user.id);
    console.log('Email:', data.user.email);
}

createSuperAdmin();
