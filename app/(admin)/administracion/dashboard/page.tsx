import { createClient } from "@/utils/supabase/server";
import { Users, Sparkles, Video } from "lucide-react";
import { ExportGenerationsButton } from "@/components/admin/ExportGenerationsButton";
import { DashboardCharts } from "@/components/admin/DashboardCharts";
import { redirect } from "next/navigation";

export default async function DashboardPage() {
    const supabase = await createClient();

    // 1. Verify Authentication & Role
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) redirect("/login");

    const { data: roleData } = await supabase
        .from('user_roles')
        .select('role')
        .eq('user_id', user.id)
        .single();

    // Both admin and basic can access dashboard
    if (roleData?.role !== 'admin' && roleData?.role !== 'basic') {
        redirect("/login");
    }

    // Fetch Stats
    const { count: totalLeads } = await supabase
        .from("leads")
        .select("*", { count: "exact", head: true });

    const { count: smileGenerations } = await supabase
        .from("generations")
        .select("*", { count: "exact", head: true })
        .eq("type", "image");

    const { count: videoRequests } = await supabase
        .from("generations")
        .select("*", { count: "exact", head: true })
        .eq("type", "video");

    // Fetch Charts Data (Last 30 Days)
    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

    const { data: chartData } = await supabase
        .from("generations")
        .select("created_at, type")
        .gte('created_at', thirtyDaysAgo.toISOString())
        .order('created_at', { ascending: true });

    // Fetch Recent Activity
    const { data: recentActivity } = await supabase
        .from("audit_logs")
        .select("*")
        .order("created_at", { ascending: false })
        .limit(5);

    return (
        <div className="p-4 md:p-8 space-y-8">
            <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
                <h2 className="text-3xl font-heading font-bold text-foreground">Dashboard</h2>
                <ExportGenerationsButton />
            </div>

            {/* Metrics */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                <div className="bg-card p-6 rounded-xl border border-border shadow-sm">
                    <div className="flex items-center justify-between">
                        <h3 className="text-sm font-medium text-muted-foreground">Total Leads</h3>
                        <Users className="w-4 h-4 text-muted-foreground" strokeWidth={1.5} />
                    </div>
                    <p className="text-4xl font-bold text-primary mt-2">{totalLeads || 0}</p>
                </div>
                <div className="bg-card p-6 rounded-xl border border-border shadow-sm">
                    <div className="flex items-center justify-between">
                        <h3 className="text-sm font-medium text-muted-foreground">Generaciones de Smile</h3>
                        <Sparkles className="w-4 h-4 text-muted-foreground" strokeWidth={1.5} />
                    </div>
                    <p className="text-4xl font-bold text-primary mt-2">{smileGenerations || 0}</p>
                </div>
                <div className="bg-card p-6 rounded-xl border border-border shadow-sm">
                    <div className="flex items-center justify-between">
                        <h3 className="text-sm font-medium text-muted-foreground">Solicitudes de Video</h3>
                        <Video className="w-4 h-4 text-muted-foreground" strokeWidth={1.5} />
                    </div>
                    <p className="text-4xl font-bold text-primary mt-2">{videoRequests || 0}</p>
                </div>
            </div>

            {/* Charts Area */}
            <DashboardCharts data={chartData || []} />

            {/* Recent Activity */}
            <div className="bg-card rounded-xl border border-border shadow-sm overflow-hidden">
                <div className="p-6 border-b border-border">
                    <h3 className="font-bold">Actividad Reciente</h3>
                </div>
                <div className="p-0">
                    {recentActivity && recentActivity.length > 0 ? (
                        <ul className="divide-y divide-border">
                            {recentActivity.map((log) => (
                                <li key={log.id} className="p-4 hover:bg-muted/50 transition-colors">
                                    <div className="flex justify-between items-start">
                                        <div>
                                            <p className="text-sm font-medium text-foreground">{log.action}</p>
                                            <p className="text-xs text-muted-foreground mt-1">
                                                {JSON.stringify(log.details)}
                                            </p>
                                        </div>
                                        <span className="text-xs text-muted-foreground">
                                            {new Date(log.created_at).toLocaleString()}
                                        </span>
                                    </div>
                                </li>
                            ))}
                        </ul>
                    ) : (
                        <div className="p-6 text-center text-muted-foreground text-sm">
                            <p>No hay actividad reciente registrada.</p>
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
}

