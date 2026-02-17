import { createServerClient } from "@supabase/ssr";
import { cookies } from "next/headers";
import { NextResponse } from "next/server";

export async function GET(request: Request) {
    const { searchParams } = new URL(request.url);
    const code = searchParams.get("code");
    const token_hash = searchParams.get("token_hash");
    const type = searchParams.get("type");
    const next = searchParams.get("next");

    const host = request.headers.get("x-forwarded-host") || request.headers.get("host");
    const protocol = request.headers.get("x-forwarded-proto") || "https";
    const origin = `${protocol}://${host}`;

    // URL Validation: Ensure 'next' is a safe local path
    let safeNext = "/administracion/dashboard";
    if (next && next.startsWith("/") && !next.startsWith("//")) {
        safeNext = next;
    }

    const redirectUrl = new URL(safeNext, origin);

    if (code || token_hash) {
        const cookieStore = await cookies();
        const supabase = createServerClient(
            process.env.NEXT_PUBLIC_SUPABASE_URL!,
            process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
            {
                cookies: {
                    getAll() {
                        return cookieStore.getAll();
                    },
                    setAll(cookiesToSet) {
                        try {
                            cookiesToSet.forEach(({ name, value, options }) => {
                                // Set on cookieStore for server-side persistence in current request
                                cookieStore.set(name, value, options);
                            });
                        } catch {
                            // The `setAll` method was called from a Server Component.
                        }
                    },
                },
            }
        );

        console.log("[AuthCallback] Attempting to verify token/code...");
        let error = null;

        if (code) {
            const { error: exchangeError } = await supabase.auth.exchangeCodeForSession(code);
            error = exchangeError;
        } else if (token_hash && type) {
            // @ts-ignore
            const { error: verifyError } = await supabase.auth.verifyOtp({
                token_hash,
                type: type as any,
            });
            error = verifyError;
        }

        if (!error) {
            console.log("[AuthCallback] Success! Redirecting to:", safeNext);
            return NextResponse.redirect(redirectUrl.toString());
        }

        console.error("[AuthCallback] Auth error:", error.message);
        // Fallback to login ONLY if there was an explicit error verifying a provided token
        const loginUrl = new URL("/login", origin);
        loginUrl.searchParams.set("error", error.message);
        return NextResponse.redirect(loginUrl.toString());
    }

    // If no tokens were provided, we STILL redirect to 'next'.
    // This is crucial for Invitation/Reset flows that use URL Fragments (#access_token)
    // which the server cannot see. The client-side will process the fragment on the target page.
    console.log("[AuthCallback] No params found, performing pass-through redirect to:", safeNext);
    return NextResponse.redirect(redirectUrl.toString());
}
