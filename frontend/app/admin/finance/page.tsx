import { createClient } from '@/lib/supabase/server'
import { TrendingUp, TrendingDown, DollarSign, PieChart, ArrowUpRight, ArrowDownRight, Download, Calendar, Filter } from 'lucide-react'

export default async function FinancePage() {
    const supabase = await createClient()

    // Fetch global financial transactions
    const { data: transactions, error } = await supabase
        .from('financial_transactions')
        .select('*')
        .order('date', { ascending: false })
        .limit(100)

    if (error) {
        return <div className="p-8 text-red-500">Error loading financial data: {error.message}</div>
    }

    const income = transactions?.filter(t => t.transaction_type === 'income' || t.transaction_type === 'deposit').reduce((acc, t) => acc + (t.amount || 0), 0) || 0
    const costs = transactions?.filter(t => t.transaction_type === 'expense' || t.transaction_type === 'withdrawal').reduce((acc, t) => acc + (t.amount || 0), 0) || 0
    const netProfit = income - costs

    return (
        <div className="space-y-8">
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                <div>
                    <h1 className="text-3xl font-bold text-gray-900 tracking-tight">Finanzas Globales</h1>
                    <p className="text-gray-500 mt-1">Consolidado de ingresos, egresos y rentabilidad de toda la red.</p>
                </div>
                <div className="flex gap-2">
                    <button className="bg-white text-gray-700 px-4 py-3 rounded-xl font-bold border border-gray-100 shadow-sm flex items-center gap-2 hover:bg-gray-50 transition">
                        <Download size={18} />
                        <span>Exportar Informe</span>
                    </button>
                    <button className="bg-black text-white px-6 py-3 rounded-xl font-bold flex items-center gap-2 hover:bg-gray-800 transition shadow-lg shadow-black/5">
                        <Calendar size={18} />
                        <span>Este Mes</span>
                    </button>
                </div>
            </div>

            {/* Financial Summary Cards */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                <div className="bg-white p-8 rounded-3xl border border-gray-100 shadow-sm hover:shadow-md transition-shadow group">
                    <div className="flex justify-between items-start mb-6">
                        <div className="p-4 rounded-2xl bg-green-50 text-green-600 group-hover:scale-110 transition-transform">
                            <TrendingUp size={28} />
                        </div>
                        <div className="flex items-center gap-1 text-green-600 text-xs font-bold bg-green-50 px-2 py-1 rounded-full">
                            <ArrowUpRight size={14} />
                            <span>15.2%</span>
                        </div>
                    </div>
                    <p className="text-xs font-bold text-gray-400 uppercase tracking-widest">Ingresos Totales</p>
                    <p className="text-4xl font-black text-gray-900 mt-2">${income.toLocaleString()}</p>
                </div>

                <div className="bg-white p-8 rounded-3xl border border-gray-100 shadow-sm hover:shadow-md transition-shadow group">
                    <div className="flex justify-between items-start mb-6">
                        <div className="p-4 rounded-2xl bg-red-50 text-red-600 group-hover:scale-110 transition-transform">
                            <TrendingDown size={28} />
                        </div>
                        <div className="flex items-center gap-1 text-red-600 text-xs font-bold bg-red-50 px-2 py-1 rounded-full">
                            <ArrowDownRight size={14} />
                            <span>8.4%</span>
                        </div>
                    </div>
                    <p className="text-xs font-bold text-gray-400 uppercase tracking-widest">Costos Operativos</p>
                    <p className="text-4xl font-black text-gray-900 mt-2">${costs.toLocaleString()}</p>
                </div>

                <div className="bg-black p-8 rounded-3xl shadow-xl shadow-black/10 group overflow-hidden relative">
                    <div className="relative z-10">
                        <div className="flex justify-between items-start mb-6">
                            <div className="p-4 rounded-2xl bg-white/10 text-white group-hover:scale-110 transition-transform">
                                <DollarSign size={28} />
                            </div>
                            <span className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">Net Profit</span>
                        </div>
                        <p className="text-xs font-bold text-gray-400 uppercase tracking-widest">Rentabilidad Neta</p>
                        <p className="text-4xl font-black text-white mt-2">${netProfit.toLocaleString()}</p>
                    </div>
                    {/* Abstract design elements */}
                    <div className="absolute -bottom-10 -right-10 w-40 h-40 bg-white/5 rounded-full blur-2xl" />
                    <div className="absolute -top-10 -left-10 w-40 h-40 bg-white/5 rounded-full blur-2xl" />
                </div>
            </div>

            {/* Transactions & Distribution */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                {/* Recent Transactions */}
                <div className="lg:col-span-2 bg-white rounded-3xl border border-gray-100 shadow-sm overflow-hidden">
                    <div className="p-6 border-b border-gray-50 flex items-center justify-between">
                        <h3 className="text-lg font-bold text-gray-900">Transacciones Recientes</h3>
                        <button className="text-gray-400 hover:text-black">
                            <Filter size={20} />
                        </button>
                    </div>
                    <div className="overflow-x-auto">
                        <table className="w-full text-left">
                            <thead className="bg-gray-50/50">
                                <tr>
                                    <th className="px-6 py-4 text-[10px] font-bold text-gray-400 uppercase tracking-widest">Concepto</th>
                                    <th className="px-6 py-4 text-[10px] font-bold text-gray-400 uppercase tracking-widest">Categoría</th>
                                    <th className="px-6 py-4 text-[10px] font-bold text-gray-400 uppercase tracking-widest">Monto</th>
                                    <th className="px-6 py-4 text-[10px] font-bold text-gray-400 uppercase tracking-widest">Fecha</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-gray-50">
                                {transactions?.map((t) => (
                                    <tr key={t.id} className="hover:bg-gray-50/30 transition-colors">
                                        <td className="px-6 py-4">
                                            <p className="text-sm font-bold text-gray-900">{t.description || 'Sin descripción'}</p>
                                            <p className="text-[10px] text-gray-400 uppercase font-bold tracking-tight">{t.scope}</p>
                                        </td>
                                        <td className="px-6 py-4 text-xs font-medium text-gray-500">
                                            {t.category}
                                        </td>
                                        <td className={cn(
                                            "px-6 py-4 text-sm font-mono font-bold",
                                            t.transaction_type === 'expense' || t.transaction_type === 'withdrawal' ? "text-red-500" : "text-green-600"
                                        )}>
                                            {t.transaction_type === 'expense' ? '-' : '+'}${t.amount?.toLocaleString()}
                                        </td>
                                        <td className="px-6 py-4 text-xs text-gray-400">
                                            {new Date(t.date).toLocaleDateString()}
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                </div>

                {/* Categories Distribution */}
                <div className="bg-white p-8 rounded-3xl border border-gray-100 shadow-sm">
                    <div className="flex items-center gap-2 mb-8">
                        <PieChart size={20} className="text-purple-600" />
                        <h3 className="text-lg font-bold text-gray-900">Distribución de Gastos</h3>
                    </div>

                    <div className="space-y-6">
                        {[
                            { name: 'Infraestructura (Cloud)', value: 45, color: 'bg-blue-500' },
                            { name: 'API Gemini/OpenAI', value: 30, color: 'bg-purple-500' },
                            { name: 'Sueldos y Operación', value: 20, color: 'bg-indigo-500' },
                            { name: 'Marketing', value: 5, color: 'bg-orange-500' },
                        ].map((item) => (
                            <div key={item.name} className="space-y-2">
                                <div className="flex justify-between text-xs font-bold">
                                    <span className="text-gray-500">{item.name}</span>
                                    <span className="text-gray-900">{item.value}%</span>
                                </div>
                                <div className="h-2 w-full bg-gray-50 rounded-full overflow-hidden">
                                    <div className={cn("h-full rounded-full transition-all duration-1000", item.color)} style={{ width: `${item.value}%` }} />
                                </div>
                            </div>
                        ))}
                    </div>

                    <div className="mt-10 p-4 bg-purple-50 rounded-2xl border border-purple-100">
                        <p className="text-[10px] font-bold text-purple-600 uppercase tracking-widest leading-loose">
                            Optimización de Costos: El uso de Gemini Flash ha reducido los costos de API en un 35% este mes.
                        </p>
                    </div>
                </div>
            </div>
        </div>
    )
}

function cn(...inputs: any[]) { return inputs.filter(Boolean).join(' ') }
