'use client'

import { useState } from 'react'
import { AddUserModal } from './add-user-modal'

interface AddUserButtonProps {
    companyId: string
    companyName: string
}

export function AddUserButton({ companyId, companyName }: AddUserButtonProps) {
    const [isModalOpen, setIsModalOpen] = useState(false)

    return (
        <>
            <button
                onClick={() => setIsModalOpen(true)}
                className="bg-primary text-white px-6 py-3 rounded-xl font-bold hover:bg-primary/90 transition"
            >
                + Agregar Usuario
            </button>

            <AddUserModal
                companyId={companyId}
                companyName={companyName}
                isOpen={isModalOpen}
                onClose={() => setIsModalOpen(false)}
            />
        </>
    )
}
