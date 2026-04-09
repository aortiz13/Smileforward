// app/auth/confirm/page.tsx
// With NextAuth, email confirmation is not needed.
// This page redirects to the dashboard.
"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";

export default function AuthConfirmPage() {
    const router = useRouter();

    useEffect(() => {
        // With NextAuth, session is handled via cookies—no hash-based confirmation.
        // Redirect to dashboard or update-password.
        router.replace("/administracion/dashboard");
    }, [router]);

    return (
        <div className="flex h-screen items-center justify-center">
            <p className="text-muted-foreground">Verificando sesión...</p>
        </div>
    );
}