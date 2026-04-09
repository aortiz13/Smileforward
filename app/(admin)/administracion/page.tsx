import { getSession } from "@/lib/auth/session";
import { redirect } from "next/navigation";

export default async function AdminRootPage() {
    const session = await getSession();

    if (!session) {
        redirect("/login");
    }

    if (session.role === 'basic') {
        redirect("/administracion/leads");
    } else if (session.role === 'admin') {
        redirect("/administracion/dashboard");
    } else {
        // If logged in but no role found, default to leads to avoid loop with /login
        redirect("/administracion/leads");
    }
}
