
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'
import { crypto } from "https://deno.land/std@0.224.0/crypto/mod.ts"
import { encodeBase64 } from "https://deno.land/std@0.224.0/encoding/base64.ts"

const corsHeaders = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

async function generateCloudinarySignature(params: Record<string, string>, apiSecret: string): Promise<string> {
    const sortedParams = Object.keys(params).sort().map(k => `${k}=${params[k]}`).join('&')
    const toSign = sortedParams + apiSecret
    const encoder = new TextEncoder()
    const hashBuffer = await crypto.subtle.digest('SHA-1', encoder.encode(toSign))
    return Array.from(new Uint8Array(hashBuffer)).map(b => b.toString(16).padStart(2, '0')).join('')
}

Deno.serve(async (req) => {
    if (req.method === 'OPTIONS') {
        return new Response('ok', { headers: corsHeaders })
    }

    try {
        const { image_path, original_public_url } = await req.json()

        console.log(`Starting background watermarking for: ${image_path}`)

        if (!image_path) {
            throw new Error('Image path is required')
        }

        // Initialize Supabase
        const supabaseUrl = Deno.env.get('SUPABASE_URL') ?? ''
        const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
        const supabase = createClient(supabaseUrl, supabaseKey)

        // 1. Download original image from Supabase
        const { data: fileData, error: downloadError } = await supabase.storage.from('generated').download(image_path)
        if (downloadError) throw new Error(`Download failed: ${downloadError.message}`)

        const arrayBuffer = await fileData.arrayBuffer()
        const uint8Array = new Uint8Array(arrayBuffer)

        // 2. Upload to Cloudinary to apply watermark
        const cloudName = Deno.env.get('CLOUDINARY_CLOUD_NAME') ?? ''
        const apiKey = Deno.env.get('CLOUDINARY_API_KEY') ?? ''
        const apiSecret = Deno.env.get('CLOUDINARY_API_SECRET') ?? ''
        const logoPublicId = Deno.env.get('CLOUDINARY_LOGO_PUBLIC_ID') ?? 'dental-corbella-logo'

        if (!cloudName || !apiKey || !apiSecret) throw new Error('Cloudinary credentials missing')

        const timestamp = Math.floor(Date.now() / 1000).toString()
        const signature = await generateCloudinarySignature({ timestamp, folder: 'smile-forward' }, apiSecret)

        const formData = new FormData()
        formData.append('file', new Blob([uint8Array], { type: 'image/jpeg' }), 'image.jpg')
        formData.append('api_key', apiKey)
        formData.append('timestamp', timestamp)
        formData.append('folder', 'smile-forward')
        formData.append('signature', signature)

        console.log('Uploading to Cloudinary...')
        const uploadRes = await fetch(`https://api.cloudinary.com/v1_1/${cloudName}/image/upload`, { method: 'POST', body: formData })

        if (!uploadRes.ok) {
            const errText = await uploadRes.text()
            throw new Error(`Cloudinary upload failed: ${errText}`)
        }

        const { public_id: publicId } = await uploadRes.json()
        console.log(`Cloudinary upload success: ${publicId}`)

        // 3. Construct Watermarked URL
        // Transformation: Overlay logo, scale to 50% width, 20% opacity, centered, -30 deg angle (optional)
        const logoId = logoPublicId.replace(/\//g, ':')
        const transformation = [`l_${logoId}`, `w_0.5`, `o_30`, `g_center`, `fl_layer_apply`].join(',')
        const watermarkedUrl = `https://res.cloudinary.com/${cloudName}/image/upload/${transformation}/${publicId}.jpg`

        console.log(`Watermarked URL generated: ${watermarkedUrl}`)

        // 4. Download the watermarked image back
        const wmRes = await fetch(watermarkedUrl)
        if (!wmRes.ok) throw new Error(`Cloudinary transform failed: ${wmRes.status}`)

        const wmBuffer = await wmRes.arrayBuffer()

        // 5. Upload Watermarked version to Supabase
        const watermarkedPath = image_path.replace('.jpg', '_watermarked.jpg')

        const { error: uploadError } = await supabase.storage.from('generated').upload(watermarkedPath, wmBuffer, {
            contentType: 'image/jpeg',
            upsert: true
        });

        if (uploadError) throw new Error(`Failed to save watermarked image: ${uploadError.message}`)

        console.log(`Watermarked image saved to Supabase: ${watermarkedPath}`)

        // 6. Cleanup Cloudinary (Async - don't wait strictly)
        const delTs = Math.floor(Date.now() / 1000).toString()
        const delSig = await generateCloudinarySignature({ public_id: publicId, timestamp: delTs }, apiSecret)
        fetch(`https://api.cloudinary.com/v1_1/${cloudName}/image/destroy`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ public_id: publicId, api_key: apiKey, timestamp: delTs, signature: delSig })
        }).catch(err => console.error('Cleanup error:', err))

        return new Response(JSON.stringify({ success: true, path: watermarkedPath }), {
            headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        })

    } catch (error) {
        console.error("Watermark Function Error:", error)
        return new Response(JSON.stringify({ success: false, error: error.message }), {
            headers: { ...corsHeaders, 'Content-Type': 'application/json' },
            status: 500,
        })
    }
})
