'use server'

import { signIn } from '@/lib/auth'
import { redirect } from 'next/navigation'

export async function login(formData: FormData) {
    const email = formData.get('email') as string
    const password = formData.get('password') as string

    try {
        await signIn('credentials', {
            email,
            password,
            redirect: false,
        })
    } catch (error: any) {
        return { error: 'Credenciales inválidas' }
    }

    redirect('/administracion/dashboard')
}
