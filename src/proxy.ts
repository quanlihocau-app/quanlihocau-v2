import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'

import { classifyAuthCookies } from '@/lib/stale-auth-cookie'

const COOKIE_NAME = 'qa_session'

// Danh sách các route bảo vệ yêu cầu đăng nhập
const protectedPrefixes = [
  '/dashboard',
  '/sessions',
  '/facilities',
  '/reports',
  '/inventory',
  '/settings',
  '/pricing',
  '/fish-types',
  '/fish-buybacks',
  '/customers',
  '/expenses',
  '/cashbook',
  '/invoices',
  '/admin',
]

// Pattern nhận diện các công cụ scan lỗ hổng tự động và malicious bots
const BAD_BOT_PATTERN = /(sqlmap|nikto|wpscan|masscan|zgrab|acunetix|nessus|nmap|havij|morfeus|dirbuster)/i

// In-Memory Rate Limiter cho Edge/Node.js Middleware
interface RateLimitBucket {
  count: number
  resetTime: number
}

const rateLimitMap = new Map<string, RateLimitBucket>()
let lastCleanup = Date.now()

function checkRateLimit(ip: string, isAuthRoute: boolean): { allowed: boolean; retryAfter: number; remaining: number; limit: number } {
  const now = Date.now()
  const windowMs = 60 * 1000 // Cửa sổ trượt 1 phút

  // Tự động dọn dẹp các IP đã hết hạn sau mỗi 2 phút để chống memory leak
  if (now - lastCleanup > 120 * 1000) {
    lastCleanup = now
    for (const [key, bucket] of rateLimitMap.entries()) {
      if (now > bucket.resetTime) {
        rateLimitMap.delete(key)
      }
    }
  }

  // Cấu hình ngưỡng giới hạn
  const isLoopback = ip === '127.0.0.1' || ip === '::1' || ip.startsWith('192.168.') || process.env.NODE_ENV === 'test'
  const limit = isLoopback ? 1000 : isAuthRoute ? 25 : 120
  const bucketKey = `${ip}:${isAuthRoute ? 'auth' : 'api'}`

  const current = rateLimitMap.get(bucketKey)

  if (!current || now > current.resetTime) {
    rateLimitMap.set(bucketKey, { count: 1, resetTime: now + windowMs })
    return { allowed: true, retryAfter: 0, remaining: limit - 1, limit }
  }

  if (current.count >= limit) {
    const retryAfter = Math.max(1, Math.ceil((current.resetTime - now) / 1000))
    return { allowed: false, retryAfter, remaining: 0, limit }
  }

  current.count += 1
  return { allowed: true, retryAfter: 0, remaining: limit - current.count, limit }
}

function applySecurityHeaders(response: NextResponse): NextResponse {
  response.headers.set('X-Content-Type-Options', 'nosniff')
  response.headers.set('X-Frame-Options', 'SAMEORIGIN')
  response.headers.set('Referrer-Policy', 'strict-origin-when-cross-origin')
  response.headers.set('Permissions-Policy', 'camera=(), microphone=(), geolocation=()')
  return response
}

function nextWithMeta(request: NextRequest, requestHeaders?: Headers): NextResponse {
  const headers = requestHeaders ?? new Headers(request.headers)
  headers.set('x-ql-method', request.method)
  headers.set('x-ql-pathname', request.nextUrl.pathname)
  return applySecurityHeaders(NextResponse.next({ request: { headers } }))
}

function stripCookieHeader(request: NextRequest, stale: string[]): Headers {
  const headers = new Headers(request.headers)
  if (stale.length === 0) return headers
  const drop = new Set(stale)
  const kept = (request.headers.get('cookie') ?? '')
    .split(';')
    .map((part) => part.trim())
    .filter((part) => {
      if (!part) return false
      const name = part.split('=')[0]?.trim() ?? ''
      return !drop.has(name)
    })
  if (kept.length === 0) headers.delete('cookie')
  else headers.set('cookie', kept.join('; '))
  return headers
}

function expireStaleCookies(response: NextResponse, stale: string[]): void {
  for (const name of stale) {
    const secure = name.startsWith('__Secure-') || name.startsWith('__Host-') || process.env.NODE_ENV === 'production'
    response.cookies.set(name, '', {
      httpOnly: true,
      path: '/',
      maxAge: 0,
      sameSite: 'lax',
      secure,
    })
  }
}

export async function proxy(request: NextRequest) {
  const { pathname } = request.nextUrl
  const userAgent = request.headers.get('user-agent') || ''

  // 1. Chặn các scanner/bot độc hại tấn công thăm dò
  if (BAD_BOT_PATTERN.test(userAgent)) {
    return new NextResponse(JSON.stringify({ error: 'Access denied: Malicious automated agent detected' }), {
      status: 403,
      headers: { 'Content-Type': 'application/json' },
    })
  }

  // 2. Rate Limiting cho API routes
  if (pathname.startsWith('/api')) {
    // Miễn áp dụng rate limit cho Webhook thanh toán và Health check ping
    const isExempt = pathname.startsWith('/api/webhooks') || pathname === '/api/ping'
    
    if (!isExempt) {
      const forwardedFor = request.headers.get('x-forwarded-for')
      const ip = (forwardedFor ? forwardedFor.split(',')[0].trim() : request.headers.get('x-real-ip')) || '127.0.0.1'
      const isAuthRoute = pathname.startsWith('/api/auth') || pathname === '/api/register'

      const rateCheck = checkRateLimit(ip, isAuthRoute)

      if (!rateCheck.allowed) {
        const response = new NextResponse(
          JSON.stringify({
            error: 'Too many requests. Vui lòng thử lại sau giây lát để đảm bảo an toàn hệ thống.',
            code: 'RATE_LIMIT_EXCEEDED',
          }),
          {
            status: 429,
            headers: {
              'Content-Type': 'application/json',
              'Retry-After': String(rateCheck.retryAfter),
              'X-RateLimit-Limit': String(rateCheck.limit),
              'X-RateLimit-Remaining': '0',
            },
          }
        )
        return applySecurityHeaders(response)
      }
    }

    return nextWithMeta(request)
  }

  // 3. Cookie phiên không giải mã được (ví dụ sau khi xoay NEXTAUTH_SECRET)
  //    bị xóa và bỏ qua. Request hiện tại không còn thấy cookie hỏng, nên
  //    trang đăng nhập hiện ra thay vì 500 / vòng lặp.
  let stale: string[] = []
  let authenticated = false
  try {
    const classified = await classifyAuthCookies(request)
    stale = classified.stale
    authenticated = classified.authenticated
  } catch (error) {
    console.error('[auth] session cookie check failed:', error instanceof Error ? error.name : 'unknown')
    authenticated = Boolean(
      request.cookies.get(COOKIE_NAME)?.value ||
      request.cookies.get('next-auth.session-token')?.value ||
      request.cookies.get('__Secure-next-auth.session-token')?.value,
    )
  }
  const forwardedHeaders = stripCookieHeader(request, stale)

  // 4. Kiểm tra xem request có thuộc route được bảo vệ không
  const isProtected = protectedPrefixes.some((prefix) => pathname.startsWith(prefix))

  if (!isProtected) {
    const response = nextWithMeta(request, forwardedHeaders)
    expireStaleCookies(response, stale)
    return response
  }

  if (authenticated) {
    const response = nextWithMeta(request, forwardedHeaders)
    expireStaleCookies(response, stale)
    return response
  }

  // Nếu chưa đăng nhập, điều hướng sang /login kèm param redirect
  const loginUrl = new URL('/login', request.url)
  const redirectPath = pathname === '/settings/printer' && request.nextUrl.searchParams.get('setup') === 'windows'
    ? `${pathname}?setup=windows` : pathname
  loginUrl.searchParams.set('redirect', redirectPath)
  const response = applySecurityHeaders(NextResponse.redirect(loginUrl))
  expireStaleCookies(response, stale)
  return response
}

export const config = {
  matcher: [
    /*
     * Áp dụng middleware cho toàn bộ app & API routes.
     * Bỏ qua các file tĩnh:
     * - _next/static (static files)
     * - _next/image (image optimization files)
     * - favicon.ico, sitemap.xml, robots.txt, opengraph-image
     */
    '/((?!_next/static|_next/image|favicon.ico|sitemap.xml|robots.txt|opengraph-image).*)',
  ],
}


