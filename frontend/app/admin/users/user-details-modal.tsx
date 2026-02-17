'use client'

import { useEffect, useState } from 'react'
import { X, Building2, Activity } from 'lucide-react'

interface UserDetails {
    id: string
    auth_user_id: string
    email?: string
    phone?: string
    real_name?: string
    push_name?: string
    nickname?: string
    role?: string
    company_id?: string
    company_name?: string
    projects?: Array<{ id: string; name: string; role: string }>
    created_at?: string
    last_sign_in_at?: string
    last_seen?: string
    is_admin: boolean
    is_wa_only: boolean
    tags?: string[]
    attributes?: Record<string, any>
    notes?: string
}

interface UserDetailsModalProps {
    isOpen: boolean
    onClose: () => void
    userId: string
    userEmail: string
}

// Skeleton component for loading state
function DataField({ label, value, loading }: { label: string; value?: string; loading?: boolean }) {
    return (
        <div className="py-3 border-b border-gray-100 last:border-0">
            <dt className="text-xs font-medium text-gray-500 mb-1">{label}</dt>
            <dd className="text-sm font-semibold text-gray-900">
                {loading ? (
                    <div className="h-4 w-32 bg-gray-200 rounded animate-pulse" />
                ) : (
                    value || <span className="text-gray-400">No disponible</span>
                )}
            </dd>
        </div>
    )
}

export function UserDetailsModal({ isOpen, onClose, userId, userEmail }: UserDetailsModalProps) {
    const [loading, setLoading] = useState(true)
    const [userDetails, setUserDetails] = useState<UserDetails | null>(null)
    const [error, setError] = useState<string | null>(null)

    // Handle ESC key
    useEffect(() => {
        const handleEsc = (e: KeyboardEvent) => {
            if (e.key === 'Escape') onClose()
        }
        if (isOpen) {
            window.addEventListener('keydown', handleEsc)
            return () => window.removeEventListener('keydown', handleEsc)
        }
    }, [isOpen, onClose])

    useEffect(() => {
        if (isOpen && userId) {
            fetchUserDetails()
        }
    }, [isOpen, userId])

    const fetchUserDetails = async () => {
        setLoading(true)
        setError(null)

        try {
            const res = await fetch(`/api/admin/users/${userId}/details`)

            if (!res.ok) {
                throw new Error('Error al cargar detalles del usuario')
            }

            const data = await res.json()
            setUserDetails(data.user)
        } catch (err: any) {
            setError(err.message)
        } finally {
            setLoading(false)
        }
    }

    if (!isOpen) return null

    const displayName = userDetails?.real_name || userDetails?.push_name || userDetails?.nickname || userDetails?.email || userDetails?.phone || userEmail
    const lastActivity = userDetails?.last_seen || userDetails?.last_sign_in_at

    return (
        <div
            className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4"
            onClick={onClose}
        >
            <div
                className="bg-white rounded-xl shadow-xl max-w-2xl w-full max-h-[90vh] overflow-hidden"
                onClick={(e) => e.stopPropagation()}
            >
                {/* Compact Header */}
                <div className="bg-gray-900 px-6 py-4 flex items-center justify-between">
                    <div>
                        <h2 className="text-lg font-bold text-white">{displayName}</h2>
                        {userDetails?.is_admin && (
                            <span className="text-xs text-purple-300 font-medium">
                                {userDetails.role}
                            </span>
                        )}
                    </div>
                    <button
                        onClick={onClose}
                        className="text-white/70 hover:text-white transition-colors p-1"
                        aria-label="Cerrar modal"
                    >
                        <X size={20} />
                    </button>
                </div>

                {/* Content */}
                <div className="overflow-y-auto max-h-[calc(90vh-80px)]">
                    {error && (
                        <div className="m-6 p-4 bg-red-50 border-l-4 border-red-500 text-red-700">
                            <p className="font-semibold">Error</p>
                            <p className="text-sm mt-1">{error}</p>
                            <button
                                onClick={fetchUserDetails}
                                className="mt-2 text-sm underline hover:no-underline"
                            >
                                Reintentar
                            </button>
                        </div>
                    )}

                    {!error && (
                        <div className="p-6 space-y-6">
                            {/* Contact Information */}
                            {(userDetails?.email || userDetails?.phone || userDetails?.real_name || userDetails?.push_name || userDetails?.nickname) && (
                                <section>
                                    <h3 className="text-sm font-bold text-gray-900 mb-3">Información de Contacto</h3>
                                    <dl className="bg-gray-50 rounded-lg px-4 divide-y divide-gray-100">
                                        {userDetails?.email && (
                                            <DataField label="Email" value={userDetails.email} loading={loading} />
                                        )}
                                        {userDetails?.phone && (
                                            <DataField label="Teléfono" value={userDetails.phone} loading={loading} />
                                        )}
                                        {userDetails?.real_name && (
                                            <DataField label="Nombre real" value={userDetails.real_name} loading={loading} />
                                        )}
                                        {userDetails?.push_name && !userDetails?.real_name && (
                                            <DataField label="Nombre" value={userDetails.push_name} loading={loading} />
                                        )}
                                        {userDetails?.push_name && userDetails?.real_name && userDetails.push_name !== userDetails.real_name && (
                                            <DataField label="Nombre WhatsApp" value={userDetails.push_name} loading={loading} />
                                        )}
                                        {userDetails?.nickname && (
                                            <DataField label="Apodo" value={userDetails.nickname} loading={loading} />
                                        )}
                                    </dl>
                                </section>
                            )}

                            {/* Company & Activity */}
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                {/* Company */}
                                {userDetails?.company_name && (
                                    <section>
                                        <h3 className="text-sm font-bold text-gray-900 mb-3 flex items-center gap-2">
                                            <Building2 size={16} />
                                            Empresa
                                        </h3>
                                        <div className="bg-gray-50 rounded-lg p-4">
                                            <p className="font-semibold text-gray-900">{userDetails.company_name}</p>
                                            <p className="text-xs text-gray-500 mt-1 font-mono">
                                                {userDetails.company_id?.slice(0, 13)}...
                                            </p>
                                        </div>
                                    </section>
                                )}

                                {/* Activity */}
                                <section>
                                    <h3 className="text-sm font-bold text-gray-900 mb-3 flex items-center gap-2">
                                        <Activity size={16} />
                                        Actividad
                                    </h3>
                                    <dl className="bg-gray-50 rounded-lg px-4 divide-y divide-gray-100">
                                        <DataField
                                            label="Ingreso"
                                            value={userDetails?.created_at
                                                ? new Date(userDetails.created_at).toLocaleDateString('es-ES', {
                                                    day: 'numeric',
                                                    month: 'short',
                                                    year: 'numeric'
                                                })
                                                : undefined
                                            }
                                            loading={loading}
                                        />
                                        <DataField
                                            label="Última vez"
                                            value={lastActivity
                                                ? new Date(lastActivity).toLocaleDateString('es-ES', {
                                                    day: 'numeric',
                                                    month: 'short',
                                                    hour: '2-digit',
                                                    minute: '2-digit'
                                                })
                                                : 'Nunca'
                                            }
                                            loading={loading}
                                        />
                                    </dl>
                                </section>
                            </div>

                            {/* Projects */}
                            {userDetails?.projects && userDetails.projects.length > 0 && (
                                <section>
                                    <h3 className="text-sm font-bold text-gray-900 mb-3">
                                        Proyectos ({userDetails.projects.length})
                                    </h3>
                                    <div className="space-y-2">
                                        {userDetails.projects.map((project) => (
                                            <div
                                                key={project.id}
                                                className="bg-gray-50 rounded-lg p-3 flex items-center justify-between"
                                            >
                                                <div>
                                                    <p className="font-semibold text-sm text-gray-900">{project.name}</p>
                                                    <p className="text-xs text-gray-500">Rol: {project.role}</p>
                                                </div>
                                            </div>
                                        ))}
                                    </div>
                                </section>
                            )}

                            {/* Tags */}
                            {userDetails?.tags && userDetails.tags.length > 0 && (
                                <section>
                                    <h3 className="text-sm font-bold text-gray-900 mb-3">Tags</h3>
                                    <div className="flex flex-wrap gap-2">
                                        {userDetails.tags.map((tag, idx) => (
                                            <span
                                                key={idx}
                                                className="bg-gray-100 text-gray-700 px-3 py-1 rounded-full text-xs font-medium"
                                            >
                                                {tag}
                                            </span>
                                        ))}
                                    </div>
                                </section>
                            )}

                            {/* Notes */}
                            {userDetails?.notes && (
                                <section>
                                    <h3 className="text-sm font-bold text-gray-900 mb-3">Notas</h3>
                                    <div className="bg-gray-50 rounded-lg p-4">
                                        <p className="text-sm text-gray-700 whitespace-pre-wrap leading-relaxed">
                                            {userDetails.notes}
                                        </p>
                                    </div>
                                </section>
                            )}
                        </div>
                    )}
                </div>
            </div>
        </div>
    )
}
