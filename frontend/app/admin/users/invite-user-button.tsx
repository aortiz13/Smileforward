'use client'

import { useState } from 'react'
import { InviteUserModal } from './invite-user-modal'

function Plus(props: any) {
    return (
        <svg {...props} fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
            <path d="M12 5v14M5 12h14" />
        </svg>
    )
}

export function InviteUserButton() {
    const [isModalOpen, setIsModalOpen] = useState(false)

    return (
        <>
            <button
                onClick={() => setIsModalOpen(true)}
                className="bg-black text-white px-6 py-3 rounded-xl font-bold flex items-center gap-2 hover:bg-gray-800 transition shadow-lg shadow-black/5"
            >
                <Plus size={20} />
                <span>Invitar Usuario</span>
            </button>

            <InviteUserModal
                isOpen={isModalOpen}
                onClose={() => setIsModalOpen(false)}
            />
        </>
    )
}
