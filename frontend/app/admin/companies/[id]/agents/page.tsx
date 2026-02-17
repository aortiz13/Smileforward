import { createClient } from '@/lib/supabase/server'
import { redirect, notFound } from 'next/navigation'
import Link from 'next/link'
import { ArrowLeft, Settings } from 'lucide-react'
import { AgentPromptEditor } from './agent-prompt-editor'

interface PageProps {
    params: Promise<{ id: string }>
}

export default async function CompanyAgentsPage({ params }: PageProps) {
    const supabase = await createClient()
    const { id } = await params

    // Check if user is super admin
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) redirect('/login')

    const { data: adminCheck } = await supabase
        .from('admin_profiles')
        .select('role, scope')
        .eq('auth_user_id', user.id)
        .single()

    if (!adminCheck || (adminCheck.scope !== 'global' && adminCheck.role !== 'super_admin')) {
        return <div className="p-8 text-red-500">Access denied. Super admin privileges required.</div>
    }

    // Fetch company details
    const { data: company, error: companyError } = await supabase
        .from('client_companies')
        .select('id, name')
        .eq('id', id)
        .single()

    if (companyError || !company) {
        notFound()
    }

    // Fetch prompt variants for this company
    const { data: variants } = await supabase
        .from('prompt_variants')
        .select('*')
        .eq('company_id', id)

    const agents = [
        {
            key: 'onboarding',
            name: 'Onboarding Agent',
            description: 'Asistente de bienvenida y configuración inicial',
            icon: '👋',
            color: 'blue'
        },
        {
            key: 'finance',
            name: 'Finance Agent',
            description: 'Gestión financiera, presupuestos y transacciones',
            icon: '💰',
            color: 'green'
        },
        {
            key: 'goals',
            name: 'Goals Agent',
            description: 'Objetivos, metas y seguimiento de progreso',
            icon: '🎯',
            color: 'purple'
        },
        {
            key: 'business',
            name: 'Business Agent',
            description: 'Consultoría de negocio y estrategia',
            icon: '💼',
            color: 'indigo'
        },
        {
            key: 'content',
            name: 'Content Agent',
            description: 'Creación y gestión de contenido',
            icon: '✍️',
            color: 'pink'
        }
    ]

    // Create a map of existing variants
    const variantMap = new Map(variants?.map(v => [v.agent_key, v]) || [])

    return (
        <div className="min-h-screen bg-gradient-to-br from-gray-50 to-gray-100 p-8">
            {/* Header */}
            <div className="mb-8">
                <Link href={`/admin/companies/${id}`} className="inline-flex items-center gap-2 text-gray-600 hover:text-gray-900 mb-4">
                    <ArrowLeft className="w-4 h-4" />
                    <span className="font-medium">Volver a {company.name}</span>
                </Link>

                <div className="flex items-center gap-3 mb-2">
                    <div className="p-3 bg-purple-100 rounded-xl">
                        <Settings className="w-6 h-6 text-purple-600" />
                    </div>
                    <h1 className="text-4xl font-black text-gray-900">Personalización de Agentes</h1>
                </div>
                <p className="text-gray-600">Personaliza los prompts de cada agente para esta instancia</p>
            </div>

            {/* Agents Grid */}
            <div className="grid grid-cols-1 gap-6">
                {agents.map((agent) => {
                    const variant = variantMap.get(agent.key)
                    return (
                        <AgentPromptEditor
                            key={agent.key}
                            companyId={id}
                            agent={agent}
                            initialVariant={variant}
                        />
                    )
                })}
            </div>
        </div>
    )
}
