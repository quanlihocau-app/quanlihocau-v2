'use client'

import { Suspense, useState } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { loginUser } from '@/app/actions/auth'
import { signIn, signOut } from 'next-auth/react'
import { clearCatalogCache } from '@/lib/query-client'
import { safeRedirectPath } from '@/lib/navigation'

// Error message mapping for OAuth errors
const OAUTH_ERRORS: Record<string, string> = {
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
  const [showAdminForm, setShowAdminForm] = useState(false)

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

  // ── Email/Password (admin fallback) ───────────────────────────
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
        const authResult = await signIn('credentials', { redirect: false, email, password })
        if (authResult?.error) await signOut({ redirect: false })
      } catch {
        await signOut({ redirect: false }).catch(() => undefined)
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
    <div className="min-h-screen flex flex-col items-center justify-center bg-linear-to-br from-[#0f2017] via-[#1a3328] to-[#0c1a11] px-4 py-12">
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
        <div className="mb-8 text-center">
          <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-2xl bg-linear-to-br from-emerald-400 to-emerald-600 shadow-2xl shadow-emerald-900/50">
            <svg className="h-8 w-8 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M13 10V3L4 14h7v7l9-11h-7z" />
            </svg>
          </div>
          <h1 className="text-2xl font-bold text-white tracking-tight">Quản lý Hồ Câu</h1>
          <p className="mt-1 text-sm text-emerald-300/70">Hệ thống vận hành &amp; thu ngân</p>
        </div>

        {/* Main card */}
        <div className="rounded-2xl border border-white/10 bg-white/5 p-7 shadow-2xl backdrop-blur-md">

          {/* Alerts */}
          {registered && (
            <div className="mb-5 flex items-start gap-2.5 rounded-xl border border-emerald-500/30 bg-emerald-500/10 px-3.5 py-3 text-sm text-emerald-300">
              <span className="mt-0.5 shrink-0">✓</span>
              <span>Đăng ký thành công! Hãy đăng nhập bằng Google có cùng email.</span>
            </div>
          )}
          {(oauthError || (errorMsg && !showAdminForm)) && (
            <div className="mb-5 flex items-start gap-2.5 rounded-xl border border-red-500/30 bg-red-500/10 px-3.5 py-3 text-sm text-red-300">
              <span className="mt-0.5 shrink-0">⚠</span>
              <span>{oauthError ?? errorMsg}</span>
            </div>
          )}

          {/* ── Google Sign In (PRIMARY BUTTON) ──────────────────── */}
          <button
            type="button"
            id="btn-google-signin"
            onClick={handleGoogleSignIn}
            disabled={isLoading}
            className="group relative flex w-full items-center justify-center gap-3 rounded-xl border border-white/20 bg-white px-5 py-3.5 text-sm font-semibold text-slate-800 shadow-lg transition-all duration-150 hover:shadow-xl hover:scale-[1.01] active:scale-[0.99] disabled:opacity-60 disabled:cursor-not-allowed cursor-pointer"
          >
            {googleLoading ? (
              <span className="h-4 w-4 animate-spin rounded-full border-2 border-slate-400 border-t-slate-800" />
            ) : (
              <svg aria-hidden="true" viewBox="0 0 48 48" className="h-5 w-5 shrink-0">
                <path fill="#EA4335" d="M24 9.5c3.54 0 6.71 1.22 9.21 3.6l6.85-6.85C35.9 2.38 30.47 0 24 0 14.62 0 6.51 5.38 2.56 13.22l7.98 6.19C12.43 13.72 17.74 9.5 24 9.5Z" />
                <path fill="#4285F4" d="M46.98 24.55c0-1.57-.15-3.09-.38-4.55H24v9.02h12.94c-.58 2.96-2.26 5.48-4.72 7.18l7.62 5.91c4.45-4.11 7.14-10.16 7.14-17.56Z" />
                <path fill="#FBBC05" d="M10.53 28.59A14.4 14.4 0 0 1 9.75 24c0-1.59.27-3.13.76-4.59l-7.98-6.19A23.9 23.9 0 0 0 0 24c0 3.87.93 7.53 2.56 10.78l7.97-6.19Z" />
                <path fill="#34A853" d="M24 48c6.48 0 11.93-2.13 15.9-5.89l-7.62-5.91c-2.12 1.42-4.84 2.27-8.28 2.27-6.26 0-11.57-4.22-13.47-9.91l-7.98 6.19C6.51 42.62 14.62 48 24 48Z" />
              </svg>
            )}
            <span>{googleLoading ? 'Đang chuyển đến Google…' : 'Đăng nhập bằng Google'}</span>
          </button>

          <p className="mt-2.5 text-center text-xs text-white/35">
            Lần đầu đăng nhập sẽ tự động tạo hồ câu dùng thử 7 ngày miễn phí
          </p>

          {/* ── Divider ──────────────────────────────────────────── */}
          <div className="my-5 flex items-center gap-3">
            <span className="h-px flex-1 bg-white/10" />
            <span className="text-[11px] font-semibold tracking-widest text-white/25 uppercase">hoặc</span>
            <span className="h-px flex-1 bg-white/10" />
          </div>

          {/* ── Admin collapsible form ────────────────────────────── */}
          <button
            type="button"
            id="btn-toggle-admin-login"
            onClick={() => setShowAdminForm((v) => !v)}
            className="flex w-full items-center justify-between rounded-xl border border-white/10 bg-white/5 px-4 py-2.5 text-xs font-medium text-white/40 transition hover:bg-white/10 hover:text-white/60 cursor-pointer"
          >
            <span className="flex items-center gap-2">
              <svg className="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" d="M15.75 5.25a3 3 0 0 1 3 3m3 0a6 6 0 0 1-7.029 5.912c-.563-.097-1.159.026-1.563.43L10.5 17.25H8.25v2.25H6v2.25H2.25v-2.818c0-.597.237-1.17.659-1.591l6.499-6.499c.404-.404.527-1 .43-1.563A6 6 0 0 1 21.75 8.25Z" />
              </svg>
              Đăng nhập bằng mật khẩu (dành cho quản trị viên)
            </span>
            <svg
              className={`h-3.5 w-3.5 transition-transform duration-200 ${showAdminForm ? 'rotate-180' : ''}`}
              fill="none" viewBox="0 0 24 24" strokeWidth={2.5} stroke="currentColor"
            >
              <path strokeLinecap="round" strokeLinejoin="round" d="m19.5 8.25-7.5 7.5-7.5-7.5" />
            </svg>
          </button>

          {showAdminForm && (
            <form onSubmit={handleLegacyLogin} className="mt-3 space-y-3 rounded-xl border border-white/10 bg-white/5 p-4">
              {errorMsg && (
                <p className="rounded-lg border border-red-500/30 bg-red-500/10 px-3 py-2 text-xs text-red-300">
                  {errorMsg}
                </p>
              )}
              <div>
                <label className="mb-1.5 block text-[11px] font-semibold uppercase tracking-wider text-white/40">
                  Email
                </label>
                <input
                  type="email"
                  autoComplete="username"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="admin@example.com"
                  className="h-10 w-full rounded-lg border border-white/15 bg-white/8 px-3 text-sm text-white placeholder-white/20 focus:border-emerald-400/60 focus:outline-none focus:ring-1 focus:ring-emerald-400/40"
                />
              </div>
              <div>
                <label className="mb-1.5 block text-[11px] font-semibold uppercase tracking-wider text-white/40">
                  Mật khẩu
                </label>
                <input
                  type="password"
                  autoComplete="current-password"
                  required
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="••••••••"
                  className="h-10 w-full rounded-lg border border-white/15 bg-white/8 px-3 text-sm text-white placeholder-white/20 focus:border-emerald-400/60 focus:outline-none focus:ring-1 focus:ring-emerald-400/40"
                />
              </div>
              <button
                type="submit"
                id="btn-legacy-login"
                disabled={isLoading}
                className="h-10 w-full rounded-lg bg-white/10 text-sm font-semibold text-white transition hover:bg-white/20 disabled:opacity-50 cursor-pointer"
              >
                {loading ? 'Đang xác thực…' : 'Đăng nhập bằng mật khẩu'}
              </button>
            </form>
          )}
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
