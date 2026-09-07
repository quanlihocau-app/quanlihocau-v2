"use client";

import { useState } from "react";
import { SubscriptionModal } from "@/components/subscription/subscription-modal";

interface SubscriptionBannerProps {
    plan: "TRIAL" | "SILVER" | "GOLD";
    status: "TRIAL" | "ACTIVE" | "GRACE_PERIOD" | "SUSPENDED";
    expiresAt: string | null;
    spotsCount: number;
    staffCount: number;
    canManage: boolean;
}

export function SubscriptionBanner({
    plan,
    status,
    expiresAt,
    spotsCount,
    staffCount,
    canManage,
}: SubscriptionBannerProps) {
    const [isModalOpen, setIsModalOpen] = useState(false);

    const planNames = {
        TRIAL: "Dùng thử 7 ngày",
        SILVER: "Gói Bạc (Silver)",
        GOLD: "Gói Vàng (Gold)",
    };

    const planBadges = {
        TRIAL: "bg-blue-100 text-blue-800 border-blue-200",
        SILVER: "bg-slate-100 text-slate-800 border-slate-200",
        GOLD: "bg-amber-100 text-amber-900 border-amber-300 font-bold",
    };

    const formattedExpires = expiresAt
        ? new Date(expiresAt).toLocaleDateString("vi-VN", {
              day: "2-digit",
              month: "2-digit",
              year: "numeric",
          })
        : "Chưa kích hoạt";

    return (
        <>
            <div className="rounded-2xl border border-[#E3E8E3] bg-white p-4 shadow-xs">
                <div className="flex items-start justify-between">
                    <div>
                        <div className="flex items-center gap-2 flex-wrap">
                            <span className="text-base">👑</span>
                            <h2 className="text-sm font-bold text-[#17201A]">Gói cước dịch vụ</h2>
                            <span
                                className={`rounded-full border px-2.5 py-0.5 text-[11px] font-semibold ${planBadges[plan] || "bg-gray-100 text-gray-800"}`}
                            >
                                {planNames[plan] || plan}
                            </span>
                            {status === "SUSPENDED" && (
                                <span className="rounded-full border border-rose-200 bg-[#FCEEED] px-2.5 py-0.5 text-[11px] font-semibold text-[#D9534F]">
                                    Đã tạm ngưng
                                </span>
                            )}
                            {status === "GRACE_PERIOD" && (
                                <span className="rounded-full border border-amber-200 bg-[#FDF6E9] px-2.5 py-0.5 text-[11px] font-semibold text-[#D99A32]">
                                    Ân hạn
                                </span>
                            )}
                        </div>
                        <p className="mt-1 text-xs text-[#66716A]">
                            Hạn dùng: <strong className="text-[#17201A]">{formattedExpires}</strong>
                        </p>
                    </div>

                    {canManage && (
                        <button
                            type="button"
                            onClick={() => setIsModalOpen(true)}
                            className="rounded-full bg-[#4F9D5A] px-3.5 py-1.5 text-xs font-bold text-white hover:bg-[#246B38] active:scale-95 transition-all shadow-xs cursor-pointer"
                        >
                            Gia hạn / Nâng cấp
                        </button>
                    )}
                </div>

                {/* Quota breakdown */}
                <div className="mt-3 grid grid-cols-2 gap-2 border-t border-[#E3E8E3] pt-3 text-xs">
                    <div className="rounded-xl bg-[#F7F9F5] p-2.5 border border-[#E3E8E3]">
                        <span className="text-[#66716A] block text-[11px]">Số ô câu (Chòi)</span>
                        <span className="font-bold text-[#17201A]">
                            {spotsCount} {plan === "SILVER" ? "/ 30 ô" : "ô (Không giới hạn)"}
                        </span>
                    </div>

                    <div className="rounded-xl bg-[#F7F9F5] p-2.5 border border-[#E3E8E3]">
                        <span className="text-[#66716A] block text-[11px]">Tài khoản nhân sự</span>
                        <span className="font-bold text-[#17201A]">
                            {staffCount} {plan === "SILVER" ? "/ 1 nhân viên" : "nhân viên (Không giới hạn)"}
                        </span>
                    </div>
                </div>
            </div>

            <SubscriptionModal
                isOpen={isModalOpen}
                onClose={() => setIsModalOpen(false)}
                currentPlan={plan}
                currentExpiresAt={expiresAt}
            />
        </>
    );
}
