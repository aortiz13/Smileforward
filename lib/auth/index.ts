/**
 * NextAuth.js Configuration
 * Replaces Supabase Auth with a self-hosted authentication system.
 * 
 * Features:
 * - Email/password login (CredentialsProvider)
 * - Session management via JWT
 * - RBAC integration with user_roles table
 */
import NextAuth from 'next-auth';
import CredentialsProvider from 'next-auth/providers/credentials';
import { db } from '@/lib/db';
import crypto from 'crypto';

/**
 * Hash a password using scrypt (Node.js built-in, no bcrypt needed).
 */
export async function hashPassword(password: string): Promise<string> {
    return new Promise((resolve, reject) => {
        const salt = crypto.randomBytes(16).toString('hex');
        crypto.scrypt(password, salt, 64, (err, derivedKey) => {
            if (err) reject(err);
            resolve(`${salt}:${derivedKey.toString('hex')}`);
        });
    });
}

/**
 * Verify a password against a stored hash.
 */
export async function verifyPassword(password: string, hash: string): Promise<boolean> {
    return new Promise((resolve, reject) => {
        const [salt, key] = hash.split(':');
        crypto.scrypt(password, salt, 64, (err, derivedKey) => {
            if (err) reject(err);
            resolve(key === derivedKey.toString('hex'));
        });
    });
}

export const { handlers, signIn, signOut, auth } = NextAuth({
    providers: [
        CredentialsProvider({
            name: 'Email',
            credentials: {
                email: { label: 'Email', type: 'email' },
                password: { label: 'Password', type: 'password' },
            },
            async authorize(credentials) {
                if (!credentials?.email || !credentials?.password) {
                    return null;
                }

                const email = credentials.email as string;
                const password = credentials.password as string;

                // Query user from database
                const user = await db.queryOne(
                    'SELECT id, email, password_hash, name FROM users WHERE email = $1',
                    [email]
                );

                if (!user) {
                    return null;
                }

                // Verify password
                const isValid = await verifyPassword(password, user.password_hash);
                if (!isValid) {
                    return null;
                }

                return {
                    id: user.id,
                    email: user.email,
                    name: user.name,
                };
            },
        }),
    ],
    session: {
        strategy: 'jwt',
        maxAge: 30 * 24 * 60 * 60, // 30 days
    },
    pages: {
        signIn: '/login',
        error: '/login',
    },
    callbacks: {
        async jwt({ token, user }) {
            if (user) {
                token.id = user.id;
                // Fetch role
                const roleData = await db.queryOne(
                    'SELECT role FROM user_roles WHERE user_id = $1',
                    [user.id]
                );
                token.role = roleData?.role || 'basic';
            }
            return token;
        },
        async session({ session, token }) {
            if (session.user) {
                session.user.id = token.id as string;
                (session.user as any).role = token.role as string;
            }
            return session;
        },
    },
    trustHost: true,
});
