'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { Loader2 } from 'lucide-react'

interface CompanyActionsProps {
    companyId: string
    initialStatus: string
    isActive: boolean
}

export function CompanyActions({ companyId, initialStatus, isActive }: CompanyActionsProps) {
    const router = useRouter()
    const [loading, setLoading] = useState(false)

    const handleToggleSuspend = async () => {
        const newStatus = isActive ? 'suspended' : 'active'
        const action = isActive ? 'suspender' : 'reactivar'

        if (!confirm(`¿Estás seguro de que quieres ${action} esta empresa?`)) {
            return
        }

        setLoading(true)
        try {
            const res = await fetch(`/api/admin/companies/${companyId}`, {
                method: 'PATCH',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    is_active: !isActive,
                    instance_status: newStatus
                })
            })

            const data = await res.json()
            if (!res.ok) throw new Error(data.error)

            router.refresh()
            alert(`Empresa ${action === 'suspender' ? 'suspendida' : 'reactivada'} exitosamente`)
        } catch (error: any) {
            alert(`Error: ${error.message}`)
        } finally {
            setLoading(false)
        }
    }

    return (
        <div className="flex gap-3">
            <button
                onClick={handleToggleSuspend}
                disabled={loading}
                className="px-4 py-2 bg-white border border-gray-200 rounded-xl font-bold text-sm hover:bg-gray-50 transition disabled:opacity-50 flex items-center gap-2"
            >
                {loading ? <Loader2 className="w-3 h-3 animate-spin" /> : null}
                {isActive ? 'Suspender' : 'Reactivar'}
            </button>
        </div>
    )
}
