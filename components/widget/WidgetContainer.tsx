"use client";

import { useState, useRef, useEffect } from "react";
import { Turnstile } from "@marsidev/react-turnstile";
import { motion, AnimatePresence } from "framer-motion";
import { createClient } from "@/utils/supabase/client";
import { Loader2, UploadCloud, Lock, Check, Video, PlayCircle, Sparkles, ScanFace, FileSearch, Wand2, Share2, MessageCircle, Send, Smartphone } from "lucide-react";
import { toast } from "sonner";
import { analyzeImageAndGeneratePrompts, generateSmileVariation } from "@/app/services/gemini";
import { validateStaticImage } from "@/utils/faceValidation";
import { uploadScan } from "@/app/services/storage";
import { VariationType } from "@/types/gemini";
import { Button } from "@/components/ui/button";
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
type ProcessStatus = 'validating' | 'scanning' | 'analyzing' | 'designing' | 'complete';

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
    const [processStatus, setProcessStatus] = useState<ProcessStatus>('validating');
    const [uploadedScanUrl, setUploadedScanUrl] = useState<string | null>(null);

    const [isClinicalRequestSent, setIsClinicalRequestSent] = useState(false);
    const [isPhotoEmailSent, setIsPhotoEmailSent] = useState(false); // Track manual email send staus

    // Cross-Device Session State
    const [sessionId, setSessionId] = useState<string | null>(null);
    const [qrUrl, setQrUrl] = useState<string | null>(null);
    const [mobileConnected, setMobileConnected] = useState(false);

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
                    const MAX_WIDTH = 1500;
                    const MAX_HEIGHT = 1500;
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
                    resolve(canvas.toDataURL("image/jpeg", 0.8));
                };
                img.onerror = reject;
            };
            reader.onerror = reject;
        });
    };

    const handleSelfieCapture = async (file: File) => {
        handleUpload(file);
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
            const currentUserId = user?.id || 'anon_' + crypto.randomUUID();
            setUserId(currentUserId);
            formData.append('userId', currentUserId);

            const uploadRes = await uploadScan(formData);
            if (uploadRes.success && uploadRes.data) {
                setUploadedScanUrl(uploadRes.data);
            } else {
                console.warn("Fallo subida de imagen original:", uploadRes.error);
            }

            setProcessStatus('analyzing');

            // 3. Analyze Image
            const analysisResponse = await analyzeImageAndGeneratePrompts(base64);
            if (!analysisResponse.success) throw new Error(analysisResponse.error || "Error analizando imagen");

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
            const genResult = await generateSmileVariation(
                base64,
                fallbackPrompt,
                "9:16",
                currentUserId,
                analysisResult.analysis_id, // New param
                VariationType.ORIGINAL_BG   // New param
            );

            if (!genResult.success || !genResult.data) {
                throw new Error(genResult.error || "Fallo en la generación de sonrisa");
            }

            setGeneratedImage(genResult.data);
            setProcessStatus('complete');

            // Allow a brief moment for the 'complete' state to show before transitioning
            await new Promise(r => setTimeout(r, 800));

            // AUTO-FLOW: If we already have a leadId (captured at start), save and show result
            if (leadId) {
                try {
                    // 1. Save Generation
                    const supabase = createClient();
                    const { error: genError } = await supabase.from('generations').insert({
                        lead_id: leadId,
                        type: 'image',
                        status: 'completed',
                        input_path: uploadedScanUrl || 'unknown',
                        output_path: genResult.data,
                        metadata: { source: 'widget_v1' }
                    });
                    if (genError) console.error("Error saving generation:", genError);


                    // 3. Go to Result


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

            let displayError = err.message || "Ocurrió un error.";
            if (
                displayError.includes("AI did not return an image") ||
                displayError.includes("AI did not return a video") ||
                displayError.includes("safety filters")
            ) {
                displayError = "Por favor sube una imágen diferente";
            }

            toast.error(displayError);

            // Only reset to UPLOAD if we were already in PROCESSING
            // If validation failed, IMAGE is still null and STEP is still UPLOAD/SELFIE_CAPTURE,
            // so this just ensures we don't end up on a broken screen.
            setStep((prev) => {
                if (prev === "PROCESSING") return "UPLOAD";
                return prev;
            });
            setImage(null);
        }
    };

    const handleLeadSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        const formData = new FormData(e.target as HTMLFormElement);
        const data = Object.fromEntries(formData);

        try {
            const supabase = createClient();
            const leadId = crypto.randomUUID(); // Client-side ID generation

            // 1. Insert Lead
            // Combine country code and phone number if available
            const selectedCountryIso = (data.countryCode as string) || 'ES';
            const countryDialCode = countries.find(c => c.code === selectedCountryIso)?.dial_code || '+34';
            const phoneNumber = (data.phoneNumber as string) || (data.phone as string) || '';
            const fullPhone = `${countryDialCode} ${phoneNumber}`;

            const { error: leadError } = await supabase.from('leads').insert({
                id: leadId,
                name: (data.name as string),
                email: (data.email as string),
                phone: fullPhone.trim(),
                status: 'pending'
            });

            if (leadError) throw leadError;

            toast.success("¡Información enviada con éxito!");
            setLeadId(leadId); // Persist ID for next step
            setUserEmail(data.email as string); // Store email for confirmation view
            setUserName(data.name as string); // Store name
            setUserPhone(fullPhone.trim()); // Store phone

            if (leadIntent === 'video') {
                // Redirect to external URL for video appointment
                window.location.href = 'https://dentalcorbella.com/contacto/';
            } else {
                // IF we are at the start (no generated image yet), go to UPLOAD
                if (!generatedImage) {
                    setStep("UPLOAD");
                    return;
                }

                // ELSE (Legacy Flow - Post Generation): Save, Email, Show Confirmation
                if (generatedImage) {
                    // 2. Insert Generation Record (Linked to Lead)
                    const { error: genError } = await supabase.from('generations').insert({
                        lead_id: leadId,
                        type: 'image',
                        status: 'completed',
                        input_path: uploadedScanUrl || 'unknown',
                        output_path: generatedImage,
                        metadata: { source: 'widget_v1' }
                    });
                    if (genError) console.error("Error saving generation:", genError);

                    // Replaced automatic email with manual trigger in RESULT step
                    // Show result directly
                    setStep("RESULT");
                }
            }
        } catch (err) {
            console.error(err);
            toast.error("Error guardando datos. Intenta de nuevo.");
        }
    };

    const handleVideoRequest = () => {
        setIsVideoDialogOpen(false);
        toast.info("Solicitud enviada.", { description: "Te contactaremos pronto." });
    };

    const handleClinicalVideoRequest = async () => {
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
        }
    };

    const handleSendPhotoEmail = async () => {
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
            }
        } catch (emailErr) {
            console.error('Email invoke error:', emailErr);
            toast.error("Error enviando el correo");
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
        <div className="relative h-auto md:h-[calc(100vh-100px)] min-h-[600px] w-full bg-white dark:bg-zinc-900 border border-zinc-100 dark:border-zinc-800 shadow-sm flex flex-col font-sans overflow-hidden rounded-[2rem]">
            {/* Header - Minimal with Serif Font */}
            <div className="flex-none p-6 md:p-8 border-b border-zinc-100 dark:border-zinc-800 flex justify-between items-center bg-white/50 dark:bg-zinc-900/50 backdrop-blur-md z-20">
                <h1 className="text-xl md:text-2xl font-serif text-black dark:text-white tracking-tight">Smile Forward</h1>
                {/* Subtle Status Indicator */}
                <div className="flex items-center gap-2 px-3 py-1 bg-zinc-50 dark:bg-zinc-800 rounded-full border border-zinc-100 dark:border-zinc-700">
                    <span className="relative flex h-2 w-2">
                        <span className="relative inline-flex rounded-full h-2 w-2 bg-teal-500"></span>
                    </span>
                    <span className="text-[10px] text-zinc-500 dark:text-zinc-400 font-sans tracking-widest uppercase">Online</span>
                </div>
            </div>

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
                                    className="group relative w-full aspect-[4/3] max-w-[280px] md:max-w-sm border border-dashed border-zinc-300 dark:border-zinc-700 rounded-[2rem] hover:border-teal-500/50 hover:bg-zinc-50 dark:hover:bg-zinc-900 transition-all flex flex-col items-center justify-center cursor-pointer overflow-hidden bg-zinc-50/50 dark:bg-zinc-900/50"
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
                                                    <div className="relative w-full h-full rounded-xl md:rounded-[2rem] overflow-hidden shadow-xl group sm:aspect-[9/16] md:aspect-auto">
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

                        {/* LEAD FORM - Clean & Minimal */}
                        {step === "LEAD_FORM" && (
                            <motion.div
                                key="form"
                                initial={{ opacity: 0, x: 20 }}
                                animate={{ opacity: 1, x: 0 }}
                                className="h-full flex items-center justify-center p-4 md:p-8 overflow-y-auto"
                            >
                                <div className="w-full max-w-6xl grid grid-cols-1 md:grid-cols-2 gap-8 md:gap-12 items-center">
                                    {/* Left Column - Title & Subtitle */}
                                    <div className="space-y-4 text-center md:text-left">
                                        {generatedImage && (
                                            <Button
                                                variant="ghost"
                                                size="sm"
                                                onClick={() => setStep("LOCKED_RESULT")}
                                                className="text-zinc-500 hover:text-black dark:hover:text-white mb-4"
                                            >
                                                <Share2 className="w-4 h-4 mr-2 rotate-180" />
                                                Volver al resultado
                                            </Button>
                                        )}
                                        <h2 className="text-2xl md:text-3xl font-serif font-bold text-black dark:text-white">
                                            {generatedImage ? "¿Quieres ver tu sonrisa real?" : "Comienza tu transformación"}
                                        </h2>
                                        <p className="text-sm md:text-base text-zinc-500 leading-[1.7]">
                                            {generatedImage
                                                ? <><span className="font-bold">Déjanos tus datos</span> para recibir tu diseño personalizado en alta calidad.</>
                                                : <>
                                                    Completa tus datos para iniciar el diseño de tu nueva sonrisa.
                                                    <br />
                                                    Debes ser mayor de edad para utilizar esta herramienta.
                                                </>
                                            }
                                        </p>
                                    </div>

                                    {/* Right Column - Form */}
                                    <div className="w-full">
                                        <form className="space-y-6" onSubmit={handleLeadSubmit}>
                                            <div className="space-y-5">
                                                <div className="space-y-1.5">
                                                    <Label htmlFor="name" className="text-xs uppercase tracking-wider text-zinc-400 pl-4">Nombre Completo</Label>
                                                    <Input id="name" name="name" placeholder="Tu nombre" required className="h-12 border-zinc-200 bg-zinc-50 rounded-full px-6 focus:ring-0 focus:border-black transition-all" />
                                                </div>

                                                <div className="space-y-1.5">
                                                    <Label htmlFor="email" className="text-xs uppercase tracking-wider text-zinc-400 pl-4">Correo Electrónico</Label>
                                                    <Input id="email" name="email" type="email" placeholder="tu@email.com" required className="h-12 border-zinc-200 bg-zinc-50 rounded-full px-6 focus:ring-0 focus:border-black transition-all" />
                                                </div>

                                                <div className="space-y-1.5">
                                                    <Label htmlFor="phone" className="text-xs uppercase tracking-wider text-zinc-400 pl-4">WhatsApp</Label>
                                                    <div className="flex items-center gap-3">
                                                        <div className="w-[110px] flex-shrink-0">
                                                            <Select
                                                                name="countryCode"
                                                                defaultValue="ES"
                                                                onValueChange={(value) => setSelectedCountry(value)}
                                                            >
                                                                <SelectTrigger className="h-12 rounded-full border-zinc-200 bg-zinc-50 focus:ring-0 focus:border-black">
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
                                                            required
                                                            className="h-12 border-zinc-200 bg-zinc-50 rounded-full px-6 focus:ring-0 focus:border-black transition-all flex-1"
                                                        />
                                                    </div>
                                                </div>
                                            </div>

                                            <div className="space-y-4 px-2">
                                                <div className="flex items-start space-x-3">
                                                    <Checkbox id="age" required className="mt-0.5 rounded-full border-zinc-300 data-[state=checked]:bg-black data-[state=checked]:text-white w-5 h-5 flex-shrink-0" />
                                                    <Label htmlFor="age" className="text-sm text-zinc-500 font-normal leading-relaxed cursor-pointer">
                                                        Confirmo que soy mayor de edad.
                                                    </Label>
                                                </div>
                                                <div className="flex items-start space-x-3">
                                                    <Checkbox id="terms" required className="mt-0.5 rounded-full border-zinc-300 data-[state=checked]:bg-black data-[state=checked]:text-white w-5 h-5 flex-shrink-0" />
                                                    <Label htmlFor="terms" className="text-sm text-zinc-500 font-normal leading-relaxed cursor-pointer">
                                                        Acepto los <a href="/terminos-y-condiciones" target="_blank" rel="noopener noreferrer" className="text-black underline">términos y condiciones</a> y <a href="/politicas-de-privacidad" target="_blank" rel="noopener noreferrer" className="text-black underline">las políticas de privacidad</a>.
                                                    </Label>
                                                </div>
                                            </div>

                                            <div className="pt-2">
                                                <Button
                                                    type="submit"
                                                    onClick={() => setLeadIntent('image')}
                                                    className="w-full h-14 rounded-full bg-black text-white hover:bg-zinc-800 dark:bg-white dark:text-black dark:hover:bg-zinc-200 text-base font-sans font-medium tracking-wide shadow-xl"
                                                >
                                                    {generatedImage ? "Recibir mi diseño" : "Continuar con el diseño"}
                                                </Button>
                                            </div>
                                        </form>
                                    </div>
                                </div>
                            </motion.div>
                        )}

                        {/* EMAIL SENT CONFIRMATION */}
                        {step === "EMAIL_SENT" && (
                            <motion.div
                                key="email-sent"
                                initial={{ opacity: 0, y: 20 }}
                                animate={{ opacity: 1, y: 0 }}
                                className="h-full flex items-center justify-center p-4 md:p-8"
                            >
                                <div className="max-w-md w-full text-center space-y-6">
                                    {/* Success Icon */}
                                    <div className="w-16 h-16 mx-auto bg-green-100 dark:bg-green-900/30 rounded-full flex items-center justify-center">
                                        <Check className="w-8 h-8 text-green-600 dark:text-green-400" />
                                    </div>

                                    {/* Title */}
                                    <h2 className="text-2xl md:text-3xl font-serif font-bold text-black dark:text-white">
                                        Tu foto ha sido enviada vía correo electrónico
                                    </h2>

                                    {/* Email Display */}
                                    <p className="text-base text-zinc-600 dark:text-zinc-400">
                                        al correo <span className="font-semibold text-black dark:text-white">{userEmail}</span>
                                    </p>

                                    {/* Instructions */}
                                    <p className="text-sm text-zinc-500">
                                        Revisa tu correo ahora, si no la recibes escríbenos.
                                    </p>

                                    {/* Contact Button */}
                                    <Button
                                        onClick={() => window.location.href = 'https://dentalcorbella.com/contacto/'}
                                        className="w-full h-14 rounded-full bg-black text-white hover:bg-zinc-800 dark:bg-white dark:text-black dark:hover:bg-zinc-200 text-base font-medium tracking-wide shadow-lg"
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
                                            <div className="flex-none w-auto h-[45vh] md:h-[55vh] aspect-[9/16] max-h-full transition-all duration-300 shadow-2xl rounded-2xl md:rounded-[2.5rem]">
                                                <div className="relative h-full w-full rounded-2xl md:rounded-[2.5rem] overflow-hidden bg-zinc-100 dark:bg-zinc-800 border border-zinc-100 dark:border-zinc-800 shadow-2xl group">
                                                    {(image || demoBeforeImage) && generatedImage ? (
                                                        <BeforeAfterSlider
                                                            beforeImage={image ? URL.createObjectURL(image) : (demoBeforeImage || "")}
                                                            afterImage={generatedImage}
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
                                                        className="w-full h-14 md:h-16 rounded-full bg-black text-white hover:bg-zinc-800 dark:bg-white dark:text-black dark:hover:bg-zinc-200 text-sm md:text-lg font-sans font-medium tracking-wide shadow-xl gap-3 group px-6"
                                                        size="lg"
                                                    >
                                                        <Video className="w-5 h-5 md:w-6 md:h-6 group-hover:scale-110 transition-transform" strokeWidth={1.5} />
                                                        Quiero ver mi vídeo en consulta
                                                    </Button>

                                                    <Button
                                                        onClick={handleSendPhotoEmail}
                                                        variant="outline"
                                                        className="w-full h-10 md:h-12 rounded-full border border-black dark:border-white text-black dark:text-white hover:bg-zinc-100 dark:hover:bg-zinc-800 text-sm font-normal tracking-wide shadow-sm"
                                                    >
                                                        Quiero recibir mi foto
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
                                <div className="max-w-md w-full text-center space-y-8 p-10 bg-white dark:bg-zinc-900 rounded-[2.5rem] shadow-2xl border border-zinc-100 dark:border-zinc-800">
                                    <div className="w-20 h-20 mx-auto bg-green-50 dark:bg-green-900/30 rounded-full flex items-center justify-center mb-4">
                                        <Check className="w-10 h-10 text-green-500" strokeWidth={3} />
                                    </div>

                                    <div className="space-y-4">
                                        <h2 className="text-3xl md:text-4xl font-serif font-bold text-black dark:text-white leading-tight">
                                            Solicitud enviada con éxito
                                        </h2>
                                        <div className="space-y-3">
                                            <p className="text-zinc-500 dark:text-zinc-400 text-lg md:text-xl font-sans">
                                                Hemos enviado su foto al correo
                                            </p>
                                            <p className="text-black dark:text-white font-bold text-xl md:text-2xl font-sans">
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
                                <div className="max-w-xl w-full text-center space-y-8 p-10 bg-white dark:bg-zinc-900 rounded-[2.5rem] shadow-2xl border border-zinc-100 dark:border-zinc-800">
                                    <div className="w-20 h-20 mx-auto bg-green-50 dark:bg-green-900/30 rounded-full flex items-center justify-center mb-4">
                                        <Check className="w-10 h-10 text-green-500" strokeWidth={3} />
                                    </div>

                                    <div className="space-y-6">
                                        <h2 className="text-3xl md:text-4xl font-serif font-bold text-black dark:text-white leading-tight">
                                            Solicitud enviada con éxito
                                        </h2>
                                        <div className="space-y-5">
                                            <p className="text-zinc-600 dark:text-zinc-400 text-lg md:text-xl leading-relaxed font-sans">
                                                Hemos recibido su solicitud y enviado su foto al correo <br />
                                                <span className="font-bold text-black dark:text-white text-xl md:text-2xl">{userEmail}</span>
                                            </p>
                                            <p className="text-zinc-500 dark:text-zinc-400 text-base md:text-lg italic font-sans">
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
        </div >
    );
}
