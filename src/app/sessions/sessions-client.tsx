"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useRef, useState } from "react";

import { SessionCountdown } from "./session-countdown";
import { SessionActions } from "./session-actions";
import { SettlementCheckoutModal } from "./settlement-checkout-modal";
import { useNetworkStatus } from "@/lib/network/use-network-status";
import type { ActionPackage } from "./session-actions";

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
    };
    packageNameSnapshot?: string;
    packageDurationMinutesSnapshot?: number;
    packagePriceVndSnapshot?: number;
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

function formatVnd(vnd: number): string {
    return new Intl.NumberFormat("vi-VN").format(vnd) + "đ";
}

function formatDuration(minutes: number): string {
    const h = Math.floor(minutes / 60);
    const m = minutes % 60;
    if (m === 0) return `${h} giờ`;
    return `${h}h${m}p`;
}

function formatDateTime(isoString: string): string {
    const date = new Date(isoString);
    const d = String(date.getDate()).padStart(2, "0");
    const m = String(date.getMonth() + 1).padStart(2, "0");
    const y = date.getFullYear();
    const hh = String(date.getHours()).padStart(2, "0");
    const mm = String(date.getMinutes()).padStart(2, "0");
    return `${hh}:${mm} - ${d}/${m}/${y}`;
}

// ── Hàm tính toán tài chính thống nhất cho phiên câu ─────────────────────────
// Kết quả = (Gói câu + Sản phẩm + Gia hạn) - (Tiền tạm tính đã nộp + Tiền thu cá)
// Nếu < 0 (Âm): Hồ thối lại tiền cho khách
// Nếu > 0 (Dương): Hồ thu thêm của khách
// Nếu = 0: Đã thanh toán đủ
function computeSessionFinancials(s: SerializableSession) {
    const invoice = s.invoices[0];
    const lines = invoice?.lines ?? [];
    const payments = invoice?.payments ?? [];

    const productLines = lines.filter(
        (l) =>
            l.productId !== null ||
            (!l.fishBuybackId &&
                !l.name.startsWith("Gia hạn:") &&
                !l.name.startsWith("Tiền ca:")),
    );
    const extensionLines = lines.filter((l) => l.name.startsWith("Gia hạn:"));
    const fishBuybackLines = lines.filter(
        (l) => l.fishBuybackId !== null || l.totalVnd < 0,
    );

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

    // Tổng chi phí (Total Cost) = Tiền gói câu + Gia hạn + Sản phẩm/Dịch vụ
    const totalCharges = packageTotal + productsTotal + extensionsTotal;

    // Tiền cọc / Đã thu trước (Prepaid) từ khách
    const paidIn = payments
        .filter((p) => p.direction === "IN")
        .reduce((sum, p) => sum + p.amountVnd, 0);
    const paidOut = payments
        .filter((p) => p.direction === "OUT")
        .reduce((sum, p) => sum + p.amountVnd, 0);
    const totalPaidFromPayments = Math.max(0, paidIn - paidOut);
    // Lấy từ invoice.paidAmountVnd nếu có, hoặc tính từ payments
    const paidAmountVnd =
        invoice?.paidAmountVnd !== undefined
            ? invoice.paidAmountVnd
            : totalPaidFromPayments;
    const totalPaid = paidAmountVnd;

    // Tổng giảm trừ (Total Deductions) = Tiền cọc/Thu trước (paidAmountVnd) + Tiền thu mua cá
    const totalDeductions = paidAmountVnd + fishBuybackTotal;

    // Số dư ròng (Net Balance) = Tổng chi phí - Tổng giảm trừ
    const netBalance = totalCharges - totalDeductions;

    return {
        lines,
        payments,
        productLines,
        extensionLines,
        fishBuybackLines,
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

export function SessionsClient({
    activeSessions,
    packages,
    fishTypes = [],
    canComplete,
    canCancel,
    canOpenSession,
}: SessionsClientProps) {
    const router = useRouter();
    const [selectedId, setSelectedId] = useState<string>(
        activeSessions[0]?.id ?? "",
    );
    const [settlementSessionId, setSettlementSessionId] = useState<string | null>(null);

    // Modal Chi tiết phiên câu khi nhấn giữ
    const [detailSession, setDetailSession] = useState<SerializableSession | null>(null);

    // Long press detection
    const holdTimerRef = useRef<NodeJS.Timeout | null>(null);
    const didLongPressRef = useRef<boolean>(false);

    const selectedSession =
        activeSessions.find((s) => s.id === selectedId) ??
        activeSessions[0] ??
        null;
    const selectedSessionFinancials = selectedSession
        ? computeSessionFinancials(selectedSession)
        : null;

    // ── Auto Re-sync khi có mạng lại hoặc khi mở lại màn hình ─────────────────
    const { isOnline } = useNetworkStatus();
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

    function startLongPress(session: SerializableSession) {
        didLongPressRef.current = false;
        if (holdTimerRef.current) {
            clearTimeout(holdTimerRef.current);
        }
        holdTimerRef.current = setTimeout(() => {
            didLongPressRef.current = true;
            setSelectedId(session.id);
            setDetailSession(session);
        }, 550);
    }

    function cancelLongPress() {
        if (holdTimerRef.current) {
            clearTimeout(holdTimerRef.current);
            holdTimerRef.current = null;
        }
    }

    // ── Empty state ───────────────────────────────────────────────────────────
    if (activeSessions.length === 0) {
        return (
            <div className="flex min-h-[calc(100vh-220px)] items-center justify-center">
                <div
                    className="w-full rounded-3xl border border-[#E3E8E3] bg-[#F7F9F5] p-8 text-center shadow-xs"
                >
                    <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-2xl bg-[#E8F3E5] text-[#246B38]">
                        <svg
                            className="h-7 w-7"
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
                    <p className="text-base font-bold text-[#17201A]">
                        Hiện không có phiên đang câu
                    </p>
                    <p className="mt-1.5 text-xs text-[#66716A]">
                        Bấm &quot;Tạo vé mới&quot; để bắt đầu một phiên câu cho khách.
                    </p>
                    {canOpenSession && (
                        <Link
                            href="/sessions/new"
                            className="mobile-pos-btn mobile-pos-btn-primary mt-5 px-6"
                        >
                            + Tạo vé mới
                        </Link>
                    )}
                </div>
            </div>
        );
    }

    return (
        <>
            {/* Lưới thẻ phiên (2 cột) */}
            <div className="grid grid-cols-2 gap-3 sm:gap-4">
                {activeSessions.map((s) => {
                    const isSelected = selectedSession?.id === s.id;
                    const hutLabel =
                        s.hutLinks.map((hl) => hl.hut.name).join(" + ") || "—";
                    const {
                        productLines,
                        fishBuybackTotal,
                        productCount,
                        extensionHours,
                        totalCharges,
                        totalPaid,
                        netBalance,
                    } = computeSessionFinancials(s);

                    return (
                        <div
                            key={s.id}
                            role="button"
                            tabIndex={0}
                            aria-pressed={isSelected}
                            aria-label={`Chọn ô ${hutLabel}`}
                            onPointerDown={() => startLongPress(s)}
                            onPointerUp={cancelLongPress}
                            onPointerLeave={cancelLongPress}
                            onPointerCancel={cancelLongPress}
                            onContextMenu={(e) => e.preventDefault()}
                            onClick={() => {
                                if (didLongPressRef.current) {
                                    didLongPressRef.current = false;
                                    return;
                                }
                                setSelectedId(s.id);
                            }}
                            onKeyDown={(e) => {
                                if (e.key === "Enter" || e.key === " ") {
                                    e.preventDefault();
                                    setSelectedId(s.id);
                                }
                            }}
                            className={`flex flex-col justify-between rounded-2xl bg-white p-3.5 sm:p-4 text-left transition-all duration-120 select-none cursor-pointer border shadow-2xs ${
                                isSelected
                                    ? "border-2 border-[#4F9D5A] ring-2 ring-[#4F9D5A]/20 bg-[#F7FAF6]"
                                    : "border-[#E3E8E3] hover:border-[#4F9D5A]/50"
                            }`}
                        >
                            {/* Hàng 1: Mã ô & Thời lượng */}
                            <div>
                                <div className="flex items-start justify-between gap-1 mb-1">
                                    <span className="text-sm font-bold text-[#17201A] leading-tight truncate">
                                        {hutLabel}
                                    </span>
                                    <span className="shrink-0 text-[11px] font-medium text-[#66716A]">
                                        {formatDuration(s.package.durationMinutes)}
                                    </span>
                                </div>

                                {/* Hàng 2: Tên khách hàng */}
                                <p className="text-xs font-semibold text-[#17201A] truncate mb-2">
                                    {s.customer?.name ?? (
                                        <span className="font-normal text-[#66716A]">
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
                            <div className="mt-2 pt-2 border-t border-[#E3E8E3]">
                                {/* Micro breakdown nếu có khoản giảm trừ (Thu cá hoặc Đã nộp trước) */}
                                {fishBuybackTotal > 0 || totalPaid > 0 ? (
                                    <div className="space-y-0.5 text-[10px] text-[#66716A] mb-1.5 bg-[#F7F9F5] p-1.5 rounded-xl border border-[#E3E8E3]">
                                        <div className="flex items-center justify-between">
                                            <span className="text-[#66716A]">Dịch vụ (gói+món):</span>
                                            <span className="font-mono text-[#17201A] font-medium">+{formatVnd(totalCharges)}</span>
                                        </div>
                                        {totalPaid > 0 && (
                                            <div className="flex items-center justify-between text-[#246B38]">
                                                <span>Đã nộp trước:</span>
                                                <span className="font-mono font-medium">-{formatVnd(totalPaid)}</span>
                                            </div>
                                        )}
                                        {fishBuybackTotal > 0 && (
                                            <div className="flex items-center justify-between text-[#D9534F]">
                                                <span className="font-semibold">Tiền thu cá:</span>
                                                <span className="font-mono font-bold">-{formatVnd(fishBuybackTotal)}</span>
                                            </div>
                                        )}
                                    </div>
                                ) : (
                                    <div className="flex items-center justify-between text-xs mb-1.5">
                                        <span className="text-[#66716A] font-medium">Tạm tính:</span>
                                        <span className="font-mono font-bold text-[#17201A]">+{formatVnd(totalCharges)}</span>
                                    </div>
                                )}

                                {/* Kết quả quyết toán: Âm (Thối lại khách) / Dương (Thu thêm khách) / 0 (Đã đủ) */}
                                <div
                                    className={`rounded-xl px-2 py-1 border flex items-center justify-between transition-colors ${
                                        netBalance < 0
                                            ? "bg-[#FCEEED] border-[#D9534F]/30 text-[#AC3430]"
                                            : netBalance === 0
                                            ? "bg-[#EBF6ED] border-[#CDE8C7] text-[#246B38]"
                                            : "bg-[#FDF6E9] border-[#F6E1B6] text-[#9A600B]"
                                    }`}
                                >
                                    <span className="text-[11px] font-bold">
                                        {netBalance < 0
                                            ? "💸 Thối lại:"
                                            : netBalance === 0
                                            ? "⚖️ Đã đủ:"
                                            : "⚖️ Cần thu:"}
                                    </span>
                                    <span
                                        className={`font-mono font-extrabold text-[11px] sm:text-xs ${
                                            netBalance < 0
                                                ? "text-[#8B1E1E]"
                                                : netBalance === 0
                                                ? "text-emerald-700"
                                                : "text-slate-900"
                                        }`}
                                    >
                                        {netBalance < 0
                                            ? `-${formatVnd(Math.abs(netBalance))}`
                                            : netBalance === 0
                                            ? "0 đ"
                                            : `+${formatVnd(netBalance)}`}
                                    </span>
                                </div>

                                {/* Badges tóm tắt món / gia hạn */}
                                {(productCount > 0 || extensionHours > 0) && (
                                    <div className="flex flex-wrap gap-1 mt-1.5">
                                        {productCount > 0 && (
                                            <span className="inline-flex items-center rounded-full bg-[#EEF3EB] px-2 py-0.5 text-[10px] font-semibold text-[#17201A]">
                                                +{productCount} món
                                            </span>
                                        )}
                                        {extensionHours > 0 && (
                                            <span className="inline-flex items-center rounded-full bg-[#EBF6ED] px-2 py-0.5 text-[10px] font-semibold text-[#246B38]">
                                                +{extensionHours} gia hạn
                                            </span>
                                        )}
                                    </div>
                                )}

                                {/* Tên món mới nhất */}
                                {productLines.length > 0 && (
                                    <p className="text-[11px] text-[#66716A] truncate mt-1">
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
                                             setSettlementSessionId(s.id);
                                        }}
                                        className={`mt-2 flex w-full items-center justify-center gap-1.5 rounded-xl py-2.5 px-2 text-[11px] sm:text-xs font-bold text-white shadow-2xs active:scale-95 transition-all cursor-pointer ${
                                             netBalance < 0
                                                 ? "bg-[#D9534F] hover:bg-[#C3433F]"
                                                 : netBalance === 0
                                                 ? "bg-[#3E9B4F] hover:bg-[#348643]"
                                                 : "bg-[#4F9D5A] hover:bg-[#3D8547]"
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
                                                : `Đóng & In bill`}
                                        </span>
                                    </button>
                                )}
                            </div>
                        </div>
                    );
                })}
            </div>

            {/* Gợi ý nhấn giữ */}
            <p className="text-center text-[11px] text-emerald-200 font-medium mt-3 drop-shadow-2xs">
                💡 Nhấn giữ 1 ô câu để xem chi tiết đầy đủ của phiên
            </p>

            {/* Thanh thao tác nhanh (Quick Action Toolbar) */}
            {selectedSession && (
                <div className="mt-4 pt-3 border-t border-emerald-500/20">
                    <div className="mb-3 text-center">
                        <span className="inline-block text-xs font-bold text-emerald-100 bg-black/40 border border-emerald-400/30 rounded-full px-3.5 py-1 backdrop-blur-md shadow-xs">
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
                    />
                </div>
            )}

            {/* ── Modal Chi Tiết Phiên Câu Khi Nhấn Giữ (Long-Press Modal) ──────── */}
            {detailSession && (
                <div
                    className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-xs"
                    role="dialog"
                    aria-modal="true"
                    aria-label="Chi tiết phiên câu"
                >
                    <div className="w-full max-w-md rounded-3xl bg-white border border-[#E3E8E3] shadow-2xl overflow-hidden flex flex-col max-h-[90vh]">
                        {/* Header Modal */}
                        <div className="flex items-center justify-between border-b border-[#E3E8E3] bg-white px-4 py-3 shrink-0">
                            <div>
                                <h3 className="text-base font-bold text-[#17201A]">
                                    Chi tiết phiên: {detailSession.hutLinks.map((hl) => hl.hut.name).join(" + ")}
                                </h3>
                                <p className="text-xs text-[#66716A] mt-0.5">
                                    Khách: {detailSession.customer?.name ?? "Khách lẻ"}
                                    {detailSession.customer?.phoneNormalized ? ` (${detailSession.customer.phoneNormalized})` : ""}
                                </p>
                            </div>
                            <button
                                type="button"
                                onClick={() => setDetailSession(null)}
                                className="h-8 w-8 rounded-full flex items-center justify-center text-[#66716A] hover:text-[#17201A] hover:bg-[#F7F9F5] transition-colors"
                            >
                                <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                                </svg>
                            </button>
                        </div>

                        {/* Nội dung chi tiết */}
                        <div className="p-4 overflow-y-auto space-y-3.5 text-xs text-[#17201A]">
                            {/* Card: Thông tin cơ bản */}
                            <div className="rounded-2xl bg-[#F7F9F5] p-3.5 border border-[#E3E8E3] space-y-2">
                                <div className="flex justify-between">
                                    <span className="text-[#66716A]">Gói câu áp dụng:</span>
                                    <span className="font-semibold text-[#17201A]">
                                        {detailSession.package.name} ({formatDuration(detailSession.package.durationMinutes)})
                                    </span>
                                </div>
                                <div className="flex justify-between">
                                    <span className="text-slate-500">Giá gói snapshot:</span>
                                    <span className="font-semibold font-mono text-slate-900">
                                        {formatVnd(detailSession.packagePriceVndSnapshot ?? detailSession.package.priceVnd)}
                                    </span>
                                </div>
                                <div className="flex justify-between">
                                    <span className="text-slate-500">Giờ vào:</span>
                                    <span className="font-medium text-slate-800">
                                        {formatDateTime(detailSession.startAt)}
                                    </span>
                                </div>
                                <div className="flex justify-between">
                                    <span className="text-slate-500">Dự kiến kết thúc:</span>
                                    <span className="font-medium text-slate-800">
                                        {formatDateTime(detailSession.plannedEndAt)}
                                    </span>
                                </div>
                            </div>

                            {/* Card: Danh sách sản phẩm & dịch vụ */}
                            {(() => {
                                const detailFinancials = computeSessionFinancials(detailSession);
                                const {
                                    productLines,
                                    extensionLines,
                                    fishBuybackLines,
                                    totalProductsVnd,
                                    totalExtensionsVnd,
                                    fishBuybackTotal,
                                    totalCharges,
                                    totalPaid,
                                    netBalance,
                                } = detailFinancials;

                                return (
                                    <>
                                        {/* Gia hạn */}
                                        {extensionLines.length > 0 && (
                                            <div className="rounded-xl bg-white p-3.5 border border-[#EAE4D7] shadow-xs space-y-2">
                                                <h4 className="font-bold text-slate-900 flex justify-between border-b border-[#F0ECE1] pb-1.5">
                                                    <span>Gia hạn phiên</span>
                                                    <span className="font-mono text-[#2D6A4F]">+{formatVnd(totalExtensionsVnd)}</span>
                                                </h4>
                                                {extensionLines.map((l) => (
                                                    <div key={l.id} className="flex justify-between py-0.5">
                                                        <span>{l.name}</span>
                                                        <span className="font-mono font-medium">{formatVnd(l.totalVnd)}</span>
                                                    </div>
                                                ))}
                                            </div>
                                        )}

                                        {/* Sản phẩm */}
                                        <div className="rounded-xl bg-white p-3.5 border border-[#EAE4D7] shadow-xs space-y-2">
                                            <h4 className="font-bold text-slate-900 flex justify-between border-b border-[#F0ECE1] pb-1.5">
                                                <span>Sản phẩm & Đồ uống</span>
                                                <span className="font-mono">{formatVnd(totalProductsVnd)}</span>
                                            </h4>
                                            {productLines.length === 0 ? (
                                                <p className="text-slate-400 italic py-1">Chưa có sản phẩm nào được thêm.</p>
                                            ) : (
                                                productLines.map((l) => (
                                                    <div key={l.id} className="flex justify-between py-0.5">
                                                        <span className="truncate pr-2">
                                                            {l.name} <span className="text-slate-500 font-mono">× {l.quantity}</span>
                                                        </span>
                                                        <span className="font-mono font-medium shrink-0">{formatVnd(l.totalVnd)}</span>
                                                    </div>
                                                ))
                                            )}
                                        </div>

                                        {/* Tiền cọc / Đã thu trước */}
                                        {totalPaid > 0 && (
                                            <div className="rounded-xl bg-white p-3.5 border border-[#EAE4D7] shadow-xs space-y-2">
                                                <h4 className="font-bold text-[#8B1E1E] flex justify-between border-b border-[#F0ECE1] pb-1.5">
                                                    <span>Tiền cọc / Đã thu trước</span>
                                                    <span className="font-mono font-bold text-[#8B1E1E]">-{formatVnd(totalPaid)}</span>
                                                </h4>
                                                <div className="flex justify-between py-0.5 text-[#8B1E1E]">
                                                    <span>Đã thanh toán lúc mở vé</span>
                                                    <span className="font-mono font-medium">-{formatVnd(totalPaid)}</span>
                                                </div>
                                            </div>
                                        )}

                                        {/* Thu mua cá */}
                                        {fishBuybackLines.length > 0 && (
                                            <div className="rounded-xl bg-white p-3.5 border border-[#EAE4D7] shadow-xs space-y-2">
                                                <h4 className="font-bold text-[#8B1E1E] flex justify-between border-b border-[#F0ECE1] pb-1.5">
                                                    <span>Thu cá từ cần thủ</span>
                                                    <span className="font-mono">-{formatVnd(fishBuybackTotal)}</span>
                                                </h4>
                                                {fishBuybackLines.map((l) => (
                                                    <div key={l.id} className="flex justify-between py-0.5 text-[#8B1E1E]">
                                                        <span>{l.name} {l.fishBuyback ? `(${l.fishBuyback.weight} kg)` : ""}</span>
                                                        <span className="font-mono font-medium">-{formatVnd(Math.abs(l.totalVnd))}</span>
                                                    </div>
                                                ))}
                                            </div>
                                        )}

                                        {/* Tổng kết toàn bộ bill */}
                                        <div className="rounded-xl bg-[#25130D] text-[#F4DFB7] p-3.5 shadow-md space-y-2">
                                            <div className="flex justify-between text-xs text-[#BDA989]">
                                                <span>Tổng chi phí (Gói + SP + Gia hạn):</span>
                                                <span className="font-mono font-medium text-white">{formatVnd(totalCharges)}</span>
                                            </div>
                                            {totalPaid > 0 && (
                                                <div className="flex justify-between text-xs text-[#BDA989]">
                                                    <span className="text-[#FF8A80]">Tiền cọc / Đã thu trước:</span>
                                                    <span className="font-mono font-medium text-[#FF8A80]">-{formatVnd(totalPaid)}</span>
                                                </div>
                                            )}
                                            {fishBuybackTotal > 0 && (
                                                <div className="flex justify-between text-xs text-[#BDA989]">
                                                    <span className="text-[#FF8A80]">Tiền thu mua cá từ khách:</span>
                                                    <span className="font-mono font-medium text-[#FF8A80]">-{formatVnd(fishBuybackTotal)}</span>
                                                </div>
                                            )}
                                            <div className="border-t border-[#6F4723] pt-2 flex items-center justify-between">
                                                <div>
                                                    <p className="text-xs font-bold text-[#F4DFB7]">
                                                        {netBalance < 0
                                                            ? "💸 HỒ THỐI LẠI TIỀN CHO KHÁCH"
                                                            : netBalance > 0
                                                            ? "⚖️ CẦN THU THÊM CỦA KHÁCH"
                                                            : "⚖️ ĐÃ THANH TOÁN ĐỦ"}
                                                    </p>
                                                    <p className="text-[10px] text-[#BDA989]/80">
                                                        (Chi phí - Đã thu trước - Thu cá)
                                                    </p>
                                                </div>
                                                <span className={`text-lg font-bold font-mono ${
                                                    netBalance < 0 ? "text-[#FF8A80]" : netBalance > 0 ? "text-[#F4DFB7]" : "text-emerald-400"
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
                    onCompleted={() => {
                        setSettlementSessionId(null);
                        router.refresh();
                    }}
                />
            )}
        </>
    );
}
