'use client'

import { useState, useRef, useCallback, useEffect } from 'react'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Upload, FileImage, Loader2, CheckCircle2, AlertCircle, X, ArrowRightLeft } from 'lucide-react'
import { createTransaction } from '@/lib/actions/finance'
import { parseReceiptText } from '@/lib/utils/receiptParser'
import { toast } from 'sonner'
import { CURRENCIES, getExchangeRate, formatCurrency } from '@/lib/utils/currency'

interface ReceiptUploadProps {
    companyId: string
    userId: string
    companyCurrency: string
}

type Step = 'upload' | 'processing' | 'review'

export function ReceiptUpload({ companyId, userId, companyCurrency }: ReceiptUploadProps) {
    const [open, setOpen] = useState(false)
    const [step, setStep] = useState<Step>('upload')
    const [dragActive, setDragActive] = useState(false)
    const [progress, setProgress] = useState(0)
    const [progressLabel, setProgressLabel] = useState('')
    const [previewUrl, setPreviewUrl] = useState<string | null>(null)
    const [receiptUrl, setReceiptUrl] = useState<string | null>(null)
    const [loading, setLoading] = useState(false)

    // Extracted data
    const [amount, setAmount] = useState('')
    const [date, setDate] = useState('')
    const [vendor, setVendor] = useState('')
    const [description, setDescription] = useState('')
    const [type, setType] = useState<'income' | 'expense'>('expense')
    const [category, setCategory] = useState('')

    // Multi-currency state
    const [currency, setCurrency] = useState(companyCurrency)
    const [exchangeRate, setExchangeRate] = useState<number>(1)
    const [fetchingRate, setFetchingRate] = useState(false)

    const fileInputRef = useRef<HTMLInputElement>(null)

    const resetForm = useCallback(() => {
        setStep('upload')
        setProgress(0)
        setProgressLabel('')
        setPreviewUrl(null)
        setReceiptUrl(null)
        setAmount('')
        setDate('')
        setVendor('')
        setDescription('')
        setType('expense')
        setCategory('')
        setCurrency(companyCurrency)
        setExchangeRate(1)
    }, [companyCurrency])

    // Update currency state if prop changes (and form is reset)
    useEffect(() => {
        if (!open) setCurrency(companyCurrency)
    }, [companyCurrency, open])

    // Fetch exchange rate when currency changes
    useEffect(() => {
        if (currency === companyCurrency) {
            setExchangeRate(1)
            return
        }

        async function fetchRate() {
            setFetchingRate(true)
            const rate = await getExchangeRate(currency, companyCurrency)
            if (rate) {
                setExchangeRate(rate)
            } else {
                toast.error('Could not fetch exchange rate')
            }
            setFetchingRate(false)
        }

        fetchRate()
    }, [currency, companyCurrency])

    const convertedAmount = amount ? Number(amount) * exchangeRate : 0

    const handleFile = useCallback(async (file: File) => {
        setStep('processing')
        setProgress(10)
        setProgressLabel('Preparing file...')

        try {
            let imageForOcr: string | null = null

            // If PDF, convert first page to image using pdfjs-dist in browser
            if (file.type === 'application/pdf') {
                setProgressLabel('Converting PDF to image...')
                setProgress(15)
                imageForOcr = await convertPdfToImage(file)
            } else {
                // Direct image — create a preview URL
                imageForOcr = URL.createObjectURL(file)
            }

            setPreviewUrl(imageForOcr)
            setProgress(30)

            // Upload file to storage
            setProgressLabel('Uploading receipt...')
            const uploadFormData = new FormData()
            uploadFormData.append('file', file)
            uploadFormData.append('companyId', companyId)

            const uploadRes = await fetch('/api/ocr', {
                method: 'POST',
                body: uploadFormData
            })

            if (!uploadRes.ok) {
                throw new Error('Upload failed')
            }

            const uploadData = await uploadRes.json()
            setReceiptUrl(uploadData.receiptUrl)
            setProgress(50)

            // Run Tesseract.js OCR client-side
            setProgressLabel('Running OCR (extracting text)...')
            const Tesseract = (await import('tesseract.js')).default

            const result = await Tesseract.recognize(
                imageForOcr!,
                'spa+eng', // Spanish + English
                {
                    logger: (m: any) => {
                        if (m.status === 'recognizing text') {
                            setProgress(50 + Math.round((m.progress || 0) * 40))
                        }
                    }
                }
            )

            setProgress(90)
            setProgressLabel('Parsing receipt data...')

            const ocrText = result.data.text
            console.log('[OCR] Extracted text:', ocrText)

            // Parse the extracted text
            const parsed = parseReceiptText(ocrText)
            console.log('[OCR] Parsed data:', parsed)

            // Pre-fill form fields
            if (parsed.total) setAmount(String(parsed.total))
            if (parsed.date) setDate(parsed.date)
            if (parsed.vendor) setVendor(parsed.vendor)
            if (parsed.description) setDescription(parsed.description)

            // Auto-detect today if no date found
            if (!parsed.date) {
                setDate(new Date().toISOString().split('T')[0])
            }

            setProgress(100)
            setProgressLabel('Done!')
            setStep('review')

        } catch (error) {
            console.error('Receipt processing error:', error)
            toast.error('Failed to process receipt. Please try again.')
            setStep('upload')
        }
    }, [companyId])

    const handleDrop = useCallback((e: React.DragEvent) => {
        e.preventDefault()
        setDragActive(false)
        const file = e.dataTransfer.files[0]
        if (file) handleFile(file)
    }, [handleFile])

    const handleSave = async () => {
        setLoading(true)
        try {
            const formData = new FormData()
            formData.append('companyId', companyId)
            formData.append('contactId', userId)

            // Standard fields
            formData.append('date', date)
            formData.append('category', category)
            formData.append('description', description || vendor || '')
            formData.append('type', type)
            if (receiptUrl) formData.append('media_url', receiptUrl)

            // Multi-currency fields
            formData.append('currency', currency)
            formData.append('originalAmount', amount)
            formData.append('exchangeRate', exchangeRate.toString())

            // Base currency amount
            formData.append('amount', convertedAmount.toString())

            const result = await createTransaction(formData)

            if (result?.error) {
                toast.error(result.error)
            } else {
                toast.success('Transaction created from receipt!')
                setOpen(false)
                resetForm()
            }
        } catch (error) {
            toast.error('Failed to save transaction')
        }
        setLoading(false)
    }

    return (
        <Dialog open={open} onOpenChange={(v) => { setOpen(v); if (!v) resetForm() }}>
            <DialogTrigger asChild>
                <Button variant="outline">
                    <Upload className="mr-2 h-4 w-4" />
                    Upload Receipt
                </Button>
            </DialogTrigger>
            <DialogContent className="sm:max-w-[600px] max-h-[90vh] overflow-y-auto">
                <DialogHeader>
                    <DialogTitle>
                        {step === 'upload' && 'Upload Receipt'}
                        {step === 'processing' && 'Processing Receipt...'}
                        {step === 'review' && 'Review Extracted Data'}
                    </DialogTitle>
                </DialogHeader>

                {/* STEP 1: Upload */}
                {step === 'upload' && (
                    <div
                        className={`border-2 border-dashed rounded-lg p-12 text-center cursor-pointer transition-colors
                            ${dragActive ? 'border-primary bg-primary/5' : 'border-muted-foreground/25 hover:border-primary/50'}`}
                        onDragOver={(e) => { e.preventDefault(); setDragActive(true) }}
                        onDragLeave={() => setDragActive(false)}
                        onDrop={handleDrop}
                        onClick={() => fileInputRef.current?.click()}
                    >
                        <FileImage className="mx-auto h-12 w-12 text-muted-foreground mb-4" />
                        <p className="text-lg font-medium mb-2">
                            Drag & drop your receipt here
                        </p>
                        <p className="text-sm text-muted-foreground mb-4">
                            or click to browse files
                        </p>
                        <p className="text-xs text-muted-foreground">
                            Supports: JPG, PNG, WEBP, PDF
                        </p>
                        <input
                            ref={fileInputRef}
                            type="file"
                            className="hidden"
                            accept="image/*,.pdf"
                            onChange={(e) => {
                                const file = e.target.files?.[0]
                                if (file) handleFile(file)
                            }}
                        />
                    </div>
                )}

                {/* STEP 2: Processing */}
                {step === 'processing' && (
                    <div className="space-y-6 py-4">
                        {previewUrl && (
                            <div className="relative rounded-lg overflow-hidden border max-h-48">
                                <img src={previewUrl} alt="Receipt preview" className="w-full h-48 object-contain bg-gray-50" />
                            </div>
                        )}
                        <div className="space-y-2">
                            <div className="flex items-center gap-2 text-sm">
                                <Loader2 className="h-4 w-4 animate-spin" />
                                <span className={progress > 90 ? 'text-green-600 font-medium' : ''}>{progressLabel}</span>
                            </div>
                            <div className="w-full bg-gray-200 rounded-full h-2">
                                <div
                                    className="bg-primary h-2 rounded-full transition-all duration-300"
                                    style={{ width: `${progress}%` }}
                                />
                            </div>
                            <p className="text-xs text-muted-foreground text-right">{progress}%</p>
                        </div>
                    </div>
                )}

                {/* STEP 3: Review & Edit */}
                {step === 'review' && (
                    <div className="space-y-4">
                        {previewUrl && (
                            <div className="rounded-lg overflow-hidden border max-h-40">
                                <img src={previewUrl} alt="Receipt" className="w-full h-40 object-contain bg-gray-50" />
                            </div>
                        )}

                        <div className="grid grid-cols-2 gap-4">
                            {/* Type selector */}
                            <div className="col-span-2">
                                <Label>Transaction Type *</Label>
                                <div className="flex gap-2 mt-1">
                                    <Button
                                        type="button"
                                        variant={type === 'expense' ? 'default' : 'outline'}
                                        className={type === 'expense' ? 'bg-red-600 hover:bg-red-700 flex-1' : 'flex-1'}
                                        onClick={() => setType('expense')}
                                    >
                                        Expense
                                    </Button>
                                    <Button
                                        type="button"
                                        variant={type === 'income' ? 'default' : 'outline'}
                                        className={type === 'income' ? 'bg-green-600 hover:bg-green-700 flex-1' : 'flex-1'}
                                        onClick={() => setType('income')}
                                    >
                                        Income
                                    </Button>
                                </div>
                            </div>

                            {/* Amount & Currency in mixed grid */}
                            <div className="col-span-2 grid grid-cols-2 gap-4">
                                <div>
                                    <Label htmlFor="receipt-amount">Amount *</Label>
                                    <Input
                                        id="receipt-amount"
                                        type="number"
                                        step="0.01"
                                        value={amount}
                                        onChange={(e) => setAmount(e.target.value)}
                                        placeholder="0.00"
                                        className="mt-1"
                                    />
                                </div>
                                <div>
                                    <Label>Currency</Label>
                                    <Select value={currency} onValueChange={setCurrency}>
                                        <SelectTrigger className="mt-1">
                                            <SelectValue placeholder="Currency" />
                                        </SelectTrigger>
                                        <SelectContent>
                                            {CURRENCIES.map(c => (
                                                <SelectItem key={c.code} value={c.code}>
                                                    {c.code}
                                                </SelectItem>
                                            ))}
                                        </SelectContent>
                                    </Select>
                                </div>
                            </div>

                            {/* Conversion Preview */}
                            {currency !== companyCurrency && (
                                <div className="col-span-2 text-sm bg-blue-50 text-blue-800 p-2 rounded flex flex-col gap-1 border border-blue-100">
                                    <div className="flex items-center gap-2 font-medium">
                                        <ArrowRightLeft className="w-3 h-3" />
                                        <span>Conversion Preview</span>
                                        {fetchingRate && <Loader2 className="w-3 h-3 animate-spin" />}
                                    </div>
                                    <div className="flex justify-between items-center text-xs opacity-90">
                                        <span>Rate: 1 {currency} = {exchangeRate.toFixed(4)} {companyCurrency}</span>
                                    </div>
                                    <div className="font-bold text-lg border-t border-blue-200 pt-1 mt-1">
                                        ≈ {formatCurrency(convertedAmount, companyCurrency)}
                                    </div>
                                </div>
                            )}

                            {/* Date */}
                            <div>
                                <Label htmlFor="receipt-date">Date *</Label>
                                <Input
                                    id="receipt-date"
                                    type="date"
                                    value={date}
                                    onChange={(e) => setDate(e.target.value)}
                                    className="mt-1"
                                />
                            </div>

                            {/* Category */}
                            <div>
                                <Label htmlFor="receipt-category">Category *</Label>
                                <select
                                    id="receipt-category"
                                    value={category}
                                    onChange={(e) => setCategory(e.target.value)}
                                    className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background mt-1"
                                >
                                    <option value="">Select category</option>
                                    <option value="Renta">Renta</option>
                                    <option value="Servicios">Servicios</option>
                                    <option value="Marketing">Marketing</option>
                                    <option value="Nómina">Nómina</option>
                                    <option value="Software">Software</option>
                                    <option value="Comida">Comida</option>
                                    <option value="Transporte">Transporte</option>
                                    <option value="Equipamiento">Equipamiento</option>
                                    <option value="Ventas">Ventas</option>
                                    <option value="Consultoría">Consultoría</option>
                                    <option value="Otros">Otros</option>
                                </select>
                            </div>

                            {/* Vendor */}
                            <div>
                                <Label htmlFor="receipt-vendor">Vendor</Label>
                                <Input
                                    id="receipt-vendor"
                                    value={vendor}
                                    onChange={(e) => setVendor(e.target.value)}
                                    placeholder="Store name"
                                    className="mt-1"
                                />
                            </div>

                            {/* Description */}
                            <div className="col-span-2">
                                <Label htmlFor="receipt-desc">Description</Label>
                                <Input
                                    id="receipt-desc"
                                    value={description}
                                    onChange={(e) => setDescription(e.target.value)}
                                    placeholder="Optional notes"
                                    className="mt-1"
                                />
                            </div>
                        </div>

                        <div className="flex gap-2 justify-end pt-2">
                            <Button variant="outline" onClick={resetForm}>
                                Cancel
                            </Button>
                            <Button
                                onClick={handleSave}
                                disabled={loading || !amount || !date || !category}
                            >
                                {loading ? (
                                    <><Loader2 className="mr-2 h-4 w-4 animate-spin" /> Saving...</>
                                ) : (
                                    <><CheckCircle2 className="mr-2 h-4 w-4" /> Save Transaction</>
                                )}
                            </Button>
                        </div>
                    </div>
                )}
            </DialogContent>
        </Dialog>
    )
}

/**
 * Converts the first page of a PDF to a PNG image using pdfjs-dist in the browser.
 */
async function convertPdfToImage(file: File): Promise<string> {
    const pdfjsLib = await import('pdfjs-dist')

    // Set the worker source to the local file in public/ folder
    // checking for window ensures this only runs on client
    if (typeof window !== 'undefined') {
        pdfjsLib.GlobalWorkerOptions.workerSrc = window.location.origin + '/pdf.worker.min.mjs'
    }

    const arrayBuffer = await file.arrayBuffer()
    const pdf = await pdfjsLib.getDocument({ data: arrayBuffer }).promise
    const page = await pdf.getPage(1)

    const scale = 2 // Higher scale = better OCR accuracy
    const viewport = page.getViewport({ scale })

    const canvas = document.createElement('canvas')
    canvas.width = viewport.width
    canvas.height = viewport.height

    const ctx = canvas.getContext('2d')!
    // @ts-ignore - The types in some versions of pdfjs-dist require the canvas element
    await page.render({ canvasContext: ctx, viewport, canvas }).promise

    return canvas.toDataURL('image/png')
}
