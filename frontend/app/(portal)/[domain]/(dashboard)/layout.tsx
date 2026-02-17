import { getCompanyByDomain } from '@/lib/data/companies'
import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation' // Change notFound to redirect
import { Sidebar } from '@/components/layout/sidebar'

export default async function DashboardLayout({
    children,
    params,
}: {
    children: React.ReactNode
    params: Promise<{ domain: string }>
}) {
    const { domain: rawDomain } = await params
    const domain = decodeURIComponent(rawDomain)
    const supabase = await createClient()

    // 1. Check Authentication FIRST
    const { data: { user } } = await supabase.auth.getUser()

    if (!user) {
        // If not authenticated, redirect to the login page WITHIN this domain
        redirect(`/${domain}/login`)
    }

    // 2. Fetch Company Data for Sidebar
    const company = await getCompanyByDomain(supabase, domain)
    // Note: Parent layout already checked company existence, but we need data here.
    // Ideally we'd use a shared data fetch or context, but fetching again is acceptable for MVP.
    // If parent failed, we wouldn't be here. So verify company exists just in case/for types.
    if (!company) {
        // Should effectively be unreachable if parent handles it correct, 
        // but good practice.
        return null
    }

    const branding = company?.frontend_config as any || {}
    const primaryColor = branding.primary_color || '#000000'

    return (
        <div className="flex h-screen overflow-hidden">
            <Sidebar
                domain={domain}
                companyName={company.name}
                logoUrl={branding.logo_url}
                primaryColor={primaryColor}
            />

            <div className="flex-1 flex flex-col min-w-0 overflow-hidden">
                {/* Mobile Header (Hidden on Desktop) */}
                <header className="md:hidden border-b p-4 bg-white flex justify-between items-center">
                    <span className="font-bold text-lg">{company.name}</span>
                    <button className="p-2 bg-gray-50 rounded-lg">
                        <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16m-7 6h7" />
                        </svg>
                    </button>
                </header>

                <main className="flex-1 overflow-y-auto relative">
                    {children}
                </main>
            </div>
        </div>
    )
}
