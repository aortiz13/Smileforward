"use client";

import WidgetContainer from "@/components/widget/WidgetContainer";

export default function TestResultPage() {
    return (
        <div className="min-h-screen bg-zinc-50 dark:bg-zinc-950 flex items-center justify-center p-4">
            <div className="w-full h-full"> {/* Removed max-w-6xl constraint to allow full screen */}
                <WidgetContainer
                    initialStep="RESULT"
                    initialBeforeImage="https://images.unsplash.com/photo-1549488497-2342d7655074?q=80&w=2692&auto=format&fit=crop" // Placeholder before image
                    initialAfterImage="https://images.unsplash.com/photo-1550523668-386005d5360f?q=80&w=2692&auto=format&fit=crop" // Placeholder after image (in real app this would be the generated one)
                />
            </div>
        </div>
    );
}
