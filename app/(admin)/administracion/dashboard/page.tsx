import { db } from '@/lib/db';
import { getSession } from '@/lib/auth/session';
import { Users, Sparkles, Video } from "lucide-react";
import { ExportGenerationsButton } from "@/components/admin/ExportGenerationsButton";
import { DashboardCharts } from "@/components/admin/DashboardCharts";
import { redirect } from "next/navigation";

export default async function DashboardPage() {
    // 1. Verify Authentication & Role
    const session = await getSession();
    if (!session) redirect("/login");

    if (session.role !== 'admin' && session.role !== 'basic') {
        return (
            <div className="flex flex-col items-center justify-center min-h-[600px] space-y-4 p-8 text-center text-black">
                <h2 className="text-2xl font-bold">Acceso No Autorizado</h2>
                <p className="text-muted-foreground max-w-md">
                    Tu cuenta no tiene los permisos necesarios para acceder al panel de administración.
                </p>
                <div className="pt-4">
                    <a href="/api/auth/signout" className="bg-primary text-primary-foreground px-6 py-2 rounded-lg font-medium hover:bg-primary/90 transition-colors">
                        Cerrar Sesión
                    </a>
                </div>
            </div>
        );
    }

    // Fetch Stats
    const totalLeadsResult = await db.queryOne('SELECT COUNT(*) as count FROM leads');
    const totalLeads = parseInt(totalLeadsResult?.count || '0');

    const smileResult = await db.queryOne("SELECT COUNT(*) as count FROM generations WHERE type = 'image'");
    const smileGenerations = parseInt(smileResult?.count || '0');

    const videoResult = await db.queryOne("SELECT COUNT(*) as count FROM generations WHERE type = 'video'");
    const videoRequests = parseInt(videoResult?.count || '0');

    // Fetch Charts Data (Last 30 Days)
    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

    const chartResult = await db.query(
        `SELECT created_at, type FROM generations 
         WHERE created_at >= $1 ORDER BY created_at ASC`,
        [thirtyDaysAgo.toISOString()]
    );
    const chartData = chartResult.rows;

    // Fetch Recent Activity
    const activityResult = await db.query(
        'SELECT * FROM audit_logs ORDER BY created_at DESC LIMIT 5'
    );
    const recentActivity = activityResult.rows;

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
                    <p className="text-4xl font-bold text-primary mt-2">{totalLeads}</p>
                </div>
                <div className="bg-card p-6 rounded-xl border border-border shadow-sm">
                    <div className="flex items-center justify-between">
                        <h3 className="text-sm font-medium text-muted-foreground">Generaciones de Smile</h3>
                        <Sparkles className="w-4 h-4 text-muted-foreground" strokeWidth={1.5} />
                    </div>
                    <p className="text-4xl font-bold text-primary mt-2">{smileGenerations}</p>
                </div>
                <div className="bg-card p-6 rounded-xl border border-border shadow-sm">
                    <div className="flex items-center justify-between">
                        <h3 className="text-sm font-medium text-muted-foreground">Solicitudes de Video</h3>
                        <Video className="w-4 h-4 text-muted-foreground" strokeWidth={1.5} />
                    </div>
                    <p className="text-4xl font-bold text-primary mt-2">{videoRequests}</p>
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
                            {recentActivity.map((log: any) => (
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
