'use client'

import { useState } from 'react'
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Download, X } from 'lucide-react'

interface ReceiptPreviewProps {
    url: string
    open: boolean
    onClose: () => void
}

export function ReceiptPreview({ url, open, onClose }: ReceiptPreviewProps) {
    const isPdf = url?.toLowerCase().endsWith('.pdf')

    return (
        <Dialog open={open} onOpenChange={(v) => !v && onClose()}>
            <DialogContent className="sm:max-w-[700px] max-h-[90vh]">
                <DialogHeader>
                    <DialogTitle className="flex items-center justify-between">
                        Receipt Preview
                        <div className="flex gap-2">
                            <Button variant="outline" size="sm" asChild>
                                <a href={url} target="_blank" rel="noopener noreferrer" download>
                                    <Download className="h-4 w-4 mr-1" /> Download
                                </a>
                            </Button>
                        </div>
                    </DialogTitle>
                </DialogHeader>
                <div className="flex items-center justify-center bg-gray-50 rounded-lg overflow-hidden min-h-[400px]">
                    {isPdf ? (
                        <iframe
                            src={url}
                            className="w-full h-[500px] border-0"
                            title="Receipt PDF"
                        />
                    ) : (
                        <img
                            src={url}
                            alt="Receipt"
                            className="max-w-full max-h-[500px] object-contain"
                        />
                    )}
                </div>
            </DialogContent>
        </Dialog>
    )
}
