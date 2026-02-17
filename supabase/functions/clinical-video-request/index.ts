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
        const { email, name, leadId } = await req.json()

        if (!email) {
            throw new Error('Email is required')
        }

        // Send email using Resend
        const resendApiKey = Deno.env.get('RESEND_API_KEY')
        if (!resendApiKey) {
            throw new Error('RESEND_API_KEY not configured')
        }

        const emailResponse = await fetch('https://api.resend.com/emails', {
            method: 'POST',
            headers: {
                'Authorization': `Bearer ${resendApiKey}`,
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({
                from: 'Smile Forward <noreply@brandboost-ai.com>',
                to: [email],
                subject: 'Confirmación de solicitud de video en consulta - Dental Corbella',
                html: `
                    <!DOCTYPE html>
                    <html>
                    <head>
                        <meta charset="utf-8">
                        <meta name="viewport" content="width=device-width, initial-scale=1.0">
                        <style>
                            body {
                                font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif;
                                line-height: 1.6;
                                color: #333;
                                max-width: 600px;
                                margin: 0 auto;
                                padding: 20px;
                            }
                            .header {
                                text-align: center;
                                padding: 30px 0;
                                border-bottom: 2px solid #f0f0f0;
                            }
                            .logo {
                                font-size: 28px;
                                font-weight: 300;
                                font-family: Georgia, serif;
                                color: #000;
                            }
                            .content {
                                padding: 40px 0;
                            }
                            p {
                                margin-bottom: 20px;
                                color: #444;
                            }
                            .footer {
                                text-align: center;
                                padding: 30px 0;
                                border-top: 2px solid #f0f0f0;
                                color: #999;
                                font-size: 14px;
                            }
                        </style>
                    </head>
                    <body>
                        <div class="header">
                            <div class="logo">Smile Forward</div>
                        </div>
                        
                        <div class="content">
                            <p>Estimado/a ${name || ''},</p>
                            
                            <p>Le agradecemos que haya solicitado su video en consulta. Hemos recibido correctamente su petición y en breve nuestro equipo se pondrá en contacto con usted para gestionar y confirmar la fecha y hora de su visita.</p>
                            
                            <p>Le recordamos que esta primera cita es totalmente gratuita. Durante la visita podrá visualizar su video generado por Smile Forward, donde conocerá una simulación personalizada de su futura sonrisa.</p>
                            
                            <p>Si desea añadir alguna información adicional, puede responder a este correo o llamarnos directamente.</p>
                            
                            <p>Gracias por confiar en nosotros.</p>
                            
                            <p>Atentamente,<br><strong>Equipo de Atención al Paciente Dental Corbella</strong></p>
                        </div>
                        
                        <div class="footer">
                            <p>Dental Corbella - Smile Forward</p>
                        </div>
                    </body>
                    </html>
                `,
            })
        })

        if (!emailResponse.ok) {
            const errorText = await emailResponse.text()
            console.error('Resend API error:', errorText)
            throw new Error(`Failed to send email: ${errorText}`)
        }

        return new Response(JSON.stringify({
            success: true,
            message: "Email sent successfully"
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
