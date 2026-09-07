"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { z } from "zod";

import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { InlineAlert } from "@/components/ui/inline-alert";
import { usePrinter } from "@/lib/printing/use-printer";
import { PaymentReceiptData } from "@/lib/printing/types";
import { useNetworkStatus } from "@/lib/network/use-network-status";

export interface RetailCustomer {
    id: string;
    name: string;
    phoneNormalized: string | null;
}

export interface RetailProduct {
    id: string;
    name: string;
    sku: string | null;
    priceVnd: number;
    stock: number;
}

interface CartItem {
    productId: string;
    name: string;
    priceVnd: number;
    quantity: number;
    maxStock: number;
}

interface RetailPosFormProps {
    customers: RetailCustomer[];
    products: RetailProduct[];
}

function formatVnd(amount: number): string {
    return new Intl.NumberFormat("vi-VN").format(amount) + " đ";
}

const quickCustomerSchema = z.object({
    name: z
        .string({ message: "Tên khách hàng là bắt buộc." })
        .trim()
        .min(2, "Tên khách hàng tối thiểu 2 ký tự.")
        .max(100, "Tên khách hàng tối đa 100 ký tự."),
    phone: z
        .string()
        .trim()
        .optional()
        .refine(
            (val) => !val || /^[0-9+()\-.\s]{9,15}$/.test(val),
            "Số điện thoại không đúng định dạng.",
        ),
});

export function RetailPosForm({
    customers: initialCustomers,
    products: initialProducts,
}: RetailPosFormProps) {
    const router = useRouter();
    const { isConnected, printPaymentReceipt } = usePrinter();
    const { isOnline } = useNetworkStatus();

    // Customer state
    const [customerList, setCustomerList] =
        useState<RetailCustomer[]>(initialCustomers);
    const [customerSearch, setCustomerSearch] = useState("");
    const [selectedCustomerId, setSelectedCustomerId] = useState<string | null>(
        null,
    );
    const [showCustomerPicker, setShowCustomerPicker] = useState(false);
    const [showQuickAddCustomer, setShowQuickAddCustomer] = useState(false);
    const [newCustomerName, setNewCustomerName] = useState("");
    const [newCustomerPhone, setNewCustomerPhone] = useState("");
    const [customerError, setCustomerError] = useState("");
    const [isCreatingCustomer, setIsCreatingCustomer] = useState(false);

    // Product search and selection
    const [productList] = useState<RetailProduct[]>(initialProducts);
    const [productSearch, setProductSearch] = useState("");

    // Cart state
    const [cart, setCart] = useState<CartItem[]>([]);
    const [paymentMethod, setPaymentMethod] = useState<
        "CASH" | "BANK_TRANSFER"
    >("CASH");
    const [note, setNote] = useState("");

    // Form submission & modal
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [submitError, setSubmitError] = useState<string | null>(null);
    const [completedReceipt, setCompletedReceipt] =
        useState<PaymentReceiptData | null>(null);
    const [isPrinting, setIsPrinting] = useState(false);

    const selectedCustomer = customerList.find(
        (c) => c.id === selectedCustomerId,
    );

    // Filtered customers
    const filteredCustomers = useMemo(() => {
        if (!customerSearch.trim()) return [];
        const query = customerSearch.toLowerCase().trim();
        return customerList
            .filter(
                (c) =>
                    c.name.toLowerCase().includes(query) ||
                    (c.phoneNormalized && c.phoneNormalized.includes(query)),
            )
            .slice(0, 5);
    }, [customerList, customerSearch]);

    // Filtered products
    const filteredProducts = useMemo(() => {
        if (!productSearch.trim()) return productList;
        const q = productSearch.toLowerCase().trim();
        return productList.filter(
            (p) =>
                p.name.toLowerCase().includes(q) ||
                (p.sku && p.sku.toLowerCase().includes(q)),
        );
    }, [productList, productSearch]);

    // Cart calculations
    const cartTotalVnd = useMemo(() => {
        return cart.reduce((sum, item) => sum + item.priceVnd * item.quantity, 0);
    }, [cart]);

    const totalQuantity = useMemo(() => {
        return cart.reduce((sum, item) => sum + item.quantity, 0);
    }, [cart]);

    // Quick add customer
    async function handleQuickAddCustomer() {
        setCustomerError("");
        const parsed = quickCustomerSchema.safeParse({
            name: newCustomerName,
            phone: newCustomerPhone,
        });

        if (!parsed.success) {
            setCustomerError(
                parsed.error.issues[0]?.message ?? "Dữ liệu không hợp lệ.",
            );
            return;
        }

        setIsCreatingCustomer(true);
        try {
            const res = await fetch("/api/customers", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    name: parsed.data.name,
                    phone: parsed.data.phone || null,
                }),
            });

            if (!res.ok) {
                const errData = await res.json().catch(() => ({}));
                setCustomerError(
                    errData.error || "Không thể tạo khách hàng mới.",
                );
                setIsCreatingCustomer(false);
                return;
            }

            const created = await res.json();
            const newCust: RetailCustomer = {
                id: created.id,
                name: created.name,
                phoneNormalized: created.phoneNormalized,
            };
            setCustomerList((prev) => [newCust, ...prev]);
            setSelectedCustomerId(newCust.id);
            setShowQuickAddCustomer(false);
            setShowCustomerPicker(false);
            setNewCustomerName("");
            setNewCustomerPhone("");
        } catch {
            setCustomerError("Lỗi kết nối khi tạo khách hàng.");
        } finally {
            setIsCreatingCustomer(false);
        }
    }

    // Add product to cart
    function addToCart(product: RetailProduct) {
        if (product.stock <= 0) return;

        setCart((prev) => {
            const existing = prev.find((item) => item.productId === product.id);
            if (existing) {
                if (existing.quantity >= product.stock) return prev;
                return prev.map((item) =>
                    item.productId === product.id
                        ? { ...item, quantity: item.quantity + 1 }
                        : item,
                );
            } else {
                return [
                    ...prev,
                    {
                        productId: product.id,
                        name: product.name,
                        priceVnd: product.priceVnd,
                        quantity: 1,
                        maxStock: product.stock,
                    },
                ];
            }
        });
    }

    function updateCartQuantity(productId: string, delta: number) {
        setCart((prev) => {
            return prev
                .map((item) => {
                    if (item.productId === productId) {
                        const newQty = item.quantity + delta;
                        if (newQty <= 0) return null;
                        if (newQty > item.maxStock) return item;
                        return { ...item, quantity: newQty };
                    }
                    return item;
                })
                .filter((item): item is CartItem => item !== null);
        });
    }

    function removeFromCart(productId: string) {
        setCart((prev) => prev.filter((item) => item.productId !== productId));
    }

    function clearCart() {
        setCart([]);
        setNote("");
        setSubmitError(null);
    }

    // Submit retail sale
    async function handleCheckout() {
        if (cart.length === 0) {
            setSubmitError("Vui lòng chọn ít nhất một sản phẩm.");
            return;
        }

        setIsSubmitting(true);
        setSubmitError(null);

        const idempotencyKey = crypto.randomUUID();

        try {
            const res = await fetch("/api/invoices/retail", {
                method: "POST",
                headers: {
                    "Content-Type": "application/json",
                    "Idempotency-Key": idempotencyKey,
                },
                body: JSON.stringify({
                    customerId: selectedCustomerId || undefined,
                    items: cart.map((item) => ({
                        productId: item.productId,
                        quantity: item.quantity,
                    })),
                    paymentMethod,
                    note: note.trim() || undefined,
                }),
            });

            const data = await res.json();

            if (!res.ok) {
                setSubmitError(
                    data.error || "Thanh toán đơn bán lẻ thất bại. Vui lòng thử lại.",
                );
                setIsSubmitting(false);
                return;
            }

            // Success
            setCompletedReceipt(data.receiptData);

            // Auto-print receipt if printer is connected
            if (isConnected && data.receiptData) {
                printPaymentReceipt(data.receiptData).catch(() => {
                    // Non-blocking
                });
            }
        } catch {
            setSubmitError("Lỗi kết nối khi thanh toán đơn hàng.");
        } finally {
            setIsSubmitting(false);
        }
    }

    // Handle reprint
    async function handlePrintReceipt(isReprint = false) {
        if (!completedReceipt) return;
        setIsPrinting(true);
        try {
            await printPaymentReceipt({
                ...completedReceipt,
                isReprint,
            });
        } catch (err) {
            console.error("Print receipt error:", err);
        } finally {
            setIsPrinting(false);
        }
    }

    function resetForNewSale() {
        setCompletedReceipt(null);
        clearCart();
        setSelectedCustomerId(null);
        setCustomerSearch("");
        router.refresh();
    }

    return (
        <div className="space-y-4">
            {/* Customer Picker Section */}
            <Card className="p-4 space-y-3 rounded-2xl border-[#E3E8E3] bg-white shadow-xs">
                <div className="flex items-center justify-between">
                    <div>
                        <span className="text-[11px] font-bold uppercase tracking-wider text-[#246B38]">
                            1. Khách mua hàng
                        </span>
                        <p className="text-sm font-bold text-[#17201A] mt-0.5">
                            {selectedCustomer
                                ? `${selectedCustomer.name} ${
                                      selectedCustomer.phoneNormalized
                                          ? `(${selectedCustomer.phoneNormalized})`
                                          : ""
                                  }`
                                : "Khách lẻ (Vãng lai)"}
                        </p>
                    </div>

                    <div className="flex items-center gap-2">
                        {selectedCustomerId && (
                            <button
                                type="button"
                                onClick={() => setSelectedCustomerId(null)}
                                className="text-xs text-[#66716A] hover:text-[#D9534F] underline cursor-pointer"
                            >
                                Bỏ chọn
                            </button>
                        )}
                        <Button
                            type="button"
                            size="sm"
                            variant="outline"
                            onClick={() =>
                                setShowCustomerPicker(!showCustomerPicker)
                            }
                            className="rounded-full border-[#E3E8E3] text-xs font-semibold"
                        >
                            {showCustomerPicker ? "Đóng" : "Chọn khách"}
                        </Button>
                    </div>
                </div>

                {showCustomerPicker && (
                    <div className="border-t border-[#E3E8E3] pt-3 space-y-3">
                        <Input
                            placeholder="Tìm tên hoặc số điện thoại khách..."
                            value={customerSearch}
                            onChange={(e) => setCustomerSearch(e.target.value)}
                        />

                        {filteredCustomers.length > 0 && (
                            <div className="space-y-1 rounded-2xl border border-[#E3E8E3] bg-[#F7F9F5] p-2">
                                {filteredCustomers.map((cust) => (
                                    <button
                                        key={cust.id}
                                        type="button"
                                        onClick={() => {
                                            setSelectedCustomerId(cust.id);
                                            setShowCustomerPicker(false);
                                            setCustomerSearch("");
                                        }}
                                        className="w-full rounded-xl p-2.5 text-left hover:bg-white transition-colors flex items-center justify-between cursor-pointer"
                                    >
                                        <span className="text-xs font-bold text-[#17201A]">
                                            {cust.name}
                                        </span>
                                        {cust.phoneNormalized && (
                                            <span className="text-[11px] font-mono text-[#66716A]">
                                                {cust.phoneNormalized}
                                            </span>
                                        )}
                                    </button>
                                ))}
                            </div>
                        )}

                        <div className="flex items-center justify-between pt-1">
                            <span className="text-xs text-[#66716A]">
                                Khách chưa có trong danh bạ?
                            </span>
                            <Button
                                type="button"
                                size="sm"
                                variant="outline"
                                onClick={() =>
                                    setShowQuickAddCustomer(
                                        !showQuickAddCustomer,
                                    )
                                }
                                className="rounded-full border-[#E3E8E3] text-xs"
                            >
                                + Thêm khách mới
                            </Button>
                        </div>

                        {showQuickAddCustomer && (
                            <div className="rounded-2xl border border-[#E3E8E3] bg-white p-3 space-y-2.5 shadow-xs">
                                <h4 className="text-xs font-bold text-[#17201A]">
                                    Thêm nhanh khách hàng
                                </h4>
                                <Input
                                    placeholder="Tên khách hàng *"
                                    value={newCustomerName}
                                    onChange={(e) =>
                                        setNewCustomerName(e.target.value)
                                    }
                                />
                                <Input
                                    placeholder="Số điện thoại (tùy chọn)"
                                    value={newCustomerPhone}
                                    onChange={(e) =>
                                        setNewCustomerPhone(e.target.value)
                                    }
                                />
                                {customerError && (
                                    <p className="text-xs text-[#D9534F]">
                                        {customerError}
                                    </p>
                                )}
                                <div className="flex justify-end gap-2 pt-1">
                                    <Button
                                        type="button"
                                        size="sm"
                                        variant="outline"
                                        onClick={() =>
                                            setShowQuickAddCustomer(false)
                                        }
                                        className="rounded-full"
                                    >
                                        Hủy
                                    </Button>
                                    <Button
                                        type="button"
                                        size="sm"
                                        variant="primary"
                                        isLoading={isCreatingCustomer}
                                        onClick={handleQuickAddCustomer}
                                        className="rounded-full"
                                    >
                                        Lưu khách
                                    </Button>
                                </div>
                            </div>
                        )}
                    </div>
                )}
            </Card>

            {/* Product Catalog & Cart Grid */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {/* Left Column: Product Selection */}
                <Card className="p-4 space-y-3 rounded-2xl border-[#E3E8E3] bg-white shadow-xs">
                    <div className="flex items-center justify-between">
                        <span className="text-[11px] font-bold uppercase tracking-wider text-[#246B38]">
                            2. Chọn mặt hàng
                        </span>
                        <span className="text-xs text-[#66716A]">
                            {productList.length} sản phẩm
                        </span>
                    </div>

                    <Input
                        placeholder="Tìm mặt hàng hoặc mã SKU..."
                        value={productSearch}
                        onChange={(e) => setProductSearch(e.target.value)}
                    />

                    <div className="space-y-2 max-h-80 overflow-y-auto pr-1">
                        {filteredProducts.length === 0 ? (
                            <p className="text-center py-6 text-xs text-[#66716A]">
                                Không tìm thấy sản phẩm phù hợp.
                            </p>
                        ) : (
                            filteredProducts.map((product) => {
                                const inCartItem = cart.find(
                                    (c) => c.productId === product.id,
                                );
                                const cartQty = inCartItem?.quantity || 0;
                                const remainingStock = Math.max(
                                    0,
                                    product.stock - cartQty,
                                );
                                const isOutOfStock = remainingStock <= 0;

                                return (
                                    <div
                                        key={product.id}
                                        className="flex items-center justify-between rounded-2xl border border-[#E3E8E3] bg-[#F7F9F5] p-3 hover:border-[#4F9D5A] hover:bg-white transition-all"
                                    >
                                        <div className="space-y-1">
                                            <div className="flex items-center gap-1.5">
                                                {product.sku && (
                                                    <span className="rounded-md bg-[#E8F3E5] px-1.5 py-0.5 text-[10px] font-mono font-bold text-[#246B38]">
                                                        {product.sku}
                                                    </span>
                                                )}
                                                <h4 className="text-xs font-bold text-[#17201A]">
                                                    {product.name}
                                                </h4>
                                            </div>
                                            <div className="flex items-center gap-2 text-[11px]">
                                                <span className="font-bold text-[#246B38]">
                                                    {formatVnd(product.priceVnd)}
                                                </span>
                                                <span
                                                    className={`rounded-full px-2 py-0.5 text-[10px] font-semibold ${
                                                        product.stock > 5
                                                            ? "bg-[#EBF6ED] text-[#3E9B4F]"
                                                            : product.stock > 0
                                                            ? "bg-[#FDF6E9] text-[#D99A32]"
                                                            : "bg-[#FCEEED] text-[#D9534F]"
                                                    }`}
                                                >
                                                    Kho: {product.stock}
                                                </span>
                                            </div>
                                        </div>

                                        <Button
                                            type="button"
                                            size="sm"
                                            variant={
                                                isOutOfStock
                                                    ? "outline"
                                                    : "primary"
                                            }
                                            disabled={isOutOfStock}
                                            onClick={() => addToCart(product)}
                                            className="min-h-9 px-3 rounded-full text-xs"
                                        >
                                            {isOutOfStock ? "Hết" : "+ Thêm"}
                                        </Button>
                                    </div>
                                );
                            })
                        )}
                    </div>
                </Card>

                {/* Right Column: Order Details & Cart */}
                <Card className="p-4 space-y-3 flex flex-col justify-between rounded-2xl border-[#E3E8E3] bg-white shadow-xs">
                    <div className="space-y-3">
                        <div className="flex items-center justify-between border-b border-[#E3E8E3] pb-2">
                            <span className="text-[11px] font-bold uppercase tracking-wider text-[#246B38]">
                                3. Giỏ hàng ({totalQuantity})
                            </span>
                            {cart.length > 0 && (
                                <button
                                    type="button"
                                    onClick={clearCart}
                                    className="text-xs text-[#D9534F] hover:underline cursor-pointer"
                                >
                                    Xóa hết
                                </button>
                            )}
                        </div>

                        {cart.length === 0 ? (
                            <div className="py-12 text-center text-xs text-[#66716A] space-y-1">
                                <p className="font-medium">
                                    Chưa có sản phẩm nào trong giỏ.
                                </p>
                                <p className="text-[11px] text-[#8A938D]">
                                    Chọn mặt hàng ở bảng bên trái để thêm vào đơn.
                                </p>
                            </div>
                        ) : (
                            <div className="space-y-2 max-h-60 overflow-y-auto pr-1">
                                {cart.map((item) => (
                                    <div
                                        key={item.productId}
                                        className="flex items-center justify-between rounded-2xl bg-[#F7F9F5] p-2.5 text-xs border border-[#E3E8E3]"
                                    >
                                        <div className="min-w-0 flex-1 pr-2">
                                            <p className="font-bold text-[#17201A] truncate">
                                                {item.name}
                                            </p>
                                            <p className="text-[11px] text-[#66716A]">
                                                {formatVnd(item.priceVnd)} x{" "}
                                                {item.quantity} ={" "}
                                                <span className="font-bold text-[#17201A]">
                                                    {formatVnd(
                                                        item.priceVnd *
                                                            item.quantity,
                                                    )}
                                                </span>
                                            </p>
                                        </div>

                                        <div className="flex items-center gap-1.5">
                                            <button
                                                type="button"
                                                onClick={() =>
                                                    updateCartQuantity(
                                                        item.productId,
                                                        -1,
                                                    )
                                                }
                                                className="flex h-7 w-7 items-center justify-center rounded-lg bg-white border border-[#E3E8E3] text-sm font-bold text-[#17201A] hover:bg-stone-50 cursor-pointer"
                                            >
                                                -
                                            </button>
                                            <span className="w-6 text-center font-bold text-[#17201A]">
                                                {item.quantity}
                                            </span>
                                            <button
                                                type="button"
                                                onClick={() =>
                                                    updateCartQuantity(
                                                        item.productId,
                                                        1,
                                                    )
                                                }
                                                disabled={
                                                    item.quantity >=
                                                    item.maxStock
                                                }
                                                className="flex h-7 w-7 items-center justify-center rounded-lg bg-white border border-[#E3E8E3] text-sm font-bold text-[#17201A] hover:bg-stone-50 disabled:opacity-40 cursor-pointer"
                                            >
                                                +
                                            </button>
                                            <button
                                                type="button"
                                                onClick={() =>
                                                    removeFromCart(
                                                        item.productId,
                                                    )
                                                }
                                                className="ml-1 p-1 text-[#66716A] hover:text-[#D9534F] cursor-pointer"
                                                title="Xóa món"
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
                                                        d="M6 18L18 6M6 6l12 12"
                                                    />
                                                </svg>
                                            </button>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        )}
                    </div>

                    {/* Cart Summary & Payment Controls */}
                    <div className="space-y-3 pt-3 border-t border-[#E3E8E3]">
                        {/* Payment Method Switcher */}
                        <div>
                            <span className="text-[11px] font-bold text-[#66716A] block mb-1">
                                Hình thức thanh toán
                            </span>
                            <div className="grid grid-cols-2 gap-2">
                                <button
                                    type="button"
                                    onClick={() => setPaymentMethod("CASH")}
                                    className={`py-2.5 rounded-full text-xs font-bold transition-all border cursor-pointer ${
                                        paymentMethod === "CASH"
                                            ? "bg-[#4F9D5A] text-white border-[#4F9D5A] shadow-xs"
                                            : "bg-white text-[#17201A] border-[#E3E8E3] hover:bg-[#F7F9F5]"
                                    }`}
                                >
                                    Tiền mặt
                                </button>
                                <button
                                    type="button"
                                    onClick={() =>
                                        setPaymentMethod("BANK_TRANSFER")
                                    }
                                    className={`py-2.5 rounded-full text-xs font-bold transition-all border cursor-pointer ${
                                        paymentMethod === "BANK_TRANSFER"
                                            ? "bg-[#4F9D5A] text-white border-[#4F9D5A] shadow-xs"
                                            : "bg-white text-[#17201A] border-[#E3E8E3] hover:bg-[#F7F9F5]"
                                    }`}
                                >
                                    Chuyển khoản
                                </button>
                            </div>
                        </div>

                        {/* Note */}
                        <Input
                            placeholder="Ghi chú đơn bán lẻ (tùy chọn)..."
                            value={note}
                            onChange={(e) => setNote(e.target.value)}
                        />

                        {/* Total Row */}
                        <div className="rounded-2xl bg-[#E8F3E5] p-3 flex items-center justify-between border border-[#E3E8E3]">
                            <span className="text-xs font-bold text-[#246B38]">
                                Tổng thanh toán:
                            </span>
                            <span className="text-lg font-bold text-[#246B38] tabular-nums">
                                {formatVnd(cartTotalVnd)}
                            </span>
                        </div>

                        {submitError && (
                            <InlineAlert
                                type="error"
                                message={submitError}
                            />
                        )}

                        {!isOnline && (
                            <div className="rounded-2xl border border-rose-300 bg-rose-50 p-2.5 text-xs text-rose-800 flex items-start gap-2 shadow-2xs">
                                <span className="text-base leading-none">⚠️</span>
                                <div>
                                    <span className="font-bold">Mất mạng:</span> Nút thanh toán tạm khóa để chống lỗi giao dịch. Vui lòng kết nối mạng để xuất bill.
                                </div>
                            </div>
                        )}

                        <Button
                            type="button"
                            size="lg"
                            variant="primary"
                            disabled={cart.length === 0 || isSubmitting || !isOnline}
                            isLoading={isSubmitting}
                            onClick={handleCheckout}
                            className="w-full text-sm font-bold min-h-12 rounded-full"
                        >
                            {!isOnline
                                ? "Mất mạng — Không thể thanh toán"
                                : isSubmitting
                                ? "Đang xử lý..."
                                : `Thanh toán & Xuất bill (${formatVnd(cartTotalVnd)})`}
                        </Button>
                    </div>
                </Card>
            </div>

            {/* BILL RECEIPT MODAL */}
            {completedReceipt && (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4 backdrop-blur-xs">
                    <div className="w-full max-w-md rounded-3xl bg-white p-5 shadow-2xl border border-[#E3E8E3] space-y-4 max-h-[90vh] overflow-y-auto">
                        <div className="text-center space-y-1">
                            <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-[#EBF6ED] text-[#3E9B4F]">
                                <svg
                                    className="h-7 w-7"
                                    fill="none"
                                    viewBox="0 0 24 24"
                                    strokeWidth={2.5}
                                    stroke="currentColor"
                                >
                                    <path
                                        strokeLinecap="round"
                                        strokeLinejoin="round"
                                        d="m4.5 12.75 6 6 9-13.5"
                                    />
                                </svg>
                            </div>
                            <h3 className="text-lg font-bold text-[#17201A]">
                                Thanh toán bán lẻ thành công!
                            </h3>
                            <p className="text-xs text-[#66716A]">
                                Đơn hàng #{completedReceipt.invoiceId.slice(0, 8)} đã được ghi sổ và xuất kho.
                            </p>
                        </div>

                        {/* Bill Summary Card */}
                        <div className="rounded-2xl border border-[#E3E8E3] bg-[#F7F9F5] p-3 text-xs space-y-2">
                            <div className="flex justify-between border-b border-[#E3E8E3] pb-1.5">
                                <span className="text-[#66716A]">Khách hàng:</span>
                                <span className="font-bold text-[#17201A]">
                                    {completedReceipt.customerName || "Khách lẻ"}
                                </span>
                            </div>
                            <div className="flex justify-between border-b border-[#E3E8E3] pb-1.5">
                                <span className="text-[#66716A]">Hình thức:</span>
                                <span className="font-bold text-[#246B38]">
                                    {completedReceipt.paymentMethod === "CASH"
                                        ? "Tiền mặt"
                                        : "Chuyển khoản"}
                                </span>
                            </div>

                            {/* Lines */}
                            <div className="space-y-1 py-1">
                                {completedReceipt.lines.map((l, idx) => (
                                    <div
                                        key={idx}
                                        className="flex justify-between text-[#17201A]"
                                    >
                                        <span>
                                            {l.name} x {l.quantity}
                                        </span>
                                        <span className="font-semibold">
                                            {formatVnd(l.totalVnd)}
                                        </span>
                                    </div>
                                ))}
                            </div>

                            <div className="flex justify-between border-t border-[#E3E8E3] pt-1.5 text-sm font-bold text-[#17201A]">
                                <span>Tổng tiền:</span>
                                <span className="text-[#246B38]">
                                    {formatVnd(completedReceipt.totalAmountVnd)}
                                </span>
                            </div>
                        </div>

                        {/* Modal Action Buttons */}
                        <div className="space-y-2 pt-1">
                            <div className="grid grid-cols-2 gap-2">
                                <Button
                                    type="button"
                                    size="lg"
                                    variant="outline"
                                    isLoading={isPrinting}
                                    onClick={() => handlePrintReceipt(false)}
                                    className="w-full text-xs font-bold rounded-full"
                                >
                                    In hóa đơn (58mm)
                                </Button>
                                <Button
                                    type="button"
                                    size="lg"
                                    variant="outline"
                                    isLoading={isPrinting}
                                    onClick={() => handlePrintReceipt(true)}
                                    className="w-full text-xs font-bold text-[#246B38] border-[#4F9D5A] rounded-full hover:bg-[#E8F3E5]"
                                >
                                    In lại bill
                                </Button>
                            </div>

                            <div className="grid grid-cols-2 gap-2">
                                <Button
                                    type="button"
                                    size="lg"
                                    variant="primary"
                                    onClick={resetForNewSale}
                                    className="w-full text-xs font-bold rounded-full"
                                >
                                    Tạo đơn bán mới
                                </Button>
                                <Link
                                    href="/invoices/history"
                                    className="inline-flex h-11 items-center justify-center rounded-full border border-[#E3E8E3] bg-white px-3 text-xs font-bold text-[#17201A] hover:bg-[#F7F9F5] transition-colors"
                                >
                                    Xem Nhật ký
                                </Link>
                            </div>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}
