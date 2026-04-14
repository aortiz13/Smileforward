"use client";

import { AnimatePresence, motion } from "framer-motion";
import { useEffect, useRef } from "react";
import { useSearchParams } from "next/navigation";
import { useWidgetState } from "./useWidgetState";
import { LoadingOverlay } from "./LoadingOverlay";
import type { WidgetContainerProps } from "./types";

// Step Components
import { VerificationStep } from "./steps/VerificationStep";
import { UploadStep } from "./steps/UploadStep";
import { SelfieCaptureStep } from "./steps/SelfieCaptureStep";
import { ProcessingStep } from "./steps/ProcessingStep";
import { LockedResultStep } from "./steps/LockedResultStep";
import { LeadFormStep } from "./steps/LeadFormStep";
import { ResultStep } from "./steps/ResultStep";
import { SuccessStep } from "./steps/SuccessStep";

export default function WidgetContainer(props: WidgetContainerProps) {
    const state = useWidgetState(props);
    const containerRef = useRef<HTMLDivElement>(null);
    const searchParams = useSearchParams();
    const isEmbedded = searchParams.get("embed") === "widget";

    // Send height to parent window for iframe auto-resize
    useEffect(() => {
        if (!isEmbedded || !containerRef.current) return;

        let lastSentHeight = 0;

        const sendHeight = () => {
            const el = containerRef.current;
            if (!el) return;
            // Measure the container's true content height
            const height = Math.max(el.scrollHeight, el.offsetHeight);
            // Only send if height actually changed
            if (height > 0 && Math.abs(height - lastSentHeight) > 2) {
                lastSentHeight = height;
                window.parent.postMessage({ type: "smileforward-resize", height }, "*");
            }
        };

        // Observe size changes
        const resizeObserver = new ResizeObserver(() => {
            setTimeout(sendHeight, 50);
        });
        resizeObserver.observe(containerRef.current);

        // Also observe DOM mutations (new children, class changes)
        const mutationObserver = new MutationObserver(() => {
            setTimeout(sendHeight, 100);
        });
        mutationObserver.observe(containerRef.current, {
            childList: true,
            subtree: true,
            attributes: true,
            attributeFilter: ['class', 'style'],
        });

        // Polling as backup (every 300ms for 15s after step change)
        let pollCount = 0;
        const pollInterval = setInterval(() => {
            sendHeight();
            pollCount++;
            if (pollCount >= 50) clearInterval(pollInterval);
        }, 300);

        // Also send on initial render
        sendHeight();
        // And after delays for animations/layout settling
        setTimeout(sendHeight, 300);
        setTimeout(sendHeight, 600);
        setTimeout(sendHeight, 1000);

        // Listen for window resize too
        const handleResize = () => setTimeout(sendHeight, 100);
        window.addEventListener('resize', handleResize);

        return () => {
            resizeObserver.disconnect();
            mutationObserver.disconnect();
            clearInterval(pollInterval);
            window.removeEventListener('resize', handleResize);
        };
    }, [isEmbedded, state.step]);

    const {
        step, setStep, isVerified, setIsVerified,
        image, generatedImage, demoBeforeImage, alignedImage,
        processStatus, formValues, setFormValues,
        selectedFile, setSelectedFile, selectedCountry, setSelectedCountry,
        userEmail, isSubmittingPhoto, isSubmittingVideo, loadingMessage,
        qrUrl, mobileConnected, setMobileConnected,
        phraseIndex, fileInputRef,
        handleUpload, handleSelfieCapture,
        handleClinicalVideoRequest, handleSendPhotoEmail,
        resetToUpload, phrases,
    } = state;

    return (
        <div
            ref={containerRef}
            data-embed={isEmbedded ? "true" : undefined}
            className={`relative w-full bg-white dark:bg-zinc-950 flex flex-col shadow-sm ${
                isEmbedded
                    ? "min-h-[500px] h-auto overflow-visible border-0 rounded-none"
                    : "min-h-[100dvh] h-[100dvh] overflow-hidden rounded-[2rem] border border-zinc-200 dark:border-zinc-800"
            }`}
        >
            {/* Loading Overlay */}
            <LoadingOverlay
                visible={isSubmittingPhoto || isSubmittingVideo}
                message={loadingMessage}
            />

            {/* Header */}
            <header className="relative w-full flex items-center justify-between px-8 md:px-12 py-4 md:py-5 z-20 bg-transparent flex-shrink-0">
                <h1 className="text-xl md:text-2xl font-serif text-black dark:text-white tracking-tight">Smile Forward</h1>
                <div className="flex items-center gap-2 text-[11px] uppercase tracking-[0.15em] font-sans text-zinc-400">
                    <span className="w-2 h-2 rounded-full bg-teal-500 animate-pulse" />
                    Online
                </div>
            </header>

            {/* Main Content */}
            <main className={`relative z-10 flex flex-col ${
                isEmbedded
                    ? "overflow-visible"
                    : "flex-1 min-h-0 overflow-y-auto md:overflow-hidden"
            }`}>
                {!isVerified ? (
                    <VerificationStep onVerified={() => { setIsVerified(true); setStep("LEAD_FORM"); }} />
                ) : (
                    <AnimatePresence mode="wait">
                        {step === "UPLOAD" && (
                            <UploadStep
                                fileInputRef={fileInputRef}
                                onUpload={handleUpload}
                                onSelfieCaptureStart={() => setStep("SELFIE_CAPTURE")}
                            />
                        )}

                        {step === "SELFIE_CAPTURE" && (
                            <SelfieCaptureStep
                                mobileConnected={mobileConnected}
                                qrUrl={qrUrl}
                                onCapture={handleSelfieCapture}
                                onCancel={() => setStep("LEAD_FORM")}
                            />
                        )}

                        {step === "PROCESSING" && (
                            <ProcessingStep
                                image={image}
                                processStatus={processStatus}
                                phraseIndex={phraseIndex}
                                phrases={phrases}
                            />
                        )}

                        {step === "LOCKED_RESULT" && (
                            <LockedResultStep
                                image={image}
                                demoBeforeImage={demoBeforeImage}
                                generatedImage={generatedImage}
                                onReset={resetToUpload}
                                onUnlock={() => setStep("LEAD_FORM")}
                            />
                        )}

                        {step === "LEAD_FORM" && (
                            <LeadFormStep
                                formValues={formValues}
                                setFormValues={setFormValues}
                                selectedCountry={selectedCountry}
                                setSelectedCountry={setSelectedCountry}
                                selectedFile={selectedFile}
                                setSelectedFile={setSelectedFile}
                                mobileConnected={mobileConnected}
                                setMobileConnected={setMobileConnected}
                                generatedImage={generatedImage}
                                fileInputRef={fileInputRef}
                                onSelfieCapture={() => setStep("SELFIE_CAPTURE")}
                                onUpload={handleUpload}
                                onBackToResult={() => setStep("LOCKED_RESULT")}
                            />
                        )}

                        {step === "EMAIL_SENT" && (
                            <SuccessStep
                                variant="email_sent"
                                userEmail={userEmail}
                                onBack={() => { }}
                            />
                        )}

                        {step === "RESULT" && (
                            <ResultStep
                                image={image}
                                demoBeforeImage={demoBeforeImage}
                                generatedImage={generatedImage}
                                alignedImage={alignedImage}
                                isSubmittingVideo={isSubmittingVideo}
                                isSubmittingPhoto={isSubmittingPhoto}
                                onClinicalVideoRequest={handleClinicalVideoRequest}
                                onSendPhotoEmail={handleSendPhotoEmail}
                            />
                        )}

                        {step === "PHOTO_SUCCESS" && (
                            <SuccessStep
                                variant="photo"
                                userEmail={userEmail}
                                onBack={() => setStep("RESULT")}
                            />
                        )}

                        {step === "CLINICAL_REQUEST_SUCCESS" && (
                            <SuccessStep
                                variant="clinical"
                                userEmail={userEmail}
                                onBack={() => setStep("RESULT")}
                            />
                        )}
                    </AnimatePresence>
                )}
            </main>

            {/* Developer Attribution */}
            <div className={isEmbedded
                ? "w-full text-center py-4 opacity-60 pointer-events-none select-none"
                : "absolute bottom-1 md:bottom-2 left-1/2 -translate-x-1/2 md:left-auto md:translate-x-0 md:right-4 z-30 opacity-60 pointer-events-none select-none"
            }>
                <span className="text-[9px] uppercase tracking-[0.1em] text-zinc-400 dark:text-zinc-500 font-medium">
                    Desarrollado por Judez-Logic
                </span>
            </div>
        </div>
    );
}
