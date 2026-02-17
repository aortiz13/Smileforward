"use client";

import React, { forwardRef } from "react";
import Webcam from "react-webcam";

interface CameraViewProps {
    onUserMedia?: () => void;
}

const videoConstraints = {
    width: 1280,
    height: 720,
    facingMode: "user",
};

export const CameraView = forwardRef<Webcam, CameraViewProps>(
    ({ onUserMedia }, ref) => {
        return (
            <div className="relative w-full h-full overflow-hidden bg-black">
                <Webcam
                    ref={ref}
                    audio={false}
                    className="absolute inset-0 w-full h-full object-cover mirror-x"
                    screenshotFormat="image/jpeg"
                    videoConstraints={videoConstraints}
                    onUserMedia={onUserMedia}
                    mirrored={true}
                    playsInline={true}
                    muted={true}
                />
            </div>
        );
    }
);

CameraView.displayName = "CameraView";
