import { createServerClient } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";

export async function middleware(request: NextRequest) {
    let response = NextResponse.next({
        request: {
            headers: request.headers,
        },
    });

    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || process.env.SUPABASE_URL;
    const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || process.env.SUPABASE_ANON_KEY;

    if (!supabaseUrl || !supabaseKey) {
        console.error("Middleware Supabase Init Failed: Missing URL or Key");
        console.error("URL Found:", !!supabaseUrl);
        console.error("Key Found:", !!supabaseKey);
    }

    const supabase = createServerClient(
        supabaseUrl!,
        supabaseKey!,
        {
            cookies: {
                getAll() {
                    return request.cookies.getAll();
                },
                setAll(cookiesToSet) {
                    cookiesToSet.forEach(({ name, value, options }) =>
                        request.cookies.set(name, value)
                    );
                    response = NextResponse.next({
                        request,
                    });
                    cookiesToSet.forEach(({ name, value, options }) =>
                        response.cookies.set(name, value, options)
                    );
                },
            },
        }
    );

    const {
        data: { user },
    } = await supabase.auth.getUser();


    // ─── Bloquear signup público ───
    if (request.nextUrl.pathname.startsWith("/signup")) {
        const url = request.nextUrl.clone();
        url.pathname = "/login";
        return NextResponse.redirect(url);
    }

    // ─── Si ya está logueado y va a /login, redirigir al dashboard ───
    if (request.nextUrl.pathname.startsWith("/login") && user) {
        console.log("[Middleware] Authenticated user on /login, redirecting to target...");
        const next = request.nextUrl.searchParams.get("next") || "/administracion/dashboard";
        const url = request.nextUrl.clone();
        url.pathname = next;
        return NextResponse.redirect(url);
    }

    // ─── Rutas protegidas: requieren autenticación ───
    const isUpdatePassword = request.nextUrl.pathname === "/administracion/update-password";
    if (request.nextUrl.pathname.startsWith("/administracion") && !user) {
        if (isUpdatePassword) {
            return response;
        }
        console.log("[Middleware] Unauthenticated access to protected route:", request.nextUrl.pathname, "Redirecting to /login");
        const url = request.nextUrl.clone();
        url.pathname = "/login";
        return NextResponse.redirect(url);
    }

    // ─── RBAC: solo admins pueden acceder a /settings ───
    if (request.nextUrl.pathname.startsWith("/administracion/settings") && user) {
        console.log("[Middleware] Verifying role for user:", user.email);

        const { data: roleData } = await supabase
            .from('user_roles')
            .select('role')
            .eq('user_id', user.id)
            .single();

        console.log("[Middleware] Role found for settings access:", roleData?.role);

        if (roleData?.role !== 'admin') {
            console.log("[Middleware] Redirecting non-admin away from settings");
            const url = request.nextUrl.clone();
            url.pathname = "/administracion/leads";
            return NextResponse.redirect(url);
        }
    }

    return response;
}

export const config = {
    matcher: [
        "/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)",
    ],
};