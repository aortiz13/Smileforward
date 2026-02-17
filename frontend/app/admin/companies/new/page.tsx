'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { ArrowLeft, Building2, Globe, Palette, Zap, UserPlus, Check } from 'lucide-react'

export default function NewCompanyPage() {
    const router = useRouter()
    const [step, setStep] = useState(1)
    const [formData, setFormData] = useState({
        // Step 1: Basic Info
        name: '',
        company_kind: 'business',
        contact_email: '',
        contact_phone: '',
        subscription_tier: 'starter',

        // Step 2: WhatsApp Instance (optional)
        instance_name: '',
        phone_number: '',

        // Step 3: Branding (optional)
        custom_domain: '',
        primary_color: '#6366f1',
        secondary_color: '#8b5cf6',

        // Step 4: Features
        features: [] as string[],

        // Step 5: Admin
        admin_email: '',
        admin_role: 'owner',
    })

    const [loading, setLoading] = useState(false)
    const [error, setError] = useState('')

    const updateFormData = (field: string, value: any) => {
        setFormData(prev => ({ ...prev, [field]: value }))
    }

    const toggleFeature = (feature: string) => {
        setFormData(prev => ({
            ...prev,
            features: prev.features.includes(feature)
                ? prev.features.filter(f => f !== feature)
                : [...prev.features, feature]
        }))
    }

    const handleSubmit = async () => {
        setLoading(true)
        setError('')

        try {
            const response = await fetch('/api/admin/companies', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(formData),
            })

            if (!response.ok) {
                const data = await response.json()
                throw new Error(data.error || 'Error creating company')
            }

            const { company } = await response.json()
            router.push(`/admin/companies/${company.id}`)
        } catch (err: any) {
            setError(err.message)
        } finally {
            setLoading(false)
        }
    }

    const availableFeatures = [
        { key: 'agent:onboarding', name: 'Onboarding Agent', description: 'Asistente de bienvenida' },
        { key: 'agent:finance', name: 'Finance Agent', description: 'Gestión financiera' },
        { key: 'agent:goals', name: 'Goals Agent', description: 'Objetivos y metas' },
        { key: 'agent:business', name: 'Business Agent', description: 'Consultoría de negocio' },
        { key: 'agent:content', name: 'Content Agent', description: 'Creación de contenido' },
        { key: 'module:content_manager', name: 'Content Manager', description: 'Gestión de contenido' },
        { key: 'module:analytics', name: 'Analytics', description: 'Análisis y reportes' },
    ]

    return (
        <div className="min-h-screen bg-gradient-to-br from-gray-50 to-gray-100 p-8">
            {/* Header */}
            <div className="mb-8">
                <Link href="/admin/companies" className="inline-flex items-center gap-2 text-gray-600 hover:text-gray-900 mb-4">
                    <ArrowLeft className="w-4 h-4" />
                    <span className="font-medium">Volver a Empresas</span>
                </Link>

                <h1 className="text-4xl font-black text-gray-900 mb-2">Nueva Instancia</h1>
                <p className="text-gray-600">Crea una nueva empresa cliente con configuración personalizada</p>
            </div>

            {/* Progress Steps */}
            <div className="mb-8 flex items-center justify-center gap-4">
                {[
                    { num: 1, label: 'Información', icon: Building2 },
                    { num: 2, label: 'WhatsApp', icon: Globe },
                    { num: 3, label: 'Branding', icon: Palette },
                    { num: 4, label: 'Features', icon: Zap },
                    { num: 5, label: 'Admin', icon: UserPlus },
                ].map((s, idx) => (
                    <div key={s.num} className="flex items-center gap-4">
                        <div className="flex items-center gap-3">
                            <div className={cn(
                                "w-12 h-12 rounded-full flex items-center justify-center font-bold transition",
                                step >= s.num ? "bg-primary text-white" : "bg-gray-200 text-gray-400"
                            )}>
                                {step > s.num ? <Check className="w-6 h-6" /> : <s.icon className="w-5 h-5" />}
                            </div>
                            <div>
                                <p className="text-xs text-gray-500">Paso {s.num}</p>
                                <p className="font-bold text-gray-900">{s.label}</p>
                            </div>
                        </div>
                        {idx < 4 && <div className="w-12 h-1 bg-gray-200"></div>}
                    </div>
                ))}
            </div>

            {/* Form */}
            <div className="max-w-3xl mx-auto bg-white rounded-3xl shadow-lg border border-gray-100 p-8">
                {error && (
                    <div className="mb-6 p-4 bg-red-50 border border-red-200 rounded-xl text-red-700">
                        {error}
                    </div>
                )}

                {/* Step 1: Basic Info */}
                {step === 1 && (
                    <div className="space-y-6">
                        <h2 className="text-2xl font-black text-gray-900 mb-6">Información Básica</h2>

                        <div>
                            <label className="block text-sm font-bold text-gray-700 mb-2">Nombre de la Empresa *</label>
                            <input
                                type="text"
                                value={formData.name}
                                onChange={(e) => updateFormData('name', e.target.value)}
                                className="w-full px-4 py-3 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-primary/20"
                                placeholder="Ej: Acme Corp"
                                required
                            />
                        </div>

                        <div className="grid grid-cols-2 gap-6">
                            <div>
                                <label className="block text-sm font-bold text-gray-700 mb-2">Tipo de Empresa</label>
                                <select
                                    value={formData.company_kind}
                                    onChange={(e) => updateFormData('company_kind', e.target.value)}
                                    className="w-full px-4 py-3 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-primary/20"
                                >
                                    <option value="business">Negocio</option>
                                    <option value="family">Familia</option>
                                    <option value="project">Proyecto</option>
                                    <option value="personal">Personal</option>
                                    <option value="other">Otro</option>
                                </select>
                            </div>

                            <div>
                                <label className="block text-sm font-bold text-gray-700 mb-2">Tier de Suscripción</label>
                                <select
                                    value={formData.subscription_tier}
                                    onChange={(e) => updateFormData('subscription_tier', e.target.value)}
                                    className="w-full px-4 py-3 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-primary/20"
                                >
                                    <option value="starter">Starter</option>
                                    <option value="professional">Professional</option>
                                    <option value="enterprise">Enterprise</option>
                                    <option value="custom">Custom</option>
                                </select>
                            </div>
                        </div>

                        <div className="grid grid-cols-2 gap-6">
                            <div>
                                <label className="block text-sm font-bold text-gray-700 mb-2">Email de Contacto</label>
                                <input
                                    type="email"
                                    value={formData.contact_email}
                                    onChange={(e) => updateFormData('contact_email', e.target.value)}
                                    className="w-full px-4 py-3 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-primary/20"
                                    placeholder="contacto@empresa.com"
                                />
                            </div>

                            <div>
                                <label className="block text-sm font-bold text-gray-700 mb-2">Teléfono de Contacto</label>
                                <input
                                    type="tel"
                                    value={formData.contact_phone}
                                    onChange={(e) => updateFormData('contact_phone', e.target.value)}
                                    className="w-full px-4 py-3 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-primary/20"
                                    placeholder="+1234567890"
                                />
                            </div>
                        </div>
                    </div>
                )}

                {/* Step 2: WhatsApp Instance */}
                {step === 2 && (
                    <div className="space-y-6">
                        <h2 className="text-2xl font-black text-gray-900 mb-6">Instancia WhatsApp (Opcional)</h2>

                        <div>
                            <label className="block text-sm font-bold text-gray-700 mb-2">Nombre de Instancia</label>
                            <input
                                type="text"
                                value={formData.instance_name}
                                onChange={(e) => updateFormData('instance_name', e.target.value)}
                                className="w-full px-4 py-3 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-primary/20"
                                placeholder="acme-corp-wa"
                            />
                        </div>

                        <div>
                            <label className="block text-sm font-bold text-gray-700 mb-2">Número de Teléfono</label>
                            <input
                                type="tel"
                                value={formData.phone_number}
                                onChange={(e) => updateFormData('phone_number', e.target.value)}
                                className="w-full px-4 py-3 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-primary/20"
                                placeholder="+1234567890"
                            />
                        </div>

                        <div className="p-4 bg-blue-50 border border-blue-200 rounded-xl">
                            <p className="text-sm text-blue-700">
                                <strong>Nota:</strong> Puedes configurar la instancia de WhatsApp más tarde desde el panel de la empresa.
                            </p>
                        </div>
                    </div>
                )}

                {/* Step 3: Branding */}
                {step === 3 && (
                    <div className="space-y-6">
                        <h2 className="text-2xl font-black text-gray-900 mb-6">Configuración de Marca (Opcional)</h2>

                        <div>
                            <label className="block text-sm font-bold text-gray-700 mb-2">Dominio Personalizado</label>
                            <input
                                type="text"
                                value={formData.custom_domain}
                                onChange={(e) => updateFormData('custom_domain', e.target.value)}
                                className="w-full px-4 py-3 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-primary/20"
                                placeholder="app.tuempresa.com"
                            />
                        </div>

                        <div className="grid grid-cols-2 gap-6">
                            <div>
                                <label className="block text-sm font-bold text-gray-700 mb-2">Color Primario</label>
                                <div className="flex gap-3">
                                    <input
                                        type="color"
                                        value={formData.primary_color}
                                        onChange={(e) => updateFormData('primary_color', e.target.value)}
                                        className="w-16 h-12 rounded-xl border border-gray-200 cursor-pointer"
                                    />
                                    <input
                                        type="text"
                                        value={formData.primary_color}
                                        onChange={(e) => updateFormData('primary_color', e.target.value)}
                                        className="flex-1 px-4 py-3 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-primary/20 font-mono"
                                    />
                                </div>
                            </div>

                            <div>
                                <label className="block text-sm font-bold text-gray-700 mb-2">Color Secundario</label>
                                <div className="flex gap-3">
                                    <input
                                        type="color"
                                        value={formData.secondary_color}
                                        onChange={(e) => updateFormData('secondary_color', e.target.value)}
                                        className="w-16 h-12 rounded-xl border border-gray-200 cursor-pointer"
                                    />
                                    <input
                                        type="text"
                                        value={formData.secondary_color}
                                        onChange={(e) => updateFormData('secondary_color', e.target.value)}
                                        className="flex-1 px-4 py-3 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-primary/20 font-mono"
                                    />
                                </div>
                            </div>
                        </div>
                    </div>
                )}

                {/* Step 4: Features */}
                {step === 4 && (
                    <div className="space-y-6">
                        <h2 className="text-2xl font-black text-gray-900 mb-6">Seleccionar Features</h2>

                        <div className="grid grid-cols-1 gap-4">
                            {availableFeatures.map((feature) => (
                                <label
                                    key={feature.key}
                                    className={cn(
                                        "flex items-center gap-4 p-4 border-2 rounded-xl cursor-pointer transition",
                                        formData.features.includes(feature.key)
                                            ? "border-primary bg-primary/5"
                                            : "border-gray-200 hover:border-gray-300"
                                    )}
                                >
                                    <input
                                        type="checkbox"
                                        checked={formData.features.includes(feature.key)}
                                        onChange={() => toggleFeature(feature.key)}
                                        className="w-5 h-5 text-primary rounded focus:ring-2 focus:ring-primary/20"
                                    />
                                    <div className="flex-1">
                                        <p className="font-bold text-gray-900">{feature.name}</p>
                                        <p className="text-sm text-gray-500">{feature.description}</p>
                                    </div>
                                </label>
                            ))}
                        </div>
                    </div>
                )}

                {/* Step 5: Admin */}
                {step === 5 && (
                    <div className="space-y-6">
                        <h2 className="text-2xl font-black text-gray-900 mb-6">Asignar Administrador</h2>

                        <div>
                            <label className="block text-sm font-bold text-gray-700 mb-2">Email del Administrador *</label>
                            <input
                                type="email"
                                value={formData.admin_email}
                                onChange={(e) => updateFormData('admin_email', e.target.value)}
                                className="w-full px-4 py-3 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-primary/20"
                                placeholder="admin@empresa.com"
                                required
                            />
                        </div>

                        <div>
                            <label className="block text-sm font-bold text-gray-700 mb-2">Rol</label>
                            <select
                                value={formData.admin_role}
                                onChange={(e) => updateFormData('admin_role', e.target.value)}
                                className="w-full px-4 py-3 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-primary/20"
                            >
                                <option value="owner">Owner</option>
                                <option value="admin">Admin</option>
                                <option value="viewer">Viewer</option>
                            </select>
                        </div>

                        <div className="p-4 bg-green-50 border border-green-200 rounded-xl">
                            <p className="text-sm text-green-700">
                                <strong>Nota:</strong> Se enviará un email de invitación al administrador para que configure su cuenta.
                            </p>
                        </div>
                    </div>
                )}

                {/* Navigation Buttons */}
                <div className="flex items-center justify-between mt-8 pt-6 border-t border-gray-200">
                    <button
                        onClick={() => setStep(step - 1)}
                        disabled={step === 1}
                        className="px-6 py-3 border border-gray-200 rounded-xl font-bold text-gray-700 hover:bg-gray-50 transition disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                        Anterior
                    </button>

                    {step < 5 ? (
                        <button
                            onClick={() => setStep(step + 1)}
                            disabled={step === 1 && !formData.name}
                            className="px-6 py-3 bg-primary text-white rounded-xl font-bold hover:bg-primary/90 transition disabled:opacity-50 disabled:cursor-not-allowed"
                        >
                            Siguiente
                        </button>
                    ) : (
                        <button
                            onClick={handleSubmit}
                            disabled={loading || !formData.name || !formData.admin_email}
                            className="px-6 py-3 bg-primary text-white rounded-xl font-bold hover:bg-primary/90 transition disabled:opacity-50 disabled:cursor-not-allowed"
                        >
                            {loading ? 'Creando...' : 'Crear Instancia'}
                        </button>
                    )}
                </div>
            </div>
        </div>
    )
}

function cn(...inputs: any[]) {
    return inputs.filter(Boolean).join(' ')
}
