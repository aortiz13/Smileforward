import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { hashPassword } from '@/lib/auth';
import nodemailer from 'nodemailer';
import crypto from 'crypto';

export async function POST(req: NextRequest) {
    try {
        const { email } = await req.json();

        if (!email) {
            return NextResponse.json({ error: 'Email is required' }, { status: 400 });
        }

        // Check if user exists
        const user = await db.queryOne(
            'SELECT id, email, name FROM users WHERE email = $1',
            [email]
        );

        // Always return success to prevent email enumeration
        if (!user) {
            return NextResponse.json({ success: true });
        }

        // Generate a temporary password
        const tempPassword = crypto.randomBytes(8).toString('hex');
        const passwordHash = await hashPassword(tempPassword);

        // Update the user's password
        await db.query(
            'UPDATE users SET password_hash = $1 WHERE id = $2',
            [passwordHash, user.id]
        );

        // Send the reset email
        const smtpHostname = process.env.SMTP_HOSTNAME;
        const smtpUser = process.env.SMTP_USER;
        const smtpPass = process.env.SMTP_PASS;

        if (smtpHostname && smtpUser && smtpPass) {
            const host = req.headers.get('x-forwarded-host') || req.headers.get('host');
            const protocol = req.headers.get('x-forwarded-proto') || 'https';
            const origin = `${protocol}://${host}`;

            const transporter = nodemailer.createTransport({
                host: smtpHostname,
                port: parseInt(process.env.SMTP_PORT || '465'),
                secure: true,
                auth: { user: smtpUser, pass: smtpPass },
            });

            await transporter.sendMail({
                from: process.env.SMTP_FROM || 'Smile Forward <smileforward@dentalcorbella.com>',
                to: email,
                subject: 'Smile Forward - Recuperar Contraseña',
                html: `
                    <h2>Recuperar Contraseña</h2>
                    <p>Hola ${user.name || ''},</p>
                    <p>Tu contraseña ha sido restablecida. Tu nueva contraseña temporal es:</p>
                    <p style="font-size: 18px; font-weight: bold; background: #f0f0f0; padding: 12px; border-radius: 6px; text-align: center;">${tempPassword}</p>
                    <p>Por favor, <a href="${origin}/login">inicia sesión</a> y cambia tu contraseña desde el panel de administración.</p>
                    <p><small>Si no solicitaste este cambio, contacta al administrador inmediatamente.</small></p>
                `,
            });
        }

        return NextResponse.json({ success: true });
    } catch (error: any) {
        console.error('[api/auth/reset-password] Error:', error);
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}
