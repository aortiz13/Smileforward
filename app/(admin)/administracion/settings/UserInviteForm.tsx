"use client";

import { useActionState } from "react";
import { inviteUser } from "./actions"; // ensure actions.ts is in same dir
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from "@/components/ui/select";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { toast } from "sonner";
import { useEffect } from "react";

const initialState = {
    message: "",
    error: "",
    success: false,
};

export function UserInviteForm() {
    // @ts-ignore - useActionState types can be tricky with server actions sometimes
    const [state, formAction, pending] = useActionState(async (prevState: any, formData: FormData) => {
        const result = await inviteUser(formData);
        if (result.error) {
            return { error: result.error, success: false };
        }
        return { message: result.message, success: true };
    }, initialState);

    useEffect(() => {
        if (state.success && state.message) {
            toast.success(state.message);
        }
        if (state.error) {
            toast.error(state.error);
        }
    }, [state]);

    return (
        <Card>
            <CardHeader>
                <CardTitle>Invitar Usuario</CardTitle>
                <CardDescription>
                    Envía una invitación por correo electrónico para acceder al panel.
                </CardDescription>
            </CardHeader>
            <CardContent>
                <form action={formAction} className="space-y-4">
                    <div className="space-y-2">
                        <Label htmlFor="email">Correo Electrónico</Label>
                        <Input
                            id="email"
                            name="email"
                            type="email"
                            placeholder="usuario@ejemplo.com"
                            required
                        />
                    </div>
                    <div className="space-y-2">
                        <Label htmlFor="role">Rol</Label>
                        <Select name="role" defaultValue="basic" required>
                            <SelectTrigger>
                                <SelectValue placeholder="Seleccionar rol" />
                            </SelectTrigger>
                            <SelectContent>
                                <SelectItem value="basic">Básico (Leads + Generar)</SelectItem>
                                <SelectItem value="admin">Administrador (Acceso Total)</SelectItem>
                            </SelectContent>
                        </Select>
                    </div>
                    <Button type="submit" disabled={pending}>
                        {pending ? "Enviando..." : "Enviar Invitación"}
                    </Button>
                </form>
            </CardContent>
        </Card>
    );
}
