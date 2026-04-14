"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import {
    Dialog,
    DialogContent,
    DialogHeader,
    DialogTitle,
    DialogDescription,
} from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import {
    Mail, Phone, User, ImageIcon, MonitorPlay, Download,
    Share2, CheckCircle2, Loader2, Archive, Trees, Home,
    Briefcase, Wine, Palmtree, Trash2, XCircle, AlertCircle,
    ChevronLeft, Send
} from "lucide-react";
import { BeforeAfterSlider } from "@/components/widget/BeforeAfterSlider";
import { Button } from "@/components/ui/button";
// Supabase client removed — using internal API routes
import { toast } from "sonner";
import { deleteLeadAction } from "@/app/(admin)/administracion/leads/actions";

interface LeadDetailModalProps {
    lead: any | null;
    open: boolean;
    onOpenChange: (open: boolean) => void;
    onLeadUpdated?: () => void;
}

// ─── Video generation stages (simulated progress) ──────────────────────────
const VIDEO_STAGES = [
    { at: 0, label: "🔍 Analizando imagen..." },
    { at: 10, label: "🎨 Generando escena..." },
    { at: 28, label: "🎬 Inicializando video..." },
    { at: 45, label: "⚙️  Renderizando fotogramas..." },
    { at: 68, label: "✨ Aplicando efectos finales..." },
    { at: 85, label: "📦 Guardando resultado..." },
    { at: 93, label: "🏁 Casi listo..." },
];

const TOTAL_ESTIMATED_MS = 115_000;
const TICK_MS = 800;
const MAX_AUTO_PROGRESS = 94;

export function LeadDetailModal({ lead, open, onOpenChange, onLeadUpdated }: LeadDetailModalProps) {
    const [loadingAction, setLoadingAction] = useState(false);
    const [generatingVideo, setGeneratingVideo] = useState(false);
    const [videoGen, setVideoGen] = useState<any>(null);
    const [viewMode, setViewMode] = useState<"video" | "images">("images");
    const [selectedScenario, setSelectedScenario] = useState<string | null>(null);
    const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
    const [deleting, setDeleting] = useState(false);
    const [errorMessage, setErrorMessage] = useState<string | null>(null);

    // Progress state
    const [videoProgress, setVideoProgress] = useState(0);
    const [videoStage, setVideoStage] = useState("");
    const [sendingVideo, setSendingVideo] = useState(false);
    const [sendingPhoto, setSendingPhoto] = useState(false);
    const [mobileTab, setMobileTab] = useState<"info" | "video" | "gestion">("info");

    // ── Browser Notification helpers ─────────────────────────────────────
    const notificationSoundRef = useRef<HTMLAudioElement | null>(null);

    // Request notification permission on first render
    useEffect(() => {
        if (typeof window !== 'undefined' && 'Notification' in window && Notification.permission === 'default') {
            Notification.requestPermission().then(perm => {
                console.log('[Notification] Permission:', perm);
            });
        }
        // Pre-create audio element for notification sound
        if (typeof window !== 'undefined' && !notificationSoundRef.current) {
            const audio = new Audio('data:audio/wav;base64,UklGRnoGAABXQVZFZm10IBAAAAABAAEAQB8AAEAfAAABAAgAZGF0YQoGAACBhYqFbF1eXGBkamtzd350b2ZfWFVTU1dcY2x1fYOIioyKhoB5cWliXFpbX2VsdHuBhYmLjIuJhX94cWlhW1lZXWNqcnl/g4eKi4uKiIR+d3BpYlxaWl5ka3J5f4OHiouLioiEfndwamNdW1teZGtzeYCEiIuMi4qIhH53cGpiXVtbX2VscnqAhYmLjIuJh4N9dnBqY11bW19la3N6gIWJi4yLioiDfXZvaWNdW1tfZGtzeoGFiYuMi4qIg312b2ljXVtbX2Rrc3qBhYmLjIuKiIN9dm9pY11bW19ka3N6gYWJi4yLioiDfXZwamNeXFxgZm10e4GGiYuLioiEfnhxamRfXV1hZ250e4KGiouLioiFf3hxamRfXV1hZm10fIKHiouLioiFgHlya2RfXl1hZm11fIKHiouLioiFgHlya2VgXl5hZm11fIKHiouLioiFgHlya2VgXl5hZm51fIKH');
            audio.volume = 0.5;
            notificationSoundRef.current = audio;
        }
    }, []);

    const sendBrowserNotification = useCallback((title: string, body: string, isError = false) => {
        // Play notification sound
        try {
            notificationSoundRef.current?.play().catch(() => {});
        } catch (_) {}

        // Send native browser notification
        if (typeof window !== 'undefined' && 'Notification' in window && Notification.permission === 'granted') {
            const notification = new Notification(title, {
                body,
                icon: isError ? '❌' : '🎬',
                badge: '/favicon.ico',
                tag: 'video-generation',
                requireInteraction: true,
            });
            notification.onclick = () => {
                window.focus();
                notification.close();
            };
        }
    }, []);

    // Reset simple states when lead changes
    useEffect(() => {
        if (open) {
            setSelectedScenario(null);
            setViewMode("images");
            setVideoProgress(0);
            setVideoStage("");
            setErrorMessage(null);
            console.log(`[VideoDebug] Modal opened for Lead ID: ${lead?.id}`);
        }
    }, [lead?.id, open]);

    // ── Refs ──────────────────────────────────────────────────────────────
    const pollingRef = useRef<ReturnType<typeof setInterval> | null>(null);
    const progressRef = useRef<ReturnType<typeof setInterval> | null>(null);
    const generatingRef = useRef(false);
    const stopProgressRef = useRef<(completed?: boolean) => void>(() => { });

    const storageBaseUrl = process.env.NEXT_PUBLIC_STORAGE_URL || "";

    const scenarios = [
        { id: "park", label: "Parque", icon: Trees, description: "Exterior natural, luz de día" },
        { id: "home", label: "Hogar", icon: Home, description: "Interior cálido, entorno familiar" },
        { id: "office", label: "Oficina", icon: Briefcase, description: "Profesional, ambiente de trabajo" },
        { id: "dinner", label: "Cena", icon: Wine, description: "Social, noche, alta gama" },
        { id: "beach", label: "Playa", icon: Palmtree, description: "Vacaciones, sol y mar" },
    ];

    // ── Progress helpers ────────────────────────────────────────────────────

    const stopProgress = useCallback((completed = false) => {
        if (progressRef.current) {
            console.log(`[VideoDebug] Stopping simulated progress. Completed? ${completed}`);
            clearInterval(progressRef.current);
            progressRef.current = null;
        }
        if (completed) {
            setVideoProgress(100);
            setVideoStage("✅ ¡Vídeo listo!");
        }
    }, []);

    stopProgressRef.current = stopProgress;

    const startProgress = useCallback(() => {
        console.log("[VideoDebug] Starting simulated progress bar...");
        stopProgress(false);
        setVideoProgress(0);
        setVideoStage(VIDEO_STAGES[0].label);

        const increment = (MAX_AUTO_PROGRESS / (TOTAL_ESTIMATED_MS / TICK_MS));

        progressRef.current = setInterval(() => {
            setVideoProgress(prev => {
                const next = Math.min(prev + increment, MAX_AUTO_PROGRESS);
                const stage = [...VIDEO_STAGES].reverse().find(s => next >= s.at);
                if (stage) setVideoStage(stage.label);

                // Loguear solo saltos grandes para no saturar consola
                if (Math.floor(next) % 10 === 0 && Math.floor(next) !== Math.floor(prev)) {
                    // console.log(`[VideoDebug] Progress: ${Math.floor(next)}%`);
                }
                return next;
            });
        }, TICK_MS);
    }, [stopProgress]);

    // ── Polling & Cancellation ──────────────────────────────────────────────

    const clearPollingInterval = useCallback(() => {
        if (pollingRef.current) {
            console.log("[VideoDebug] 🛑 Clearing Polling Interval.");
            clearInterval(pollingRef.current);
            pollingRef.current = null;
        }
    }, []);

    const startPolling = useCallback((generationId: string) => {
        clearPollingInterval();
        console.log(`[VideoDebug] 🚀 Start Polling for Generation ID: ${generationId}`);
        setErrorMessage(null);

        let isPollingActive = true;

        pollingRef.current = setInterval(async () => {
            if (!isPollingActive || !generatingRef.current) {
                console.log("[VideoDebug] Polling aborted (component unmounted or stopped manually).");
                clearPollingInterval();
                return;
            }

            try {
                console.log(`[VideoDebug] Pinging check-video...`);
                const start = Date.now();
                const checkRes = await fetch('/api/ai/video/check', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ generation_id: generationId }),
                });
                const data = await checkRes.json();
                console.log(`[VideoDebug] Ping response in ${Date.now() - start}ms. Status: ${data?.status}`);

                if (!checkRes.ok) throw new Error(data?.error || 'Check video failed');

                // CASO 1: COMPLETED
                if (data?.status === "completed") {
                    console.log("[VideoDebug] ✅ STATUS COMPLETED DETECTED!");

                    isPollingActive = false;
                    clearPollingInterval();

                    console.log("[VideoDebug] Forcing progress to 100%...");
                    stopProgressRef.current(true);

                    setVideoProgress(100);
                    setVideoStage("✅ Finalizando...");

                    setTimeout(() => {
                        console.log("[VideoDebug] Timeout finished. Switching UI to Video View.");
                        if (generatingRef.current) {
                            generatingRef.current = false;
                            setGeneratingVideo(false);
                            setVideoGen(data);
                            setViewMode("video");
                            toast.success("¡Vídeo generado con éxito! 🎉");
                            sendBrowserNotification(
                                '🎬 ¡Video listo!',
                                `El video de ${lead?.name || 'el lead'} se generó con éxito. Haz clic para verlo.`
                            );
                            onLeadUpdated?.();
                        }
                    }, 800);

                    // CASO 2: ERROR/FAILED
                } else if (data?.status === "error" || data?.status === "failed") {
                    console.error("[VideoDebug] ❌ STATUS FAILED/ERROR:", data);

                    isPollingActive = false;
                    clearPollingInterval();
                    stopProgressRef.current(false);
                    generatingRef.current = false;
                    setGeneratingVideo(false);

                    const rawError = data.error?.message || data.error || data.metadata?.error?.message || data.metadata?.error || "";
                    const rawStr = typeof rawError === 'string' ? rawError : JSON.stringify(rawError);

                    // Translate technical errors to user-friendly Spanish messages
                    let errorMsg: string;
                    if (rawStr.includes('audio') || rawStr.includes('safety') || rawStr.includes('RAI_FILTERED')) {
                        errorMsg = "El filtro de seguridad de Google bloqueó la generación. Intenta con otro escenario o con una foto diferente.";
                    } else if (rawStr.includes('RESOURCE_EXHAUSTED') || rawStr.includes('429') || rawStr.includes('quota')) {
                        errorMsg = "Se alcanzó el límite de generaciones por ahora. Espera unos minutos e intenta de nuevo.";
                    } else if (rawStr.includes('503') || rawStr.includes('UNAVAILABLE') || rawStr.includes('unavailable')) {
                        errorMsg = "El servicio de generación de video está temporalmente fuera de línea. Intenta de nuevo en unos minutos.";
                    } else if (rawStr.includes('No smile image') || rawStr.includes('No completed')) {
                        errorMsg = "No se encontró la imagen de sonrisa. Genera primero la imagen antes de crear el video.";
                    } else if (rawStr.includes('timeout') || rawStr.includes('DEADLINE')) {
                        errorMsg = "La generación tardó demasiado tiempo. Intenta de nuevo.";
                    } else if (rawStr.includes('could not create your video')) {
                        errorMsg = "No se pudo crear el video con esta combinación. Prueba con otro escenario.";
                    } else if (rawStr.includes('400') || rawStr.includes('INVALID')) {
                        errorMsg = "Hubo un problema con la solicitud. Intenta con otra foto o escenario.";
                    } else if (rawStr && rawStr !== '{}') {
                        errorMsg = "Ocurrió un problema durante la generación. Intenta de nuevo o prueba con otro escenario.";
                    } else {
                        errorMsg = "La generación no se completó. Intenta de nuevo con otro escenario.";
                    }

                    console.error('[VideoDebug] Raw error:', rawStr, '→ User message:', errorMsg);
                    setErrorMessage(errorMsg);
                    toast.error("Error al generar vídeo");
                    sendBrowserNotification(
                        '❌ Error en video',
                        `No se pudo generar el video de ${lead?.name || 'el lead'}. ${errorMsg}`,
                        true
                    );
                    onLeadUpdated?.();
                } else {
                    console.log(`[VideoDebug] Still processing... (Status: ${data?.status})`);
                }

            } catch (err) {
                console.error("[VideoDebug] Network Error during poll (ignoring):", err);
            }
        }, 4000);
    }, [clearPollingInterval, onLeadUpdated]);

    // Función para cancelar
    const handleCancelGeneration = async () => {
        if (!videoGen?.id) return;

        console.log("[VideoDebug] User requested cancellation.");
        clearPollingInterval();
        stopProgress(false);
        setGeneratingVideo(false);
        generatingRef.current = false;
        toast.info("Cancelando generación...");

        try {
            await fetch('/api/ai/video/cancel', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ generation_id: videoGen.id })
            });
            console.log("[VideoDebug] Cancel request sent to server successfully.");
            setErrorMessage("Generación cancelada por el usuario.");
            toast.success("Generación cancelada");
        } catch (e) {
            console.error("[VideoDebug] Error sending cancel request:", e);
            toast.error("No se pudo cancelar en el servidor (pero se detuvo localmente)");
        }
    };

    // ── Cleanup ──────────────────────────────────────────────────────────
    useEffect(() => {
        return () => {
            console.log("[VideoDebug] Component Unmounting - Cleaning up all intervals.");
            clearPollingInterval();
            stopProgress(false);
            generatingRef.current = false;
        };
    }, [clearPollingInterval, stopProgress]);

    // ── Sync with lead prop ───────────────────────────────────────────────
    useEffect(() => {
        if (!lead || !open) return;

        const completedVideo = lead.generations?.find(
            (g: any) => g.type === "video" && g.status === "completed"
        );
        const pendingVideo = lead.generations?.find(
            (g: any) =>
                g.type === "video" &&
                ["pending", "processing", "processing_video", "processing_video_veo", "initializing"].includes(g.status)
        );

        console.log(`[VideoDebug] Syncing Lead State. Completed: ${!!completedVideo}, Pending: ${!!pendingVideo}`);

        clearPollingInterval();
        stopProgress(false);

        if (completedVideo) {
            console.log("[VideoDebug] Found completed video. Showing result.");
            setVideoGen(completedVideo);
            setGeneratingVideo(false);
            generatingRef.current = false;
        } else if (pendingVideo) {
            console.log(`[VideoDebug] Found pending video (ID: ${pendingVideo.id}). Resuming polling.`);
            setVideoGen(pendingVideo);
            setGeneratingVideo(true);
            generatingRef.current = true;
            startProgress();
            startPolling(pendingVideo.id);
        } else {
            setVideoGen(null);
            setGeneratingVideo(false);
            generatingRef.current = false;
        }
    }, [lead?.id, open]);

    if (!lead) return null;

    // ── Handlers ──────────────────────────────────────────────────────────

    const handleGenerateVideo = async () => {
        if (!lead.id) return;

        console.log("[VideoDebug] User clicked Generate Video.");
        setGeneratingVideo(true);
        generatingRef.current = true;
        setErrorMessage(null);
        startProgress();

        toast.info("Iniciando generación de vídeo...");

        try {
            const genRes = await fetch('/api/ai/video/generate', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    lead_id: lead.id,
                    scenario_id: selectedScenario === "automatic" ? null : selectedScenario,
                }),
            });
            const data = await genRes.json();

            if (!genRes.ok) throw new Error(data?.error || 'Video generation failed');

            console.log("[VideoDebug] Generate API Success. New Gen ID:", data.generation_id);
            const newVideoGen = { id: data.generation_id, status: "initializing" };
            setVideoGen(newVideoGen);
            startPolling(data.generation_id);
        } catch (error: any) {
            console.error("[VideoDebug] Generate API Failed:", error);
            stopProgress(false);
            setGeneratingVideo(false);
            generatingRef.current = false;
            toast.error("Error al iniciar generación: " + error.message);
        }
    };
    const handleSendVideo = async () => {
        if (!lead?.id || !videoGen?.output_path) return;

        setSendingVideo(true);
        toast.info("Enviando video por email...");

        try {
            const sendRes = await fetch('/api/email/send-video', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    leadId: lead.id,
                    videoPath: videoGen.output_path,
                }),
            });
            const data = await sendRes.json();

            if (!sendRes.ok) throw new Error(data?.error || 'Send video failed');
            if (data.success) {
                toast.success("¡Video enviado con éxito! 📧");
            } else {
                throw new Error(data.error || "Error al enviar");
            }
        } catch (error: any) {
            console.error("[VideoDebug] Send Video Failed:", error);
            toast.error("Error al enviar el video: " + error.message);
        } finally {
            setSendingVideo(false);
        }
    };

    // ... (El resto de handlers: handleMarkContacted, handleDeleteLead, handleWhatsApp se mantienen igual) ...
    const handleMarkContacted = async () => {
        if (!lead) return;
        setLoadingAction(true);
        try {
            const updateRes = await fetch('/api/db', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    action: 'update_lead_status',
                    data: { lead_id: lead.id, status: 'contacted' }
                })
            });
            const updateResult = await updateRes.json();
            if (!updateResult.success) throw new Error(updateResult.error);
            toast.success("Lead marcado como contactado");
            onLeadUpdated?.();
            onOpenChange(false);
        } catch (error: any) {
            toast.error("Error al actualizar estado");
            console.error(error);
        } finally {
            setLoadingAction(false);
        }
    };

    const handleDeleteLead = async () => {
        if (!lead?.id) return;
        setDeleting(true);
        try {
            const result = await deleteLeadAction(lead.id);
            if (result.success) {
                toast.success("Lead eliminado correctamente");
                onLeadUpdated?.();
                onOpenChange(false);
            } else {
                toast.error(result.error || "Error al eliminar el lead");
            }
        } catch (error: any) {
            toast.error("Error crítico al eliminar");
            console.error(error);
        } finally {
            setDeleting(false);
            setShowDeleteConfirm(false);
        }
    };

    const handleWhatsApp = () => {
        if (!lead.phone) return;
        const clean = lead.phone.replace(/\+/g, "").replace(/\s+/g, "").replace(/-/g, "");
        window.open(`https://wa.me/${clean}`, "_blank");
    };

    const handleResendPhoto = async () => {
        if (!lead?.email || !generation?.output_path) return;
        setSendingPhoto(true);
        toast.info("Enviando imagen por email...");
        try {
            const res = await fetch('/api/email/send-photo', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    email: lead.email,
                    name: lead.name,
                    imageUrl: generation.output_path,
                    leadId: lead.id,
                }),
            });
            const data = await res.json();
            if (!res.ok || !data.success) throw new Error(data?.error || 'Error al enviar');
            toast.success("¡Imagen enviada por email! 📧");
        } catch (error: any) {
            console.error("[ResendPhoto] Error:", error);
            toast.error("Error al enviar imagen: " + error.message);
        } finally {
            setSendingPhoto(false);
        }
    };


    const StatusBadge = ({ status }: { status: string }) => {
        const styles: Record<string, string> = {
            pending: "bg-yellow-100 text-yellow-800 border-yellow-200",
            contacted: "bg-blue-100 text-blue-800 border-blue-200",
            converted: "bg-green-100 text-green-800 border-green-200",
            rejected: "bg-red-100 text-red-800 border-red-200",
        };
        const labels: Record<string, string> = {
            pending: "Pendiente",
            contacted: "Contactado",
            converted: "Convertido",
            rejected: "Rechazado",
        };
        return (
            <Badge variant="outline" className={`${styles[status] || styles.pending} text-sm px-3 py-1`}>
                {labels[status] || status}
            </Badge>
        );
    };

    const generation = lead.generations?.find(
        (g: any) => g.type === "image" && g.status === "completed"
    );

    const isVideoCompleted = videoGen?.status === "completed";
    const canGenerate = !generatingVideo && !isVideoCompleted && !!selectedScenario;


    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent className="max-w-full md:max-w-[1400px] w-full h-[100dvh] md:h-[85vh] overflow-hidden flex flex-col p-0 gap-0 rounded-none md:rounded-lg">

                {/* ═══════════════════════════════════════════════════════ */}
                {/* ══  MOBILE LAYOUT  ═══════════════════════════════════ */}
                {/* ═══════════════════════════════════════════════════════ */}
                <div className="md:hidden flex flex-col h-full bg-background">

                    {/* ── Mobile Hero: Image Preview ── */}
                    <div className="relative bg-zinc-950 flex-none" style={{ height: '42vh' }}>
                        {/* Compact top bar overlay */}
                        <div className="absolute inset-x-0 top-0 z-20 flex items-center justify-between p-3 bg-gradient-to-b from-black/70 to-transparent">
                            <div className="flex items-center gap-2 min-w-0">
                                <button
                                    onClick={() => onOpenChange(false)}
                                    className="w-8 h-8 rounded-full bg-white/20 backdrop-blur-md flex items-center justify-center active:scale-90 transition-transform"
                                >
                                    <ChevronLeft className="w-5 h-5 text-white" />
                                </button>
                                <div className="w-8 h-8 rounded-full bg-white/20 backdrop-blur-md flex items-center justify-center">
                                    <User className="w-4 h-4 text-white" />
                                </div>
                                <div className="min-w-0">
                                    <p className="text-white text-sm font-bold truncate">{lead.name}</p>
                                    <p className="text-white/60 text-[10px]">{new Date(lead.created_at).toLocaleDateString()}</p>
                                </div>
                            </div>
                            <StatusBadge status={lead.status} />
                        </div>

                        {/* Image/Video toggle pills */}
                        {isVideoCompleted && (
                            <div className="absolute bottom-3 left-1/2 -translate-x-1/2 z-20 flex bg-white/10 backdrop-blur-md p-0.5 rounded-full border border-white/10">
                                <button
                                    onClick={() => setViewMode("images")}
                                    className={`px-3 py-1 rounded-full text-[10px] font-bold transition-all ${viewMode === "images" ? "bg-white text-black" : "text-white/70"}`}
                                >
                                    Antes/Después
                                </button>
                                <button
                                    onClick={() => setViewMode("video")}
                                    className={`px-3 py-1 rounded-full text-[10px] font-bold transition-all ${viewMode === "video" ? "bg-white text-black" : "text-white/70"}`}
                                >
                                    Video
                                </button>
                            </div>
                        )}

                        {/* Image content */}
                        <div className="w-full h-full flex items-center justify-center">
                            {viewMode === "images" ? (
                                generation ? (
                                    <div className="relative w-full h-full flex items-center justify-center p-2">
                                        {generation.input_path && generation.input_path !== "unknown" ? (
                                            <div className="relative h-full w-auto aspect-[9/16] rounded-xl overflow-hidden bg-zinc-800 shadow-2xl">
                                                <BeforeAfterSlider
                                                    beforeImage={generation.input_path}
                                                    afterImage={generation.output_path}
                                                    className="w-full h-full"
                                                />
                                            </div>
                                        ) : (
                                            <img
                                                src={generation.output_path}
                                                alt="Generated Smile"
                                                className="w-full h-full object-contain"
                                            />
                                        )}
                                    </div>
                                ) : (
                                    <div className="text-center text-white/40">
                                        <ImageIcon className="w-12 h-12 mx-auto mb-2 opacity-30" strokeWidth={1.5} />
                                        <p className="text-xs">Sin imágenes</p>
                                    </div>
                                )
                            ) : isVideoCompleted ? (
                                <div className="relative h-full w-auto aspect-[9/16] rounded-xl overflow-hidden bg-black">
                                    <video
                                        key={videoGen.output_path}
                                        src={`${storageBaseUrl}/generated/${videoGen.output_path}`}
                                        className="w-full h-full object-contain"
                                        controls
                                        autoPlay
                                        muted
                                        playsInline
                                        loop
                                    />
                                    <Button
                                        size="sm"
                                        className="absolute top-2 right-2 h-7 rounded-full bg-primary hover:bg-primary/90 text-primary-foreground text-[10px] font-bold px-2.5 z-30"
                                        onClick={handleSendVideo}
                                        disabled={sendingVideo}
                                    >
                                        {sendingVideo ? <Loader2 className="w-3 h-3 animate-spin mr-1" /> : <Send className="w-3 h-3 mr-1" />}
                                        Enviar
                                    </Button>
                                </div>
                            ) : null}
                        </div>
                    </div>

                    {/* ── Floating Quick Actions Bar ── */}
                    <div className="flex-none border-b bg-background px-3 py-2.5">
                        <div className="flex items-center gap-1.5">
                            <button
                                onClick={handleWhatsApp}
                                className="flex-1 flex items-center justify-center gap-1.5 py-2.5 rounded-xl bg-green-600 text-white text-xs font-bold active:scale-95 transition-transform"
                            >
                                <Share2 className="w-3.5 h-3.5" />
                                <span className="hidden xs:inline">WhatsApp</span>
                            </button>
                            <a
                                href={`tel:${lead.phone}`}
                                className="flex items-center justify-center w-9 h-9 rounded-xl bg-blue-50 text-blue-600 active:scale-95 transition-transform shrink-0"
                            >
                                <Phone className="w-4 h-4" />
                            </a>
                            {generation && (
                                <button
                                    onClick={handleResendPhoto}
                                    disabled={sendingPhoto}
                                    className="flex items-center justify-center w-9 h-9 rounded-xl bg-primary text-primary-foreground active:scale-95 transition-transform disabled:opacity-50 shrink-0"
                                    title="Reenviar imagen por email"
                                >
                                    {sendingPhoto ? <Loader2 className="w-4 h-4 animate-spin" /> : <ImageIcon className="w-4 h-4" />}
                                </button>
                            )}
                            {isVideoCompleted && (
                                <button
                                    onClick={handleSendVideo}
                                    disabled={sendingVideo}
                                    className="flex items-center justify-center w-9 h-9 rounded-xl bg-primary text-primary-foreground active:scale-95 transition-transform disabled:opacity-50 shrink-0"
                                    title="Reenviar video por email"
                                >
                                    {sendingVideo ? <Loader2 className="w-4 h-4 animate-spin" /> : <MonitorPlay className="w-4 h-4" />}
                                </button>
                            )}
                            <a
                                href={`mailto:${lead.email}`}
                                className="flex items-center justify-center w-9 h-9 rounded-xl bg-secondary text-secondary-foreground active:scale-95 transition-transform shrink-0"
                                title="Enviar email"
                            >
                                <Mail className="w-4 h-4" />
                            </a>
                            <button
                                onClick={handleMarkContacted}
                                disabled={loadingAction || lead.status === "contacted"}
                                className={`flex items-center justify-center w-9 h-9 rounded-xl active:scale-95 transition-transform shrink-0 ${lead.status === "contacted"
                                    ? "bg-green-50 text-green-600"
                                    : "bg-yellow-50 text-yellow-600"
                                    }`}
                                title={lead.status === "contacted" ? "Ya contactado" : "Marcar contactado"}
                            >
                                {loadingAction ? <Loader2 className="w-4 h-4 animate-spin" /> : <CheckCircle2 className="w-4 h-4" />}
                            </button>
                        </div>
                    </div>

                    {/* ── Mobile Tab Bar ── */}
                    <div className="flex-none border-b bg-background">
                        <div className="flex">
                            {([
                                { id: "info" as const, label: "Información", icon: User },
                                { id: "video" as const, label: "Video", icon: MonitorPlay },
                                { id: "gestion" as const, label: "Gestión", icon: Briefcase },
                            ]).map((tab) => (
                                <button
                                    key={tab.id}
                                    onClick={() => setMobileTab(tab.id)}
                                    className={`flex-1 flex items-center justify-center gap-1.5 py-2.5 text-xs font-semibold border-b-2 transition-colors ${mobileTab === tab.id
                                        ? "border-primary text-primary"
                                        : "border-transparent text-muted-foreground"
                                        }`}
                                >
                                    <tab.icon className="w-3.5 h-3.5" />
                                    {tab.label}
                                </button>
                            ))}
                        </div>
                    </div>

                    {/* ── Mobile Tab Content ── */}
                    <div className="flex-1 overflow-y-auto">

                        {/* ── Tab: Info ── */}
                        {mobileTab === "info" && (
                            <div className="p-4 space-y-4">
                                {/* Contact compact */}
                                <div className="bg-card rounded-xl border shadow-sm divide-y">
                                    <a href={`mailto:${lead.email}`} className="flex items-center gap-3 p-3 active:bg-muted/20 transition-colors">
                                        <div className="w-9 h-9 rounded-full bg-primary/10 flex items-center justify-center text-primary shrink-0">
                                            <Mail className="w-4 h-4" />
                                        </div>
                                        <div className="min-w-0">
                                            <p className="text-[10px] text-muted-foreground font-medium uppercase">Email</p>
                                            <p className="text-sm font-semibold truncate">{lead.email}</p>
                                        </div>
                                    </a>
                                    <a href={`tel:${lead.phone}`} className="flex items-center gap-3 p-3 active:bg-muted/20 transition-colors">
                                        <div className="w-9 h-9 rounded-full bg-primary/10 flex items-center justify-center text-primary shrink-0">
                                            <Phone className="w-4 h-4" />
                                        </div>
                                        <div>
                                            <p className="text-[10px] text-muted-foreground font-medium uppercase">Teléfono</p>
                                            <p className="text-sm font-semibold">{lead.phone}</p>
                                        </div>
                                    </a>
                                </div>

                                {/* Survey Data */}
                                {lead.survey_data && Object.keys(lead.survey_data).length > 0 && (
                                    <div className="space-y-2.5">
                                        <h3 className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground px-1">
                                            Cuestionario
                                        </h3>
                                        <div className="grid grid-cols-2 gap-2">
                                            <div className="bg-card rounded-xl border p-3">
                                                <p className="text-[9px] text-muted-foreground uppercase font-bold mb-0.5">Edad</p>
                                                <p className="text-xs font-semibold">
                                                    {lead.survey_data.ageRange === "18-30" ? "18-30"
                                                        : lead.survey_data.ageRange === "30-55" ? "30-55"
                                                            : lead.survey_data.ageRange === "55+" ? "55+"
                                                                : lead.survey_data.ageRange}
                                                </p>
                                            </div>
                                            <div className="bg-card rounded-xl border p-3">
                                                <p className="text-[9px] text-muted-foreground uppercase font-bold mb-0.5">Objetivo</p>
                                                <p className="text-xs font-semibold">
                                                    {lead.survey_data.improvementGoal === "alignment" ? "Alineación"
                                                        : lead.survey_data.improvementGoal === "veneers" ? "Carillas"
                                                            : lead.survey_data.improvementGoal === "implants" ? "Implantes"
                                                                : lead.survey_data.improvementGoal === "full_smile" ? "Sonrisa Completa"
                                                                    : lead.survey_data.improvementGoal === "whitening" ? "Blanqueamiento"
                                                                        : lead.survey_data.improvementGoal}
                                                </p>
                                            </div>
                                            <div className="bg-card rounded-xl border p-3">
                                                <p className="text-[9px] text-muted-foreground uppercase font-bold mb-0.5">Plazo</p>
                                                <p className="text-xs font-semibold">
                                                    {lead.survey_data.timeframe === "now" ? "Ahora"
                                                        : lead.survey_data.timeframe === "1-3_months" ? "1-3 meses"
                                                            : lead.survey_data.timeframe === "later" ? "Más adelante"
                                                                : lead.survey_data.timeframe}
                                                </p>
                                            </div>
                                            <div className="bg-card rounded-xl border p-3">
                                                <p className="text-[9px] text-muted-foreground uppercase font-bold mb-0.5">Clínica</p>
                                                <p className="text-xs font-semibold">{lead.survey_data.clinicPreference}</p>
                                            </div>
                                        </div>
                                    </div>
                                )}
                            </div>
                        )}

                        {/* ── Tab: Video ── */}
                        {mobileTab === "video" && (
                            <div className="p-4 space-y-4">
                                {generation ? (
                                    <>
                                        {/* Scenario selector */}
                                        <div className="space-y-2.5">
                                            <h3 className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground px-1">
                                                Escenario
                                            </h3>
                                            <div className="flex gap-1.5 overflow-x-auto pb-1 -mx-1 px-1">
                                                {scenarios.map((s) => (
                                                    <button
                                                        key={s.id}
                                                        onClick={() => setSelectedScenario(s.id)}
                                                        disabled={generatingVideo || isVideoCompleted}
                                                        className={`flex flex-col items-center justify-center min-w-[60px] p-2 rounded-xl border transition-all shrink-0 ${selectedScenario === s.id
                                                            ? "bg-primary/10 border-primary text-primary shadow-sm"
                                                            : "bg-card border-muted text-muted-foreground"
                                                            } ${(generatingVideo || isVideoCompleted) ? "opacity-50" : ""}`}
                                                    >
                                                        <s.icon className={`w-5 h-5 mb-1 ${selectedScenario === s.id ? "text-primary" : "text-muted-foreground"}`} />
                                                        <span className="text-[9px] font-bold">{s.label}</span>
                                                    </button>
                                                ))}
                                            </div>
                                        </div>

                                        {/* Error Message */}
                                        {errorMessage && (
                                            <div className="p-3 bg-red-50 border border-red-200 rounded-xl flex items-start gap-2 text-red-800 text-sm">
                                                <AlertCircle className="w-4 h-4 mt-0.5 shrink-0" />
                                                <div>
                                                    <p className="font-bold text-xs">Generación detenida</p>
                                                    <p className="opacity-90 text-[11px] mt-0.5">{errorMessage}</p>
                                                </div>
                                            </div>
                                        )}

                                        {/* Generate / Progress button */}
                                        <button
                                            onClick={handleGenerateVideo}
                                            disabled={!canGenerate}
                                            className={`
                                                relative w-full h-12 rounded-xl overflow-hidden font-bold text-sm
                                                transition-all duration-300 select-none
                                                ${isVideoCompleted
                                                    ? "bg-green-600 text-white"
                                                    : canGenerate
                                                        ? "bg-primary text-primary-foreground active:scale-[0.98]"
                                                        : "bg-muted text-muted-foreground"
                                                }
                                            `}
                                        >
                                            {generatingVideo && (
                                                <>
                                                    <span className="absolute inset-0 bg-black/20" />
                                                    <span
                                                        className="absolute inset-y-0 left-0 bg-white/20 transition-all duration-700 ease-linear"
                                                        style={{ width: `${videoProgress}%` }}
                                                    />
                                                </>
                                            )}
                                            <span className="relative z-10 flex items-center justify-between px-4 h-full">
                                                {generatingVideo ? (
                                                    <>
                                                        <span className="flex items-center gap-2">
                                                            <Loader2 className="w-4 h-4 animate-spin shrink-0" />
                                                            <span className="truncate text-xs">{videoStage || "Iniciando..."}</span>
                                                        </span>
                                                        <span className="text-xs font-mono opacity-80 shrink-0 ml-2 tabular-nums">
                                                            {Math.round(videoProgress)}%
                                                        </span>
                                                    </>
                                                ) : isVideoCompleted ? (
                                                    <span className="flex items-center gap-2 w-full justify-center">
                                                        <CheckCircle2 className="w-4 h-4" />
                                                        Vídeo Generado
                                                    </span>
                                                ) : (
                                                    <span className="flex items-center gap-2 w-full justify-center">
                                                        <MonitorPlay className="w-4 h-4" />
                                                        Generar Vídeo Smile
                                                    </span>
                                                )}
                                            </span>
                                        </button>

                                        {/* Cancel */}
                                        {generatingVideo && (
                                            <Button
                                                variant="ghost"
                                                size="sm"
                                                className="w-full text-xs text-muted-foreground hover:text-red-600"
                                                onClick={handleCancelGeneration}
                                            >
                                                <XCircle className="w-3.5 h-3.5 mr-1.5" />
                                                Cancelar
                                            </Button>
                                        )}

                                        {generatingVideo && (
                                            <div className="w-full h-1 bg-muted rounded-full overflow-hidden">
                                                <div
                                                    className="h-full bg-primary rounded-full transition-all duration-700 ease-linear"
                                                    style={{ width: `${videoProgress}%` }}
                                                />
                                            </div>
                                        )}
                                    </>
                                ) : (
                                    <div className="text-center py-12 text-muted-foreground">
                                        <MonitorPlay className="w-10 h-10 mx-auto mb-3 opacity-20" />
                                        <p className="text-sm">No hay imágenes generadas para crear un video.</p>
                                    </div>
                                )}
                            </div>
                        )}

                        {/* ── Tab: Gestión ── */}
                        {mobileTab === "gestion" && (
                            <div className="p-4 space-y-3">
                                <Button
                                    variant="outline"
                                    className="w-full justify-start gap-2"
                                    onClick={handleMarkContacted}
                                    disabled={loadingAction || lead.status === "contacted"}
                                >
                                    {loadingAction ? (
                                        <Loader2 className="w-4 h-4 animate-spin" />
                                    ) : lead.status === "contacted" ? (
                                        <CheckCircle2 className="w-4 h-4 text-green-600" />
                                    ) : (
                                        <CheckCircle2 className="w-4 h-4" />
                                    )}
                                    {lead.status === "contacted" ? "Ya contactado" : "Marcar como Contactado"}
                                </Button>

                                <Button variant="secondary" className="w-full justify-start gap-2">
                                    <Archive className="w-4 h-4" />
                                    Archivar Lead
                                </Button>

                                <Separator className="my-2" />

                                <Button
                                    variant="destructive"
                                    className="w-full justify-start gap-2"
                                    onClick={() => setShowDeleteConfirm(true)}
                                    disabled={deleting}
                                >
                                    <Trash2 className="w-4 h-4" />
                                    Eliminar Lead
                                </Button>
                            </div>
                        )}
                    </div>
                </div>

                {/* ═══════════════════════════════════════════════════════ */}
                {/* ══  DESKTOP LAYOUT (unchanged)  ═════════════════════ */}
                {/* ═══════════════════════════════════════════════════════ */}
                <div className="hidden md:flex md:flex-col flex-1 overflow-hidden">
                    {/* Header */}
                    <div className="p-6 border-b flex-none bg-background">
                        <DialogHeader className="flex flex-row items-center justify-between space-y-0">
                            <div>
                                <DialogTitle className="text-2xl font-bold flex items-center gap-2">
                                    <User className="text-primary w-6 h-6" />
                                    {lead.name}
                                </DialogTitle>
                                <DialogDescription>
                                    Solicitud recibida el {new Date(lead.created_at).toLocaleDateString()}
                                </DialogDescription>
                            </div>
                            <StatusBadge status={lead.status} />
                        </DialogHeader>
                    </div>

                    <div className="grid grid-cols-12 flex-1 overflow-hidden">

                        {/* Left Column */}
                        <div className="col-span-5 border-r bg-muted/10 p-8 space-y-8 overflow-y-auto">

                            {/* Contact */}
                            <div className="space-y-4">
                                <h3 className="text-sm font-semibold uppercase tracking-wider text-muted-foreground border-b pb-2">
                                    Contacto
                                </h3>
                                <div className="bg-card rounded-lg border shadow-sm p-4 space-y-4">
                                    <div className="flex items-center gap-3">
                                        <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center text-primary shrink-0">
                                            <Mail className="w-5 h-5" />
                                        </div>
                                        <div className="overflow-hidden">
                                            <p className="text-xs text-muted-foreground font-medium">Correo Electrónico</p>
                                            <a href={`mailto:${lead.email}`} className="text-sm font-semibold hover:underline truncate block">
                                                {lead.email}
                                            </a>
                                        </div>
                                    </div>
                                    <Separator />
                                    <div className="flex items-center gap-3">
                                        <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center text-primary shrink-0">
                                            <Phone className="w-5 h-5" />
                                        </div>
                                        <div>
                                            <p className="text-xs text-muted-foreground font-medium">Teléfono</p>
                                            <a href={`tel:${lead.phone}`} className="text-sm font-semibold hover:underline">
                                                {lead.phone}
                                            </a>
                                        </div>
                                    </div>
                                </div>
                            </div>

                            {/* Survey Data */}
                            {lead.survey_data && Object.keys(lead.survey_data).length > 0 && (
                                <div className="space-y-4">
                                    <h3 className="text-sm font-semibold uppercase tracking-wider text-muted-foreground border-b pb-2">
                                        Preferencias (Cuestionario)
                                    </h3>
                                    <div className="grid grid-cols-2 gap-3">
                                        <div className="bg-card rounded-lg border p-3 shadow-sm">
                                            <p className="text-[10px] text-muted-foreground uppercase font-bold mb-1">Rango de Edad</p>
                                            <p className="text-sm font-semibold">
                                                {lead.survey_data.ageRange === "18-30" ? "18 - 30 (Joven)"
                                                    : lead.survey_data.ageRange === "30-55" ? "30 - 55 (Media)"
                                                        : lead.survey_data.ageRange === "55+" ? "55+ (Senior)"
                                                            : lead.survey_data.ageRange}
                                            </p>
                                        </div>
                                        <div className="bg-card rounded-lg border p-3 shadow-sm">
                                            <p className="text-[10px] text-muted-foreground uppercase font-bold mb-1">Objetivo</p>
                                            <p className="text-sm font-semibold">
                                                {lead.survey_data.improvementGoal === "alignment" ? "Alineación"
                                                    : lead.survey_data.improvementGoal === "veneers" ? "Carillas"
                                                        : lead.survey_data.improvementGoal === "implants" ? "Implantes"
                                                            : lead.survey_data.improvementGoal === "full_smile" ? "Sonrisa Completa"
                                                                : lead.survey_data.improvementGoal === "whitening" ? "Blanqueamiento"
                                                                    : lead.survey_data.improvementGoal}
                                            </p>
                                        </div>
                                        <div className="bg-card rounded-lg border p-3 shadow-sm">
                                            <p className="text-[10px] text-muted-foreground uppercase font-bold mb-1">Plazo</p>
                                            <p className="text-sm font-semibold">
                                                {lead.survey_data.timeframe === "now" ? "Ahora mismo"
                                                    : lead.survey_data.timeframe === "1-3_months" ? "1 - 3 meses"
                                                        : lead.survey_data.timeframe === "later" ? "Más adelante"
                                                            : lead.survey_data.timeframe}
                                            </p>
                                        </div>
                                        <div className="bg-card rounded-lg border p-3 shadow-sm">
                                            <p className="text-[10px] text-muted-foreground uppercase font-bold mb-1">Clínica</p>
                                            <p className="text-sm font-semibold">{lead.survey_data.clinicPreference}</p>
                                        </div>
                                    </div>
                                </div>
                            )}

                            {/* Actions */}
                            <div className="space-y-4">
                                <h3 className="text-sm font-semibold uppercase tracking-wider text-muted-foreground border-b pb-2">
                                    Acciones Rápidas
                                </h3>
                                <div className="grid gap-3">
                                    <Button className="w-full bg-green-600 hover:bg-green-700 font-bold" size="lg" onClick={handleWhatsApp}>
                                        <Share2 className="w-4 h-4 mr-2" />
                                        Contactar por WhatsApp
                                    </Button>

                                    {generation && (
                                        <Button
                                            className="w-full bg-primary hover:bg-primary/90 font-bold text-primary-foreground"
                                            size="lg"
                                            onClick={handleResendPhoto}
                                            disabled={sendingPhoto}
                                        >
                                            {sendingPhoto ? (
                                                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                                            ) : (
                                                <Send className="w-4 h-4 mr-2" />
                                            )}
                                            {sendingPhoto ? "Enviando..." : "Reenviar Imagen por Email"}
                                        </Button>
                                    )}

                                    {isVideoCompleted && (
                                        <Button
                                            className="w-full bg-zinc-800 hover:bg-zinc-700 font-bold text-white"
                                            size="lg"
                                            onClick={handleSendVideo}
                                            disabled={sendingVideo}
                                        >
                                            {sendingVideo ? (
                                                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                                            ) : (
                                                <MonitorPlay className="w-4 h-4 mr-2" />
                                            )}
                                            {sendingVideo ? "Enviando..." : "Reenviar Video por Email"}
                                        </Button>
                                    )}

                                    {generation && (
                                        <div className="space-y-4 pt-2">
                                            {/* Scenario selector */}
                                            <div className="space-y-2">
                                                <p className="text-[10px] text-muted-foreground uppercase font-bold px-1">
                                                    Escenario del Vídeo
                                                </p>
                                                <div className="grid grid-cols-3 gap-2">
                                                    {scenarios.map((s) => (
                                                        <button
                                                            key={s.id}
                                                            onClick={() => setSelectedScenario(s.id)}
                                                            disabled={generatingVideo || isVideoCompleted}
                                                            className={`flex flex-col items-center justify-center p-2 rounded-lg border transition-all ${selectedScenario === s.id
                                                                ? "bg-primary/10 border-primary text-primary shadow-sm"
                                                                : "bg-card border-muted hover:border-primary/50 text-muted-foreground"
                                                                } ${(generatingVideo || isVideoCompleted) ? "opacity-50 cursor-not-allowed" : "cursor-pointer"}`}
                                                        >
                                                            <s.icon className={`w-5 h-5 mb-1 ${selectedScenario === s.id ? "text-primary" : "text-muted-foreground"}`} />
                                                            <span className="text-[10px] font-bold truncate w-full text-center">{s.label}</span>
                                                        </button>
                                                    ))}
                                                </div>
                                            </div>

                                            {/* Error Message */}
                                            {errorMessage && (
                                                <div className="p-3 bg-red-50 border border-red-200 rounded-md flex items-start gap-2 text-red-800 text-sm animate-in fade-in slide-in-from-top-2">
                                                    <AlertCircle className="w-4 h-4 mt-0.5 shrink-0" />
                                                    <div className="w-full break-words">
                                                        <p className="font-bold">Generación detenida</p>
                                                        <p className="opacity-90 text-xs mt-1">{errorMessage}</p>
                                                    </div>
                                                </div>
                                            )}

                                            {/* Progress/Generate Button */}
                                            <div className="relative group">
                                                <button
                                                    onClick={handleGenerateVideo}
                                                    disabled={!canGenerate}
                                                    className={`
                                                        relative w-full h-11 rounded-md overflow-hidden font-bold text-sm
                                                        transition-all duration-300 select-none
                                                        ${isVideoCompleted
                                                            ? "bg-green-600 text-white cursor-default"
                                                            : canGenerate
                                                                ? "bg-primary text-primary-foreground hover:bg-primary/90 cursor-pointer"
                                                                : "bg-muted text-muted-foreground cursor-not-allowed"
                                                        }
                                                    `}
                                                >
                                                    {generatingVideo && (
                                                        <>
                                                            <span className="absolute inset-0 bg-black/20" />
                                                            <span
                                                                className="absolute inset-y-0 left-0 bg-white/20 transition-all duration-700 ease-linear"
                                                                style={{ width: `${videoProgress}%` }}
                                                            />
                                                        </>
                                                    )}

                                                    <span className="relative z-10 flex items-center justify-between px-4 h-full">
                                                        {generatingVideo ? (
                                                            <>
                                                                <span className="flex items-center gap-2">
                                                                    <Loader2 className="w-4 h-4 animate-spin shrink-0" />
                                                                    <span className="truncate">{videoStage || "Iniciando..."}</span>
                                                                </span>
                                                                <span className="text-xs font-mono opacity-80 shrink-0 ml-2 tabular-nums">
                                                                    {Math.round(videoProgress)}%
                                                                </span>
                                                            </>
                                                        ) : isVideoCompleted ? (
                                                            <span className="flex items-center gap-2 w-full justify-center">
                                                                <CheckCircle2 className="w-4 h-4" />
                                                                Vídeo Generado
                                                            </span>
                                                        ) : (
                                                            <span className="flex items-center gap-2 w-full justify-center">
                                                                <MonitorPlay className="w-4 h-4" />
                                                                Generar Vídeo Smile
                                                            </span>
                                                        )}
                                                    </span>
                                                </button>

                                                {/* Cancel Button */}
                                                {generatingVideo && (
                                                    <Button
                                                        variant="ghost"
                                                        size="sm"
                                                        className="mt-2 w-full text-xs text-muted-foreground hover:text-red-600 hover:bg-red-50"
                                                        onClick={(e) => {
                                                            e.stopPropagation();
                                                            handleCancelGeneration();
                                                        }}
                                                    >
                                                        <XCircle className="w-4 h-4 mr-1.5" />
                                                        Cancelar generación
                                                    </Button>
                                                )}
                                            </div>

                                            {generatingVideo && (
                                                <div className="w-full h-1 bg-muted rounded-full overflow-hidden -mt-1">
                                                    <div
                                                        className="h-full bg-primary rounded-full transition-all duration-700 ease-linear"
                                                        style={{ width: `${videoProgress}%` }}
                                                    />
                                                </div>
                                            )}
                                        </div>
                                    )}

                                    <div className="grid grid-cols-2 gap-3">
                                        <Button
                                            variant="outline"
                                            className="w-full"
                                            onClick={handleMarkContacted}
                                            disabled={loadingAction || lead.status === "contacted"}
                                        >
                                            {loadingAction ? (
                                                <Loader2 className="w-4 h-4 animate-spin" />
                                            ) : lead.status === "contacted" ? (
                                                <CheckCircle2 className="w-4 h-4 mr-2" />
                                            ) : null}
                                            {lead.status === "contacted" ? "Contactado" : "Marcar Contactado"}
                                        </Button>
                                        <Button
                                            variant="destructive"
                                            className="w-full"
                                            onClick={() => setShowDeleteConfirm(true)}
                                            disabled={deleting}
                                        >
                                            <Trash2 className="w-4 h-4 mr-2" />
                                            Eliminar Lead
                                        </Button>
                                        <Button variant="secondary" className="w-full">
                                            <Archive className="w-4 h-4 mr-2" />
                                            Archivar
                                        </Button>
                                    </div>
                                </div>
                            </div>
                        </div>

                        {/* Right Column */}
                        <div className="col-span-7 bg-zinc-950 p-4 relative flex flex-col items-center overflow-hidden">
                            {isVideoCompleted && (
                                <div className="absolute top-6 left-6 z-30 flex bg-white/10 backdrop-blur-md p-1 rounded-full border border-white/10">
                                    <button
                                        onClick={() => setViewMode("images")}
                                        className={`px-4 py-1.5 rounded-full text-xs font-bold transition-all ${viewMode === "images" ? "bg-white text-black shadow-lg" : "text-white/70 hover:text-white"}`}
                                    >
                                        <ImageIcon className="w-3.5 h-3.5 inline mr-1.5" /> Imágenes
                                    </button>
                                    <button
                                        onClick={() => setViewMode("video")}
                                        className={`px-4 py-1.5 rounded-full text-xs font-bold transition-all ${viewMode === "video" ? "bg-white text-black shadow-lg" : "text-white/70 hover:text-white"}`}
                                    >
                                        <MonitorPlay className="w-3.5 h-3.5 inline mr-1.5" /> Video
                                    </button>
                                </div>
                            )}

                            <div className="w-full h-full flex items-center justify-center pt-8">
                                {viewMode === "images" ? (
                                    generation ? (
                                        <>
                                            <div className="relative w-full h-full flex items-center justify-center">
                                                {generation.input_path && generation.input_path !== "unknown" ? (
                                                    <div className="relative h-[90%] w-auto aspect-[9/16] rounded-[2.5rem] overflow-hidden bg-zinc-100 dark:bg-zinc-800 border border-zinc-100 dark:border-zinc-800 shadow-2xl">
                                                        <BeforeAfterSlider
                                                            beforeImage={generation.input_path}
                                                            afterImage={generation.output_path}
                                                            className="w-full h-full"
                                                        />
                                                    </div>
                                                ) : (
                                                    <img
                                                        src={generation.output_path}
                                                        alt="Generated Smile"
                                                        className="w-full h-full object-contain"
                                                    />
                                                )}
                                            </div>
                                        </>
                                    ) : (
                                        <div className="text-center text-muted-foreground p-8">
                                            <ImageIcon className="w-16 h-16 mx-auto mb-4 opacity-20" strokeWidth={1.5} />
                                            <p>Sin imágenes disponibles</p>
                                        </div>
                                    )
                                ) : (
                                    isVideoCompleted && (
                                        <div className="relative h-[90%] w-auto aspect-[9/16] rounded-2xl overflow-hidden shadow-2xl border border-white/10 bg-black">
                                            <video
                                                key={videoGen.output_path}
                                                src={`${storageBaseUrl}/generated/${videoGen.output_path}`}
                                                className="w-full h-full object-contain"
                                                controls
                                                autoPlay
                                                muted
                                                playsInline
                                                loop
                                            />
                                            <div className="absolute top-4 right-4 z-30 flex gap-2">
                                                <Button
                                                    size="sm"
                                                    variant="secondary"
                                                    className="h-8 rounded-full bg-primary hover:bg-primary/90 border-none text-primary-foreground text-xs font-bold shadow-lg"
                                                    onClick={handleSendVideo}
                                                    disabled={sendingVideo}
                                                >
                                                    {sendingVideo ? (
                                                        <Loader2 className="w-3.5 h-3.5 animate-spin mr-1.5" />
                                                    ) : (
                                                        <Send className="w-3.5 h-3.5 mr-1.5" />
                                                    )}
                                                    <span className="hidden sm:inline">Enviar por Email</span>
                                                    <span className="sm:hidden">Enviar</span>
                                                </Button>
                                                <Button
                                                    size="sm"
                                                    variant="secondary"
                                                    className="h-8 rounded-full bg-black/50 backdrop-blur-md border-white/10 text-white text-xs"
                                                    onClick={() => setViewMode("images")}
                                                >
                                                    Cerrar Video
                                                </Button>
                                            </div>
                                        </div>
                                    )
                                )}
                            </div>
                        </div>
                    </div>
                </div>

                {/* Delete Confirmation Dialog (shared) */}
                <Dialog open={showDeleteConfirm} onOpenChange={setShowDeleteConfirm}>
                    <DialogContent className="max-w-[90vw] sm:max-w-md">
                        <DialogHeader>
                            <DialogTitle>¿Estás completamente seguro?</DialogTitle>
                            <DialogDescription>
                                Esta acción no se puede deshacer.
                            </DialogDescription>
                        </DialogHeader>
                        <div className="flex justify-end gap-3 mt-4">
                            <Button variant="outline" onClick={() => setShowDeleteConfirm(false)} disabled={deleting}>
                                Cancelar
                            </Button>
                            <Button variant="destructive" onClick={handleDeleteLead} disabled={deleting}>
                                {deleting && <Loader2 className="w-4 h-4 animate-spin mr-2" />}
                                Eliminar
                            </Button>
                        </div>
                    </DialogContent>
                </Dialog>

            </DialogContent>
        </Dialog>
    );
}
