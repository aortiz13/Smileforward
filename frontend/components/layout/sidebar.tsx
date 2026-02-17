'use client'

import { useState } from 'react'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import {
    LayoutDashboard,
    MessageSquare,
    User,
    Settings,
    LogOut,
    ChevronRight,
    Search,
    DollarSign
} from 'lucide-react'
import { cn } from '@/lib/utils'

interface SidebarProps {
    domain: string
    companyName: string
    logoUrl?: string
    primaryColor?: string
}

export function Sidebar({ domain, companyName, logoUrl, primaryColor }: SidebarProps) {
    const pathname = usePathname()
    const router = useRouter()
    const supabase = createClient()
    const [isCollapsed, setIsCollapsed] = useState(false)

    const handleSignOut = async () => {
        await supabase.auth.signOut()
        router.push('/login')
    }

    const navItems = [
        { label: 'Dashboard', icon: LayoutDashboard, href: `/` },
        { label: 'Nova Chat', icon: MessageSquare, href: `/chat` },
        { label: 'Finanzas', icon: DollarSign, href: `/finance` },
        { label: 'Contenido', icon: ChevronRight, href: `/content` }, // Placeholder for extra nav
    ]

    const bottomItems = [
        { label: 'Mi Perfil', icon: User, href: `/profile` },
        { label: 'Ajustes', icon: Settings, href: `/settings` },
    ]

    return (
        <aside
            className={cn(
                "flex flex-col h-full bg-white border-r border-gray-100 shadow-sm z-20 transition-all duration-300 ease-in-out relative",
                isCollapsed ? "w-20" : "w-64"
            )}
        >
            {/* Toggle Button */}
            <button
                onClick={() => setIsCollapsed(!isCollapsed)}
                className="absolute -right-3 top-9 bg-white border border-gray-200 rounded-full p-1 text-gray-400 hover:text-gray-600 shadow-sm z-50 transform transition-transform duration-300"
                style={{ transform: isCollapsed ? 'rotate(180deg)' : 'rotate(0deg)' }}
            >
                <ChevronRight size={14} />
            </button>

            {/* Header / Logo */}
            <div className={cn("p-6 flex items-center", isCollapsed ? "justify-center px-2" : "gap-3")}>
                <Link href={`/`} className={cn("flex items-center group", isCollapsed ? "justify-center" : "gap-3")}>
                    <div className="w-10 h-10 rounded-xl bg-gray-50 flex items-center justify-center overflow-hidden border border-gray-100 transition-all group-hover:scale-105 shrink-0">
                        {logoUrl ? (
                            <img src={logoUrl} alt={companyName} className="w-full h-full object-contain" />
                        ) : (
                            <div className="w-full h-full bg-primary flex items-center justify-center text-white font-bold text-xl">
                                {companyName.charAt(0)}
                            </div>
                        )}
                    </div>
                    {!isCollapsed && (
                        <div className="flex flex-col overflow-hidden">
                            <span className="font-bold text-gray-900 leading-tight truncate max-w-[140px]">
                                {companyName}
                            </span>
                            <span className="text-[10px] text-gray-400 font-medium tracking-wider uppercase whitespace-nowrap">
                                Blukastor Portal
                            </span>
                        </div>
                    )}
                </Link>
            </div>

            {/* Navigation */}
            <nav className="flex-1 px-4 space-y-1 mt-4 text-center">
                {!isCollapsed && (
                    <div className="text-[10px] font-bold text-gray-400 uppercase tracking-widest mb-4 px-2 text-left">
                        Navegación
                    </div>
                )}
                {navItems.map((item) => {
                    const isActive = pathname === item.href
                    return (
                        <Link
                            key={item.href}
                            href={item.href}
                            className={cn(
                                "flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium transition-all group relative",
                                isActive
                                    ? "bg-gray-900 text-white shadow-md shadow-gray-200"
                                    : "text-gray-500 hover:bg-gray-50 hover:text-gray-900",
                                isCollapsed && "justify-center px-0 py-3"
                            )}
                            title={isCollapsed ? item.label : undefined}
                        >
                            <item.icon size={20} className={cn(isActive ? "text-white" : "text-gray-400 group-hover:text-gray-600")} />
                            {!isCollapsed && <span>{item.label}</span>}
                        </Link>
                    )
                })}
            </nav>

            {/* Bottom Section */}
            <div className="px-4 pb-6 space-y-1">
                <div className="h-px bg-gray-100 mx-2 mb-4" />
                {bottomItems.map((item) => {
                    const isActive = pathname === item.href
                    return (
                        <Link
                            key={item.href}
                            href={item.href}
                            className={cn(
                                "flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium transition-all",
                                isActive
                                    ? "bg-gray-100 text-gray-900"
                                    : "text-gray-500 hover:bg-gray-50 hover:text-gray-900",
                                isCollapsed && "justify-center px-0 py-3"
                            )}
                            title={isCollapsed ? item.label : undefined}
                        >
                            <item.icon size={20} className="text-gray-400" />
                            {!isCollapsed && <span>{item.label}</span>}
                        </Link>
                    )
                })}
                <button
                    onClick={handleSignOut}
                    className={cn(
                        "w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium text-red-500 hover:bg-red-50 transition-all mt-2 text-left",
                        isCollapsed && "justify-center px-0 py-3"
                    )}
                    title={isCollapsed ? "Cerrar Sesión" : undefined}
                >
                    <LogOut size={20} />
                    {!isCollapsed && <span>Cerrar Sesión</span>}
                </button>
            </div>
        </aside>
    )
}
