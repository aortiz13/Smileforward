import { createClient } from '@/lib/supabase/server'
import { MessageSquare, Calendar, Phone, Bot, User, ChevronRight, Search, Filter, Hash, MoreHorizontal } from 'lucide-react'
import { cn } from '@/lib/utils'

export default async function ConversationAuditorPage() {
    const supabase = await createClient()

    // Fetch consolidated conversations from the public view
    const { data: convs, error } = await supabase
        .from('admin_wa_consolidated')
        .select('*')
        .order('timestamp', { ascending: false })
        .limit(20)

    if (error) {
        return <div className="p-8 text-red-500">Error loading logs: {error.message}</div>
    }

    return (
        <div className="max-w-6xl mx-auto space-y-8">
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                <div>
                    <h1 className="text-3xl font-bold text-gray-900 tracking-tight">Auditoría de Conversaciones</h1>
                    <p className="text-gray-500 mt-1">Revisa el historial consolidado de interacciones con Nova.</p>
                </div>
                <div className="flex items-center gap-2">
                    <button className="bg-white border border-gray-100 p-3 rounded-xl hover:bg-gray-50 transition shadow-sm">
                        <Filter size={18} className="text-gray-400" />
                    </button>
                    <button className="bg-black text-white px-6 py-3 rounded-xl font-bold flex items-center gap-2 hover:bg-gray-800 transition shadow-lg shadow-black/5 text-sm">
                        <MessageSquare size={18} />
                        <span>Exportar Transcripts</span>
                    </button>
                </div>
            </div>

            {/* Quick Stats */}
            <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
                {[
                    { label: 'Msgs Hoy', val: '124', color: 'blue' },
                    { label: 'AI Success', val: '98.2%', color: 'green' },
                    { label: 'Escalaciones', val: '3', color: 'orange' },
                    { label: 'Tokens Totales', val: '14.2k', color: 'purple' },
                ].map((stat) => (
                    <div key={stat.label} className="bg-white p-6 rounded-3xl border border-gray-100 shadow-sm">
                        <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">{stat.label}</p>
                        <p className="text-2xl font-black text-gray-900 mt-1">{stat.val}</p>
                    </div>
                ))}
            </div>

            {/* Logs List */}
            <div className="bg-white rounded-3xl border border-gray-100 shadow-sm overflow-hidden">
                <div className="p-6 border-b border-gray-50 flex flex-col md:flex-row md:items-center justify-between gap-4">
                    <div className="relative flex-1">
                        <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
                        <input
                            type="text"
                            placeholder="Buscar por teléfono o contenido..."
                            className="w-full bg-gray-50 border-none rounded-xl pl-10 pr-4 py-2 text-sm focus:ring-2 focus:ring-black/5"
                        />
                    </div>
                    <div className="flex items-center gap-4 text-xs font-bold text-gray-400 uppercase tracking-widest">
                        <span>Mostrando últimos 20</span>
                    </div>
                </div>

                <div className="divide-y divide-gray-50">
                    {convs?.map((conv) => (
                        <div key={conv.id} className="p-6 hover:bg-gray-50/50 transition-colors group cursor-pointer">
                            <div className="flex flex-col md:flex-row md:items-center gap-6">
                                {/* Metadata Column */}
                                <div className="w-full md:w-48 space-y-2 shrink-0">
                                    <div className="flex items-center gap-2 text-gray-900 font-bold text-sm">
                                        <Phone size={14} className="text-gray-400" />
                                        <span>{conv.phone}</span>
                                    </div>
                                    <div className="flex items-center gap-2 text-[10px] font-bold text-gray-400 uppercase tracking-widest">
                                        <Calendar size={12} />
                                        <span>{new Date(conv.timestamp).toLocaleString()}</span>
                                    </div>
                                    <div className="flex items-center gap-2">
                                        <span className={cn(
                                            "px-2 py-0.5 rounded-md text-[9px] font-bold uppercase tracking-wider",
                                            conv.ai_status === 'processed' ? "bg-green-100 text-green-700" : "bg-orange-100 text-orange-700"
                                        )}>
                                            {conv.ai_status}
                                        </span>
                                        {conv.agent_type && (
                                            <span className="px-2 py-0.5 bg-blue-100 text-blue-700 rounded-md text-[9px] font-bold uppercase tracking-wider">
                                                {conv.agent_type}
                                            </span>
                                        )}
                                    </div>
                                </div>

                                {/* Content Preview */}
                                <div className="flex-1 space-y-2">
                                    <div className="flex items-start gap-3">
                                        <div className={cn(
                                            "w-6 h-6 rounded-lg flex items-center justify-center shrink-0 mt-0.5",
                                            conv.role === 'user' ? "bg-gray-100 text-gray-500" : "bg-blue-100 text-blue-600"
                                        )}>
                                            {conv.role === 'user' ? <User size={12} /> : <Bot size={12} />}
                                        </div>
                                        <p className="text-sm text-gray-700 leading-relaxed line-clamp-2">
                                            {conv.content}
                                        </p>
                                    </div>
                                    {conv.agent_summary && (
                                        <div className="ml-9 p-3 bg-gray-50 rounded-2xl border border-gray-100">
                                            <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest mb-1">Resumen AI</p>
                                            <p className="text-xs text-gray-500 line-clamp-1 italic italic-gray-400">"{conv.agent_summary}"</p>
                                        </div>
                                    )}
                                </div>

                                <div className="flex items-center gap-2">
                                    <button className="bg-white border border-gray-100 text-xs font-bold text-gray-700 px-3 py-1.5 rounded-lg hover:bg-gray-50 transition shadow-sm">
                                        Take Over
                                    </button>
                                    <button className="text-gray-300 hover:text-black transition-colors opacity-0 group-hover:opacity-100">
                                        <MoreHorizontal size={20} />
                                    </button>
                                    <ChevronRight size={20} className="text-gray-300 group-hover:text-black transition-colors" />
                                </div>
                            </div>
                        </div>
                    ))}
                </div>

                <div className="p-6 bg-gray-50/30 border-t border-gray-50 text-center">
                    <button className="text-xs font-bold text-gray-400 hover:text-black transition-colors uppercase tracking-widest">
                        Cargar más logs
                    </button>
                </div>
            </div>
        </div>
    )
}
