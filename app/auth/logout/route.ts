import { createClient } from "@/utils/supabase/server";
import { NextResponse } from "next/server";

export async function POST(request: Request) {
    const supabase = await createClient();

    // Check if a session exists before signing out
    const { data: { session } } = await supabase.auth.getSession();

    if (session) {
        await supabase.auth.signOut();
    }

    const url = new URL(request.url);
    const origin = url.origin;

    return NextResponse.redirect(`${origin}/login`, {
        status: 303,
    });
}
