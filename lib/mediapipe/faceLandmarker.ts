"use client";

/**
 * Shared FaceLandmarker singleton factory.
 * Consolidates the 3 separate MediaPipe model-loading patterns into one,
 * pinned to a single CDN version.
 * 
 * Usage:
 *   const landmarker = await getFaceLandmarker("IMAGE");
 *   const landmarker = await getFaceLandmarker("VIDEO");
 */

import { FaceLandmarker, FilesetResolver } from "@mediapipe/tasks-vision";

const CDN_VERSION = "0.10.32";
const WASM_URL = `https://cdn.jsdelivr.net/npm/@mediapipe/tasks-vision@${CDN_VERSION}/wasm`;
const MODEL_URL = `https://storage.googleapis.com/mediapipe-models/face_landmarker/face_landmarker/float16/1/face_landmarker.task`;

type RunningMode = "IMAGE" | "VIDEO";

interface LandmarkerConfig {
    runningMode: RunningMode;
    numFaces: number;
    outputFaceBlendshapes: boolean;
}

// Cache per running mode to avoid re-creating instances
const instances = new Map<string, FaceLandmarker>();

// Shared fileset resolver promise (loaded once)
let filesetPromise: Promise<any> | null = null;

function getFilesetResolver() {
    if (!filesetPromise) {
        filesetPromise = FilesetResolver.forVisionTasks(WASM_URL);
    }
    return filesetPromise;
}

/**
 * Returns a FaceLandmarker instance configured for the given running mode.
 * Instances are cached by a config key to avoid reloading the model.
 */
export async function getFaceLandmarker(
    mode: RunningMode,
    options?: {
        numFaces?: number;
        outputFaceBlendshapes?: boolean;
    }
): Promise<FaceLandmarker> {
    const config: LandmarkerConfig = {
        runningMode: mode,
        numFaces: options?.numFaces ?? (mode === "VIDEO" ? 2 : 1),
        outputFaceBlendshapes: options?.outputFaceBlendshapes ?? (mode === "VIDEO"),
    };

    // Create a cache key from the config
    const key = `${config.runningMode}_${config.numFaces}_${config.outputFaceBlendshapes}`;

    const existing = instances.get(key);
    if (existing) return existing;

    const filesetResolver = await getFilesetResolver();

    const landmarker = await FaceLandmarker.createFromOptions(filesetResolver, {
        baseOptions: {
            modelAssetPath: MODEL_URL,
            delegate: "GPU",
        },
        runningMode: config.runningMode,
        numFaces: config.numFaces,
        outputFaceBlendshapes: config.outputFaceBlendshapes,
    });

    instances.set(key, landmarker);
    return landmarker;
}

/**
 * Closes and removes a cached FaceLandmarker instance.
 * Useful for cleanup in hooks/components.
 */
export function closeFaceLandmarker(
    mode: RunningMode,
    options?: {
        numFaces?: number;
        outputFaceBlendshapes?: boolean;
    }
): void {
    const config = {
        runningMode: mode,
        numFaces: options?.numFaces ?? (mode === "VIDEO" ? 2 : 1),
        outputFaceBlendshapes: options?.outputFaceBlendshapes ?? (mode === "VIDEO"),
    };

    const key = `${config.runningMode}_${config.numFaces}_${config.outputFaceBlendshapes}`;
    const instance = instances.get(key);
    if (instance) {
        instance.close();
        instances.delete(key);
    }
}
