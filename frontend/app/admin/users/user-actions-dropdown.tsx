'use client'

import { useState, useRef, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { MoreVertical, Eye, Trash2 } from 'lucide-react'
import { UserDetailsModal } from './user-details-modal'

interface UserActionsDropdownProps {
    userId: string
    userEmail: string
    companyId?: string
    isAdmin?: boolean
}

export function UserActionsDropdown({ userId, userEmail, companyId, isAdmin = false }: UserActionsDropdownProps) {
    const router = useRouter()
    const [isOpen, setIsOpen] = useState(false)
    const [showDetailsModal, setShowDetailsModal] = useState(false)
    const dropdownRef = useRef<HTMLDivElement>(null)

    // Close dropdown when clicking outside
    useEffect(() => {
        function handleClickOutside(event: MouseEvent) {
            if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
                setIsOpen(false)
            }
        }

        if (isOpen) {
            document.addEventListener('mousedown', handleClickOutside)
            return () => document.removeEventListener('mousedown', handleClickOutside)
        }
    }, [isOpen])

    const handleViewDetails = () => {
        setShowDetailsModal(true)
        setIsOpen(false)
    }

    const handleEditRole = () => {
        // TODO: Open a modal to edit user role
        alert('Funcionalidad de edición de rol próximamente')
        setIsOpen(false)
    }

    const handleManageProjects = () => {
        // TODO: Open a modal to manage project access
        alert('Funcionalidad de gestión de proyectos próximamente')
        setIsOpen(false)
    }

    const handleRemoveUser = async () => {
        if (!confirm(`¿Estás seguro de que quieres remover a ${userEmail}?`)) {
            return
        }

        try {
            const res = await fetch(`/api/admin/users/${userId}`, {
                method: 'DELETE'
            })

            if (!res.ok) {
                const data = await res.json()
                throw new Error(data.error || 'Error al remover usuario')
            }

            alert('Usuario removido exitosamente')
            router.refresh()
        } catch (error: any) {
            alert(`Error: ${error.message}`)
        }

        setIsOpen(false)
    }

    return (
        <div className="relative" ref={dropdownRef}>
            <button
                onClick={() => setIsOpen(!isOpen)}
                className="text-gray-400 hover:text-black p-2 rounded-lg transition-colors"
            >
                <MoreVertical size={20} />
            </button>

            {isOpen && (
                <div className="absolute right-0 mt-2 w-56 bg-white rounded-xl shadow-lg border border-gray-100 py-2 z-50">
                    <button
                        onClick={handleViewDetails}
                        className="w-full px-4 py-2 text-left text-sm text-gray-700 hover:bg-gray-50 flex items-center gap-3 transition-colors"
                    >
                        <Eye size={16} className="text-gray-400" />
                        <span>Ver detalles</span>
                    </button>

                    {isAdmin && (
                        <>
                            <div className="my-1 border-t border-gray-100"></div>

                            <button
                                onClick={handleRemoveUser}
                                className="w-full px-4 py-2 text-left text-sm text-red-600 hover:bg-red-50 flex items-center gap-3 transition-colors"
                            >
                                <Trash2 size={16} />
                                <span>Remover acceso</span>
                            </button>
                        </>
                    )}
                </div>
            )}

            <UserDetailsModal
                isOpen={showDetailsModal}
                onClose={() => setShowDetailsModal(false)}
                userId={userId}
                userEmail={userEmail}
            />
        </div>
    )
}
