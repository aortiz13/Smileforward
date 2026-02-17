'use server'

import { createClient } from '@/utils/supabase/server'
import { revalidatePath } from 'next/cache'
import { headers } from 'next/headers'

export async function inviteUser(formData: FormData) {
    // 0. Check critical configuration early
    const resendApiKey = process.env.RESEND_API_KEY;
    const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;

    if (!supabaseUrl || !serviceRoleKey || !resendApiKey) {
        let missing = [];
        if (!supabaseUrl) missing.push("NEXT_PUBLIC_SUPABASE_URL");
        if (!serviceRoleKey) missing.push("SUPABASE_SERVICE_ROLE_KEY");
        if (!resendApiKey) missing.push("RESEND_API_KEY");
        return { error: `Configuración incompleta en .env.local: Falta ${missing.join(', ')}` };
    }

    const supabase = await createClient()

    // 1. Verify current user is admin
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) {
        return { error: 'Not authenticated' }
    }

    const { data: roleData } = await supabase
        .from('user_roles')
        .select('role')
        .eq('user_id', user.id)
        .single()

    if (roleData?.role !== 'admin') {
        return { error: 'Unauthorized: Only admins can invite users' }
    }

    // 2. Get form data
    const email = formData.get('email') as string
    const role = formData.get('role') as 'admin' | 'basic'

    if (!email || !role) {
        return { error: 'Email and role are required' }
    }

    // 3. Get origin for redirect URL (more robust detection)
    const host = (await headers()).get('x-forwarded-host') || (await headers()).get('host');
    const protocol = (await headers()).get('x-forwarded-proto') || 'https';
    const origin = `${protocol}://${host}`;

    // 4. Use native Supabase invitation
    const supabaseAdmin = await createAdminClient()
    const { data: inviteData, error: inviteError } = await supabaseAdmin.auth.admin.inviteUserByEmail(email, {
        redirectTo: `${origin}/auth/callback?next=/administracion/update-password`,
        data: {
            // Optional: metadata you might want to pass
            role: role
        }
    })

    if (inviteError) {
        console.error('Supabase Invite error:', inviteError)
        return { error: 'Error de Supabase al invitar: ' + inviteError.message }
    }

    if (!inviteData.user) {
        return { error: 'No se pudo crear el usuario invitado' }
    }

    // 5. Assign/Update role in user_roles table
    const { error: roleError } = await supabaseAdmin
        .from('user_roles')
        .upsert({
            user_id: inviteData.user.id,
            role: role
        }, { onConflict: 'user_id' })

    if (roleError) {
        console.error('Role assignment error:', roleError)
        return { error: 'Usuario invitado pero falló la asignación de rol: ' + roleError.message }
    }

    revalidatePath('/administracion/settings')
    return { success: true, message: `Invitación enviada nativamente a ${email} como ${role}` }
}

import { createServerClient } from '@supabase/ssr'
import { cookies } from 'next/headers'

async function createAdminClient() {
    const cookieStore = await cookies()
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
    const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY

    if (!supabaseUrl || !serviceRoleKey) {
        throw new Error('Configuración incompleta: Faltan NEXT_PUBLIC_SUPABASE_URL o SUPABASE_SERVICE_ROLE_KEY en el servidor.')
    }

    return createServerClient(
        supabaseUrl,
        serviceRoleKey,
        {
            cookies: {
                getAll() {
                    return cookieStore.getAll()
                },
                setAll(cookiesToSet) {
                    try {
                        cookiesToSet.forEach(({ name, value, options }) =>
                            cookieStore.set(name, value, options)
                        )
                    } catch {
                        // The `setAll` method was called from a Server Component.
                        // This can be ignored if you have middleware refreshing
                        // user sessions.
                    }
                },
            },
        }
    )
}
