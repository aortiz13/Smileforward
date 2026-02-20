import { createClient } from '@supabase/supabase-js'
import { NextRequest, NextResponse } from 'next/server'

const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
)

export async function GET(
    req: NextRequest,
    { params }: { params: Promise<{ id: string }> }
) {
    const { id } = await params
    const { data: lead, error } = await supabase
        .from('leads')
        .select('video_path')
        .eq('id', id)
        .single()

    if (error || !lead?.video_path) {
        return new NextResponse('Video no encontrado', { status: 404 })
    }

    // URL firmada — solo 60 segundos, uso interno, nunca llega al cliente
    const { data: signed, error: signError } = await supabase.storage
        .from('generated')
        .createSignedUrl(lead.video_path, 60)

    if (signError || !signed?.signedUrl) {
        console.error('Error generando URL firmada:', signError)
        return new NextResponse('Error generando el video', { status: 500 })
    }

    // Proxy: descarga el video de Supabase y lo retransmite al navegador
    // El header Range permite adelantar/retroceder el video
    const videoResponse = await fetch(signed.signedUrl, {
        headers: {
            Range: req.headers.get('range') ?? 'bytes=0-',
        },
    })

    // Transmitir headers relevantes para video
    const headers = new Headers()
    headers.set('Content-Type', videoResponse.headers.get('Content-Type') ?? 'video/mp4')
    headers.set('Accept-Ranges', 'bytes')
    headers.set('Cache-Control', 'no-store')

    const contentLength = videoResponse.headers.get('Content-Length')
    if (contentLength) headers.set('Content-Length', contentLength)

    const contentRange = videoResponse.headers.get('Content-Range')
    if (contentRange) headers.set('Content-Range', contentRange)

    return new NextResponse(videoResponse.body, {
        status: videoResponse.status,
        headers: headers,
    })
}
