"use client";

import { motion } from "framer-motion";
import { Check } from "lucide-react";
import { Button } from "@/components/ui/button";

type SuccessVariant = "photo" | "clinical" | "email_sent";

interface SuccessStepProps {
    variant: SuccessVariant;
    userEmail: string;
    onBack: () => void;
}

const CONTENT: Record<SuccessVariant, { title: string; subtitle: (email: string) => React.ReactNode; note?: string; backLabel: string; backAction?: string }> = {
    photo: {
        title: "Solicitud enviada con éxito",
        subtitle: (email) => <>Hemos enviado su foto al correo <span className="font-bold text-black dark:text-white text-base md:text-lg">{email}</span></>,
        backLabel: "Volver al resultado",
    },
    clinical: {
        title: "Solicitud enviada con éxito",
        subtitle: (email) => <>Hemos recibido su solicitud y enviado su foto al correo <br /><span className="font-bold text-black dark:text-white text-lg md:text-xl">{email}</span></>,
        note: "En breve nuestro equipo se pondrá en contacto con usted para coordinar su cita.",
        backLabel: "Volver al resultado",
    },
    email_sent: {
        title: "Tu foto ha sido enviada vía correo electrónico",
        subtitle: (email) => <>al correo <span className="font-semibold text-black dark:text-white">{email}</span></>,
        note: "Revisa tu correo ahora, si no la recibes escríbenos.",
        backLabel: "Escríbenos",
        backAction: "https://dentalcorbella.com/contacto/",
    },
};

export function SuccessStep({ variant, userEmail, onBack }: SuccessStepProps) {
    const c = CONTENT[variant];

    const handleBack = () => {
        if (c.backAction) {
            window.location.href = c.backAction;
        } else {
            onBack();
        }
    };

    return (
        <motion.div
            key={`success-${variant}`}
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            className="h-full flex items-center justify-center p-4 md:p-8"
        >
            <div className={`${variant === "clinical" ? "max-w-md" : "max-w-sm"} w-full text-center space-y-6 p-8 bg-white dark:bg-zinc-900 rounded-[2rem] shadow-2xl border border-zinc-100 dark:border-zinc-800`}>
                <div className="w-16 h-16 mx-auto bg-green-50 dark:bg-green-900/30 rounded-full flex items-center justify-center mb-2">
                    <Check className="w-8 h-8 text-green-500" strokeWidth={3} />
                </div>

                <div className={variant === "clinical" ? "space-y-4" : "space-y-3"}>
                    <h2 className={`${variant === "email_sent" ? "text-2xl md:text-3xl" : "text-xl md:text-2xl"} font-sans font-bold text-black dark:text-white leading-tight`}>
                        {c.title}
                    </h2>
                    <div className="space-y-1">
                        <p className="text-zinc-500 dark:text-zinc-400 text-sm md:text-base font-sans">
                            {c.subtitle(userEmail)}
                        </p>
                        {c.note && (
                            <p className={`text-zinc-500 dark:text-zinc-400 text-sm ${variant === "clinical" ? "md:text-base italic" : ""} font-sans`}>
                                {c.note}
                            </p>
                        )}
                    </div>
                </div>

                <Button
                    onClick={handleBack}
                    variant={variant === "email_sent" ? "default" : "outline"}
                    className={variant === "email_sent"
                        ? "w-full h-12 rounded-full bg-black text-white hover:bg-zinc-800 dark:bg-white dark:text-black dark:hover:bg-zinc-200 text-sm font-medium tracking-wide shadow-lg"
                        : "h-12 rounded-full px-8 border-zinc-200 text-zinc-600 hover:text-black hover:border-black transition-all"
                    }
                >
                    {c.backLabel}
                </Button>
            </div>
        </motion.div>
    );
}
