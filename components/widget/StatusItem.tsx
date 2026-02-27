"use client";

import { motion } from "framer-motion";
import { Check, Loader2 } from "lucide-react";
import type { LucideIcon } from "lucide-react";

interface StatusItemProps {
    active: boolean;
    completed: boolean;
    label: string;
    icon: LucideIcon;
}

export function StatusItem({ active, completed, label, icon: Icon }: StatusItemProps) {
    return (
        <motion.div
            initial={{ opacity: 0, x: -10 }}
            animate={{ opacity: 1, x: 0 }}
            className={`flex items-center gap-3 p-3 rounded-lg border transition-colors ${active ? 'bg-primary/10 border-primary/20' : 'bg-transparent border-transparent'} ${completed ? 'text-muted-foreground' : 'text-foreground'}`}
        >
            <div className={`p-2 rounded-full flex-shrink-0 ${completed ? 'bg-green-500/20 text-green-500' : active ? 'bg-primary/20 text-primary animate-pulse' : 'bg-muted text-muted-foreground'}`}>
                {completed ? <Check className="w-4 h-4" strokeWidth={1.5} /> : <Icon className="w-4 h-4" strokeWidth={1.5} />}
            </div>
            <span className={`text-sm font-medium ${active ? 'font-bold' : ''} break-words line-clamp-2`}>{label}</span>
            {active && <Loader2 className="w-3 h-3 ml-auto animate-spin text-primary flex-shrink-0" />}
        </motion.div>
    );
}
