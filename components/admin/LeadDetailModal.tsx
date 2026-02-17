"use client";

import { useState, useEffect } from "react";
import {
    Dialog,
    DialogContent,
    DialogHeader,
    DialogTitle,
    DialogDescription,
} from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { Mail, Phone, Calendar, User, ImageIcon, MonitorPlay, Download, Share2, CheckCircle2, Loader2, Archive, Trees, Home, Briefcase, Wine, Palmtree, Sparkles, Trash2 } from "lucide-react";
import Image from "next/image";
import { BeforeAfterSlider } from "@/components/widget/BeforeAfterSlider";
import { Button } from "@/components/ui/button";
import { createClient } from "@/utils/supabase/client";
import { toast } from "sonner";
import { deleteLeadAction } from "@/app/(admin)/administracion/leads/actions";

interface LeadDetailModalProps {
    lead: any | null;
    open: boolean;
    onOpenChange: (open: boolean) => void;
    onLeadUpdated?: () => void;
}

export function LeadDetailModal({ lead, open, onOpenChange, onLeadUpdated }: LeadDetailModalProps) {
    const [loadingAction, setLoadingAction] = useState(false);
    const [generatingVideo, setGeneratingVideo] = useState(false);
    const [videoGen, setVideoGen] = useState<any>(null);
    const [viewMode, setViewMode] = useState<'video' | 'images'>('images');
    const [selectedScenario, setSelectedScenario] = useState<string | null>(null);
    const [pollingCount, setPollingCount] = useState(0);
    const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
    const [deleting, setDeleting] = useState(false);

    const scenarios = [
        { id: 'park', label: 'Parque', icon: Trees, description: 'Exterior natural, luz de día' },
        { id: 'home', label: 'Hogar', icon: Home, description: 'Interior cálido, entorno familiar' },
        { id: 'office', label: 'Oficina', icon: Briefcase, description: 'Profesional, ambiente de trabajo' },
        { id: 'dinner', label: 'Cena', icon: Wine, description: 'Social, noche, alta gama' },
        { id: 'beach', label: 'Playa', icon: Palmtree, description: 'Vacaciones, sol y mar' },
    ];

    const supabase = createClient();
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || '';

    // Fetch existing generations (useEffect)
    useEffect(() => {
        if (lead && open) {
            console.log(`[LeadDetailModal] Syncing data for lead: ${lead.id} (${lead.name})`);
            const video = lead.generations?.find((g: any) => g.type === 'video' && g.status === 'completed');
            const pendingVideo = lead.generations?.find((g: any) => g.type === 'video' && (g.status === 'pending' || g.status === 'processing' || g.status === 'processing_video' || g.status === 'processing_video_veo'));

            if (video) {
                console.log("[LeadDetailModal] Found completed video in props:", video.id);
                setVideoGen(video);
                setGeneratingVideo(false);
                // We only force video view if it was just completed or if we're not currently generating
                if (viewMode !== 'video' && !generatingVideo) {
                    setViewMode('video');
                }
            } else if (pendingVideo) {
                console.log("[LeadDetailModal] Found pending video in props:", pendingVideo.id);
                setVideoGen(pendingVideo);
                setGeneratingVideo(true);
            } else {
                setVideoGen(null);
                setGeneratingVideo(false);
            }
        }
    }, [lead, open]); // Depend on full lead object to sync with parent refreshes

    // Polling logic for pending video
    useEffect(() => {
        let interval: any;
        const isPending = videoGen?.status === 'initializing' ||
            videoGen?.status === 'pending' ||
            videoGen?.status === 'processing' ||
            videoGen?.status === 'processing_video' ||
            videoGen?.status === 'processing_video_veo';

        if (generatingVideo && videoGen?.id && isPending) {
            console.log("[LeadDetailModal] Starting polling for video:", videoGen.id);
            interval = setInterval(async () => {
                try {
                    const { data, error } = await supabase.functions.invoke('check-video', {
                        body: { generation_id: videoGen.id }
                    });

                    if (error) throw error;

                    console.log("[LeadDetailModal] Polling Status:", data?.status);

                    if (data?.status === 'completed') {
                        console.log("[LeadDetailModal] Video Ready! Updating UI.", data);
                        setVideoGen(data);
                        setGeneratingVideo(false);
                        setViewMode('video');
                        toast.success("¡Vídeo generado con éxito!");
                        // Notify parent to refresh data
                        if (onLeadUpdated) onLeadUpdated();
                    } else if (data?.status === 'error' || data?.status === 'failed') {
                        console.error("[LeadDetailModal] Video Generation Failed:", data);
                        setGeneratingVideo(false);
                        toast.error("Error al generar vídeo");
                        if (onLeadUpdated) onLeadUpdated();
                    }
                } catch (err) {
                    console.error("Polling error:", err);
                }
            }, 5000);
        }
        return () => {
            if (interval) {
                console.log("[LeadDetailModal] Stopping polling");
                clearInterval(interval);
            }
        };
    }, [generatingVideo, videoGen?.id, videoGen?.status]);

    if (!lead) return null;

    const handleGenerateVideo = async () => {
        if (!lead.id) return;
        setGeneratingVideo(true);
        toast.info("Iniciando generación de vídeo...", {
            description: "Estamos procesando tu solicitud. Recibirás una notificación cuando el vídeo esté listo."
        });

        try {
            const { data: { session } } = await supabase.auth.getSession();
            if (!session) throw new Error("No hay sesión activa");

            const { data, error } = await supabase.functions.invoke('generate-video', {
                body: {
                    lead_id: lead.id,
                    scenario_id: selectedScenario === 'automatic' ? null : selectedScenario
                },
                headers: {
                    Authorization: `Bearer ${session.access_token}`
                }
            });

            if (error) throw error;

            console.log("[LeadDetailModal] Video generation initiated:", data);
            setVideoGen({ id: data.generation_id, status: 'initializing' });
        } catch (error: any) {
            setGeneratingVideo(false);
            toast.error("Error al iniciar generación: " + error.message);
            console.error(error);
        }
    };

    const handleMarkContacted = async () => {
        if (!lead) return;
        setLoadingAction(true);
        try {
            const { error } = await supabase
                .from('leads')
                .update({ status: 'contacted' })
                .eq('id', lead.id);

            if (error) throw error;

            toast.success("Lead marcado como contactado");
            if (onLeadUpdated) onLeadUpdated();
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
                if (onLeadUpdated) onLeadUpdated();
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
        const cleanNumber = lead.phone.replace(/\+/g, '').replace(/\s+/g, '').replace(/-/g, '');
        window.open(`https://wa.me/${cleanNumber}`, '_blank');
    };

    const StatusBadge = ({ status }: { status: string }) => {
        const styles: Record<string, string> = {
            pending: "bg-yellow-100 text-yellow-800 border-yellow-200",
            contacted: "bg-blue-100 text-blue-800 border-blue-200",
            converted: "bg-green-100 text-green-800 border-green-200",
            rejected: "bg-red-100 text-red-800 border-red-200"
        };

        const labels: Record<string, string> = {
            pending: "Pendiente",
            contacted: "Contactado",
            converted: "Convertido",
            rejected: "Rechazado"
        };

        return (
            <Badge variant="outline" className={`${styles[status] || styles.pending} text-sm px-3 py-1`}>
                {labels[status] || status}
            </Badge>
        );
    };

    // Find linked generation (prioritize image)
    const generation = lead.generations?.find((g: any) => g.type === 'image' && g.status === 'completed');

    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent className="max-w-[95vw] md:max-w-[1400px] w-full h-[90vh] sm:h-[80vh] overflow-hidden flex flex-col p-0 gap-0">
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

                <div className="grid grid-cols-1 md:grid-cols-12 flex-1 overflow-hidden">
                    {/* Left Column: Details */}
                    <div className="col-span-12 md:col-span-5 border-r bg-muted/10 p-8 space-y-8 overflow-y-auto">

                        {/* Contact Card */}
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

                        {/* Preferencias del Paciente */}
                        {lead.survey_data && Object.keys(lead.survey_data).length > 0 && (
                            <div className="space-y-4">
                                <h3 className="text-sm font-semibold uppercase tracking-wider text-muted-foreground border-b pb-2">
                                    Preferencias (Cuestionario)
                                </h3>
                                <div className="grid grid-cols-2 gap-3">
                                    <div className="bg-card rounded-lg border p-3 shadow-sm">
                                        <p className="text-[10px] text-muted-foreground uppercase font-bold mb-1">Rango de Edad</p>
                                        <p className="text-sm font-semibold">
                                            {lead.survey_data.ageRange === '18-30' ? '18 - 30 (Joven)' :
                                                lead.survey_data.ageRange === '30-55' ? '30 - 55 (Media)' :
                                                    lead.survey_data.ageRange === '55+' ? '55+ (Senior)' : lead.survey_data.ageRange}
                                        </p>
                                    </div>
                                    <div className="bg-card rounded-lg border p-3 shadow-sm">
                                        <p className="text-[10px] text-muted-foreground uppercase font-bold mb-1">Objetivo</p>
                                        <p className="text-sm font-semibold">
                                            {lead.survey_data.improvementGoal === 'alignment' ? 'Alineación' :
                                                lead.survey_data.improvementGoal === 'veneers' ? 'Carillas' :
                                                    lead.survey_data.improvementGoal === 'implants' ? 'Implantes' :
                                                        lead.survey_data.improvementGoal === 'full_smile' ? 'Sonrisa Completa' :
                                                            lead.survey_data.improvementGoal === 'whitening' ? 'Blanqueamiento' : lead.survey_data.improvementGoal}
                                        </p>
                                    </div>
                                    <div className="bg-card rounded-lg border p-3 shadow-sm">
                                        <p className="text-[10px] text-muted-foreground uppercase font-bold mb-1">Plazo</p>
                                        <p className="text-sm font-semibold">
                                            {lead.survey_data.timeframe === 'now' ? 'Ahora mismo' :
                                                lead.survey_data.timeframe === '1-3_months' ? '1 - 3 meses' :
                                                    lead.survey_data.timeframe === 'later' ? 'Más adelante' : lead.survey_data.timeframe}
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
                                <Button
                                    className="w-full bg-green-600 hover:bg-green-700 font-bold"
                                    size="lg"
                                    onClick={handleWhatsApp}
                                >
                                    <Share2 className="w-4 h-4 mr-2" />
                                    Contactar por WhatsApp
                                </Button>

                                {generation && (
                                    <div className="space-y-4 pt-2">
                                        <div className="space-y-2">
                                            <p className="text-[10px] text-muted-foreground uppercase font-bold px-1">Escenario del Vídeo</p>
                                            <div className="grid grid-cols-3 gap-2">
                                                {scenarios.map((s) => (
                                                    <button
                                                        key={s.id}
                                                        onClick={() => setSelectedScenario(s.id)}
                                                        disabled={generatingVideo || (videoGen && videoGen.status === 'completed')}
                                                        className={`flex flex-col items-center justify-center p-2 rounded-lg border transition-all ${selectedScenario === s.id
                                                            ? 'bg-primary/10 border-primary text-primary shadow-sm'
                                                            : 'bg-card border-muted hover:border-primary/50 text-muted-foreground'
                                                            } ${(generatingVideo || (videoGen && videoGen.status === 'completed')) ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer'}`}
                                                    >
                                                        <s.icon className={`w-5 h-5 mb-1 ${selectedScenario === s.id ? 'text-primary' : 'text-muted-foreground'}`} />
                                                        <span className="text-[10px] font-bold truncate w-full text-center">{s.label}</span>
                                                    </button>
                                                ))}
                                            </div>
                                        </div>

                                        <Button
                                            className="w-full bg-primary font-bold"
                                            size="lg"
                                            onClick={handleGenerateVideo}
                                            disabled={generatingVideo || (videoGen && videoGen.status === 'completed') || !selectedScenario}
                                        >
                                            {generatingVideo ? (
                                                <>
                                                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                                                    Generando Vídeo...
                                                </>
                                            ) : videoGen && videoGen.status === 'completed' ? (
                                                <>
                                                    <CheckCircle2 className="w-4 h-4 mr-2" />
                                                    Vídeo Generado
                                                </>
                                            ) : (
                                                <>
                                                    <MonitorPlay className="w-4 h-4 mr-2" />
                                                    Generar Vídeo Smile
                                                </>
                                            )}
                                        </Button>
                                    </div>
                                )}

                                <div className="grid grid-cols-2 gap-3">
                                    <Button
                                        variant="outline"
                                        className="w-full"
                                        onClick={handleMarkContacted}
                                        disabled={loadingAction || lead.status === 'contacted'}
                                    >
                                        {loadingAction ? <Loader2 className="w-4 h-4 animate-spin" /> :
                                            lead.status === 'contacted' ? <CheckCircle2 className="w-4 h-4 mr-2" /> : null}
                                        {lead.status === 'contacted' ? "Contactado" : "Marcar Contactado"}
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

                    {/* Deletion Confirmation Dialog */}
                    <Dialog open={showDeleteConfirm} onOpenChange={setShowDeleteConfirm}>
                        <DialogContent className="max-w-md">
                            <DialogHeader>
                                <DialogTitle>¿Estás completamente seguro?</DialogTitle>
                                <DialogDescription>
                                    Esta acción no se puede deshacer. Esto eliminará permanentemente al lead
                                    <strong> {lead.name}</strong>, todos sus resultados de análisis y las imágenes/vídeos generados.
                                </DialogDescription>
                            </DialogHeader>
                            <div className="flex justify-end gap-3 mt-4">
                                <Button
                                    variant="outline"
                                    onClick={() => setShowDeleteConfirm(false)}
                                    disabled={deleting}
                                >
                                    Cancelar
                                </Button>
                                <Button
                                    variant="destructive"
                                    onClick={handleDeleteLead}
                                    disabled={deleting}
                                >
                                    {deleting ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : null}
                                    Eliminar Definitivamente
                                </Button>
                            </div>
                        </DialogContent>
                    </Dialog>

                    {/* Right Column: Visual Result */}
                    <div className="col-span-12 md:col-span-7 bg-zinc-950 p-4 relative flex flex-col items-center overflow-hidden">

                        {/* Selector de Vista (Toggle) */}
                        {videoGen && videoGen.status === 'completed' && (
                            <div className="absolute top-6 left-6 z-30 flex bg-white/10 backdrop-blur-md p-1 rounded-full border border-white/10">
                                <button
                                    onClick={() => setViewMode('images')}
                                    className={`px-4 py-1.5 rounded-full text-xs font-bold transition-all ${viewMode === 'images' ? 'bg-white text-black shadow-lg' : 'text-white/70 hover:text-white'}`}
                                >
                                    <ImageIcon className="w-3.5 h-3.5 inline mr-1.5" /> Imágenes
                                </button>
                                <button
                                    onClick={() => setViewMode('video')}
                                    className={`px-4 py-1.5 rounded-full text-xs font-bold transition-all ${viewMode === 'video' ? 'bg-white text-black shadow-lg' : 'text-white/70 hover:text-white'}`}
                                >
                                    <MonitorPlay className="w-3.5 h-3.5 inline mr-1.5" /> Video
                                </button>
                            </div>
                        )}

                        <div className="w-full h-full flex items-center justify-center pt-8">
                            {viewMode === 'images' ? (
                                generation ? (
                                    <div className="relative w-full h-full flex items-center justify-center">
                                        <div className="relative h-[90%] w-auto aspect-[9/16] shadow-2xl rounded-2xl overflow-hidden border border-white/10 bg-black">
                                            {generation.input_path && generation.input_path !== 'unknown' ? (
                                                <BeforeAfterSlider
                                                    beforeImage={generation.input_path}
                                                    afterImage={generation.output_path}
                                                />
                                            ) : (
                                                <img
                                                    src={generation.output_path}
                                                    alt="Generated Smile"
                                                    className="w-full h-full object-contain"
                                                />
                                            )}
                                        </div>
                                        <div className="absolute bottom-6 right-6 flex gap-2 z-10">
                                            <Button size="icon" variant="secondary" className="rounded-full bg-white/10 hover:bg-white/20 text-white border-white/20 backdrop-blur-md transition-all">
                                                <Download className="w-4 h-4" />
                                            </Button>
                                        </div>
                                    </div>
                                ) : (
                                    <div className="text-center text-muted-foreground p-8">
                                        <ImageIcon className="w-16 h-16 mx-auto mb-4 opacity-20" strokeWidth={1.5} />
                                        <p>Sin imágenes disponibles</p>
                                    </div>
                                )
                            ) : (
                                videoGen && videoGen.status === 'completed' && (
                                    <div className="relative h-[90%] w-auto aspect-[9/16] rounded-2xl overflow-hidden shadow-2xl border border-white/10 bg-black">
                                        <video
                                            key={videoGen.output_path}
                                            src={`${supabaseUrl}/storage/v1/object/public/generated/${videoGen.output_path}`}
                                            className="w-full h-full object-contain"
                                            controls
                                            autoPlay
                                            muted
                                            playsInline
                                            loop
                                        />
                                        <div className="absolute top-4 right-4 z-30">
                                            <Button
                                                size="sm"
                                                variant="secondary"
                                                className="h-8 rounded-full bg-black/50 backdrop-blur-md border-white/10 text-xs"
                                                onClick={() => setViewMode('images')}
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
            </DialogContent>
        </Dialog>
    );
}
