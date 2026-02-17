import { createClient } from '@/lib/supabase/server'
import { Save, RotateCcw, ChevronLeft, Bot, Sparkles, AlertCircle } from 'lucide-react'
import Link from 'next/link'
import { cn } from '@/lib/utils'

export default async function AgentEditorPage({ params }: { params: { id: string } }) {
    const supabase = await createClient()

    // Fetch the specific prompt/agent configuration
    const { data: prompt, error } = await supabase
        .from('company_prompts')
        .select('*')
        .eq('id', params.id)
        .single()

    if (error) {
        return <div className="p-8 text-red-500 text-center">
            <AlertCircle size={48} className="mx-auto mb-4 opacity-20" />
            <h2 className="text-xl font-bold">Error al cargar el agente</h2>
            <p className="text-sm opacity-50 mt-1">{error.message}</p>
        </div>
    }

    return (
        <div className="max-w-4xl mx-auto space-y-8 pb-20">
            <div className="flex items-center gap-4">
                <Link href="/admin/agents" className="p-2 hover:bg-gray-100 rounded-xl transition-colors">
                    <ChevronLeft size={24} />
                </Link>
                <div>
                    <h1 className="text-3xl font-bold text-gray-900 tracking-tight">Editar Agente</h1>
                    <div className="flex items-center gap-2 text-xs text-gray-400 font-bold uppercase tracking-widest mt-1">
                        <Bot size={12} />
                        <span>{prompt.agent_name} &bull; {prompt.agent_type}</span>
                    </div>
                </div>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                {/* Main Settings */}
                <div className="lg:col-span-2 space-y-6">
                    <div className="bg-white p-8 rounded-3xl border border-gray-100 shadow-sm space-y-6">
                        <div className="space-y-2">
                            <label className="text-xs font-bold text-gray-400 uppercase tracking-widest">Nombre del Agente</label>
                            <input
                                type="text"
                                defaultValue={prompt.agent_name}
                                className="w-full bg-gray-50 border-none rounded-2xl px-4 py-3 text-sm focus:ring-2 focus:ring-black/5"
                            />
                        </div>

                        <div className="space-y-2">
                            <div className="flex items-center justify-between">
                                <label className="text-xs font-bold text-gray-400 uppercase tracking-widest">System Prompt (Instrucciones)</label>
                                <button className="text-[10px] font-bold text-blue-600 flex items-center gap-1 hover:underline">
                                    <Sparkles size={10} />
                                    <span>Optimizar Prompt</span>
                                </button>
                            </div>
                            <textarea
                                rows={12}
                                defaultValue={prompt.system_message}
                                className="w-full bg-gray-50 border-none rounded-2xl px-4 py-3 text-sm font-mono focus:ring-2 focus:ring-black/5 resize-none"
                            />
                            <p className="text-[10px] text-gray-400 italic">Este prompt define la identidad, reglas y tono del agente.</p>
                        </div>

                        <div className="flex items-center justify-between pt-4">
                            <button className="text-sm font-bold text-gray-400 flex items-center gap-2 hover:text-red-500 transition-colors">
                                <RotateCcw size={16} />
                                <span>Restablecer a Default</span>
                            </button>
                            <button className="bg-black text-white px-8 py-3 rounded-xl font-bold flex items-center gap-2 hover:bg-gray-800 transition shadow-lg shadow-black/5">
                                <Save size={18} />
                                <span>Guardar Cambios</span>
                            </button>
                        </div>
                    </div>
                </div>

                {/* Sidebar Info */}
                <div className="space-y-6">
                    <div className="bg-white p-6 rounded-3xl border border-gray-100 shadow-sm">
                        <h4 className="text-xs font-bold text-gray-400 uppercase tracking-widest mb-4">Estado y Versión</h4>
                        <div className="space-y-4">
                            <div className="flex items-center justify-between">
                                <span className="text-sm text-gray-600">Activo</span>
                                <div className={cn(
                                    "w-10 h-5 rounded-full relative transition-colors cursor-pointer",
                                    prompt.active ? "bg-green-500" : "bg-gray-200"
                                )}>
                                    <div className={cn(
                                        "absolute top-1 w-3 h-3 bg-white rounded-full transition-all",
                                        prompt.active ? "right-1" : "left-1"
                                    )} />
                                </div>
                            </div>
                            <div className="flex items-center justify-between">
                                <span className="text-sm text-gray-600">Versión Actual</span>
                                <span className="text-sm font-bold text-gray-900 font-mono">v{prompt.version || 1}</span>
                            </div>
                            <div className="flex items-center justify-between">
                                <span className="text-sm text-gray-600">Última edición</span>
                                <span className="text-[10px] font-bold text-gray-400 uppercase">
                                    {new Date(prompt.updated_at).toLocaleDateString()}
                                </span>
                            </div>
                        </div>
                    </div>

                    <div className="bg-blue-50/50 p-6 rounded-3xl border border-blue-100/50">
                        <h4 className="text-xs font-bold text-blue-600 uppercase tracking-widest mb-3 flex items-center gap-2">
                            <Sparkles size={14} />
                            <span>Consejo AI</span>
                        </h4>
                        <p className="text-xs text-blue-700 leading-relaxed">
                            Asegúrate de incluir variables como <code className="bg-blue-100 px-1 rounded">{"{{user_name}}"}</code> si quieres que el agente sea más personal.
                        </p>
                    </div>
                </div>
            </div>
        </div>
    )
}
