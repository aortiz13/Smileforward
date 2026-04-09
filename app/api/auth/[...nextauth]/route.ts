/**
 * NextAuth.js API Route Handler
 * Handles all auth-related API requests (login, logout, session, etc.)
 */
import { handlers } from '@/lib/auth';

export const { GET, POST } = handlers;
