"use client";

import Link from "next/link";
import { LayoutDashboard, Users, Settings, LogOut, Menu } from "lucide-react";
import { createClient } from "@/utils/supabase/client";
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
    const supabase = createClient();
    const [open, setOpen] = useState(false);
    const [role, setRole] = useState<'admin' | 'basic' | null>(null);

    useEffect(() => {
        const fetchRole = async () => {
            const { data: { user } } = await supabase.auth.getUser();
            if (user) {
                const { data } = await supabase
                    .from('user_roles')
                    .select('role')
                    .eq('user_id', user.id)
                    .single();
                setRole(data?.role as 'admin' | 'basic' | null);
            }
        };
        fetchRole();
    }, []);

    const handleLogout = async () => {
        const { error } = await supabase.auth.signOut();
        if (error) {
            toast.error("Error al cerrar sesión");
        } else {
            router.push("/login");
            router.refresh();
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
