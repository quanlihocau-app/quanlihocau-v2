"use client";

import Link from "next/link";
import dynamic from "next/dynamic";
import { useRouter } from "next/navigation";
import { useCallback, useEffect, useRef, useState } from "react";

import { SessionActions } from "./session-actions";
import {
    SessionGridCard,
    computeSessionFinancials,
    formatVnd,
    formatDuration,
    formatDateTime,
    formatOvertimeDuration,
} from "./session-grid-card";
import { useNetworkStatus } from "@/lib/network/use-network-status";
import { useModalDismiss } from "@/hooks/use-modal-dismiss";
import type { ActionPackage } from "./session-actions";

const SettlementCheckoutModal = dynamic(
    () =>
        import("./settlement-checkout-modal").then(
            (m) => m.SettlementCheckoutModal,
        ),
    { ssr: false },
);

// ── Serializable types ────────────────────────────────────────────────────────
export interface SerializableInvoiceLine {
    id: string;
    productId: string | null;
    fishBuybackId: string | null;
    name: string;
    unitPrice: number;
    quantity: number;
    totalVnd: number;
    createdAt: string;
    product?: {
        id: string;
        name: string;
        priceVnd: number;
    } | null;
    fishBuyback?: {
        id: string;
        weight: number;
        pricePerKg: number;
        totalVnd: number;
        fishType: {
            id: string;
            name: string;
        };
    } | null;
}

export interface SerializablePayment {
    id: string;
    amountVnd: number;
    method: "CASH" | "BANK_TRANSFER";
    direction: "IN" | "OUT";
    createdAt: string;
}

export interface SerializableSession {
    id: string;
    paymentTiming?: "PREPAID" | "POSTPAID";
    startAt: string;
    plannedEndAt: string;
    customer: {
        id: string;
        name: string;
        phoneNormalized: string | null;
    } | null;
    package: {
        id: string;
        name: string;
        durationMinutes: number;
        priceVnd: number;
        overtimeHourlyVnd?: number;
    };
    packageNameSnapshot?: string;
    packageDurationMinutesSnapshot?: number;
    packagePriceVndSnapshot?: number;
    overtimeHourlyVndSnapshot?: number;
    hutLinks: Array<{
        hut: {
            id: string;
            name: string;
            area: { id: string; name: string } | null;
        };
    }>;
    invoices: Array<{
        id: string;
        totalAmountVnd: number;
        paidAmountVnd?: number;
        lines?: SerializableInvoiceLine[];
        payments?: SerializablePayment[];
    }>;
}

export interface SerializableFishType {
    id: string;
    name: string;
    pricePerKg: number;
}

export type SerializablePackage = ActionPackage;

interface SessionsClientProps {
    activeSessions: SerializableSession[];
    packages: SerializablePackage[];
    fishTypes?: SerializableFishType[];
    canComplete: boolean;
    canCancel: boolean;
    canOpenSession: boolean;
}



export function SessionsClient({
    activeSessions,
    packages,
    fishTypes = [],
    canComplete,
    canCancel,
    canOpenSession,
}: SessionsClientProps) {
    const router = useRouter();
    const [sessions, setSessions] = useState<SerializableSession[]>(activeSessions);
    const [prevActiveSessions, setPrevActiveSessions] = useState(activeSessions);
    const [selectedId, setSelectedId] = useState<string>(
        activeSessions[0]?.id ?? "",
    );
    const [settlementSessionId, setSettlementSessionId] = useState<string | null>(null);

    if (activeSessions !== prevActiveSessions) {
        setPrevActiveSessions(activeSessions);
        setSessions(activeSessions);
    }

    // Modal Chi tiết phiên câu khi nhấn giữ
    const [detailSession, setDetailSession] = useState<SerializableSession | null>(null);

    const { onBackdropClick: onDetailBackdropClick } = useModalDismiss({
        isOpen: Boolean(detailSession),
        onClose: () => setDetailSession(null),
    });

    // ── Đồng hồ thời gian thực đồng bộ máy chủ để tính phụ thu quá giờ ───────
    const { isOnline, serverOffsetMs } = useNetworkStatus();
    const [nowMs, setNowMs] = useState(() => Date.now() + (serverOffsetMs || 0));

    useEffect(() => {
        const timer = setInterval(() => {
            setNowMs(Date.now() + (serverOffsetMs || 0));
        }, 10_000);
        return () => clearInterval(timer);
    }, [serverOffsetMs]);

    const selectedSession =
        sessions.find((s) => s.id === selectedId) ??
        sessions[0] ??
        null;
    const selectedSessionFinancials = selectedSession
        ? computeSessionFinancials(selectedSession, nowMs)
        : null;

    // ── Auto Re-sync khi có mạng lại hoặc khi mở lại màn hình ─────────────────
    const wasOfflineRef = useRef(false);
    const lastSyncTimeRef = useRef(0);

    useEffect(() => {
        lastSyncTimeRef.current = Date.now();
    }, []);

    useEffect(() => {
        if (!isOnline) {
            wasOfflineRef.current = true;
        } else if (wasOfflineRef.current) {
            wasOfflineRef.current = false;
            // Vừa khôi phục kết nối mạng -> Làm mới danh sách phiên câu
            router.refresh();
            lastSyncTimeRef.current = Date.now();
        }
    }, [isOnline, router]);

    useEffect(() => {
        const handleVisibilityOrFocus = () => {
            if (document.visibilityState === "visible") {
                const now = Date.now();
                // Nếu quay lại sau hơn 30 giây thì refresh lại dữ liệu các ô câu
                if (now - lastSyncTimeRef.current > 30_000) {
                    lastSyncTimeRef.current = now;
                    router.refresh();
                }
            }
        };

        document.addEventListener("visibilitychange", handleVisibilityOrFocus);
        window.addEventListener("focus", handleVisibilityOrFocus);
        return () => {
            document.removeEventListener("visibilitychange", handleVisibilityOrFocus);
            window.removeEventListener("focus", handleVisibilityOrFocus);
        };
    }, [router]);

    const handleSelect = useCallback((id: string) => {
        setSelectedId(id);
    }, []);

    const handleLongPress = useCallback((session: SerializableSession) => {
        setDetailSession(session);
    }, []);

    const handleSettlement = useCallback((id: string) => {
        setSettlementSessionId(id);
    }, []);

    // ── Optimistic UI Handlers (Cập nhật tức thì 0ms trước khi server phản hồi) ─
    const handleOptimisticAddProduct = useCallback(
        (product: { id: string; name: string; priceVnd: number }, quantity: number) => {
            if (!selectedSession) return;
            const targetSessionId = selectedSession.id;
            setSessions((prev) =>
                prev.map((s) => {
                    if (s.id !== targetSessionId) return s;
                    const inv = s.invoices[0];
                    if (!inv) return s;

                    const newLine: SerializableInvoiceLine = {
                        id: `optimistic-${Date.now()}`,
                        productId: product.id,
                        fishBuybackId: null,
                        name: product.name,
                        unitPrice: product.priceVnd,
                        quantity,
                        totalVnd: product.priceVnd * quantity,
                        createdAt: new Date().toISOString(),
                        product: {
                            id: product.id,
                            name: product.name,
                            priceVnd: product.priceVnd,
                        },
                    };

                    const updatedLines = [...(inv.lines ?? []), newLine];
                    const updatedInv = {
                        ...inv,
                        totalAmountVnd: inv.totalAmountVnd + newLine.totalVnd,
                        lines: updatedLines,
                    };

                    return {
                        ...s,
                        invoices: [updatedInv, ...s.invoices.slice(1)],
                    };
                }),
            );
        },
        [selectedSession],
    );

    const handleOptimisticExtend = useCallback(
        (pkg: ActionPackage) => {
            if (!selectedSession) return;
            const targetSessionId = selectedSession.id;
            setSessions((prev) =>
                prev.map((s) => {
                    if (s.id !== targetSessionId) return s;
                    const inv = s.invoices[0];
                    if (!inv) return s;

                    const currentPlannedEnd = new Date(s.plannedEndAt);
                    const newPlannedEnd = new Date(
                        currentPlannedEnd.getTime() + pkg.durationMinutes * 60_000,
                    );

                    const newLine: SerializableInvoiceLine = {
                        id: `optimistic-ext-${Date.now()}`,
                        productId: null,
                        fishBuybackId: null,
                        name: `Gia hạn: ${pkg.name}`,
                        unitPrice: pkg.priceVnd,
                        quantity: 1,
                        totalVnd: pkg.priceVnd,
                        createdAt: new Date().toISOString(),
                    };

                    const updatedLines = [...(inv.lines ?? []), newLine];
                    const updatedInv = {
                        ...inv,
                        totalAmountVnd: inv.totalAmountVnd + pkg.priceVnd,
                        lines: updatedLines,
                    };

                    return {
                        ...s,
                        plannedEndAt: newPlannedEnd.toISOString(),
                        invoices: [updatedInv, ...s.invoices.slice(1)],
                    };
                }),
            );
        },
        [selectedSession],
    );

    const handleOptimisticFishBuyback = useCallback(
        (type: { id: string; name: string; pricePerKg: number }, weight: number, totalVnd: number) => {
            if (!selectedSession) return;
            const targetSessionId = selectedSession.id;
            setSessions((prev) =>
                prev.map((s) => {
                    if (s.id !== targetSessionId) return s;
                    const inv = s.invoices[0];
                    if (!inv) return s;

                    const newLine: SerializableInvoiceLine = {
                        id: `optimistic-fish-${Date.now()}`,
                        productId: null,
                        fishBuybackId: `optimistic-fb-${Date.now()}`,
                        name: `Thu cá: ${type.name} (${weight}kg)`,
                        unitPrice: type.pricePerKg,
                        quantity: weight,
                        totalVnd: -totalVnd,
                        createdAt: new Date().toISOString(),
                        fishBuyback: {
                            id: `optimistic-fb-${Date.now()}`,
                            weight,
                            pricePerKg: type.pricePerKg,
                            totalVnd: -totalVnd,
                            fishType: { id: type.id, name: type.name },
                        },
                    };

                    const updatedLines = [...(inv.lines ?? []), newLine];
                    const updatedInv = {
                        ...inv,
                        totalAmountVnd: inv.totalAmountVnd - totalVnd,
                        lines: updatedLines,
                    };

                    return {
                        ...s,
                        invoices: [updatedInv, ...s.invoices.slice(1)],
                    };
                }),
            );
        },
        [selectedSession],
    );

    // ── Empty state ───────────────────────────────────────────────────────────
    if (sessions.length === 0) {
        return (
            <div className="flex min-h-[calc(100vh-220px)] items-center justify-center font-serif">
                <div
                    className="w-full rounded-xs border border-[#CCCCCC] bg-[#FFFFFF] p-6 text-center"
                >
                    <div className="mx-auto mb-3 flex h-11 w-11 items-center justify-center rounded-xs bg-[#EAEFEA] text-[#2C4C3B] border border-[#CCCCCC]">
                        <svg
                            className="h-6 w-6"
                            fill="none"
                            viewBox="0 0 24 24"
                            strokeWidth={1.75}
                            stroke="currentColor"
                        >
                            <path
                                strokeLinecap="round"
                                strokeLinejoin="round"
                                d="M12 6v6h4.5m4.5 0a9 9 0 1 1-18 0 9 9 0 0 1 18 0Z"
                            />
                        </svg>
                    </div>
                    <p className="text-base font-bold text-[#1A1A1A] font-serif">
                        Hiện không có phiên đang câu
                    </p>
                    <p className="mt-1 text-xs text-[#555555] font-serif">
                        Bấm &quot;Tạo vé mới&quot; để bắt đầu một phiên câu cho khách.
                    </p>
                    {canOpenSession && (
                        <Link
                            href="/sessions/new"
                            className="mobile-pos-btn mobile-pos-btn-primary mt-4 px-5 font-serif text-xs font-bold"
                        >
                            + Tạo vé mới
                        </Link>
                    )}
                </div>
            </div>
        );
    }

    return (
        <div className="font-serif">
            {/* Lưới thẻ phiên (2 cột) */}
            <div className="grid grid-cols-2 gap-2.5 sm:gap-3">
                {sessions.map((s) => (
                    <SessionGridCard
                        key={s.id}
                        session={s}
                        isSelected={selectedSession?.id === s.id}
                        nowMs={nowMs}
                        canComplete={canComplete}
                        onSelect={handleSelect}
                        onLongPress={handleLongPress}
                        onSettlement={handleSettlement}
                    />
                ))}
            </div>

            {/* Gợi ý nhấn giữ */}
            <p className="text-center text-[11px] text-[#555555] font-medium mt-2.5 font-serif">
                💡 Nhấn giữ 1 ô câu để xem chi tiết đầy đủ của phiên
            </p>

            {/* Thanh thao tác nhanh (Quick Action Toolbar) */}
            {selectedSession && (
                <div className="mt-3 pt-2.5 border-t border-[#E0E0E0] font-serif">
                    <div className="mb-2 text-center">
                        <span className="inline-block text-xs font-bold text-[#2C4C3B] bg-[#EAEFEA] border border-[#CCCCCC] rounded-xs px-3 py-0.5 font-serif">
                            Đang chọn:{" "}
                            {selectedSession.hutLinks
                                .map((hl) => hl.hut.name)
                                .join(" + ")}
                            {selectedSession.customer?.name
                                ? ` · ${selectedSession.customer.name}`
                                : ""}
                        </span>
                    </div>

                    <SessionActions
                        sessionId={selectedSession.id}
                        canComplete={canComplete}
                        canCancel={canCancel}
                        invoiceId={selectedSession.invoices[0]?.id ?? null}
                        packages={packages}
                        fishTypes={fishTypes}
                        netBalance={selectedSessionFinancials?.netBalance}
                        onOptimisticAddProduct={handleOptimisticAddProduct}
                        onOptimisticExtend={handleOptimisticExtend}
                        onOptimisticFishBuyback={handleOptimisticFishBuyback}
                    />
                </div>
            )}

            {/* ── Modal Chi Tiết Phiên Câu Khi Nhấn Giữ (Long-Press Modal) ──────── */}
            {detailSession && (
                <div
                    className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-black/40 modal-backdrop-animate font-serif"
                    role="dialog"
                    aria-modal="true"
                    aria-label="Chi tiết phiên câu"
                    onClick={onDetailBackdropClick}
                >
                    <div className="w-full max-w-md rounded-xs bg-white border border-[#CCCCCC] overflow-hidden flex flex-col max-h-[90vh] modal-content-animate">
                        {/* Header Modal */}
                        <div className="flex items-center justify-between border-b border-[#E0E0E0] bg-white px-4 py-2.5 shrink-0 font-serif">
                            <div>
                                <h3 className="text-sm font-bold text-[#1A1A1A] font-serif uppercase">
                                    CHI TIẾT: {detailSession.hutLinks.map((hl) => hl.hut.name).join(" + ")}
                                </h3>
                                <p className="text-xs text-[#555555] font-serif mt-0.5">
                                    Khách: {detailSession.customer?.name ?? "Khách lẻ"}
                                    {detailSession.customer?.phoneNormalized ? ` (${detailSession.customer.phoneNormalized})` : ""}
                                </p>
                            </div>
                            <button
                                type="button"
                                onClick={() => setDetailSession(null)}
                                className="h-7 w-7 rounded-xs border border-[#CCCCCC] bg-[#F2F2F0] flex items-center justify-center text-[#1A1A1A] hover:bg-[#EAEAE6] transition-colors cursor-pointer"
                            >
                                <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                                </svg>
                            </button>
                        </div>

                        {/* Nội dung chi tiết */}
                        <div className="p-3.5 overflow-y-auto space-y-3 text-xs text-[#1A1A1A] font-serif">
                            {/* Card: Thông tin cơ bản */}
                            <div className="rounded-xs bg-[#FAFAF7] p-3 border border-[#E0E0E0] space-y-1.5 font-serif">
                                <div className="flex justify-between">
                                    <span className="text-[#555555]">Gói câu áp dụng:</span>
                                    <span className="font-bold text-[#1A1A1A]">
                                        {detailSession.package.name} ({formatDuration(detailSession.package.durationMinutes)})
                                    </span>
                                </div>
                                <div className="flex justify-between">
                                    <span className="text-[#555555]">Giá gói:</span>
                                    <span className="font-bold font-serif text-[#1A1A1A]">
                                        {formatVnd(detailSession.packagePriceVndSnapshot ?? detailSession.package.priceVnd)}
                                    </span>
                                </div>
                                <div className="flex justify-between">
                                    <span className="text-[#555555]">Giờ vào:</span>
                                    <span className="font-medium text-[#1A1A1A]">
                                        {formatDateTime(detailSession.startAt)}
                                    </span>
                                </div>
                                <div className="flex justify-between">
                                    <span className="text-[#555555]">Dự kiến kết thúc:</span>
                                    <span className="font-medium text-[#1A1A1A]">
                                        {formatDateTime(detailSession.plannedEndAt)}
                                    </span>
                                </div>
                            </div>

                            {/* Card: Danh sách sản phẩm & dịch vụ */}
                            {(() => {
                                const detailFinancials = computeSessionFinancials(detailSession, nowMs);
                                const {
                                    productLines,
                                    extensionLines,
                                    fishBuybackLines,
                                    totalProductsVnd,
                                    totalExtensionsVnd,
                                    fishBuybackTotal,
                                    liveOvertimeVnd,
                                    liveOvertimeMinutes,
                                    overtimeRate,
                                    hutCount,
                                    totalCharges,
                                    totalPaid,
                                    netBalance,
                                } = detailFinancials;

                                return (
                                    <>
                                        {/* Phụ thu quá giờ */}
                                        {liveOvertimeVnd > 0 && (
                                            <div className="rounded-xs bg-[#FDF7EB] p-3 border border-[#E8D1A3] space-y-1 font-serif">
                                                <h4 className="font-bold text-[#8C5C00] flex justify-between border-b border-[#E8D1A3] pb-1">
                                                    <span>⏱️ Phụ thu quá giờ {liveOvertimeMinutes > 0 ? `(+${formatOvertimeDuration(liveOvertimeMinutes)})` : ""}</span>
                                                    <span className="font-serif text-[#8C5C00] font-bold">+{formatVnd(liveOvertimeVnd)}</span>
                                                </h4>
                                                <div className="flex justify-between py-0.5 text-[#8C5C00] text-[11px]">
                                                    <span>Đơn giá phụ thu:</span>
                                                    <span className="font-serif">{formatVnd(overtimeRate)}/h {hutCount > 1 ? `× ${hutCount} ô` : ""}</span>
                                                </div>
                                            </div>
                                        )}

                                        {/* Gia hạn */}
                                        {extensionLines.length > 0 && (
                                            <div className="rounded-xs bg-white p-3 border border-[#E0E0E0] space-y-1.5 font-serif">
                                                <h4 className="font-bold text-[#1A1A1A] flex justify-between border-b border-[#E0E0E0] pb-1">
                                                    <span>Gia hạn phiên</span>
                                                    <span className="font-serif text-[#2C4C3B] font-bold">+{formatVnd(totalExtensionsVnd)}</span>
                                                </h4>
                                                {extensionLines.map((l) => (
                                                    <div key={l.id} className="flex justify-between py-0.5">
                                                        <span>{l.name}</span>
                                                        <span className="font-serif font-medium">{formatVnd(l.totalVnd)}</span>
                                                    </div>
                                                ))}
                                            </div>
                                        )}

                                        {/* Sản phẩm */}
                                        <div className="rounded-xs bg-white p-3 border border-[#E0E0E0] space-y-1.5 font-serif">
                                            <h4 className="font-bold text-[#1A1A1A] flex justify-between border-b border-[#E0E0E0] pb-1">
                                                <span>Sản phẩm & Đồ uống</span>
                                                <span className="font-serif font-bold text-[#1A1A1A]">+{formatVnd(totalProductsVnd)}</span>
                                            </h4>
                                            {productLines.length === 0 ? (
                                                <p className="text-[#777777] italic py-0.5">Chưa có sản phẩm nào được thêm.</p>
                                            ) : (
                                                productLines.map((l) => (
                                                    <div key={l.id} className="flex justify-between py-0.5">
                                                        <span className="truncate pr-2">
                                                            {l.name} <span className="text-[#555555]">× {l.quantity}</span>
                                                        </span>
                                                        <span className="font-serif font-medium shrink-0">{formatVnd(l.totalVnd)}</span>
                                                    </div>
                                                ))
                                            )}
                                        </div>

                                        {/* Tiền cọc / Đã thu trước */}
                                        {totalPaid > 0 && (
                                            <div className="rounded-xs bg-white p-3 border border-[#E0E0E0] space-y-1 font-serif">
                                                <h4 className="font-bold text-[#2C4C3B] flex justify-between border-b border-[#E0E0E0] pb-1">
                                                    <span>Tiền cọc / Đã thu trước</span>
                                                    <span className="font-serif font-bold text-[#2C4C3B]">-{formatVnd(totalPaid)}</span>
                                                </h4>
                                                <div className="flex justify-between py-0.5 text-[#2C4C3B]">
                                                    <span>Đã thanh toán lúc mở vé</span>
                                                    <span className="font-serif font-medium">-{formatVnd(totalPaid)}</span>
                                                </div>
                                            </div>
                                        )}

                                        {/* Thu mua cá */}
                                        {fishBuybackLines.length > 0 && (
                                            <div className="rounded-xs bg-white p-3 border border-[#E0E0E0] space-y-1 font-serif">
                                                <h4 className="font-bold text-[#9E2A2B] flex justify-between border-b border-[#E0E0E0] pb-1">
                                                    <span>Thu cá từ cần thủ</span>
                                                    <span className="font-serif font-bold text-[#9E2A2B]">-{formatVnd(fishBuybackTotal)}</span>
                                                </h4>
                                                {fishBuybackLines.map((l) => (
                                                    <div key={l.id} className="flex justify-between py-0.5 text-[#9E2A2B]">
                                                        <span>{l.name} {l.fishBuyback ? `(${l.fishBuyback.weight} kg)` : ""}</span>
                                                        <span className="font-serif font-medium">-{formatVnd(Math.abs(l.totalVnd))}</span>
                                                    </div>
                                                ))}
                                            </div>
                                        )}

                                        {/* Tổng kết toàn bộ bill dạng sổ cái */}
                                        <div className="rounded-xs bg-[#FAFAF7] text-[#1A1A1A] p-3 border border-[#CCCCCC] space-y-1.5 font-serif">
                                            <div className="flex justify-between text-xs text-[#555555]">
                                                <span>Tổng chi phí (Gói + SP + Gia hạn + Quá giờ):</span>
                                                <span className="font-serif font-bold text-[#1A1A1A]">+{formatVnd(totalCharges)}</span>
                                            </div>
                                            {totalPaid > 0 && (
                                                <div className="flex justify-between text-xs text-[#2C4C3B]">
                                                    <span>Tiền cọc / Đã thu trước:</span>
                                                    <span className="font-serif font-medium">-{formatVnd(totalPaid)}</span>
                                                </div>
                                            )}
                                            {fishBuybackTotal > 0 && (
                                                <div className="flex justify-between text-xs text-[#9E2A2B]">
                                                    <span>Tiền thu mua cá từ khách:</span>
                                                    <span className="font-serif font-medium">-{formatVnd(fishBuybackTotal)}</span>
                                                </div>
                                            )}
                                            <div className="border-t border-[#CCCCCC] pt-2 flex items-center justify-between">
                                                <div>
                                                    <p className="text-xs font-bold text-[#1A1A1A]">
                                                        {netBalance < 0
                                                            ? "HỒ THỐI LẠI TIỀN CHO KHÁCH"
                                                            : netBalance > 0
                                                            ? "CẦN THU THÊM CỦA KHÁCH"
                                                            : "ĐÃ THANH TOÁN ĐỦ"}
                                                    </p>
                                                    <p className="text-[10px] text-[#777777]">
                                                        (Chi phí - Đã thu trước - Thu cá)
                                                    </p>
                                                </div>
                                                <span className={`text-base font-bold font-serif ${
                                                    netBalance < 0 ? "text-[#9E2A2B]" : netBalance > 0 ? "text-[#8C5C00]" : "text-[#2C4C3B]"
                                                }`}>
                                                    {netBalance < 0
                                                        ? `-${formatVnd(Math.abs(netBalance))}`
                                                        : netBalance > 0
                                                        ? `+${formatVnd(netBalance)}`
                                                        : "0 đ"}
                                                </span>
                                            </div>
                                        </div>
                                    </>
                                );
                            })()}
                        </div>

                        {/* Footer Modal */}
                        <div className="p-3 border-t border-[#EAE4D7] bg-white flex items-center gap-2">
                            <button
                                type="button"
                                onClick={() => setDetailSession(null)}
                                className="mobile-pos-btn mobile-pos-btn-secondary flex-1 py-2.5"
                            >
                                Đóng
                            </button>
                            {canComplete && (() => {
                                const detailFin = computeSessionFinancials(detailSession);
                                return (
                                    <button
                                        type="button"
                                        onClick={() => {
                                            const targetId = detailSession.id;
                                            setDetailSession(null);
                                            setSettlementSessionId(targetId);
                                        }}
                                        className={`mobile-pos-btn flex-1 py-2.5 flex items-center justify-center gap-1.5 font-bold transition-all ${
                                            detailFin.netBalance < 0
                                                ? "bg-[#C84B31] hover:bg-[#A33820] text-white shadow-sm"
                                                : detailFin.netBalance === 0
                                                ? "bg-emerald-700 hover:bg-emerald-800 text-white shadow-sm"
                                                : "mobile-pos-btn-primary"
                                        }`}
                                    >
                                        <svg className="h-4 w-4 shrink-0" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor">
                                            <path strokeLinecap="round" strokeLinejoin="round" d="M2.25 18.75a60.07 60.07 0 0 1 15.797 2.101c.727.198 1.453-.342 1.453-1.096V18.75M3.75 4.5v.75A.75.75 0 0 1 3 6H2.25m0 0H3m-1.5 0h1.5m0 0v10.5m0 0h1.5m-1.5 0H2.25m0 0a.75.75 0 0 0 .75.75h.75m10.5-12v.75a.75.75 0 0 1-.75.75h-.75m0 0h.75m-1.5 0h1.5m0 0v10.5m0 0h1.5m-1.5 0h-.75m0 0a.75.75 0 0 0 .75.75h.75M6 10.5h12m-12 3h12" />
                                        </svg>
                                        <span>
                                            {detailFin.netBalance < 0
                                                ? `Thối tiền ${formatVnd(Math.abs(detailFin.netBalance))} & In bill`
                                                : detailFin.netBalance > 0
                                                ? `Thu thêm ${formatVnd(detailFin.netBalance)} & In bill`
                                                : "Hoàn tất & In bill"}
                                        </span>
                                    </button>
                                );
                            })()}
                        </div>
                    </div>
                </div>
            )}

            {/* ── Modal Thanh toán & In bill trực tiếp ──────────────────────── */}
            {settlementSessionId && (
                <SettlementCheckoutModal
                    sessionId={settlementSessionId}
                    isOpen={true}
                    onClose={() => setSettlementSessionId(null)}
                    onCompleted={(completedId) => {
                        const targetId = completedId || settlementSessionId;
                        if (targetId) {
                            setSessions((prev) => prev.filter((s) => s.id !== targetId));
                        }
                        setSettlementSessionId(null);
                        router.refresh();
                    }}
                />
            )}
        </div>
    );
}
