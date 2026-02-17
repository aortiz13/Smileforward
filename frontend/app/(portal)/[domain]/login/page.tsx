'use client'

import { useState, useEffect } from 'react'
import { createClient } from '../../../../lib/supabase/client'
import { getCompanyByDomain } from '@/lib/data/companies'
import { Loader2 } from 'lucide-react'
import { useParams } from 'next/navigation'

export default function LoginPage() {
    const params = useParams()
    const rawDomain = params?.domain as string
    const domain = decodeURIComponent(rawDomain || '')

    const [company, setCompany] = useState<any>(null)
    const [email, setEmail] = useState('')
    const [password, setPassword] = useState('')
    const [isLoading, setIsLoading] = useState(false)
    const [message, setMessage] = useState('')
    const supabase = createClient()

    useEffect(() => {
        if (domain) {
            getCompanyByDomain(supabase, domain).then(setCompany)
        }
    }, [domain, supabase])

    const handleMagicLink = async (e: React.FormEvent) => {
        e.preventDefault()
        setIsLoading(true)
        setMessage('')

        const { error } = await supabase.auth.signInWithOtp({
            email,
            options: {
                emailRedirectTo: `${window.location.origin}/auth/callback`,
            },
        })

        setIsLoading(false)
        if (error) {
            setMessage('Error: ' + error.message)
        } else {
            setMessage('Check your email for the magic link!')
        }
    }

    const handlePasswordLogin = async (e: React.FormEvent) => {
        e.preventDefault()
        setIsLoading(true)
        setMessage('')

        const { error } = await supabase.auth.signInWithPassword({
            email,
            password,
        })

        setIsLoading(false)
        if (error) {
            setMessage('Error: ' + error.message)
        } else {
            window.location.href = '/'
        }
    }

    const branding = company?.frontend_config || {}

    return (
        <div className="flex min-h-screen items-center justify-center bg-gray-50">
            <div className="w-full max-w-md space-y-8 rounded-lg bg-white p-8 shadow-md">
                <div className="text-center">
                    {branding.logo_url && <img src={branding.logo_url} alt="Logo" className="mx-auto h-12 w-auto mb-4" />}
                    <h2 className="text-3xl font-bold tracking-tight text-gray-900">
                        Entrar a {company?.name || 'Portal'}
                    </h2>
                </div>

                <div className="mt-8 space-y-6">
                    <form onSubmit={handlePasswordLogin} className="space-y-4">
                        <div className="space-y-2">
                            <input
                                type="email"
                                required
                                className="block w-full rounded border p-2 text-sm focus:ring-2 focus:ring-black outline-none"
                                placeholder="Email address"
                                value={email}
                                onChange={(e) => setEmail(e.target.value)}
                            />
                            <input
                                type="password"
                                required
                                className="block w-full rounded border p-2 text-sm focus:ring-2 focus:ring-black outline-none"
                                placeholder="Password"
                                value={password}
                                onChange={(e) => setPassword(e.target.value)}
                            />
                        </div>
                        <button
                            type="submit"
                            disabled={isLoading}
                            className="flex w-full justify-center rounded-md bg-black px-3 py-2 text-sm font-semibold text-white hover:bg-gray-800 disabled:opacity-50"
                            style={{ backgroundColor: branding.primary_color || '#000000' }}
                        >
                            {isLoading ? <Loader2 className="mr-2 animate-spin" size={18} /> : 'Entrar con Contraseña'}
                        </button>
                    </form>

                    <div className="relative">
                        <div className="absolute inset-0 flex items-center"><span className="w-full border-t"></span></div>
                        <div className="relative flex justify-center text-xs uppercase"><span className="bg-white px-2 text-gray-500">Or</span></div>
                    </div>

                    <button
                        onClick={handleMagicLink}
                        disabled={isLoading}
                        className="flex w-full justify-center rounded-md border border-gray-300 bg-white px-3 py-2 text-sm font-semibold text-gray-900 hover:bg-gray-50"
                    >
                        Enviar Magic Link
                    </button>
                </div>

                {message && (
                    <p className={`mt-4 text-center text-sm ${message.startsWith('Error') ? 'text-red-500' : 'text-green-600'}`}>
                        {message}
                    </p>
                )}
            </div>
        </div>
    )
}

