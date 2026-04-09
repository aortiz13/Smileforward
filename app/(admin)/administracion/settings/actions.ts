'use server'

import { db } from '@/lib/db'
import { requireAuth } from '@/lib/auth/session'
import { hashPassword } from '@/lib/auth'
import { revalidatePath } from 'next/cache'
import { headers } from 'next/headers'
import nodemailer from 'nodemailer'

export async function inviteUser(formData: FormData) {
    try {
        // 1. Verify current user is admin
        const currentUser = await requireAuth('admin');

        // 2. Get form data
        const email = formData.get('email') as string
        const role = formData.get('role') as 'admin' | 'basic'

        if (!email || !role) {
            return { error: 'Email and role are required' }
        }

        // 3. Check if user already exists
        const existingUser = await db.queryOne(
            'SELECT id FROM users WHERE email = $1',
            [email]
        );

        if (existingUser) {
            // Update role if user exists
            await db.query(
                `INSERT INTO user_roles (user_id, role) VALUES ($1, $2)
                 ON CONFLICT (user_id) DO UPDATE SET role = $2`,
                [existingUser.id, role]
            );
            revalidatePath('/administracion/settings');
            return { success: true, message: `Rol actualizado para ${email}` };
        }

        // 4. Create new user with temporary password
        const tempPassword = crypto.randomUUID().slice(0, 12);
        const passwordHash = await hashPassword(tempPassword);

        const newUser = await db.insertReturning(
            `INSERT INTO users (email, password_hash, name) 
             VALUES ($1, $2, $3) RETURNING id`,
            [email, passwordHash, email.split('@')[0]]
        );

        // 5. Assign role
        await db.query(
            `INSERT INTO user_roles (user_id, role) VALUES ($1, $2)`,
            [newUser.id, role]
        );

        // 6. Send invitation email
        const smtpHostname = process.env.SMTP_HOSTNAME;
        const smtpUser = process.env.SMTP_USER;
        const smtpPass = process.env.SMTP_PASS;

        if (smtpHostname && smtpUser && smtpPass) {
            const host = (await headers()).get('x-forwarded-host') || (await headers()).get('host');
            const protocol = (await headers()).get('x-forwarded-proto') || 'https';
            const origin = `${protocol}://${host}`;

            const transporter = nodemailer.createTransport({
                host: smtpHostname,
                port: parseInt(process.env.SMTP_PORT || '465'),
                secure: true,
                auth: { user: smtpUser, pass: smtpPass },
            });

            await transporter.sendMail({
                from: smtpUser,
                to: email,
                subject: 'Invitación a Smile Forward - Panel de Administración',
                html: `
                    <h2>Has sido invitado a Smile Forward</h2>
                    <p>Tu cuenta ha sido creada con el rol de <strong>${role}</strong>.</p>
                    <p><strong>Credenciales temporales:</strong></p>
                    <ul>
                        <li>Email: ${email}</li>
                        <li>Contraseña: ${tempPassword}</li>
                    </ul>
                    <p><a href="${origin}/login">Iniciar sesión</a></p>
                    <p><small>Por favor, cambia tu contraseña después de iniciar sesión.</small></p>
                `,
            });
        }

        revalidatePath('/administracion/settings');
        return { success: true, message: `Invitación enviada a ${email} como ${role}` }

    } catch (error: any) {
        console.error('inviteUser error:', error);
        return { error: error.message || 'Error al invitar usuario' }
    }
}
