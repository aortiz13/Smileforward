import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Activity, AlertTriangle, Workflow, Shield, MessageSquare } from 'lucide-react'
import SystemHealthDashboard from './components/system-health-dashboard'
import N8nMonitorDashboard from './components/n8n-monitor-dashboard'
import AuditTrailDashboard from './components/audit-trail-dashboard'
import AIMetricsDashboard from './components/ai-metrics-dashboard'
import ConversationAuditDashboard from './components/conversation-audit-dashboard'

export default async function AgentAuditPage() {
    const supabase = await createClient()

    // Check if user is admin
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) redirect('/login')

    const { data: adminCheck } = await supabase
        .from('admin_profiles')
        .select('role, scope')
        .eq('auth_user_id', user.id)
        .single()

    if (!adminCheck) {
        return <div className="p-8 text-red-500">Acceso denegado. Se requieren privilegios de administrador.</div>
    }

    const isSuperAdmin = adminCheck.role === 'super_admin' && adminCheck.scope === 'global'

    return (
        <div className="min-h-screen bg-gradient-to-br from-gray-50 to-gray-100 p-8">
            {/* Header */}
            <div className="mb-8">
                <div className="flex items-center gap-3 mb-2">
                    <div className="p-3 bg-purple-100 rounded-xl">
                        <Activity className="w-6 h-6 text-purple-600" />
                    </div>
                    <h1 className="text-4xl font-black text-gray-900">Monitoreo Técnico y Auditoría</h1>
                </div>
                <p className="text-gray-600">
                    Panel de control centralizado para monitorear la salud del sistema, flujos de n8n, auditoría de datos y rendimiento de agentes AI.
                </p>
            </div>

            {/* Tabs Navigation */}
            <Tabs defaultValue="system-health" className="w-full">
                <TabsList className="grid w-full grid-cols-5 mb-8 bg-white p-2 rounded-2xl shadow-sm border border-gray-100">
                    <TabsTrigger
                        value="system-health"
                        className="flex items-center gap-2 data-[state=active]:bg-red-50 data-[state=active]:text-red-700 rounded-xl"
                    >
                        <AlertTriangle className="w-4 h-4" />
                        <span className="font-bold">Salud del Sistema</span>
                    </TabsTrigger>
                    <TabsTrigger
                        value="n8n-monitor"
                        className="flex items-center gap-2 data-[state=active]:bg-blue-50 data-[state=active]:text-blue-700 rounded-xl"
                    >
                        <Workflow className="w-4 h-4" />
                        <span className="font-bold">Monitor n8n</span>
                    </TabsTrigger>
                    <TabsTrigger
                        value="audit-trail"
                        className="flex items-center gap-2 data-[state=active]:bg-green-50 data-[state=active]:text-green-700 rounded-xl"
                    >
                        <Shield className="w-4 h-4" />
                        <span className="font-bold">Registro de Auditoría</span>
                    </TabsTrigger>
                    <TabsTrigger
                        value="ai-metrics"
                        className="flex items-center gap-2 data-[state=active]:bg-purple-50 data-[state=active]:text-purple-700 rounded-xl"
                    >
                        <Activity className="w-4 h-4" />
                        <span className="font-bold">Métricas IA</span>
                    </TabsTrigger>
                    <TabsTrigger
                        value="conversation-audit"
                        className="flex items-center gap-2 data-[state=active]:bg-orange-50 data-[state=active]:text-orange-700 rounded-xl"
                    >
                        <MessageSquare className="w-4 h-4" />
                        <span className="font-bold">Auditoría Conversaciones</span>
                    </TabsTrigger>
                </TabsList>

                {/* Tab Content */}
                <TabsContent value="system-health" className="mt-0">
                    <SystemHealthDashboard isSuperAdmin={isSuperAdmin} />
                </TabsContent>

                <TabsContent value="n8n-monitor" className="mt-0">
                    <N8nMonitorDashboard
                        isSuperAdmin={isSuperAdmin}
                        n8nUrl={process.env.N8N_API_URL || ''}
                    />
                </TabsContent>

                <TabsContent value="audit-trail" className="mt-0">
                    <AuditTrailDashboard isSuperAdmin={isSuperAdmin} />
                </TabsContent>

                <TabsContent value="ai-metrics" className="mt-0">
                    <AIMetricsDashboard isSuperAdmin={isSuperAdmin} />
                </TabsContent>

                <TabsContent value="conversation-audit" className="mt-0">
                    <ConversationAuditDashboard isSuperAdmin={isSuperAdmin} />
                </TabsContent>
            </Tabs>
        </div>
    )
}
