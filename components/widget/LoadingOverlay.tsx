"use client";

import { motion, AnimatePresence } from "framer-motion";
import { Sparkles } from "lucide-react";

interface LoadingOverlayProps {
    visible: boolean;
    message: string;
}

export function LoadingOverlay({ visible, message }: LoadingOverlayProps) {
    return (
        <AnimatePresence>
            {visible && (
                <motion.div
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    exit={{ opacity: 0 }}
                    className="absolute inset-0 z-50 bg-white/80 dark:bg-zinc-950/80 backdrop-blur-md flex flex-col items-center justify-center p-6 text-center"
                >
                    <div className="bg-white dark:bg-zinc-900 p-8 rounded-[2rem] shadow-2xl border border-zinc-100 dark:border-zinc-800 max-w-sm w-full space-y-6">
                        <div className="relative w-16 h-16 mx-auto">
                            <div className="absolute inset-0 rounded-full border-4 border-zinc-100 dark:border-zinc-800"></div>
                            <div className="absolute inset-0 rounded-full border-4 border-black dark:border-white border-t-transparent animate-spin"></div>
                            <Sparkles className="absolute inset-0 m-auto w-6 h-6 text-black dark:text-white animate-pulse" />
                        </div>
                        <div className="space-y-2">
                            <h3 className="text-xl font-serif font-bold text-black dark:text-white">
                                {message}
                            </h3>
                            <p className="text-sm text-zinc-500 dark:text-zinc-400">
                                Estamos procesando tu solicitud...
                            </p>
                        </div>
                    </div>
                </motion.div>
            )}
        </AnimatePresence>
    );
}
