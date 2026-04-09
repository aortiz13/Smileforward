'use server';

export async function checkServerHealth() {
    console.log("Server Health Check Triggered");
    return {
        status: "ok",
        timestamp: new Date().toISOString(),
        envCheck: {
            apiKey: !!process.env.GOOGLE_API_KEY,
            database: !!process.env.DATABASE_URL,
            minio: !!process.env.MINIO_ENDPOINT,
            nextauth: !!process.env.NEXTAUTH_SECRET,
            smtp: !!process.env.SMTP_HOSTNAME
        }
    };
}
