import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import { AdminSidebar } from '@/components/layout/admin-sidebar'

export default async function AdminLayout({
    children,
}: {
    children: React.ReactNode
}) {
    const supabase = await createClient()

    const {
        data: { user },
    } = await supabase.auth.getUser()

    if (!user) {
        redirect('/login')
    }

    // Check for admin role in wa.admins
    const { data: admin, error } = await supabase
        .from('admin_profiles')
        .select('*')
        .eq('auth_user_id', user.id)
        .single()

    if (error || !admin) {
        console.error('Non-admin user tried to access admin portal:', user.email)
        return (
            <div className="flex h-screen flex-col items-center justify-center space-y-4 bg-gray-50 text-gray-900 font-sans">
                <div className="w-16 h-16 bg-red-100 text-red-600 rounded-full flex items-center justify-center">
                    <svg width="24" height="24" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24"><path d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" /></svg>
                </div>
                <h1 className="text-2xl font-bold">Acceso Denegado</h1>
                <p className="max-w-md text-center text-gray-600">
                    Tu usuario <code className="bg-gray-200 px-1 py-0.5 rounded text-sm">{user.email}</code> no tiene permisos de administrador.
                </p>
                {error && (
                    <div className="mt-2 p-3 bg-gray-100 rounded-lg text-[10px] font-mono text-gray-500 text-left w-full max-w-sm">
                        <p>Error Code: {error.code}</p>
                        <p>Message: {error.message}</p>
                        <p>User ID: {user.id}</p>
                    </div>
                )}
                <a href="/" className="text-sm font-bold text-black underline underline-offset-4">
                    Volver al Inicio
                </a>
            </div>
        )
    }

    return (
        <div className="flex h-screen bg-gray-50 overflow-hidden">
            <AdminSidebar />
            <main className="flex-1 overflow-y-auto relative focus:outline-none">
                <div className="py-6">
                    <div className="max-w-7xl mx-auto px-4 sm:px-6 md:px-8">
                        {children}
                    </div>
                </div>
            </main>
        </div>
    )
}
