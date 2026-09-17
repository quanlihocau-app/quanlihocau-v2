import { Role, SystemRole } from "@/generated/prisma/client";

export interface UserListItem {
    id: string;
    name: string;
    email: string;
    phone: string | null;
    phoneVerified: boolean;
    systemRole: SystemRole;
    isLocked: boolean;
    lockedAt: string | null;
    lockedReason: string | null;
    lastLoginAt: string | null;
    createdAt: string;
    visualStatus: string;
    organization: {
        id: string;
        name: string;
    } | null;
    lake: {
        id: string;
        name: string;
        subscriptionStatus: string;
        subscriptionPlan: string;
        subscriptionExpiresAt: string | null;
    } | null;
    role: Role | null;
    membershipCount: number;
}

export interface UserAdminStats {
    totalUsers: number;
    totalOrganizations: number;
    totalLakes: number;
    newUsersPeriod: number;
    trialUsers: number;
    activeUsers: number;
    expiringSoonUsers: number;
    expiredUsers: number;
    lockedUsers: number;
    recentlyActiveUsers: number;
}

export interface AvailablePlan {
    id: string;
    code: string;
    name: string;
    priceVnd: number;
    durationDays: number;
    description: string | null;
}

export interface UserDetailData {
    id: string;
    name: string;
    email: string;
    phone: string | null;
    phoneVerified: boolean;
    phoneVerifiedAt: string | null;
    systemRole: SystemRole;
    isLocked: boolean;
    lockedAt: string | null;
    lockedReason: string | null;
    lastLoginAt: string | null;
    sessionVersion: number;
    createdAt: string;
    updatedAt: string;
    primaryLake: {
        id: string;
        name: string;
        subscriptionStatus: string;
        subscriptionPlan: string;
        subscriptionExpiresAt: string | null;
    } | null;
    daysRemaining: number | null;
    memberships: Array<{
        id: string;
        role: Role;
        createdAt: string;
        lake: {
            id: string;
            name: string;
            subscriptionStatus: string;
            subscriptionPlan: string;
            subscriptionExpiresAt: string | null;
            organization: {
                id: string;
                name: string;
                subscriptionPlan: string;
                validUntil: string | null;
            };
        };
    }>;
    orders: Array<{
        id: string;
        orderCode: string;
        planCode: string;
        amountVnd: number;
        durationDays: number;
        status: string;
        paymentMethod: string;
        paidAt: string | null;
        createdAt: string;
    }>;
    auditLogs: Array<{
        id: string;
        action: string;
        createdBy: string;
        createdAt: string;
        payload: Record<string, unknown>;
    }>;
}
