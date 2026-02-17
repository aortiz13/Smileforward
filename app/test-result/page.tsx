"use client";

import WidgetContainer from "@/components/widget/WidgetContainer";

export default function TestResultPage() {
    return (
        <div className="min-h-screen bg-zinc-50 dark:bg-zinc-950 flex items-center justify-center p-4">
            <div className="w-full max-w-6xl">
                <WidgetContainer initialStep="LOCKED_RESULT" />
            </div>
        </div>
    );
}
