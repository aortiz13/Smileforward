import { createClient } from '@/lib/supabase/server'
import { Users, Mail, Shield, Building, Search, MoreVertical, Filter } from 'lucide-react'
import { InviteUserButton } from './invite-user-button'
import { UserActionsDropdown } from './user-actions-dropdown'

export default async function UsersPage() {
    const supabase = await createClient()

    // Fetch all WhatsApp contacts with company names
    const { data: waContacts, error: waError } = await supabase
        .from('wa_contacts_view')
        .select(`
            *,
            client_companies!company_id (
                id,
                name
            )
        `)
        .order('created_at', { ascending: false })

    // Fetch admin users separately to merge role data
    const { data: adminUsers, error: adminError } = await supabase
        .from('admin_users_view')
        .select('*')

    if (waError) {
        return <div className="p-8 text-red-500">Error loading users: {waError.message}</div>
    }

    // Create a map of admin users by their user_id for quick lookup
    const adminMap = new Map(
        adminUsers?.map(admin => [admin.auth_user_id, admin]) || []
    )

    // Merge wa_contacts with admin data
    const users = waContacts?.map(contact => {
        const admin = adminMap.get(contact.user_id)
        const isNullUserId = contact.user_id === '00000000-0000-0000-0000-000000000000'

        return {
            id: contact.id,
            auth_user_id: contact.user_id,
            email: admin?.email,
            phone: contact.phone,
            real_name: contact.real_name,
            push_name: contact.push_name,
            nickname: contact.nickname,
            role: admin?.role,
            company_id: contact.company_id,
            // Prioritize company name from wa_contacts join, fallback to admin company
            company_name: (contact.client_companies as any)?.name || admin?.company_name,
            last_sign_in_at: admin?.last_sign_in_at,
            last_seen: contact.last_seen,
            created_at: contact.created_at,
            is_admin: !!admin,
            is_wa_only: isNullUserId // WhatsApp contact without auth account
        }
    }) || []

    return (
        <div className="space-y-8">
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                <div>
                    <h1 className="text-3xl font-bold text-gray-900 tracking-tight">Gestión de Usuarios</h1>
                    <p className="text-gray-500 mt-1">Supervisa roles, accesos y sesiones de los usuarios de la plataforma.</p>
                </div>
                <div className="flex gap-2">
                    <button className="bg-white text-gray-700 px-4 py-3 rounded-xl font-bold border border-gray-100 shadow-sm flex items-center gap-2 hover:bg-gray-50 transition">
                        <Filter size={18} />
                        <span>Filtros</span>
                    </button>
                    <InviteUserButton />
                </div>
            </div>

            {/* Quick Stats */}
            <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
                {[
                    { label: 'Total Usuarios', value: users?.length || 0, icon: Users, color: 'blue' },
                    { label: 'Administradores', value: users?.filter(u => u.is_admin).length || 0, icon: Shield, color: 'purple' },
                    { label: 'Con Instancia', value: users?.filter(u => u.company_id).length || 0, icon: Building, color: 'green' },
                    {
                        label: 'Activos (30d)', value: users?.filter(u => {
                            const lastActivity = u.last_seen || u.last_sign_in_at
                            return lastActivity && new Date(lastActivity) > new Date(Date.now() - 30 * 24 * 60 * 60 * 1000)
                        }).length || 0, icon: TrendingUp, color: 'orange'
                    },
                ].map((stat) => (
                    <div key={stat.label} className="bg-white p-6 rounded-3xl border border-gray-100 shadow-sm">
                        <div className="flex items-center justify-between mb-4">
                            <stat.icon size={20} className={cn(
                                stat.color === 'blue' ? "text-blue-600" :
                                    stat.color === 'purple' ? "text-purple-600" :
                                        stat.color === 'green' ? "text-green-600" :
                                            "text-orange-600"
                            )} />
                            {stat.label !== 'Total Usuarios' && (
                                <span className="text-xs font-bold text-green-500 bg-green-50 px-2 py-1 rounded-full">+12%</span>
                            )}
                        </div>
                        <p className="text-xs font-bold text-gray-400 uppercase tracking-widest">{stat.label}</p>
                        <p className="text-2xl font-black text-gray-900 mt-1">{stat.value}</p>
                    </div>
                ))}
            </div>

            {/* User List */}
            <div className="bg-white rounded-3xl border border-gray-100 shadow-sm overflow-hidden">
                <div className="p-6 border-b border-gray-50 flex items-center gap-4">
                    <div className="flex-1 relative">
                        <Search size={18} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
                        <input
                            type="text"
                            placeholder="Buscar por nombre, email o ID..."
                            className="w-full bg-gray-50 border-none rounded-xl pl-10 pr-4 py-3 focus:outline-none focus:ring-2 focus:ring-black/5"
                        />
                    </div>
                </div>
                <table className="w-full text-left">
                    <thead>
                        <tr className="bg-gray-50/50">
                            <th className="px-6 py-4 text-[10px] font-bold text-gray-400 uppercase tracking-widest">Usuario</th>
                            <th className="px-6 py-4 text-[10px] font-bold text-gray-400 uppercase tracking-widest">Rol</th>
                            <th className="px-6 py-4 text-[10px] font-bold text-gray-400 uppercase tracking-widest">Empresa</th>
                            <th className="px-6 py-4 text-[10px] font-bold text-gray-400 uppercase tracking-widest">Última Sesión</th>
                            <th className="px-6 py-4 text-right"></th>
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-50">
                        {users?.map((user) => (
                            <tr key={user.id || user.auth_user_id} className="group hover:bg-gray-50/50 transition-colors">
                                <td className="px-6 py-4">
                                    <div className="flex items-center gap-3">
                                        <div className="w-10 h-10 rounded-full bg-black flex items-center justify-center text-white font-bold text-xs">
                                            {user.email?.charAt(0).toUpperCase()
                                                || user.real_name?.charAt(0).toUpperCase()
                                                || user.push_name?.charAt(0).toUpperCase()
                                                || user.phone?.charAt(0)
                                                || 'U'}
                                        </div>
                                        <div>
                                            <p className="font-bold text-gray-900">
                                                {user.email || user.real_name || user.push_name || user.nickname || user.phone}
                                            </p>
                                            <p className="text-xs text-gray-500">
                                                {user.email
                                                    ? user.phone
                                                    : (user.is_wa_only ? 'WhatsApp' : user.auth_user_id?.slice(0, 8) + '...')}
                                            </p>
                                        </div>
                                    </div>
                                </td>
                                <td className="px-6 py-4">
                                    {user.is_admin ? (
                                        <span className={cn(
                                            "px-3 py-1 rounded-full text-[10px] font-bold uppercase tracking-wider",
                                            user.role === 'super_admin' ? "bg-purple-100 text-purple-700" :
                                                user.role === 'owner' ? "bg-blue-100 text-blue-700" :
                                                    user.role === 'admin' ? "bg-green-100 text-green-700" :
                                                        "bg-gray-100 text-gray-700"
                                        )}>
                                            {user.role || 'Admin'}
                                        </span>
                                    ) : (
                                        <span className="px-3 py-1 rounded-full text-[10px] font-bold uppercase tracking-wider bg-gray-100 text-gray-700">
                                            Usuario
                                        </span>
                                    )}
                                </td>
                                <td className="px-6 py-4">
                                    <div className="flex items-center gap-2 text-sm text-gray-600">
                                        <Building size={14} className="text-gray-400" />
                                        <span>{user.company_name || 'Sin empresa'}</span>
                                    </div>
                                </td>
                                <td className="px-6 py-4 text-xs text-gray-500">
                                    {(user.last_seen || user.last_sign_in_at)
                                        ? new Date(user.last_seen || user.last_sign_in_at!).toLocaleDateString('es-ES', {
                                            day: 'numeric',
                                            month: 'short',
                                            hour: '2-digit',
                                            minute: '2-digit'
                                        })
                                        : 'Nunca'
                                    }
                                </td>
                                <td className="px-6 py-4 text-right">
                                    <UserActionsDropdown
                                        userId={user.is_wa_only ? user.id : user.auth_user_id}
                                        userEmail={user.email || user.phone || ''}
                                        companyId={user.company_id}
                                        isAdmin={user.is_admin}
                                    />
                                </td>
                            </tr>
                        ))}
                    </tbody>
                </table>
            </div>
        </div>
    )
}

function Plus(props: any) { return <svg {...props} fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24"><path d="M12 5v14M5 12h14" /></svg> }
function TrendingUp(props: any) { return <svg {...props} fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24"><path d="M23 6l-9.5 9.5-5-5L1 18" /><path d="M17 6h6v6" /></svg> }
function cn(...inputs: any[]) { return inputs.filter(Boolean).join(' ') }
