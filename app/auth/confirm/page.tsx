// app/auth/confirm/page.tsx
"use client";

import { useEffect } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { createClient } from "@/utils/supabase/client";

export default function AuthConfirmPage() {
    const router = useRouter();
    const searchParams = useSearchParams();

    useEffect(() => {
        const supabase = createClient();

        // Supabase SSR escucha automáticamente el hash y establece la sesión
        const { data: { subscription } } = supabase.auth.onAuthStateChange(
            async (event, session) => {
                if (event === "SIGNED_IN" || event === "PASSWORD_RECOVERY") {
                    const next = searchParams.get("next") || "/administracion/update-password";
                    router.replace(next);
                } else if (event === "USER_UPDATED") {
                    router.replace("/administracion/dashboard");
                }
            }
        );

        return () => subscription.unsubscribe();
    }, [router, searchParams]);

    return (
        <div className="flex h-screen items-center justify-center">
            <p className="text-muted-foreground">Verificando sesión...</p>
        </div>
    );
}