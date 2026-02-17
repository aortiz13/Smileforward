import { createClient } from '@/lib/supabase/server'
import { CreditCard, TrendingUp, Users, ArrowUpRight, ArrowDownRight, Package, Calendar, RefreshCcw } from 'lucide-react'

export default async function MembershipsPage() {
    const supabase = await createClient()

    // Fetch memberships data
    const { data: memberships, error } = await supabase
        .from('membership_status_v2')
        .select('*')
        .order('expires_at', { ascending: true })

    if (error) {
        return <div className="p-8 text-red-500">Error loading memberships: {error.message}</div>
    }

    const totalMRR = memberships?.reduce((acc, m) => acc + (m.price || 0), 0) || 0
    const activeMembers = memberships?.filter(m => m.effective_status === 'active').length || 0
    const churnRate = 4.2 // Simulated

    return (
        <div className="space-y-8">
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                <div>
                    <h1 className="text-3xl font-bold text-gray-900 tracking-tight">Gestión de Membresías</h1>
                    <p className="text-gray-500 mt-1">Monitorea renovaciones, churn y rendimiento de planes de suscripción.</p>
                </div>
                <div className="flex gap-2 font-bold">
                    <div className="bg-green-600 text-white px-6 py-3 rounded-xl shadow-lg shadow-green-600/20 flex items-center gap-2">
                        <TrendingUp size={20} />
                        <span>MRR: ${totalMRR.toLocaleString()}</span>
                    </div>
                </div>
            </div>

            {/* Subscription Stats */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                {[
                    { label: 'Suscripciones Activas', value: activeMembers, icon: Users, sub: '+5.2%', color: 'blue' },
                    { label: 'Tasa de Cancelación (Churn)', value: `${churnRate}%`, icon: ArrowDownRight, sub: '-1.1%', color: 'red' },
                    { label: 'Ingresos Mensuales Estimados', value: `$${totalMRR.toLocaleString()}`, icon: CreditCard, sub: '+8.4%', color: 'green' },
                ].map((stat) => (
                    <div key={stat.label} className="bg-white p-6 rounded-3xl border border-gray-100 shadow-sm">
                        <div className="flex justify-between items-start mb-4">
                            <div className={cn(
                                "p-3 rounded-2xl",
                                stat.color === 'blue' ? "bg-blue-50 text-blue-600" :
                                    stat.color === 'red' ? "bg-red-50 text-red-600" :
                                        "bg-green-50 text-green-600"
                            )}>
                                <stat.icon size={20} />
                            </div>
                            <span className={cn(
                                "text-xs font-bold px-2 py-1 rounded-full",
                                stat.sub.startsWith('+') ? "text-green-600 bg-green-50" : "text-red-600 bg-red-50"
                            )}>{stat.sub}</span>
                        </div>
                        <p className="text-xs font-bold text-gray-400 uppercase tracking-widest">{stat.label}</p>
                        <p className="text-2xl font-black text-gray-900 mt-1">{stat.value}</p>
                    </div>
                ))}
            </div>

            {/* Plan Breakdown */}
            <div className="grid grid-cols-1 gap-8">
                <div className="bg-white rounded-3xl border border-gray-100 shadow-sm overflow-hidden">
                    <div className="p-6 border-b border-gray-50 flex items-center justify-between">
                        <h3 className="text-lg font-bold text-gray-900 flex items-center gap-2">
                            <Package size={20} className="text-primary" />
                            Próximas Renovaciones
                        </h3>
                        <div className="flex gap-2">
                            <button className="text-xs font-bold px-3 py-1.5 bg-gray-100 rounded-lg hover:bg-gray-200 transition">Esta Semana</button>
                            <button className="text-xs font-bold px-3 py-1.5 text-gray-400">Próximo Mes</button>
                        </div>
                    </div>

                    <table className="w-full text-left font-medium">
                        <thead>
                            <tr className="bg-gray-50/50">
                                <th className="px-6 py-4 text-[10px] font-bold text-gray-400 uppercase tracking-widest">Usuario</th>
                                <th className="px-6 py-4 text-[10px] font-bold text-gray-400 uppercase tracking-widest">Plan</th>
                                <th className="px-6 py-4 text-[10px] font-bold text-gray-400 uppercase tracking-widest">Expira en</th>
                                <th className="px-6 py-4 text-[10px] font-bold text-gray-400 uppercase tracking-widest">Monto</th>
                                <th className="px-6 py-4 text-right"></th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-gray-50">
                            {memberships?.slice(0, 10).map((m, index) => {
                                const daysLeft = Math.floor((new Date(m.expires_at).getTime() - new Date().getTime()) / (1000 * 3600 * 24))
                                return (
                                    <tr key={`${m.membership_id}-${index}`} className="hover:bg-gray-50/30 transition-colors group">
                                        <td className="px-6 py-4">
                                            <div className="flex items-center gap-3">
                                                <div>
                                                    <p className="text-sm font-bold text-gray-900">{m.contact_real_name || m.contact_push_name}</p>
                                                    <p className="text-[10px] text-gray-400">{m.contact_phone}</p>
                                                </div>
                                            </div>
                                        </td>
                                        <td className="px-6 py-4">
                                            <span className="bg-primary/5 text-primary px-3 py-1 rounded-full text-[10px] font-bold uppercase tracking-wider">
                                                {m.plan}
                                            </span>
                                        </td>
                                        <td className="px-6 py-4 text-xs">
                                            <div className="flex items-center gap-1.5 text-orange-600 font-bold">
                                                <Calendar size={14} />
                                                <span>{daysLeft} días</span>
                                            </div>
                                        </td>
                                        <td className="px-6 py-4 text-sm font-mono font-bold text-gray-900">
                                            ${m.price?.toLocaleString()}
                                        </td>
                                        <td className="px-6 py-4 text-right">
                                            <button className="p-2 text-gray-400 hover:text-primary transition-colors">
                                                <RefreshCcw size={16} />
                                            </button>
                                        </td>
                                    </tr>
                                )
                            })}
                        </tbody>
                    </table>

                    <div className="p-4 bg-gray-50/50 text-center">
                        <button className="text-xs font-bold text-gray-500 hover:text-black transition">Ver todas las suscripciones (241)</button>
                    </div>
                </div>
            </div>
        </div>
    )
}

function cn(...inputs: any[]) { return inputs.filter(Boolean).join(' ') }
