import { createClient } from '@/lib/supabase/server'
import { Target, Flag, Calendar, CheckCircle2, Circle, ArrowRight, Plus, Sparkles } from 'lucide-react'

export default async function GoalsPage() {
    const supabase = await createClient()

    // Fetch user goals
    const { data: goals, error } = await supabase
        .from('goals')
        .select('*')
        .order('created_at', { ascending: false })

    if (error) {
        return <div className="p-8 text-red-500">Error loading goals: {error.message}</div>
    }

    return (
        <div className="max-w-6xl mx-auto space-y-8">
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                <div>
                    <h1 className="text-3xl font-bold text-gray-900 tracking-tight">Metas y OKRs</h1>
                    <p className="text-gray-500 mt-1">Sigue tus objetivos estratégicos y resultados clave con Nova.</p>
                </div>
                <button className="bg-black text-white px-6 py-3 rounded-xl font-bold flex items-center gap-2 hover:bg-gray-800 transition shadow-lg shadow-black/5 text-sm">
                    <Plus size={18} />
                    <span>Nuevo Objetivo</span>
                </button>
            </div>

            {/* AI Coaching Banner */}
            <div className="bg-gradient-to-r from-blue-600 to-indigo-700 rounded-3xl p-8 text-white relative overflow-hidden shadow-xl shadow-blue-600/10">
                <div className="relative z-10 max-w-xl">
                    <div className="flex items-center gap-2 mb-4 bg-white/10 w-fit px-3 py-1 rounded-full text-xs font-bold uppercase tracking-widest backdrop-blur-sm">
                        <Sparkles size={14} />
                        <span>Nova Active Coaching</span>
                    </div>
                    <h2 className="text-2xl font-black mb-2">¿Cómo vamos con el plan de Q1?</h2>
                    <p className="text-blue-100 mb-6 leading-relaxed">
                        Nova ha analizado tus transacciones y sugiere elevar tu micro-meta de "ventas orgánicas" a un objetivo trimestral de posicionamiento.
                    </p>
                    <button className="bg-white text-blue-700 px-6 py-3 rounded-xl font-bold hover:bg-blue-50 transition shadow-sm flex items-center gap-2 text-sm">
                        Hablar sobre esta sugerencia
                        <ArrowRight size={16} />
                    </button>
                </div>
                {/* Abstract graphic */}
                <div className="absolute right-0 top-0 bottom-0 w-1/3 bg-white/5 skew-x-12 translate-x-20" />
                <Target size={200} className="absolute -right-20 -bottom-20 text-white/10 rotate-12" />
            </div>

            {/* Goals Grid */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                {goals?.map((goal) => (
                    <div key={goal.id} className="bg-white rounded-3xl border border-gray-100 shadow-sm p-8 hover:shadow-md transition-shadow flex flex-col group">
                        <div className="flex justify-between items-start mb-6">
                            <div className="p-4 bg-gray-50 text-gray-400 rounded-2xl group-hover:bg-blue-50 group-hover:text-blue-600 transition-colors">
                                <Target size={24} />
                            </div>
                            <span className={cn(
                                "px-3 py-1 rounded-full text-[10px] font-bold uppercase tracking-wider",
                                goal.status === 'completed' ? "bg-green-100 text-green-700" : "bg-blue-100 text-blue-700"
                            )}>
                                {goal.status === 'in_progress' ? 'En Proceso' : goal.status}
                            </span>
                        </div>

                        <h3 className="text-xl font-black text-gray-900 mb-2">{goal.title}</h3>
                        <p className="text-sm text-gray-500 mb-6 leading-relaxed flex-1">
                            {goal.description || 'Sin descripción adicional.'}
                        </p>

                        {/* Progress Bar (Sample) */}
                        <div className="space-y-2 mb-8">
                            <div className="flex justify-between text-xs font-bold uppercase tracking-widest">
                                <span className="text-gray-400">Progreso Estimado</span>
                                <span className="text-gray-900">65%</span>
                            </div>
                            <div className="h-2 w-full bg-gray-50 rounded-full overflow-hidden">
                                <div className="h-full bg-blue-600 rounded-full" style={{ width: '65%' }} />
                            </div>
                        </div>

                        {/* Metadata */}
                        <div className="flex items-center gap-6 pt-6 border-t border-gray-50 text-[10px] font-bold text-gray-400 uppercase tracking-widest">
                            <div className="flex items-center gap-1.5">
                                <Flag size={14} />
                                <span>{goal.scope || 'Personal'}</span>
                            </div>
                            <div className="flex items-center gap-1.5">
                                <Calendar size={14} />
                                <span>Finaliza Mar 20</span>
                            </div>
                        </div>
                    </div>
                ))}
                {goals?.length === 0 && (
                    <div className="lg:col-span-2 p-20 text-center bg-white rounded-3xl border border-gray-100 border-dashed">
                        <div className="w-16 h-16 bg-gray-50 text-gray-300 rounded-full flex items-center justify-center mx-auto mb-4">
                            <Flag size={32} />
                        </div>
                        <p className="font-bold text-gray-900">Define tu primer objetivo</p>
                        <p className="text-sm text-gray-500">¿Qué quieres lograr en los próximos 90 días?</p>
                    </div>
                )}
            </div>
        </div>
    )
}

function cn(...inputs: any[]) { return inputs.filter(Boolean).join(' ') }
