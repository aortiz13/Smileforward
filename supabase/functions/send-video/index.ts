import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

Deno.serve(async (req) => {
    if (req.method === 'OPTIONS') {
        return new Response('ok', { headers: corsHeaders })
    }

    try {
        const { leadId, videoPath } = await req.json()

        if (!leadId || !videoPath) {
            throw new Error('leadId and videoPath are required')
        }

        // Initialize Supabase
        const supabaseUrl = Deno.env.get('SUPABASE_URL') ?? ''
        const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
        const supabase = createClient(supabaseUrl, supabaseKey)

        // Fetch Lead Details
        const { data: lead, error: leadError } = await supabase
            .from('leads')
            .select('email, name')
            .eq('id', leadId)
            .single()

        if (leadError || !lead) throw new Error('Lead not found')

        // Update lead with video path for the proxy page
        await supabase
            .from('leads')
            .update({ video_path: videoPath })
            .eq('id', leadId)

        const videoPageUrl = `https://smileforward.dentalcorbella.com/simulacion/${leadId}`

        // Send email using SMTP
        const smtpHostname = Deno.env.get('SMTP_HOSTNAME')
        const smtpUser = Deno.env.get('SMTP_USER')
        const smtpPass = Deno.env.get('SMTP_PASS')
        const smtpPort = parseInt(Deno.env.get('SMTP_PORT') || '465')

        if (!smtpHostname || !smtpUser || !smtpPass) {
            throw new Error('SMTP credentials not configured')
        }

        const { SmtpClient } = await import("https://deno.land/x/smtp@v0.7.0/mod.ts");
        const client = new SmtpClient();

        await client.connectTLS({
            hostname: smtpHostname,
            port: smtpPort,
            username: smtpUser,
            password: smtpPass,
        });

        await client.send({
            from: smtpUser,
            to: lead.email,
            subject: 'Tu Video Simulation Smile Forward está listo ✨',
            content: `Hola ${lead.name}, puedes ver tu simulación de sonrisa en el siguiente enlace: ${videoPageUrl}`,
            html: `
                <!DOCTYPE html>
                <html>
                <head>
                    <meta charset="utf-8">
                    <meta name="viewport" content="width=device-width, initial-scale=1.0">
                    <link href="https://fonts.googleapis.com/css2?family=Playfair+Display:wght@700&family=Outfit:wght@300;400;500;700&display=swap" rel="stylesheet">
                    <style>
                        body {
                            font-family: 'Outfit', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif;
                            line-height: 1.6;
                            color: #333;
                            max-width: 600px;
                            margin: 0 auto;
                            padding: 20px;
                            background-color: #ffffff;
                        }
                        .header {
                            text-align: center;
                            padding: 40px 0;
                            border-bottom: 2px solid #f0f0f0;
                        }
                        .logo {
                            font-size: 32px;
                            font-weight: 700;
                            font-family: 'Playfair Display', Georgia, serif;
                            color: #000;
                            letter-spacing: -0.5px;
                        }
                        .content {
                            padding: 50px 0;
                        }
                        h1 {
                            font-family: 'Playfair Display', Georgia, serif;
                            font-size: 28px;
                            font-weight: 700;
                            margin-bottom: 25px;
                            color: #000;
                            line-height: 1.2;
                        }
                        p {
                            margin-bottom: 20px;
                            color: #555;
                            font-size: 16px;
                        }
                        .cta-button {
                            display: inline-block;
                            padding: 18px 36px;
                            background-color: #000;
                            color: #fff !important;
                            text-decoration: none;
                            border-radius: 50px;
                            font-weight: 500;
                            margin: 30px 0;
                            font-size: 16px;
                        }
                        .footer {
                            text-align: center;
                            padding: 40px 0;
                            border-top: 2px solid #f0f0f0;
                            color: #999;
                            font-size: 14px;
                        }
                        strong {
                            color: #000;
                            font-weight: 700;
                        }
                        .video-preview {
                            width: 100%;
                            background-color: #000;
                            border-radius: 12px;
                            margin: 20px 0;
                            text-align: center;
                            padding: 40px 0;
                            color: #fff;
                        }
                    </style>
                </head>
                <body>
                    <div class="header">
                        <div class="logo">Smile Forward</div>
                    </div>
                    
                    <div class="content">
                        <h1>¡Hola${lead.name ? ` ${lead.name}` : ''}! 👋</h1>
                        
                        <p>Tu video de simulación de sonrisa ya está disponible. Ahora puedes verte en movimiento y apreciar el cambio con total naturalidad.</p>
                        
                        <div class="video-preview">
                             <div style="font-size: 48px; margin-bottom: 10px;">🎬</div>
                             <p style="color: #fff; margin: 0;">Tu simulación en video</p>
                        </div>
                        
                        <div style="text-align: center;">
                            <a href="${videoPageUrl}" class="cta-button">
                                Ver mi video ahora
                            </a>
                        </div>
                        
                        <p>Este video es una <strong>visualización dinámica</strong> de tu potencial nueva sonrisa. Recuerda que el diagnóstico clínico final se realiza en clínica.</p>
                        
                        <p style="margin-top: 30px; font-size: 14px; color: #999;">
                            Si tienes alguna pregunta sobre lo que ves en el video, estamos aquí para ayudarte.
                        </p>
                    </div>
                    
                    <div class="footer">
                        <p>Dental Corbella - Smile Forward</p>
                    </div>
                </body>
                </html>
            `
        });

        await client.close();

        return new Response(JSON.stringify({
            success: true,
            message: "Video email sent successfully"
        }), {
            headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        })

    } catch (error) {
        console.error('Edge Function Error:', error)
        return new Response(JSON.stringify({
            success: false,
            error: error.message
        }), {
            headers: { ...corsHeaders, 'Content-Type': 'application/json' },
            status: 500,
        })
    }
})
