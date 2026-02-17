"use client";

import { useRef, useState, useCallback } from "react";
import Webcam from "react-webcam";
import { CameraView } from "@/components/selfie/CameraView";
import { FaceOverlay } from "@/components/selfie/FaceOverlay";
import { useFaceDetection } from "@/hooks/selfie/useFaceDetection";
import { Button } from "@/components/ui/button";
// import Image from "next/image"; // Avoiding next/image for base64 blob previews to avoid config issues
import { RefreshCcw, Check, Aperture, X } from "lucide-react";

interface SelfieCaptureFlowProps {
    onCapture: (file: File) => void;
    onCancel: () => void;
}

export function SelfieCaptureFlow({ onCapture, onCancel }: SelfieCaptureFlowProps) {
    const webcamRef = useRef<Webcam>(null);
    const [imgSrc, setImgSrc] = useState<string | null>(null);

    // Create a ref for the video element that useFaceDetection can key off of
    const videoRef = useRef<HTMLVideoElement | null>(null);

    // We need to bridge the webcamRef to videoRef so our hook can see it
    const handleUserMedia = useCallback(() => {
        if (webcamRef.current && webcamRef.current.video) {
            videoRef.current = webcamRef.current.video;
        }
    }, [webcamRef]);

    // Hook handles the logic
    const {
        isAligned,
        isSmiling,
        faceDetected,
        multipleFacesDetected,
        isLowLight,
        smileScore,
        jawOpenScore,
        isLoading,
        error,
        isCentered,
        isCorrectSize,
    } = useFaceDetection(videoRef);

    const capture = useCallback(() => {
        if (webcamRef.current) {
            const imageSrc = webcamRef.current.getScreenshot();
            setImgSrc(imageSrc);
        }
    }, [webcamRef]);

    const retake = () => {
        setImgSrc(null);
    };

    const confirmPhoto = async () => {
        if (imgSrc) {
            try {
                // Convert base64 to File
                const res = await fetch(imgSrc);
                const blob = await res.blob();
                const file = new File([blob], "selfie.jpg", { type: "image/jpeg" });
                onCapture(file);
            } catch (err) {
                console.error("Error converting selfie to file:", err);
            }
        }
    };

    if (error) {
        return (
            <div className="flex flex-col items-center justify-center h-full p-4 text-center">
                <p className="text-red-400 mb-4">Error: {error}</p>
                <Button onClick={onCancel} variant="outline">Cerrar</Button>
            </div>
        )
    }

    return (
        <div className="relative w-full h-full min-h-[500px] md:min-h-0 flex flex-col bg-black overflow-hidden rounded-xl">
            {/* Close Button implementation if needed, but Widget usually handles navigation. 
                Adding an absolute close button just in case. */}
            <button
                onClick={onCancel}
                className="absolute top-4 right-4 z-50 p-2 bg-black/50 text-white rounded-full backdrop-blur-md hover:bg-black/70 transition-colors"
                title="Cancelar"
            >
                <X className="w-6 h-6" />
            </button>

            {imgSrc ? (
                // PREVIEW STATE
                <div className="relative w-full h-full flex flex-col items-center justify-center bg-black">
                    <img src={imgSrc} alt="Selfie" className="max-h-full max-w-full object-contain mirror-x" />

                    <div className="absolute bottom-10 left-0 right-0 flex justify-center gap-8 z-20">
                        <Button
                            variant="outline"
                            size="icon"
                            onClick={retake}
                            className="rounded-full h-16 w-16 border-2 border-white/20 bg-black/40 text-white hover:bg-black/60 hover:text-white hover:scale-105 transition-all backdrop-blur-sm"
                        >
                            <RefreshCcw className="h-6 w-6" />
                        </Button>
                        <Button
                            variant="default"
                            size="icon"
                            onClick={confirmPhoto}
                            className="rounded-full h-16 w-16 bg-emerald-500 hover:bg-emerald-600 text-white shadow-lg shadow-emerald-500/30 hover:scale-105 transition-all"
                        >
                            <Check className="h-8 w-8" />
                        </Button>
                    </div>
                </div>
            ) : (
                // CAMERA STATE
                <div className="relative w-full h-full flex flex-col items-center justify-center bg-black">
                    {/* Camera View - Forced to cover container or contain? 
                        CameraView typically tries to fill. Let's ensure it fits nicely. */}
                    <div className="relative w-full h-full overflow-hidden">
                        <CameraView ref={webcamRef} onUserMedia={handleUserMedia} />

                        {!isLoading && (
                            <FaceOverlay
                                isAligned={isAligned}
                                isSmiling={isSmiling}
                                faceDetected={faceDetected}
                                multipleFacesDetected={multipleFacesDetected}
                                isLowLight={isLowLight}
                                smileScore={smileScore}
                                jawOpenScore={jawOpenScore}
                                isCentered={isCentered}
                                isCorrectSize={isCorrectSize}
                            />
                        )}
                    </div>

                    {/* Capture Button */}
                    <div className="absolute bottom-12 left-0 right-0 flex justify-center z-20 pointer-events-none">
                        <Button
                            onClick={capture}
                            disabled={!isAligned}
                            className={`
                                rounded-full h-20 w-20 p-0 border-4 transition-all duration-500 flex items-center justify-center group pointer-events-auto
                                ${isAligned
                                    ? 'bg-white border-emerald-500 scale-110 shadow-[0_0_30px_rgba(16,185,129,0.4)] cursor-pointer'
                                    : 'bg-transparent border-white/30 scale-100 opacity-60 cursor-not-allowed'
                                }
                            `}
                        >
                            <div className={`
                                h-16 w-16 rounded-full transition-all duration-500
                                ${isAligned ? 'bg-emerald-500 scale-90 group-hover:scale-75' : 'bg-transparent'}
                            `}>
                                {isAligned && <Aperture className="text-white h-full w-full p-3 animate-pulse" />}
                            </div>
                        </Button>
                    </div>

                    {/* Loading State */}
                    {isLoading && (
                        <div className="absolute inset-0 flex items-center justify-center bg-black/80 z-30 backdrop-blur-sm">
                            <div className="flex flex-col items-center gap-4">
                                <div className="w-10 h-10 border-4 border-emerald-500 border-t-transparent rounded-full animate-spin" />
                                <p className="text-white font-light tracking-wide">Iniciando cámara...</p>
                            </div>
                        </div>
                    )}
                </div>
            )}
        </div>
    );
}
