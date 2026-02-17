'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { Upload, Palette, Globe, Loader2 } from 'lucide-react'

interface BrandingFormProps {
    companyId: string
    initialData: {
        logo_url?: string | null
        primary_color?: string | null
        secondary_color?: string | null
        custom_domain?: string | null
        name: string
    }
}

export function BrandingForm({ companyId, initialData }: BrandingFormProps) {
    const router = useRouter()
    const [loading, setLoading] = useState(false)
    const [logoUrl, setLogoUrl] = useState(initialData.logo_url || '')
    const [primaryColor, setPrimaryColor] = useState(initialData.primary_color || '#6366f1')
    const [secondaryColor, setSecondaryColor] = useState(initialData.secondary_color || '#8b5cf6')
    const [customDomain, setCustomDomain] = useState(initialData.custom_domain || '')

    const handleSaveLogo = async () => {
        setLoading(true)
        try {
            const res = await fetch(`/api/admin/companies/${companyId}/branding`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ logo_url: logoUrl })
            })

            const data = await res.json()
            if (!res.ok) throw new Error(data.error)

            router.refresh()
            alert('Logo guardado exitosamente')
        } catch (error: any) {
            alert(`Error: ${error.message}`)
        } finally {
            setLoading(false)
        }
    }

    const handleSaveColors = async () => {
        setLoading(true)
        try {
            const res = await fetch(`/api/admin/companies/${companyId}/branding`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    primary_color: primaryColor,
                    secondary_color: secondaryColor
                })
            })

            const data = await res.json()
            if (!res.ok) throw new Error(data.error)

            router.refresh()
            alert('Colores guardados exitosamente')
        } catch (error: any) {
            alert(`Error: ${error.message}`)
        } finally {
            setLoading(false)
        }
    }

    const handleSaveDomain = async () => {
        setLoading(true)
        try {
            const res = await fetch(`/api/admin/companies/${companyId}/branding`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ custom_domain: customDomain })
            })

            const data = await res.json()
            if (!res.ok) throw new Error(data.error)

            router.refresh()
            alert('Dominio guardado exitosamente')
        } catch (error: any) {
            alert(`Error: ${error.message}`)
        } finally {
            setLoading(false)
        }
    }

    return (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Logo */}
            <div className="bg-white rounded-3xl p-6 shadow-sm border border-gray-100">
                <h2 className="text-xl font-black text-gray-900 mb-6 flex items-center gap-2">
                    <Upload className="w-5 h-5" />
                    Logo
                </h2>

                <div className="space-y-4">
                    {logoUrl ? (
                        <div className="relative w-32 h-32 rounded-2xl overflow-hidden border-2 border-gray-200">
                            <img src={logoUrl} alt={initialData.name} className="w-full h-full object-cover" />
                        </div>
                    ) : (
                        <div className="w-32 h-32 rounded-2xl bg-gradient-to-br from-primary to-purple-600 flex items-center justify-center text-white font-black text-4xl">
                            {initialData.name.charAt(0).toUpperCase()}
                        </div>
                    )}

                    <div>
                        <label className="block text-sm font-bold text-gray-700 mb-2">
                            URL del Logo
                        </label>
                        <input
                            type="url"
                            value={logoUrl}
                            onChange={(e) => setLogoUrl(e.target.value)}
                            placeholder="https://ejemplo.com/logo.png"
                            className="w-full px-4 py-3 border border-gray-200 rounded-xl focus:ring-2 focus:ring-primary focus:border-transparent"
                        />
                    </div>

                    <button
                        onClick={handleSaveLogo}
                        disabled={loading}
                        className="w-full bg-primary text-white px-6 py-3 rounded-xl font-bold hover:bg-primary/90 transition disabled:opacity-50 flex items-center justify-center gap-2"
                    >
                        {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : null}
                        Guardar Logo
                    </button>
                </div>
            </div>

            {/* Colors */}
            <div className="bg-white rounded-3xl p-6 shadow-sm border border-gray-100">
                <h2 className="text-xl font-black text-gray-900 mb-6 flex items-center gap-2">
                    <Palette className="w-5 h-5" />
                    Colores
                </h2>

                <div className="space-y-4">
                    <div>
                        <label className="block text-sm font-bold text-gray-700 mb-2">
                            Color Primario
                        </label>
                        <div className="flex gap-3">
                            <input
                                type="color"
                                value={primaryColor}
                                onChange={(e) => setPrimaryColor(e.target.value)}
                                className="w-16 h-12 rounded-xl border border-gray-200 cursor-pointer"
                            />
                            <input
                                type="text"
                                value={primaryColor}
                                onChange={(e) => setPrimaryColor(e.target.value)}
                                placeholder="#6366f1"
                                className="flex-1 px-4 py-3 border border-gray-200 rounded-xl focus:ring-2 focus:ring-primary focus:border-transparent font-mono"
                            />
                        </div>
                    </div>

                    <div>
                        <label className="block text-sm font-bold text-gray-700 mb-2">
                            Color Secundario
                        </label>
                        <div className="flex gap-3">
                            <input
                                type="color"
                                value={secondaryColor}
                                onChange={(e) => setSecondaryColor(e.target.value)}
                                className="w-16 h-12 rounded-xl border border-gray-200 cursor-pointer"
                            />
                            <input
                                type="text"
                                value={secondaryColor}
                                onChange={(e) => setSecondaryColor(e.target.value)}
                                placeholder="#8b5cf6"
                                className="flex-1 px-4 py-3 border border-gray-200 rounded-xl focus:ring-2 focus:ring-primary focus:border-transparent font-mono"
                            />
                        </div>
                    </div>

                    <button
                        onClick={handleSaveColors}
                        disabled={loading}
                        className="w-full bg-primary text-white px-6 py-3 rounded-xl font-bold hover:bg-primary/90 transition disabled:opacity-50 flex items-center justify-center gap-2"
                    >
                        {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : null}
                        Guardar Colores
                    </button>
                </div>
            </div>

            {/* Custom Domain */}
            <div className="bg-white rounded-3xl p-6 shadow-sm border border-gray-100 lg:col-span-2">
                <h2 className="text-xl font-black text-gray-900 mb-6 flex items-center gap-2">
                    <Globe className="w-5 h-5" />
                    Dominio Personalizado
                </h2>

                <div className="space-y-4">
                    <div>
                        <label className="block text-sm font-bold text-gray-700 mb-2">
                            Dominio
                        </label>
                        <input
                            type="text"
                            value={customDomain}
                            onChange={(e) => setCustomDomain(e.target.value)}
                            placeholder="app.miempresa.com"
                            className="w-full px-4 py-3 border border-gray-200 rounded-xl focus:ring-2 focus:ring-primary focus:border-transparent"
                        />
                        <p className="text-xs text-gray-500 mt-2">
                            Configura un CNAME en tu DNS apuntando a: <code className="bg-gray-100 px-2 py-1 rounded">blukastor.app</code>
                        </p>
                    </div>

                    <button
                        onClick={handleSaveDomain}
                        disabled={loading}
                        className="bg-primary text-white px-6 py-3 rounded-xl font-bold hover:bg-primary/90 transition disabled:opacity-50 flex items-center justify-center gap-2"
                    >
                        {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : null}
                        Guardar Dominio
                    </button>
                </div>
            </div>
        </div>
    )
}
