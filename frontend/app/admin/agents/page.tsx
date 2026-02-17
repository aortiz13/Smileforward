import { createClient } from '@/lib/supabase/server'
import { Bot, Save, RotateCcw, MessageSquare, Sparkles, Building2, History } from 'lucide-react'
import Link from 'next/link'

export default async function AgentsPage() {
    const supabase = await createClient()

    // Fetch available prompts/agents per company
    const { data: prompts, error } = await supabase
        .from('company_prompts')
        .select('*')
        .order('updated_at', { ascending: false })

    if (error) {
        return <div className="p-8 text-red-500">Error loading agents: {error.message}</div>
    }

    return (
        <div className="space-y-8">
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                <div>
                    <h1 className="text-3xl font-bold text-gray-900 tracking-tight">Personalización de Agentes</h1>
                    <p className="text-gray-500 mt-1">Configura el comportamiento, tono y herramientas de Nova para cada instancia.</p>
                </div>
                <button className="bg-black text-white px-6 py-3 rounded-xl font-bold flex items-center gap-2 hover:bg-gray-800 transition shadow-lg shadow-black/5">
                    <Sparkles size={20} />
                    <span>Optimizar con AI</span>
                </button>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {prompts?.map((prompt) => (
                    <div key={prompt.id} className="bg-white rounded-3xl border border-gray-100 shadow-sm overflow-hidden flex flex-col group hover:shadow-md transition-shadow">
                        <div className="p-6 flex-1">
                            <div className="flex items-center justify-between mb-4">
                                <div className="w-12 h-12 bg-blue-50 text-blue-600 rounded-2xl flex items-center justify-center">
                                    <Bot size={24} />
                                </div>
                                <span className={cn(
                                    "px-3 py-1 rounded-full text-[10px] font-bold uppercase tracking-wider",
                                    prompt.active ? "bg-green-100 text-green-700" : "bg-gray-100 text-gray-500"
                                )}>
                                    {prompt.active ? 'Activo' : 'Inactivo'}
                                </span>
                            </div>

                            <h3 className="text-lg font-bold text-gray-900 mb-1">{prompt.agent_name || 'Agente Nova'}</h3>
                            <div className="flex items-center gap-2 text-xs text-gray-400 mb-4 font-bold uppercase tracking-widest">
                                <Building2 size={12} />
                                <span>{prompt.company_name || 'Blukastor'}</span>
                            </div>

                            <p className="text-sm text-gray-600 line-clamp-3 mb-6 italic">
                                "{prompt.system_message}"
                            </p>

                            <div className="flex items-center gap-4 text-xs font-bold text-gray-400">
                                <div className="flex items-center gap-1">
                                    <MessageSquare size={14} />
                                    <span>{prompt.agent_type}</span>
                                </div>
                                <div className="flex items-center gap-1">
                                    <History size={14} />
                                    <span>v{prompt.version || 1}</span>
                                </div>
                            </div>
                        </div>

                        <div className="p-4 bg-gray-50 border-t border-gray-100 flex gap-2">
                            <button className="flex-1 bg-white border border-gray-200 text-black py-2 rounded-xl text-xs font-bold hover:bg-gray-100 transition">
                                Editar Prompt
                            </button>
                            <button className="bg-white border border-gray-200 text-gray-400 p-2 rounded-xl hover:text-black transition">
                                <RotateCcw size={16} />
                            </button>
                        </div>
                    </div>
                ))}
            </div>

            {/* Template Library */}
            <div className="bg-white p-8 rounded-3xl border border-gray-100 shadow-sm border-dashed">
                <div className="text-center max-w-sm mx-auto">
                    <div className="w-16 h-16 bg-gray-50 text-gray-400 rounded-full flex items-center justify-center mx-auto mb-4">
                        <Bot size={32} />
                    </div>
                    <h4 className="text-lg font-bold text-gray-900">Biblioteca de Templates</h4>
                    <p className="text-sm text-gray-500 mt-2 mb-6">Usa configuraciones pre-diseñadas para Ventas, Soporte o Coaching.</p>
                    <button className="text-primary font-bold text-sm">Explorar Templates &rarr;</button>
                </div>
            </div>
        </div>
    )
}

function cn(...inputs: any[]) { return inputs.filter(Boolean).join(' ') }
