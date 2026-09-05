"use client";

import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import Link from "next/link";
import { Button } from "@/components/ui/button";

interface Product {
    id: string;
    sku: string | null;
    name: string;
    priceVnd: number;
}

export interface ActiveSession {
    id: string;
    plannedEndAt: string;
    customerName: string | null;
    hutLabel: string;
    invoiceId: string | null;
}

interface SalesPosProps {
    activeSessions: ActiveSession[];
}

interface CartItem {
    product: Product;
    quantity: number;
}

function formatVnd(amount: number): string {
    return new Intl.NumberFormat("vi-VN").format(amount) + " đ";
}

// Simple client-side countdown timer for active sessions dropdown
function useSessionCountdown(plannedEndAtIso: string) {
    const [timeLeft, setTimeLeft] = useState("");

    useEffect(() => {
        function update() {
            const diff = new Date(plannedEndAtIso).getTime() - Date.now();
            if (diff <= 0) {
                const overMs = Math.abs(diff);
                const overM = Math.floor(overMs / 60000);
                setTimeLeft(`(Quá ${overM}p)`);
                return;
            }
            const h = Math.floor(diff / 3600000);
            const m = Math.floor((diff % 3600000) / 60000);
            setTimeLeft(`(Còn ${h > 0 ? `${h}h` : ""}${m}p)`);
        }
        update();
        const interval = setInterval(update, 30000);
        return () => clearInterval(interval);
    }, [plannedEndAtIso]);

    return timeLeft;
}

function SessionDropdownItem({ session }: { session: ActiveSession }) {
    const timeInfo = useSessionCountdown(session.plannedEndAt);
    return (
        <option value={session.id}>
            {session.hutLabel} · {session.customerName || "Khách lẻ"} {timeInfo}
        </option>
    );
}

export function SalesPos({ activeSessions }: SalesPosProps) {
    const router = useRouter();

    const [products, setProducts] = useState<Product[]>([]);
    const [isLoadingProducts, setIsLoadingProducts] = useState(true);
    const [loadError, setLoadError] = useState("");
    const [search, setSearch] = useState("");

    // POS Modes: "SESSION" (Vé đang câu) or "RETAIL" (Phiếu tạm)
    const [mode, setMode] = useState<"SESSION" | "RETAIL">("SESSION");
    const [selectedSessionId, setSelectedSessionId] = useState<string>(
        activeSessions[0]?.id ?? "",
    );
    const [paymentMethod, setPaymentMethod] = useState<"CASH" | "BANK_TRANSFER">("CASH");

    // Cart State
    const [cart, setCart] = useState<CartItem[]>([]);

    // Operation State
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [errorMsg, setErrorMsg] = useState("");
    const [successModal, setSuccessModal] = useState<{
        isOpen: boolean;
        message: string;
        invoiceId?: string;
    } | null>(null);

    // Fetch products
    useEffect(() => {
        let cancelled = false;
        fetch("/api/products")
            .then((r) => r.json())
            .then((data: { products?: Product[]; error?: string }) => {
                if (cancelled) return;
                if (data.error) {
                    setLoadError(data.error);
                } else {
                    setProducts(data.products ?? []);
                }
            })
            .catch(() => {
                if (!cancelled) setLoadError("Không thể kết nối đến máy chủ.");
            })
            .finally(() => {
                if (!cancelled) setIsLoadingProducts(false);
            });
        return () => {
            cancelled = true;
        };
    }, []);

    // Filter products
    const filteredProducts = products.filter((p) =>
        p.name.toLowerCase().includes(search.toLowerCase()) ||
        (p.sku && p.sku.toLowerCase().includes(search.toLowerCase())),
    );

    // Cart actions
    function addToCart(product: Product) {
        setCart((prev) => {
            const existing = prev.find((item) => item.product.id === product.id);
            if (existing) {
                return prev.map((item) =>
                    item.product.id === product.id
                        ? { ...item, quantity: item.quantity + 1 }
                        : item,
                );
            }
            return [...prev, { product, quantity: 1 }];
        });
        setErrorMsg("");
    }

    function updateQuantity(productId: string, amount: number) {
        setCart((prev) =>
            prev
                .map((item) => {
                    if (item.product.id === productId) {
                        const newQ = item.quantity + amount;
                        return { ...item, quantity: newQ };
                    }
                    return item;
                })
                .filter((item) => item.quantity > 0),
        );
    }

    function removeFromCart(productId: string) {
        setCart((prev) => prev.filter((item) => item.product.id !== productId));
    }

    function clearCart() {
        setCart([]);
        setErrorMsg("");
    }

    const totalAmount = cart.reduce(
        (sum, item) => sum + item.product.priceVnd * item.quantity,
        0,
    );

    // Handle submit order
    async function handleSubmit() {
        if (cart.length === 0) return;
        setIsSubmitting(true);
        setErrorMsg("");

        try {
            if (mode === "SESSION") {
                // 1. Validate session selection
                const targetSession = activeSessions.find(
                    (s) => s.id === selectedSessionId,
                );
                if (!targetSession) {
                    setErrorMsg("Vui lòng chọn vé câu đang hoạt động.");
                    setIsSubmitting(false);
                    return;
                }

                let invoiceId = targetSession.invoiceId;

                // 2. If session doesn't have a DRAFT invoice yet, create it on-the-fly
                if (!invoiceId) {
                    const invRes = await fetch("/api/invoices", {
                        method: "POST",
                        headers: { "Content-Type": "application/json" },
                        body: JSON.stringify({ fishingSessionId: targetSession.id }),
                    });
                    const invData = await invRes.json();
                    if (!invRes.ok) {
                        setErrorMsg(
                            invData.error ?? "Không thể khởi tạo hóa đơn nháp cho phiên câu.",
                        );
                        setIsSubmitting(false);
                        return;
                    }
                    invoiceId = invData.id;
                }

                if (!invoiceId) {
                    setErrorMsg("Không tìm thấy mã hóa đơn nháp liên kết.");
                    setIsSubmitting(false);
                    return;
                }

                // 3. Add products to invoice lines
                for (const item of cart) {
                    const lineIdempotencyKey = crypto.randomUUID();
                    const lineRes = await fetch(`/api/invoices/${invoiceId}/lines`, {
                        method: "POST",
                        headers: {
                            "Content-Type": "application/json",
                            "Idempotency-Key": lineIdempotencyKey,
                        },
                        body: JSON.stringify({
                            productId: item.product.id,
                            quantity: item.quantity,
                        }),
                    });

                    if (!lineRes.ok) {
                        const lineData = await lineRes.json();
                        setErrorMsg(
                            lineData.error ??
                                `Không thể thêm "${item.product.name}" vào hóa đơn.`,
                        );
                        setIsSubmitting(false);
                        return;
                    }
                }

                // Success for Session Order
                setSuccessModal({
                    isOpen: true,
                    message: `Đã thêm thành công ${cart.length} mặt hàng vào vé câu ${targetSession.hutLabel}.`,
                });
                clearCart();
                router.refresh();
            } else {
                // RETAIL MODE (Phiếu tạm)
                // 1. Create independent retail invoice
                const invRes = await fetch("/api/invoices", {
                    method: "POST",
                    headers: { "Content-Type": "application/json" },
                    body: JSON.stringify({}), // empty body triggers retail invoice
                });
                const invData = await invRes.json();
                if (!invRes.ok) {
                    setErrorMsg(invData.error ?? "Không thể khởi tạo hóa đơn bán lẻ.");
                    setIsSubmitting(false);
                    return;
                }
                const retailInvoiceId = invData.id;

                // 2. Add products to lines
                for (const item of cart) {
                    const lineIdempotencyKey = crypto.randomUUID();
                    const lineRes = await fetch(`/api/invoices/${retailInvoiceId}/lines`, {
                        method: "POST",
                        headers: {
                            "Content-Type": "application/json",
                            "Idempotency-Key": lineIdempotencyKey,
                        },
                        body: JSON.stringify({
                            productId: item.product.id,
                            quantity: item.quantity,
                        }),
                    });

                    if (!lineRes.ok) {
                        const lineData = await lineRes.json();
                        setErrorMsg(
                            lineData.error ??
                                `Không thể thêm "${item.product.name}" vào hóa đơn bán lẻ.`,
                        );
                        setIsSubmitting(false);
                        return;
                    }
                }

                // 3. Create Payment (actual monetization)
                const paymentIdempotencyKey = crypto.randomUUID();
                const payRes = await fetch(`/api/invoices/${retailInvoiceId}/payments`, {
                    method: "POST",
                    headers: {
                        "Content-Type": "application/json",
                        "Idempotency-Key": paymentIdempotencyKey,
                    },
                    body: JSON.stringify({
                        amountVnd: totalAmount,
                        method: paymentMethod === "CASH" ? "CASH" : "BANK_TRANSFER",
                    }),
                });

                if (!payRes.ok) {
                    const payData = await payRes.json();
                    setErrorMsg(payData.error ?? "Thêm sản phẩm thành công nhưng thanh toán thất bại.");
                    setIsSubmitting(false);
                    return;
                }

                // Success for Retail direct payment
                setSuccessModal({
                    isOpen: true,
                    message: "Đã thanh toán phiếu tạm thành công!",
                    invoiceId: retailInvoiceId,
                });
                clearCart();
                router.refresh();
            }
        } catch {
            setErrorMsg("Lỗi kết nối mạng hoặc lỗi hệ thống.");
        } finally {
            setIsSubmitting(false);
        }
    }

    return (
        <div className="flex flex-col gap-4 pb-20">
            {/* Link to invoices history */}
            <div className="flex justify-end">
                <Link
                    href="/invoices/history"
                    className="inline-flex h-9 items-center justify-center gap-1.5 rounded-xl border border-[#D9D2C8] bg-white px-4 text-xs font-semibold text-[#8A5A20] hover:bg-[#F4F2EE] transition-colors"
                >
                    <svg
                        className="h-4 w-4"
                        fill="none"
                        viewBox="0 0 24 24"
                        strokeWidth={2}
                        stroke="currentColor"
                    >
                        <path
                            strokeLinecap="round"
                            strokeLinejoin="round"
                            d="M12 6v6h4.5m4.5 0a9 9 0 1 1-18 0 9 9 0 0 1 18 0Z"
                        />
                    </svg>
                    <span>Xem lịch sử hóa đơn</span>
                </Link>
            </div>

            {/* Error Notification */}
            {errorMsg && (
                <div className="rounded-xl border border-[#8B1E1E]/30 bg-[#FAECEC] p-3.5 text-xs font-semibold text-[#8B1E1E]">
                    {errorMsg}
                </div>
            )}

            {/* Order Mode Selector */}
            <div className="rounded-2xl border border-[#D9D2C8] bg-white p-4">
                <label className="text-xs font-bold uppercase tracking-wide text-[#766F67]">
                    Hình thức bán hàng
                </label>
                <div className="mt-2.5 grid grid-cols-2 gap-2">
                    <button
                        type="button"
                        onClick={() => {
                            setMode("SESSION");
                            setErrorMsg("");
                        }}
                        className={`flex h-11 items-center justify-center rounded-xl border text-xs font-bold transition-all ${
                            mode === "SESSION"
                                ? "border-[#8A5A20] bg-[#EFE4CF] text-[#8A5A20]"
                                : "border-[#D9D2C8] bg-white text-[#27231F]"
                        }`}
                    >
                        Vé đang câu
                    </button>
                    <button
                        type="button"
                        onClick={() => {
                            setMode("RETAIL");
                            setErrorMsg("");
                        }}
                        className={`flex h-11 items-center justify-center rounded-xl border text-xs font-bold transition-all ${
                            mode === "RETAIL"
                                ? "border-[#8A5A20] bg-[#EFE4CF] text-[#8A5A20]"
                                : "border-[#D9D2C8] bg-white text-[#27231F]"
                        }`}
                    >
                        Phiếu tạm / Bán lẻ
                    </button>
                </div>

                {/* Dropdown active sessions */}
                {mode === "SESSION" && (
                    <div className="mt-3.5 space-y-1.5">
                        <label className="text-xs font-semibold text-[#766F67]">
                            Chọn vé câu:
                        </label>
                        {activeSessions.length === 0 ? (
                            <div className="rounded-xl bg-[#FAECEC] border border-[#8B1E1E]/20 p-3 text-center text-xs text-[#8B1E1E]">
                                Hiện không có phiên câu nào đang hoạt động. Vui lòng chuyển sang &quot;Phiếu tạm&quot; để bán lẻ.
                            </div>
                        ) : (
                            <select
                                value={selectedSessionId}
                                onChange={(e) => setSelectedSessionId(e.target.value)}
                                className="h-11 w-full rounded-xl border border-[#D9D2C8] bg-white px-3 text-xs text-[#27231F] focus:border-[#8A5A20] focus:outline-none"
                            >
                                {activeSessions.map((session) => (
                                    <SessionDropdownItem key={session.id} session={session} />
                                ))}
                            </select>
                        )}
                    </div>
                )}

                {/* Payment method selection for Retail */}
                {mode === "RETAIL" && (
                    <div className="mt-3.5 space-y-1.5">
                        <label className="text-xs font-semibold text-[#766F67]">
                            Phương thức thanh toán:
                        </label>
                        <div className="grid grid-cols-2 gap-2">
                            <button
                                type="button"
                                onClick={() => setPaymentMethod("CASH")}
                                className={`flex h-10 items-center justify-center rounded-lg border text-xs font-medium transition-all ${
                                    paymentMethod === "CASH"
                                        ? "border-[#2D6A4F] bg-[#E8F3ED] text-[#2D6A4F] font-bold"
                                        : "border-[#D9D2C8] bg-white text-[#27231F]"
                                }`}
                            >
                                Tiền mặt
                            </button>
                            <button
                                type="button"
                                onClick={() => setPaymentMethod("BANK_TRANSFER")}
                                className={`flex h-10 items-center justify-center rounded-lg border text-xs font-medium transition-all ${
                                    paymentMethod === "BANK_TRANSFER"
                                        ? "border-[#2D6A4F] bg-[#E8F3ED] text-[#2D6A4F] font-bold"
                                        : "border-[#D9D2C8] bg-white text-[#27231F]"
                                }`}
                            >
                                Chuyển khoản
                            </button>
                        </div>
                    </div>
                )}
            </div>

            {/* Catalog Grid */}
            <div className="rounded-2xl border border-[#D9D2C8] bg-white p-4 space-y-3">
                <div className="flex items-center justify-between">
                    <label className="text-xs font-bold uppercase tracking-wide text-[#766F67]">
                        Danh mục sản phẩm
                    </label>
                </div>

                {/* Search */}
                <div className="relative">
                    <svg
                        className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-[#766F67]"
                        fill="none"
                        viewBox="0 0 24 24"
                        strokeWidth={2}
                        stroke="currentColor"
                    >
                        <path strokeLinecap="round" strokeLinejoin="round" d="m21 21-5.197-5.197m0 0A7.5 7.5 0 1 0 5.196 5.196a7.5 7.5 0 0 0 10.607 10.607Z" />
                    </svg>
                    <input
                        type="search"
                        placeholder="Tìm sản phẩm (Tên, SKU)..."
                        value={search}
                        onChange={(e) => setSearch(e.target.value)}
                        className="h-10 w-full rounded-xl border border-[#D9D2C8] bg-[#F4F2EE] pl-9 pr-3 text-[13px] text-[#27231F] placeholder:text-[#766F67] focus:border-[#8A5A20] focus:outline-none"
                    />
                </div>

                {/* Product catalog scroll area */}
                <div className="max-h-75 overflow-y-auto pr-1">
                    {isLoadingProducts ? (
                        <div className="flex items-center justify-center py-8">
                            <svg className="h-6 w-6 animate-spin text-[#8A5A20]" fill="none" viewBox="0 0 24 24">
                                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                            </svg>
                        </div>
                    ) : loadError ? (
                        <div className="rounded-xl border border-[#8B1E1E]/30 bg-[#FAECEC] p-3 text-center text-xs text-[#8B1E1E]">
                            {loadError}
                        </div>
                    ) : filteredProducts.length === 0 ? (
                        <div className="rounded-xl border border-[#D9D2C8] bg-[#F4F2EE] p-4 text-center text-xs text-[#766F67]">
                            {search ? "Không tìm thấy sản phẩm." : "Hệ thống chưa có sản phẩm nào."}
                        </div>
                    ) : (
                        <div className="grid grid-cols-2 gap-2">
                            {filteredProducts.map((p) => {
                                const inCart = cart.find((item) => item.product.id === p.id);
                                return (
                                    <button
                                        key={p.id}
                                        type="button"
                                        onClick={() => addToCart(p)}
                                        className={`flex flex-col gap-1 rounded-xl border p-3 text-left transition-all ${
                                            inCart
                                                ? "border-[#8A5A20] bg-[#EFE4CF] ring-1 ring-[#8A5A20]/20"
                                                : "border-[#D9D2C8] bg-white hover:bg-[#F9F6F1]"
                                        }`}
                                    >
                                        <span className="text-[12px] font-bold text-[#27231F] line-clamp-2 leading-tight">
                                            {p.name}
                                        </span>
                                        <span className="text-[12px] font-bold text-[#8A5A20]">
                                            {formatVnd(p.priceVnd)}
                                        </span>
                                        {p.sku && (
                                            <span className="text-[10px] text-[#766F67]">
                                                SKU: {p.sku}
                                            </span>
                                        )}
                                        {inCart && (
                                            <span className="mt-1 self-start rounded bg-[#8A5A20] px-1.5 py-0.5 text-[10px] font-bold text-white">
                                                Đã chọn ({inCart.quantity})
                                            </span>
                                        )}
                                    </button>
                                );
                            })}
                        </div>
                    )}
                </div>
            </div>

            {/* Pending Order Cart */}
            <div className="rounded-2xl border border-[#D9D2C8] bg-white p-4 space-y-3">
                <div className="flex items-center justify-between border-b border-[#D9D2C8] pb-2">
                    <label className="text-xs font-bold uppercase tracking-wide text-[#766F67]">
                        Đơn chờ ({cart.length})
                    </label>
                    {cart.length > 0 && (
                        <button
                            type="button"
                            onClick={clearCart}
                            className="text-xs font-bold text-[#8B1E1E] hover:underline"
                        >
                            Xóa đơn chờ
                        </button>
                    )}
                </div>

                {cart.length === 0 ? (
                    <div className="py-6 text-center text-xs text-[#766F67]">
                        Chưa chọn sản phẩm nào. Bấm vào sản phẩm bên trên để thêm vào đơn.
                    </div>
                ) : (
                    <div className="divide-y divide-[#D9D2C8] max-h-55 overflow-y-auto pr-1">
                        {cart.map((item) => (
                            <div key={item.product.id} className="py-2.5 flex items-center justify-between gap-3">
                                <div className="min-w-0 flex-1">
                                    <p className="truncate text-xs font-bold text-[#27231F]">
                                        {item.product.name}
                                    </p>
                                    <p className="text-[11px] text-[#766F67]">
                                        {formatVnd(item.product.priceVnd)}
                                    </p>
                                </div>
                                <div className="flex items-center gap-2.5 shrink-0">
                                    {/* Stepper */}
                                    <div className="flex items-center gap-1.5">
                                        <button
                                            type="button"
                                            onClick={() => updateQuantity(item.product.id, -1)}
                                            className="flex h-7 w-7 items-center justify-center rounded border border-[#D9D2C8] bg-white text-xs font-bold text-[#27231F] active:bg-[#F4F2EE]"
                                        >
                                            −
                                        </button>
                                        <span className="w-6 text-center text-xs font-bold tabular-nums text-[#27231F]">
                                            {item.quantity}
                                        </span>
                                        <button
                                            type="button"
                                            onClick={() => updateQuantity(item.product.id, 1)}
                                            className="flex h-7 w-7 items-center justify-center rounded border border-[#D9D2C8] bg-white text-xs font-bold text-[#27231F] active:bg-[#F4F2EE]"
                                        >
                                            +
                                        </button>
                                    </div>
                                    <span className="w-16 text-right text-xs font-bold tabular-nums text-[#27231F]">
                                        {formatVnd(item.product.priceVnd * item.quantity)}
                                    </span>
                                    <button
                                        type="button"
                                        onClick={() => removeFromCart(item.product.id)}
                                        className="text-[#8B1E1E] hover:text-[#701717] p-1"
                                        aria-label="Xóa mặt hàng"
                                    >
                                        <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor">
                                            <path strokeLinecap="round" strokeLinejoin="round" d="m14.74 9-.346 9m-4.788 0L9.26 9m9.968-3.21c.342.052.682.107 1.022.166m-1.022-.165L18.16 19.673a2.25 2.25 0 0 1-2.244 2.077H8.084a2.25 2.25 0 0 1-2.244-2.077L4.772 5.79m14.456 0a48.108 48.108 0 0 0-3.478-.397m-12 .562c.34-.059.68-.114 1.022-.165m0 0a48.11 48.11 0 0 1 3.478-.397m7.5 0v-.916c0-1.18-.91-2.164-2.09-2.201a51.964 51.964 0 0 0-3.32 0c-1.18.037-2.09 1.022-2.09 2.201v.916m7.5 0a48.667 48.667 0 0 0-7.5 0" />
                                        </svg>
                                    </button>
                                </div>
                            </div>
                        ))}
                    </div>
                )}
            </div>

            {/* Sticky Actions Bar at the bottom (relative wrapper, margin-top pushes it) */}
            <div className="rounded-2xl border border-[#D9D2C8] bg-white p-4 space-y-3 shadow-md">
                <div className="flex items-center justify-between text-sm">
                    <span className="font-semibold text-[#766F67]">Tạm tính:</span>
                    <span className="text-[18px] font-bold text-[#8A5A20] tabular-nums">
                        {formatVnd(totalAmount)}
                    </span>
                </div>

                <Button
                    type="button"
                    size="lg"
                    variant="primary"
                    isLoading={isSubmitting}
                    disabled={cart.length === 0 || isSubmitting || (mode === "SESSION" && activeSessions.length === 0)}
                    onClick={handleSubmit}
                    className="w-full text-sm font-semibold"
                >
                    {mode === "SESSION" ? "Thêm vào vé câu" : "Thanh toán phiếu tạm"}
                </Button>
            </div>

            {/* Success Modal */}
            {successModal?.isOpen && (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
                    <div className="w-full max-w-sm rounded-2xl bg-white p-5 shadow-xl space-y-4 text-center">
                        <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-[#E8F3ED] text-[#2D6A4F]">
                            <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" strokeWidth={2.5} stroke="currentColor">
                                <path strokeLinecap="round" strokeLinejoin="round" d="m4.5 12.75 6 6 9-13.5" />
                            </svg>
                        </div>
                        <div>
                            <h3 className="text-base font-bold text-[#27231F]">Thành công</h3>
                            <p className="mt-1.5 text-xs text-[#766F67] leading-relaxed">
                                {successModal.message}
                            </p>
                        </div>
                        <div className="flex flex-col gap-2 pt-2">
                            {successModal.invoiceId && (
                                <Link
                                    href={`/invoices/${successModal.invoiceId}`}
                                    className="flex h-11 items-center justify-center rounded-xl bg-[#2D6A4F] text-xs font-semibold text-white hover:bg-[#22533D] transition-colors"
                                >
                                    Xem chi tiết & In hóa đơn
                                </Link>
                            )}
                            <button
                                type="button"
                                onClick={() => setSuccessModal(null)}
                                className="flex h-11 items-center justify-center rounded-xl border border-[#D9D2C8] bg-white text-xs font-semibold text-[#27231F] hover:bg-[#F4F2EE] transition-colors"
                            >
                                Bắt đầu đơn mới
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}
