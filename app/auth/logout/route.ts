import { NextResponse } from "next/server";
import { signOut } from "@/lib/auth";

export async function POST(request: Request) {
    try {
        await signOut({ redirect: false });
    } catch {
        // signOut may throw in some configurations, but the session cookie is cleared
    }

    const url = new URL(request.url);
    const origin = url.origin;

    return NextResponse.redirect(`${origin}/login`, {
        status: 303,
    });
}
