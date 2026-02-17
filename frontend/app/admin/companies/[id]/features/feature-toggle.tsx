'use client'

import { useState } from 'react'
import { ToggleLeft, ToggleRight, Settings } from 'lucide-react'

interface FeatureToggleProps {
    companyId: string
    featureKey: string
    featureName: string
    featureDescription: string
    initialEnabled: boolean
}

export function FeatureToggle({
    companyId,
    featureKey,
    featureName,
    featureDescription,
    initialEnabled,
}: FeatureToggleProps) {
    const [enabled, setEnabled] = useState(initialEnabled)
    const [loading, setLoading] = useState(false)

    const handleToggle = async () => {
        setLoading(true)
        try {
            const response = await fetch('/api/admin/features', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    company_id: companyId,
                    feature_key: featureKey,
                    enabled: !enabled,
                }),
            })

            if (!response.ok) {
                throw new Error('Failed to toggle feature')
            }

            setEnabled(!enabled)
        } catch (error) {
            console.error('Error toggling feature:', error)
            alert('Error al cambiar el estado de la feature')
        } finally {
            setLoading(false)
        }
    }

    return (
        <div className="flex items-center justify-between p-4 border border-gray-200 rounded-xl hover:border-gray-300 transition">
            <div className="flex-1">
                <div className="flex items-center gap-3 mb-1">
                    <h3 className="font-bold text-gray-900">{featureName}</h3>
                    {enabled && (
                        <span className="px-2 py-0.5 bg-green-100 text-green-700 text-xs font-bold rounded-full">
                            ACTIVA
                        </span>
                    )}
                </div>
                <p className="text-sm text-gray-600">{featureDescription}</p>
            </div>

            <div className="flex items-center gap-3">
                <button
                    onClick={handleToggle}
                    disabled={loading}
                    className={cn(
                        "relative w-14 h-8 rounded-full transition-colors duration-200 focus:outline-none focus:ring-2 focus:ring-primary/20",
                        enabled ? "bg-green-500" : "bg-gray-300",
                        loading && "opacity-50 cursor-not-allowed"
                    )}
                >
                    <span
                        className={cn(
                            "absolute top-1 left-1 w-6 h-6 bg-white rounded-full shadow-md transition-transform duration-200",
                            enabled && "transform translate-x-6"
                        )}
                    />
                </button>

                {featureKey.startsWith('agent:') && (
                    <button
                        className="p-2 text-gray-400 hover:text-gray-900 rounded-lg hover:bg-gray-100 transition"
                        title="Configurar agente"
                    >
                        <Settings className="w-5 h-5" />
                    </button>
                )}
            </div>
        </div>
    )
}

function cn(...inputs: any[]) {
    return inputs.filter(Boolean).join(' ')
}
