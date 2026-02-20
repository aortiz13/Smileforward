"use client";

import { useState, useRef, useEffect } from "react";
import { Turnstile } from "@marsidev/react-turnstile";
import { motion, AnimatePresence } from "framer-motion";
import { createClient } from "@/utils/supabase/client";
import { Loader2, UploadCloud, Lock, Check, Video, PlayCircle, Sparkles, ScanFace, FileSearch, Wand2, Share2, MessageCircle, Send, Smartphone } from "lucide-react";
import { toast } from "sonner";
import { analyzeImageAndGeneratePrompts, generateSmileVariation } from "@/app/services/gemini";
import { validateStaticImage } from "@/utils/faceValidation";
import { uploadScan, uploadGeneratedImage, uploadGeneratedImageAction } from "@/app/services/storage";
import { VariationType } from "@/types/gemini";
import { alignGeneratedToReference } from "@/utils/alignFaces";
import { Button } from "@/components/ui/button";

// Helper to convert base64 to File
const base64ToFile = (base64: string, filename: string): File => {
    const arr = base64.split(',');
    const mime = arr[0].match(/:(.*?);/)?.[1] || 'image/png';
    const bstr = atob(arr[1]);
    let n = bstr.length;
    const u8arr = new Uint8Array(n);
    while (n--) {
        u8arr[n] = bstr.charCodeAt(n);
    }
    return new File([u8arr], filename, { type: mime });
};

import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import { Card } from "@/components/ui/card";
import { BeforeAfterSlider } from "./BeforeAfterSlider";
import { SelfieCaptureFlow } from "@/components/selfie/SelfieCaptureFlow";
import QRCode from "react-qr-code"; // Import QRCode
import { createSelfieSession } from "@/app/actions/selfie"; // Import server action
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogFooter,
    DialogHeader,
    DialogTitle,
    DialogTrigger,
} from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { countries } from "./countries";

// Combined step for auto-flow
type Step = "UPLOAD" | "SELFIE_CAPTURE" | "PROCESSING" | "LOCKED_RESULT" | "LEAD_FORM" | "RESULT" | "SURVEY" | "VERIFICATION" | "EMAIL_SENT" | "CLINICAL_REQUEST_SUCCESS" | "PHOTO_SUCCESS";

// Status steps for the progress UI
type ProcessStatus = 'idle' | 'validating' | 'scanning' | 'analyzing' | 'designing' | 'aligning' | 'complete';

const fileToBase64 = (file: File): Promise<string> => {
    return new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.readAsDataURL(file);
        reader.onload = () => resolve(reader.result as string);
        reader.onerror = error => reject(error);
    });
};

interface WidgetContainerProps {
    initialStep?: Step;
    initialBeforeImage?: string;
    initialAfterImage?: string;
}

export default function WidgetContainer({
    initialStep,
    initialBeforeImage,
    initialAfterImage
}: WidgetContainerProps = {}) {
    const [step, setStep] = useState<Step>(initialStep || "LEAD_FORM");
    const [isVerified, setIsVerified] = useState(false);
    const [image, setImage] = useState<File | null>(null);
    // State for generated image URL
    const [generatedImage, setGeneratedImage] = useState<string | null>(initialAfterImage || null);
    // State for demo before image (string URL)
    const [demoBeforeImage, setDemoBeforeImage] = useState<string | null>(initialBeforeImage || null);
    const [analysisId, setAnalysisId] = useState<string | null>(null); // New secure ID state

    // State for tracking user intent (image vs video/consultation)
    const [leadIntent, setLeadIntent] = useState<'image' | 'video'>('image');
    const [selectedCountry, setSelectedCountry] = useState<string>('ES');
    const [isVideoDialogOpen, setIsVideoDialogOpen] = useState(false);
    const [userId, setUserId] = useState<string>("anon");
    const [leadId, setLeadId] = useState<string | null>(null);
    const [userEmail, setUserEmail] = useState<string>('');
    const [userName, setUserName] = useState<string>('Usuario'); // Store user name
    const [userPhone, setUserPhone] = useState<string>(''); // Store user phone

    // Process Status State
    const [processStatus, setProcessStatus] = useState<ProcessStatus>('idle');
    const [uploadedScanUrl, setUploadedScanUrl] = useState<string | null>(null);
    const [alignedImage, setAlignedImage] = useState<string | null>(null);

    const [isClinicalRequestSent, setIsClinicalRequestSent] = useState(false);
    const [isPhotoEmailSent, setIsPhotoEmailSent] = useState(false); // Track manual email send staus

    // Loading States
    const [isSubmittingPhoto, setIsSubmittingPhoto] = useState(false);
    const [isSubmittingVideo, setIsSubmittingVideo] = useState(false);
    const [loadingMessage, setLoadingMessage] = useState("Completando tu solicitud...");

    // Cross-Device Session State
    const [sessionId, setSessionId] = useState<string | null>(null);
    const [qrUrl, setQrUrl] = useState<string | null>(null);
    const [mobileConnected, setMobileConnected] = useState(false);

    // New states for unified flow
    const [selectedFile, setSelectedFile] = useState<File | null>(null);
    const [formValues, setFormValues] = useState({
        name: '',
        email: '',
        phoneNumber: '',
        ageAccepted: false,
        termsAccepted: false
    });

    const [phraseIndex, setPhraseIndex] = useState(0);
    const phrases = [
        "Estás a un paso de tu mejor versión",
        "Estamos afinando tu nueva sonrisa",
        "Ya casi está lista",
        "Preparando tu simulación Smile Forward"
    ];

    useEffect(() => {
        if (step === "PROCESSING") {
            const interval = setInterval(() => {
                setPhraseIndex((prev) => (prev + 1) % phrases.length);
            }, 3000);
            return () => clearInterval(interval);
        } else {
            setPhraseIndex(0);
        }
    }, [step]);

    // Detect user's country based on geolocation
    useEffect(() => {
        const detectCountry = async () => {
            try {
                // Use a geolocation API to detect country
                const response = await fetch('https://ipapi.co/json/');
                const data = await response.json();
                if (data.country_code) {
                    // Check if the detected country is in our list
                    const detectedCountry = countries.find(c => c.code === data.country_code);
                    if (detectedCountry) {
                        setSelectedCountry(data.country_code);
                    }
                }
            } catch (error) {
                // Fallback to Spain if geolocation fails
                console.log('Geolocation detection failed, using default (ES)');
            }
        };
        detectCountry();
    }, []);

    const fileInputRef = useRef<HTMLInputElement>(null);

    // Scanning Animation Variants
    const scanVariants = {
        initial: { top: "0%" },
        animate: {
            top: "100%",
            transition: {
                repeat: Infinity,
                repeatType: "mirror" as const,
                duration: 1.5,
                ease: "linear" as const
            }
        }
    };

    // Image Compression
    const compressImage = (file: File): Promise<string> => {
        return new Promise((resolve, reject) => {
            const reader = new FileReader();
            reader.readAsDataURL(file);
            reader.onload = (event) => {
                const img = new Image();
                img.src = event.target?.result as string;
                img.onload = () => {
                    const canvas = document.createElement("canvas");
                    const ctx = canvas.getContext("2d");
                    const MAX_WIDTH = 2000;
                    const MAX_HEIGHT = 2000;
                    let width = img.width;
                    let height = img.height;
                    if (width > height) {
                        if (width > MAX_WIDTH) { height *= MAX_WIDTH / width; width = MAX_WIDTH; }
                    } else {
                        if (height > MAX_HEIGHT) { width *= MAX_HEIGHT / height; height = MAX_HEIGHT; }
                    }
                    canvas.width = width;
                    canvas.height = height;
                    ctx?.drawImage(img, 0, 0, width, height);
                    resolve(canvas.toDataURL("image/jpeg", 1.0));
                };
                img.onerror = reject;
            };
            reader.onerror = reject;
        });
    };

    const handleSelfieCapture = async (file: File) => {
        setSelectedFile(file);
        setStep("LEAD_FORM"); // Go back to the unified form view to show the "Quiero ver mi versión mejorada" button
    };

    // Initialize Selfie Session when entering that step
    useEffect(() => {
        if (step === "SELFIE_CAPTURE" && !sessionId) {
            const initSession = async () => {
                const res = await createSelfieSession();
                if (res.success && res.sessionId) {
                    setSessionId(res.sessionId);
                    setQrUrl(`${window.location.origin}/selfie?sid=${res.sessionId}`);
                }
            };
            initSession();
        }
    }, [step, sessionId]);

    // Listen for Selfie Session updates
    useEffect(() => {
        if (!sessionId || step !== "SELFIE_CAPTURE") return;

        const supabase = createClient();
        const channel = supabase
            .channel(`selfie_session_${sessionId}`)
            .on(
                'postgres_changes',
                {
                    event: 'UPDATE',
                    schema: 'public',
                    table: 'selfie_sessions',
                    filter: `id=eq.${sessionId}`
                },
                async (payload) => {
                    console.log("Realtime update received:", payload);
                    const newStatus = payload.new.status;
                    const imageUrl = payload.new.image_url;

                    if (newStatus === 'mobile_connected') {
                        setMobileConnected(true);
                        // toast.success("Móvil conectado. Tómate la foto."); // Removed toast in favor of full screen UI
                    }

                    if (newStatus === 'uploaded' && imageUrl) {
                        try {
                            const response = await fetch(imageUrl);
                            const blob = await response.blob();
                            const file = new File([blob], "mobile-selfie.jpg", { type: "image/jpeg" });
                            handleUpload(file);
                        } catch (err) {
                            console.error("Error fetching mobile selfie:", err);
                            toast.error("Error recuperando la foto del móvil.");
                        }
                    }
                }
            )
            .subscribe((status) => {
                console.log("Subscription status:", status);
            });

        return () => {
            supabase.removeChannel(channel);
        };
    }, [sessionId, step]);

    const handleUpload = async (file: File) => {
        try {
            // 1. Strict Validation (MediaPipe) - DO THIS FIRST before any state changes
            const validation = await validateStaticImage(file);
            if (!validation.isValid) {
                throw new Error(validation.reason || "Imagen no válida");
            }

            // Before starting the upload/processing, we save the lead if it's not saved yet
            let currentLeadId = leadId;
            if (!currentLeadId) {
                // If we don't have a leadId yet, we need to save it now
                const supabase = createClient();
                const newLeadId = crypto.randomUUID();

                const countryDialCode = countries.find(c => c.code === selectedCountry)?.dial_code || '+34';
                const fullPhone = `${countryDialCode} ${formValues.phoneNumber}`;

                const { error: leadError } = await supabase.from('leads').insert({
                    id: newLeadId,
                    name: formValues.name,
                    email: formValues.email,
                    phone: fullPhone.trim(),
                    status: 'pending'
                });

                if (leadError) throw leadError;

                setLeadId(newLeadId);
                currentLeadId = newLeadId;
                setUserEmail(formValues.email);
                setUserName(formValues.name);
                setUserPhone(fullPhone.trim());
            }

            // ONLY IF VALID, we move to processing state
            setImage(file);
            setStep("PROCESSING");
            setProcessStatus('validating');

            const base64 = await compressImage(file);
            setProcessStatus('scanning');

            // 2. Upload to Storage
            const compressedBlob = await (await fetch(base64)).blob();
            const compressedFile = new File([compressedBlob], file.name, { type: 'image/jpeg' });
            const formData = new FormData();
            formData.append('file', compressedFile);

            const supabase = createClient();
            const { data: { user } } = await supabase.auth.getUser();
            const supabaseUserId = user?.id || 'anon_' + crypto.randomUUID();
            setUserId(supabaseUserId);
            formData.append('userId', supabaseUserId);

            let localScanUrl = null;
            let localScanPath = null;
            const uploadRes = await uploadScan(formData);
            if (uploadRes.success && uploadRes.data) {
                localScanUrl = uploadRes.data;
                localScanPath = uploadRes.path;
                setUploadedScanUrl(localScanUrl);
            } else {
                console.warn("Fallo subida de imagen original:", uploadRes.error);
            }

            setProcessStatus('analyzing');

            // 3. Analyze Image
            const analysisFormData = new FormData();
            if (localScanPath) {
                analysisFormData.append('imagePath', localScanPath);
            } else if (localScanUrl) {
                analysisFormData.append('imageUrl', localScanUrl);
            } else {
                const analysisFile = base64ToFile(base64, 'analysis_input.jpg');
                analysisFormData.append('file', analysisFile);
            }

            const analysisResponse = await analyzeImageAndGeneratePrompts(analysisFormData);
            if (!analysisResponse.success) {
                const error = analysisResponse.errorDetails;
                toast.error(error?.title || "Error analizando imagen", {
                    description: error?.message,
                    icon: error?.icon
                });
                throw new Error(analysisResponse.error || "Error analizando imagen");
            }

            const analysisResult = analysisResponse.data;
            if (!analysisResult) throw new Error("No se pudo obtener el análisis.");

            setProcessStatus('designing');

            // 4. Auto-Generate Smile
            const naturalVariation = analysisResult.variations.find((v: any) => v.type === VariationType.ORIGINAL_BG);
            if (!naturalVariation) throw new Error("No se encontró plan de restauración natural.");

            // SECURE FLOW: Save ID if available
            if (analysisResult.analysis_id) {
                setAnalysisId(analysisResult.analysis_id);
            }

            // Fallback prompt text for UI/Legacy (Backend will ignore this if analysis_id is present)
            const fallbackPrompt = naturalVariation.prompt_data.Subject || "Smile Design";

            // Pass analysis_id and variation type to use server-side prompt construction
            const genFormData = new FormData();
            if (localScanPath) {
                genFormData.append('imagePath', localScanPath);
            } else if (localScanUrl) {
                genFormData.append('imageUrl', localScanUrl);
            } else {
                const genFile = base64ToFile(base64, 'generation_input.jpg');
                genFormData.append('file', genFile);
            }
            genFormData.append('variationPrompt', fallbackPrompt);
            genFormData.append('aspectRatio', "9:16");
            genFormData.append('userId', supabaseUserId);
            if (analysisResult.analysis_id) genFormData.append('analysisId', analysisResult.analysis_id);
            genFormData.append('variationType', VariationType.ORIGINAL_BG);

            const genResult = await generateSmileVariation(genFormData);

            if (!genResult.success || !genResult.data) {
                const error = genResult.errorDetails;
                toast.error(error?.title || "Fallo en la generación", {
                    description: error?.message,
                    icon: error?.icon
                });
                throw new Error(genResult.error || "Fallo en la generación de sonrisa");
            }

            setGeneratedImage(genResult.data);

            // 5. Align Faces (PRE-CALCULATION)
            setProcessStatus('aligning');
            const alignResult = await alignGeneratedToReference(base64, genResult.data);
            let finalAlignedUrl = genResult.data;
            if (alignResult.success) {
                finalAlignedUrl = alignResult.alignedUrl;
                setAlignedImage(finalAlignedUrl);
            } else {
                console.warn("[WidgetContainer] Pre-alignment failed:", alignResult.error);
                setAlignedImage(finalAlignedUrl); // Fallback to unaligned
            }

            setProcessStatus('complete');

            // Allow a brief moment for the 'complete' state to show before transitioning
            await new Promise(r => setTimeout(r, 800));

            // AUTO-FLOW: If we already have a leadId (captured at start), save and show result
            if (currentLeadId) {
                try {
                    // 1. Upload Aligned image to storage (prevents RSC payload limit errors)
                    let outputUrl = finalAlignedUrl;
                    if (finalAlignedUrl?.startsWith('data:')) {
                        const file = base64ToFile(finalAlignedUrl, 'aligned_smile.png');
                        const formData = new FormData();
                        formData.append('file', file);
                        formData.append('userId', currentLeadId);
                        formData.append('type', 'aligned');
                        outputUrl = await uploadGeneratedImageAction(formData);
                    }

                    // 2. Save Generation
                    const supabase = createClient();
                    const { error: genError } = await supabase.from('generations').insert({
                        lead_id: currentLeadId,
                        type: 'image',
                        status: 'completed',
                        input_path: localScanUrl || 'unknown',
                        output_path: outputUrl,
                        metadata: { source: 'widget_v1' }
                    });
                    if (genError) console.error("Error saving generation:", genError);


                    // 3. Go to Result
                    setStep("RESULT");
                } catch (autoErr) {
                    console.error("Auto-save error:", autoErr);
                    // Fallback to locked result if something fails
                    setStep("LOCKED_RESULT");
                }
            } else {
                // Legacy/Fallback: No lead captured yet
                setStep("LOCKED_RESULT");
            }

        } catch (err: any) {
            console.error("WidgetContainer Error:", err);

            // Generic fallback if toast wasn't already shown
            if (!err.message.includes("analizando imagen") && !err.message.includes("generación de sonrisa")) {
                toast.error("Ocurrió un error inesperado.");
            }

            // Only reset to LEAD_FORM if we were already in PROCESSING
            setStep((prev) => {
                if (prev === "PROCESSING") return "LEAD_FORM";
                return prev;
            });
            setImage(null);
            setSelectedFile(null); // Reset selected file too
        }
    };

    // Unified flow uses state-based validation and auto-saving in handleUpload
    // So handleLeadSubmit is only needed for the 'video' intent if we ever restore that separate button
    const handleLeadSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        // This is now partially redundant but kept for any specific legacy routing needs
        // if we ever add a "Solamente enviar datos" button.
    };

    const handleVideoRequest = () => {
        setIsVideoDialogOpen(false);
        toast.info("Solicitud enviada.", { description: "Te contactaremos pronto." });
    };

    const handleClinicalVideoRequest = async () => {
        setIsSubmittingVideo(true);
        setLoadingMessage("Completando tu solicitud...");

        // Timeout for "Ya casi..." message
        const timeoutId = setTimeout(() => {
            setLoadingMessage("Ya casi...");
        }, 3000);

        try {
            const functionUrl = `${process.env.NEXT_PUBLIC_SUPABASE_URL}/functions/v1/clinical-video-request`;
            const response = await fetch(functionUrl, {
                method: 'POST',
                credentials: 'omit',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY}`
                },
                body: JSON.stringify({
                    email: userEmail,
                    name: userName,
                    phone: userPhone,
                    leadId: leadId
                })
            });

            if (response.ok) {
                setIsClinicalRequestSent(true);
                setStep("CLINICAL_REQUEST_SUCCESS");
                toast.success("¡Solicitud enviada!", {
                    description: "Revisa tu correo para confirmar los detalles."
                });
            } else {
                throw new Error("Fallo al enviar solicitud");
            }
        } catch (err) {
            console.error("Clinical request error:", err);
            toast.error("Error al enviar la solicitud. Por favor intenta de nuevo.");
        } finally {
            clearTimeout(timeoutId);
            setIsSubmittingVideo(false);
        }
    };

    const handleSendPhotoEmail = async () => {
        setIsSubmittingPhoto(true);
        setLoadingMessage("Completando tu solicitud...");

        // Timeout for "Ya casi..." message
        const timeoutId = setTimeout(() => {
            setLoadingMessage("Ya casi...");
        }, 3000);

        try {
            const functionUrl = `${process.env.NEXT_PUBLIC_SUPABASE_URL}/functions/v1/send-photo-email`;
            const response = await fetch(functionUrl, {
                method: 'POST',
                credentials: 'omit',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY}`
                },
                body: JSON.stringify({
                    email: userEmail,
                    name: userName, // Use stored name
                    imageUrl: generatedImage,
                    leadId: leadId
                })
            });

            if (response.ok) {
                setIsPhotoEmailSent(true);
                setStep("PHOTO_SUCCESS");
                // toast.success("Foto enviada correctamente"); // Navigating to screen instead
            } else {
                console.error('Email error');
                throw new Error("Email sending failed");
            }
        } catch (emailErr) {
            console.error('Email invoke error:', emailErr);
            toast.error("Error enviando el correo");
        } finally {
            clearTimeout(timeoutId);
            setIsSubmittingPhoto(false);
        }
    };

    const handleSurveySubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!leadId) return;

        const formData = new FormData(e.target as HTMLFormElement);
        const surveyData = {
            ageRange: formData.get('ageRange'),
            improvementGoal: formData.get('improvementGoal'),
            timeframe: formData.get('timeframe'),
            clinicPreference: formData.get('clinicPreference')
        };

        try {
            const supabase = createClient();
            const { error } = await supabase
                .from('leads')
                .update({ survey_data: surveyData })
                .eq('id', leadId);

            if (error) throw error;

            toast.success("Gracias por tus respuestas");
            setStep("VERIFICATION");
        } catch (err) {
            console.error(err);
            toast.error("Error al guardar respuestas.");
        }
    };

    // Status List Component
    const StatusItem = ({ active, completed, label, icon: Icon }: any) => (
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

    return (
        <div className="relative h-auto md:h-[calc(100vh-100px)] min-h-[600px] w-full bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 shadow-sm flex flex-col font-sans overflow-visible md:overflow-hidden rounded-[2rem]">
            {/* Header - Minimal with Serif Font */}
            <div className="flex-none p-6 md:p-8 border-b border-zinc-100 dark:border-zinc-800 flex justify-between items-center bg-white dark:bg-zinc-900 z-20">
                <h1 className="text-xl md:text-2xl font-serif text-black dark:text-white tracking-tight">Smile Forward</h1>
                {/* Subtle Status Indicator */}
                <div className="flex items-center gap-2 px-3 py-1 bg-zinc-50 dark:bg-zinc-800 rounded-full border border-zinc-100 dark:border-zinc-700">
                    <span className="relative flex h-2 w-2">
                        <span className="relative inline-flex rounded-full h-2 w-2 bg-teal-500"></span>
                    </span>
                    <span className="text-[10px] text-zinc-500 dark:text-zinc-400 font-sans tracking-widest uppercase">Online</span>
                </div>
            </div>

            {/* FULL SCREEN LOADING OVERLAY */}
            <AnimatePresence>
                {(isSubmittingPhoto || isSubmittingVideo) && (
                    <motion.div
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        className="absolute inset-0 z-50 bg-white/80 dark:bg-zinc-950/80 backdrop-blur-md flex flex-col items-center justify-center p-6 text-center"
                    >
                        <div className="bg-white dark:bg-zinc-900 p-8 rounded-[2rem] shadow-2xl border border-zinc-100 dark:border-zinc-800 max-w-sm w-full space-y-6">
                            <div className="relative w-16 h-16 mx-auto">
                                <div className="absolute inset-0 rounded-full border-4 border-zinc-100 dark:border-zinc-800"></div>
                                <div className="absolute inset-0 rounded-full border-4 border-black dark:border-white border-t-transparent animate-spin"></div>
                                <Sparkles className="absolute inset-0 m-auto w-6 h-6 text-black dark:text-white animate-pulse" />
                            </div>
                            <div className="space-y-2">
                                <h3 className="text-xl font-serif font-bold text-black dark:text-white">
                                    {loadingMessage}
                                </h3>
                                <p className="text-sm text-zinc-500 dark:text-zinc-400">
                                    Estamos procesando tu solicitud...
                                </p>
                            </div>
                        </div>
                    </motion.div>
                )}
            </AnimatePresence>

            {/* Main Content Area - Scrollable if needed but mostly constrained */}
            <main className={`flex-1 relative overflow-y-auto overflow-x-hidden ${step === 'RESULT' ? 'p-0' : 'p-6 md:p-10'} scrollbar-hide flex flex-col`}>
                {!isVerified ? (
                    <div className="flex-1 flex flex-col items-center justify-center space-y-6 animate-in fade-in zoom-in duration-500">
                        <div className="text-center space-y-2">
                            <h2 className="text-2xl font-serif text-black dark:text-white">Verificación de Seguridad</h2>
                            <p className="text-sm text-zinc-500">Por favor completa el captcha para continuar.</p>
                        </div>
                        <Turnstile
                            siteKey="0x4AAAAAACUl6BXJSwE0jdkl"
                            onSuccess={(token) => setIsVerified(true)}
                            options={{
                                size: 'normal',
                                theme: 'auto',
                            }}
                        />
                    </div>
                ) : (
                    <AnimatePresence mode="wait">
                        {/* UPLOAD STEP */}
                        {step === "UPLOAD" && (
                            <motion.div
                                key="upload"
                                initial={{ opacity: 0, scale: 0.98 }}
                                animate={{ opacity: 1, scale: 1 }}
                                exit={{ opacity: 0, scale: 0.98 }}
                                className="h-full flex flex-col justify-center items-center text-center space-y-8"
                            >
                                <div
                                    className="group relative w-full aspect-square md:aspect-[4/3] max-w-[280px] md:max-w-sm border border-dashed border-zinc-300 dark:border-zinc-700 rounded-[2rem] hover:border-teal-500/50 hover:bg-zinc-50 dark:hover:bg-zinc-900 transition-all flex flex-col items-center justify-center cursor-pointer overflow-hidden bg-zinc-50/50 dark:bg-zinc-900/50"
                                    onDragOver={(e) => e.preventDefault()}
                                    onDrop={(e) => {
                                        e.preventDefault();
                                        if (e.dataTransfer.files?.[0]) handleUpload(e.dataTransfer.files[0]);
                                    }}
                                    onClick={() => fileInputRef.current?.click()}
                                >
                                    <div className="p-6 bg-white dark:bg-zinc-800 shadow-sm rounded-full mb-6 group-hover:scale-110 transition-transform duration-500">
                                        <UploadCloud className="w-8 h-8 text-zinc-400 group-hover:text-teal-600 transition-colors" strokeWidth={1} />
                                    </div>
                                    <h3 className="text-xl font-serif text-black dark:text-white mb-2">Sube tu Selfie</h3>
                                    <p className="text-sm text-zinc-500 max-w-[200px]">Arrastra tu foto aquí o haz clic para explorar</p>
                                    <input
                                        ref={fileInputRef}
                                        type="file"
                                        accept="image/*"
                                        hidden
                                        onChange={(e) => e.target.files?.[0] && handleUpload(e.target.files[0])}
                                    />
                                </div>
                                <div className="space-y-4">
                                    <div className="flex flex-wrap justify-center gap-6 text-xs text-zinc-400 font-sans tracking-wide uppercase">
                                        <span className="flex items-center gap-2"><Check className="w-4 h-4 text-teal-500" strokeWidth={1.5} /> 100% Privado</span>
                                        <span className="flex items-center gap-2"><Check className="w-4 h-4 text-teal-500" strokeWidth={1.5} /> Resultados en segundos</span>
                                    </div>
                                    <div className="flex flex-col items-center gap-2 text-xs md:text-sm text-zinc-600 dark:text-zinc-400 font-sans transition-all">
                                        <div className="flex gap-4 mb-4">
                                            <Button
                                                variant="outline"
                                                onClick={() => setStep("SELFIE_CAPTURE")}
                                                className="rounded-full border-zinc-200 hover:bg-zinc-100 hover:text-black dark:border-zinc-700 dark:hover:bg-zinc-800 dark:text-zinc-300"
                                            >
                                                <ScanFace className="w-4 h-4 mr-2" />
                                                Hazte un selfie
                                            </Button>
                                        </div>
                                        <p>Tu imagen se utilizará únicamente para generar esta simulación.</p>
                                        <p>Debes ser mayor de edad para utilizar esta herramienta</p>
                                    </div>
                                </div>
                            </motion.div>
                        )}

                        {/* SELFIE CAPTURE STEP (Webcam + QR) */}
                        {step === "SELFIE_CAPTURE" && (
                            <motion.div
                                key="selfie"
                                initial={{ opacity: 0, scale: 0.98 }}
                                animate={{ opacity: 1, scale: 1 }}
                                exit={{ opacity: 0, scale: 0.98 }}
                                className="h-full w-full flex flex-col items-center justify-center p-0 md:p-4"
                            >
                                {mobileConnected ? (
                                    <div className="flex flex-col items-center justify-center space-y-8 animate-in fade-in zoom-in duration-500 text-center max-w-lg">
                                        <div className="p-8 bg-teal-50 dark:bg-teal-900/20 rounded-full animate-pulse">
                                            <Smartphone className="w-16 h-16 text-teal-600 dark:text-teal-400" strokeWidth={1.5} />
                                        </div>
                                        <div className="space-y-4">
                                            <h3 className="text-3xl font-serif text-black dark:text-white">Esperando fotografía</h3>
                                            <p className="text-lg text-zinc-500 dark:text-zinc-400">
                                                Tómate la selfie con tu móvil
                                            </p>
                                        </div>
                                        <div className="flex items-center gap-2 text-sm text-zinc-400">
                                            <Loader2 className="w-4 h-4 animate-spin" />
                                            <span>Sincronizando en tiempo real...</span>
                                        </div>
                                    </div>
                                ) : (
                                    <div className="grid grid-cols-1 md:grid-cols-2 gap-8 w-full max-w-4xl h-full max-h-[600px]">
                                        {/* Column 1: Webcam */}
                                        <div className="relative rounded-2xl overflow-hidden shadow-2xl bg-black flex flex-col h-full w-full">
                                            <SelfieCaptureFlow
                                                onCapture={handleSelfieCapture}
                                                onCancel={() => setStep("UPLOAD")}
                                            />
                                        </div>

                                        {/* Column 2: QR Code - Hidden on mobile */}
                                        <div className="hidden md:flex flex-col items-center justify-center bg-zinc-50 dark:bg-zinc-900 rounded-2xl p-8 border border-zinc-200 dark:border-zinc-800 text-center space-y-6">
                                            <div className="space-y-2">
                                                <div className="flex items-center justify-between mb-2">
                                                    <Button
                                                        variant="ghost"
                                                        size="sm"
                                                        onClick={() => setStep("UPLOAD")}
                                                        className="text-zinc-500 hover:text-black dark:hover:text-white"
                                                    >
                                                        <Share2 className="w-4 h-4 mr-2 rotate-180" />
                                                        Volver
                                                    </Button>
                                                </div>
                                                <h3 className="text-xl font-serif text-black dark:text-white">Usa tu móvil</h3>
                                                <p className="text-sm text-zinc-500">Escanea este código para usar la cámara de tu teléfono.</p>
                                            </div>

                                            <div className="p-4 bg-white rounded-xl shadow-sm border border-zinc-100">
                                                {qrUrl ? (
                                                    <QRCode value={qrUrl} size={180} />
                                                ) : (
                                                    <div className="w-[180px] h-[180px] flex items-center justify-center">
                                                        <Loader2 className="w-8 h-8 animate-spin text-zinc-300" />
                                                    </div>
                                                )}
                                            </div>

                                            <p className="text-xs text-zinc-400 px-4">
                                                La foto se sincronizará automáticamente aquí una vez la tomes.
                                            </p>
                                        </div>
                                    </div>
                                )}
                            </motion.div>
                        )}

                        {/* PROCESSING (Unified Automation Step) */}
                        {step === "PROCESSING" && (
                            <motion.div
                                key="processing"
                                initial={{ opacity: 0 }}
                                animate={{ opacity: 1 }}
                                exit={{ opacity: 0 }}
                                className="h-full flex flex-col items-center justify-center py-4 md:py-0 space-y-8"
                            >
                                {/* Animated Header - Centered Top */}
                                <div className="h-16 flex items-center justify-center w-full px-4">
                                    <AnimatePresence mode="wait">
                                        <motion.h3
                                            key={phraseIndex}
                                            initial={{ opacity: 0, y: 10 }}
                                            animate={{ opacity: 1, y: 0 }}
                                            exit={{ opacity: 0, y: -10 }}
                                            className="text-2xl md:text-3xl font-serif text-black dark:text-white text-center"
                                        >
                                            {phrases[phraseIndex]}
                                        </motion.h3>
                                    </AnimatePresence>
                                </div>

                                <div className="flex flex-col md:flex-row gap-8 md:gap-12 items-center justify-center w-full">
                                    {/* Left: Visual Scanner - Minimal */}
                                    <div className="relative w-full max-w-[200px] md:max-w-[240px] aspect-[3/4] rounded-[2rem] overflow-hidden shadow-2xl border border-zinc-100 dark:border-zinc-800 bg-zinc-900 flex-shrink-0">
                                        {image ? (
                                            <img src={URL.createObjectURL(image)} alt="Analyzing" className="w-full h-full object-cover opacity-80" />
                                        ) : (
                                            <div className="w-full h-full bg-zinc-800" />
                                        )}
                                        <motion.div
                                            variants={scanVariants}
                                            initial="initial"
                                            animate="animate"
                                            className="absolute left-0 right-0 h-[1px] bg-white/50 shadow-[0_0_20px_2px_rgba(255,255,255,0.5)] z-10"
                                        />
                                    </div>

                                    {/* Right: Progress List - Clean Typography */}
                                    <div className="w-full max-w-xs space-y-3 px-4 md:px-0">
                                        <StatusItem
                                            label="Validación Biométrica"
                                            icon={ScanFace}
                                            active={processStatus === 'validating'}
                                            completed={['scanning', 'analyzing', 'designing', 'complete'].includes(processStatus)}
                                        />
                                        <StatusItem
                                            label="Escaneo Facial 3D"
                                            icon={FileSearch}
                                            active={processStatus === 'scanning'}
                                            completed={['analyzing', 'designing', 'complete'].includes(processStatus)}
                                        />
                                        <StatusItem
                                            label="Análisis Morfológico"
                                            icon={Sparkles}
                                            active={processStatus === 'analyzing'}
                                            completed={['designing', 'complete'].includes(processStatus)}
                                        />
                                        <StatusItem
                                            label="Diseño Generativo"
                                            icon={Wand2}
                                            active={processStatus === 'designing'}
                                            completed={['complete'].includes(processStatus)}
                                        />
                                    </div>
                                </div>
                            </motion.div>
                        )}

                        {/* LOCKED RESULT (Watermarked Preview Redesigned) */}
                        {step === "LOCKED_RESULT" && (
                            <motion.div
                                key="locked"
                                initial={{ opacity: 0 }}
                                animate={{ opacity: 1 }}
                                className="h-full max-h-[100vh] flex flex-col p-4 md:p-6 overflow-hidden"
                            >
                                <div className="max-w-5xl mx-auto w-full h-full flex flex-col items-center gap-2 md:gap-4 overflow-hidden">
                                    {/* Title */}
                                    {/* Navigation Header */}
                                    <div className="w-full flex justify-between items-center px-4 flex-shrink-0">
                                        <Button
                                            variant="ghost"
                                            size="sm"
                                            onClick={() => {
                                                setStep("UPLOAD");
                                                setImage(null);
                                                setGeneratedImage(null);
                                            }}
                                            className="text-zinc-500 hover:text-black dark:hover:text-white"
                                        >
                                            <Share2 className="w-4 h-4 mr-2 rotate-180" />
                                            Volver a empezar
                                        </Button>
                                        <h2 className="text-xl md:text-3xl font-serif text-black dark:text-white text-center flex-1">Tu simulación Smile Forward</h2>
                                        <div className="w-20" /> {/* Spacer for centering */}
                                    </div>

                                    {/* Main Content - Images + CTA */}
                                    <div className="flex flex-col md:flex-row gap-4 md:gap-8 w-full items-center justify-center flex-1 min-h-0 overflow-hidden">
                                        {/* Unified Slider Comparison */}
                                        <div className="flex-1 w-full max-w-xl h-full flex flex-col items-center gap-2 min-h-0">
                                            <div className="w-full flex-1 min-h-0 relative">
                                                {image && generatedImage ? (
                                                    <div className="relative w-auto h-[50vh] md:h-full aspect-[9/16] md:aspect-auto mx-auto rounded-xl md:rounded-[2rem] overflow-hidden shadow-xl group">
                                                        <BeforeAfterSlider
                                                            beforeImage={image ? URL.createObjectURL(image) : (demoBeforeImage || "")}
                                                            afterImage={generatedImage}
                                                            className="w-full h-full"
                                                        />
                                                        {/* Protective Watermark Layer */}
                                                        <div className="absolute inset-0 flex items-center justify-center p-4 z-10 opacity-60 pointer-events-none">
                                                            <img
                                                                src="https://dentalcorbella.com/wp-content/uploads/2023/07/logo-white-trans2.png"
                                                                alt="Watermark"
                                                                className="w-full opacity-40 drop-shadow-md rotate-[-20deg] select-none"
                                                                draggable={false}
                                                            />
                                                        </div>
                                                        {/* Protective invisible layer */}
                                                        <div className="absolute inset-0 z-20 bg-transparent pointer-events-none" />
                                                    </div>
                                                ) : (
                                                    <div className="w-full h-full flex items-center justify-center bg-zinc-100 dark:bg-zinc-800 rounded-xl md:rounded-[2rem]">
                                                        <Loader2 className="w-8 h-8 animate-spin text-zinc-300" />
                                                    </div>
                                                )}
                                            </div>

                                            {/* Footer Disclaimer - Centered below images */}
                                            <p className="text-xs md:text-sm text-zinc-600 dark:text-zinc-400 text-center leading-relaxed flex-shrink-0">
                                                Simulación Orientativa. El resultado final depende de tu caso clínico
                                            </p>
                                        </div>

                                        {/* Sidebar CTA */}
                                        <div className="w-full md:w-72 flex flex-col justify-center space-y-4 bg-zinc-50 dark:bg-zinc-900/50 p-6 rounded-[2rem] border border-zinc-100 dark:border-zinc-800 flex-shrink-0">
                                            <div className="space-y-1 text-center md:text-left">
                                                <h3 className="text-2xl font-serif text-black dark:text-white">Recibe tu foto en Full HD</h3>
                                            </div>

                                            <Button
                                                onClick={() => setStep("LEAD_FORM")}
                                                className="w-full h-12 md:h-14 rounded-full bg-black text-white hover:bg-zinc-800 dark:bg-white dark:text-black dark:hover:bg-zinc-200 text-sm md:text-base font-sans font-medium tracking-wide shadow-xl gap-2 group"
                                                size="lg"
                                            >
                                                <MessageCircle className="w-5 h-5 group-hover:scale-110 transition-transform" strokeWidth={1.5} /> ¿Te lo enviamos?
                                            </Button>
                                        </div>
                                    </div>
                                </div>
                            </motion.div>
                        )}

                        {/* UNIFIED LEAD FORM + UPLOAD STEP */}
                        {step === "LEAD_FORM" && (
                            <motion.div
                                key="form"
                                initial={{ opacity: 0, x: 20 }}
                                animate={{ opacity: 1, x: 0 }}
                                className="h-full flex items-start justify-center p-4 md:p-6 pt-[10px] overflow-hidden"
                            >
                                <div className="w-full max-w-6xl grid grid-cols-1 md:grid-cols-2 gap-6 md:gap-10 items-start">
                                    {/* Left Column - PASO 1 Form */}
                                    <div className="space-y-3">
                                        <div className="space-y-2">
                                            {generatedImage && (
                                                <Button
                                                    variant="ghost"
                                                    size="sm"
                                                    onClick={() => setStep("LOCKED_RESULT")}
                                                    className="text-zinc-500 hover:text-black dark:hover:text-white mb-2 h-8"
                                                >
                                                    <Share2 className="w-4 h-4 mr-2 rotate-180" />
                                                    Volver al resultado
                                                </Button>
                                            )}
                                            <div className="inline-flex items-center rounded-full bg-black text-white px-3 py-0.5 text-[10px] uppercase tracking-widest font-sans font-bold">
                                                Paso 1
                                            </div>
                                            <h2 className="text-xl md:text-3xl font-serif font-bold text-black dark:text-white leading-tight">
                                                Comienza tu transformación
                                            </h2>
                                            <p className="text-sm text-zinc-500 leading-relaxed">
                                                Completa tus datos para iniciar el diseño de tu nueva sonrisa.
                                                <br />
                                                Utilizaremos estos datos para enviarte la simulación.
                                            </p>

                                        </div>

                                        <div className="w-full space-y-2.5 mt-[30px]">
                                            <div className="space-y-1">
                                                <Label htmlFor="name" className="text-xs uppercase tracking-wider text-zinc-400 pl-4">Nombre Completo</Label>
                                                <Input
                                                    id="name"
                                                    name="name"
                                                    placeholder="Tu nombre"
                                                    value={formValues.name}
                                                    onChange={(e) => setFormValues(prev => ({ ...prev, name: e.target.value }))}
                                                    required
                                                    className="h-11 border-zinc-200 bg-zinc-50 rounded-full px-6 focus:ring-0 focus:border-black transition-all text-sm text-black"
                                                />
                                            </div>

                                            <div className="space-y-1">
                                                <Label htmlFor="email" className="text-xs uppercase tracking-wider text-zinc-400 pl-4">Correo Electrónico</Label>
                                                <Input
                                                    id="email"
                                                    name="email"
                                                    type="email"
                                                    placeholder="tu@email.com"
                                                    value={formValues.email}
                                                    onChange={(e) => setFormValues(prev => ({ ...prev, email: e.target.value }))}
                                                    required
                                                    className="h-11 border-zinc-200 bg-zinc-50 rounded-full px-6 focus:ring-0 focus:border-black transition-all text-sm text-black"
                                                />
                                            </div>

                                            <div className="space-y-1">
                                                <Label htmlFor="phone" className="text-xs uppercase tracking-wider text-zinc-400 pl-4">WhatsApp</Label>
                                                <div className="flex items-center gap-3">
                                                    <div className="w-[105px] flex-shrink-0">
                                                        <Select
                                                            name="countryCode"
                                                            defaultValue="ES"
                                                            onValueChange={(value) => setSelectedCountry(value)}
                                                        >
                                                            <SelectTrigger className="h-11 rounded-full border-zinc-200 bg-zinc-50 focus:ring-0 focus:border-black text-sm text-black">
                                                                <SelectValue placeholder="+34" />
                                                            </SelectTrigger>
                                                            <SelectContent className="max-h-[300px]">
                                                                {countries.map((country) => (
                                                                    <SelectItem key={country.code} value={country.code}>
                                                                        <span className="flex items-center gap-2">
                                                                            <span>{country.flag}</span>
                                                                            <span className="text-zinc-500">{country.dial_code}</span>
                                                                        </span>
                                                                    </SelectItem>
                                                                ))}
                                                            </SelectContent>
                                                        </Select>
                                                    </div>
                                                    <Input
                                                        id="phoneNumber"
                                                        name="phoneNumber"
                                                        type="tel"
                                                        placeholder="9 1234 5678"
                                                        value={formValues.phoneNumber}
                                                        onChange={(e) => setFormValues(prev => ({ ...prev, phoneNumber: e.target.value }))}
                                                        required
                                                        className="h-11 border-zinc-200 bg-zinc-50 rounded-full px-6 focus:ring-0 focus:border-black transition-all flex-1 text-sm text-black"
                                                    />
                                                </div>
                                            </div>

                                            <div className="space-y-2 px-2 pt-2">
                                                <div className="flex items-start space-x-3">
                                                    <Checkbox
                                                        id="age"
                                                        required
                                                        checked={formValues.ageAccepted}
                                                        onCheckedChange={(checked) => setFormValues(prev => ({ ...prev, ageAccepted: checked === true }))}
                                                        className="mt-0.5 rounded-full border-zinc-300 data-[state=checked]:bg-black data-[state=checked]:text-white w-5 h-5 flex-shrink-0"
                                                    />
                                                    <Label htmlFor="age" className="text-sm text-zinc-500 font-normal leading-tight cursor-pointer">
                                                        Confirmo que soy mayor de edad.
                                                    </Label>
                                                </div>
                                                <div className="flex items-start space-x-3">
                                                    <Checkbox
                                                        id="terms"
                                                        required
                                                        checked={formValues.termsAccepted}
                                                        onCheckedChange={(checked) => setFormValues(prev => ({ ...prev, termsAccepted: checked === true }))}
                                                        className="mt-0.5 rounded-full border-zinc-300 data-[state=checked]:bg-black data-[state=checked]:text-white w-5 h-5 flex-shrink-0"
                                                    />
                                                    <Label htmlFor="terms" className="text-sm text-zinc-500 font-normal leading-tight cursor-pointer">
                                                        Acepto los <a href="https://dentalcorbella.com/terminos-y-condiciones-smile-forward/" target="_blank" rel="noopener noreferrer" className="text-black underline">términos y condiciones </a> y la <a href="https://dentalcorbella.com/terminos-y-condiciones-smile-forward/" target="_blank" rel="noopener noreferrer" className="text-black underline"> política de privacidad</a>.
                                                    </Label>
                                                </div>
                                            </div>
                                        </div>
                                    </div>

                                    {/* Right Column - PASO 2 Upload */}
                                    <div className={`space-y-3 transition-opacity duration-300 ${(!formValues.name || !formValues.email || !formValues.phoneNumber || !formValues.ageAccepted || !formValues.termsAccepted) ? 'opacity-40 pointer-events-none' : 'opacity-100'}`}>
                                        <div className="space-y-2">
                                            <div className="inline-flex items-center rounded-full bg-zinc-100 dark:bg-zinc-800 text-zinc-500 px-3 py-1 text-[10px] uppercase tracking-widest font-sans font-bold">
                                                Paso 2
                                            </div>
                                            <h2 className="text-xl md:text-3xl font-serif font-bold text-black dark:text-white leading-tight">
                                                Sube tu foto o hazte un selfie
                                            </h2>
                                        </div>

                                        <div className="w-full space-y-3 mt-[30px]">
                                            {!selectedFile && !mobileConnected ? (
                                                <div
                                                    className="group relative w-full aspect-square md:h-auto md:aspect-[22/11.7] border border-dashed border-zinc-300 dark:border-zinc-700 rounded-[1.5rem] hover:border-black/50 hover:bg-zinc-50 dark:hover:bg-zinc-900 transition-all flex flex-col items-center justify-center cursor-pointer overflow-hidden bg-zinc-50/50 dark:bg-zinc-900/50"
                                                    onDragOver={(e) => e.preventDefault()}
                                                    onDrop={(e) => {
                                                        e.preventDefault();
                                                        if (e.dataTransfer.files?.[0]) setSelectedFile(e.dataTransfer.files[0]);
                                                    }}
                                                    onClick={() => fileInputRef.current?.click()}
                                                >
                                                    <div className="p-3 bg-white dark:bg-zinc-800 shadow-sm rounded-full mb-1 group-hover:scale-110 transition-transform duration-500">
                                                        <UploadCloud className="w-6 h-6 text-zinc-400 group-hover:text-black transition-colors" strokeWidth={1} />
                                                    </div>
                                                    <h3 className="text-lg font-serif text-black dark:text-white mb-0.5">Sube tu Selfie</h3>
                                                    <p className="text-xs text-zinc-500 max-w-[180px] text-center px-4">Arrastra tu foto aquí o haz clic</p>
                                                    <input
                                                        ref={fileInputRef}
                                                        type="file"
                                                        accept="image/*"
                                                        hidden
                                                        onChange={(e) => e.target.files?.[0] && setSelectedFile(e.target.files[0])}
                                                    />
                                                </div>
                                            ) : selectedFile ? (
                                                <div className="relative w-full aspect-square md:h-auto md:aspect-[22/11.7] flex justify-center">
                                                    <div className="relative h-full aspect-square rounded-[1.5rem] overflow-hidden border border-zinc-200 dark:border-zinc-800">
                                                        <img src={URL.createObjectURL(selectedFile)} alt="Selected" className="w-full h-full object-cover" />
                                                        <Button
                                                            variant="secondary"
                                                            size="sm"
                                                            className="absolute top-3 right-3 h-8 px-4 text-[11px] rounded-full bg-white/80 backdrop-blur-sm"
                                                            onClick={() => setSelectedFile(null)}
                                                        >
                                                            Cambiar
                                                        </Button>
                                                    </div>
                                                </div>
                                            ) : (
                                                <div className="flex flex-col items-center justify-center w-full aspect-square md:h-auto md:aspect-[22/11.7] bg-zinc-50 dark:bg-zinc-900 rounded-[1.5rem] border border-zinc-200 dark:border-zinc-800 text-center p-4 space-y-2">
                                                    <Smartphone className="w-10 h-10 text-teal-500 animate-pulse" />
                                                    <p className="text-sm font-medium">Móvil conectado.</p>
                                                    <Button variant="ghost" size="sm" className="h-9 text-xs" onClick={() => setMobileConnected(false)}>Cancelar</Button>
                                                </div>
                                            )}

                                            <div className="flex flex-col gap-2.5">
                                                {!selectedFile && !mobileConnected && (
                                                    <Button
                                                        variant="outline"
                                                        onClick={() => setStep("SELFIE_CAPTURE")}
                                                        className="w-full h-11 rounded-full border-zinc-200 hover:bg-zinc-100 dark:border-zinc-700 dark:hover:bg-zinc-800 text-sm font-medium"
                                                    >
                                                        <ScanFace className="w-5 h-5 mr-2" />
                                                        Hazte un selfie ahora
                                                    </Button>
                                                )}

                                                <Button
                                                    onClick={() => selectedFile && handleUpload(selectedFile)}
                                                    disabled={!selectedFile}
                                                    className="w-full h-11 rounded-full bg-black text-white hover:bg-zinc-800 dark:bg-white dark:text-black dark:hover:bg-zinc-200 text-base font-sans font-medium tracking-wide shadow-lg"
                                                >
                                                    Quiero ver mi versión mejorada
                                                </Button>
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            </motion.div>
                        )}

                        {/* EMAIL SENT CONFIRMATION */}
                        {step === "EMAIL_SENT" && (
                            <motion.div
                                key="email-sent"
                                initial={{ opacity: 0, scale: 0.95 }}
                                animate={{ opacity: 1, scale: 1 }}
                                className="h-full flex items-center justify-center p-4 md:p-8"
                            >
                                <div className="max-w-sm w-full text-center space-y-6 p-8 bg-white dark:bg-zinc-900 rounded-[2rem] shadow-2xl border border-zinc-100 dark:border-zinc-800">
                                    {/* Success Icon */}
                                    <div className="w-16 h-16 mx-auto bg-green-50 dark:bg-green-900/30 rounded-full flex items-center justify-center mb-2">
                                        <Check className="w-8 h-8 text-green-500" strokeWidth={3} />
                                    </div>

                                    {/* Title */}
                                    <div className="space-y-4">
                                        <h2 className="text-2xl md:text-3xl font-sans font-bold text-black dark:text-white leading-tight">
                                            Tu foto ha sido enviada vía correo electrónico
                                        </h2>

                                        {/* Email Display */}
                                        <div className="space-y-2">
                                            <p className="text-base text-zinc-600 dark:text-zinc-400">
                                                al correo <span className="font-semibold text-black dark:text-white">{userEmail}</span>
                                            </p>

                                            {/* Instructions */}
                                            <p className="text-sm text-zinc-500">
                                                Revisa tu correo ahora, si no la recibes escríbenos.
                                            </p>
                                        </div>
                                    </div>

                                    {/* Contact Button */}
                                    <Button
                                        onClick={() => window.location.href = 'https://dentalcorbella.com/contacto/'}
                                        className="w-full h-12 rounded-full bg-black text-white hover:bg-zinc-800 dark:bg-white dark:text-black dark:hover:bg-zinc-200 text-sm font-medium tracking-wide shadow-lg"
                                    >
                                        Escríbenos
                                    </Button>
                                </div>
                            </motion.div>
                        )}

                        {/* RESULT (Final Redesign) */}
                        {step === "RESULT" && (
                            <motion.div
                                key="result"
                                initial={{ opacity: 0 }}
                                animate={{ opacity: 1 }}
                                className="h-full w-full overflow-hidden flex flex-col justify-center bg-white dark:bg-zinc-950"
                            >
                                <div className="w-full h-full flex flex-col items-center justify-center p-4">
                                    {/* Removed outer title as requested */}

                                    <div className="flex flex-col md:flex-row gap-4 md:gap-8 w-full max-w-7xl items-center justify-center flex-1 min-h-0">

                                        <div className="flex flex-col md:flex-row gap-6 md:gap-10 w-full items-center justify-center">
                                            {/* Mobile-only Header */}
                                            <div className="md:hidden text-center space-y-2 mb-2">
                                                <h3 className="text-2xl font-serif text-black dark:text-white leading-tight">
                                                    Tu simulación Smile Forward <br /> ya está lista
                                                </h3>
                                                <p className="text-base text-zinc-600 leading-relaxed font-sans px-4">
                                                    Aquí tienes una primera versión de como podría verse tu sonrisa ideal.
                                                </p>
                                            </div>

                                            {/* Unified Slider Comparison */}
                                            {/* Unified Slider Comparison */}
                                            <div className="flex-none w-auto h-[50vh] md:h-[55vh] aspect-[9/16] max-h-full transition-all duration-300 shadow-2xl rounded-2xl md:rounded-[2.5rem]">
                                                <div className="relative h-full w-full rounded-2xl md:rounded-[2.5rem] overflow-hidden bg-zinc-100 dark:bg-zinc-800 border border-zinc-100 dark:border-zinc-800 shadow-2xl group">
                                                    {(image || demoBeforeImage) && generatedImage ? (
                                                        <BeforeAfterSlider
                                                            beforeImage={image ? URL.createObjectURL(image) : (demoBeforeImage || "")}
                                                            afterImage={alignedImage || generatedImage || ""}
                                                            className="w-full h-full"
                                                        />
                                                    ) : (
                                                        <div className="w-full h-full flex items-center justify-center">
                                                            <Loader2 className="w-8 h-8 animate-spin text-zinc-300" />
                                                        </div>
                                                    )}
                                                </div>
                                            </div>

                                            {/* Sidebar CTA */}
                                            {/* Sidebar CTA */}
                                            <div className="w-full md:w-[30rem] flex flex-col justify-center self-stretch space-y-5 md:space-y-8 text-center md:text-left">
                                                <div className="space-y-2 md:space-y-3">
                                                    {/* Desktop-only Header part */}
                                                    <div className="hidden md:block space-y-3">
                                                        <h3 className="text-3xl font-serif text-black dark:text-white leading-tight">
                                                            Tu simulación Smile Forward <br /> ya está lista
                                                        </h3>
                                                        <p className="text-xl text-zinc-600 leading-relaxed font-sans">
                                                            Aquí tienes una primera versión de como podría verse tu sonrisa ideal.
                                                        </p>
                                                    </div>

                                                    <p className="text-xs md:text-sm text-zinc-500 leading-relaxed font-sans opacity-90">
                                                        Si quieres vivir la experiencia completa y verte en <strong className="font-bold">movimiento (video)</strong>, lo realizamos en consulta para personalizar el resultado, confirmar la viabilidad en tu caso y orientarte sobre la mejor opción de tratamiento con el criterio del equipo de los Dres. Corbella.
                                                    </p>
                                                </div>

                                                <div className="space-y-4">


                                                    <Button
                                                        onClick={handleClinicalVideoRequest}
                                                        disabled={isSubmittingVideo || isSubmittingPhoto}
                                                        className="w-full h-14 md:h-16 rounded-full bg-black text-white hover:bg-zinc-800 dark:bg-white dark:text-black dark:hover:bg-zinc-200 text-sm md:text-lg font-sans font-medium tracking-wide shadow-xl gap-3 group px-6 transition-all"
                                                        size="lg"
                                                    >
                                                        {isSubmittingVideo ? (
                                                            <>
                                                                <Loader2 className="w-5 h-5 animate-spin" />
                                                                Enviando...
                                                            </>
                                                        ) : (
                                                            <>
                                                                <Video className="w-5 h-5 md:w-6 md:h-6 group-hover:scale-110 transition-transform" strokeWidth={1.5} />
                                                                Quiero ver mi vídeo en consulta
                                                            </>
                                                        )}
                                                    </Button>

                                                    <Button
                                                        onClick={handleSendPhotoEmail}
                                                        disabled={isSubmittingPhoto || isSubmittingVideo}
                                                        variant="outline"
                                                        className="w-full h-10 md:h-12 rounded-full border border-black dark:border-white text-black dark:text-white hover:bg-zinc-100 dark:hover:bg-zinc-800 text-sm font-normal tracking-wide shadow-sm"
                                                    >
                                                        {isSubmittingPhoto ? (
                                                            <>
                                                                <Loader2 className="w-4 h-4 animate-spin mr-2" />
                                                                Enviando...
                                                            </>
                                                        ) : (
                                                            "Quiero recibir mi foto"
                                                        )}
                                                    </Button>
                                                </div>
                                            </div>
                                        </div>

                                    </div>

                                    {/* Footer Disclaimer */}
                                    <p className="text-[10px] md:text-sm text-zinc-400 text-center max-w-lg mx-auto leading-relaxed pt-2 md:pt-6 opacity-70">
                                        Simulación Orientativa. El resultado final depende de tu caso clínico
                                    </p>
                                </div>
                            </motion.div>
                        )}

                        {/* PHOTO SUCCESS STEP */}
                        {step === "PHOTO_SUCCESS" && (
                            <motion.div
                                key="photo-success"
                                initial={{ opacity: 0, scale: 0.95 }}
                                animate={{ opacity: 1, scale: 1 }}
                                className="h-full flex items-center justify-center p-4 md:p-8"
                            >
                                <div className="max-w-sm w-full text-center space-y-6 p-8 bg-white dark:bg-zinc-900 rounded-[2rem] shadow-2xl border border-zinc-100 dark:border-zinc-800">
                                    <div className="w-16 h-16 mx-auto bg-green-50 dark:bg-green-900/30 rounded-full flex items-center justify-center mb-2">
                                        <Check className="w-8 h-8 text-green-500" strokeWidth={3} />
                                    </div>

                                    <div className="space-y-3">
                                        <h2 className="text-xl md:text-2xl font-sans font-bold text-black dark:text-white leading-tight">
                                            Solicitud enviada con éxito
                                        </h2>

                                        <div className="space-y-1">
                                            <p className="text-zinc-500 dark:text-zinc-400 text-sm md:text-base font-sans">
                                                Hemos enviado su foto al correo
                                            </p>
                                            <p className="text-black dark:text-white font-bold text-base md:text-lg font-sans">
                                                {userEmail}
                                            </p>
                                        </div>
                                    </div>

                                    <Button
                                        onClick={() => setStep("RESULT")}
                                        variant="outline"
                                        className="h-12 rounded-full px-8 border-zinc-200 text-zinc-600 hover:text-black hover:border-black transition-all"
                                    >
                                        Volver al resultado
                                    </Button>
                                </div>
                            </motion.div>
                        )}

                        {/* CLINICAL REQUEST SUCCESS STEP */}
                        {step === "CLINICAL_REQUEST_SUCCESS" && (
                            <motion.div
                                key="clinical-success"
                                initial={{ opacity: 0, scale: 0.95 }}
                                animate={{ opacity: 1, scale: 1 }}
                                className="h-full flex items-center justify-center p-4 md:p-8"
                            >
                                <div className="max-w-md w-full text-center space-y-6 p-8 bg-white dark:bg-zinc-900 rounded-[2rem] shadow-2xl border border-zinc-100 dark:border-zinc-800">
                                    <div className="w-16 h-16 mx-auto bg-green-50 dark:bg-green-900/30 rounded-full flex items-center justify-center mb-2">
                                        <Check className="w-8 h-8 text-green-500" strokeWidth={3} />
                                    </div>

                                    <div className="space-y-4">
                                        <h2 className="text-2xl md:text-3xl font-sans font-bold text-black dark:text-white leading-tight">
                                            Solicitud enviada con éxito
                                        </h2>
                                        <div className="space-y-3">
                                            <p className="text-zinc-600 dark:text-zinc-400 text-base md:text-lg leading-relaxed font-sans">
                                                Hemos recibido su solicitud y enviado su foto al correo <br />
                                                <span className="font-bold text-black dark:text-white text-lg md:text-xl">{userEmail}</span>
                                            </p>
                                            <p className="text-zinc-500 dark:text-zinc-400 text-sm md:text-base italic font-sans">
                                                En breve nuestro equipo se pondrá en contacto con usted para coordinar su cita.
                                            </p>
                                        </div>
                                    </div>

                                    <Button
                                        onClick={() => setStep("RESULT")}
                                        variant="outline"
                                        className="h-12 rounded-full px-8 border-zinc-200 text-zinc-600 hover:text-black hover:border-black transition-all"
                                    >
                                        Volver al resultado
                                    </Button>
                                </div>
                            </motion.div>
                        )}

                        {/* SURVEY STEP */}

                    </AnimatePresence>
                )}
            </main>

            {/* Developer Attribution - Always Visible */}
            <div className="absolute bottom-2 right-4 z-30 opacity-60 pointer-events-none select-none">
                <span className="text-[9px] uppercase tracking-[0.1em] text-zinc-400 dark:text-zinc-500 font-medium">
                    Desarrollado por Judez-Logic
                </span>
            </div>
        </div>
    );
}
