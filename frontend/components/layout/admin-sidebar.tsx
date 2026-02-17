'use client'

import Link from 'next/link'
import { usePathname, useRouter } from 'next/navigation'
import {
    LayoutDashboard,
    Building2,
    Users,
    FileText,
    History,
    ShieldAlert,
    LifeBuoy,
    CreditCard,
    TrendingUp,
    Settings,
    LogOut,
    Menu,
    X,
    MessageSquare
} from 'lucide-react'
import { useState, useEffect } from 'react'
import { cn } from '@/lib/utils'
import { createClient } from '@/lib/supabase/client'

const adminNavigation = [
    { name: 'Dashboard', href: '/admin/dashboard', icon: LayoutDashboard },
    { name: 'Empresas', href: '/admin/companies', icon: Building2 },
    { name: 'Usuarios', href: '/admin/users', icon: Users },
    { name: 'Cumplimiento (T&C)', href: '/admin/compliance', icon: FileText },
    { name: 'Escalamiento Manual', href: '/admin/escalation', icon: ShieldAlert },
    { name: 'Membresías', href: '/admin/memberships', icon: CreditCard },
    { name: 'Auditoría de IA', href: '/admin/agent-audit', icon: History },
    { name: 'Finanzas Globales', href: '/admin/finance', icon: TrendingUp },
]

export function AdminSidebar() {
    const pathname = usePathname()
    const router = useRouter()
    const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false)
    const [mounted, setMounted] = useState(false)
    const supabase = createClient()

    // Prevent hydration mismatch by only showing active state after mount
    useEffect(() => {
        setMounted(true)
    }, [])

    const handleSignOut = async () => {
        await supabase.auth.signOut()
        router.push('/login')
    }

    return (
        <>
            {/* Mobile Header */}
            <header className="lg:hidden h-16 border-b bg-white flex items-center justify-between px-4 sticky top-0 z-50">
                <div className="flex items-center gap-2">
                    <div className="w-8 h-8 bg-black rounded-lg flex items-center justify-center">
                        <span className="text-white font-bold text-lg">B</span>
                    </div>
                    <span className="font-bold text-xl tracking-tight">Blukastor <span className="text-gray-400 font-normal">Admin</span></span>
                </div>
                <button
                    onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
                    className="p-2 text-gray-600 hover:bg-gray-100 rounded-lg transition-colors"
                >
                    {isMobileMenuOpen ? <X size={24} /> : <Menu size={24} />}
                </button>
            </header>

            {/* Main Sidebar */}
            <aside className={cn(
                "fixed inset-y-0 left-0 z-40 w-72 bg-white border-r transform transition-transform duration-300 ease-in-out lg:relative lg:translate-x-0 flex flex-col h-full",
                isMobileMenuOpen ? "translate-x-0" : "-translate-x-full"
            )}>
                {/* Desktop Branding */}
                <div className="hidden lg:flex flex-col p-8 pb-4">
                    <div className="flex items-center gap-3">
                        <div className="w-10 h-10 bg-black rounded-xl flex items-center justify-center shadow-lg shadow-black/10">
                            <span className="text-white font-bold text-xl">B</span>
                        </div>
                        <div className="flex flex-col">
                            <span className="font-bold text-xl tracking-tight leading-none">Blukastor</span>
                            <span className="text-gray-400 text-xs mt-1 uppercase tracking-widest font-semibold">Sistema Admin</span>
                        </div>
                    </div>
                </div>

                {/* Navigation Links */}
                <nav className="flex-1 px-4 mt-6 space-y-1 overflow-y-auto custom-scrollbar">
                    {adminNavigation.map((item) => {
                        const isActive = mounted && pathname === item.href
                        return (
                            <Link
                                key={item.name}
                                href={item.href}
                                className={cn(
                                    "flex items-center gap-3 px-4 py-3 rounded-xl transition-all duration-200 group",
                                    isActive
                                        ? "bg-black text-white shadow-lg shadow-black/10"
                                        : "text-gray-600 hover:bg-gray-50 hover:text-black"
                                )}
                                onClick={() => setIsMobileMenuOpen(false)}
                            >
                                <item.icon size={20} className={cn(
                                    "transition-colors",
                                    isActive ? "text-white" : "text-gray-400 group-hover:text-black"
                                )} />
                                <span className="font-medium text-sm">{item.name}</span>
                                {isActive && (
                                    <div className="ml-auto w-1.5 h-1.5 rounded-full bg-white opacity-50" />
                                )}
                            </Link>
                        )
                    })}
                </nav>

                {/* Footer Section */}
                <div className="p-4 mt-auto">
                    <div className="p-4 bg-gray-50 rounded-2xl border border-gray-100">
                        <button
                            onClick={handleSignOut}
                            className="flex items-center gap-3 w-full px-4 py-3 text-red-600 hover:bg-red-50 rounded-xl transition-all duration-200 group"
                        >
                            <LogOut size={20} className="group-hover:translate-x-1 transition-transform" />
                            <span className="font-bold text-sm">Cerrar Sesión</span>
                        </button>
                    </div>
                </div>
            </aside>

            {/* Mobile Overlay */}
            {isMobileMenuOpen && (
                <div
                    className="fixed inset-0 bg-black/20 backdrop-blur-sm z-30 lg:hidden"
                    onClick={() => setIsMobileMenuOpen(false)}
                />
            )}
        </>
    )
}
