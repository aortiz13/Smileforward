'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { X, UserPlus, Loader2, Mail, Shield, Building, FolderKanban } from 'lucide-react'

interface InviteUserModalProps {
    isOpen: boolean
    onClose: () => void
}

interface Company {
    id: string
    name: string
}

interface Project {
    id: string
    name: string
}

export function InviteUserModal({ isOpen, onClose }: InviteUserModalProps) {
    const router = useRouter()
    const [loading, setLoading] = useState(false)
    const [loadingCompanies, setLoadingCompanies] = useState(false)
    const [loadingProjects, setLoadingProjects] = useState(false)

    const [email, setEmail] = useState('')
    const [role, setRole] = useState('user')
    const [companyId, setCompanyId] = useState('')
    const [selectedProjects, setSelectedProjects] = useState<string[]>([])

    const [companies, setCompanies] = useState<Company[]>([])
    const [projects, setProjects] = useState<Project[]>([])

    // Fetch companies on mount
    useEffect(() => {
        if (isOpen) {
            fetchCompanies()
        }
    }, [isOpen])

    // Fetch projects when company changes
    useEffect(() => {
        if (companyId) {
            fetchProjects(companyId)
        } else {
            setProjects([])
            setSelectedProjects([])
        }
    }, [companyId])

    const fetchCompanies = async () => {
        setLoadingCompanies(true)
        try {
            const res = await fetch('/api/admin/companies')
            if (res.ok) {
                const data = await res.json()
                setCompanies(data.companies || [])
            }
        } catch (error) {
            console.error('Error fetching companies:', error)
        } finally {
            setLoadingCompanies(false)
        }
    }

    const fetchProjects = async (companyId: string) => {
        setLoadingProjects(true)
        try {
            const res = await fetch(`/api/admin/companies/${companyId}/projects`)
            if (res.ok) {
                const data = await res.json()
                setProjects(data.projects || [])
            }
        } catch (error) {
            console.error('Error fetching projects:', error)
        } finally {
            setLoadingProjects(false)
        }
    }

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault()

        if (!email || !companyId) {
            alert('Por favor completa todos los campos requeridos')
            return
        }

        setLoading(true)
        try {
            const res = await fetch('/api/admin/users/invite', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    email,
                    companyId,
                    role,
                    projectIds: selectedProjects.length > 0 ? selectedProjects : undefined
                })
            })

            const data = await res.json()

            if (!res.ok) {
                throw new Error(data.error || 'Error al invitar usuario')
            }

            alert('Usuario invitado exitosamente')
            handleClose()
            router.refresh()
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
            setCompanyId('')
            setSelectedProjects([])
            setProjects([])
            onClose()
        }
    }

    const toggleProject = (projectId: string) => {
        setSelectedProjects(prev =>
            prev.includes(projectId)
                ? prev.filter(id => id !== projectId)
                : [...prev, projectId]
        )
    }

    if (!isOpen) return null

    return (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
            <div className="bg-white rounded-3xl shadow-2xl max-w-2xl w-full overflow-hidden max-h-[90vh] flex flex-col">
                {/* Header */}
                <div className="bg-gradient-to-r from-primary to-purple-600 px-6 py-4 flex items-center justify-between">
                    <div className="flex items-center gap-3">
                        <div className="p-2 bg-white/20 rounded-xl">
                            <UserPlus className="w-5 h-5 text-white" />
                        </div>
                        <div>
                            <h2 className="text-xl font-black text-white">Invitar Usuario</h2>
                            <p className="text-sm text-white/80">Agregar un usuario a una empresa</p>
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
                <form onSubmit={handleSubmit} className="p-6 space-y-4 overflow-y-auto flex-1">
                    {/* Email */}
                    <div>
                        <label className="block text-sm font-bold text-gray-700 mb-2 flex items-center gap-2">
                            <Mail className="w-4 h-4" />
                            Email del Usuario *
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
                            Si el usuario no existe, se enviará una invitación automáticamente
                        </p>
                    </div>

                    {/* Company */}
                    <div>
                        <label className="block text-sm font-bold text-gray-700 mb-2 flex items-center gap-2">
                            <Building className="w-4 h-4" />
                            Empresa *
                        </label>
                        <select
                            value={companyId}
                            onChange={(e) => setCompanyId(e.target.value)}
                            disabled={loading || loadingCompanies}
                            required
                            className="w-full px-4 py-3 border border-gray-200 rounded-xl focus:ring-2 focus:ring-primary focus:border-transparent disabled:opacity-50 disabled:bg-gray-50"
                        >
                            <option value="">Selecciona una empresa...</option>
                            {companies.map((company) => (
                                <option key={company.id} value={company.id}>
                                    {company.name}
                                </option>
                            ))}
                        </select>
                    </div>

                    {/* Role */}
                    <div>
                        <label className="block text-sm font-bold text-gray-700 mb-2 flex items-center gap-2">
                            <Shield className="w-4 h-4" />
                            Rol *
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
                        <div className="bg-gray-50 rounded-xl p-3 mt-2 space-y-1 text-xs text-gray-600">
                            <p><strong>Usuario:</strong> Acceso básico a la plataforma</p>
                            <p><strong>Administrador:</strong> Gestión de usuarios y configuración</p>
                            <p><strong>Propietario:</strong> Control total de la instancia</p>
                        </div>
                    </div>

                    {/* Projects */}
                    {companyId && (
                        <div>
                            <label className="block text-sm font-bold text-gray-700 mb-2 flex items-center gap-2">
                                <FolderKanban className="w-4 h-4" />
                                Proyectos (Opcional)
                            </label>
                            {loadingProjects ? (
                                <div className="flex items-center justify-center py-4">
                                    <Loader2 className="w-5 h-5 animate-spin text-primary" />
                                </div>
                            ) : projects.length > 0 ? (
                                <div className="border border-gray-200 rounded-xl p-4 space-y-2 max-h-40 overflow-y-auto">
                                    {projects.map((project) => (
                                        <label
                                            key={project.id}
                                            className="flex items-center gap-2 cursor-pointer hover:bg-gray-50 p-2 rounded-lg transition"
                                        >
                                            <input
                                                type="checkbox"
                                                checked={selectedProjects.includes(project.id)}
                                                onChange={() => toggleProject(project.id)}
                                                disabled={loading}
                                                className="w-4 h-4 text-primary rounded focus:ring-2 focus:ring-primary"
                                            />
                                            <span className="text-sm text-gray-700">{project.name}</span>
                                        </label>
                                    ))}
                                </div>
                            ) : (
                                <p className="text-sm text-gray-500 italic py-4 text-center">
                                    Esta empresa no tiene proyectos aún
                                </p>
                            )}
                            <p className="text-xs text-gray-500 mt-2">
                                Asigna proyectos específicos o déjalo vacío para acceso general
                            </p>
                        </div>
                    )}
                </form>

                {/* Actions */}
                <div className="p-6 border-t border-gray-100 flex gap-3">
                    <button
                        type="button"
                        onClick={handleClose}
                        disabled={loading}
                        className="flex-1 px-6 py-3 border border-gray-200 rounded-xl font-bold hover:bg-gray-50 transition disabled:opacity-50"
                    >
                        Cancelar
                    </button>
                    <button
                        onClick={handleSubmit}
                        disabled={loading || !email || !companyId}
                        className="flex-1 bg-primary text-white px-6 py-3 rounded-xl font-bold hover:bg-primary/90 transition disabled:opacity-50 flex items-center justify-center gap-2"
                    >
                        {loading ? (
                            <>
                                <Loader2 className="w-4 h-4 animate-spin" />
                                Invitando...
                            </>
                        ) : (
                            <>
                                <UserPlus className="w-4 h-4" />
                                Invitar Usuario
                            </>
                        )}
                    </button>
                </div>
            </div>
        </div>
    )
}
