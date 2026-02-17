'use client'

import { useState } from 'react'
import { inviteUserToProject, revokeInvite, removeMember } from '@/lib/actions/project-sharing'
import { UserPlus, Loader2, Trash2, XCircle } from 'lucide-react'
import { useRouter } from 'next/navigation'

export function InviteMemberModal({ projectId }: { projectId: string }) {
    const [isOpen, setIsOpen] = useState(false)
    const [email, setEmail] = useState('')
    const [role, setRole] = useState<'editor' | 'viewer'>('editor')
    const [loading, setLoading] = useState(false)
    const [error, setError] = useState('')

    const handleInvite = async (e: React.FormEvent) => {
        e.preventDefault()
        setLoading(true)
        setError('')

        const res = await inviteUserToProject(projectId, email, role)

        setLoading(false)
        if (res.error) {
            setError(res.error)
        } else {
            setIsOpen(false)
            setEmail('')
        }
    }

    if (!isOpen) {
        return (
            <button
                onClick={() => setIsOpen(true)}
                className="bg-black text-white px-6 py-3 rounded-xl font-bold flex items-center gap-2 hover:bg-gray-800 transition shadow-lg shadow-black/5 text-sm"
            >
                <UserPlus size={18} />
                <span>Invitar Miembro</span>
            </button>
        )
    }

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
            <div className="bg-white rounded-3xl p-8 w-full max-w-md shadow-2xl animate-in fade-in zoom-in-95 duration-200">
                <h2 className="text-2xl font-bold mb-1">Invitar Miembro</h2>
                <p className="text-gray-500 text-sm mb-6">Envía una invitación por correo electrónico.</p>

                <form onSubmit={handleInvite} className="space-y-4">
                    <div>
                        <label className="block text-xs font-bold text-gray-500 uppercase tracking-widest mb-2">Email</label>
                        <input
                            type="email"
                            required
                            value={email}
                            onChange={(e) => setEmail(e.target.value)}
                            className="w-full bg-gray-50 border border-gray-200 rounded-xl px-4 py-3 focus:outline-none focus:ring-2 focus:ring-black/5"
                            placeholder="colaborador@ejemplo.com"
                        />
                    </div>

                    <div>
                        <label className="block text-xs font-bold text-gray-500 uppercase tracking-widest mb-2">Rol</label>
                        <select
                            value={role}
                            onChange={(e) => setRole(e.target.value as any)}
                            className="w-full bg-gray-50 border border-gray-200 rounded-xl px-4 py-3 focus:outline-none focus:ring-2 focus:ring-black/5"
                        >
                            <option value="editor">Editor (Puede editar)</option>
                            <option value="viewer">Viewer (Solo lectura)</option>
                        </select>
                    </div>

                    {error && (
                        <p className="text-red-500 text-sm bg-red-50 p-3 rounded-xl font-medium">{error}</p>
                    )}

                    <div className="flex gap-3 pt-2">
                        <button
                            type="button"
                            onClick={() => setIsOpen(false)}
                            className="flex-1 bg-gray-100 text-gray-600 py-3 rounded-xl font-bold hover:bg-gray-200 transition"
                        >
                            Cancelar
                        </button>
                        <button
                            type="submit"
                            disabled={loading}
                            className="flex-1 bg-black text-white py-3 rounded-xl font-bold hover:bg-gray-800 transition disabled:opacity-50 flex items-center justify-center gap-2"
                        >
                            {loading && <Loader2 size={16} className="animate-spin" />}
                            Enviar
                        </button>
                    </div>
                </form>
            </div>
        </div>
    )
}

export function RevokeInviteButton({ inviteId }: { inviteId: string }) {
    const [loading, setLoading] = useState(false)

    const handleRevoke = async () => {
        if (!confirm('¿Estás seguro de cancelar esta invitación?')) return
        setLoading(true)
        await revokeInvite(inviteId)
        setLoading(false)
    }

    return (
        <button
            onClick={handleRevoke}
            disabled={loading}
            className="text-xs font-bold text-red-500 p-2 opacity-0 group-hover:opacity-100 transition-opacity hover:bg-red-50 rounded-lg"
        >
            {loading ? <Loader2 size={14} className="animate-spin" /> : 'Cancelar'}
        </button>
    )
}

export function RemoveMemberButton({ memberId }: { memberId: string }) {
    const [loading, setLoading] = useState(false)

    const handleRemove = async () => {
        if (!confirm('¿Estás seguro de eliminar a este miembro del proyecto?')) return
        setLoading(true)
        await removeMember(memberId)
        setLoading(false)
    }

    return (
        <button
            onClick={handleRemove}
            disabled={loading}
            className="text-gray-300 hover:text-red-500 p-2 rounded-lg transition-colors opacity-0 group-hover:opacity-100"
        >
            {loading ? <Loader2 size={18} className="animate-spin" /> : <Trash2 size={18} />}
        </button>
    )
}
