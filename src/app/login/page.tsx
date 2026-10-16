'use client'

import { useState } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { loginUser } from '@/app/actions/auth'
import { signIn, signOut } from 'next-auth/react'
import { clearCatalogCache } from '@/lib/query-client'
import { safeRedirectPath } from '@/lib/navigation'
import { Suspense } from 'react'

function LoginForm() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const redirectUrl = searchParams.get('redirect') || '/dashboard'

  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [loading, setLoading] = useState(false)
  const [errorMsg, setErrorMsg] = useState('')

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

  const handleGoogleSignIn = async () => {
    setLoading(true)
    setErrorMsg('')
    await signIn('google', {
      callbackUrl: `/api/auth/sync-session?next=${encodeURIComponent(redirectUrl)}`,
    })
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-slate-50 px-4 py-12">
      <div className="max-w-md w-full bg-white rounded-2xl shadow-sm border border-slate-200 p-8">
        {/* Header */}
        <div className="text-center mb-6">
          <div className="inline-flex h-12 w-12 items-center justify-center rounded-2xl bg-emerald-600 text-white shadow-md mb-3">
            <svg
              className="h-6 w-6 text-white"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
              strokeWidth={2.2}
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                d="M13 10V3L4 14h7v7l9-11h-7z"
              />
            </svg>
          </div>
          <h1 className="text-2xl font-bold text-slate-900">Quản lý Hồ Câu</h1>
          <p className="text-sm text-slate-500 mt-1">Tài khoản mới dùng Google; tài khoản hiện có vẫn đăng nhập như trước</p>
        </div>

        {searchParams.get('registered') === '1' && (
          <div className="mb-4 p-3 rounded-lg bg-emerald-50 border border-emerald-200 text-xs text-emerald-700 font-medium">
            Tạo tài khoản thành công. Hãy đăng nhập bằng Google có cùng địa chỉ email đã đăng ký.
          </div>
        )}
        {searchParams.get('error') && (
          <div className="mb-4 p-3 rounded-lg bg-red-50 border border-red-200 text-xs text-red-600 font-medium">
            Không thể đăng nhập. Hãy dùng Google đã đăng ký với hệ thống hoặc liên hệ quản trị viên hồ.
          </div>
        )}

        {/* Thông báo lỗi nếu có */}
        {errorMsg && (
          <div className="mb-6 p-3 rounded-lg bg-red-50 border border-red-200 text-xs text-red-600 font-medium">
            {errorMsg}
          </div>
        )}

        <button
          type="button"
          onClick={handleGoogleSignIn}
          disabled={loading}
          className="flex w-full h-12 items-center justify-center gap-3 rounded-xl border border-slate-300 bg-white text-sm font-semibold text-slate-700 shadow-sm transition hover:bg-slate-50 disabled:opacity-60 cursor-pointer"
        >
          <svg aria-hidden="true" viewBox="0 0 48 48" className="h-5 w-5">
            <path fill="#EA4335" d="M24 9.5c3.54 0 6.71 1.22 9.21 3.6l6.85-6.85C35.9 2.38 30.47 0 24 0 14.62 0 6.51 5.38 2.56 13.22l7.98 6.19C12.43 13.72 17.74 9.5 24 9.5Z" />
            <path fill="#4285F4" d="M46.98 24.55c0-1.57-.15-3.09-.38-4.55H24v9.02h12.94c-.58 2.96-2.26 5.48-4.72 7.18l7.62 5.91c4.45-4.11 7.14-10.16 7.14-17.56Z" />
            <path fill="#FBBC05" d="M10.53 28.59A14.4 14.4 0 0 1 9.75 24c0-1.59.27-3.13.76-4.59l-7.98-6.19A23.9 23.9 0 0 0 0 24c0 3.87.93 7.53 2.56 10.78l7.97-6.19Z" />
            <path fill="#34A853" d="M24 48c6.48 0 11.93-2.13 15.9-5.89l-7.62-5.91c-2.12 1.42-4.84 2.27-8.28 2.27-6.26 0-11.57-4.22-13.47-9.91l-7.98 6.19C6.51 42.62 14.62 48 24 48Z" />
          </svg>
          {loading ? 'Đang chuyển đến Google...' : 'Tiếp tục với Google'}
        </button>
        <p className="mt-3 text-center text-xs text-slate-500">
          Google sẽ tạo hồ dùng thử khi bạn đăng nhập lần đầu.
        </p>

        <div className="my-6 flex items-center gap-3 text-xs text-slate-400">
          <span className="h-px flex-1 bg-slate-200" />
          <span>TÀI KHOẢN ĐANG SỬ DỤNG</span>
          <span className="h-px flex-1 bg-slate-200" />
        </div>

        <form onSubmit={handleLegacyLogin} className="space-y-4">
          <div>
            <label className="mb-2 block text-xs font-semibold uppercase tracking-wider text-slate-700">Email</label>
            <input type="email" autoComplete="username" required value={email} onChange={(e) => setEmail(e.target.value)} placeholder="vidu@gmail.com" className="h-11 w-full rounded-xl border border-slate-300 px-4 text-sm text-slate-900 focus:border-emerald-600 focus:outline-none focus:ring-2 focus:ring-emerald-600/20" />
          </div>
          <div>
            <label className="mb-2 block text-xs font-semibold uppercase tracking-wider text-slate-700">Mật khẩu</label>
            <input type="password" autoComplete="current-password" required value={password} onChange={(e) => setPassword(e.target.value)} placeholder="••••••••" className="h-11 w-full rounded-xl border border-slate-300 px-4 text-sm text-slate-900 focus:border-emerald-600 focus:outline-none focus:ring-2 focus:ring-emerald-600/20" />
          </div>
          <button type="submit" disabled={loading} className="h-11 w-full rounded-xl bg-emerald-600 text-sm font-medium text-white shadow-sm transition hover:bg-emerald-700 disabled:opacity-50 cursor-pointer">
            {loading ? 'Đang xác thực...' : 'Đăng nhập tài khoản hiện có'}
          </button>
        </form>

        <p className="mt-6 border-t border-slate-100 pt-5 text-center text-xs text-slate-500">
          Đăng nhập lần đầu bằng Google sẽ tự tạo tài khoản hồ câu dùng thử.
        </p>
      </div>
    </div>
  )
}

export default function LoginPage() {
  return (
    <Suspense fallback={<div className="min-h-screen flex items-center justify-center bg-slate-50 text-slate-500 text-sm">Đang tải...</div>}>
      <LoginForm />
    </Suspense>
  )
}
