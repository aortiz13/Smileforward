import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { createServiceClient } from '@/lib/supabase/service'
import { parseReceiptText } from '@/lib/utils/receiptParser'

export const maxDuration = 60 // Allow up to 60s for OCR processing

export async function POST(request: NextRequest) {
    try {
        // 1. Auth check
        const supabase = await createClient()
        const { data: { user }, error: authError } = await supabase.auth.getUser()
        if (authError || !user) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
        }

        // 2. Get file and metadata from form data
        const formData = await request.formData()
        const file = formData.get('file') as File | null
        const companyId = formData.get('companyId') as string

        if (!file || !companyId) {
            return NextResponse.json({ error: 'File and companyId are required' }, { status: 400 })
        }

        // 3. Upload file to Supabase Storage
        const adminDb = createServiceClient()
        const ext = file.name.split('.').pop()?.toLowerCase() || 'jpg'
        const storagePath = `${companyId}/${Date.now()}_${file.name}`

        const { data: uploadData, error: uploadError } = await adminDb.storage
            .from('receipts')
            .upload(storagePath, file, {
                contentType: file.type,
                upsert: false
            })

        if (uploadError) {
            console.error('Storage upload error:', uploadError)
            return NextResponse.json({ error: 'Failed to upload file' }, { status: 500 })
        }

        // 4. Get public URL
        const { data: urlData } = adminDb.storage
            .from('receipts')
            .getPublicUrl(storagePath)

        const receiptUrl = urlData.publicUrl

        // 5. Return the upload result  
        // OCR will be done client-side with Tesseract.js for better performance
        return NextResponse.json({
            receiptUrl,
            storagePath,
            fileName: file.name,
            fileType: file.type
        })

    } catch (error) {
        console.error('OCR route error:', error)
        return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
    }
}
