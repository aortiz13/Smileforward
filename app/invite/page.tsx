'use client';

import { useEffect, useState } from 'react';
import { createClient } from '@/utils/supabase/client';
import { useRouter } from 'next/navigation';
import { Loader2 } from 'lucide-react';

export default function InvitePage() {
    const router = useRouter();
    const [message, setMessage] = useState('Verificando invitación...');
    const supabase = createClient();

    useEffect(() => {
        let mounted = true;

        const handleInvite = async () => {
            // Listen for auth state changes
            const { data: { subscription } } = supabase.auth.onAuthStateChange(async (event, session) => {
                if (event === 'SIGNED_IN' || event === 'PASSWORD_RECOVERY' || (event === 'INITIAL_SESSION' && session)) {
                    if (mounted) {
                        setMessage('Acceso verificado. Redirigiendo...');
                        // Short delay to ensure session is set
                        setTimeout(() => {
                            router.push('/administracion/update-password');
                            router.refresh();
                        }, 500);
                    }
                }
            });

            // Specific check: if we have a hash, strictly wait for it to be processed
            // But if we are already logged in from before, getUser will return the user
            const { data: { user } } = await supabase.auth.getUser();
            if (user && mounted) {
                setMessage('Ya has iniciado sesión. Redirigiendo...');
                router.push('/administracion/update-password');
            } else {
                // If no user immediately, we wait for the listener.
                // If after a timeout we still have no session, we show error.
                // But only if there IS a hash. If there is NO hash, it's definitely an error.
                if (!window.location.hash || !window.location.hash.includes('access_token')) {
                    // Maybe it's PKCE (code=)?
                    if (!window.location.search.includes('code=')) {
                        setTimeout(() => {
                            if (mounted) setMessage('Enlace inválido: No se encontró token de acceso.');
                        }, 2000);
                    }
                } else {
                    // Valid hash, wait for Supabase to process it
                    setTimeout(() => {
                        if (mounted && message === 'Verificando invitación...') {
                            setMessage('El enlace parece haber expirado o es inválido.');
                        }
                    }, 8000); // Give it 8 seconds to process
                }
            }

            return () => {
                mounted = false;
                subscription.unsubscribe();
            };
        };

        handleInvite();
    }, [supabase, router]);

    return (
        <div className="flex h-screen w-full flex-col items-center justify-center space-y-4 bg-gray-50">
            <Loader2 className="h-8 w-8 animate-spin text-black" />
            <p className="text-sm text-gray-500">{message}</p>
        </div>
    );
}
