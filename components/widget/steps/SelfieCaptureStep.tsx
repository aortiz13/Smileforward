"use client";

import { motion } from "framer-motion";
import { Loader2, Share2, Smartphone } from "lucide-react";
import { Button } from "@/components/ui/button";
import { SelfieCaptureFlow } from "@/components/selfie/SelfieCaptureFlow";
import QRCode from "react-qr-code";

interface SelfieCaptureStepProps {
    mobileConnected: boolean;
    qrUrl: string | null;
    onCapture: (file: File) => void;
    onCancel: () => void;
}

export function SelfieCaptureStep({ mobileConnected, qrUrl, onCapture, onCancel }: SelfieCaptureStepProps) {
    return (
        <motion.div
            key="selfie"
            initial={{ opacity: 0, scale: 0.98 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.98 }}
            className="h-full w-full flex flex-col items-center justify-center p-0 md:p-4"
        >
            {mobileConnected ? (
                <div className="flex flex-col items-center justify-center space-y-8 animate-in fade-in zoom-in duration-500 text-center max-w-lg">
                    <div className="p-8 bg-teal-50 dark:bg-teal-900/20 rounded-full animate-pulse">
                        <Smartphone className="w-16 h-16 text-teal-600 dark:text-teal-400" strokeWidth={1.5} />
                    </div>
                    <div className="space-y-4">
                        <h3 className="text-3xl font-serif text-black dark:text-white">Esperando fotografía</h3>
                        <p className="text-lg text-zinc-500 dark:text-zinc-400">
                            Tómate la selfie con tu móvil
                        </p>
                    </div>
                    <div className="flex items-center gap-2 text-sm text-zinc-400">
                        <Loader2 className="w-4 h-4 animate-spin" />
                        <span>Sincronizando en tiempo real...</span>
                    </div>
                </div>
            ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-8 w-full max-w-4xl h-full max-h-[600px]">
                    {/* Column 1: Webcam */}
                    <div className="relative rounded-2xl overflow-hidden shadow-2xl bg-black flex flex-col h-full w-full">
                        <SelfieCaptureFlow
                            onCapture={onCapture}
                            onCancel={onCancel}
                        />
                    </div>

                    {/* Column 2: QR Code - Hidden on mobile */}
                    <div className="hidden md:flex flex-col items-center justify-center bg-zinc-50 dark:bg-zinc-900 rounded-2xl p-8 border border-zinc-200 dark:border-zinc-800 text-center space-y-6">
                        <div className="space-y-2">
                            <div className="flex items-center justify-between mb-2">
                                <Button
                                    variant="ghost"
                                    size="sm"
                                    onClick={onCancel}
                                    className="text-zinc-500 hover:text-black dark:hover:text-white"
                                >
                                    <Share2 className="w-4 h-4 mr-2 rotate-180" />
                                    Volver
                                </Button>
                            </div>
                            <h3 className="text-xl font-serif text-black dark:text-white">Usa tu móvil</h3>
                            <p className="text-sm text-zinc-500">Escanea este código para usar la cámara de tu teléfono.</p>
                        </div>

                        <div className="p-4 bg-white rounded-xl shadow-sm border border-zinc-100">
                            {qrUrl ? (
                                <QRCode value={qrUrl} size={180} />
                            ) : (
                                <div className="w-[180px] h-[180px] flex items-center justify-center">
                                    <Loader2 className="w-8 h-8 animate-spin text-zinc-300" />
                                </div>
                            )}
                        </div>

                        <p className="text-xs text-zinc-400 px-4">
                            La foto se sincronizará automáticamente aquí una vez la tomes.
                        </p>
                    </div>
                </div>
            )}
        </motion.div>
    );
}
