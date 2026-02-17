import { getCompanyByDomain } from '@/lib/data/companies'
import { createClient } from '@/lib/supabase/server'
import { getFinancialStats, getTransactions, getProjects, getUniqueCategories, getDashboardChartsData } from '@/lib/actions/finance'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { DollarSign, TrendingUp, TrendingDown } from 'lucide-react'
import { TransactionForm } from './_components/TransactionForm'
import { TransactionTable } from './_components/TransactionTable'
import { ProjectFilter } from './_components/ProjectFilter'
import { ReceiptUpload } from './_components/ReceiptUpload'
import { CashFlowChart } from './_components/charts/CashFlowChart'
import { ExpensePieChart } from './_components/charts/ExpensePieChart'
import { NetWorthChart } from './_components/charts/NetWorthChart'
import { ProjectIncomeChart } from './_components/charts/ProjectIncomeChart'

export default async function FinancePage({
    params,
    searchParams,
}: {
    params: Promise<{ domain: string }>
    searchParams: Promise<{ [key: string]: string | string[] | undefined }>
}) {
    const { domain: rawDomain } = await params
    const resolvedSearchParams = await searchParams
    const projectId = typeof resolvedSearchParams?.projectId === 'string' ? resolvedSearchParams.projectId : undefined

    const domain = decodeURIComponent(rawDomain)
    const supabase = await createClient()

    const { data: { user } } = await supabase.auth.getUser()

    console.log('[FinancePage] Domain:', domain)
    const company = await getCompanyByDomain(supabase, domain)
    console.log('[FinancePage] Resolved Company:', company?.id, company?.name)

    if (!company) return <div>Company not found</div>

    // Prepare search params for transactions
    const transactionParams = {
        limit: 100, // Fetch more for the table
        projectId,
        startDate: resolvedSearchParams?.startDate as string,
        endDate: resolvedSearchParams?.endDate as string,
        type: resolvedSearchParams?.type as 'all' | 'income' | 'expense',
        category: resolvedSearchParams?.category as string,
        sort: resolvedSearchParams?.sort as 'date' | 'amount',
        order: resolvedSearchParams?.order as 'asc' | 'desc',
    }

    // Parallel data fetching
    const [stats, transactions, projects, categories, chartData, contactResult] = await Promise.all([
        getFinancialStats(company.id, projectId),
        getTransactions(company.id, transactionParams),
        getProjects(company.id),
        getUniqueCategories(company.id),
        getDashboardChartsData(company.id, projectId),
        supabase.schema('wa').from('contacts').select('id').eq('user_id', user?.id).single()
    ])

    const contact = contactResult.data
    const userId = contact?.id || user?.id
    const companyCurrency = company.currency || 'USD'

    return (
        <div className="flex-1 space-y-4 p-8 pt-6">
            <div className="flex items-center justify-between space-y-2">
                <h2 className="text-3xl font-bold tracking-tight">Financial Dashboard</h2>
                <div className="flex items-center space-x-2">
                    <ProjectFilter projects={projects || []} />
                    <ReceiptUpload companyId={company.id} userId={userId} companyCurrency={companyCurrency} />
                    <TransactionForm companyId={company.id} userId={userId} companyCurrency={companyCurrency} />
                </div>
            </div>

            {/* KPI Cards */}
            <div className="grid gap-4 md:grid-cols-3">
                <Card>
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                        <CardTitle className="text-sm font-medium">Total Revenue ({companyCurrency})</CardTitle>
                        <DollarSign className="h-4 w-4 text-muted-foreground" />
                    </CardHeader>
                    <CardContent>
                        <div className="text-2xl font-bold text-green-600">
                            {new Intl.NumberFormat('en-US', { style: 'currency', currency: companyCurrency }).format(stats.revenue)}
                        </div>
                        <p className="text-xs text-muted-foreground">
                            {projectId ? 'Filtered by Project' : 'All Projects'}
                        </p>
                    </CardContent>
                </Card>
                <Card>
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                        <CardTitle className="text-sm font-medium">Expenses ({companyCurrency})</CardTitle>
                        <TrendingDown className="h-4 w-4 text-muted-foreground" />
                    </CardHeader>
                    <CardContent>
                        <div className="text-2xl font-bold text-red-600">
                            {new Intl.NumberFormat('en-US', { style: 'currency', currency: companyCurrency }).format(stats.expenses)}
                        </div>
                        <p className="text-xs text-muted-foreground">
                            {projectId ? 'Filtered by Project' : 'All Projects'}
                        </p>
                    </CardContent>
                </Card>
                <Card>
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                        <CardTitle className="text-sm font-medium">Net Income ({companyCurrency})</CardTitle>
                        <TrendingUp className="h-4 w-4 text-muted-foreground" />
                    </CardHeader>
                    <CardContent>
                        <div className={`text-2xl font-bold ${stats.netIncome >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                            {new Intl.NumberFormat('en-US', { style: 'currency', currency: companyCurrency }).format(stats.netIncome)}
                        </div>
                        <p className="text-xs text-muted-foreground">
                            {projectId ? 'Filtered by Project' : 'All Projects'}
                        </p>
                    </CardContent>
                </Card>
            </div>

            {/* Charts Section 1: Cash Flow & Expenses */}
            <div className="grid gap-4 md:grid-cols-7">
                {chartData && <CashFlowChart data={chartData.cashFlowData} currency={companyCurrency} />}
                {chartData && <ExpensePieChart data={chartData.categoryData} currency={companyCurrency} />}
            </div>

            {/* Charts Section 2: Net Worth & Project Income */}
            <div className="grid gap-4 md:grid-cols-7">
                {chartData && <NetWorthChart data={chartData.netWorthData} currency={companyCurrency} />}
                {chartData && <ProjectIncomeChart data={chartData.projectData} currency={companyCurrency} />}
            </div>

            {/* Recent Transactions Table (Full Width) */}
            <Card>
                <CardHeader>
                    <CardTitle>Recent Transactions</CardTitle>
                </CardHeader>
                <CardContent>
                    <TransactionTable
                        transactions={transactions}
                        companyCurrency={companyCurrency}
                        categories={categories || []}
                    />
                </CardContent>
            </Card>
        </div>
    )
}
