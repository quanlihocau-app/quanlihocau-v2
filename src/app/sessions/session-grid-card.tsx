"use client";

import React, { memo, useRef, useSyncExternalStore } from "react";
import { sessionTicker } from "@/lib/ticker/session-ticker";
import { SessionCountdown } from "./session-countdown";
import { sessionBalancePresentation } from "@/lib/money";
import type { SerializableSession } from "./sessions-client";

export function formatVnd(vnd: number): string {
    return new Intl.NumberFormat("vi-VN").format(vnd) + "đ";
}

export function formatDuration(minutes: number): string {
    const h = Math.floor(minutes / 60);
    const m = minutes % 60;
    if (m === 0) return `${h} giờ`;
    return `${h}h${m}p`;
}

export function formatDateTime(isoString: string): string {
    const date = new Date(isoString);
    const d = String(date.getDate()).padStart(2, "0");
    const m = String(date.getMonth() + 1).padStart(2, "0");
    const y = date.getFullYear();
    const hh = String(date.getHours()).padStart(2, "0");
    const mm = String(date.getMinutes()).padStart(2, "0");
    return `${hh}:${mm} - ${d}/${m}/${y}`;
}

export function formatOvertimeDuration(minutes: number): string {
    const h = Math.floor(minutes / 60);
    const m = minutes % 60;
    if (h === 0) return `${m}p`;
    if (m === 0) return `${h}h`;
    return `${h}h${m}p`;
}

// ── Hàm tính toán tài chính thống nhất cho phiên câu (bao gồm quá giờ thời gian thực) ─
export function computeSessionFinancials(s: SerializableSession, currentNowMs: number = Date.now()) {
    const invoice = s.invoices[0];
    const lines = invoice?.lines ?? [];
    const payments = invoice?.payments ?? [];

    const productLines = lines.filter(
        (l) =>
            l.productId !== null ||
            (!l.fishBuybackId &&
                !l.name.startsWith("Gia hạn:") &&
                !l.name.startsWith("Tiền ca:") &&
                !l.name.toLowerCase().includes("thêm giờ") &&
                !l.name.toLowerCase().includes("phụ trội") &&
                !l.name.toLowerCase().includes("quá giờ")),
    );
    const extensionLines = lines.filter((l) => l.name.startsWith("Gia hạn:"));
    const fishBuybackLines = lines.filter(
        (l) => l.fishBuybackId !== null || l.totalVnd < 0,
    );

    const recordedOvertimeLines = lines.filter(
        (l) =>
            !l.productId &&
            !l.fishBuybackId &&
            !l.name.toLowerCase().includes("gia hạn") &&
            (l.name.toLowerCase().includes("thêm giờ") ||
                l.name.toLowerCase().includes("phụ trội") ||
                l.name.toLowerCase().includes("quá giờ")),
    );
    const recordedOvertimeTotal = recordedOvertimeLines.reduce((sum, l) => sum + l.totalVnd, 0);

    const productCount = productLines.reduce(
        (sum, l) => sum + l.quantity,
        0,
    );
    const productsTotal = productLines.reduce(
        (sum, l) => sum + l.totalVnd,
        0,
    );
    const extensionsTotal = extensionLines.reduce(
        (sum, l) => sum + l.totalVnd,
        0,
    );
    const fishBuybackTotal = Math.abs(
        fishBuybackLines.reduce((sum, l) => sum + l.totalVnd, 0),
    );

    const extensionHours = extensionLines.length;

    const basePackagePrice =
        s.packagePriceVndSnapshot ?? s.package.priceVnd;
    const hutCount = Math.max(s.hutLinks.length, 1);
    const packageTotal = basePackagePrice * hutCount;

    // ── Tính phụ thu quá giờ theo thời gian thực ─────────────────────────────
    const plannedEndMs = new Date(s.plannedEndAt).getTime();
    const isOvertime = currentNowMs >= plannedEndMs;
    const overtimeRate = s.overtimeHourlyVndSnapshot ?? s.package.overtimeHourlyVnd ?? 0;

    let liveOvertimeMinutes = 0;
    let liveOvertimeVnd = 0;

    if (recordedOvertimeLines.length > 0) {
        // Có dòng quá giờ đã ghi nhận → dùng giá trị đó, không tự tính thêm
        liveOvertimeVnd = recordedOvertimeTotal;
        // Tính số phút quá giờ từ dòng đã ghi
        liveOvertimeMinutes = Math.round(
            recordedOvertimeLines.reduce((sum, l) => sum + l.quantity, 0) * 60,
        );
    }
    // Nếu hết giờ nhưng CHƯA có dòng quá giờ → GIỮ NGUYÊN tiền (không tự cộng thêm)
    // Chỉ gia hạn được xác nhận mới cộng tiền; kết thúc không tự thêm phụ thu.
    // Đồng hồ vẫn ghi nhận thời gian thực, kể cả thời gian chờ nhân viên.

    // Tổng chi phí = Tiền gói câu + Gia hạn + Sản phẩm/Dịch vụ + Phụ thu quá giờ
    const totalCharges = packageTotal + productsTotal + extensionsTotal + liveOvertimeVnd;

    // Tiền cọc / Đã thu trước (Prepaid) từ khách
    const paidIn = payments
        .filter((p) => p.direction === "IN")
        .reduce((sum, p) => sum + p.amountVnd, 0);
    const paidOut = payments
        .filter((p) => p.direction === "OUT")
        .reduce((sum, p) => sum + p.amountVnd, 0);
    const totalPaidFromPayments = Math.max(0, paidIn - paidOut);
    const paidAmountVnd =
        invoice?.paidAmountVnd !== undefined
            ? invoice.paidAmountVnd
            : totalPaidFromPayments;
    const totalPaid = paidAmountVnd;

    // Tổng giảm trừ = Tiền cọc/Thu trước (paidAmountVnd) + Tiền thu mua cá
    const totalDeductions = paidAmountVnd + fishBuybackTotal;

    // Số dư ròng = Tổng chi phí - Tổng giảm trừ
    const netBalance = totalCharges - totalDeductions;
    const elapsedOvertimeMs = isOvertime ? Math.max(0, currentNowMs - plannedEndMs) : 0;

    return {
        lines,
        payments,
        productLines,
        extensionLines,
        fishBuybackLines,
        recordedOvertimeLines,
        isOvertime,
        liveOvertimeMinutes,
        liveOvertimeVnd,
        overtimeRate,
        hutCount,
        productCount,
        productsTotal,
        totalProductsVnd: productsTotal,
        extensionsTotal,
        totalExtensionsVnd: extensionsTotal,
        fishBuybackTotal,
        extensionHours,
        packageTotal,
        totalCharges,
        paidAmountVnd,
        totalPaid,
        totalDeductions,
        netBalance,
        elapsedOvertimeMs,
    };
}

export interface SessionGridCardProps {
    session: SerializableSession;
    isSelected: boolean;
    nowMs: number;
    canComplete: boolean;
    onSelect: (id: string) => void;
    onLongPress: (session: SerializableSession) => void;
    onSettlement: (sessionId: string) => void;
    onExtend: (sessionId: string) => void;
}

const subscribeTicker = (listener: () => void) => sessionTicker.subscribe(listener);

function SessionGridCardComponent({
    session: s,
    isSelected,
    nowMs,
    canComplete,
    onSelect,
    onLongPress,
    onSettlement,
    onExtend,
}: SessionGridCardProps) {
    const holdTimerRef = useRef<NodeJS.Timeout | null>(null);
    const didLongPressRef = useRef<boolean>(false);
    const plannedEndMs = new Date(s.plannedEndAt).getTime();
    const isExpired = useSyncExternalStore(
        subscribeTicker,
        () => sessionTicker.getNowMs() >= plannedEndMs,
        () => nowMs >= plannedEndMs,
    );

    const hutLabel = s.hutLinks.map((hl) => hl.hut.name).join(" + ") || "—";
    const {
        productCount,
        extensionHours,
        liveOvertimeMinutes,
        liveOvertimeVnd,
        netBalance,
        elapsedOvertimeMs,
    } = computeSessionFinancials(s, nowMs);
    const balanceView = sessionBalancePresentation({
        netBalanceVnd: netBalance,
        elapsedOvertimeMs,
        recordedOvertimeVnd: liveOvertimeVnd,
    });

    // Every expired session requires an explicit finish or extension decision.
    const isPriceFreezed = isExpired;

    function startLongPress() {
        didLongPressRef.current = false;
        if (holdTimerRef.current) {
            clearTimeout(holdTimerRef.current);
        }
        holdTimerRef.current = setTimeout(() => {
            didLongPressRef.current = true;
            onSelect(s.id);
            onLongPress(s);
        }, 550);
    }

    function cancelLongPress() {
        if (holdTimerRef.current) {
            clearTimeout(holdTimerRef.current);
            holdTimerRef.current = null;
        }
    }

    return (
        <div
            role="button"
            tabIndex={0}
            aria-pressed={isSelected}
            aria-label={`Chọn ô ${hutLabel}`}
            onPointerDown={startLongPress}
            onPointerUp={cancelLongPress}
            onPointerLeave={cancelLongPress}
            onPointerCancel={cancelLongPress}
            onContextMenu={(e) => e.preventDefault()}
            onClick={() => {
                if (didLongPressRef.current) {
                    didLongPressRef.current = false;
                    return;
                }
                onSelect(s.id);
            }}
            onKeyDown={(e) => {
                if (e.target !== e.currentTarget) return;
                if (e.key === "Enter" || e.key === " ") {
                    e.preventDefault();
                    onSelect(s.id);
                }
            }}
            className={`group relative flex flex-col justify-between rounded-xl p-2 sm:p-2.5 text-left transition-all select-none cursor-pointer border font-serif ${
                isSelected
                    ? "border-2 border-[#16A34A] bg-[#F0FDF4] ring-2 ring-[#16A34A]/20 shadow-md"
                    : "border-slate-200/90 bg-white hover:border-[#16A34A]/60 hover:bg-slate-50/40 shadow-2xs"
            }`}
        >
            {/* Top row: Hut label, Payment status, Package duration */}
            <div>
                <div className="flex items-center justify-between gap-1 mb-1">
                    <span className="text-xs sm:text-sm font-bold text-[#0F172A] leading-tight truncate">
                        {hutLabel}
                    </span>
                    <div className="flex items-center gap-1 shrink-0">
                        {s.paymentTiming === "PREPAID" ? (
                            <span className="rounded-full bg-[#DCFCE7] px-1.5 py-0.2 text-[9px] font-bold text-[#16A34A] border border-[#BBF7D0]">
                                Đã thu trước
                            </span>
                        ) : (
                            <span className="rounded-full bg-[#FFFBEB] px-1.5 py-0.2 text-[9px] font-bold text-[#D97706] border border-[#FDE68A]">
                                Thu sau
                            </span>
                        )}
                        <span className="text-[10px] font-semibold text-slate-500">
                            {formatDuration(s.package.durationMinutes)}
                        </span>
                    </div>
                </div>

                {/* Customer name */}
                <p className="text-[11px] font-semibold text-[#1A1A1A] truncate mb-1">
                    {s.customer?.name ?? <span className="font-normal text-slate-400">Khách lẻ</span>}
                </p>
            </div>

            {/* Middle: Countdown timer */}
            <div className="my-0.5">
                <SessionCountdown plannedEndAt={s.plannedEndAt} />
                {isPriceFreezed && (
                    <div className="mt-1 flex items-center gap-1 rounded-xs border border-red-300 bg-red-50 px-1 py-0.5">
                        <span className="h-1.5 w-1.5 shrink-0 rounded-full bg-red-500 animate-pulse" />
                        <span className="text-[9px] font-bold text-red-700 leading-tight truncate">
                            HẾT GIỜ — Chờ kết thúc/gia hạn
                        </span>
                    </div>
                )}
            </div>

            {/* Bottom: Financial summary & mini tags */}
            <div className="mt-1 pt-1 border-t border-slate-100/90">
                <div
                    className={`rounded-xs px-1.5 py-0.5 border flex items-center justify-between font-serif text-[11px] ${
                        balanceView.kind === "refund"
                            ? "bg-[#FBEBEB] border-[#E9B6B7] text-[#9E2A2B]"
                            : balanceView.kind === "due"
                            ? "bg-[#FDF7EB] border-[#E8D1A3] text-[#8C5C00]"
                            : balanceView.kind === "unbilled-overtime"
                            ? "bg-[#FDF7EB] border-[#E8D1A3] text-[#8C5C00]"
                            : "bg-[#EAEFEA] border-[#B8CEB8] text-[#2C4C3B]"
                    }`}
                >
                    <span className="text-[10px] font-bold">
                        {balanceView.label}
                    </span>
                    {balanceView.showAmount && (
                        <span className="font-bold">
                            {netBalance < 0
                                ? `-${formatVnd(Math.abs(netBalance))}`
                                : `+${formatVnd(netBalance)}`}
                        </span>
                    )}
                </div>

                {/* Mini chips if items, extension, or overtime exist */}
                {(productCount > 0 || extensionHours > 0 || liveOvertimeVnd > 0) && (
                    <div className="flex flex-wrap gap-1 mt-1">
                        {liveOvertimeVnd > 0 && (
                            <span className="inline-flex items-center rounded-xs bg-[#FDF7EB] border border-[#E8D1A3] px-1 py-0.2 text-[9px] font-bold text-[#8C5C00]">
                                ⏱️ +{formatOvertimeDuration(liveOvertimeMinutes)}
                            </span>
                        )}
                        {productCount > 0 && (
                            <span className="inline-flex items-center rounded-xs bg-slate-100 border border-slate-200 px-1 py-0.2 text-[9px] font-bold text-slate-700">
                                +{productCount} món
                            </span>
                        )}
                        {extensionHours > 0 && (
                            <span className="inline-flex items-center rounded-xs bg-[#EAEFEA] border border-[#B8CEB8] px-1 py-0.2 text-[9px] font-bold text-[#2C4C3B]">
                                +{extensionHours}h gh
                            </span>
                        )}
                    </div>
                )}

                {/* Quick settlement / extension button */}
                {canComplete && isExpired ? (
                    <div className="mt-1.5 grid grid-cols-2 gap-1" onPointerDown={(e) => e.stopPropagation()}>
                        <button
                            type="button"
                            onClick={(e) => {
                                e.stopPropagation();
                                onSettlement(s.id);
                            }}
                            className="flex items-center justify-center rounded-xl bg-[#DC2626] py-1.5 px-2 text-[11px] font-bold text-white hover:bg-[#B91C1C] transition-all cursor-pointer font-serif active:scale-[0.98]"
                        >
                            Kết thúc
                        </button>
                        <button
                            type="button"
                            onClick={(e) => {
                                e.stopPropagation();
                                onExtend(s.id);
                            }}
                            className="flex items-center justify-center rounded-xl bg-[#16A34A] py-1.5 px-2 text-[11px] font-bold text-white hover:bg-[#15803D] transition-all cursor-pointer font-serif active:scale-[0.98]"
                        >
                            Gia hạn thêm giờ
                        </button>
                    </div>
                ) : canComplete && (
                    <div className="mt-1.5" onPointerDown={(e) => e.stopPropagation()}>
                        <button
                            type="button"
                            onClick={(e) => {
                                e.stopPropagation();
                                onSettlement(s.id);
                            }}
                            className={`flex w-full items-center justify-center gap-1 rounded-xl py-1.5 px-2 text-[11px] font-bold text-white transition-all cursor-pointer font-serif active:scale-[0.98] ${
                                netBalance < 0
                                    ? "bg-[#DC2626] hover:bg-[#B91C1C]"
                                    : "bg-[#16A34A] hover:bg-[#15803D]"
                            }`}
                        >
                            <span>
                                {netBalance < 0
                                    ? `Thối -${formatVnd(Math.abs(netBalance))}`
                                    : netBalance > 0
                                    ? `Thu +${formatVnd(netBalance)}`
                                    : "Kết thúc & In"}
                            </span>
                        </button>
                    </div>
                )}
            </div>
        </div>
    );
}

export const SessionGridCard = memo(SessionGridCardComponent, (prev, next) => {
    if (prev.isSelected !== next.isSelected) return false;
    if (prev.canComplete !== next.canComplete) return false;
    if (prev.session !== next.session) return false;
    // Re-render khi:
    //   1. Chuyển trạng thái từ trong giờ → hết giờ (để hiện badge cảnh báo)
    //   2. Phút quá giờ thay đổi (chỉ khi đã ghi nhận dòng quá giờ)
    //   3. Số dư thay đổi
    if (prev.nowMs !== next.nowMs) {
        const prevFin = computeSessionFinancials(prev.session, prev.nowMs);
        const nextFin = computeSessionFinancials(next.session, next.nowMs);
        // Kiểm tra có vừa chuyển sang trạng thái hết giờ không
        if (prevFin.isOvertime !== nextFin.isOvertime) return false;
        if (
            prevFin.liveOvertimeMinutes !== nextFin.liveOvertimeMinutes ||
            prevFin.netBalance !== nextFin.netBalance
        ) {
            return false;
        }
    }
    return true;
});
