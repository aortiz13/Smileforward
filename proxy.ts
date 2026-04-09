import { NextResponse, type NextRequest } from "next/server";
import { auth } from "@/lib/auth";

export async function proxy(request: NextRequest) {
    const session = await auth();
    const user = session?.user;

    // ─── Block public signup ───
    if (request.nextUrl.pathname.startsWith("/signup")) {
        const url = request.nextUrl.clone();
        url.pathname = "/login";
        return NextResponse.redirect(url);
    }

    // ─── If already logged in and going to /login, redirect to dashboard ───
    if (request.nextUrl.pathname.startsWith("/login") && user) {
        console.log("[Middleware] Authenticated user on /login, redirecting to target...");
        const next = request.nextUrl.searchParams.get("next") || "/administracion/dashboard";
        const url = request.nextUrl.clone();
        url.pathname = next;
        return NextResponse.redirect(url);
    }

    // ─── Protected routes: require authentication ───
    const isUpdatePassword = request.nextUrl.pathname === "/administracion/update-password";
    if (request.nextUrl.pathname.startsWith("/administracion") && !user) {
        if (isUpdatePassword) {
            return NextResponse.next();
        }
        console.log("[Middleware] Unauthenticated access to protected route:", request.nextUrl.pathname, "Redirecting to /login");
        const url = request.nextUrl.clone();
        url.pathname = "/login";
        return NextResponse.redirect(url);
    }

    // ─── RBAC: only admins can access /settings ───
    if (request.nextUrl.pathname.startsWith("/administracion/settings") && user) {
        console.log("[Middleware] Verifying role for user:", user.email);

        const role = (user as any).role;
        console.log("[Middleware] Role found for settings access:", role);

        if (role !== 'admin') {
            console.log("[Middleware] Redirecting non-admin away from settings");
            const url = request.nextUrl.clone();
            url.pathname = "/administracion/leads";
            return NextResponse.redirect(url);
        }
    }

    return NextResponse.next();
}

export const config = {
    matcher: [
        "/((?!simulacion|_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)",
    ],
};