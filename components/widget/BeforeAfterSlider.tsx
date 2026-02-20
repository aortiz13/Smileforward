"use client";
import React, { useState, useRef, useEffect, useCallback } from "react";

interface BeforeAfterSliderProps {
    beforeImage: string;
    afterImage: string;
    className?: string;
}

export const BeforeAfterSlider: React.FC<BeforeAfterSliderProps> = ({
    beforeImage,
    afterImage,
    className = "",
}) => {
    const [sliderPosition, setSliderPosition] = useState(50);
    const [isResizing, setIsResizing] = useState(false);
    const [imagesLoaded, setImagesLoaded] = useState({ before: false, after: false });
    const containerRef = useRef<HTMLDivElement>(null);

    const handleImageLoad = (type: "before" | "after") => {
        setImagesLoaded(prev => ({ ...prev, [type]: true }));
    };

    // ── Slider logic ──────────────────────────────────────────────────────
    const handleStart = () => setIsResizing(true);
    const handleEnd = () => setIsResizing(false);

    const handleMove = useCallback(
        (clientX: number) => {
            if (!isResizing || !containerRef.current) return;
            const rect = containerRef.current.getBoundingClientRect();
            const x = Math.max(0, Math.min(clientX - rect.left, rect.width));
            const percentage = (x / rect.width) * 100;
            setSliderPosition(percentage);
        },
        [isResizing]
    );

    useEffect(() => {
        const handleGlobalEnd = () => setIsResizing(false);
        const handleGlobalMove = (e: MouseEvent) => { if (isResizing) handleMove(e.clientX); };
        const handleGlobalTouchMove = (e: TouchEvent) => { if (isResizing) handleMove(e.touches[0].clientX); };

        window.addEventListener("mouseup", handleGlobalEnd);
        window.addEventListener("touchend", handleGlobalEnd);
        window.addEventListener("mousemove", handleGlobalMove);
        window.addEventListener("touchmove", handleGlobalTouchMove);

        return () => {
            window.removeEventListener("mouseup", handleGlobalEnd);
            window.removeEventListener("touchend", handleGlobalEnd);
            window.removeEventListener("mousemove", handleGlobalMove);
            window.removeEventListener("touchmove", handleGlobalTouchMove);
        };
    }, [isResizing, handleMove]);

    // ── Render ─────────────────────────────────────────────────────────────
    return (
        <div
            ref={containerRef}
            className={`relative w-full aspect-[9/16] overflow-hidden select-none cursor-ew-resize group ${className}`}
            onMouseDown={handleStart}
            onTouchStart={handleStart}
            onContextMenu={(e) => e.preventDefault()}
        >
            {/* After Image (Background) */}
            <img
                src={afterImage}
                alt="After"
                className={`absolute inset-0 w-full h-full object-cover transition-opacity duration-300 ${imagesLoaded.after ? "opacity-100" : "opacity-0"}`}
                draggable={false}
                onLoad={() => handleImageLoad("after")}
            />

            {!imagesLoaded.before && !imagesLoaded.after && (
                <div className="absolute inset-0 flex items-center justify-center bg-zinc-100 dark:bg-zinc-800 animate-pulse">
                    <div className="w-8 h-8 rounded-full border-2 border-zinc-300 border-t-zinc-600 animate-spin" />
                </div>
            )}

            {/* Watermark Overlay */}
            <div className="absolute inset-0 z-[5] pointer-events-none flex items-center justify-center overflow-hidden">
                <img
                    src="/watermark-logo.png"
                    alt=""
                    className="w-[120%] max-w-none opacity-[0.15] -rotate-45 object-contain select-none"
                    draggable={false}
                />
            </div>

            <div className="absolute top-4 right-4 bg-[#C44D4D] text-white px-2 py-1 rounded text-xs font-bold pointer-events-none z-10">
                DESPUÉS
            </div>

            {/* Before Image (Foreground - Clipped) */}
            <div
                className={`absolute inset-0 overflow-hidden transition-opacity duration-300 ${imagesLoaded.before ? "opacity-100" : "opacity-0"}`}
                style={{ clipPath: `inset(0 ${100 - sliderPosition}% 0 0)` }}
            >
                <img
                    src={beforeImage}
                    alt="Before"
                    className="absolute inset-0 w-full h-full object-cover"
                    draggable={false}
                    onLoad={() => handleImageLoad("before")}
                />
                <div className="absolute top-4 left-4 bg-black/50 text-white px-2 py-1 rounded text-xs font-bold pointer-events-none z-10">
                    ANTES
                </div>
            </div>

            {/* Slider Handle */}
            <div
                className={`absolute inset-y-0 transition-opacity duration-300 ${imagesLoaded.before && imagesLoaded.after ? "opacity-100" : "opacity-0"}`}
                style={{ left: `${sliderPosition}%` }}
            >
                {/* Vertical Line */}
                <div className="absolute inset-y-0 -ml-0.5 w-0.5 bg-white shadow-[0_0_10px_rgba(0,0,0,0.5)]" />

                {/* Round Handle */}
                <div className="absolute top-1/2 -mt-6 -ml-6 w-12 h-12 rounded-full bg-[#7f8b81] border-2 border-white flex items-center justify-center shadow-[0_4px_12px_rgba(0,0,0,0.3)] transition-transform transform hover:scale-110 active:scale-95">
                    <div className="flex items-center gap-1">
                        <svg width="6" height="10" viewBox="0 0 6 10" fill="none" xmlns="http://www.w3.org/2000/svg">
                            <path d="M5 9L1 5L5 1" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
                        </svg>
                        <svg width="6" height="10" viewBox="0 0 6 10" fill="none" xmlns="http://www.w3.org/2000/svg">
                            <path d="M1 9L5 5L1 1" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
                        </svg>
                    </div>
                </div>
            </div>
        </div>
    );
};
