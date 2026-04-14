"use client";

import Link from "next/link";
import { LayoutDashboard, Users, Settings, LogOut, Menu, KeyRound } from "lucide-react";
import { signOut } from "next-auth/react";
import { useRouter, usePathname } from "next/navigation";
import { toast } from "sonner";
import { Sheet, SheetContent, SheetTrigger } from "@/components/ui/sheet";
import { Button } from "@/components/ui/button";
import { useState, useEffect } from "react";

export default function AdminLayout({
    children,
}: {
    children: React.ReactNode;
}) {
    const router = useRouter();
    const pathname = usePathname();
    const [open, setOpen] = useState(false);
    const [role, setRole] = useState<'admin' | 'basic' | null>(null);

    useEffect(() => {
        const fetchRole = async () => {
            try {
                const sessionRes = await fetch('/api/auth/session');
                const session = await sessionRes.json();
                if (session?.user?.role) {
                    setRole(session.user.role as 'admin' | 'basic');
                }
            } catch (err) {
                console.error('Error fetching role:', err);
            }
        };
        fetchRole();
    }, []);

    const handleLogout = async () => {
        try {
            await signOut({ redirect: false });
            router.push("/login");
            router.refresh();
        } catch {
            toast.error("Error al cerrar sesión");
        }
    };

    const NavContent = () => (
        <div className="flex flex-col h-full bg-card">
            <div className="p-6 border-b border-border">
                <h1 className="font-heading text-xl font-bold text-primary">Smile Forward</h1>
                <p className="text-xs text-muted-foreground">Admin Console</p>
            </div>

            <nav className="flex-1 p-4 space-y-2">
                {/* Dashboard: Admin and Basic */}
                {(role === 'admin' || role === 'basic') && (
                    <Link
                        href="/administracion/dashboard"
                        onClick={() => setOpen(false)}
                        className={`flex items-center gap-3 p-3 rounded-lg transition-colors ${pathname === '/administracion/dashboard' ? 'bg-secondary text-primary font-medium' : 'hover:bg-secondary/50 text-foreground'}`}
                    >
                        <LayoutDashboard size={20} strokeWidth={1.5} />
                        <span>Dashboard</span>
                    </Link>
                )}

                {/* Leads: Admin and Basic */}
                <Link
                    href="/administracion/leads"
                    onClick={() => setOpen(false)}
                    className={`flex items-center gap-3 p-3 rounded-lg transition-colors ${pathname === '/administracion/leads' ? 'bg-secondary text-primary font-medium' : 'hover:bg-secondary/50 text-foreground'}`}
                >
                    <Users size={20} strokeWidth={1.5} />
                    <span>Leads</span>
                </Link>

                {/* Settings: Admin Only */}
                {role === 'admin' && (
                    <Link
                        href="/administracion/settings"
                        onClick={() => setOpen(false)}
                        className={`flex items-center gap-3 p-3 rounded-lg transition-colors ${pathname === '/administracion/settings' ? 'bg-secondary text-primary font-medium' : 'hover:bg-secondary/50 text-foreground'}`}
                    >
                        <Settings size={20} strokeWidth={1.5} />
                        <span>Configuración</span>
                    </Link>
                )}

                {/* Change Password: All roles */}
                <Link
                    href="/administracion/update-password"
                    onClick={() => setOpen(false)}
                    className={`flex items-center gap-3 p-3 rounded-lg transition-colors ${pathname === '/administracion/update-password' ? 'bg-secondary text-primary font-medium' : 'hover:bg-secondary/50 text-foreground'}`}
                >
                    <KeyRound size={20} strokeWidth={1.5} />
                    <span>Cambiar Contraseña</span>
                </Link>
            </nav>

            <div className="p-4 border-t border-border">
                <button
                    onClick={handleLogout}
                    className="flex items-center gap-3 p-3 rounded-lg hover:bg-destructive/10 text-destructive w-full transition-colors font-medium"
                >
                    <LogOut size={20} strokeWidth={1.5} />
                    <span>Cerrar Sesión</span>
                </button>
            </div>
        </div>
    );

    const isAuthFlow = pathname === '/administracion/update-password';

    if (isAuthFlow) {
        return (
            <div className="h-screen overflow-hidden bg-muted/20 flex flex-col">
                <main className="flex-1 overflow-y-auto w-full">
                    {children}
                </main>
            </div>
        );
    }

    return (
        <div className="h-screen overflow-hidden bg-muted/20 flex flex-col md:flex-row">
            {/* Mobile Header */}
            <div className="md:hidden p-4 bg-card border-b border-border flex items-center justify-between">
                <div className="flex items-center gap-2">
                    <h1 className="font-heading font-bold text-primary">Smile Forward</h1>
                </div>
                <Sheet open={open} onOpenChange={setOpen}>
                    <SheetTrigger asChild>
                        <Button variant="ghost" size="icon">
                            <Menu className="h-6 w-6" />
                        </Button>
                    </SheetTrigger>
                    <SheetContent side="left" className="p-0 w-64 border-r border-border">
                        <NavContent />
                    </SheetContent>
                </Sheet>
            </div>

            {/* Desktop Sidebar */}
            <aside className="hidden md:flex w-64 border-r border-border flex-col h-full bg-card">
                <NavContent />
            </aside>

            {/* Main Content */}
            <main className="flex-1 overflow-y-auto w-full">
                {children}
            </main>
        </div>
    );
}
