import { createClient } from '@/lib/supabase/server'
import { FileText, AlertTriangle, CheckCircle2, Clock, Search, Filter, ShieldAlert } from 'lucide-react'

export default async function CompliancePage() {
    const supabase = await createClient()

    // Fetch compliance records joined with contact info
    // We'll simulate the "7 days pending" logic in the UI or via a calculated field
    // Fetch from the unified public view
    const { data: recordsData, error: fetchError } = await supabase
        .from('admin_user_compliance_unified')
        .select('*')
        .order('created_at', { ascending: false })

    const records = recordsData as any[]

    if (fetchError) {
        return <div className="p-8 text-red-500">Error loading compliance data: {fetchError.message}</div>
    }

    const pendingCount = records?.filter(r => !r.terms_accepted).length || 0
    const acceptedCount = records?.filter(r => r.terms_accepted).length || 0

    // Calculate critical alerts (> 7 days without acceptance)
    const sevenDaysAgo = new Date()
    sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7)

    const criticalAlerts = records?.filter(r =>
        !r.terms_accepted &&
        new Date(r.created_at) < sevenDaysAgo
    ).length || 0

    return (
        <div className="space-y-8">
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                <div>
                    <h1 className="text-3xl font-bold text-gray-900 tracking-tight">Cumplimiento Legal (T&C)</h1>
                    <p className="text-gray-500 mt-1">Monitorea la aceptación de términos y condiciones por parte de los usuarios.</p>
                </div>
                <div className="flex gap-2">
                    <button className="bg-red-50 text-red-600 px-4 py-3 rounded-xl font-bold border border-red-100 shadow-sm flex items-center gap-2 hover:bg-red-100 transition">
                        <ShieldAlert size={18} />
                        <span>Ver Alertas Críticas ({criticalAlerts})</span>
                    </button>
                </div>
            </div>

            {/* Compliance Overview */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                <div className="bg-white p-6 rounded-3xl border border-gray-100 shadow-sm">
                    <div className="flex items-center justify-between mb-2">
                        <CheckCircle2 size={20} className="text-green-500" />
                        <span className="text-xs font-bold text-gray-400">ACEPTADOS</span>
                    </div>
                    <p className="text-3xl font-black text-gray-900">{acceptedCount}</p>
                    <p className="text-xs text-gray-400 mt-1">Usuarios que han aceptado legalmente.</p>
                </div>
                <div className="bg-white p-6 rounded-3xl border border-gray-100 shadow-sm">
                    <div className="flex items-center justify-between mb-2">
                        <Clock size={20} className="text-orange-500" />
                        <span className="text-xs font-bold text-gray-400">PENDIENTES</span>
                    </div>
                    <p className="text-3xl font-black text-gray-900">{pendingCount}</p>
                    <p className="text-xs text-gray-400 mt-1">Esperando acción del usuario.</p>
                </div>
                <div className="bg-white p-6 rounded-3xl border border-red-100 shadow-sm bg-red-50/20">
                    <div className="flex items-center justify-between mb-2">
                        <AlertTriangle size={20} className="text-red-500" />
                        <span className="text-xs font-bold text-red-400">EN RIESGO</span>
                    </div>
                    <p className="text-3xl font-black text-red-600">{criticalAlerts}</p>
                    <p className="text-xs text-red-400 mt-1">&gt; 7 días sin aceptación.</p>
                </div>
            </div>

            {/* Records Table */}
            <div className="bg-white rounded-3xl border border-gray-100 shadow-sm overflow-hidden">
                <div className="p-6 border-b border-gray-50 flex items-center justify-between">
                    <div className="flex items-center gap-4 flex-1 max-w-md">
                        <Search size={18} className="text-gray-400" />
                        <input
                            type="text"
                            placeholder="Buscar por usuario o empresa..."
                            className="w-full bg-transparent border-none text-sm font-medium focus:ring-0"
                        />
                    </div>
                    <div className="flex items-center gap-2">
                        <button className="text-xs font-bold text-gray-500 hover:text-black">Todo</button>
                        <span className="text-gray-200">|</span>
                        <button className="text-xs font-bold text-gray-500 hover:text-black">Solo Pendientes</button>
                    </div>
                </div>

                <table className="w-full text-left">
                    <thead className="bg-gray-50">
                        <tr>
                            <th className="px-6 py-4 text-[10px] font-bold text-gray-400 uppercase tracking-widest">Usuario</th>
                            <th className="px-6 py-4 text-[10px] font-bold text-gray-400 uppercase tracking-widest">Empresa</th>
                            <th className="px-6 py-4 text-[10px] font-bold text-gray-400 uppercase tracking-widest">Estado</th>
                            <th className="px-6 py-4 text-[10px] font-bold text-gray-400 uppercase tracking-widest">Días Transcurridos</th>
                            <th className="px-6 py-4 text-[10px] font-bold text-gray-400 uppercase tracking-widest">Fecha Limite</th>
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-50">
                        {records?.map((record) => {
                            const createdDate = new Date(record.created_at)
                            const daysPassed = Math.floor((new Date().getTime() - createdDate.getTime()) / (1000 * 3600 * 24))
                            const isCritical = !record.terms_accepted && daysPassed > 7
                            const deadline = new Date(createdDate)
                            deadline.setDate(deadline.getDate() + 7)

                            return (
                                <tr key={record.id} className={cn(
                                    "transition-colors",
                                    isCritical ? "bg-red-50/30 hover:bg-red-50/50" : "hover:bg-gray-50/50"
                                )}>
                                    <td className="px-6 py-4">
                                        <div>
                                            <p className="font-bold text-gray-900">{record.contact_real_name || record.contact_push_name}</p>
                                            <p className="text-xs text-gray-500">{record.contact_phone}</p>
                                        </div>
                                    </td>
                                    <td className="px-6 py-4 font-medium text-gray-700">
                                        {record.company_name}
                                    </td>
                                    <td className="px-6 py-4">
                                        {record.terms_accepted ? (
                                            <div className="flex items-center gap-1.5 text-green-600 font-bold text-[10px] uppercase tracking-wider">
                                                <CheckCircle2 size={14} />
                                                <span>Aceptado</span>
                                            </div>
                                        ) : (
                                            <div className={cn(
                                                "flex items-center gap-1.5 font-bold text-[10px] uppercase tracking-wider",
                                                isCritical ? "text-red-600 animate-pulse" : "text-orange-600"
                                            )}>
                                                <Clock size={14} />
                                                <span>{isCritical ? 'BLOQUEADO' : 'Pendiente'}</span>
                                            </div>
                                        )}
                                    </td>
                                    <td className="px-6 py-4 text-sm text-gray-600 font-mono">
                                        {daysPassed} días
                                    </td>
                                    <td className="px-6 py-4">
                                        {record.terms_accepted ? (
                                            <span className="text-xs text-gray-400">Completado el {new Date(record.accepted_at).toLocaleDateString()}</span>
                                        ) : (
                                            <span className={cn(
                                                "text-xs font-bold",
                                                isCritical ? "text-red-500" : "text-gray-500"
                                            )}>
                                                {deadline.toLocaleDateString()}
                                            </span>
                                        )}
                                    </td>
                                </tr>
                            )
                        })}
                    </tbody>
                </table>
            </div>
        </div>
    )
}

function cn(...inputs: any[]) { return inputs.filter(Boolean).join(' ') }
