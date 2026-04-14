"use client";

import { motion } from "framer-motion";
import { Share2, UploadCloud, ScanFace, Smartphone } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { countries } from "../countries";
import type { FormValues } from "../types";

interface LeadFormStepProps {
    formValues: FormValues;
    setFormValues: React.Dispatch<React.SetStateAction<FormValues>>;
    selectedCountry: string;
    setSelectedCountry: (value: string) => void;
    selectedFile: File | null;
    setSelectedFile: (file: File | null) => void;
    mobileConnected: boolean;
    setMobileConnected: (connected: boolean) => void;
    generatedImage: string | null;
    fileInputRef: React.RefObject<HTMLInputElement | null>;
    onSelfieCapture: () => void;
    onUpload: (file: File) => void;
    onBackToResult: () => void;
}

export function LeadFormStep({
    formValues,
    setFormValues,
    selectedCountry,
    setSelectedCountry,
    selectedFile,
    setSelectedFile,
    mobileConnected,
    setMobileConnected,
    generatedImage,
    fileInputRef,
    onSelfieCapture,
    onUpload,
    onBackToResult,
}: LeadFormStepProps) {
    return (
        <motion.div
            key="form"
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            className="md:h-full flex items-start justify-center p-4 pb-16 md:p-6 md:pb-6 pt-[10px] overflow-visible md:overflow-hidden"
        >
            <div className="w-full max-w-6xl grid grid-cols-1 md:grid-cols-2 gap-6 md:gap-10 items-start">
                {/* Left Column - PASO 1 Form */}
                <div className="space-y-3">
                    <div className="space-y-2">
                        {generatedImage && (
                            <Button
                                variant="ghost"
                                size="sm"
                                onClick={onBackToResult}
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
                                    Acepto los <a href="https://dentalcorbella.com/terminos-y-condiciones-smile-forward/" target="_blank" rel="noopener noreferrer" className="text-black underline">términos y condiciones </a> y la <a href="https://dentalcorbella.com/terminos-y-condiciones-smile-forward/" target="_blank" rel="noopener noreferrer" className="text-black underline">política de privacidad</a>.
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
                                <h3 className="text-lg font-serif text-black dark:text-white mb-0.5">
                                    <span className="hidden md:inline">Sube tu Selfie</span>
                                    <span className="md:hidden">Sube o hazte una selfie</span>
                                </h3>
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
                                    onClick={onSelfieCapture}
                                    className="hidden md:flex w-full h-11 rounded-full border-zinc-200 hover:bg-zinc-100 dark:border-zinc-700 dark:hover:bg-zinc-800 text-sm font-medium"
                                >
                                    <ScanFace className="w-5 h-5 mr-2" />
                                    Hazte un selfie ahora
                                </Button>
                            )}

                            <Button
                                onClick={() => selectedFile && onUpload(selectedFile)}
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
    );
}
