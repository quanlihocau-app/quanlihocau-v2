"use client";

import React, { memo, useRef } from "react";
import { SessionCountdown } from "./session-countdown";
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
    const isOvertime = currentNowMs > plannedEndMs;
    const overtimeRate = s.overtimeHourlyVndSnapshot ?? s.package.overtimeHourlyVnd ?? 0;

    let liveOvertimeMinutes = 0;
    let liveOvertimeVnd = 0;

    if (recordedOvertimeLines.length > 0) {
        liveOvertimeVnd = recordedOvertimeTotal;
    } else if (isOvertime && overtimeRate > 0) {
        const diffMs = currentNowMs - plannedEndMs;
        liveOvertimeMinutes = Math.floor(diffMs / 60_000);
        if (liveOvertimeMinutes > 0) {
            liveOvertimeVnd = Math.round((liveOvertimeMinutes / 60) * overtimeRate * hutCount);
        }
    }

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
}

function SessionGridCardComponent({
    session: s,
    isSelected,
    nowMs,
    canComplete,
    onSelect,
    onLongPress,
    onSettlement,
}: SessionGridCardProps) {
    const holdTimerRef = useRef<NodeJS.Timeout | null>(null);
    const didLongPressRef = useRef<boolean>(false);

    const hutLabel = s.hutLinks.map((hl) => hl.hut.name).join(" + ") || "—";
    const {
        productLines,
        fishBuybackTotal,
        productCount,
        extensionHours,
        liveOvertimeMinutes,
        liveOvertimeVnd,
        totalCharges,
        totalPaid,
        netBalance,
    } = computeSessionFinancials(s, nowMs);

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
                if (e.key === "Enter" || e.key === " ") {
                    e.preventDefault();
                    onSelect(s.id);
                }
            }}
            className={`flex flex-col justify-between rounded-xs bg-white p-3 text-left transition-colors select-none cursor-pointer border font-serif ${
                isSelected
                    ? "border-2 border-[#2C4C3B] bg-[#EAEFEA]"
                    : "border-[#CCCCCC] hover:border-[#2C4C3B]"
            }`}
        >
            {/* Hàng 1: Mã ô & Thời lượng & Trạng thái thu tiền */}
            <div>
                <div className="flex items-start justify-between gap-1 mb-1">
                    <span className="text-sm font-bold text-[#1A1A1A] leading-tight truncate font-serif">
                        {hutLabel}
                    </span>
                    <div className="flex items-center gap-1 shrink-0">
                        {s.paymentTiming === "PREPAID" ? (
                            <span className="rounded-xs bg-[#EAEFEA] px-1.5 py-0.2 text-[9px] font-bold text-[#2C4C3B] border border-[#B8CEB8]">
                                Đã thu trước
                            </span>
                        ) : (
                            <span className="rounded-xs bg-[#FDF7EB] px-1.5 py-0.2 text-[9px] font-bold text-[#8C5C00] border border-[#E8D1A3]">
                                Thu sau
                            </span>
                        )}
                        <span className="text-[11px] font-semibold text-[#555555]">
                            {formatDuration(s.package.durationMinutes)}
                        </span>
                    </div>
                </div>

                {/* Hàng 2: Tên khách hàng */}
                <p className="text-xs font-bold text-[#1A1A1A] truncate mb-1.5 font-serif">
                    {s.customer?.name ?? (
                        <span className="font-normal text-[#555555]">
                            Khách lẻ
                        </span>
                    )}
                </p>
            </div>

            {/* Hàng 3: Đồng hồ đếm ngược */}
            <div className="my-1">
                <SessionCountdown plannedEndAt={s.plannedEndAt} />
            </div>

            {/* Hàng 4: Chi tiết bill & Kết quả */}
            <div className="mt-1.5 pt-1.5 border-t border-[#E0E0E0] font-serif">
                {fishBuybackTotal > 0 || totalPaid > 0 || liveOvertimeVnd > 0 ? (
                    <div className="space-y-0.5 text-[10px] text-[#555555] mb-1 bg-[#FAFAF7] p-1.5 rounded-xs border border-[#E0E0E0] font-serif">
                        <div className="flex items-center justify-between">
                            <span className="text-[#555555]">Tổng chi phí:</span>
                            <span className="font-serif text-[#1A1A1A] font-bold">+{formatVnd(totalCharges)}</span>
                        </div>
                        {liveOvertimeVnd > 0 && (
                            <div className="flex items-center justify-between text-[#8C5C00] font-bold">
                                <span>⏱️ Quá giờ {liveOvertimeMinutes > 0 ? `(+${formatOvertimeDuration(liveOvertimeMinutes)})` : ""}:</span>
                                <span className="font-serif">+{formatVnd(liveOvertimeVnd)}</span>
                            </div>
                        )}
                        {totalPaid > 0 && (
                            <div className="flex items-center justify-between text-[#2C4C3B]">
                                <span>Đã thu trước:</span>
                                <span className="font-serif font-medium">-{formatVnd(totalPaid)}</span>
                            </div>
                        )}
                        {fishBuybackTotal > 0 && (
                            <div className="flex items-center justify-between text-[#9E2A2B]">
                                <span className="font-semibold">Tiền thu cá:</span>
                                <span className="font-serif font-bold">-{formatVnd(fishBuybackTotal)}</span>
                            </div>
                        )}
                    </div>
                ) : (
                    <div className="flex items-center justify-between text-xs mb-1">
                        <span className="text-[#555555] font-normal">Tiền gói:</span>
                        <span className="font-serif font-bold text-[#1A1A1A]">+{formatVnd(totalCharges)}</span>
                    </div>
                )}

                {/* Kết quả quyết toán */}
                <div
                    className={`rounded-xs px-2 py-0.5 border flex items-center justify-between font-serif ${
                        netBalance < 0
                            ? "bg-[#FBEBEB] border-[#E9B6B7] text-[#9E2A2B]"
                            : netBalance === 0
                            ? "bg-[#EAEFEA] border-[#B8CEB8] text-[#2C4C3B]"
                            : "bg-[#FDF7EB] border-[#E8D1A3] text-[#8C5C00]"
                    }`}
                >
                    <span className="text-[11px] font-bold">
                        {netBalance < 0
                            ? "Thối lại:"
                            : netBalance === 0
                            ? "Đã đủ:"
                            : "Cần thu:"}
                    </span>
                    <span
                        className={`font-serif font-bold text-[11px] sm:text-xs ${
                            netBalance < 0
                                ? "text-[#9E2A2B]"
                                : netBalance === 0
                                ? "text-[#2C4C3B]"
                                : "text-[#8C5C00]"
                        }`}
                    >
                        {netBalance < 0
                            ? `-${formatVnd(Math.abs(netBalance))}`
                            : netBalance === 0
                            ? "0 đ"
                            : `+${formatVnd(netBalance)}`}
                    </span>
                </div>

                {/* Badges tóm tắt món / gia hạn / quá giờ */}
                {(productCount > 0 || extensionHours > 0 || liveOvertimeVnd > 0) && (
                    <div className="flex flex-wrap gap-1 mt-1">
                        {liveOvertimeVnd > 0 && (
                            <span className="inline-flex items-center rounded-xs bg-[#FDF7EB] border border-[#E8D1A3] px-1.5 py-0.2 text-[10px] font-bold text-[#8C5C00]">
                                ⏱️ +{formatOvertimeDuration(liveOvertimeMinutes)} quá giờ
                            </span>
                        )}
                        {productCount > 0 && (
                            <span className="inline-flex items-center rounded-xs bg-[#F2F2F0] border border-[#CCCCCC] px-1.5 py-0.2 text-[10px] font-bold text-[#1A1A1A]">
                                +{productCount} món
                            </span>
                        )}
                        {extensionHours > 0 && (
                            <span className="inline-flex items-center rounded-xs bg-[#EAEFEA] border border-[#B8CEB8] px-1.5 py-0.2 text-[10px] font-bold text-[#2C4C3B]">
                                +{extensionHours} gia hạn
                            </span>
                        )}
                    </div>
                )}

                {/* Tên món mới nhất */}
                {productLines.length > 0 && (
                    <p className="text-[11px] text-[#555555] truncate mt-1 font-serif">
                        {productLines[0].name}
                        {productLines.length > 1 ? ` +${productLines.length - 1}` : ""}
                    </p>
                )}

                {/* Nút Thanh toán & In bill trực tiếp trên ô */}
                {canComplete && (
                    <button
                        type="button"
                        onClick={(e) => {
                            e.stopPropagation();
                            onSettlement(s.id);
                        }}
                        className={`mt-2 flex w-full items-center justify-center gap-1.5 rounded-xs py-2 px-2 text-[11px] sm:text-xs font-bold text-white transition-colors cursor-pointer font-serif active:translate-y-px ${
                            netBalance < 0
                                ? "bg-[#9E2A2B] hover:bg-[#832324]"
                                : netBalance === 0
                                ? "bg-[#2C4C3B] hover:bg-[#233D2F]"
                                : "bg-[#2C4C3B] hover:bg-[#233D2F]"
                        }`}
                    >
                        <svg className="h-3.5 w-3.5 shrink-0" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" d="M2.25 18.75a60.07 60.07 0 0 1 15.797 2.101c.727.198 1.453-.342 1.453-1.096V18.75M3.75 4.5v.75A.75.75 0 0 1 3 6H2.25m0 0H3m-1.5 0h1.5m0 0v10.5m0 0h1.5m-1.5 0H2.25m0 0a.75.75 0 0 0 .75.75h.75m10.5-12v.75a.75.75 0 0 1-.75.75h-.75m0 0h.75m-1.5 0h1.5m0 0v10.5m0 0h1.5m-1.5 0h-.75m0 0a.75.75 0 0 0 .75.75h.75M6 10.5h12m-12 3h12" />
                        </svg>
                        <span className="truncate">
                            {netBalance < 0
                                ? `Thối -${formatVnd(Math.abs(netBalance))} & In`
                                : netBalance > 0
                                ? `Thu +${formatVnd(netBalance)} & In`
                                : `Kết thúc & In bill`}
                        </span>
                    </button>
                )}
            </div>
        </div>
    );
}

export const SessionGridCard = memo(SessionGridCardComponent, (prev, next) => {
    if (prev.isSelected !== next.isSelected) return false;
    if (prev.canComplete !== next.canComplete) return false;
    if (prev.session !== next.session) return false;
    // Chỉ re-render khi phút quá giờ hoặc số dư thực tế thay đổi
    if (prev.nowMs !== next.nowMs) {
        const prevFin = computeSessionFinancials(prev.session, prev.nowMs);
        const nextFin = computeSessionFinancials(next.session, next.nowMs);
        if (
            prevFin.liveOvertimeMinutes !== nextFin.liveOvertimeMinutes ||
            prevFin.netBalance !== nextFin.netBalance
        ) {
            return false;
        }
    }
    return true;
});
