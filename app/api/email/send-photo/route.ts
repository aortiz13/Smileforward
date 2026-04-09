/**
 * API Route: Send Photo Email
 * Converted from Supabase Edge Function: send-photo-email
 * 
 * Downloads a generated smile image, and emails it to the lead.
 */
import { NextRequest, NextResponse } from 'next/server';
import nodemailer from 'nodemailer';
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
        const { email, name, imageUrl, leadId } = await req.json();

        if (!email || !imageUrl) {
            throw new Error('Email and imageUrl are required');
        }

        // Download image — try watermarked version first, fallback to original
        // Extract path after bucket name (handles full URLs and relative paths)
        let imagePath = imageUrl;
        const generatedIdx = imageUrl.indexOf('/generated/');
        if (generatedIdx !== -1) {
            imagePath = imageUrl.substring(generatedIdx + '/generated/'.length);
        }
        const watermarkedPath = imagePath.replace(/\.(jpg|png)$/i, '_watermarked.jpg');

        let imageBuffer: Buffer;

        try {
            console.log(`Attempting watermarked: ${watermarkedPath}`);
            imageBuffer = await storage.downloadFileAsBuffer('generated', watermarkedPath);
        } catch {
            console.log(`Watermarked not found, falling back to original: ${imagePath}`);
            try {
                imageBuffer = await storage.downloadFileAsBuffer('generated', imagePath);
            } catch (dlError: any) {
                throw new Error(`Failed to download image: ${dlError.message}`);
            }
        }

        const imageBase64 = imageBuffer.toString('base64');

        // Configure SMTP
        const transporter = nodemailer.createTransport({
            host: process.env.SMTP_HOSTNAME,
            port: parseInt(process.env.SMTP_PORT || '465'),
            secure: true,
            auth: {
                user: process.env.SMTP_USER,
                pass: process.env.SMTP_PASS,
            },
        });

        // Send email
        await transporter.sendMail({
            from: process.env.SMTP_FROM || 'Smile Forward <smileforward@dentalcorbella.com>',
            to: email,
            subject: 'Tu Simulación Smile Forward está lista ✨',
            text: 'Please see attached simulation.',
            html: getPhotoEmailTemplate(name),
            attachments: [
                {
                    filename: 'smile-forward-simulation.jpg',
                    content: imageBase64,
                    encoding: 'base64',
                }
            ],
        });

        return NextResponse.json(
            { success: true, message: 'Email sent successfully via SMTP' },
            { headers: corsHeaders }
        );

    } catch (error: any) {
        console.error('[send-photo-email] Error:', error);
        return NextResponse.json(
            { success: false, error: error.message },
            { headers: corsHeaders, status: 500 }
        );
    }
}

function getPhotoEmailTemplate(name: string | null): string {
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
        <h1 style="font-family: 'Playfair Display', serif; font-size: 28px;">¡Hola${name ? ` ${name}` : ''}! 👋</h1>
        <p style="color: #555;">Tu simulación de sonrisa está lista. Adjuntamos tu imagen en alta calidad para que puedas verla con todo detalle.</p>
        <p style="color: #555;">Esta es una <strong style="color: #000;">simulación orientativa</strong> de cómo podría verse tu sonrisa después del tratamiento.</p>
        <div style="background: #f8f9fa; padding: 20px; border-radius: 8px; margin: 25px 0;">
            <p style="margin: 0; color: #000;"><strong>¿Quieres ver cómo te verías en movimiento?</strong></p>
            <p style="margin: 10px 0 0; color: #666;">Una imagen da una idea, pero donde realmente se entiende el cambio es al verte hablar, reír y expresarte en situaciones reales.</p>
        </div>
        <div style="text-align: center;">
            <a href="https://dentalcorbella.com/contacto/" style="display: inline-block; padding: 18px 36px; background: #000; color: #fff; text-decoration: none; border-radius: 50px; font-weight: 500; font-size: 16px;">
                Reserva tu cita y vete en video
            </a>
        </div>
    </div>
    <div style="text-align: center; padding: 40px 0; border-top: 2px solid #f0f0f0; color: #999; font-size: 14px;">
        <p>Dental Corbella - Smile Forward</p>
    </div>
</body>
</html>`;
}
