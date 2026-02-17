import { createClient } from '@/lib/supabase/server'
import { redirect, notFound } from 'next/navigation'
import Link from 'next/link'
import { ArrowLeft, Zap, ToggleLeft, ToggleRight } from 'lucide-react'
import { FeatureToggle } from './feature-toggle'

interface PageProps {
    params: Promise<{ id: string }>
}

export default async function CompanyFeaturesPage({ params }: PageProps) {
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

    // Fetch instance features
    const { data: features, error: featuresError } = await supabase
        .from('instance_features')
        .select('*')
        .eq('company_id', id)

    const availableFeatures = [
        {
            category: 'Agentes AI',
            items: [
                { key: 'agent:onboarding', name: 'Onboarding Agent', description: 'Asistente de bienvenida y configuración inicial' },
                { key: 'agent:finance', name: 'Finance Agent', description: 'Gestión financiera, presupuestos y transacciones' },
                { key: 'agent:goals', name: 'Goals Agent', description: 'Objetivos, metas y seguimiento de progreso' },
                { key: 'agent:business', name: 'Business Agent', description: 'Consultoría de negocio y estrategia' },
                { key: 'agent:content', name: 'Content Agent', description: 'Creación y gestión de contenido' },
            ]
        },
        {
            category: 'Módulos',
            items: [
                { key: 'module:content_manager', name: 'Content Manager', description: 'Gestión de contenido multimedia' },
                { key: 'module:analytics', name: 'Analytics', description: 'Análisis y reportes avanzados' },
                { key: 'module:team', name: 'Team Management', description: 'Gestión de equipos y colaboradores' },
                { key: 'module:api', name: 'API Access', description: 'Acceso a la API REST' },
            ]
        }
    ]

    // Create a map of existing features
    const featureMap = new Map(features?.map(f => [f.feature_key, f]) || [])

    return (
        <div className="min-h-screen bg-gradient-to-br from-gray-50 to-gray-100 p-8">
            {/* Header */}
            <div className="mb-8">
                <Link href={`/admin/companies/${id}`} className="inline-flex items-center gap-2 text-gray-600 hover:text-gray-900 mb-4">
                    <ArrowLeft className="w-4 h-4" />
                    <span className="font-medium">Volver a {company.name}</span>
                </Link>

                <div className="flex items-center gap-3 mb-2">
                    <div className="p-3 bg-green-100 rounded-xl">
                        <Zap className="w-6 h-6 text-green-600" />
                    </div>
                    <h1 className="text-4xl font-black text-gray-900">Feature Toggles</h1>
                </div>
                <p className="text-gray-600">Activa o desactiva funcionalidades para esta instancia</p>
            </div>

            {/* Features by Category */}
            <div className="space-y-8">
                {availableFeatures.map((category) => (
                    <div key={category.category} className="bg-white rounded-3xl shadow-sm border border-gray-100 overflow-hidden">
                        <div className="bg-gray-50 px-6 py-4 border-b border-gray-100">
                            <h2 className="text-xl font-black text-gray-900">{category.category}</h2>
                        </div>
                        <div className="p-6 space-y-4">
                            {category.items.map((feature) => {
                                const existingFeature = featureMap.get(feature.key)
                                const isEnabled = existingFeature?.enabled || false

                                return (
                                    <FeatureToggle
                                        key={feature.key}
                                        companyId={id}
                                        featureKey={feature.key}
                                        featureName={feature.name}
                                        featureDescription={feature.description}
                                        initialEnabled={isEnabled}
                                    />
                                )
                            })}
                        </div>
                    </div>
                ))}
            </div>
        </div>
    )
}
