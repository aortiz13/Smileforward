"use client";

import { useState } from "react";
import { createClient } from "@/utils/supabase/client";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { Loader2, ArrowLeft } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from "@/components/ui/card";

export default function SignupPage() {
    const [email, setEmail] = useState("");
    const [password, setPassword] = useState("");
    const [loading, setLoading] = useState(false);
    const router = useRouter();
    const supabase = createClient();

    const handleSignup = async (e: React.FormEvent) => {
        e.preventDefault();
        setLoading(true);

        try {
            const { data, error } = await supabase.auth.signUp({
                email,
                password,
                options: {
                    emailRedirectTo: `${location.origin}/auth/callback`,
                },
            });

            if (error) {
                throw error;
            }

            if (data.session) {
                toast.success("¡Cuenta creada exitosamente!");
                router.push("/administracion/dashboard");
            } else {
                // Email confirmation might be required
                toast.success("¡Cuenta creada! Por favor revisa tu correo para confirmar.");
                router.push("/login");
            }

        } catch (error: any) {
            console.error(error);
            toast.error(error.message || "Error al registrarse");
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="min-h-screen flex items-center justify-center bg-muted/20 p-4">
            <Card className="w-full max-w-md shadow-lg border-border/50">
                <CardHeader className="space-y-1">
                    <Link href="/login" className="text-sm text-muted-foreground flex items-center gap-1 hover:text-primary mb-2 transition-colors">
                        <ArrowLeft className="w-4 h-4" /> Volver al Login
                    </Link>
                    <CardTitle className="text-2xl font-bold text-center">Registro Admin</CardTitle>
                    <CardDescription className="text-center">
                        Crea una nueva cuenta de administrador
                    </CardDescription>
                </CardHeader>
                <CardContent>
                    <CardContent>
                        <div className="text-center py-6">
                            <p className="text-muted-foreground">
                                El registro de nuevas cuentas está deshabilitado.
                                <br />
                                Solo los administradores pueden enviar invitaciones.
                            </p>
                            <Button asChild className="mt-6 w-full">
                                <Link href="/login">Ir al Login</Link>
                            </Button>
                        </div>
                    </CardContent>
                </CardContent>
            </Card>
        </div>
    );
}
