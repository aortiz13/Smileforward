import { getDashboardMetrics } from '@/lib/actions/admin-dashboard'

export default async function AdminDashboard() {
    const metrics = await getDashboardMetrics()

    return (
        <div className="p-8">
            <h1 className="text-2xl font-bold">Admin Dashboard</h1>
            <p className="mt-4 text-gray-600">Welcome to the Blukastor administration panel.</p>

            <div className="mt-8 grid grid-cols-1 gap-6 md:grid-cols-3">
                <div className="rounded-xl border bg-white p-6 shadow-sm">
                    <h3 className="font-semibold text-gray-900">Companies</h3>
                    <p className="mt-2 text-3xl font-bold">{metrics.companyCount}</p>
                </div>
                <div className="rounded-xl border bg-white p-6 shadow-sm">
                    <h3 className="font-semibold text-gray-900">Active Portals</h3>
                    <p className="mt-2 text-3xl font-bold">{metrics.activePortalCount}</p>
                </div>
                <div className="rounded-xl border bg-white p-6 shadow-sm">
                    <h3 className="font-semibold text-gray-900">Total Users</h3>
                    <p className="text-sm text-gray-500 mb-1">Assigned to projects</p>
                    <p className="text-3xl font-bold">{metrics.userCount}</p>
                </div>
            </div>
        </div>
    )
}
