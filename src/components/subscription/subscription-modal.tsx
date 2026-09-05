"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";

interface SubscriptionModalProps {
    isOpen: boolean;
    onClose: () => void;
    currentPlan?: "TRIAL" | "SILVER" | "GOLD";
    currentExpiresAt?: string | null;
}

type Step = "SELECT_PLAN" | "QR_PAYMENT" | "SUCCESS";

export function SubscriptionModal(props: SubscriptionModalProps) {
    if (!props.isOpen) return null;
    return <SubscriptionModalContent {...props} />;
}

function SubscriptionModalContent({
    onClose,
    currentPlan = "TRIAL",
    currentExpiresAt,
}: SubscriptionModalProps) {
    const router = useRouter();
    const [step, setStep] = useState<Step>("SELECT_PLAN");
    const [selectedPlan, setSelectedPlan] = useState<"SILVER" | "GOLD">("GOLD");
    const [isLoading, setIsLoading] = useState(false);
    const [errorMessage, setErrorMessage] = useState("");
    const [copiedField, setCopiedField] = useState<string | null>(null);

    // Order state
    const [orderData, setOrderData] = useState<{
        order: { id: string; orderCode: string; amountVnd: number; planCode: string };
        paymentInfo: {
            qrUrl: string;
            memo: string;
            amount: number;
            accountNumber: string;
            accountName: string;
            bankName: string;
            hotline: string;
            legalFeeNote: string;
        };
    } | null>(null);

    // Polling order status while in QR_PAYMENT step
    useEffect(() => {
        if (step !== "QR_PAYMENT" || !orderData?.order?.id) {
            return;
        }

        let isMounted = true;
        const interval = setInterval(async () => {
            try {
                const res = await fetch(`/api/subscription/orders/${orderData.order.id}`);
                if (!res.ok) return;
                const data = await res.json();
                if (data?.order?.status === "PAID" && isMounted) {
                    setStep("SUCCESS");
                    router.refresh();
                }
            } catch (err) {
                console.error("Polling error:", err);
            }
        }, 3000);

        return () => {
            isMounted = false;
            clearInterval(interval);
        };
    }, [step, orderData, router]);

    const handleCreateOrder = async () => {
        setIsLoading(true);
        setErrorMessage("");

        try {
            const res = await fetch("/api/subscription/orders", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ plan: selectedPlan }),
            });

            const data = await res.json();
            if (!res.ok) {
                throw new Error(data.error || "Không thể tạo đơn hàng.");
            }

            setOrderData(data);
            setStep("QR_PAYMENT");
        } catch (err: unknown) {
            const message = err instanceof Error ? err.message : "Đã xảy ra lỗi kết nối.";
            setErrorMessage(message);
        } finally {
            setIsLoading(false);
        }
    };

    const copyToClipboard = async (text: string, fieldName: string) => {
        try {
            await navigator.clipboard.writeText(text);
            setCopiedField(fieldName);
            setTimeout(() => setCopiedField(null), 2000);
        } catch {
            // Fallback
        }
    };

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-xs p-4 overflow-y-auto">
            <div className="relative w-full max-w-lg rounded-2xl bg-white p-5 sm:p-6 shadow-2xl border border-[#D9D2C8] my-8 animate-in fade-in zoom-in-95 duration-200">
                {/* Header */}
                <div className="flex items-center justify-between border-b border-[#EBE6DF] pb-3.5 mb-4">
                    <div>
                        <h2 className="text-lg font-bold text-[#27231F] flex items-center gap-2">
                            <span>👑</span>
                            <span>
                                {step === "SELECT_PLAN" && "Gói Cước & Gia Hạn Hồ Câu"}
                                {step === "QR_PAYMENT" && "Thanh Toán VietQR Tự Động"}
                                {step === "SUCCESS" && "Kích Hoạt Thành Công!"}
                            </span>
                        </h2>
                        <p className="text-xs text-[#766F67] mt-0.5">
                            {step === "SELECT_PLAN" && "Lựa chọn gói dịch vụ phù hợp với quy mô hồ của bạn"}
                            {step === "QR_PAYMENT" && "Quét mã để kích hoạt tức thì sau 5-10 giây"}
                            {step === "SUCCESS" && "Cảm ơn bạn đã đồng hành cùng Quản Lý Hồ Câu"}
                        </p>
                    </div>
                    <button
                        type="button"
                        onClick={onClose}
                        className="rounded-lg p-1.5 text-[#766F67] hover:bg-[#F4F2EE] transition-colors"
                        aria-label="Đóng"
                    >
                        <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                        </svg>
                    </button>
                </div>

                {errorMessage && (
                    <div className="mb-4 rounded-xl bg-rose-50 border border-rose-200 p-3 text-xs text-rose-700 font-medium">
                        ⚠️ {errorMessage}
                    </div>
                )}

                {/* ── STEP 1: CHỌN GÓI ────────────────────────────────────────── */}
                {step === "SELECT_PLAN" && (
                    <div className="space-y-4">
                        {currentExpiresAt && (
                            <div className="rounded-xl bg-[#FAF8F5] border border-[#EBE6DF] px-3.5 py-2 text-xs flex items-center justify-between text-[#766F67]">
                                <span>Gói đang dùng: <strong className="text-[#27231F]">{currentPlan}</strong></span>
                                <span>Hạn: <strong className="text-[#27231F]">{new Date(currentExpiresAt).toLocaleDateString("vi-VN")}</strong></span>
                            </div>
                        )}
                        {/* Silver Plan Card */}
                        <div
                            onClick={() => setSelectedPlan("SILVER")}
                            className={`relative rounded-xl border-2 p-4 cursor-pointer transition-all ${
                                selectedPlan === "SILVER"
                                    ? "border-[#8A5A20] bg-[#FAF8F5] shadow-xs"
                                    : "border-[#D9D2C8] hover:border-[#C4BAAE] bg-white"
                            }`}
                        >
                            <div className="flex items-start justify-between">
                                <div>
                                    <div className="flex items-center gap-2">
                                        <span className="text-base">🥈</span>
                                        <h3 className="font-bold text-[#27231F] text-base">Gói Bạc (Silver)</h3>
                                        <span className="rounded-full bg-slate-100 px-2 py-0.5 text-[11px] font-semibold text-slate-700">
                                            Hồ vừa &amp; nhỏ
                                        </span>
                                    </div>
                                    <p className="text-xs text-[#766F67] mt-1">Phù hợp hồ có dưới 30 chòi/ô câu</p>
                                </div>
                                <div className="text-right">
                                    <div className="text-lg font-black text-[#8A5A20]">99.000 đ</div>
                                    <span className="text-[11px] text-[#766F67]">/ 30 ngày</span>
                                </div>
                            </div>

                            <ul className="mt-3.5 space-y-1.5 text-xs text-[#4A443E] border-t border-[#EBE6DF] pt-3">
                                <li className="flex items-center gap-2">
                                    <span className="text-emerald-600 font-bold">✓</span>
                                    <span>Tối đa <strong>30 ô câu</strong></span>
                                </li>
                                <li className="flex items-center gap-2">
                                    <span className="text-emerald-600 font-bold">✓</span>
                                    <span>Tối đa <strong>1 tài khoản nhân viên</strong></span>
                                </li>
                                <li className="flex items-center gap-2">
                                    <span className="text-emerald-600 font-bold">✓</span>
                                    <span>Đầy đủ tính năng ghi giờ, bán hàng, thu cá &amp; báo cáo ca</span>
                                </li>
                            </ul>
                        </div>

                        {/* Gold Plan Card */}
                        <div
                            onClick={() => setSelectedPlan("GOLD")}
                            className={`relative rounded-xl border-2 p-4 cursor-pointer transition-all ${
                                selectedPlan === "GOLD"
                                    ? "border-[#D97706] bg-[#FFFBEB] shadow-md ring-2 ring-amber-400/30"
                                    : "border-[#D9D2C8] hover:border-[#C4BAAE] bg-white"
                            }`}
                        >
                            <div className="absolute -top-3 right-4 rounded-full bg-linear-to-r from-amber-500 to-amber-600 px-3 py-0.5 text-[10px] font-extrabold uppercase tracking-wide text-white shadow-xs">
                                Khuyên Dùng
                            </div>

                            <div className="flex items-start justify-between">
                                <div>
                                    <div className="flex items-center gap-2">
                                        <span className="text-base">🥇</span>
                                        <h3 className="font-bold text-[#92400E] text-base">Gói Vàng (Gold)</h3>
                                        <span className="rounded-full bg-amber-100 px-2 py-0.5 text-[11px] font-bold text-amber-800">
                                            Không giới hạn
                                        </span>
                                    </div>
                                    <p className="text-xs text-[#766F67] mt-1">Dành cho hồ câu chuyên nghiệp, nhiều khu</p>
                                </div>
                                <div className="text-right">
                                    <div className="text-lg font-black text-[#D97706]">179.000 đ</div>
                                    <span className="text-[11px] text-[#766F67]">/ 30 ngày</span>
                                </div>
                            </div>

                            <ul className="mt-3.5 space-y-1.5 text-xs text-[#4A443E] border-t border-amber-200/60 pt-3">
                                <li className="flex items-center gap-2">
                                    <span className="text-emerald-600 font-bold">✓</span>
                                    <span><strong>Không giới hạn số lượng ô câu</strong> (thoải mái mở rộng)</span>
                                </li>
                                <li className="flex items-center gap-2">
                                    <span className="text-emerald-600 font-bold">✓</span>
                                    <span><strong>Không giới hạn nhân viên &amp; quản lý</strong></span>
                                </li>
                                <li className="flex items-center gap-2">
                                    <span className="text-emerald-600 font-bold">✓</span>
                                    <span>Ưu tiên hỗ trợ kỹ thuật 24/7 &amp; sao lưu thời gian thực</span>
                                </li>
                            </ul>
                        </div>

                        {/* CTA button */}
                        <button
                            type="button"
                            onClick={handleCreateOrder}
                            disabled={isLoading}
                            className="mt-2 flex w-full items-center justify-center gap-2 rounded-xl bg-[#8A5A20] py-3.5 text-sm font-bold text-white hover:bg-[#704716] active:scale-[0.99] transition-all shadow-md disabled:opacity-50 cursor-pointer"
                        >
                            {isLoading ? (
                                <>
                                    <span className="inline-block h-4 w-4 animate-spin rounded-full border-2 border-white border-t-transparent" />
                                    <span>Đang tạo mã thanh toán VietQR...</span>
                                </>
                            ) : (
                                <>
                                    <span>Tiếp Tục Thanh Toán ({selectedPlan === "SILVER" ? "99.000 đ" : "179.000 đ"})</span>
                                    <span>→</span>
                                </>
                            )}
                        </button>
                    </div>
                )}

                {/* ── STEP 2: VIETQR PAYMENT ──────────────────────────────────── */}
                {step === "QR_PAYMENT" && orderData && (
                    <div className="space-y-4">
                        {/* Dynamic VietQR Image Box */}
                        <div className="flex flex-col items-center justify-center rounded-2xl bg-[#FAF8F5] border border-[#EBE6DF] p-4 text-center">
                            <div className="relative rounded-xl bg-white p-2.5 shadow-md border border-[#D9D2C8]">
                                {/* eslint-disable-next-line @next/next/no-img-element */}
                                <img
                                    src={orderData.paymentInfo.qrUrl}
                                    alt="VietQR Techcombank Payment"
                                    className="h-56 w-56 object-contain rounded-lg sm:h-64 sm:w-64"
                                />
                            </div>

                            {/* Ghi chú pháp lý minh bạch chi phí (ĐẶT NGAY DƯỚI MÃ QR THEO YÊU CẦU) */}
                            <p className="mt-3 text-[11px] font-medium leading-relaxed text-[#766F67] px-2 italic text-center">
                                &ldquo;{orderData.paymentInfo.legalFeeNote}&rdquo;
                            </p>
                        </div>

                        {/* Bank Details Table with Fast Copy */}
                        <div className="rounded-xl border border-[#D9D2C8] bg-white p-3.5 space-y-2 text-xs">
                            <div className="flex items-center justify-between py-1 border-b border-[#F0EBE4]">
                                <span className="text-[#766F67]">Ngân hàng:</span>
                                <span className="font-bold text-[#27231F]">{orderData.paymentInfo.bankName} (TCB)</span>
                            </div>

                            <div className="flex items-center justify-between py-1 border-b border-[#F0EBE4]">
                                <span className="text-[#766F67]">Chủ tài khoản:</span>
                                <span className="font-bold text-[#27231F] uppercase">{orderData.paymentInfo.accountName}</span>
                            </div>

                            <div className="flex items-center justify-between py-1 border-b border-[#F0EBE4]">
                                <span className="text-[#766F67]">Số tài khoản:</span>
                                <div className="flex items-center gap-1.5">
                                    <span className="font-mono text-sm font-black text-[#102A43]">
                                        {orderData.paymentInfo.accountNumber}
                                    </span>
                                    <button
                                        type="button"
                                        onClick={() => copyToClipboard(orderData.paymentInfo.accountNumber, "stk")}
                                        className="rounded bg-[#EFECE6] px-2 py-0.5 text-[10px] font-bold text-[#8A5A20] hover:bg-[#E5DFD6]"
                                    >
                                        {copiedField === "stk" ? "✓ Đã chép" : "Sao chép"}
                                    </button>
                                </div>
                            </div>

                            <div className="flex items-center justify-between py-1 border-b border-[#F0EBE4]">
                                <span className="text-[#766F67]">Số tiền:</span>
                                <div className="flex items-center gap-1.5">
                                    <span className="font-mono text-sm font-black text-rose-600">
                                        {orderData.order.amountVnd.toLocaleString("vi-VN")} đ
                                    </span>
                                    <button
                                        type="button"
                                        onClick={() => copyToClipboard(String(orderData.order.amountVnd), "amount")}
                                        className="rounded bg-[#EFECE6] px-2 py-0.5 text-[10px] font-bold text-[#8A5A20] hover:bg-[#E5DFD6]"
                                    >
                                        {copiedField === "amount" ? "✓ Đã chép" : "Sao chép"}
                                    </button>
                                </div>
                            </div>

                            <div className="flex items-center justify-between py-1">
                                <span className="text-[#766F67]">Nội dung CK:</span>
                                <div className="flex items-center gap-1.5">
                                    <span className="font-mono text-xs font-black bg-amber-100 text-amber-900 px-2 py-0.5 rounded">
                                        {orderData.paymentInfo.memo}
                                    </span>
                                    <button
                                        type="button"
                                        onClick={() => copyToClipboard(orderData.paymentInfo.memo, "memo")}
                                        className="rounded bg-[#8A5A20] px-2 py-0.5 text-[10px] font-bold text-white hover:bg-[#704716]"
                                    >
                                        {copiedField === "memo" ? "✓ Đã chép" : "Sao chép"}
                                    </button>
                                </div>
                            </div>
                        </div>

                        {/* Polling Pulse Status */}
                        <div className="rounded-xl bg-amber-50/80 border border-amber-200/80 p-3 text-xs text-amber-900 flex items-center justify-between">
                            <div className="flex items-center gap-2">
                                <span className="inline-block h-2.5 w-2.5 rounded-full bg-amber-500 animate-ping" />
                                <span>Đang chờ chuyển khoản... (Tự động kích hoạt)</span>
                            </div>
                            <span className="text-[11px] font-bold text-amber-700">Mã: {orderData.order.orderCode}</span>
                        </div>

                        {/* Hotline Cứu hộ BẮT BUỘC NỔI BẬT THEO YÊU CẦU */}
                        <div className="rounded-xl bg-rose-50 border-2 border-rose-300 p-3 text-center shadow-xs">
                            <p className="text-xs font-bold text-rose-800 flex items-center justify-center gap-1.5">
                                <span>📞</span>
                                <span>Gặp sự cố chuyển khoản? Liên hệ ngay Hotline hỗ trợ trực tiếp:</span>
                            </p>
                            <a
                                href={`tel:${orderData.paymentInfo.hotline}`}
                                className="inline-block mt-1 text-base font-black tracking-wider text-rose-600 hover:text-rose-700 hover:underline"
                            >
                                {orderData.paymentInfo.hotline}
                            </a>
                        </div>

                        <div className="flex items-center gap-2 pt-1">
                            <button
                                type="button"
                                onClick={() => setStep("SELECT_PLAN")}
                                className="flex-1 rounded-xl border border-[#D9D2C8] py-2.5 text-xs font-semibold text-[#766F67] hover:bg-[#F4F2EE]"
                            >
                                ← Đổi gói khác
                            </button>
                            <button
                                type="button"
                                onClick={onClose}
                                className="flex-1 rounded-xl bg-[#EFECE6] py-2.5 text-xs font-bold text-[#4A443E] hover:bg-[#E5DFD6]"
                            >
                                Đóng &amp; để chuyển sau
                            </button>
                        </div>
                    </div>
                )}

                {/* ── STEP 3: SUCCESS ─────────────────────────────────────────── */}
                {step === "SUCCESS" && (
                    <div className="text-center py-6 space-y-4">
                        <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-emerald-100 text-emerald-600 text-3xl shadow-inner">
                            ✓
                        </div>
                        <div>
                            <h3 className="text-lg font-bold text-[#27231F]">Gia Hạn Dịch Vụ Thành Công!</h3>
                            <p className="text-xs text-[#766F67] mt-1.5 max-w-sm mx-auto">
                                Hệ thống đã tự động cộng dồn 30 ngày sử dụng vào tài khoản hồ câu của bạn.
                            </p>
                        </div>

                        <div className="rounded-xl bg-emerald-50 border border-emerald-200 p-3 text-xs text-emerald-800 font-semibold max-w-xs mx-auto">
                            Trạng thái: ĐANG HOẠT ĐỘNG (ACTIVE)
                        </div>

                        <button
                            type="button"
                            onClick={() => {
                                onClose();
                                router.refresh();
                            }}
                            className="w-full rounded-xl bg-emerald-600 py-3 text-sm font-bold text-white hover:bg-emerald-700 active:scale-[0.99] transition-all shadow-md cursor-pointer"
                        >
                            Hoàn tất &amp; Sử dụng ngay
                        </button>
                    </div>
                )}
            </div>
        </div>
    );
}
