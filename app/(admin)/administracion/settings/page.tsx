import EmbedConfigurator from "@/components/admin/embed/EmbedConfigurator";
import { UserInviteForm } from "./UserInviteForm";
import { getSession } from "@/lib/auth/session";
import { redirect } from "next/navigation";

export default async function SettingsPage() {
    const session = await getSession();
    if (!session) redirect("/login");

    if (session.role !== 'admin') {
        redirect("/administracion/leads");
    }

    return (
        <div className="p-4 md:p-8 space-y-8">
            <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
                <h2 className="text-3xl font-heading font-bold text-foreground">Configuración</h2>
            </div>

            <div className="grid gap-8 grid-cols-1 lg:grid-cols-2">
                <div className="space-y-6">
                    <UserInviteForm />
                </div>

                <div className="space-y-6">
                    <div className="flex items-center gap-3">
                        <EmbedConfigurator />
                    </div>
                </div>
            </div>
        </div>
    );
}
