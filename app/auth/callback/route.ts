// app/auth/callback/route.ts
// With NextAuth, auth callbacks are handled by the [...nextauth] route.
// This route is kept as a compatibility redirect.
import { NextResponse } from "next/server";

export async function GET(request: Request) {
    const { searchParams } = new URL(request.url);
    const next = searchParams.get("next") ?? "/administracion/dashboard";

    const host = request.headers.get("x-forwarded-host") || request.headers.get("host");
    const protocol = request.headers.get("x-forwarded-proto") || "https";
    const origin = `${protocol}://${host}`;

    const safeNext =
        next.startsWith("/") && !next.startsWith("//") ? next : "/administracion/dashboard";

    // Simply redirect to the target — NextAuth handles sessions via cookies
    return NextResponse.redirect(new URL(safeNext, origin).toString());
}