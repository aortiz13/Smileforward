import { createClient } from '@/lib/supabase/server'
import { redirect, notFound } from 'next/navigation'
import Link from 'next/link'
import { ArrowLeft, Building2, Users, Settings, Palette, Zap, UserCog, Phone, Mail, Calendar, ExternalLink } from 'lucide-react'
import { CompanyActions } from './company-actions'

interface PageProps {
    params: Promise<{ id: string }>
}

export default async function CompanyDetailPage({ params }: PageProps) {
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
    const { data: company, error } = await supabase
        .from('admin_companies_unified')
        .select('*')
        .eq('id', id)
        .single()

    if (error || !company) {
        console.error('Error fetching company:', error)
        notFound()
    }

    // Fetch instance features
    const { data: features } = await supabase
        .from('instance_features')
        .select('*')
        .eq('company_id', id)

    const enabledFeatures = features?.filter(f => f.enabled).length || 0

    return (
        <div className="min-h-screen bg-gradient-to-br from-gray-50 to-gray-100 p-8">
            {/* Header */}
            <div className="mb-8">
                <Link href="/admin/companies" className="inline-flex items-center gap-2 text-gray-600 hover:text-gray-900 mb-4">
                    <ArrowLeft className="w-4 h-4" />
                    <span className="font-medium">Volver a Empresas</span>
                </Link>

                <div className="flex items-start justify-between">
                    <div className="flex items-center gap-4">
                        {company.logo_url ? (
                            <img src={company.logo_url} alt={company.name} className="w-20 h-20 rounded-2xl object-cover shadow-lg" />
                        ) : (
                            <div className="w-20 h-20 rounded-2xl bg-gradient-to-br from-primary to-purple-600 flex items-center justify-center text-white font-black text-3xl shadow-lg">
                                {company.name.charAt(0).toUpperCase()}
                            </div>
                        )}
                        <div>
                            <h1 className="text-4xl font-black text-gray-900 mb-2">{company.name}</h1>
                            <div className="flex items-center gap-3">
                                <span className={cn(
                                    "px-3 py-1 rounded-full text-xs font-bold uppercase",
                                    company.instance_status === 'active' ? "bg-green-100 text-green-700" :
                                        company.instance_status === 'trial' ? "bg-yellow-100 text-yellow-700" :
                                            company.instance_status === 'suspended' ? "bg-red-100 text-red-700" :
                                                "bg-gray-100 text-gray-700"
                                )}>
                                    {company.instance_status || 'active'}
                                </span>
                                <span className={cn(
                                    "px-3 py-1 rounded-full text-xs font-bold uppercase",
                                    company.subscription_tier === 'enterprise' ? "bg-purple-100 text-purple-700" :
                                        company.subscription_tier === 'professional' ? "bg-blue-100 text-blue-700" :
                                            "bg-gray-100 text-gray-700"
                                )}>
                                    {company.subscription_tier || 'starter'}
                                </span>
                            </div>
                        </div>
                    </div>

                    <CompanyActions
                        companyId={company.id}
                        initialStatus={company.instance_status}
                        isActive={company.is_active}
                    />
                </div>
            </div>

            {/* Metrics */}
            <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
                <div className="bg-white rounded-2xl p-6 shadow-sm border border-gray-100">
                    <div className="flex items-center justify-between mb-4">
                        <div className="p-3 bg-purple-100 rounded-xl">
                            <Users className="w-6 h-6 text-purple-600" />
                        </div>
                    </div>
                    <p className="text-sm text-gray-600 mb-1">Usuarios</p>
                    <p className="text-3xl font-black text-gray-900">{company.user_count || 0}</p>
                </div>

                <div className="bg-white rounded-2xl p-6 shadow-sm border border-gray-100">
                    <div className="flex items-center justify-between mb-4">
                        <div className="p-3 bg-blue-100 rounded-xl">
                            <UserCog className="w-6 h-6 text-blue-600" />
                        </div>
                    </div>
                    <p className="text-sm text-gray-600 mb-1">Administradores</p>
                    <p className="text-3xl font-black text-gray-900">{company.admin_count || 0}</p>
                </div>

                <div className="bg-white rounded-2xl p-6 shadow-sm border border-gray-100">
                    <div className="flex items-center justify-between mb-4">
                        <div className="p-3 bg-green-100 rounded-xl">
                            <Zap className="w-6 h-6 text-green-600" />
                        </div>
                    </div>
                    <p className="text-sm text-gray-600 mb-1">Features Activas</p>
                    <p className="text-3xl font-black text-gray-900">{enabledFeatures}</p>
                </div>

                <div className="bg-white rounded-2xl p-6 shadow-sm border border-gray-100">
                    <div className="flex items-center justify-between mb-4">
                        <div className="p-3 bg-yellow-100 rounded-xl">
                            <Calendar className="w-6 h-6 text-yellow-600" />
                        </div>
                    </div>
                    <p className="text-sm text-gray-600 mb-1">Creada</p>
                    <p className="text-lg font-black text-gray-900">
                        {new Date(company.created_at).toLocaleDateString('es-ES', { day: 'numeric', month: 'short', year: 'numeric' })}
                    </p>
                </div>
            </div>

            {/* Content Tabs */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                {/* Main Info */}
                <div className="lg:col-span-2 space-y-6">
                    {/* Company Info */}
                    <div className="bg-white rounded-2xl p-6 shadow-sm border border-gray-100">
                        <h2 className="text-xl font-black text-gray-900 mb-6 flex items-center gap-2">
                            <Building2 className="w-5 h-5" />
                            Información General
                        </h2>
                        <div className="grid grid-cols-2 gap-6">
                            <div>
                                <p className="text-xs font-bold text-gray-400 uppercase tracking-wider mb-2">Tipo de Empresa</p>
                                <p className="text-gray-900 font-medium">{company.company_kind || 'N/A'}</p>
                            </div>
                            <div>
                                <p className="text-xs font-bold text-gray-400 uppercase tracking-wider mb-2">Dominio Personalizado</p>
                                {company.custom_domain ? (
                                    <a href={`https://${company.custom_domain}`} target="_blank" rel="noopener noreferrer" className="text-primary hover:underline font-medium flex items-center gap-1">
                                        {company.custom_domain}
                                        <ExternalLink className="w-3 h-3" />
                                    </a>
                                ) : (
                                    <p className="text-gray-400 italic">Sin dominio</p>
                                )}
                            </div>
                            <div>
                                <p className="text-xs font-bold text-gray-400 uppercase tracking-wider mb-2">Email de Contacto</p>
                                {company.contact_email ? (
                                    <a href={`mailto:${company.contact_email}`} className="text-gray-900 hover:text-primary font-medium flex items-center gap-1">
                                        <Mail className="w-4 h-4" />
                                        {company.contact_email}
                                    </a>
                                ) : (
                                    <p className="text-gray-400 italic">Sin email</p>
                                )}
                            </div>
                            <div>
                                <p className="text-xs font-bold text-gray-400 uppercase tracking-wider mb-2">Teléfono de Contacto</p>
                                {company.contact_phone ? (
                                    <a href={`tel:${company.contact_phone}`} className="text-gray-900 hover:text-primary font-medium flex items-center gap-1">
                                        <Phone className="w-4 h-4" />
                                        {company.contact_phone}
                                    </a>
                                ) : (
                                    <p className="text-gray-400 italic">Sin teléfono</p>
                                )}
                            </div>
                        </div>
                    </div>

                    {/* WhatsApp Instance */}
                    {company.instance_phone && (
                        <div className="bg-white rounded-2xl p-6 shadow-sm border border-gray-100">
                            <h2 className="text-xl font-black text-gray-900 mb-6 flex items-center gap-2">
                                <Phone className="w-5 h-5" />
                                Instancia WhatsApp
                            </h2>
                            <div className="grid grid-cols-2 gap-6">
                                <div>
                                    <p className="text-xs font-bold text-gray-400 uppercase tracking-wider mb-2">Número</p>
                                    <p className="text-gray-900 font-medium font-mono">{company.instance_phone}</p>
                                </div>
                                <div>
                                    <p className="text-xs font-bold text-gray-400 uppercase tracking-wider mb-2">Nombre de Instancia</p>
                                    <p className="text-gray-900 font-medium font-mono">{company.instance_name}</p>
                                </div>
                            </div>
                        </div>
                    )}
                </div>

                {/* Quick Actions Sidebar */}
                <div className="space-y-4">
                    <Link href={`/admin/companies/${company.id}/branding`} className="block bg-white rounded-2xl p-6 shadow-sm border border-gray-100 hover:shadow-md transition group">
                        <div className="flex items-center gap-4">
                            <div className="p-3 bg-pink-100 rounded-xl group-hover:bg-pink-200 transition">
                                <Palette className="w-6 h-6 text-pink-600" />
                            </div>
                            <div>
                                <p className="font-bold text-gray-900">Branding</p>
                                <p className="text-xs text-gray-500">Logo, colores, dominio</p>
                            </div>
                        </div>
                    </Link>

                    <Link href={`/admin/companies/${company.id}/features`} className="block bg-white rounded-2xl p-6 shadow-sm border border-gray-100 hover:shadow-md transition group">
                        <div className="flex items-center gap-4">
                            <div className="p-3 bg-green-100 rounded-xl group-hover:bg-green-200 transition">
                                <Zap className="w-6 h-6 text-green-600" />
                            </div>
                            <div>
                                <p className="font-bold text-gray-900">Features</p>
                                <p className="text-xs text-gray-500">Agentes y módulos</p>
                            </div>
                        </div>
                    </Link>

                    <Link href={`/admin/companies/${company.id}/users`} className="block bg-white rounded-2xl p-6 shadow-sm border border-gray-100 hover:shadow-md transition group">
                        <div className="flex items-center gap-4">
                            <div className="p-3 bg-blue-100 rounded-xl group-hover:bg-blue-200 transition">
                                <Users className="w-6 h-6 text-blue-600" />
                            </div>
                            <div>
                                <p className="font-bold text-gray-900">Usuarios</p>
                                <p className="text-xs text-gray-500">Gestionar contactos</p>
                            </div>
                        </div>
                    </Link>

                    <Link href={`/admin/companies/${company.id}/agents`} className="block bg-white rounded-2xl p-6 shadow-sm border border-gray-100 hover:shadow-md transition group">
                        <div className="flex items-center gap-4">
                            <div className="p-3 bg-purple-100 rounded-xl group-hover:bg-purple-200 transition">
                                <Settings className="w-6 h-6 text-purple-600" />
                            </div>
                            <div>
                                <p className="font-bold text-gray-900">Agentes</p>
                                <p className="text-xs text-gray-500">Personalizar prompts</p>
                            </div>
                        </div>
                    </Link>
                </div>
            </div>
        </div>
    )
}

function cn(...inputs: any[]) {
    return inputs.filter(Boolean).join(' ')
}
