'use client'

import { Suspense, useState } from 'react'
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
  Default: 'Đăng nhập không thành công. Vui lòng thử lại hoặc liên hệ quản trị viên.',
}

function LoginForm() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const redirectUrl = searchParams.get('redirect') || '/dashboard'
  const errorParam = searchParams.get('error')
  const registered = searchParams.get('registered') === '1'

  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [loading, setLoading] = useState(false)
  const [googleLoading, setGoogleLoading] = useState(false)
  const [errorMsg, setErrorMsg] = useState('')

  const oauthError = errorParam
    ? (OAUTH_ERRORS[errorParam] ?? OAUTH_ERRORS.Default)
    : null

  // ── Google OAuth (primary) ────────────────────────────────────
  const handleGoogleSignIn = async () => {
    setGoogleLoading(true)
    setErrorMsg('')
    await signIn('google', {
      callbackUrl: `/api/auth/sync-session?next=${encodeURIComponent(safeRedirectPath(redirectUrl))}`,
    })
    // stays loading until navigation completes
  }

  // ── Email/Password (staff & manager login) ───────────────────
  const handleLegacyLogin = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    setErrorMsg('')
    try {
      const result = await loginUser({ email, password })
      if (!result.success) {
        setErrorMsg(result.message)
        setLoading(false)
        return
      }
      try {
        const resolvedEmail = (result as { email?: string }).email || email
        await signIn('credentials', { redirect: false, email: resolvedEmail, password })
      } catch (err) {
        console.warn('NextAuth credentials sync notice:', err)
      }
      clearCatalogCache()
      router.push(safeRedirectPath(redirectUrl))
      router.refresh()
    } catch {
      setErrorMsg('Không thể kết nối đến hệ thống.')
      setLoading(false)
    }
  }

  const isLoading = loading || googleLoading

  return (
    <div className="min-h-screen flex flex-col items-center justify-center bg-linear-to-br from-[#0f2017] via-[#1a3328] to-[#0c1a11] px-4 py-8">
      {/* Dot grid background texture */}
      <div
        className="pointer-events-none fixed inset-0 opacity-[0.035]"
        style={{
          backgroundImage: 'radial-gradient(circle, #ffffff 1px, transparent 1px)',
          backgroundSize: '32px 32px',
        }}
      />

      <div className="relative w-full max-w-sm">
        {/* Brand header */}
        <div className="mb-6 text-center">
          <div className="mx-auto mb-3 flex h-14 w-14 items-center justify-center rounded-2xl bg-linear-to-br from-emerald-400 to-emerald-600 shadow-xl shadow-emerald-900/50">
            <svg className="h-7 w-7 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M13 10V3L4 14h7v7l9-11h-7z" />
            </svg>
          </div>
          <h1 className="text-xl font-bold text-white tracking-tight">Quản Lý Hồ Câu</h1>
          <p className="mt-0.5 text-xs text-emerald-300/70">Đăng nhập quầy thu ngân &amp; quản trị</p>
        </div>

        {/* Main card */}
        <div className="rounded-2xl border border-white/10 bg-white/5 p-6 shadow-2xl backdrop-blur-md">

          {/* Alerts */}
          {registered && (
            <div className="mb-4 flex items-start gap-2.5 rounded-xl border border-emerald-500/30 bg-emerald-500/10 px-3.5 py-2.5 text-xs text-emerald-300">
              <span className="shrink-0">✓</span>
              <span>Đăng ký thành công! Đăng nhập bằng số điện thoại hoặc email và mật khẩu vừa tạo.</span>
            </div>
          )}
          {(oauthError || errorMsg) && (
            <div className="mb-4 flex items-start gap-2.5 rounded-xl border border-red-500/30 bg-red-500/10 px-3.5 py-2.5 text-xs text-red-300">
              <span className="shrink-0">⚠</span>
              <span>{oauthError ?? errorMsg}</span>
            </div>
          )}

          {/* ── Section 1: Staff / Manager Credentials Login ─────────── */}
          <form onSubmit={handleLegacyLogin} className="space-y-3.5">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold uppercase tracking-wider text-emerald-400">
                Nhân viên &amp; Thu ngân
              </span>
              <span className="text-[10px] text-white/40">Đăng nhập ca</span>
            </div>

            <div>
              <label className="mb-1 block text-[11px] font-medium text-white/60">
                Số điện thoại, tên đăng nhập hoặc email
              </label>
              <input
                type="text"
                autoCapitalize="none"
                autoCorrect="off"
                spellCheck="false"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="0901234567, tên đăng nhập hoặc email"
                className="h-10 w-full rounded-xl border border-white/15 bg-white/10 px-3 text-sm text-white placeholder-white/25 transition focus:border-emerald-400 focus:bg-white/15 focus:outline-none focus:ring-1 focus:ring-emerald-400"
              />
            </div>

            <div>
              <label className="mb-1 block text-[11px] font-medium text-white/60">
                Mật khẩu
              </label>
              <input
                type="password"
                autoComplete="current-password"
                required
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="Nhập mật khẩu"
                className="h-10 w-full rounded-xl border border-white/15 bg-white/10 px-3 text-sm text-white placeholder-white/25 transition focus:border-emerald-400 focus:bg-white/15 focus:outline-none focus:ring-1 focus:ring-emerald-400"
              />
            </div>

            <button
              type="submit"
              id="btn-legacy-login"
              disabled={isLoading}
              className="flex h-10 w-full items-center justify-center rounded-xl bg-emerald-600 px-4 text-sm font-semibold text-white shadow-md shadow-emerald-950/40 transition hover:bg-emerald-500 active:scale-[0.99] disabled:opacity-50 cursor-pointer"
            >
              {loading ? (
                <span className="flex items-center gap-2">
                  <span className="h-4 w-4 animate-spin rounded-full border-2 border-white/40 border-t-white" />
                  Đang đăng nhập…
                </span>
              ) : (
                'Đăng nhập vào quầy thu ngân'
              )}
            </button>
          </form>

          {/* ── Divider ──────────────────────────────────────────── */}
          <div className="my-5 flex items-center gap-3">
            <span className="h-px flex-1 bg-white/10" />
            <span className="text-[10px] font-semibold tracking-wider text-white/30 uppercase">HOẶC DÀNH CHO CHỦ HỒ</span>
            <span className="h-px flex-1 bg-white/10" />
          </div>

          {/* ── Section 2: Google Sign In (Dành cho Chủ hồ) ────────── */}
          <button
            type="button"
            id="btn-google-signin"
            onClick={handleGoogleSignIn}
            disabled={isLoading}
            className="group relative flex w-full items-center justify-center gap-2.5 rounded-xl border border-white/20 bg-white px-4 py-2.5 text-xs font-semibold text-slate-800 shadow transition-all duration-150 hover:bg-slate-50 hover:shadow-md active:scale-[0.99] disabled:opacity-60 cursor-pointer"
          >
            {googleLoading ? (
              <span className="h-4 w-4 animate-spin rounded-full border-2 border-slate-400 border-t-slate-800" />
            ) : (
              <svg aria-hidden="true" viewBox="0 0 48 48" className="h-4 w-4 shrink-0">
                <path fill="#EA4335" d="M24 9.5c3.54 0 6.71 1.22 9.21 3.6l6.85-6.85C35.9 2.38 30.47 0 24 0 14.62 0 6.51 5.38 2.56 13.22l7.98 6.19C12.43 13.72 17.74 9.5 24 9.5Z" />
                <path fill="#4285F4" d="M46.98 24.55c0-1.57-.15-3.09-.38-4.55H24v9.02h12.94c-.58 2.96-2.26 5.48-4.72 7.18l7.62 5.91c4.45-4.11 7.14-10.16 7.14-17.56Z" />
                <path fill="#FBBC05" d="M10.53 28.59A14.4 14.4 0 0 1 9.75 24c0-1.59.27-3.13.76-4.59l-7.98-6.19A23.9 23.9 0 0 0 0 24c0 3.87.93 7.53 2.56 10.78l7.97-6.19Z" />
                <path fill="#34A853" d="M24 48c6.48 0 11.93-2.13 15.9-5.89l-7.62-5.91c-2.12 1.42-4.84 2.27-8.28 2.27-6.26 0-11.57-4.22-13.47-9.91l-7.98 6.19C6.51 42.62 14.62 48 24 48Z" />
              </svg>
            )}
            <span>{googleLoading ? 'Đang chuyển đến Google…' : 'Chủ hồ: Đăng nhập bằng Google'}</span>
          </button>
        </div>

        {/* Footer */}
        <p className="mt-5 text-center text-[11px] text-white/20">
          Bằng cách đăng nhập, bạn đồng ý với{' '}
          <a href="/dieu-khoan" className="underline hover:text-white/40 transition">Điều khoản</a>
          {' '}và{' '}
          <a href="/chinh-sach-bao-mat" className="underline hover:text-white/40 transition">Chính sách bảo mật</a>
        </p>
      </div>
    </div>
  )
}

export default function LoginPage() {
  return (
    <Suspense
      fallback={
        <div className="min-h-screen flex items-center justify-center bg-[#0f2017]">
          <div className="h-7 w-7 animate-spin rounded-full border-2 border-emerald-400 border-t-transparent" />
        </div>
      }
    >
      <LoginForm />
    </Suspense>
  )
}
