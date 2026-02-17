import { type NextRequest, NextResponse } from 'next/server'
import { updateSession } from './lib/supabase/middleware'

export default async function middleware(request: NextRequest) {
    // 1. Update Supabase Auth Session
    const supabaseResponse = await updateSession(request)

    // 2. Path & Hostname Prep
    const url = request.nextUrl
    const path = url.pathname
    const searchParams = url.searchParams.toString()
    const fullPath = `${path}${searchParams.length > 0 ? `?${searchParams}` : ''}`

    // Ignore internal nextjs paths and static files
    // Refined to catch common file extensions instead of any dot
    const isStaticFile = /\.(png|jpg|jpeg|gif|webp|svg|ico|css|js|mjs|txt|xml|json)$/.test(path)
    if (path.startsWith('/_next') || isStaticFile || path.startsWith('/api') || path.startsWith('/auth') || path.startsWith('/admin')) {
        return supabaseResponse
    }

    let hostname = request.headers.get('host') || ''
    const rootDomain = process.env.NEXT_PUBLIC_ROOT_DOMAIN || 'localhost:3000'

    // Local Development Normalization
    if (process.env.NODE_ENV === 'development') {
        // If it's blukastor.localhost:3000 -> hostname becomes blukastor
        if (hostname.endsWith('.localhost:3000')) {
            hostname = hostname.replace('.localhost:3000', '')
        } else if (hostname === 'localhost:3000' || hostname === '127.0.0.1:3000') {
            hostname = rootDomain.split(':')[0] // Use first part of rootDomain
        }
    } else {
        // Production logic
        if (hostname.endsWith(`.${rootDomain}`)) {
            hostname = hostname.replace(`.${rootDomain}`, '')
        }
    }

    // 3. Prevent Infinite Loops
    if (path.startsWith(`/${hostname}`)) {
        return supabaseResponse
    }

    let rewriteUrl: URL | null = null;

    // A. Root/Main Domain Logic (Landing Page vs Admin)
    const normalizedRoot = rootDomain.split(':')[0]
    if (hostname === rootDomain || hostname === normalizedRoot) {
        // If they visit /dashboard or /login on the root domain, let them pass through
        if (path === '/dashboard' || path === '/login') {
            return supabaseResponse
        }
        return supabaseResponse
    }

    // B. Admin/App Subdomain Logic (admin.root.com or app.root.com)
    if (hostname === `admin.${rootDomain}` || hostname === `app.${rootDomain}` || hostname === `admin.${normalizedRoot}` || hostname === `app.${normalizedRoot}`) {
        rewriteUrl = new URL(`${path === '/' ? '/dashboard' : path}`, request.url)
    }
    // C. Tenant Logic (anything else)
    else {
        // Rewrite to the (portal) group -> app/[domain]/...
        rewriteUrl = new URL(`/${hostname}${fullPath}`, request.url)
    }

    if (rewriteUrl) {
        const rewriteResponse = NextResponse.rewrite(rewriteUrl, {
            request: {
                headers: request.headers,
            }
        })
        supabaseResponse.headers.forEach((value, key) => {
            rewriteResponse.headers.set(key, value)
        })
        return rewriteResponse
    }

    return supabaseResponse
}

export const config = {
    matcher: [
        '/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp|css|js|mjs|json)$).*)',
    ],
}
