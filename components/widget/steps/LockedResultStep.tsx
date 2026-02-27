"use client";

import { motion } from "framer-motion";
import { Share2, Loader2, MessageCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { BeforeAfterSlider } from "../BeforeAfterSlider";

interface LockedResultStepProps {
    image: File | null;
    demoBeforeImage: string | null;
    generatedImage: string | null;
    onReset: () => void;
    onUnlock: () => void;
}

export function LockedResultStep({ image, demoBeforeImage, generatedImage, onReset, onUnlock }: LockedResultStepProps) {
    return (
        <motion.div
            key="locked"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="h-full max-h-[100vh] flex flex-col p-4 md:p-6 overflow-hidden"
        >
            <div className="max-w-5xl mx-auto w-full h-full flex flex-col items-center gap-2 md:gap-4 overflow-hidden">
                {/* Navigation Header */}
                <div className="w-full flex justify-between items-center px-4 flex-shrink-0">
                    <Button
                        variant="ghost"
                        size="sm"
                        onClick={onReset}
                        className="text-zinc-500 hover:text-black dark:hover:text-white"
                    >
                        <Share2 className="w-4 h-4 mr-2 rotate-180" />
                        Volver a empezar
                    </Button>
                    <h2 className="text-xl md:text-3xl font-serif text-black dark:text-white text-center flex-1">Tu simulación Smile Forward</h2>
                    <div className="w-20" />
                </div>

                {/* Main Content */}
                <div className="flex flex-col md:flex-row gap-4 md:gap-8 w-full items-center justify-center flex-1 min-h-0 overflow-hidden">
                    {/* Slider Comparison */}
                    <div className="flex-1 w-full max-w-xl h-full flex flex-col items-center gap-2 min-h-0">
                        <div className="w-full flex-1 min-h-0 relative">
                            {image && generatedImage ? (
                                <div className="relative w-auto h-[50vh] md:h-full aspect-[9/16] md:aspect-auto mx-auto rounded-xl md:rounded-[2rem] overflow-hidden shadow-xl group">
                                    <BeforeAfterSlider
                                        beforeImage={image ? URL.createObjectURL(image) : (demoBeforeImage || "")}
                                        afterImage={generatedImage}
                                        className="w-full h-full"
                                    />
                                    {/* Protective Watermark Layer */}
                                    <div className="absolute inset-0 flex items-center justify-center p-4 z-10 opacity-60 pointer-events-none">
                                        <img
                                            src="https://dentalcorbella.com/wp-content/uploads/2023/07/logo-white-trans2.png"
                                            alt="Watermark"
                                            className="w-full opacity-40 drop-shadow-md rotate-[-20deg] select-none"
                                            draggable={false}
                                        />
                                    </div>
                                    <div className="absolute inset-0 z-20 bg-transparent pointer-events-none" />
                                </div>
                            ) : (
                                <div className="w-full h-full flex items-center justify-center bg-zinc-100 dark:bg-zinc-800 rounded-xl md:rounded-[2rem]">
                                    <Loader2 className="w-8 h-8 animate-spin text-zinc-300" />
                                </div>
                            )}
                        </div>
                        <p className="text-xs md:text-sm text-zinc-600 dark:text-zinc-400 text-center leading-relaxed flex-shrink-0">
                            Simulación Orientativa. El resultado final depende de tu caso clínico
                        </p>
                    </div>

                    {/* Sidebar CTA */}
                    <div className="w-full md:w-72 flex flex-col justify-center space-y-4 bg-zinc-50 dark:bg-zinc-900/50 p-6 rounded-[2rem] border border-zinc-100 dark:border-zinc-800 flex-shrink-0">
                        <div className="space-y-1 text-center md:text-left">
                            <h3 className="text-2xl font-serif text-black dark:text-white">Recibe tu foto en Full HD</h3>
                        </div>
                        <Button
                            onClick={onUnlock}
                            className="w-full h-12 md:h-14 rounded-full bg-black text-white hover:bg-zinc-800 dark:bg-white dark:text-black dark:hover:bg-zinc-200 text-sm md:text-base font-sans font-medium tracking-wide shadow-xl gap-2 group"
                            size="lg"
                        >
                            <MessageCircle className="w-5 h-5 group-hover:scale-110 transition-transform" strokeWidth={1.5} /> ¿Te lo enviamos?
                        </Button>
                    </div>
                </div>
            </div>
        </motion.div>
    );
}
