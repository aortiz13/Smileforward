require('dotenv').config({ path: '../.env.local' });
const { createClient } = require('@supabase/supabase-js');

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseKey) {
    console.error('Missing Supabase URL or Key');
    process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

async function createAdmin() {
    const email = 'admin@blukastor.com';
    const password = 'password123';

    console.log(`Attempting to create user: ${email}`);

    const { data, error } = await supabase.auth.signUp({
        email,
        password,
    });

    if (error) {
        console.error('Error creating user:', error.message);
        return;
    }

    console.log('User created/retrieved successfully:');
    console.log('ID:', data.user?.id);
    console.log('Email:', data.user?.email);
    console.log('Confirmed At:', data.user?.email_confirmed_at);

    if (!data.user?.email_confirmed_at && data.user?.identities?.length > 0) {
        console.log("User created but email not confirmed. You may need to manually confirm this user in the Supabase dashboard or via SQL if you have access.");
    }
}

createAdmin();
