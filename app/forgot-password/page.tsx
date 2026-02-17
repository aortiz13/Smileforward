"use client";

import { useState } from "react";
import { createClient } from "@/utils/supabase/client";
import Link from "next/link";
import { Loader2, ArrowLeft, Mail } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from "@/components/ui/card";

export default function ForgotPasswordPage() {
    const [email, setEmail] = useState("");
    const [loading, setLoading] = useState(false);
    const [submitted, setSubmitted] = useState(false);
    const supabase = createClient();

    const handleReset = async (e: React.FormEvent) => {
        e.preventDefault();
        setLoading(true);

        try {
            const { error } = await supabase.auth.resetPasswordForEmail(email, {
                redirectTo: `${location.origin}/auth/callback?next=/administracion/update-password`,
            });

            if (error) {
                throw error;
            }

            setSubmitted(true);
            toast.success("Correo de recuperación enviado.");
        } catch (error: any) {
            console.error(error);
            toast.error(error.message || "Error al enviar correo");
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
                    <CardTitle className="text-2xl font-bold text-center">Recuperar Acceso</CardTitle>
                    <CardDescription className="text-center">
                        Te enviaremos un enlace para restablecer tu contraseña
                    </CardDescription>
                </CardHeader>
                <CardContent>
                    {submitted ? (
                        <div className="text-center py-8 space-y-4">
                            <div className="bg-primary/10 w-16 h-16 rounded-full flex items-center justify-center mx-auto text-primary">
                                <Mail className="w-8 h-8" />
                            </div>
                            <div>
                                <h3 className="text-lg font-bold">¡Correo enviado!</h3>
                                <p className="text-muted-foreground mt-2">Revisa tu bandeja de entrada en <strong>{email}</strong> y sigue las instrucciones.</p>
                            </div>
                            <Button variant="outline" className="w-full" onClick={() => setSubmitted(false)}>Intentar con otro correo</Button>
                        </div>
                    ) : (
                        <form onSubmit={handleReset} className="space-y-4">
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
                            <Button type="submit" className="w-full h-11 font-bold" disabled={loading}>
                                {loading ? (
                                    <>
                                        <Loader2 className="mr-2 h-4 w-4 animate-spin" /> Enviando...
                                    </>
                                ) : (
                                    "Enviar Enlace"
                                )}
                            </Button>
                        </form>
                    )}
                </CardContent>
            </Card>
        </div>
    );
}
