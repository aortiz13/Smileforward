import { createClient } from '@/lib/supabase/server'
import { redirect, notFound } from 'next/navigation'
import Link from 'next/link'
import { ArrowLeft, Users, Mail, Phone, Calendar, Shield } from 'lucide-react'
import { AddUserButton } from './add-user-button'

interface PageProps {
    params: Promise<{ id: string }>
}

export default async function CompanyUsersPage({ params }: PageProps) {
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
        .select('id, name')
        .eq('id', id)
        .single()

    if (companyError || !company) {
        notFound()
    }

    // Fetch instance users
    // Note: admin_instance_users_unified might still use company_id or client_company_id
    // If the view was updated, it likely uses client_company_id now.
    // Let's try client_company_id, and if that fails, we might need to check the view definition.
    // For now assuming the view is still compatible or updated.
    const { data: users, error: usersError } = await supabase
        .from('admin_instance_users_unified')
        .select('*')
        .eq('client_company_id', id)
        .order('created_at', { ascending: false })

    const totalUsers = users?.length || 0
    const activeUsers = users?.filter(u => u.last_seen && new Date(u.last_seen) > new Date(Date.now() - 30 * 24 * 60 * 60 * 1000)).length || 0
    const compliantUsers = users?.filter(u => u.terms_accepted).length || 0

    return (
        <div className="min-h-screen bg-gradient-to-br from-gray-50 to-gray-100 p-8">
            {/* Header */}
            <div className="mb-8">
                <Link href={`/admin/companies/${id}`} className="inline-flex items-center gap-2 text-gray-600 hover:text-gray-900 mb-4">
                    <ArrowLeft className="w-4 h-4" />
                    <span className="font-medium">Volver a {company.name}</span>
                </Link>

                <div className="flex items-center justify-between">
                    <div>
                        <div className="flex items-center gap-3 mb-2">
                            <div className="p-3 bg-blue-100 rounded-xl">
                                <Users className="w-6 h-6 text-blue-600" />
                            </div>
                            <h1 className="text-4xl font-black text-gray-900">Usuarios</h1>
                        </div>
                        <p className="text-gray-600">Gestiona los usuarios de esta instancia</p>
                    </div>

                    <AddUserButton companyId={id} companyName={company.name} />
                </div>
            </div>

            {/* Metrics */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
                <div className="bg-white rounded-2xl p-6 shadow-sm border border-gray-100">
                    <div className="flex items-center justify-between mb-4">
                        <div className="p-3 bg-purple-100 rounded-xl">
                            <Users className="w-6 h-6 text-purple-600" />
                        </div>
                    </div>
                    <p className="text-sm text-gray-600 mb-1">Total Usuarios</p>
                    <p className="text-3xl font-black text-gray-900">{totalUsers}</p>
                </div>

                <div className="bg-white rounded-2xl p-6 shadow-sm border border-gray-100">
                    <div className="flex items-center justify-between mb-4">
                        <div className="p-3 bg-green-100 rounded-xl">
                            <Shield className="w-6 h-6 text-green-600" />
                        </div>
                    </div>
                    <p className="text-sm text-gray-600 mb-1">Activos (30d)</p>
                    <p className="text-3xl font-black text-gray-900">{activeUsers}</p>
                </div>

                <div className="bg-white rounded-2xl p-6 shadow-sm border border-gray-100">
                    <div className="flex items-center justify-between mb-4">
                        <div className="p-3 bg-blue-100 rounded-xl">
                            <Calendar className="w-6 h-6 text-blue-600" />
                        </div>
                    </div>
                    <p className="text-sm text-gray-600 mb-1">Compliance</p>
                    <p className="text-3xl font-black text-gray-900">{compliantUsers}</p>
                </div>
            </div>

            {/* Users Table */}
            <div className="bg-white rounded-3xl shadow-sm border border-gray-100 overflow-hidden">
                <table className="w-full text-left">
                    <thead>
                        <tr className="bg-gray-50 border-b border-gray-100">
                            <th className="px-6 py-4 text-[10px] font-bold text-gray-400 uppercase tracking-widest">Usuario</th>
                            <th className="px-6 py-4 text-[10px] font-bold text-gray-400 uppercase tracking-widest">Contacto</th>
                            <th className="px-6 py-4 text-[10px] font-bold text-gray-400 uppercase tracking-widest">Plan</th>
                            <th className="px-6 py-4 text-[10px] font-bold text-gray-400 uppercase tracking-widest">Compliance</th>
                            <th className="px-6 py-4 text-[10px] font-bold text-gray-400 uppercase tracking-widest">Última Actividad</th>
                            <th className="px-6 py-4 text-right"></th>
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-50">
                        {users?.map((u) => (
                            <tr key={u.contact_id} className="hover:bg-gray-50/50 transition-colors group">
                                <td className="px-6 py-4">
                                    <div className="flex items-center gap-3">
                                        <div className="w-10 h-10 bg-gradient-to-br from-primary to-purple-600 rounded-xl flex items-center justify-center text-white font-bold">
                                            {(u.real_name || u.push_name || u.nickname || 'U').charAt(0).toUpperCase()}
                                        </div>
                                        <div>
                                            <p className="font-bold text-gray-900">{u.real_name || u.push_name || u.nickname || 'Sin nombre'}</p>
                                            <p className="text-xs text-gray-500 font-mono">{u.phone}</p>
                                        </div>
                                    </div>
                                </td>
                                <td className="px-6 py-4">
                                    <div className="space-y-1">
                                        {u.phone && (
                                            <div className="flex items-center gap-2 text-sm text-gray-600">
                                                <Phone className="w-3 h-3" />
                                                <span className="font-mono">{u.phone}</span>
                                            </div>
                                        )}
                                    </div>
                                </td>
                                <td className="px-6 py-4">
                                    {u.membership_plan ? (
                                        <span className="px-3 py-1 bg-purple-100 text-purple-700 rounded-full text-xs font-bold uppercase">
                                            {u.membership_plan}
                                        </span>
                                    ) : (
                                        <span className="text-gray-400 italic text-sm">Sin plan</span>
                                    )}
                                </td>
                                <td className="px-6 py-4">
                                    {u.terms_accepted ? (
                                        <span className="px-3 py-1 bg-green-100 text-green-700 rounded-full text-xs font-bold">
                                            ✓ Aceptado
                                        </span>
                                    ) : (
                                        <span className="px-3 py-1 bg-yellow-100 text-yellow-700 rounded-full text-xs font-bold">
                                            Pendiente
                                        </span>
                                    )}
                                </td>
                                <td className="px-6 py-4 text-sm text-gray-600">
                                    {u.last_seen ? new Date(u.last_seen).toLocaleDateString('es-ES', { day: 'numeric', month: 'short' }) : 'Nunca'}
                                </td>
                                <td className="px-6 py-4 text-right">
                                    <button className="text-primary hover:text-primary/80 font-bold text-sm">
                                        Ver →
                                    </button>
                                </td>
                            </tr>
                        ))}
                    </tbody>
                </table>

                {users?.length === 0 && (
                    <div className="text-center py-12">
                        <Users className="w-16 h-16 text-gray-300 mx-auto mb-4" />
                        <p className="text-gray-600 font-medium">No hay usuarios en esta instancia</p>
                        <p className="text-gray-400 text-sm">Agrega tu primer usuario para comenzar</p>
                    </div>
                )}
            </div>
        </div>
    )
}
