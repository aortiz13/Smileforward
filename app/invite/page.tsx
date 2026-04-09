'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { Loader2 } from 'lucide-react';

/**
 * Invite Page
 * With NextAuth, invites work via email with temporary credentials.
 * This page redirects users to login if they arrive here.
 */
export default function InvitePage() {
    const router = useRouter();
    const [message, setMessage] = useState('Verificando invitación...');

    useEffect(() => {
        // With NextAuth, the invite flow uses email with temp credentials.
        // If the user arrives here, redirect them to login.
        setTimeout(() => {
            setMessage('Redirigiendo al inicio de sesión...');
            router.push('/login');
        }, 2000);
    }, [router]);

    return (
        <div className="flex h-screen w-full flex-col items-center justify-center space-y-4 bg-gray-50">
            <Loader2 className="h-8 w-8 animate-spin text-black" />
            <p className="text-sm text-gray-500">{message}</p>
        </div>
    );
}
