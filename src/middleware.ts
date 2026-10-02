import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'

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

export function middleware(request: NextRequest) {
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

    return applySecurityHeaders(NextResponse.next())
  }

  // 3. Kiểm tra xem request có thuộc route được bảo vệ không
  const isProtected = protectedPrefixes.some((prefix) => pathname.startsWith(prefix))

  if (!isProtected) {
    return applySecurityHeaders(NextResponse.next())
  }

  // 4. Kiểm tra phiên đăng nhập qua cookie qa_session hoặc next-auth
  const qaSession = request.cookies.get(COOKIE_NAME)?.value
  const nextAuthToken =
    request.cookies.get('next-auth.session-token')?.value ||
    request.cookies.get('__Secure-next-auth.session-token')?.value

  // Nếu có cookie phiên hợp lệ thì cho phép tiếp tục
  if (qaSession || nextAuthToken) {
    return applySecurityHeaders(NextResponse.next())
  }

  // Nếu chưa đăng nhập, điều hướng sang /login kèm param redirect
  const loginUrl = new URL('/login', request.url)
  loginUrl.searchParams.set('redirect', pathname)
  return NextResponse.redirect(loginUrl)
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

