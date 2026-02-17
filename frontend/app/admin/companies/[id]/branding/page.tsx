import { createClient } from '@/lib/supabase/server'
import { redirect, notFound } from 'next/navigation'
import Link from 'next/link'
import { ArrowLeft, Palette } from 'lucide-react'
import { BrandingForm } from './branding-form'

interface PageProps {
    params: Promise<{ id: string }>
}

export default async function CompanyBrandingPage({ params }: PageProps) {
    const supabase = await createClient()
    const { id } = await params

    // Check if user is super admin
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) redirect('/login')

    const { data: adminCheck } = await supabase
        .from('admin_profiles')
        .select('role, scope')
        .eq('auth_user_id', user.id)
        .single()

    if (!adminCheck || (adminCheck.scope !== 'global' && adminCheck.role !== 'super_admin')) {
        return <div className="p-8 text-red-500">Access denied. Super admin privileges required.</div>
    }

    // Fetch company details
    const { data: company, error: companyError } = await supabase
        .from('client_companies')
        .select('*')
        .eq('id', id)
        .single()

    if (companyError || !company) {
        notFound()
    }

    return (
        <div className="min-h-screen bg-gradient-to-br from-gray-50 to-gray-100 p-8">
            {/* Header */}
            <div className="mb-8">
                <Link href={`/admin/companies/${id}`} className="inline-flex items-center gap-2 text-gray-600 hover:text-gray-900 mb-4">
                    <ArrowLeft className="w-4 h-4" />
                    <span className="font-medium">Volver a {company.name}</span>
                </Link>

                <div className="flex items-center gap-3 mb-2">
                    <div className="p-3 bg-pink-100 rounded-xl">
                        <Palette className="w-6 h-6 text-pink-600" />
                    </div>
                    <h1 className="text-4xl font-black text-gray-900">Branding</h1>
                </div>
                <p className="text-gray-600">Personaliza la apariencia de esta instancia</p>
            </div>

            <BrandingForm companyId={id} initialData={company} />
        </div>
    )
}
