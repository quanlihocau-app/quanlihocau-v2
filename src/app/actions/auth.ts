'use server'

import { prisma } from '@/lib/prisma'
import bcrypt from 'bcryptjs'
import { setSessionCookie, clearSessionCookie } from '@/lib/auth'
import { redirect } from 'next/navigation'
import { normalizeVietnamesePhone } from '@/lib/phone'
import { z } from 'zod'
import { seedSampleLakeData } from '@/lib/onboarding/seed-sample-lake'

export interface RegisterInput {
  email: string
  password: string
  name: string
  phone?: string | null
  lakeName?: string | null
}

export async function registerUser(input: RegisterInput) {
  try {
    const parsed = z.object({
      email: z.string().trim().pipe(z.email('Email không hợp lệ.')),
      password: z.string().min(8, 'Mật khẩu phải có ít nhất 8 ký tự.').max(128),
      name: z.string().trim().min(1, 'Vui lòng nhập họ tên.').max(100),
      phone: z.string().nullable().optional(),
      lakeName: z.string().trim().max(200).nullable().optional(),
    }).safeParse(input)
    if (!parsed.success) return { success: false, message: parsed.error.issues[0]?.message || 'Dữ liệu không hợp lệ.' }
    input = parsed.data
    const email = input.email.trim().toLowerCase()
    const { password, name, phone, lakeName } = input
    let normalizedPhone: string | null
    try { normalizedPhone = normalizeVietnamesePhone(phone) } catch {
      return { success: false, message: 'Số điện thoại không hợp lệ.' }
    }

    if (!email || !password || !name) {
      return { success: false, message: 'Vui lòng điền đầy đủ thông tin bắt buộc.' }
    }

    // 1. Check existing user (non-transaction quick read)
    const existingUser = await prisma.user.findUnique({
      where: { email },
      select: { id: true }
    })

    if (existingUser) {
      return { success: false, message: 'Email này đã được sử dụng trong hệ thống.' }
    }

    // 2. Hash password ngoài transaction để giảm thời gian giữ lock connection
    const hashedPassword = await bcrypt.hash(password, 10)

    // 3. Atomic transaction cho việc tạo user và gán trial data
    const newUser = await prisma.$transaction(async (tx) => {
      // Mặc định gói dùng thử khi đăng ký tài khoản mới là 7 ngày theo chuẩn nghiệp vụ
      const trialDays = 7
      const trialExpiresAt = new Date(Date.now() + trialDays * 24 * 60 * 60 * 1000)

      const displayLakeName =
        lakeName && lakeName.trim().length > 0
          ? lakeName.trim()
          : `Hồ câu của ${name.trim()}`

      // Tạo Organization & Lake gán gói TRIAL
      const organization = await tx.organization.create({
        data: {
          name: `Doanh nghiệp ${displayLakeName}`,
          subscriptionPlan: 'TRIAL',
          validUntil: trialExpiresAt,
        }
      })

      const lake = await tx.lake.create({
        data: {
          organizationId: organization.id,
          name: displayLakeName,
          subscriptionStatus: 'TRIAL',
          subscriptionPlan: 'TRIAL',
          subscriptionExpiresAt: trialExpiresAt,
        }
      })

      // Tạo User trong bảng User với quyền mặc định là USER
      const user = await tx.user.create({
        data: {
          email,
          passwordHash: hashedPassword,
          name: name.trim(),
          phone: normalizedPhone,
          systemRole: 'USER',
          phoneVerified: Boolean(phone && phone.trim().length > 0),
          phoneVerifiedAt: phone && phone.trim().length > 0 ? new Date() : null,
        },
        select: {
          id: true,
          email: true,
          name: true,
          systemRole: true,
          createdAt: true,
        }
      })

      // Gán quyền Chủ hồ (OWNER) cho User vừa tạo
      await tx.membership.create({
        data: {
          userId: user.id,
          lakeId: lake.id,
          role: 'OWNER',
        }
      })

      // Khởi tạo bộ dữ liệu mẫu (10 chòi, 3 món nước, 2 loại thính, 1 bảng giá) cho tài khoản mới
      await seedSampleLakeData(tx, lake.id, name.trim(), user.id)

      return {
        ...user,
        lakeId: lake.id,
        organizationId: organization.id,
      }
    })

    return {
      success: true,
      message: 'Đăng ký tài khoản thành công! Hãy đăng nhập bằng Google đã đăng ký.',
      data: {
        id: newUser.id,
        email: newUser.email,
        lakeId: newUser.lakeId,
        organizationId: newUser.organizationId,
      }
    }
  } catch (error) {
    console.error('Register error:', error)
    return {
      success: false,
      message: 'Đã xảy ra lỗi hệ thống, vui lòng thử lại sau.'
    }
  }
}

export async function loginUser(input: { email: string; password: string }) {
  try {
    const identifier = input.email.trim().toLowerCase()
    const { password } = input

    if (!identifier || !password) {
      return { success: false, message: 'Vui lòng nhập tên đăng nhập/email và mật khẩu.' }
    }

    let user = await prisma.user.findUnique({
      where: { email: identifier },
    })

    if (!user && !identifier.includes('@')) {
      user = await prisma.user.findUnique({
        where: { email: `${identifier}@hocau.com` },
      })
      if (!user) {
        user = await prisma.user.findUnique({
          where: { email: `${identifier}@hocau.vn` },
        })
      }
      if (!user) {
        user = await prisma.user.findFirst({
          where: {
            email: {
              startsWith: `${identifier}@`,
              mode: 'insensitive',
            },
          },
        })
      }
    }

    if (!user || !user.passwordHash) {
      return { success: false, message: 'Email hoặc mật khẩu không chính xác.' }
    }

    if (user.isLocked) {
      return { success: false, message: 'Tài khoản của bạn đã bị khóa. Vui lòng liên hệ quản trị viên.' }
    }

    const isMatch = await bcrypt.compare(password, user.passwordHash)
    if (!isMatch) {
      return { success: false, message: 'Email hoặc mật khẩu không chính xác.' }
    }

    // Set session cookie
    await setSessionCookie({
      userId: user.id,
      email: user.email,
      role: user.systemRole,
      name: user.name || '',
    })

    // Update lastLoginAt
    prisma.user
      .update({
        where: { id: user.id },
        data: { lastLoginAt: new Date() },
      })
      .catch(() => {})

    return { success: true, message: 'Đăng nhập thành công!', email: user.email }
  } catch (error) {
    console.error('Login error:', error)
    return { success: false, message: 'Lỗi hệ thống, vui lòng thử lại sau.' }
  }
}

export async function logoutUser() {
  await clearSessionCookie()
  redirect('/login')
}

/**
 * Alias tương thích ngược
 */
export async function registerUserAction(input: unknown) {
  return registerUser(input as RegisterInput)
}
