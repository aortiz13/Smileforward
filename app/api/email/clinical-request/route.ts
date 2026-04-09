/**
 * API Route: Clinical Video Request
 * Converted from Supabase Edge Function: clinical-video-request
 * 
 * Sends a notification email to the clinic when a lead requests a video.
 */
import { NextRequest, NextResponse } from 'next/server';
import nodemailer from 'nodemailer';

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
        const {
            leadId,
            leadName,
            leadEmail,
            leadPhone,
            selectedScenarios,
            generatedImageUrl,
        } = await req.json();

        if (!leadId || !leadName || !leadEmail) {
            throw new Error('leadId, leadName, and leadEmail are required');
        }

        const clinicEmail = process.env.CLINIC_NOTIFICATION_EMAIL || process.env.SMTP_USER;

        const transporter = nodemailer.createTransport({
            host: process.env.SMTP_HOSTNAME,
            port: parseInt(process.env.SMTP_PORT || '465'),
            secure: true,
            auth: {
                user: process.env.SMTP_USER,
                pass: process.env.SMTP_PASS,
            },
        });

        const scenariosText = selectedScenarios?.length > 0
            ? selectedScenarios.map((s: string) => `• ${s}`).join('\n')
            : 'Automático';

        await transporter.sendMail({
            from: process.env.SMTP_FROM || 'Smile Forward <smileforward@dentalcorbella.com>',
            to: clinicEmail,
            subject: `🎬 Nueva solicitud de video - ${leadName}`,
            html: `
                <h2>Nueva Solicitud de Video Clínico</h2>
                <p><strong>Paciente:</strong> ${leadName}</p>
                <p><strong>Email:</strong> ${leadEmail}</p>
                <p><strong>Teléfono:</strong> ${leadPhone || 'No proporcionado'}</p>
                <p><strong>Escenarios solicitados:</strong></p>
                <pre>${scenariosText}</pre>
                ${generatedImageUrl ? `<p><strong>Imagen generada:</strong> <a href="${generatedImageUrl}">Ver imagen</a></p>` : ''}
                <hr>
                <p><small>Este email fue generado automáticamente por Smile Forward.</small></p>
            `,
        });

        return NextResponse.json(
            { success: true, message: 'Clinical video request sent' },
            { headers: corsHeaders }
        );

    } catch (error: any) {
        console.error('[clinical-video-request] Error:', error);
        return NextResponse.json(
            { success: false, error: error.message },
            { headers: corsHeaders, status: 500 }
        );
    }
}
