"use client";

import { useEffect, useState, useRef } from "react";
import { FilesetResolver, FaceLandmarker } from "@mediapipe/tasks-vision";

export const useFaceDetection = (
    videoRef: React.RefObject<HTMLVideoElement | null>
) => {
    const [isAligned, setIsAligned] = useState(false);
    const [isSmiling, setIsSmiling] = useState(false);
    const [faceDetected, setFaceDetected] = useState(false);
    const [multipleFacesDetected, setMultipleFacesDetected] = useState(false);
    const [isLowLight, setIsLowLight] = useState(false);
    const [lastBrightnessCheck, setLastBrightnessCheck] = useState(0);
    const [currentSmileScore, setCurrentSmileScore] = useState(0);
    const [currentJawOpenScore, setCurrentJawOpenScore] = useState(0);
    const [isLoading, setIsLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [currentAlignmentState, setCurrentAlignmentState] = useState({ isCentered: false, isCorrectSize: false });

    const faceLandmarkerRef = useRef<FaceLandmarker | null>(null);
    const requestRef = useRef<number>(0);

    useEffect(() => {
        const loadFaceLandmarker = async () => {
            try {
                const vision = await FilesetResolver.forVisionTasks(
                    "https://cdn.jsdelivr.net/npm/@mediapipe/tasks-vision@0.10.3/wasm"
                );
                faceLandmarkerRef.current = await FaceLandmarker.createFromOptions(
                    vision,
                    {
                        baseOptions: {
                            modelAssetPath: `https://storage.googleapis.com/mediapipe-models/face_landmarker/face_landmarker/float16/1/face_landmarker.task`,
                            delegate: "GPU",
                        },
                        runningMode: "VIDEO",
                        numFaces: 2, // Detect up to 2 faces to identify if multiple people are present
                        outputFaceBlendshapes: true,
                    }
                );
                setIsLoading(false);
            } catch (err) {
                console.error("Error loading FaceLandmarker:", err);
                setError("Failed to load face detection model.");
                setIsLoading(false);
            }
        };

        loadFaceLandmarker();

        return () => {
            if (faceLandmarkerRef.current) {
                faceLandmarkerRef.current.close();
            }
        };
    }, []);

    const detectFace = () => {
        if (
            !faceLandmarkerRef.current ||
            !videoRef.current ||
            videoRef.current.readyState !== 4
        ) {
            requestRef.current = requestAnimationFrame(detectFace);
            return;
        }

        const video = videoRef.current;
        const now = performance.now();

        // Check brightness every 500ms
        if (now - lastBrightnessCheck > 500) {
            const canvas = document.createElement('canvas');
            canvas.width = 50;
            canvas.height = 50;
            const ctx = canvas.getContext('2d');
            if (ctx) {
                ctx.drawImage(video, 0, 0, 50, 50);
                const imageData = ctx.getImageData(0, 0, 50, 50);
                const data = imageData.data;
                let r, g, b, avg;
                let colorSum = 0;
                for (let x = 0, len = data.length; x < len; x += 4) {
                    r = data[x];
                    g = data[x + 1];
                    b = data[x + 2];
                    avg = Math.floor((r + g + b) / 3);
                    colorSum += avg;
                }
                const brightness = Math.floor(colorSum / (50 * 50));
                setIsLowLight(brightness < 100); // Threshold for low light
                setLastBrightnessCheck(now);
            }
        }

        const startTimeMs = performance.now();
        const result = faceLandmarkerRef.current.detectForVideo(video, startTimeMs);

        // Check for multiple faces
        if (result.faceLandmarks.length > 1) {
            setFaceDetected(true);
            setMultipleFacesDetected(true);
            setIsAligned(false);
            setIsSmiling(false);
        } else if (result.faceLandmarks.length === 1) {
            setMultipleFacesDetected(false);
            setFaceDetected(true);
            const landmarks = result.faceLandmarks[0];
            const blendshapes = result.faceBlendshapes[0]; // Access blendshapes for the first face

            // Smile detection
            // categoryName: "mouthSmileLeft", "mouthSmileRight", "jawOpen"
            let smileScore = 0;
            let jawOpenScore = 0;

            if (blendshapes && blendshapes.categories) {
                const smileLeft = blendshapes.categories.find(c => c.categoryName === "mouthSmileLeft")?.score || 0;
                const smileRight = blendshapes.categories.find(c => c.categoryName === "mouthSmileRight")?.score || 0;
                jawOpenScore = blendshapes.categories.find(c => c.categoryName === "jawOpen")?.score || 0;
                smileScore = (smileLeft + smileRight) / 2;

                setCurrentSmileScore(smileScore);
                setCurrentJawOpenScore(jawOpenScore);
            }

            // Require both a smile AND an open mouth (teeth visible)
            // Require both a smile AND an open mouth (teeth visible)
            // jawOpen thresholds: 0 (closed) to 1 (fully open).
            // Adjusted as requested: smile > 0.25, jaw > 0.01 (Relaxed for natural smiles)
            const isSmilingDetected = smileScore > 0.25 && jawOpenScore > 0.01;
            setIsSmiling(isSmilingDetected);

            // Alignment Checks
            const noseTip = landmarks[1];
            const leftCheek = landmarks[234];
            const rightCheek = landmarks[454];

            const faceWidth = Math.abs(rightCheek.x - leftCheek.x);

            // Relaxed thresholds for better desktop compatibility (especially landscape 16:9 cams)
            const isCentered =
                noseTip.x > 0.35 && noseTip.x < 0.65 && noseTip.y > 0.2 && noseTip.y < 0.8;

            // On desktop landscape, a face filling the guide oval is around 0.20-0.25 of frame width.
            // Setting min to 0.10 to be very permissive.
            const isCorrectSize = faceWidth > 0.10 && faceWidth < 0.7;

            // Update state with separate flags for more granular feedback if needed
            // (Internal state update if you decide to add them, but for now we'll just use the logic)

            // Face must be Centered + Correct Size + Smiling + Good Light to be "Aligned"
            setIsAligned(isCentered && isCorrectSize && isSmilingDetected && !isLowLight);

            // We'll also update the hook to return these specifically for the UI
            setCurrentAlignmentState({ isCentered, isCorrectSize });
        } else {
            setFaceDetected(false);
            setMultipleFacesDetected(false);
            setIsAligned(false);
            setIsSmiling(false);
        }

        requestRef.current = requestAnimationFrame(detectFace);
    };

    useEffect(() => {
        if (!isLoading && !error) {
            requestRef.current = requestAnimationFrame(detectFace);
        }
        return () => cancelAnimationFrame(requestRef.current);
    }, [isLoading, error]);

    return {
        isAligned,
        isSmiling,
        faceDetected,
        multipleFacesDetected,
        isLowLight,
        smileScore: currentSmileScore,
        jawOpenScore: currentJawOpenScore,
        isLoading,
        error,
        isCentered: currentAlignmentState.isCentered,
        isCorrectSize: currentAlignmentState.isCorrectSize,
    };
};
