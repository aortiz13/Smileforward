"use client";

import { motion } from "framer-motion";
import { Loader2, Video } from "lucide-react";
import { Button } from "@/components/ui/button";
import { BeforeAfterSlider } from "../BeforeAfterSlider";

interface ResultStepProps {
    image: File | null;
    demoBeforeImage: string | null;
    generatedImage: string | null;
    alignedImage: string | null;
    isSubmittingVideo: boolean;
    isSubmittingPhoto: boolean;
    onClinicalVideoRequest: () => void;
    onSendPhotoEmail: () => void;
}

export function ResultStep({
    image,
    demoBeforeImage,
    generatedImage,
    alignedImage,
    isSubmittingVideo,
    isSubmittingPhoto,
    onClinicalVideoRequest,
    onSendPhotoEmail,
}: ResultStepProps) {
    return (
        <motion.div
            key="result"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="h-full w-full overflow-hidden flex flex-col justify-center bg-white dark:bg-zinc-950"
        >
            <div className="w-full h-full flex flex-col items-center justify-center p-4">
                <div className="flex flex-col md:flex-row gap-4 md:gap-8 w-full max-w-7xl items-center justify-center flex-1 min-h-0">
                    <div className="flex flex-col md:flex-row gap-6 md:gap-10 w-full items-center justify-center">
                        {/* Mobile-only Header */}
                        <div className="md:hidden text-center space-y-2 mb-2">
                            <h3 className="text-2xl font-serif text-black dark:text-white leading-tight">
                                Tu simulación Smile Forward <br /> ya está lista
                            </h3>
                            <p className="text-base text-zinc-600 leading-relaxed font-sans px-4">
                                Aquí tienes una primera versión de como podría verse tu sonrisa ideal.
                            </p>
                        </div>

                        {/* Slider Comparison */}
                        <div className="flex-none w-auto h-[50vh] md:h-[55vh] aspect-[9/16] max-h-full transition-all duration-300 shadow-2xl rounded-2xl md:rounded-[2.5rem]">
                            <div className="relative h-full w-full rounded-2xl md:rounded-[2.5rem] overflow-hidden bg-zinc-100 dark:bg-zinc-800 border border-zinc-100 dark:border-zinc-800 shadow-2xl group">
                                {(image || demoBeforeImage) && generatedImage ? (
                                    <BeforeAfterSlider
                                        beforeImage={image ? URL.createObjectURL(image) : (demoBeforeImage || "")}
                                        afterImage={alignedImage || generatedImage || ""}
                                        className="w-full h-full"
                                    />
                                ) : (
                                    <div className="w-full h-full flex items-center justify-center">
                                        <Loader2 className="w-8 h-8 animate-spin text-zinc-300" />
                                    </div>
                                )}
                            </div>
                        </div>

                        {/* Sidebar CTA */}
                        <div className="w-full md:w-[30rem] flex flex-col justify-center self-stretch space-y-5 md:space-y-8 text-center md:text-left">
                            <div className="space-y-2 md:space-y-3">
                                {/* Desktop-only Header */}
                                <div className="hidden md:block space-y-3">
                                    <h3 className="text-3xl font-serif text-black dark:text-white leading-tight">
                                        Tu simulación Smile Forward <br /> ya está lista
                                    </h3>
                                    <p className="text-xl text-zinc-600 leading-relaxed font-sans">
                                        Aquí tienes una primera versión de como podría verse tu sonrisa ideal.
                                    </p>
                                </div>

                                <p className="text-xs md:text-sm text-zinc-500 leading-relaxed font-sans opacity-90">
                                    Si quieres vivir la experiencia completa y verte en <strong className="font-bold">movimiento (video)</strong>, lo realizamos en consulta para personalizar el resultado, confirmar la viabilidad en tu caso y orientarte sobre la mejor opción de tratamiento con el criterio del equipo de los Dres. Corbella.
                                </p>
                            </div>

                            <div className="space-y-4">
                                <Button
                                    onClick={onClinicalVideoRequest}
                                    disabled={isSubmittingVideo || isSubmittingPhoto}
                                    className="w-full h-14 md:h-16 rounded-full bg-black text-white hover:bg-zinc-800 dark:bg-white dark:text-black dark:hover:bg-zinc-200 text-sm md:text-lg font-sans font-medium tracking-wide shadow-xl gap-3 group px-6 transition-all"
                                    size="lg"
                                >
                                    {isSubmittingVideo ? (
                                        <>
                                            <Loader2 className="w-5 h-5 animate-spin" />
                                            Enviando...
                                        </>
                                    ) : (
                                        <>
                                            <Video className="w-5 h-5 md:w-6 md:h-6 group-hover:scale-110 transition-transform" strokeWidth={1.5} />
                                            Quiero ver mi vídeo en consulta
                                        </>
                                    )}
                                </Button>

                                <Button
                                    onClick={onSendPhotoEmail}
                                    disabled={isSubmittingPhoto || isSubmittingVideo}
                                    variant="outline"
                                    className="w-full h-10 md:h-12 rounded-full border border-black dark:border-white text-black dark:text-white hover:bg-zinc-100 dark:hover:bg-zinc-800 text-sm font-normal tracking-wide shadow-sm"
                                >
                                    {isSubmittingPhoto ? (
                                        <>
                                            <Loader2 className="w-4 h-4 animate-spin mr-2" />
                                            Enviando...
                                        </>
                                    ) : (
                                        "Quiero recibir mi foto"
                                    )}
                                </Button>
                            </div>
                        </div>
                    </div>
                </div>

                {/* Footer Disclaimer */}
                <p className="text-[10px] md:text-sm text-zinc-400 text-center max-w-lg mx-auto leading-relaxed pt-2 md:pt-6 pb-6 md:pb-0 opacity-70">
                    Simulación Orientativa. El resultado final depende de tu caso clínico
                </p>
            </div>
        </motion.div>
    );
}
