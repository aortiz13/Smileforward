import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import Link from 'next/link'
import { Building2, Users, TrendingUp, AlertCircle, Plus, Search, MoreVertical, ExternalLink, ShieldCheck } from 'lucide-react'

export default async function CompaniesPage() {
    const supabase = await createClient()

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

    // Fetch all companies with aggregated data using the new unified view
    const { data: companies, error } = await supabase
        .from('admin_companies_unified')
        .select('*')
        .order('created_at', { ascending: false })

    if (error) {
        return <div className="p-8 text-red-500">Error loading companies: {error.message}</div>
    }

    // Calculate metrics
    const totalCompanies = companies?.length || 0
    const activeCompanies = companies?.filter(c => c.instance_status === 'active').length || 0
    const totalUsers = companies?.reduce((sum, c) => sum + (c.user_count || 0), 0) || 0
    const trialCompanies = companies?.filter(c => c.instance_status === 'trial').length || 0

    return (
        <div className="space-y-8">
            {/* Header */}
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                <div>
                    <h1 className="text-3xl font-bold text-gray-900 tracking-tight">Gestión de Empresas</h1>
                    <p className="text-gray-500 mt-1">Administra las instancias multi-tenant y configuraciones de marca.</p>
                </div>
                <Link
                    href="/admin/companies/new"
                    className="bg-black text-white px-6 py-3 rounded-xl font-bold flex items-center gap-2 hover:bg-gray-800 transition shadow-lg shadow-black/5"
                >
                    <Plus size={20} />
                    <span>Nueva Empresa</span>
                </Link>
            </div>

            {/* Stats Overview */}
            <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
                {[
                    { label: 'Total Instancias', value: totalCompanies, icon: Building2, color: 'blue' },
                    { label: 'Activas', value: activeCompanies, icon: ShieldCheck, color: 'green' },
                    { label: 'Total Usuarios', value: totalUsers, icon: Users, color: 'purple' },
                    { label: 'En Prueba', value: trialCompanies, icon: AlertCircle, color: 'yellow' },
                ].map((stat) => (
                    <div key={stat.label} className="bg-white p-6 rounded-3xl border border-gray-100 shadow-sm flex items-center gap-4">
                        <div className={cn(
                            "p-3 rounded-2xl bg-opacity-10",
                            stat.color === 'blue' ? "bg-blue-600 text-blue-600" :
                                stat.color === 'green' ? "bg-green-600 text-green-600" :
                                    stat.color === 'purple' ? "bg-purple-600 text-purple-600" :
                                        "bg-yellow-600 text-yellow-600"
                        )}>
                            <stat.icon size={24} />
                        </div>
                        <div>
                            <p className="text-xs font-bold text-gray-400 uppercase tracking-widest">{stat.label}</p>
                            <p className="text-2xl font-black text-gray-900">{stat.value}</p>
                        </div>
                    </div>
                ))}
            </div>

            {/* Search & Filter */}
            <div className="bg-white p-4 rounded-2xl border border-gray-100 shadow-sm flex items-center gap-3">
                <Search size={20} className="text-gray-400 ml-2" />
                <input
                    type="text"
                    placeholder="Buscar empresa por nombre o dominio..."
                    className="flex-1 bg-transparent border-none focus:ring-0 text-sm font-medium"
                />
            </div>

            {/* Companies List */}
            <div className="bg-white rounded-3xl border border-gray-100 shadow-sm overflow-hidden">
                <table className="w-full text-left">
                    <thead>
                        <tr className="bg-gray-50 border-b border-gray-100">
                            <th className="px-6 py-4 text-[10px] font-bold text-gray-400 uppercase tracking-widest">Empresa</th>
                            <th className="px-6 py-4 text-[10px] font-bold text-gray-400 uppercase tracking-widest">Estado</th>
                            <th className="px-6 py-4 text-[10px] font-bold text-gray-400 uppercase tracking-widest">Tier</th>
                            <th className="px-6 py-4 text-[10px] font-bold text-gray-400 uppercase tracking-widest">Usuarios</th>
                            <th className="px-6 py-4 text-[10px] font-bold text-gray-400 uppercase tracking-widest">Dominio</th>
                            <th className="px-6 py-4 text-[10px] font-bold text-gray-400 uppercase tracking-widest">Creada</th>
                            <th className="px-6 py-4 text-right"></th>
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-50">
                        {companies?.map((company) => (
                            <tr key={company.id} className="hover:bg-gray-50/50 transition-colors group">
                                <td className="px-6 py-4">
                                    <div className="flex items-center gap-3">
                                        {company.logo_url ? (
                                            <img src={company.logo_url} alt={company.name} className="w-10 h-10 rounded-xl object-cover" />
                                        ) : (
                                            <div className="w-10 h-10 bg-gray-100 rounded-xl flex items-center justify-center font-bold text-gray-400">
                                                {company.name.charAt(0)}
                                            </div>
                                        )}
                                        <div>
                                            <p className="font-bold text-gray-900">{company.name}</p>
                                            <p className="text-xs text-gray-500">{company.contact_email || 'Sin email'}</p>
                                        </div>
                                    </div>
                                </td>
                                <td className="px-6 py-4">
                                    <span className={cn(
                                        "px-3 py-1 rounded-full text-[10px] font-bold uppercase tracking-wider",
                                        company.instance_status === 'active' ? "bg-green-100 text-green-700" :
                                            company.instance_status === 'trial' ? "bg-yellow-100 text-yellow-700" :
                                                company.instance_status === 'suspended' ? "bg-red-100 text-red-700" :
                                                    "bg-gray-100 text-gray-700"
                                    )}>
                                        {company.instance_status || 'active'}
                                    </span>
                                </td>
                                <td className="px-6 py-4">
                                    <span className={cn(
                                        "px-3 py-1 rounded-full text-[10px] font-bold uppercase tracking-wider",
                                        company.subscription_tier === 'enterprise' ? "bg-purple-100 text-purple-700" :
                                            company.subscription_tier === 'professional' ? "bg-blue-100 text-blue-700" :
                                                "bg-gray-100 text-gray-700"
                                    )}>
                                        {company.subscription_tier || 'starter'}
                                    </span>
                                </td>
                                <td className="px-6 py-4">
                                    <div className="flex items-center gap-2">
                                        <Users size={14} className="text-gray-400" />
                                        <span className="font-medium text-gray-900">{company.user_count || 0}</span>
                                    </div>
                                </td>
                                <td className="px-6 py-4 font-mono text-xs text-gray-600">
                                    {company.custom_domain || `${company.name.toLowerCase().replace(/\s+/g, '-')}.blukastor.com`}
                                </td>
                                <td className="px-6 py-4 text-xs text-gray-500">
                                    {new Date(company.created_at).toLocaleDateString()}
                                </td>
                                <td className="px-6 py-4 text-right">
                                    <Link
                                        href={`/admin/companies/${company.id}`}
                                        className="text-gray-400 hover:text-black p-2 rounded-lg transition-colors inline-block"
                                    >
                                        <MoreVertical size={20} />
                                    </Link>
                                </td>
                            </tr>
                        ))}
                    </tbody>
                </table>

                {companies?.length === 0 && (
                    <div className="text-center py-12">
                        <Building2 className="w-16 h-16 text-gray-300 mx-auto mb-4" />
                        <p className="text-gray-600 font-medium">No hay empresas registradas</p>
                        <p className="text-gray-400 text-sm">Crea tu primera instancia para comenzar</p>
                    </div>
                )}
            </div>
        </div>
    )
}

function cn(...inputs: any[]) {
    return inputs.filter(Boolean).join(' ')
}
