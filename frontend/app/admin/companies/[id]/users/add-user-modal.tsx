'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { X, UserPlus, Loader2, Mail, Shield } from 'lucide-react'

interface AddUserModalProps {
    companyId: string
    companyName: string
    isOpen: boolean
    onClose: () => void
}

export function AddUserModal({ companyId, companyName, isOpen, onClose }: AddUserModalProps) {
    const router = useRouter()
    const [loading, setLoading] = useState(false)
    const [email, setEmail] = useState('')
    const [role, setRole] = useState('user')

    if (!isOpen) return null

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault()

        if (!email) {
            alert('Por favor ingresa un email')
            return
        }

        setLoading(true)
        try {
            const res = await fetch(`/api/admin/companies/${companyId}/users`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ email, role })
            })

            const data = await res.json()

            if (!res.ok) {
                throw new Error(data.error || 'Error al agregar usuario')
            }

            alert('Usuario agregado exitosamente')
            setEmail('')
            setRole('user')
            router.refresh()
            onClose()
        } catch (error: any) {
            alert(`Error: ${error.message}`)
        } finally {
            setLoading(false)
        }
    }

    const handleClose = () => {
        if (!loading) {
            setEmail('')
            setRole('user')
            onClose()
        }
    }

    return (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
            <div className="bg-white rounded-3xl shadow-2xl max-w-md w-full overflow-hidden">
                {/* Header */}
                <div className="bg-gradient-to-r from-primary to-purple-600 px-6 py-4 flex items-center justify-between">
                    <div className="flex items-center gap-3">
                        <div className="p-2 bg-white/20 rounded-xl">
                            <UserPlus className="w-5 h-5 text-white" />
                        </div>
                        <div>
                            <h2 className="text-xl font-black text-white">Agregar Usuario</h2>
                            <p className="text-sm text-white/80">{companyName}</p>
                        </div>
                    </div>
                    <button
                        onClick={handleClose}
                        disabled={loading}
                        className="p-2 hover:bg-white/20 rounded-xl transition disabled:opacity-50"
                    >
                        <X className="w-5 h-5 text-white" />
                    </button>
                </div>

                {/* Form */}
                <form onSubmit={handleSubmit} className="p-6 space-y-4">
                    <div>
                        <label className="block text-sm font-bold text-gray-700 mb-2 flex items-center gap-2">
                            <Mail className="w-4 h-4" />
                            Email del Usuario
                        </label>
                        <input
                            type="email"
                            value={email}
                            onChange={(e) => setEmail(e.target.value)}
                            placeholder="usuario@ejemplo.com"
                            required
                            disabled={loading}
                            className="w-full px-4 py-3 border border-gray-200 rounded-xl focus:ring-2 focus:ring-primary focus:border-transparent disabled:opacity-50 disabled:bg-gray-50"
                        />
                        <p className="text-xs text-gray-500 mt-2">
                            El usuario debe tener una cuenta existente en el sistema
                        </p>
                    </div>

                    <div>
                        <label className="block text-sm font-bold text-gray-700 mb-2 flex items-center gap-2">
                            <Shield className="w-4 h-4" />
                            Rol
                        </label>
                        <select
                            value={role}
                            onChange={(e) => setRole(e.target.value)}
                            disabled={loading}
                            className="w-full px-4 py-3 border border-gray-200 rounded-xl focus:ring-2 focus:ring-primary focus:border-transparent disabled:opacity-50 disabled:bg-gray-50"
                        >
                            <option value="user">Usuario</option>
                            <option value="admin">Administrador</option>
                            <option value="owner">Propietario</option>
                        </select>
                        <p className="text-xs text-gray-500 mt-2">
                            Define los permisos del usuario en esta instancia
                        </p>
                    </div>

                    {/* Role Descriptions */}
                    <div className="bg-gray-50 rounded-xl p-4 space-y-2">
                        <p className="text-xs font-bold text-gray-700">Descripción de roles:</p>
                        <div className="space-y-1 text-xs text-gray-600">
                            <p><strong>Usuario:</strong> Acceso básico a la plataforma</p>
                            <p><strong>Administrador:</strong> Gestión de usuarios y configuración</p>
                            <p><strong>Propietario:</strong> Control total de la instancia</p>
                        </div>
                    </div>

                    {/* Actions */}
                    <div className="flex gap-3 pt-4">
                        <button
                            type="button"
                            onClick={handleClose}
                            disabled={loading}
                            className="flex-1 px-6 py-3 border border-gray-200 rounded-xl font-bold hover:bg-gray-50 transition disabled:opacity-50"
                        >
                            Cancelar
                        </button>
                        <button
                            type="submit"
                            disabled={loading}
                            className="flex-1 bg-primary text-white px-6 py-3 rounded-xl font-bold hover:bg-primary/90 transition disabled:opacity-50 flex items-center justify-center gap-2"
                        >
                            {loading ? (
                                <>
                                    <Loader2 className="w-4 h-4 animate-spin" />
                                    Agregando...
                                </>
                            ) : (
                                <>
                                    <UserPlus className="w-4 h-4" />
                                    Agregar Usuario
                                </>
                            )}
                        </button>
                    </div>
                </form>
            </div>
        </div>
    )
}
