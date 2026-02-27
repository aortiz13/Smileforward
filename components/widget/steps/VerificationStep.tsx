"use client";

import { Turnstile } from "@marsidev/react-turnstile";

interface VerificationStepProps {
    onVerified: () => void;
}

export function VerificationStep({ onVerified }: VerificationStepProps) {
    return (
        <div className="flex-1 flex flex-col items-center justify-center space-y-6 animate-in fade-in zoom-in duration-500">
            <div className="text-center space-y-2">
                <h2 className="text-2xl font-serif text-black dark:text-white">Verificación de Seguridad</h2>
                <p className="text-sm text-zinc-500">Por favor completa el captcha para continuar.</p>
            </div>
            <Turnstile
                siteKey="0x4AAAAAACUl6BXJSwE0jdkl"
                onSuccess={() => onVerified()}
                options={{
                    size: 'normal',
                    theme: 'auto',
                }}
            />
        </div>
    );
}
