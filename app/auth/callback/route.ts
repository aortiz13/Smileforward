// app/auth/callback/route.ts
import { createServerClient } from "@supabase/ssr";
import { cookies } from "next/headers";
import { NextResponse } from "next/server";

export async function GET(request: Request) {
    const { searchParams } = new URL(request.url);
    const code = searchParams.get("code");
    const token_hash = searchParams.get("token_hash");
    const type = searchParams.get("type") as string | null;
    const next = searchParams.get("next") ?? "/administracion/dashboard";

    const host = request.headers.get("x-forwarded-host") || request.headers.get("host");
    const protocol = request.headers.get("x-forwarded-proto") || "https";
    const origin = `${protocol}://${host}`;

    const safeNext =
        next.startsWith("/") && !next.startsWith("//") ? next : "/administracion/dashboard";

    if (code || (token_hash && type)) {
        const cookieStore = await cookies();
        const supabase = createServerClient(
            process.env.NEXT_PUBLIC_SUPABASE_URL!,
            process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
            {
                cookies: {
                    getAll() { return cookieStore.getAll(); },
                    setAll(cookiesToSet) {
                        try {
                            cookiesToSet.forEach(({ name, value, options }) => {
                                cookieStore.set(name, value, options);
                            });
                        } catch { }
                    },
                },
            }
        );

        let error = null;

        if (code) {
            const { error: e } = await supabase.auth.exchangeCodeForSession(code);
            error = e;
        } else if (token_hash && type) {
            const { error: e } = await supabase.auth.verifyOtp({
                token_hash,
                type: type as any,
            });
            error = e;
        }

        if (!error) {
            return NextResponse.redirect(new URL(safeNext, origin).toString());
        }

        const loginUrl = new URL("/login", origin);
        loginUrl.searchParams.set("error", error.message);
        return NextResponse.redirect(loginUrl.toString());
    }

    // No llegaron parámetros de servidor → el token viene en el hash del fragmento
    // Redirigimos a la página cliente que sabe leerlo
    const confirmUrl = new URL("/auth/confirm", origin);
    confirmUrl.searchParams.set("next", safeNext);
    return NextResponse.redirect(confirmUrl.toString());
}