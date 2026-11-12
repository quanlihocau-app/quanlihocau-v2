'use client'

import { Suspense, useRef, useState } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { loginUser } from '@/app/actions/auth'
import { signIn } from 'next-auth/react'
import { clearCatalogCache } from '@/lib/query-client'
import { safeRedirectPath } from '@/lib/navigation'

// Error message mapping for OAuth errors
const OAUTH_ERRORS: Record<string, string> = {
  StaffMustUseCredentials: 'Tài khoản Nhân viên vui lòng đăng nhập bằng Email/Tên đăng nhập và Mật khẩu do chủ hồ cấp (không đăng nhập bằng Google).',
  AccessDenied: 'Quyền truy cập bị từ chối: Tài khoản của bạn có thể đang bị khóa hoặc email Google chưa được xác minh.',
  GoogleSignIn: 'Không thể đăng nhập với Google. Tài khoản chưa được cấp quyền hoặc chưa đăng ký.',
  OAuthSignin: 'Không thể kết nối đến Google. Vui lòng thử lại.',
  OAuthCallback: 'Xác thực Google thất bại. Vui lòng thử lại sau.',
  OAuthCreateAccount: 'Không thể tạo tài khoản từ Google. Vui lòng liên hệ quản trị viên.',
  AppleSignIn: 'Không đăng nhập được bằng Apple. Hãy dùng số điện thoại và mật khẩu.',
  Default: 'Đăng nhập không thành công. Vui lòng thử lại hoặc liên hệ quản trị viên.',
}

function LoginForm() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const redirectUrl = searchParams.get('redirect') || searchParams.get('callbackUrl') || '/dashboard'
  const errorParam = searchParams.get('error')
  const registered = searchParams.get('registered') === '1'

  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [loading, setLoading] = useState(false)
  const [googleLoading, setGoogleLoading] = useState(false)
  const [errorMsg, setErrorMsg] = useState('')
  const [showPassword, setShowPassword] = useState(false)
  const [appleLoading, setAppleLoading] = useState(false)
  const inFlight = useRef(false)

  const oauthError = errorParam
    ? (OAUTH_ERRORS[errorParam] ?? OAUTH_ERRORS.Default)
    : null

  const handleAppleSignIn = async () => {
    if (inFlight.current) return
    inFlight.current = true
    setAppleLoading(true)
    setErrorMsg('')
    try {
      const { signInWithAppleNative } = await import('@/lib/native/apple-sign-in')
      const native = await signInWithAppleNative()
      if (native?.identityToken) {
        const result = await signIn('apple-native', {
          redirect: false,
          identityToken: native.identityToken,
          name: native.name || '',
        })
        if (result?.error) {
          setErrorMsg('Không đăng nhập được bằng Apple. Hãy dùng số điện thoại và mật khẩu.')
          return
        }
        await fetch(`/api/auth/sync-session?next=${encodeURIComponent(safeRedirectPath(redirectUrl))}`, { credentials: "same-origin" })
        router.push(safeRedirectPath(redirectUrl))
        router.refresh()
        return
      }
      await signIn('apple', {
        callbackUrl: `/api/auth/sync-session?next=${encodeURIComponent(safeRedirectPath(redirectUrl))}`,
      })
    } catch {
      setErrorMsg('Chưa kết nối được với Apple. Hãy dùng số điện thoại và mật khẩu.')
    } finally {
      inFlight.current = false
      setAppleLoading(false)
    }
  }

  const handleGoogleSignIn = async () => {
    if (inFlight.current) return
    inFlight.current = true
    setGoogleLoading(true)
    setErrorMsg('')
    try {
      const result = await signIn('google', {
        callbackUrl: `/api/auth/sync-session?next=${encodeURIComponent(safeRedirectPath(redirectUrl))}`,
      })
      if (result?.error) setErrorMsg('Không thể đăng nhập với Google. Vui lòng thử lại.')
    } catch {
      setErrorMsg('Chưa kết nối được với Google. Vui lòng thử lại hoặc dùng số điện thoại và mật khẩu.')
    } finally {
      inFlight.current = false
      setGoogleLoading(false)
    }
  }

  // ── Email/Password (staff & manager login) ───────────────────
  const handleLegacyLogin = async (e: React.FormEvent) => {
    e.preventDefault()
    if (inFlight.current) return
    inFlight.current = true
    setLoading(true)
    setErrorMsg('')
    try {
      const result = await loginUser({ email, password })
      if (!result.success) {
        setErrorMsg(result.message)
        return
      }
      try {
        const resolvedEmail = (result as { email?: string }).email || email
        await signIn('credentials', { redirect: false, email: resolvedEmail, password })
      } catch {
        // The existing qa_session remains the credentials session fallback.
      }
      clearCatalogCache()
      router.push(safeRedirectPath(redirectUrl))
      router.refresh()
    } catch {
      setErrorMsg('Không thể kết nối đến hệ thống.')
    } finally {
      inFlight.current = false
      setLoading(false)
    }
  }

  const isLoading = loading || googleLoading

  return (
    <div className="min-h-screen bg-[#F8FAF8] text-[#111827] antialiased">
      {/* Header */}
      <header className="border-b border-[#E2E8F0] bg-white">
        <div className="mx-auto flex min-h-17 max-w-5xl items-center justify-between px-4 sm:px-6">
          <button type="button" onClick={() => router.push('/')} className="flex items-center gap-2.5 text-left cursor-pointer">
            <span className="flex h-9 w-9 items-center justify-center rounded-lg bg-[#1B3B2B] text-sm font-extrabold text-white">
              HC
            </span>
            <span>
              <strong className="block text-sm font-extrabold text-[#1B3B2B]">Quản Lý Hồ Câu</strong>
              <span className="block text-[11px] text-[#64748B]">Đăng nhập quầy thu ngân &amp; quản trị</span>
            </span>
          </button>
          <div className="flex items-center gap-3 text-xs font-semibold">
            <a
              href="/preview"
              className="hidden rounded-lg border border-[#CBD5E1] bg-white px-3 py-2 text-[#334155] hover:border-[#1B3B2B] hover:text-[#1B3B2B] sm:inline-block"
            >
              Xem quầy mẫu
            </a>
            <a
              href="/register"
              className="rounded-lg bg-[#1B3B2B] px-3.5 py-2 font-bold text-white hover:bg-[#2C5E43]"
            >
              Mở hồ dùng thử 30 ngày ↗
            </a>
          </div>
        </div>
      </header>

      <div className="mx-auto flex max-w-md flex-col justify-center px-4 py-10 sm:py-14">
        <div className="rounded-xl border border-[#E2E8F0] bg-white p-6 shadow-xs sm:p-8">
          <div className="mb-5">
            <span className="inline-block rounded-full bg-[#E8F0EC] px-3 py-1 text-[11px] font-extrabold uppercase tracking-wider text-[#1B3B2B]">
              Hệ thống vận hành hồ câu
            </span>
            <h1
              className="mt-2.5 text-2xl font-bold tracking-tight text-[#111827] sm:text-3xl"
              style={{ fontFamily: '"Times New Roman", Times, Georgia, serif' }}
            >
              Đăng nhập vào hồ của bạn
            </h1>
            <p className="mt-1 text-xs leading-relaxed text-[#64748B]">
              Sử dụng số điện thoại, tên đăng nhập hoặc tài khoản Google của chủ hồ.
            </p>
          </div>

          {/* Alerts */}
          {registered && (
            <div className="mb-4 flex items-start gap-2.5 rounded-lg border border-[#CFE0D6] bg-[#E8F0EC] px-3.5 py-2.5 text-xs font-semibold text-[#1B3B2B]">
              <span className="shrink-0">✓</span>
              <span>Đăng ký thành công! Đăng nhập bằng số điện thoại hoặc email và mật khẩu vừa tạo.</span>
            </div>
          )}
          {(oauthError || errorMsg) && (
            <div
              role="alert"
              className="mb-4 flex items-start gap-2.5 rounded-lg border border-red-200 bg-red-50 px-3.5 py-2.5 text-xs font-semibold text-red-700"
            >
              <span className="shrink-0">⚠</span>
              <span>{errorMsg || oauthError}</span>
            </div>
          )}

          {/* ── Section 1: Staff / Manager / Owner Credentials Login ─────────── */}
          <form onSubmit={handleLegacyLogin} aria-busy={isLoading} className="space-y-4">
            <div>
              <label htmlFor="login-account" className="mb-1 block text-xs font-bold text-[#1E293B]">
                Số điện thoại, tên đăng nhập hoặc email
              </label>
              <input
                id="login-account"
                name="username"
                autoComplete="username"
                type="text"
                autoCapitalize="none"
                autoCorrect="off"
                spellCheck="false"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="0901234567, tên đăng nhập hoặc email"
                className="h-11 w-full rounded-lg border border-[#CBD5E1] bg-white px-3.5 text-sm text-[#111827] transition focus:border-[#1B3B2B] focus:outline-none focus:ring-2 focus:ring-[#1B3B2B]/20"
              />
            </div>

            <div>
              <label htmlFor="login-password" className="mb-1 block text-xs font-bold text-[#1E293B]">
                Mật khẩu
              </label>
              <div className="relative">
                <input
                  id="login-password"
                  name="password"
                  type={showPassword ? 'text' : 'password'}
                  autoComplete="current-password"
                  required
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="Nhập mật khẩu"
                  className="h-11 w-full rounded-lg border border-[#CBD5E1] bg-white pl-3.5 pr-16 text-sm text-[#111827] transition focus:border-[#1B3B2B] focus:outline-none focus:ring-2 focus:ring-[#1B3B2B]/20"
                />
                <button
                  type="button"
                  aria-controls="login-password"
                  aria-pressed={showPassword}
                  onClick={() => setShowPassword((value) => !value)}
                  className="absolute right-2 top-1/2 -translate-y-1/2 rounded px-2 py-1 text-xs font-bold text-[#1B3B2B] hover:bg-[#E8F0EC]"
                >
                  {showPassword ? 'Ẩn' : 'Hiện'}
                </button>
              </div>
            </div>

            <button
              type="submit"
              id="btn-legacy-login"
              disabled={isLoading}
              className="flex min-h-12 w-full items-center justify-center rounded-lg bg-[#1B3B2B] px-4 text-sm font-bold text-white shadow-xs transition hover:bg-[#2C5E43] disabled:opacity-50 cursor-pointer"
            >
              {loading ? 'Đang đăng nhập…' : 'Đăng nhập vào quầy thu ngân'}
            </button>
          </form>

          {/* ── Divider ──────────────────────────────────────────── */}
          <div className="my-5 flex items-center gap-3">
            <span className="h-px flex-1 bg-[#E2E8F0]" />
            <span className="text-[11px] font-bold tracking-wider text-[#64748B] uppercase">
              HOẶC DÀNH CHO CHỦ HỒ
            </span>
            <span className="h-px flex-1 bg-[#E2E8F0]" />
          </div>

          {/* ── Section 2: Google Sign In (Dành cho Chủ hồ) ────────── */}
          <button
            type="button"
            id="btn-apple-signin"
            onClick={handleAppleSignIn}
            disabled={isLoading || appleLoading}
            className="mb-3 flex min-h-12 w-full items-center justify-center gap-2.5 rounded-lg bg-black px-4 py-2.5 text-sm font-bold text-white disabled:opacity-60 cursor-pointer"
          >
            <span>{appleLoading ? 'Đang chuyển đến Apple…' : 'Chủ hồ: Tiếp tục bằng Apple'}</span>
          </button>
          <button
            type="button"
            id="btn-google-signin"
            onClick={handleGoogleSignIn}
            disabled={isLoading}
            className="flex min-h-12 w-full items-center justify-center gap-2.5 rounded-lg border border-[#CBD5E1] bg-white px-4 py-2.5 text-sm font-bold text-[#111827] shadow-2xs transition hover:border-[#1B3B2B] hover:bg-[#F8FAF8] disabled:opacity-60 cursor-pointer"
          >
            <svg aria-hidden="true" viewBox="0 0 48 48" className="h-4 w-4 shrink-0">
              <path
                fill="#EA4335"
                d="M24 9.5c3.54 0 6.71 1.22 9.21 3.6l6.85-6.85C35.9 2.38 30.47 0 24 0 14.62 0 6.51 5.38 2.56 13.22l7.98 6.19C12.43 13.72 17.74 9.5 24 9.5Z"
              />
              <path
                fill="#4285F4"
                d="M46.98 24.55c0-1.57-.15-3.09-.38-4.55H24v9.02h12.94c-.58 2.96-2.26 5.48-4.72 7.18l7.62 5.91c4.45-4.11 7.14-10.16 7.14-17.56Z"
              />
              <path
                fill="#FBBC05"
                d="M10.53 28.59A14.4 14.4 0 0 1 9.75 24c0-1.59.27-3.13.76-4.59l-7.98-6.19A23.9 23.9 0 0 0 0 24c0 3.87.93 7.53 2.56 10.78l7.97-6.19Z"
              />
              <path
                fill="#34A853"
                d="M24 48c6.48 0 11.93-2.13 15.9-5.89l-7.62-5.91c-2.12 1.42-4.84 2.27-8.28 2.27-6.26 0-11.57-4.22-13.47-9.91l-7.98 6.19C6.51 42.62 14.62 48 24 48Z"
              />
            </svg>
            <span>{googleLoading ? 'Đang chuyển đến Google…' : 'Chủ hồ: Tiếp tục bằng Google'}</span>
          </button>

          <div className="mt-6 rounded-lg border border-[#E2E8F0] bg-[#F8FAF8] p-3.5 text-center text-xs text-[#475569]">
            Chưa có tài khoản hồ câu?{' '}
            <a href="/register" className="font-bold text-[#1B3B2B] underline">
              Mở hồ dùng thử 30 ngày miễn phí
            </a>
          </div>
        </div>

        {/* Footer */}
        <p className="mt-5 text-center text-xs text-[#64748B]">
          Bằng cách đăng nhập, bạn đồng ý với{' '}
          <a href="/dieu-khoan" className="font-semibold text-[#1B3B2B] underline">
            Điều khoản
          </a>{' '}
          và{' '}
          <a href="/chinh-sach-bao-mat" className="font-semibold text-[#1B3B2B] underline">
            Chính sách bảo mật
          </a>
        </p>
      </div>
    </div>
  )
}

export default function LoginPage() {
  return (
    <Suspense
      fallback={
        <div className="min-h-screen flex items-center justify-center bg-[#F8FAF8]">
          <div className="h-7 w-7 animate-spin rounded-full border-2 border-[#1B3B2B] border-t-transparent" />
        </div>
      }
    >
      <LoginForm />
    </Suspense>
  )
}
