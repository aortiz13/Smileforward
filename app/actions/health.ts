'use server';

export async function checkServerHealth() {
    console.log("Server Health Check Triggered");
    return {
        status: "ok",
        timestamp: new Date().toISOString(),
        envCheck: {
            apiKey: !!process.env.API_KEY,
            supabaseUrl: !!process.env.NEXT_PUBLIC_SUPABASE_URL
        }
    };
}
