"use client";

import Link from "next/link";
import { useRef, useState } from "react";

import { SessionCountdown } from "./session-countdown";
import { SessionActions } from "./session-actions";
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

export function SessionsClient({
    activeSessions,
    packages,
    fishTypes = [],
    canComplete,
    canCancel,
    canOpenSession,
}: SessionsClientProps) {
    const [selectedId, setSelectedId] = useState<string>(
        activeSessions[0]?.id ?? "",
    );

    // Modal Chi tiết phiên câu khi nhấn giữ
    const [detailSession, setDetailSession] = useState<SerializableSession | null>(null);

    // Long press detection
    const holdTimerRef = useRef<NodeJS.Timeout | null>(null);
    const didLongPressRef = useRef<boolean>(false);

    const selectedSession =
        activeSessions.find((s) => s.id === selectedId) ??
        activeSessions[0] ??
        null;

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
                    className="w-full rounded-2xl border border-[#EAE4D7] bg-white p-8 text-center shadow-sm"
                >
                    <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-full bg-[#F5F2EB]">
                        <svg
                            className="h-7 w-7 text-[#8A5B00]"
                            fill="none"
                            viewBox="0 0 24 24"
                            strokeWidth={1.5}
                            stroke="currentColor"
                        >
                            <path
                                strokeLinecap="round"
                                strokeLinejoin="round"
                                d="M12 6v6h4.5m4.5 0a9 9 0 1 1-18 0 9 9 0 0 1 18 0Z"
                            />
                        </svg>
                    </div>
                    <p className="text-base font-bold text-slate-900">
                        Hiện không có phiên đang câu
                    </p>
                    <p className="mt-1.5 text-xs text-slate-500">
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
                    const invoice = s.invoices[0];
                    const estimatedTotal =
                        invoice?.totalAmountVnd ?? s.package.priceVnd;

                    // Breakdown lines
                    const lines = invoice?.lines ?? [];
                    const productLines = lines.filter(
                        (l) => l.productId !== null || (!l.fishBuybackId && !l.name.startsWith("Gia hạn:")),
                    );
                    const extensionLines = lines.filter((l) =>
                        l.name.startsWith("Gia hạn:"),
                    );
                    const fishBuybackLines = lines.filter(
                        (l) => l.fishBuybackId !== null || l.totalVnd < 0,
                    );

                    const productCount = productLines.reduce(
                        (sum, l) => sum + l.quantity,
                        0,
                    );
                    const fishBuybackTotal = Math.abs(
                        fishBuybackLines.reduce((sum, l) => sum + l.totalVnd, 0),
                    );

                    // Extension hours calculation
                    const extensionHours = extensionLines.length;

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
                            className={`flex flex-col justify-between rounded-xl bg-white p-3.5 sm:p-4 text-left transition-all duration-150 select-none cursor-pointer border ${
                                isSelected
                                    ? "border-2 border-[#9E6B05] ring-2 ring-[#9E6B05]/20 shadow-md bg-[#FFFDF9]"
                                    : "border-[#EAE4D7] hover:border-[#9E6B05]/50 shadow-sm"
                            }`}
                        >
                            {/* Hàng 1: Mã ô & Thời lượng */}
                            <div>
                                <div className="flex items-start justify-between gap-1 mb-1">
                                    <span className="text-sm font-bold text-slate-900 leading-tight truncate">
                                        {hutLabel}
                                    </span>
                                    <span className="shrink-0 text-[11px] font-medium text-slate-500">
                                        {formatDuration(s.package.durationMinutes)}
                                    </span>
                                </div>

                                {/* Hàng 2: Tên khách hàng */}
                                <p className="text-xs font-semibold text-slate-800 truncate mb-2">
                                    {s.customer?.name ?? (
                                        <span className="font-normal text-slate-500">
                                            Khách lẻ
                                        </span>
                                    )}
                                </p>
                            </div>

                            {/* Hàng 3: Đồng hồ đếm ngược */}
                            <div className="my-1">
                                <SessionCountdown plannedEndAt={s.plannedEndAt} />
                            </div>

                            {/* Hàng 4: Tạm tính & Badges */}
                            <div className="mt-2 pt-2 border-t border-[#F0ECE1]">
                                <div className="flex items-center justify-between text-xs text-slate-600 mb-1">
                                    <span>Tạm tính</span>
                                    <span className="font-bold text-slate-900 font-mono">
                                        {formatVnd(estimatedTotal)}
                                    </span>
                                </div>

                                {/* Badges tóm tắt món / gia hạn / thu cá */}
                                {(productCount > 0 || extensionHours > 0 || fishBuybackTotal > 0) && (
                                    <div className="flex flex-wrap gap-1 mt-1.5">
                                        {productCount > 0 && (
                                            <span className="inline-flex items-center rounded bg-[#EAE2CE] px-1.5 py-0.5 text-[10px] font-semibold text-[#8A5B00]">
                                                +{productCount} món
                                            </span>
                                        )}
                                        {extensionHours > 0 && (
                                            <span className="inline-flex items-center rounded bg-[#E8F3ED] px-1.5 py-0.5 text-[10px] font-semibold text-[#2D6A4F]">
                                                +{extensionHours} lần gia hạn
                                            </span>
                                        )}
                                        {fishBuybackTotal > 0 && (
                                            <span className="inline-flex items-center rounded bg-[#FAECEC] px-1.5 py-0.5 text-[10px] font-semibold text-[#8B1E1E]">
                                                Thu cá -{formatVnd(fishBuybackTotal)}
                                            </span>
                                        )}
                                    </div>
                                )}

                                {/* Tên món mới nhất */}
                                {productLines.length > 0 && (
                                    <p className="text-[11px] text-slate-500 truncate mt-1">
                                        {productLines[0].name}
                                        {productLines.length > 1 ? ` +${productLines.length - 1}` : ""}
                                    </p>
                                )}
                            </div>
                        </div>
                    );
                })}
            </div>

            {/* Gợi ý nhấn giữ */}
            <p className="text-center text-[11px] text-slate-500 mt-3">
                💡 Nhấn giữ 1 ô câu để xem chi tiết đầy đủ của phiên
            </p>

            {/* Thanh thao tác nhanh (Quick Action Toolbar) */}
            {selectedSession && (
                <div className="mt-4 pt-3 border-t border-[#EAE4D7]">
                    <div className="mb-3 text-center">
                        <span className="inline-block text-xs font-semibold text-[#8A5B00] bg-[#EAE2CE]/60 rounded-full px-3 py-1">
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
                    />
                </div>
            )}

            {/* ── Modal Chi Tiết Phiên Câu Khi Nhấn Giữ (Long-Press Modal) ──────── */}
            {detailSession && (
                <div
                    className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs"
                    role="dialog"
                    aria-modal="true"
                    aria-label="Chi tiết phiên câu"
                >
                    <div className="w-full max-w-md rounded-2xl bg-[#F5F2EB] border border-[#EAE4D7] shadow-2xl overflow-hidden flex flex-col max-h-[90vh]">
                        {/* Header Modal */}
                        <div className="mobile-pos-header-bar shrink-0">
                            <div>
                                <h3 className="mobile-pos-header-title">
                                    Chi tiết phiên: {detailSession.hutLinks.map((hl) => hl.hut.name).join(" + ")}
                                </h3>
                                <p className="mobile-pos-header-date">
                                    Khách: {detailSession.customer?.name ?? "Khách lẻ"}
                                    {detailSession.customer?.phoneNormalized ? ` (${detailSession.customer.phoneNormalized})` : ""}
                                </p>
                            </div>
                            <button
                                type="button"
                                onClick={() => setDetailSession(null)}
                                className="h-8 w-8 rounded-full flex items-center justify-center text-[#BDA989] hover:text-[#F4DFB7] hover:bg-[#6F4723]"
                            >
                                <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                                </svg>
                            </button>
                        </div>

                        {/* Nội dung chi tiết */}
                        <div className="p-4 overflow-y-auto space-y-3.5 text-xs text-slate-800">
                            {/* Card: Thông tin cơ bản */}
                            <div className="rounded-xl bg-white p-3.5 border border-[#EAE4D7] shadow-xs space-y-2">
                                <div className="flex justify-between">
                                    <span className="text-slate-500">Gói câu áp dụng:</span>
                                    <span className="font-semibold text-slate-900">
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
                                const invoice = detailSession.invoices[0];
                                const lines = invoice?.lines ?? [];
                                const productLines = lines.filter(
                                    (l) => l.productId !== null || (!l.fishBuybackId && !l.name.startsWith("Gia hạn:")),
                                );
                                const extensionLines = lines.filter((l) => l.name.startsWith("Gia hạn:"));
                                const fishLines = lines.filter((l) => l.fishBuybackId !== null || l.totalVnd < 0);

                                const totalProductsVnd = productLines.reduce((sum, l) => sum + l.totalVnd, 0);
                                const totalExtensionsVnd = extensionLines.reduce((sum, l) => sum + l.totalVnd, 0);
                                const totalFishBuybackVnd = Math.abs(fishLines.reduce((sum, l) => sum + l.totalVnd, 0));
                                const currentTotalVnd = invoice?.totalAmountVnd ?? detailSession.package.priceVnd;

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

                                        {/* Thu mua cá */}
                                        {fishLines.length > 0 && (
                                            <div className="rounded-xl bg-white p-3.5 border border-[#EAE4D7] shadow-xs space-y-2">
                                                <h4 className="font-bold text-[#8B1E1E] flex justify-between border-b border-[#F0ECE1] pb-1.5">
                                                    <span>Thu cá từ cần thủ</span>
                                                    <span className="font-mono">-{formatVnd(totalFishBuybackVnd)}</span>
                                                </h4>
                                                {fishLines.map((l) => (
                                                    <div key={l.id} className="flex justify-between py-0.5 text-[#8B1E1E]">
                                                        <span>{l.name} {l.fishBuyback ? `(${l.fishBuyback.weight} kg)` : ""}</span>
                                                        <span className="font-mono font-medium">-{formatVnd(Math.abs(l.totalVnd))}</span>
                                                    </div>
                                                ))}
                                            </div>
                                        )}

                                        {/* Tổng tạm tính */}
                                        <div className="rounded-xl bg-[#25130D] text-[#F4DFB7] p-3.5 shadow-md flex items-center justify-between">
                                            <div>
                                                <p className="text-xs font-semibold text-[#BDA989]">Tổng tạm tính hiện tại</p>
                                                <p className="text-[10px] text-[#BDA989]/80">(Bao gồm tiền giờ + hàng hóa - thu cá)</p>
                                            </div>
                                            <span className="text-lg font-bold font-mono text-[#F4DFB7]">
                                                {formatVnd(currentTotalVnd)}
                                            </span>
                                        </div>
                                    </>
                                );
                            })()}
                        </div>

                        {/* Footer Modal */}
                        <div className="p-3 border-t border-[#EAE4D7] bg-white flex justify-end">
                            <button
                                type="button"
                                onClick={() => setDetailSession(null)}
                                className="mobile-pos-btn mobile-pos-btn-primary w-full py-2.5"
                            >
                                Đóng chi tiết
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </>
    );
}
