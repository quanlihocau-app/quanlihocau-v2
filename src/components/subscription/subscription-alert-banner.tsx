"use client";

import { useState } from "react";
import { SubscriptionModal } from "@/components/subscription/subscription-modal";
import type { SubscriptionAccess } from "@/lib/subscription-access";

interface SubscriptionAlertBannerProps {
    subscriptionPlan: string;
    subscriptionStatus: string;
    subscriptionExpiresAt: string | null;
    subscriptionAccess: SubscriptionAccess;
    canManage?: boolean;
}

export function SubscriptionAlertBanner({
    subscriptionPlan,
    subscriptionStatus,
    subscriptionExpiresAt,
    subscriptionAccess,
    canManage = true,
}: SubscriptionAlertBannerProps) {
    const [isModalOpen, setIsModalOpen] = useState(false);

    if (!subscriptionExpiresAt && subscriptionAccess !== "locked") {
        return null;
    }

    const now = new Date();
    const expiresDate = subscriptionExpiresAt ? new Date(subscriptionExpiresAt) : null;
    const diffMs = expiresDate ? expiresDate.getTime() - now.getTime() : -1;
    const daysRemaining = expiresDate ? Math.ceil(diffMs / (1000 * 60 * 60 * 24)) : 0;

    const formattedDate = expiresDate
        ? expiresDate.toLocaleDateString("vi-VN", {
              day: "2-digit",
              month: "2-digit",
              year: "numeric",
          })
        : "Đã hết hạn";

    const planLabel =
        subscriptionPlan === "GOLD"
            ? "Gói Vàng (Gold)"
            : subscriptionPlan === "SILVER"
            ? "Gói Bạc (Silver)"
            : "Dùng thử 30 ngày (Trial)";

    // Trạng thái 1: Bị khóa do quá hạn & hết ân hạn
    if (subscriptionAccess === "locked" || subscriptionStatus === "SUSPENDED") {
        return (
            <>
                <div className="rounded-2xl border-2 border-rose-300 bg-[#FFF1F0] p-3.5 sm:p-4 text-xs font-serif shadow-xs animate-in fade-in">
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                        <div className="flex items-start gap-2.5">
                            <span className="text-xl shrink-0">🚨</span>
                            <div>
                                <h4 className="font-bold text-[#8B1E1E] text-sm">
                                    Hồ câu đã hết hạn gói cước ({planLabel})
                                </h4>
                                <p className="text-[#A8071A] mt-0.5 leading-relaxed">
                                    Tính năng mở vé mới và ghi nhận thu chi tạm thời bị khóa. Vui lòng thanh toán gia hạn bằng VietQR để mở khóa ngay lập tức.
                                </p>
                            </div>
                        </div>

                        {canManage && (
                            <button
                                type="button"
                                onClick={() => setIsModalOpen(true)}
                                className="inline-flex items-center justify-center gap-1.5 rounded-xl bg-[#8B1E1E] hover:bg-[#A8071A] text-white px-4 py-2 font-bold text-xs shadow-xs active:scale-95 transition-all shrink-0 cursor-pointer"
                            >
                                <span>⚡ Gia hạn ngay bằng VietQR</span>
                            </button>
                        )}
                    </div>
                </div>

                <SubscriptionModal
                    isOpen={isModalOpen}
                    onClose={() => setIsModalOpen(false)}
                    currentPlan={subscriptionPlan as "TRIAL" | "SILVER" | "GOLD"}
                    currentExpiresAt={subscriptionExpiresAt}
                />
            </>
        );
    }

    // Trạng thái 2: Đang trong thời gian ân hạn 3 ngày (Grace Period)
    if (subscriptionAccess === "grace") {
        return (
            <>
                <div className="rounded-2xl border border-amber-300 bg-[#FFFBE6] p-3.5 sm:p-4 text-xs font-serif shadow-xs animate-in fade-in">
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                        <div className="flex items-start gap-2.5">
                            <span className="text-xl shrink-0">⏳</span>
                            <div>
                                <h4 className="font-bold text-[#D48806] text-sm">
                                    Gói cước đã hết hạn · Đang được ân hạn 3 ngày
                                </h4>
                                <p className="text-[#874D00] mt-0.5 leading-relaxed">
                                    Hồ vẫn hoạt động bình thường, nhưng sẽ bị khóa sau khi hết thời gian ân hạn. Hãy gia hạn sớm để tránh gián đoạn các phiên câu.
                                </p>
                            </div>
                        </div>

                        {canManage && (
                            <button
                                type="button"
                                onClick={() => setIsModalOpen(true)}
                                className="inline-flex items-center justify-center gap-1.5 rounded-xl bg-[#D48806] hover:bg-[#AD6800] text-white px-4 py-2 font-bold text-xs shadow-xs active:scale-95 transition-all shrink-0 cursor-pointer"
                            >
                                <span>Thanh toán gia hạn ngay</span>
                            </button>
                        )}
                    </div>
                </div>

                <SubscriptionModal
                    isOpen={isModalOpen}
                    onClose={() => setIsModalOpen(false)}
                    currentPlan={subscriptionPlan as "TRIAL" | "SILVER" | "GOLD"}
                    currentExpiresAt={subscriptionExpiresAt}
                />
            </>
        );
    }

    // Trạng thái 3: Sắp hết hạn trong vòng 7 ngày tới
    if (daysRemaining <= 7 && daysRemaining >= 0) {
        const isUrgent = daysRemaining <= 3;
        return (
            <>
                <div
                    className={`rounded-2xl border p-3.5 sm:p-4 text-xs font-serif shadow-xs animate-in fade-in ${
                        isUrgent
                            ? "border-amber-300 bg-[#FFFBE6] text-[#874D00]"
                            : "border-emerald-200 bg-[#F6FAF5] text-[#2C4C3B]"
                    }`}
                >
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                        <div className="flex items-start gap-2.5">
                            <span className="text-xl shrink-0">👑</span>
                            <div>
                                <h4 className="font-bold text-sm">
                                    Gói cước {planLabel} còn {daysRemaining === 0 ? "hôm nay là hết hạn" : `${daysRemaining} ngày nữa`} (ngày {formattedDate})
                                </h4>
                                <p className="mt-0.5 opacity-90 leading-relaxed">
                                    Gia hạn nối tiếp ngay hôm nay. Số ngày còn lại sẽ được cộng dồn đầy đủ, không bị mất hạn cũ.
                                </p>
                            </div>
                        </div>

                        {canManage && (
                            <button
                                type="button"
                                onClick={() => setIsModalOpen(true)}
                                className="inline-flex items-center justify-center gap-1.5 rounded-xl bg-[#2C4C3B] hover:bg-[#1E362A] text-white px-4 py-2 font-bold text-xs shadow-xs active:scale-95 transition-all shrink-0 cursor-pointer"
                            >
                                <span>Gia hạn / Nâng cấp</span>
                            </button>
                        )}
                    </div>
                </div>

                <SubscriptionModal
                    isOpen={isModalOpen}
                    onClose={() => setIsModalOpen(false)}
                    currentPlan={subscriptionPlan as "TRIAL" | "SILVER" | "GOLD"}
                    currentExpiresAt={subscriptionExpiresAt}
                />
            </>
        );
    }

    // Trạng thái 4: Đang dùng thử miễn phí TRIAL (> 7 ngày)
    if (subscriptionPlan === "TRIAL") {
        return (
            <>
                <div className="rounded-2xl border border-emerald-200/80 bg-[#F6FAF5] p-3 text-xs font-serif flex items-center justify-between gap-3">
                    <div className="flex items-center gap-2">
                        <span className="text-base">🎁</span>
                        <span className="text-[#2C4C3B]">
                            Đang dùng thử miễn phí 30 ngày (còn <strong>{daysRemaining} ngày</strong> · đến ngày {formattedDate}).
                        </span>
                    </div>
                    {canManage && (
                        <button
                            type="button"
                            onClick={() => setIsModalOpen(true)}
                            className="rounded-lg bg-[#2C4C3B] hover:bg-[#1E362A] text-white px-3 py-1 font-bold text-[11px] shrink-0 cursor-pointer"
                        >
                            Nâng cấp gói
                        </button>
                    )}
                </div>

                <SubscriptionModal
                    isOpen={isModalOpen}
                    onClose={() => setIsModalOpen(false)}
                    currentPlan="TRIAL"
                    currentExpiresAt={subscriptionExpiresAt}
                />
            </>
        );
    }

    return null;
}

