'use client'

import { createClient } from '@/lib/supabase/client'
import { useRouter } from 'next/navigation'
import { LogOut } from 'lucide-react'

export function LogoutButton() {
    const router = useRouter()
    const supabase = createClient()

    const handleLogout = async () => {
        await supabase.auth.signOut()
        router.refresh()
        router.push('/login')
    }

    return (
        <button
            onClick={handleLogout}
            className="flex items-center justify-center gap-2 bg-white text-gray-900 border border-gray-200 px-6 py-4 rounded-xl font-bold hover:bg-gray-50 transition w-full md:w-auto"
        >
            <LogOut size={20} className="text-gray-400" />
            Cerrar Sesión
        </button>
    )
}
