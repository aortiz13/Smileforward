// app/simulacion/[id]/page.tsx
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

    const videoSrc = `/api/video/${id}`

    return (
        <>
            <style>{`
        * {
          box-sizing: border-box;
          margin: 0;
          padding: 0;
        }

        body {
          background-color: #000;
        }

        .page {
          min-height: 100vh;
          background-color: #000;
          display: flex;
          flex-direction: column;
          align-items: center;
          justify-content: center;
          padding: 24px 16px;
          font-family: Georgia, serif;
          gap: 20px;
        }

        .header {
          text-align: center;
        }

        .logo {
          color: #fff;
          font-size: clamp(22px, 4vw, 32px);
          font-weight: 700;
          letter-spacing: -0.5px;
          margin-bottom: 6px;
        }

        .subtitle {
          color: #aaa;
          font-size: clamp(13px, 2vw, 15px);
          font-family: sans-serif;
        }

        .video-wrapper {
          width: 100%;
          max-width: 900px;
          height: 70vh;
        }

        .video-wrapper video {
          width: 100%;
          height: 100%;
          object-fit: contain;
          border-radius: 12px;
          background-color: #111;
          display: block;
        }

        .cta-button {
          display: inline-block;
          padding: 16px 40px;
          background-color: #fff;
          color: #000;
          text-decoration: none;
          border-radius: 50px;
          font-weight: bold;
          font-size: clamp(14px, 2vw, 16px);
          font-family: sans-serif;
          transition: background-color 0.2s, color 0.2s;
          white-space: nowrap;
        }

        .cta-button:hover {
          background-color: #e0e0e0;
        }

        @media (max-width: 600px) {
          .page {
            padding: 20px 12px;
            gap: 16px;
          }

          .video-wrapper {
            height: 70vh;
            width: 100%;
          }

          .cta-button {
            width: 100%;
            text-align: center;
          }
        }
      `}</style>

            <main className="page">
                <div className="header">
                    <h1 className="logo">Smile Forward</h1>
                    {lead.name && (
                        <p className="subtitle">Simulación de {lead.name}</p>
                    )}
                </div>

                <div className="video-wrapper">
                    <video
                        controls
                        autoPlay
                        playsInline
                        src={videoSrc}
                    />
                </div>


                <a
                    href="https://dentalcorbella.com/contacto"
                    className="cta-button"
                >
                    Reservar mi cita →
                </a>
            </main >
        </>
    )
}