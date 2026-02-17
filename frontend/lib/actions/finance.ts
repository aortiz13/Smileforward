'use server'

import { createClient } from '../supabase/server'
import { createServiceClient } from '../supabase/service'
import { revalidatePath } from 'next/cache'

export async function getProjects(companyId: string) {
    // Use service client to bypass RLS recursion issues
    const supabase = createServiceClient()

    // Fetch companies that are of kind 'project' and linked to this client company
    const { data, error } = await supabase
        .from('companies')
        .select('id, name')
        .eq('company_kind', 'project')
        .eq('client_company_id', companyId)

    if (error) {
        console.error('Error fetching projects:', JSON.stringify(error, null, 2))
        return []
    }
    return data
}

export async function getFinancialStats(companyId: string, projectId?: string) {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()

    console.log('[Finance] getStats for Company:', companyId, 'Project:', projectId, 'User:', user?.id)

    let query = supabase
        .from('financial_transactions')
        .select('*')
        .eq('context_company_id', companyId)
        .eq('status', 'confirmed')

    if (projectId && projectId !== 'all') {
        query = query.eq('user_company_id', projectId)
    }

    const { data: transactions, error } = await query

    if (error) {
        console.error('Error fetching stats:', error)
        return { revenue: 0, expenses: 0, netIncome: 0, cashflow: [] }
    }

    console.log('[Finance] Transactions found:', transactions?.length)

    // Calculate totals
    const revenue = transactions
        .filter(t => t.transaction_type === 'income')
        .reduce((sum, t) => sum + Number(t.amount), 0)

    const expenses = transactions
        .filter(t => t.transaction_type === 'expense')
        .reduce((sum, t) => sum + Number(t.amount), 0)

    const netIncome = revenue - expenses

    // Prepare chart data (daily cashflow)
    const dailyData = transactions.reduce((acc: any, t) => {
        const date = t.date // YYYY-MM-DD
        if (!acc[date]) {
            acc[date] = { date, income: 0, expense: 0 }
        }
        if (t.transaction_type === 'income') acc[date].income += Number(t.amount)
        if (t.transaction_type === 'expense') acc[date].expense += Number(t.amount)
        return acc
    }, {})

    const cashflow = Object.values(dailyData).sort((a: any, b: any) =>
        new Date(a.date).getTime() - new Date(b.date).getTime()
    )

    return {
        revenue,
        expenses,
        netIncome,
        cashflow
    }
}

export async function getTransactions(
    companyId: string,
    params: {
        limit?: number
        projectId?: string
        startDate?: string
        endDate?: string
        type?: 'all' | 'income' | 'expense'
        category?: string
        sort?: 'date' | 'amount'
        order?: 'asc' | 'desc'
    } = {}
) {
    const supabase = await createClient()

    let query = supabase
        .from('financial_transactions')
        .select('*')
        .eq('context_company_id', companyId)
        .eq('status', 'confirmed')

    // Filters
    if (params.projectId && params.projectId !== 'all') {
        query = query.eq('user_company_id', params.projectId)
    }
    if (params.startDate) {
        query = query.gte('date', params.startDate)
    }
    if (params.endDate) {
        query = query.lte('date', params.endDate)
    }
    if (params.type && params.type !== 'all') {
        query = query.eq('transaction_type', params.type)
    }
    if (params.category && params.category !== 'all') {
        query = query.eq('category', params.category)
    }

    // Sorting
    const sortColumn = params.sort === 'amount' ? 'amount' : 'date'
    const sortOrder = params.order === 'asc'
    query = query.order(sortColumn, { ascending: sortOrder })

    // Limit
    if (params.limit) {
        query = query.limit(params.limit)
    }

    const { data, error } = await query

    if (error) {
        console.error('Error fetching transactions:', error)
        return []
    }

    return data
}

export async function deleteTransaction(transactionId: string) {
    const supabase = await createClient()
    const { error } = await supabase
        .from('financial_transactions')
        .delete()
        .eq('id', transactionId)

    if (error) {
        console.error('Error deleting transaction:', error)
        return { error: error.message }
    }

    revalidatePath('/finance')
    return { success: true }
}

export async function createTransaction(formData: FormData) {
    console.log('[Finance] createTransaction called with:', Object.fromEntries(formData))
    const supabase = await createClient()
    const adminDb = createServiceClient()

    // 1. Get Authenticated User
    const { data: { user }, error: authError } = await supabase.auth.getUser()
    if (authError || !user) {
        return { error: 'Unauthorized: Please log in' }
    }

    // 2. Resolve Contact ID using direct SQL (wa schema not exposed in PostgREST)
    const companyId = formData.get('companyId') as string
    console.log('[Finance] Looking for contact with user_id:', user.id, 'company:', companyId)

    // Use direct SQL via the service client since wa schema is not exposed via REST API
    const { data: contactResult, error: contactError } = await adminDb.rpc('resolve_contact_id', {
        p_user_id: user.id,
        p_company_id: companyId
    })

    console.log('[Finance] Contact resolution result:', { contactResult, contactError })

    let contactId: string | null = contactResult

    // If the RPC function doesn't exist yet, fall back to a direct query workaround
    if (contactError) {
        console.log('[Finance] RPC failed, using fallback query via public schema view or direct fetch')
        // Try querying through the public schema using a raw REST call
        const response = await fetch(
            `${process.env.NEXT_PUBLIC_SUPABASE_URL}/rest/v1/rpc/resolve_contact_id`,
            {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'apikey': process.env.SUPABASE_SERVICE_ROLE_KEY!,
                    'Authorization': `Bearer ${process.env.SUPABASE_SERVICE_ROLE_KEY!}`
                },
                body: JSON.stringify({ p_user_id: user.id, p_company_id: companyId })
            }
        )
        if (response.ok) {
            contactId = await response.json()
        }
    }

    if (!contactId) {
        console.error('[Finance] Could not resolve contact_id for user:', user.id, 'company:', companyId)
        return { error: 'Profile not found. Please contact an administrator.' }
    }


    const amount = Number(formData.get('amount'))
    const date = formData.get('date') as string
    const category = formData.get('category') as string
    const description = formData.get('description') as string
    const type = formData.get('type') as 'income' | 'expense'

    const projectId = formData.get('projectId') as string
    const mediaUrl = formData.get('media_url') as string | null

    // Multi-currency fields
    const currency = formData.get('currency') as string || 'USD'
    const originalAmount = formData.get('originalAmount') ? Number(formData.get('originalAmount')) : null
    const exchangeRate = formData.get('exchangeRate') ? Number(formData.get('exchangeRate')) : 1

    if (!amount || !date || !type || !companyId) {
        console.error('Missing required fields:', { amount, date, type, companyId })
        return { error: 'Missing required fields' }
    }

    // Prepare insert object
    const insertData: any = {
        amount, // This is the base currency amount (converted)
        date,
        category,
        description,
        transaction_type: type,
        context_company_id: companyId,
        contact_id: contactId,
        scope: 'company',
        status: 'confirmed',
        original_currency: currency,
        original_amount: originalAmount || amount,
        exchange_rate: exchangeRate,
        ...(mediaUrl && { media_url: mediaUrl })
    }

    // If project is selected, fetch details and add to insertData
    if (projectId && projectId !== 'none') {
        const { data: project } = await adminDb
            .from('companies')
            .select('name, company_kind')
            .eq('id', projectId)
            .single()

        if (project) {
            insertData.user_company_id = projectId
            insertData.user_company_name = project.name
            insertData.user_company_kind = project.company_kind
        }
    }

    const { error } = await adminDb
        .from('financial_transactions')
        .insert(insertData)

    if (error) {
        console.error('Error creating transaction:', error)
        return { error: error.message }
    }

    console.log('[Finance] Transaction created successfully:', insertData)
    revalidatePath(`/finance`)
    return { success: true }
}

export async function getUniqueCategories(companyId: string) {
    const supabase = await createClient()
    const { data } = await supabase
        .from('financial_transactions')
        .select('category')
        .eq('context_company_id', companyId)
        .order('category')

    if (!data) return []

    // Return unique categories
    return Array.from(new Set(data.map(d => d.category)))
}

export async function getDashboardChartsData(companyId: string, projectId?: string) {
    const supabase = await createClient()

    let query = supabase
        .from('financial_transactions')
        .select('*')
        .eq('context_company_id', companyId)
        .eq('status', 'confirmed')
        .order('date', { ascending: true })

    if (projectId && projectId !== 'all') {
        query = query.eq('user_company_id', projectId)
    }

    const { data: transactions, error } = await query

    if (error || !transactions) {
        console.error('Error fetching chart data:', error)
        return null
    }

    // 1. Cash Flow (Monthly Income vs Expense)
    const monthlyMap = new Map<string, { name: string, income: number, expense: number }>()

    // 2. Expenses by Category
    const categoryMap = new Map<string, number>()

    // 3. Project Income
    const projectMap = new Map<string, number>()

    // 4. Net Worth (Daily Running Balance)
    // For simplicity in the chart, we might want to aggregate by month or week if data is large,
    // but let's start with daily points for granular view.
    let runningBalance = 0
    const netWorthData: { date: string, value: number }[] = []

    transactions.forEach(t => {
        const amount = Number(t.amount)
        const date = t.date // YYYY-MM-DD
        const month = date.substring(0, 7) // YYYY-MM

        // Cash Flow
        if (!monthlyMap.has(month)) {
            monthlyMap.set(month, { name: month, income: 0, expense: 0 })
        }
        const monthEntry = monthlyMap.get(month)!

        if (t.transaction_type === 'income') {
            monthEntry.income += amount
            runningBalance += amount

            // Project Income
            const projectName = t.user_company_name || 'General'
            projectMap.set(projectName, (projectMap.get(projectName) || 0) + amount)

        } else if (t.transaction_type === 'expense') {
            monthEntry.expense += amount
            runningBalance -= amount

            // Category Expenses
            const cat = t.category || 'Uncategorized'
            categoryMap.set(cat, (categoryMap.get(cat) || 0) + amount)
        }

        // Net Worth (Last entry for the day overrides, or we push for every transaction? 
        // Better: Push unique dates with final balance for that day)
        // Since transactions are ordered by date, we can just update the balance.
        // To avoid multiple points per day, we'll process this after the loop or check standard.
    })

    // Process Net Worth per day
    // Re-loop to create time series? Or just use the calculated running balance?
    // Let's create a daily map for Net Worth to ensure one point per day
    let currentBalance = 0
    const netWorthMap = new Map<string, number>()

    transactions.forEach(t => {
        const amount = Number(t.amount)
        if (t.transaction_type === 'income') currentBalance += amount
        else currentBalance -= amount
        netWorthMap.set(t.date, currentBalance)
    })

    Array.from(netWorthMap.entries()).forEach(([date, value]) => {
        netWorthData.push({ date, value })
    })

    // Format Data for Charts
    const cashFlowData = Array.from(monthlyMap.values()).sort((a, b) => a.name.localeCompare(b.name))

    const categoryData = Array.from(categoryMap.entries())
        .map(([name, value]) => ({ name, value }))
        .sort((a, b) => b.value - a.value) // Highest expenses first

    const projectData = Array.from(projectMap.entries())
        .map(([name, value]) => ({ name, value }))
        .sort((a, b) => b.value - a.value)

    return {
        cashFlowData,
        categoryData,
        netWorthData,
        projectData
    }
}
