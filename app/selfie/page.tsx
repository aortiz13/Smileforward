"use client";

import { useRef, useState, useCallback, useEffect, Suspense } from "react";
import Webcam from "react-webcam";
import { CameraView } from "@/components/selfie/CameraView";
import { FaceOverlay } from "@/components/selfie/FaceOverlay";
import { useFaceDetection } from "@/hooks/selfie/useFaceDetection";
import { Button } from "@/components/ui/button";
import Image from "next/image";
import { RefreshCcw, Check, Aperture, Smartphone } from "lucide-react";
import { useSearchParams } from "next/navigation";
import { updateSelfieSession } from "@/app/actions/selfie";
import { uploadScan } from "@/app/services/storage";

function SelfiePageContent() {
    const searchParams = useSearchParams();
    const sessionId = searchParams.get("sid");
    const [uploading, setUploading] = useState(false);
    const [success, setSuccess] = useState(false);

    const webcamRef = useRef<Webcam>(null);
    const [imgSrc, setImgSrc] = useState<string | null>(null);

    // Initial connection signal
    useEffect(() => {
        if (sessionId) {
            updateSelfieSession(sessionId, 'mobile_connected').catch(console.error);
        }
    }, [sessionId]);

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
        if (!imgSrc) return;

        // If we are in a cross-device session (sid present)
        if (sessionId) {
            try {
                setUploading(true);
                // 1. Convert base64 to Blob/File
                const res = await fetch(imgSrc);
                const blob = await res.blob();
                const file = new File([blob], "mobile-selfie.jpg", { type: "image/jpeg" });

                // 2. Upload to Storage
                const formData = new FormData();
                formData.append('file', file);
                formData.append('userId', 'mobile_upload'); // Or handle proper auth/anon ID

                const uploadRes = await uploadScan(formData);

                if (!uploadRes.success || !uploadRes.data) {
                    throw new Error(uploadRes.error || "Upload failed");
                }

                // 3. Update Session
                const sessionRes = await updateSelfieSession(sessionId, 'uploaded', uploadRes.data);

                if (!sessionRes.success) {
                    throw new Error(sessionRes.error || "Session update failed");
                }

                setSuccess(true);

            } catch (err) {
                console.error("Error in mobile flow:", err);
                alert("Hubo un error al subir la foto. Por favor intenta de nuevo.");
            } finally {
                setUploading(false);
            }
        } else {
            // Logic to save/use the photo (Standalone mode - redundant now with capture flow logic?)
            // Just log for now if standalone
            console.log("Photo confirmed:", imgSrc);
        }
    };

    if (success) {
        return (
            <div className="flex flex-col items-center justify-center min-h-screen bg-black text-white p-8 text-center font-sans">
                <div className="w-24 h-24 rounded-full bg-emerald-500/20 flex items-center justify-center mb-6">
                    <Check className="w-12 h-12 text-emerald-500" />
                </div>
                <h1 className="text-3xl font-serif mb-4">¡Foto Enviada!</h1>
                <p className="text-zinc-400 mb-8 max-w-sm">
                    Hemos recibido tu selfie correctamente. Ya puedes volver a tu ordenador para ver el resultado.
                </p>
                <div className="animate-pulse text-sm text-zinc-500">
                    Puedes cerrar esta pestaña
                </div>
            </div>
        );
    }

    if (error) {
        return (
            <div className="flex items-center justify-center min-h-screen bg-black text-white p-4">
                <p className="text-center text-red-400">Error: {error}. Por favor recarga la página.</p>
            </div>
        )
    }

    return (
        <div className="flex flex-col items-center justify-center min-h-screen bg-black relative font-sans">
            {imgSrc ? (
                <div className="relative w-full max-w-md aspect-[9/16] bg-gray-900 rounded-2xl overflow-hidden shadow-2xl">
                    <Image src={imgSrc} alt="Selfie" fill className="object-cover mirror-x" />
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
                            disabled={uploading}
                            className={`rounded-full h-16 w-16 bg-emerald-500 hover:bg-emerald-600 text-white shadow-lg shadow-emerald-500/30 hover:scale-105 transition-all ${uploading ? 'opacity-50 cursor-not-allowed' : ''}`}
                        >
                            {uploading ? (
                                <div className="w-6 h-6 border-2 border-white border-t-transparent rounded-full animate-spin" />
                            ) : (
                                <Check className="h-8 w-8" />
                            )}
                        </Button>
                    </div>
                </div>
            ) : (
                <div className="relative w-full max-w-md h-[85vh] bg-gray-900 rounded-2xl overflow-hidden shadow-2xl ring-1 ring-white/10">
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

                    <div className="absolute bottom-12 left-0 right-0 flex justify-center z-20">
                        <Button
                            onClick={capture}
                            disabled={!isAligned}
                            className={`
                    rounded-full h-20 w-20 p-0 border-4 transition-all duration-500 flex items-center justify-center group
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



export default function SelfiePage() {
    return (
        <Suspense fallback={<div className="min-h-screen bg-black text-white flex items-center justify-center">Cargando...</div>}>
            <SelfiePageContent />
        </Suspense>
    );
}
