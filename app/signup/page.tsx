"use client";

import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";

export default function SignupPage() {
    // Public signup is disabled — users are invited by admins
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
            </Card>
        </div>
    );
}
