"use client";

import { motion, AnimatePresence } from "framer-motion";
import { ScanFace, FileSearch, Sparkles, Wand2 } from "lucide-react";
import { StatusItem } from "../StatusItem";
import type { ProcessStatus } from "../types";

interface ProcessingStepProps {
    image: File | null;
    processStatus: ProcessStatus;
    phraseIndex: number;
    phrases: string[];
}

const scanVariants = {
    initial: { top: "0%" },
    animate: {
        top: "100%",
        transition: {
            repeat: Infinity,
            repeatType: "mirror" as const,
            duration: 1.5,
            ease: "linear" as const
        }
    }
};

export function ProcessingStep({ image, processStatus, phraseIndex, phrases }: ProcessingStepProps) {
    return (
        <motion.div
            key="processing"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="h-full flex flex-col items-center justify-center py-4 md:py-0 space-y-8"
        >
            {/* Animated Header */}
            <div className="h-16 flex items-center justify-center w-full px-4">
                <AnimatePresence mode="wait">
                    <motion.h3
                        key={phraseIndex}
                        initial={{ opacity: 0, y: 10 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0, y: -10 }}
                        className="text-2xl md:text-3xl font-serif text-black dark:text-white text-center"
                    >
                        {phrases[phraseIndex]}
                    </motion.h3>
                </AnimatePresence>
            </div>

            <div className="flex flex-col md:flex-row gap-8 md:gap-12 items-center justify-center w-full">
                {/* Left: Visual Scanner */}
                <div className="relative w-full max-w-[200px] md:max-w-[240px] aspect-[3/4] rounded-[2rem] overflow-hidden shadow-2xl border border-zinc-100 dark:border-zinc-800 bg-zinc-900 flex-shrink-0">
                    {image ? (
                        <img src={URL.createObjectURL(image)} alt="Analyzing" className="w-full h-full object-cover opacity-80" />
                    ) : (
                        <div className="w-full h-full bg-zinc-800" />
                    )}
                    <motion.div
                        variants={scanVariants}
                        initial="initial"
                        animate="animate"
                        className="absolute left-0 right-0 h-[1px] bg-white/50 shadow-[0_0_20px_2px_rgba(255,255,255,0.5)] z-10"
                    />
                </div>

                {/* Right: Progress List */}
                <div className="w-full max-w-xs space-y-3 px-4 md:px-0">
                    <StatusItem
                        label="Validación Biométrica"
                        icon={ScanFace}
                        active={processStatus === 'validating'}
                        completed={['scanning', 'analyzing', 'designing', 'aligning', 'complete'].includes(processStatus)}
                    />
                    <StatusItem
                        label="Escaneo Facial 3D"
                        icon={FileSearch}
                        active={processStatus === 'scanning'}
                        completed={['analyzing', 'designing', 'aligning', 'complete'].includes(processStatus)}
                    />
                    <StatusItem
                        label="Análisis Morfológico"
                        icon={Sparkles}
                        active={processStatus === 'analyzing'}
                        completed={['designing', 'aligning', 'complete'].includes(processStatus)}
                    />
                    <StatusItem
                        label="Diseño Generativo"
                        icon={Wand2}
                        active={processStatus === 'designing'}
                        completed={['aligning', 'complete'].includes(processStatus)}
                    />
                </div>
            </div>
        </motion.div>
    );
}
