"use client";

import { motion } from "framer-motion";
import { UploadCloud, Check, ScanFace } from "lucide-react";
import { Button } from "@/components/ui/button";

interface UploadStepProps {
    fileInputRef: React.RefObject<HTMLInputElement | null>;
    onUpload: (file: File) => void;
    onSelfieCaptureStart: () => void;
}

export function UploadStep({ fileInputRef, onUpload, onSelfieCaptureStart }: UploadStepProps) {
    return (
        <motion.div
            key="upload"
            initial={{ opacity: 0, scale: 0.98 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.98 }}
            className="h-full flex flex-col justify-center items-center text-center space-y-8"
        >
            <div
                className="group relative w-full aspect-square md:aspect-[4/3] max-w-[280px] md:max-w-sm border border-dashed border-zinc-300 dark:border-zinc-700 rounded-[2rem] hover:border-teal-500/50 hover:bg-zinc-50 dark:hover:bg-zinc-900 transition-all flex flex-col items-center justify-center cursor-pointer overflow-hidden bg-zinc-50/50 dark:bg-zinc-900/50"
                onDragOver={(e) => e.preventDefault()}
                onDrop={(e) => {
                    e.preventDefault();
                    if (e.dataTransfer.files?.[0]) onUpload(e.dataTransfer.files[0]);
                }}
                onClick={() => fileInputRef.current?.click()}
            >
                <div className="p-6 bg-white dark:bg-zinc-800 shadow-sm rounded-full mb-6 group-hover:scale-110 transition-transform duration-500">
                    <UploadCloud className="w-8 h-8 text-zinc-400 group-hover:text-teal-600 transition-colors" strokeWidth={1} />
                </div>
                <h3 className="text-xl font-serif text-black dark:text-white mb-2">Sube tu Selfie</h3>
                <p className="text-sm text-zinc-500 max-w-[200px]">Arrastra tu foto aquí o haz clic para explorar</p>
                <input
                    ref={fileInputRef}
                    type="file"
                    accept="image/*"
                    hidden
                    onChange={(e) => e.target.files?.[0] && onUpload(e.target.files[0])}
                />
            </div>
            <div className="space-y-4">
                <div className="flex flex-wrap justify-center gap-6 text-xs text-zinc-400 font-sans tracking-wide uppercase">
                    <span className="flex items-center gap-2"><Check className="w-4 h-4 text-teal-500" strokeWidth={1.5} /> 100% Privado</span>
                    <span className="flex items-center gap-2"><Check className="w-4 h-4 text-teal-500" strokeWidth={1.5} /> Resultados en segundos</span>
                </div>
                <div className="flex flex-col items-center gap-2 text-xs md:text-sm text-zinc-600 dark:text-zinc-400 font-sans transition-all">
                    <div className="flex gap-4 mb-4">
                        <Button
                            variant="outline"
                            onClick={onSelfieCaptureStart}
                            className="rounded-full border-zinc-200 hover:bg-zinc-100 hover:text-black dark:border-zinc-700 dark:hover:bg-zinc-800 dark:text-zinc-300"
                        >
                            <ScanFace className="w-4 h-4 mr-2" />
                            Hazte un selfie
                        </Button>
                    </div>
                    <p>Tu imagen se utilizará únicamente para generar esta simulación.</p>
                    <p>Debes ser mayor de edad para utilizar esta herramienta</p>
                </div>
            </div>
        </motion.div>
    );
}
