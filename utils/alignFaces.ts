/**
 * alignFaces.ts (v3 - Tasks-Vision Migration)
 * 
 * Aligns a "generated" face image to match the "reference" (original) photo.
 * Improvements in v3:
 *   - Migrated to @mediapipe/tasks-vision to resolve WASM/Module.arguments errors.
 *   - Maintains 5-point Procrustes alignment logic.
 */

// ─── MediaPipe Tasks-Vision Imports ──────────────────────────────────────────

import { FaceLandmarker, FilesetResolver } from "@mediapipe/tasks-vision";

// ─── MediaPipe landmark indices (Canonical) ──────────────────────────────────
const LM = {
    LEFT_EYE: [133, 33],  // Inner, Outer
    RIGHT_EYE: [362, 263], // Inner, Outer
    NOSE_TIP: 1,
    MOUTH_LEFT: 61,
    MOUTH_RIGHT: 291,
} as const;

// ─── Types ───────────────────────────────────────────────────────────────────

interface Point2D { x: number; y: number }

interface FaceLandmarks {
    points: Point2D[] // [leftEye, rightEye, noseTip, mouthLeft, mouthRight]
}

export interface SimilarityTransform {
    scale: number
    angle: number   // radians
    tx: number   // pixels
    ty: number   // pixels
}

// ─── MediaPipe loader (singleton) ────────────────────────────────────────────

let _faceLandmarkerInstance: FaceLandmarker | null = null;

async function getFaceLandmarker(): Promise<FaceLandmarker> {
    if (_faceLandmarkerInstance) return _faceLandmarkerInstance;

    const filesetResolver = await FilesetResolver.forVisionTasks(
        "https://cdn.jsdelivr.net/npm/@mediapipe/tasks-vision@0.10.32/wasm"
    );

    _faceLandmarkerInstance = await FaceLandmarker.createFromOptions(filesetResolver, {
        baseOptions: {
            modelAssetPath: `https://storage.googleapis.com/mediapipe-models/face_landmarker/face_landmarker/float16/1/face_landmarker.task`,
            delegate: "GPU"
        },
        outputFaceBlendshapes: false,
        runningMode: "IMAGE",
        numFaces: 1,
    });

    return _faceLandmarkerInstance;
}

// ─── Image helpers ────────────────────────────────────────────────────────────

function loadImage(src: string): Promise<HTMLImageElement> {
    return new Promise((resolve, reject) => {
        const img = new Image();
        img.crossOrigin = "anonymous";
        img.onload = () => resolve(img);
        img.onerror = reject;
        img.src = src;
    });
}

// ─── Landmark detection ───────────────────────────────────────────────────────

async function detectLandmarks(
    img: HTMLImageElement
): Promise<FaceLandmarks> {
    const faceLandmarker = await getFaceLandmarker();

    const result = faceLandmarker.detect(img);

    if (!result.faceLandmarks?.length) {
        throw new Error("No face detected");
    }

    const raw = result.faceLandmarks[0];
    const W = img.naturalWidth;
    const H = img.naturalHeight;

    const px = (idx: number) => ({
        x: raw[idx].x * W,
        y: raw[idx].y * H,
    });

    const midpoint = (indices: number[]) => {
        const p1 = px(indices[0]);
        const p2 = px(indices[1]);
        return {
            x: (p1.x + p2.x) / 2,
            y: (p1.y + p2.y) / 2
        };
    };

    return {
        points: [
            midpoint(LM.LEFT_EYE as any),
            midpoint(LM.RIGHT_EYE as any),
            px(LM.NOSE_TIP),
            px(LM.MOUTH_LEFT),
            px(LM.MOUTH_RIGHT)
        ]
    };
}

// ─── Procrustes Analysis (Similarity Transform) ──────────────────────────────

function computeProcrustesTransform(
    src: Point2D[],
    dst: Point2D[]
): SimilarityTransform {
    const n = src.length;
    if (n !== dst.length || n < 2) throw new Error("Need at least 2 points");

    const srcMean = src.reduce((a, b) => ({ x: a.x + b.x, y: a.y + b.y }), { x: 0, y: 0 });
    const dstMean = dst.reduce((a, b) => ({ x: a.x + b.x, y: a.y + b.y }), { x: 0, y: 0 });
    srcMean.x /= n; srcMean.y /= n;
    dstMean.x /= n; dstMean.y /= n;

    const src0 = src.map(p => ({ x: p.x - srcMean.x, y: p.y - srcMean.y }));
    const dst0 = dst.map(p => ({ x: p.x - dstMean.x, y: p.y - dstMean.y }));

    let sumSrcDstX = 0, sumSrcDstY = 0, sumSrcSq = 0;
    for (let i = 0; i < n; i++) {
        sumSrcDstX += src0[i].x * dst0[i].x + src0[i].y * dst0[i].y;
        sumSrcDstY += src0[i].x * dst0[i].y - src0[i].y * dst0[i].x;
        sumSrcSq += src0[i].x * src0[i].x + src0[i].y * src0[i].y;
    }

    const a = sumSrcDstX / sumSrcSq;
    const b = sumSrcDstY / sumSrcSq;

    const scale = Math.sqrt(a * a + b * b);
    const angle = Math.atan2(b, a);

    const tx = dstMean.x - (a * srcMean.x - b * srcMean.y);
    const ty = dstMean.y - (b * srcMean.x + a * srcMean.y);

    return { scale, angle, tx, ty };
}

// ─── Public API ───────────────────────────────────────────────────────────────

export interface AlignResult {
    alignedUrl: string
    success: boolean
    error?: string
}

export async function alignGeneratedToReference(
    referenceUrl: string,
    generatedUrl: string,
): Promise<AlignResult> {
    try {
        console.log("[alignFaces] Starting robust alignment (v3)...");
        const [refImg, genImg] = await Promise.all([
            loadImage(referenceUrl),
            loadImage(generatedUrl),
        ]);

        const [refLM, genLM] = await Promise.all([
            detectLandmarks(refImg),
            detectLandmarks(genImg),
        ]);

        const transform = computeProcrustesTransform(genLM.points, refLM.points);

        const canvas = document.createElement("canvas");
        canvas.width = refImg.naturalWidth;
        canvas.height = refImg.naturalHeight;
        const ctx = canvas.getContext("2d")!;

        const cos = Math.cos(transform.angle);
        const sin = Math.sin(transform.angle);
        const s = transform.scale;

        ctx.setTransform(s * cos, s * sin, -s * sin, s * cos, transform.tx, transform.ty);
        ctx.drawImage(genImg, 0, 0);

        const alignedUrl = canvas.toDataURL("image/jpeg", 1.0);
        console.log("[alignFaces] V3 Successful. Scale:", transform.scale.toFixed(4), "Angle:", transform.angle.toFixed(4));

        return { alignedUrl, success: true };

    } catch (err: any) {
        console.warn("[alignFaces] V3 alignment failed:", err?.message);
        return {
            alignedUrl: generatedUrl,
            success: false,
            error: err?.message ?? "Unknown error",
        };
    }
}
