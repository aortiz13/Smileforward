"use client";

import { useState } from "react";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import { useRouter } from "next/navigation";

export default function UpdatePasswordPage() {
    const [loading, setLoading] = useState(false);
    const router = useRouter();

    async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
        e.preventDefault();
        const formData = new FormData(e.currentTarget);
        const password = formData.get("password") as string;
        const confirmPassword = formData.get("confirmPassword") as string;

        if (password !== confirmPassword) {
            toast.error("Las contraseñas no coinciden");
            return;
        }

        setLoading(true);

        try {
            const res = await fetch('/api/admin', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    action: 'update_password',
                    password,
                })
            });

            const result = await res.json();

            if (result.error) {
                toast.error(result.error);
            } else {
                toast.success("Contraseña actualizada correctamente");
                router.push("/administracion/dashboard");
            }
        } catch (err: any) {
            toast.error(err.message || "Error actualizando contraseña");
        } finally {
            setLoading(false);
        }
    }

    return (
        <div className="flex h-screen w-full items-center justify-center bg-gray-50 px-4">
            <div className="w-full max-w-md space-y-6 rounded-lg border bg-white p-6 shadow-sm">
                <div className="space-y-2 text-center">
                    <h1 className="text-2xl font-bold tracking-tight">Establecer Contraseña</h1>
                    <p className="text-sm text-gray-500">
                        Ingresa tu nueva contraseña para acceder a la cuenta.
                    </p>
                </div>
                <form onSubmit={handleSubmit} className="space-y-4">
                    <div className="space-y-2">
                        <Label htmlFor="password">Nueva Contraseña</Label>
                        <Input id="password" name="password" type="password" required />
                    </div>
                    <div className="space-y-2">
                        <Label htmlFor="confirmPassword">Confirmar Contraseña</Label>
                        <Input id="confirmPassword" name="confirmPassword" type="password" required />
                    </div>
                    <Button type="submit" className="w-full" disabled={loading}>
                        {loading ? "Actualizando..." : "Actualizar Contraseña"}
                    </Button>
                </form>
            </div>
        </div>
    );
}