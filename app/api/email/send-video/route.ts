/**
 * API Route: Send Video Email
 * Converted from Supabase Edge Function: send-video
 * 
 * Sends the generated video to the lead via email using SMTP.
 */
import { NextRequest, NextResponse } from 'next/server';
import nodemailer from 'nodemailer';
import { db } from '@/lib/db';
import { storage } from '@/lib/storage';

const corsHeaders = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
    'Access-Control-Allow-Methods': 'POST, OPTIONS',
};

export async function OPTIONS() {
    return new NextResponse('ok', { headers: corsHeaders, status: 200 });
}

export async function POST(req: NextRequest) {
    try {
        const { leadId, videoPath } = await req.json();

        if (!leadId || !videoPath) {
            throw new Error('leadId and videoPath are required');
        }

        // 1. Get lead info
        const lead = await db.queryOne(
            'SELECT email, name FROM leads WHERE id = $1',
            [leadId]
        );

        if (!lead?.email) throw new Error('Lead not found or no email');

        // 2. Download video from storage
        const videoBuffer = await storage.downloadFileAsBuffer('generated', videoPath);

        // 3. Configure SMTP
        const transporter = nodemailer.createTransport({
            host: process.env.SMTP_HOSTNAME,
            port: parseInt(process.env.SMTP_PORT || '465'),
            secure: true,
            auth: {
                user: process.env.SMTP_USER,
                pass: process.env.SMTP_PASS,
            },
        });

        // 4. Send email
        await transporter.sendMail({
            from: process.env.SMTP_FROM || 'Smile Forward <noreply@brandboost-ai.com>',
            to: lead.email,
            subject: 'Tu Video Sonrisa Smile Forward está listo 🎬✨',
            text: 'Tu video personalizado está adjunto.',
            html: getVideoEmailTemplate(lead.name),
            attachments: [
                {
                    filename: 'smile-forward-video.mp4',
                    content: videoBuffer,
                    contentType: 'video/mp4',
                }
            ],
        });

        // 5. Update lead
        await db.query(
            `UPDATE leads SET video_path = $1 WHERE id = $2`,
            [videoPath, leadId]
        );

        // 6. Log
        await db.query(
            `INSERT INTO audit_logs (action, details) VALUES ($1, $2)`,
            ['VIDEO_EMAIL_SENT', JSON.stringify({ leadId, email: lead.email })]
        );

        return NextResponse.json(
            { success: true, message: 'Video email sent successfully' },
            { headers: corsHeaders }
        );

    } catch (error: any) {
        console.error('[send-video] Error:', error);
        return NextResponse.json(
            { success: false, error: error.message },
            { headers: corsHeaders, status: 500 }
        );
    }
}

function getVideoEmailTemplate(name: string | null): string {
    return `<!DOCTYPE html>
<html>
<head>
    <meta charset="utf-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <link href="https://fonts.googleapis.com/css2?family=Playfair+Display:wght@700&family=Outfit:wght@300;400;500;700&display=swap" rel="stylesheet">
</head>
<body style="font-family: 'Outfit', sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; background: #fff;">
    <div style="text-align: center; padding: 40px 0; border-bottom: 2px solid #f0f0f0;">
        <div style="font-size: 32px; font-weight: 700; font-family: 'Playfair Display', serif;">Smile Forward</div>
    </div>
    <div style="padding: 50px 0;">
        <h1 style="font-family: 'Playfair Display', serif; font-size: 28px;">¡Hola${name ? ` ${name}` : ''}! 🎬</h1>
        <p style="color: #555; font-size: 16px;">Tu video personalizado de Smile Forward está listo. Adjuntamos tu video para que puedas verlo con todo detalle.</p>
        <p style="color: #555; font-size: 16px;">Este video te muestra cómo podrías verte sonriendo en diferentes situaciones reales.</p>
        <div style="text-align: center; margin: 30px 0;">
            <a href="https://dentalcorbella.com/contacto/" style="display: inline-block; padding: 18px 36px; background: #000; color: #fff; text-decoration: none; border-radius: 50px; font-weight: 500; font-size: 16px;">
                Reserva tu cita
            </a>
        </div>
    </div>
    <div style="text-align: center; padding: 40px 0; border-top: 2px solid #f0f0f0; color: #999; font-size: 14px;">
        <p>Dental Corbella - Smile Forward</p>
    </div>
</body>
</html>`;
}
