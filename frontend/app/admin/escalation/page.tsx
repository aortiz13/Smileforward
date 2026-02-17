import { createClient } from '@/lib/supabase/server'
import { ShieldAlert, User, MessageSquare, Clock, CheckCircle2, MoreVertical, Search, Filter } from 'lucide-react'

export default async function EscalationPage() {
    const supabase = await createClient()

    // Fetch conversations requiring human intervention from the unified public view
    const { data: escalations, error } = await supabase
        .from('admin_escalation_queue_unified')
        .select('*')
        .order('created_at', { ascending: false })

    if (error) {
        return <div className="p-8 text-red-500">Error loading escalation queue: {error.message}</div>
    }

    return (
        <div className="space-y-8">
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                <div>
                    <h1 className="text-3xl font-bold text-gray-900 tracking-tight">Escalamiento Humano</h1>
                    <p className="text-gray-500 mt-1">Intervenciones manuales y cola de atención pendiente.</p>
                </div>
                <div className="flex gap-2 text-xs font-bold">
                    <div className="bg-red-100 text-red-700 px-4 py-2 rounded-lg flex items-center gap-2">
                        <span className="w-2 h-2 rounded-full bg-red-600 animate-ping" />
                        <span>{escalations?.length || 0} Pendientes</span>
                    </div>
                </div>
            </div>

            {/* Queue List */}
            <div className="bg-white rounded-3xl border border-gray-100 shadow-sm overflow-hidden">
                <div className="p-6 border-b border-gray-50 flex items-center gap-4">
                    <div className="flex-1 relative">
                        <Search size={18} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
                        <input
                            type="text"
                            placeholder="Buscar en la cola de escalamiento..."
                            className="w-full bg-gray-50 border-none rounded-xl pl-10 pr-4 py-3 focus:ring-0"
                        />
                    </div>
                    <button className="p-3 bg-gray-50 text-gray-400 rounded-xl hover:text-black transition">
                        <Filter size={20} />
                    </button>
                </div>

                <div className="divide-y divide-gray-50">
                    {escalations?.map((item) => (
                        <div key={item.id} className="p-6 hover:bg-gray-50/50 transition-all group flex items-start gap-4">
                            <div className="w-12 h-12 rounded-2xl bg-red-100 text-red-600 flex items-center justify-center shrink-0">
                                <ShieldAlert size={24} />
                            </div>

                            <div className="flex-1 min-w-0">
                                <div className="flex items-center gap-2 mb-1">
                                    <span className="font-bold text-gray-900 truncate">{item.contact_real_name || item.contact_push_name || 'Usuario Desconocido'}</span>
                                    <span className="text-xs text-gray-400">•</span>
                                    <span className="text-xs text-gray-500">{item.contact_phone}</span>
                                </div>
                                <p className="text-sm text-gray-600 line-clamp-2 italic">
                                    "{item.content}"
                                </p>
                                <div className="mt-3 flex items-center gap-4 text-xs font-bold uppercase tracking-widest">
                                    <div className="flex items-center gap-1.5 text-red-600">
                                        <Clock size={14} />
                                        <span>Desde hace 45 min</span>
                                    </div>
                                    <div className="flex items-center gap-1.5 text-gray-400">
                                        <MessageSquare size={14} />
                                        <span>{item.agent_type === 'human' ? 'Atención Humana' : 'AI Fallback'}</span>
                                    </div>
                                </div>
                            </div>

                            <div className="flex flex-col gap-2">
                                <button className="bg-black text-white px-4 py-2 rounded-xl text-xs font-bold hover:bg-gray-800 transition shadow-sm">
                                    Tomar Control
                                </button>
                                <button className="text-gray-400 hover:text-green-600 px-4 py-2 rounded-xl text-xs font-bold hover:bg-green-50 transition border border-transparent hover:border-green-100">
                                    Resolver
                                </button>
                            </div>
                        </div>
                    ))}
                    {escalations?.length === 0 && (
                        <div className="p-12 text-center">
                            <div className="w-16 h-16 bg-green-100 text-green-600 rounded-full flex items-center justify-center mx-auto mb-4">
                                <CheckCircle2 size={32} />
                            </div>
                            <p className="font-bold text-gray-900">Todo despejado</p>
                            <p className="text-gray-500 text-sm">No hay intervenciones humanas pendientes en este momento.</p>
                        </div>
                    )}
                </div>
            </div>

            {/* Audit History (Small View) */}
            <div>
                <h3 className="text-xl font-bold text-gray-900 px-1 mb-4">Historial de Intervenciones Recientes</h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {[1, 2].map((i) => (
                        <div key={i} className="bg-white p-4 rounded-2xl border border-gray-100 shadow-sm flex items-center gap-4">
                            <div className="w-10 h-10 rounded-full bg-green-50 text-green-600 flex items-center justify-center">
                                <CheckCircle2 size={20} />
                            </div>
                            <div className="flex-1">
                                <p className="text-sm font-bold text-gray-900">Conversación resuelta por Admin</p>
                                <p className="text-xs text-gray-500 italic">"Se aclaró la duda sobre el pago..."</p>
                            </div>
                            <span className="text-[10px] text-gray-400 font-bold uppercase tracking-widest">Ayer</span>
                        </div>
                    ))}
                </div>
            </div>
        </div>
    )
}

function cn(...inputs: any[]) { return inputs.filter(Boolean).join(' ') }
