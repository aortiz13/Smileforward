import { createClient } from "@/utils/supabase/server";
import { redirect } from "next/navigation";

export default async function AdminRootPage() {
    const supabase = await createClient();

    const { data: { user } } = await supabase.auth.getUser();

    if (!user) {
        redirect("/login");
    }

    const { data: roleData } = await supabase
        .from('user_roles')
        .select('role')
        .eq('user_id', user.id)
        .single();

    if (roleData?.role === 'basic') {
        redirect("/administracion/leads");
    } else {
        redirect("/administracion/dashboard");
    }
}
