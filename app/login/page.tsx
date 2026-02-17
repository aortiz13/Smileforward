"use client";

import { useState } from "react";
import { createClient } from "@/utils/supabase/client";
import { useRouter } from "next/navigation";
import { useEffect } from "react";
import Link from "next/link";
import { Loader2, ArrowLeft } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from "@/components/ui/card";
import { login } from "./actions";

export default function LoginPage() {
    const [email, setEmail] = useState("");
    const [password, setPassword] = useState("");
    const [loading, setLoading] = useState(false);
    const router = useRouter();
    const supabase = createClient();

    // Auto-redirect if already logged in (handles fragment cases)
    useEffect(() => {
        const handleRedirect = (session: any, event?: string) => {
            if (!session) return;

            console.log(`[LoginPage] Session detected (Event: ${event}), handling redirect...`);
            const hash = typeof window !== 'undefined' ? window.location.hash : '';
            const searchParams = typeof window !== 'undefined' ? new URLSearchParams(window.location.search) : new URLSearchParams();
            const nextParam = searchParams.get("next");

            console.log("[LoginPage] Context:", { hash, nextParam, event });

            // If we came from an invite/recovery, we want to go specifically to update-password
            const isRecoveryFlow = event === 'PASSWORD_RECOVERY' ||
                hash.includes('type=recovery') ||
                hash.includes('type=invite') ||
                hash.includes('type=signup') ||
                nextParam?.includes('update-password');

            if (isRecoveryFlow) {
                console.log("[LoginPage] Auth flow detected, enforcing password update route");
                window.location.href = "/administracion/update-password";
            } else if (nextParam) {
                console.log("[LoginPage] Next param detected:", nextParam);
                window.location.href = nextParam;
            } else {
                console.log("[LoginPage] Default redirect to dashboard");
                window.location.href = "/administracion/dashboard";
            }
        };

        const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
            console.log("[LoginPage] Auth state change event:", event, !!session);
            if (session && (event === 'SIGNED_IN' || event === 'INITIAL_SESSION' || event === 'PASSWORD_RECOVERY' || event === 'USER_UPDATED')) {
                handleRedirect(session, event);
            }
        });

        // Also check immediately on mount
        supabase.auth.getSession().then(({ data: { session } }) => {
            console.log("[LoginPage] Initial session check:", !!session);
            if (session) handleRedirect(session, 'INITIAL_SESSION');
        });

        return () => subscription.unsubscribe();
    }, [supabase]);

    const handleLogin = async (e: React.FormEvent) => {
        e.preventDefault();
        setLoading(true);

        const formData = new FormData();
        formData.append("email", email);
        formData.append("password", password);

        try {
            const result = await login(formData);

            if (result?.error) {
                toast.error(result.error);
            }
            // If success, the server action redirects automatically
        } catch (error: any) {
            // Next.js redirect throws an error, we should catch it if we want to handle other errors
            if (error.message === 'NEXT_REDIRECT') {
                throw error;
            }
            console.error("[LoginPage] Catch block error:", error);
            toast.error(error.message || "Error al iniciar sesión");
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="min-h-screen flex items-center justify-center bg-muted/20 p-4">
            <Card className="w-full max-w-md shadow-lg border-border/50">
                <CardHeader className="space-y-1">
                    <Link href="/" className="text-sm text-muted-foreground flex items-center gap-1 hover:text-primary mb-2 transition-colors">
                        <ArrowLeft className="w-4 h-4" /> Volver al Inicio
                    </Link>
                    <CardTitle className="text-2xl font-bold text-center">Admin Login</CardTitle>
                    <CardDescription className="text-center">
                        Ingresa tus credenciales para acceder al panel
                    </CardDescription>
                </CardHeader>
                <CardContent>
                    <form onSubmit={handleLogin} className="space-y-4">
                        <div className="space-y-2">
                            <Label htmlFor="email">Correo Electrónico</Label>
                            <Input
                                id="email"
                                type="email"
                                placeholder="nombre@ejemplo.com"
                                value={email}
                                onChange={(e) => setEmail(e.target.value)}
                                required
                                className="h-11"
                            />
                        </div>
                        <div className="space-y-2">
                            <div className="flex items-center justify-between">
                                <Label htmlFor="password">Contraseña</Label>
                                <Link
                                    href="/forgot-password"
                                    className="text-xs text-primary hover:underline font-medium"
                                >
                                    ¿Olvidaste tu contraseña?
                                </Link>
                            </div>
                            <Input
                                id="password"
                                type="password"
                                value={password}
                                onChange={(e) => setPassword(e.target.value)}
                                required
                                className="h-11"
                            />
                        </div>
                        <Button type="submit" className="w-full h-11 font-bold" disabled={loading}>
                            {loading ? (
                                <>
                                    <Loader2 className="mr-2 h-4 w-4 animate-spin" /> Entrando...
                                </>
                            ) : (
                                "Iniciar Sesión"
                            )}
                        </Button>
                    </form>
                </CardContent>
                <CardFooter className="flex justify-center text-sm text-muted-foreground gap-1">
                    {/* Public registration disabled */}
                </CardFooter>
            </Card>
        </div>
    );
}
