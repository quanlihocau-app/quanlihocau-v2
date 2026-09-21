'use server'

import { prisma } from '@/lib/prisma'
import bcrypt from 'bcryptjs'
import { setSessionCookie, clearSessionCookie } from '@/lib/auth'
import { redirect } from 'next/navigation'

export interface RegisterInput {
  email: string
  password: string
  name: string
  phone?: string | null
  lakeName?: string | null
}

export async function registerUser(input: RegisterInput) {
  try {
    const email = input.email.trim().toLowerCase()
    const { password, name, phone, lakeName } = input

    if (!email || !password || !name) {
      return { success: false, message: 'Vui lòng điền đầy đủ thông tin bắt buộc.' }
    }

    if (password.length < 6) {
      return { success: false, message: 'Mật khẩu phải có ít nhất 6 ký tự.' }
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
      // Tìm xem có trial plan nào không
      const trialPlan = await tx.subscriptionPlan.findFirst({
        where: { code: 'TRIAL' }
      })

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
          phone: phone && phone.trim().length > 0 ? phone.trim() : null,
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

      return {
        ...user,
        lakeId: lake.id,
        organizationId: organization.id,
      }
    })

    // 4. Set HTTP-only session cookie ngay sau khi đăng ký thành công
    await setSessionCookie({
      userId: newUser.id,
      email: newUser.email,
      role: newUser.systemRole,
      name: newUser.name || '',
    })

    return {
      success: true,
      message: 'Đăng ký tài khoản thành công!',
      data: {
        id: newUser.id,
        email: newUser.email,
        lakeId: newUser.lakeId,
        organizationId: newUser.organizationId,
      }
    }
  } catch (error: any) {
    console.error('Register error:', error)
    return {
      success: false,
      message: 'Đã xảy ra lỗi hệ thống, vui lòng thử lại sau.'
    }
  }
}

export async function loginUser(input: { email: string; password: string }) {
  try {
    const email = input.email.trim().toLowerCase()
    const { password } = input

    if (!email || !password) {
      return { success: false, message: 'Vui lòng nhập đầy đủ email và mật khẩu.' }
    }

    const user = await prisma.user.findUnique({
      where: { email },
    })

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

    return { success: true, message: 'Đăng nhập thành công!' }
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

