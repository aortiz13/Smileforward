import { FilesetResolver, FaceLandmarker } from "@mediapipe/tasks-vision";

// Singleton to avoid reloading model
let faceLandmarker: FaceLandmarker | null = null;

async function getFaceLandmarker() {
    if (faceLandmarker) return faceLandmarker;

    const vision = await FilesetResolver.forVisionTasks(
        "https://cdn.jsdelivr.net/npm/@mediapipe/tasks-vision@0.10.3/wasm"
    );
    faceLandmarker = await FaceLandmarker.createFromOptions(vision, {
        baseOptions: {
            modelAssetPath: `https://storage.googleapis.com/mediapipe-models/face_landmarker/face_landmarker/float16/1/face_landmarker.task`,
            delegate: "GPU",
        },
        runningMode: "IMAGE",
        numFaces: 2,
    });
    return faceLandmarker;
}

export async function validateStaticImage(file: File): Promise<{ isValid: boolean; reason?: string }> {
    try {
        const landmarker = await getFaceLandmarker();

        // Convert File to ImageBitmap for MediaPipe
        const image = await createImageBitmap(file);

        const result = landmarker.detect(image);

        // Close bitmap to free memory
        image.close();

        if (result.faceLandmarks.length === 0) {
            return { isValid: false, reason: "No se detectó ningún rostro. Asegúrate de que haya buena iluminación." };
        }
        if (result.faceLandmarks.length > 1) {
            return { isValid: false, reason: "Se detectaron múltiples rostros. Por favor sube una foto solo tuya." };
        }

        const landmarks = result.faceLandmarks[0];

        // Landmarks: 1 = Nose Tip, 234 = Left Cheek, 454 = Right Cheek
        const noseTip = landmarks[1];
        const leftCheek = landmarks[234];
        const rightCheek = landmarks[454];

        // 1. Centered Check
        // MediaPipe coords are normalized [0,1]
        const isCentered = noseTip.x > 0.3 && noseTip.x < 0.7 && noseTip.y > 0.2 && noseTip.y < 0.8;
        if (!isCentered) {
            return { isValid: false, reason: "El rostro no está centrado en la imagen." };
        }

        // 2. Size/Distance Check (Face Width relative to image width)
        const faceWidth = Math.abs(rightCheek.x - leftCheek.x);

        // If face width is too small (< 20% of image), it's too far
        if (faceWidth < 0.20) {
            return { isValid: false, reason: "El rostro está demasiado lejos. Acércate más." };
        }

        // If face width is too large (> 85% of image), it might be a macro shot/too close
        if (faceWidth > 0.85) {
            return { isValid: false, reason: "El rostro está demasiado cerca (Macro). Aléjate un poco." };
        }

        return { isValid: true };

    } catch (error) {
        console.error("MediaPipe Validation Error:", error);
        // Fail open or closed? If MediaPipe fails, maybe we interpret as "Unprocessable"
        return { isValid: false, reason: "Error técnico al procesar la imagen." };
    }
}
