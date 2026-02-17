import { createClient } from '@/lib/supabase/server'
import { Plus, Search, Filter, Download, ArrowUpRight, ArrowDownRight, MoreHorizontal, Receipt } from 'lucide-react'
import { getCompanyByDomain } from '@/lib/data/companies'
import { formatCurrency } from '@/lib/utils/currency'
import { headers } from 'next/headers'

export default async function TransactionsPage() {
    const supabase = await createClient()
    const headersList = await headers()
    const host = headersList.get('host') || ''
    const domain = host.split('.')[0]

    // Fetch company to get base currency
    const company = await getCompanyByDomain(supabase, domain)
    const companyCurrency = company?.currency || 'USD'

    // Fetch user's financial transactions
    const { data: transactions, error } = await supabase
        .from('financial_transactions')
        .select('*')
        .eq('context_company_id', company?.id) // Filter by company
        .order('date', { ascending: false })

    if (error) {
        return <div className="p-8 text-red-500">Error loading transactions: {error.message}</div>
    }

    const income = transactions?.filter(t => t.transaction_type === 'income' || t.transaction_type === 'deposit').reduce((acc, t) => acc + (t.amount || 0), 0) || 0
    const expenses = transactions?.filter(t => t.transaction_type === 'expense' || t.transaction_type === 'withdrawal').reduce((acc, t) => acc + (t.amount || 0), 0) || 0

    return (
        <div className="max-w-6xl mx-auto space-y-8">
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                <div>
                    <h1 className="text-3xl font-bold text-gray-900 tracking-tight">Transacciones</h1>
                    <p className="text-gray-500 mt-1">Sigue tus ingresos y egresos registrados por Nova.</p>
                </div>
                <div className="flex gap-2">
                    <button className="bg-white text-gray-700 px-4 py-3 rounded-xl font-bold border border-gray-100 shadow-sm flex items-center gap-2 hover:bg-gray-50 transition">
                        <Download size={18} />
                        <span>Exportar</span>
                    </button>
                    <button className="bg-black text-white px-6 py-3 rounded-xl font-bold flex items-center gap-2 hover:bg-gray-800 transition shadow-lg shadow-black/5 text-sm">
                        <Plus size={18} />
                        <span>Nueva Transacción</span>
                    </button>
                </div>
            </div>

            {/* Financial Overview Cards */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="bg-white p-8 rounded-3xl border border-gray-100 shadow-sm flex items-center justify-between group overflow-hidden relative">
                    <div className="relative z-10">
                        <p className="text-xs font-bold text-gray-400 uppercase tracking-widest mb-1">Ingresos Totales ({companyCurrency})</p>
                        <p className="text-3xl font-black text-gray-900">{formatCurrency(income, companyCurrency)}</p>
                    </div>
                    <div className="w-16 h-16 bg-green-50 text-green-600 rounded-2xl flex items-center justify-center relative z-10 group-hover:scale-110 transition-transform">
                        <ArrowUpRight size={32} />
                    </div>
                    <div className="absolute -right-10 -bottom-10 w-32 h-32 bg-green-50/50 rounded-full blur-3xl" />
                </div>

                <div className="bg-white p-8 rounded-3xl border border-gray-100 shadow-sm flex items-center justify-between group overflow-hidden relative">
                    <div className="relative z-10">
                        <p className="text-xs font-bold text-gray-400 uppercase tracking-widest mb-1">Gastos Totales ({companyCurrency})</p>
                        <p className="text-3xl font-black text-gray-900">{formatCurrency(expenses, companyCurrency)}</p>
                    </div>
                    <div className="w-16 h-16 bg-red-50 text-red-600 rounded-2xl flex items-center justify-center relative z-10 group-hover:scale-110 transition-transform">
                        <ArrowDownRight size={32} />
                    </div>
                    <div className="absolute -right-10 -bottom-10 w-32 h-32 bg-red-50/50 rounded-full blur-3xl" />
                </div>
            </div>

            {/* Toolbar */}
            <div className="flex items-center gap-4">
                <div className="flex-1 relative">
                    <Search size={18} className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400" />
                    <input
                        type="text"
                        placeholder="Buscar por descripción, categoría o fecha..."
                        className="w-full bg-white border border-gray-100 rounded-2xl pl-11 pr-4 py-3 text-sm focus:ring-black/5 focus:border-gray-200"
                    />
                </div>
                <button className="p-3 bg-white border border-gray-100 rounded-2xl text-gray-400 hover:text-black transition shadow-sm">
                    <Filter size={20} />
                </button>
            </div>

            {/* Transactions List */}
            <div className="bg-white rounded-3xl border border-gray-100 shadow-sm overflow-hidden">
                <table className="w-full text-left">
                    <thead>
                        <tr className="bg-gray-50/30">
                            <th className="px-6 py-4 text-[10px] font-bold text-gray-400 uppercase tracking-widest">Descripción</th>
                            <th className="px-6 py-4 text-[10px] font-bold text-gray-400 uppercase tracking-widest">Categoría</th>
                            <th className="px-6 py-4 text-[10px] font-bold text-gray-400 uppercase tracking-widest text-right">Monto</th>
                            <th className="px-6 py-4 text-[10px] font-bold text-gray-400 uppercase tracking-widest">Fecha</th>
                            <th className="px-6 py-4"></th>
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-50">
                        {transactions?.map((t) => {
                            const isForeignCurrency = t.original_currency && t.original_currency !== companyCurrency
                            return (
                                <tr key={t.id} className="group hover:bg-gray-50/30 transition-colors cursor-pointer">
                                    <td className="px-6 py-5">
                                        <div className="flex items-center gap-3">
                                            <div className="w-10 h-10 rounded-xl bg-gray-50 text-gray-400 flex items-center justify-center">
                                                <Receipt size={18} />
                                            </div>
                                            <div>
                                                <p className="font-bold text-gray-900 line-clamp-1">{t.description || 'Sin descripción'}</p>
                                                <p className="text-[10px] font-bold text-gray-400 uppercase tracking-tighter">{t.scope || 'Personal'}</p>
                                            </div>
                                        </div>
                                    </td>
                                    <td className="px-6 py-5">
                                        <span className="bg-gray-100 text-gray-600 px-3 py-1 rounded-full text-[10px] font-bold uppercase tracking-wider">
                                            {t.category || 'General'}
                                        </span>
                                    </td>
                                    <td className={cn(
                                        "px-6 py-5 text-sm font-mono font-bold text-right",
                                        t.transaction_type === 'expense' || t.transaction_type === 'withdrawal' ? "text-red-500" : "text-green-600"
                                    )}>
                                        <div>
                                            {t.transaction_type === 'expense' || t.transaction_type === 'withdrawal' ? '-' : '+'}
                                            {formatCurrency(t.amount, companyCurrency)}
                                        </div>
                                        {isForeignCurrency && (
                                            <div className="text-[10px] text-gray-400 font-normal">
                                                {formatCurrency(t.original_amount, t.original_currency)}
                                            </div>
                                        )}
                                    </td>
                                    <td className="px-6 py-5 text-xs text-gray-500">
                                        {new Date(t.date).toLocaleDateString()}
                                    </td>
                                    <td className="px-6 py-5 text-right">
                                        <button className="text-gray-300 hover:text-black transition-colors opacity-0 group-hover:opacity-100">
                                            <MoreHorizontal size={20} />
                                        </button>
                                    </td>
                                </tr>
                            )
                        })}
                    </tbody>
                </table>
                {transactions?.length === 0 && (
                    <div className="p-16 text-center">
                        <div className="w-16 h-16 bg-gray-50 text-gray-300 rounded-full flex items-center justify-center mx-auto mb-4">
                            <Receipt size={32} />
                        </div>
                        <p className="font-bold text-gray-900">Sin movimientos registrados</p>
                        <p className="text-sm text-gray-500">¿Qué tal si le cuentas a Nova sobre tu último gasto?</p>
                    </div>
                )}
            </div>
        </div>
    )
}

function cn(...inputs: any[]) { return inputs.filter(Boolean).join(' ') }

