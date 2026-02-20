import { createClient } from '@supabase/supabase-js'
import { notFound } from 'next/navigation'

const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
)

export default async function SimulacionPage({
    params,
}: {
    params: Promise<{ id: string }>
}) {
    const { id } = await params
    const { data: lead, error } = await supabase
        .from('leads')
        .select('name, video_path')
        .eq('id', id)
        .single()

    if (error || !lead?.video_path) return notFound()

    // Apunta al route handler — nunca a Supabase directamente
    const videoSrc = `/api/video/${id}`

    return (
        <main
            style={{
                minHeight: '100vh',
                backgroundColor: '#000',
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                justifyContent: 'center',
                padding: '20px',
                fontFamily: 'Inter, system-ui, sans-serif',
            }}
        >
            <div style={{ textAlign: 'center', maxWidth: '640px', width: '100%' }}>
                <h1 style={{
                    color: '#fff',
                    fontSize: '32px',
                    fontWeight: '700',
                    marginBottom: '8px',
                    letterSpacing: '-0.5px'
                }}>
                    Smile Forward
                </h1>
                {lead.name && (
                    <p style={{ color: '#888', marginBottom: '32px', fontSize: '18px' }}>
                        Tu simulación personalizada, {lead.name}
                    </p>
                )}

                <div style={{
                    position: 'relative',
                    width: '100%',
                    borderRadius: '24px',
                    overflow: 'hidden',
                    boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.5)',
                    backgroundColor: '#111',
                    aspectRatio: '9/16'
                }}>
                    <video
                        controls
                        autoPlay
                        playsInline
                        loop
                        style={{ width: '100%', height: '100%', objectFit: 'cover' }}
                        src={videoSrc}
                    />
                </div>

                <div style={{ marginTop: '40px' }}>
                    <a
                        href="mailto:contacto@dentalcorbella.com?subject=Reserva%20de%20cita%20Smile%20Forward"
                        style={{
                            display: 'inline-block',
                            padding: '18px 40px',
                            backgroundColor: '#fff',
                            color: '#000',
                            textDecoration: 'none',
                            borderRadius: '50px',
                            fontWeight: '700',
                            fontSize: '16px',
                            transition: 'transform 0.2s ease',
                        }}
                    >
                        Reservar mi cita →
                    </a>
                    <p style={{ color: '#555', marginTop: '20px', fontSize: '14px' }}>
                        © {new Date().getFullYear()} Dental Corbella
                    </p>
                </div>
            </div>
        </main>
    )
}
