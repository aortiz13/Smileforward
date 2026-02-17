// Note: We need to create this component or remove it, sticking to simple UI for now.

export default async function PortalDashboard({ params }: { params: Promise<{ domain: string }> }) {
    const { domain: rawDomain } = await params
    const domain = decodeURIComponent(rawDomain)

    return (
        <div className="flex-1 space-y-4 p-8 pt-6">
            <div className="flex items-center justify-between space-y-2">
                <h2 className="text-3xl font-bold tracking-tight">Dashboard</h2>
                <div className="flex items-center space-x-2">
                    {/* Date Picker Placeholder */}
                    <button className="border p-2 rounded">Jan 20, 2026 - Feb 09, 2026</button>
                    <button className="bg-black text-white px-4 py-2 rounded">Download</button>
                </div>
            </div>
            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
                {['Total Revenue', 'Expenses', 'Net Income', 'Active Projects'].map((title) => (
                    <div key={title} className="rounded-xl border bg-card text-card-foreground shadow-sm p-6">
                        <div className="flex flex-row items-center justify-between space-y-0 pb-2">
                            <h3 className="tracking-tight text-sm font-medium">{title}</h3>
                        </div>
                        <div className="text-2xl font-bold">$45,231.89</div>
                        <p className="text-xs text-muted-foreground">+20.1% from last month</p>
                    </div>
                ))}
            </div>
            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-7">
                <div className="col-span-4 rounded-xl border bg-card text-card-foreground shadow-sm p-6">
                    <h3 className="font-semibold mb-4">Cashflow Overview</h3>
                    <div className="h-[200px] w-full bg-gray-100 rounded flex items-center justify-center text-gray-400">
                        Chart Placeholder
                    </div>
                </div>
                <div className="col-span-3 rounded-xl border bg-card text-card-foreground shadow-sm p-6">
                    <h3 className="font-semibold mb-4">Recent Transactions</h3>
                    <div className="space-y-4">
                        {[1, 2, 3].map(i => (
                            <div key={i} className="flex items-center justify-between">
                                <div className="flex flex-col">
                                    <span className="font-medium">Client Payment</span>
                                    <span className="text-xs text-gray-500">Subscription</span>
                                </div>
                                <div className="font-bold">+$1,999.00</div>
                            </div>
                        ))}
                    </div>
                </div>
            </div>
        </div>
    )
}
