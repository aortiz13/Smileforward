"use client";

import { motion } from "framer-motion";

interface FaceOverlayProps {
    isAligned: boolean;
    isSmiling: boolean;
    faceDetected: boolean;
    multipleFacesDetected: boolean;
    isLowLight: boolean;
    smileScore: number;
    jawOpenScore: number;
    isCentered: boolean;
    isCorrectSize: boolean;
}

export const FaceOverlay: React.FC<FaceOverlayProps> = ({
    isAligned,
    isSmiling,
    faceDetected,
    multipleFacesDetected,
    isLowLight,
    smileScore,
    jawOpenScore,
    isCentered,
    isCorrectSize,
}) => {
    // Determine stroke color and feedback text based on detailed state
    let strokeColor = "#ef4444"; // Default Red
    let feedbackText = "Ubica tu cara en el óvalo";
    let strokeWidth = 2; // Thinner by default

    if (multipleFacesDetected) {
        strokeColor = "#ef4444";
        feedbackText = "Solo una persona";
    } else if (!faceDetected) {
        strokeColor = "#ef4444";
        feedbackText = "Ubica tu cara en el óvalo";
    } else if (faceDetected && !isAligned) {
        // Face detected but something is off (centering, size, or smile, or light)

        if (isLowLight) {
            strokeColor = "#eab308";
            feedbackText = "Necesitas más luz";
        } else if (!isSmiling) {
            // Check specific reasons for not smiling
            if (smileScore > 0.25 && jawOpenScore <= 0.01) {
                strokeColor = "#eab308";
                feedbackText = "Abre un poco más la boca";
            } else {
                strokeColor = "#eab308"; // Yellow warning
                feedbackText = "¡Sonríe!";
            }
        } else {
            // Smiling but not aligned (position/size)
            strokeColor = "#ef4444";
            if (!isCentered) {
                feedbackText = "Centra tu cara";
            } else if (!isCorrectSize) {
                feedbackText = "Acércate un poco más";
            } else {
                feedbackText = "Ajusta tu posición";
            }
        }
    } else if (isAligned) {
        strokeColor = "rgba(34, 197, 94, 0.8)"; // Subtler Green
        strokeWidth = 4;
        feedbackText = "¡Perfecto!";
    }

    return (
        <div className="absolute inset-0 pointer-events-none flex items-center justify-center font-sans">
            <svg
                viewBox="0 0 100 100"
                className="w-full h-full opacity-60"
                preserveAspectRatio="none"
            >
                <defs>
                    <mask id="mask" x="0" y="0" width="100%" height="100%">
                        <rect x="0" y="0" width="100%" height="100%" fill="white" />
                        <motion.ellipse
                            cx="50"
                            cy="45"
                            rx="20"
                            ry="28"
                            fill="black"
                            animate={{
                                rx: isAligned ? 21 : 20,
                                ry: isAligned ? 29 : 28,
                            }}
                            transition={{
                                duration: 0.5,
                                repeat: isAligned ? 0 : Infinity,
                                repeatType: "reverse",
                            }}
                        />
                    </mask>
                </defs>
                <rect
                    x="0"
                    y="0"
                    width="100%"
                    height="100%"
                    fill="rgba(0,0,0,0.7)"
                    mask="url(#mask)"
                />

                <motion.ellipse
                    cx="50"
                    cy="45"
                    rx="20"
                    ry="28"
                    fill="none"
                    stroke={strokeColor}
                    strokeWidth={strokeWidth}
                    strokeDasharray={isAligned ? "0" : "1 4"}
                    animate={{
                        scale: isAligned ? 1.02 : 1,
                        stroke: strokeColor,
                    }}
                    transition={{ duration: 0.3 }}
                />
            </svg>

            <div className="absolute top-1/2 mt-16 text-center w-full">
                <p className={`text-2xl font-light tracking-wide ${isAligned ? 'text-green-400' : 'text-white'}`} style={{ textShadow: '0 2px 10px rgba(0,0,0,0.5)' }}>
                    {feedbackText}
                </p>
            </div>
        </div>
    );
};
