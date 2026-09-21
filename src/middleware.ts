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

export function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl

  // Kiểm tra xem request có thuộc route được bảo vệ không
  const isProtected = protectedPrefixes.some((prefix) => pathname.startsWith(prefix))

  if (!isProtected) {
    return NextResponse.next()
  }

  // Kiểm tra phiên đăng nhập qua cookie qa_session hoặc next-auth
  const qaSession = request.cookies.get(COOKIE_NAME)?.value
  const nextAuthToken =
    request.cookies.get('next-auth.session-token')?.value ||
    request.cookies.get('__Secure-next-auth.session-token')?.value

  // Nếu có cookie phiên hợp lệ thì cho phép tiếp tục
  if (qaSession || nextAuthToken) {
    return NextResponse.next()
  }

  // Nếu chưa đăng nhập, điều hướng sang /login kèm param redirect
  const loginUrl = new URL('/login', request.url)
  loginUrl.searchParams.set('redirect', pathname)
  return NextResponse.redirect(loginUrl)
}

export const config = {
  matcher: [
    /*
     * Bỏ qua các file tĩnh và API routes:
     * - api (API routes)
     * - _next/static (static files)
     * - _next/image (image optimization files)
     * - favicon.ico, sitemap.xml, robots.txt, opengraph-image
     */
    '/((?!api|_next/static|_next/image|favicon.ico|sitemap.xml|robots.txt|opengraph-image).*)',
  ],
}
