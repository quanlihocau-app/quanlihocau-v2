"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { InlineAlert } from "@/components/ui/inline-alert";

interface ProductItem {
    id: string;
    sku: string | null;
    name: string;
    priceVnd: number;
    stock?: number;
    createdAt: Date | string;
    updatedAt: Date | string;
}

interface ProductListProps {
    products: ProductItem[];
    canManage: boolean;
}

function formatVnd(amount: number): string {
    return new Intl.NumberFormat("vi-VN").format(amount) + " đ";
}

function formatDateTime(date: Date | string | null): string {
    if (!date) return "—";
    return new Intl.DateTimeFormat("vi-VN", {
        hour: "2-digit",
        minute: "2-digit",
        day: "2-digit",
        month: "2-digit",
        year: "numeric",
        timeZone: "Asia/Ho_Chi_Minh",
    }).format(new Date(date));
}

export function ProductList({ products, canManage }: ProductListProps) {
    const router = useRouter();
    const [search, setSearch] = useState("");

    // Editing modal state
    const [editingProduct, setEditingProduct] = useState<ProductItem | null>(null);
    const [editName, setEditName] = useState("");
    const [editPriceVnd, setEditPriceVnd] = useState<number | string>("");
    const [editLoading, setEditLoading] = useState(false);
    const [editError, setEditError] = useState<string | null>(null);

    // Deactivate loading state
    const [deactivatingId, setDeactivatingId] = useState<string | null>(null);

    const filteredProducts = products.filter((p) => {
        const query = search.toLowerCase().trim();
        if (!query) return true;
        const matchName = p.name.toLowerCase().includes(query);
        const matchSku = p.sku ? p.sku.toLowerCase().includes(query) : false;
        return matchName || matchSku;
    });

    function openEditModal(prod: ProductItem) {
        setEditingProduct(prod);
        setEditName(prod.name);
        setEditPriceVnd(prod.priceVnd);
        setEditError(null);
    }

    function closeEditModal() {
        if (!editLoading) {
            setEditingProduct(null);
            setEditError(null);
        }
    }

    async function handleUpdate(e: React.FormEvent<HTMLFormElement>) {
        e.preventDefault();
        if (!editingProduct) return;

        setEditError(null);

        if (!editName.trim()) {
            setEditError("Vui lòng nhập tên sản phẩm.");
            return;
        }

        const numPrice =
            typeof editPriceVnd === "string" ? Number(editPriceVnd) : editPriceVnd;
        if (
            typeof numPrice !== "number" ||
            isNaN(numPrice) ||
            !Number.isInteger(numPrice) ||
            numPrice <= 0
        ) {
            setEditError("Giá sản phẩm phải là số nguyên dương lớn hơn 0.");
            return;
        }

        setEditLoading(true);

        try {
            const res = await fetch(`/api/products/${editingProduct.id}`, {
                method: "PATCH",
                headers: {
                    "Content-Type": "application/json",
                },
                body: JSON.stringify({
                    name: editName.trim(),
                    priceVnd: numPrice,
                }),
            });

            const data = await res.json();

            if (!res.ok) {
                setEditError(data.error || "Không thể cập nhật sản phẩm.");
                return;
            }

            setEditingProduct(null);
            router.refresh();
        } catch {
            setEditError("Lỗi kết nối mạng, vui lòng thử lại sau.");
        } finally {
            setEditLoading(false);
        }
    }

    async function handleDeactivate(prod: ProductItem) {
        const confirmed = window.confirm(
            `Bạn có chắc chắn muốn vô hiệu hóa sản phẩm "${prod.name}" (SKU: ${
                prod.sku || "N/A"
            }) không?\n\nSau khi vô hiệu hóa, sản phẩm sẽ không còn xuất hiện trong danh mục bán hàng.`,
        );

        if (!confirmed) return;

        setDeactivatingId(prod.id);

        try {
            const res = await fetch(`/api/products/${prod.id}`, {
                method: "DELETE",
            });

            const data = await res.json();

            if (!res.ok) {
                alert(data.error || "Không thể vô hiệu hóa sản phẩm.");
                return;
            }

            router.refresh();
        } catch {
            alert("Lỗi kết nối mạng, vui lòng thử lại sau.");
        } finally {
            setDeactivatingId(null);
        }
    }

    return (
        <div className="space-y-4">
            {/* Search Input Bar */}
            <div className="flex flex-col justify-between gap-3 sm:flex-row sm:items-center">
                <div className="w-full max-w-sm">
                    <Input
                        value={search}
                        onChange={(e) => setSearch(e.target.value)}
                        placeholder="Tìm kiếm theo tên hoặc mã SKU..."
                    />
                </div>
                <div className="text-xs text-slate-500 font-medium">
                    Hiển thị{" "}
                    <span className="font-bold text-slate-800">
                        {filteredProducts.length}
                    </span>{" "}
                    / {products.length} sản phẩm
                </div>
            </div>

            {/* Mobile Cards */}
            <div className="grid grid-cols-1 gap-2.5 md:hidden">
                {filteredProducts.length === 0 ? (
                    <p className="py-8 text-center text-xs text-slate-500 font-medium">
                        {search
                            ? "Không tìm thấy sản phẩm nào khớp với tìm kiếm."
                            : "Chưa có sản phẩm nào trong danh mục."}
                    </p>
                ) : (
                    filteredProducts.map((p) => (
                        <div
                            key={p.id}
                            className="flex flex-col gap-2 rounded-xl border border-[#E2DDD2] bg-[#F8F6F0]/40 p-3.5"
                        >
                            <div className="flex items-center justify-between">
                                <span className="text-xs font-bold text-slate-900">
                                    {p.name}
                                </span>
                                <span className="text-xs font-extrabold text-[#0D9488] tabular-nums">
                                    {formatVnd(p.priceVnd)}
                                </span>
                            </div>
                            <div className="flex items-center justify-between text-[11px] text-slate-500">
                                <span className="font-mono">{p.sku ? `SKU: ${p.sku}` : "Không có SKU"}</span>
                                <span
                                    className={`font-semibold px-2 py-0.5 rounded-md ${
                                        (p.stock ?? 0) > 0
                                            ? "bg-emerald-50 text-emerald-700 border border-emerald-200"
                                            : "bg-amber-50 text-amber-700 border border-amber-200"
                                    }`}
                                >
                                    Tồn: {p.stock ?? 0}
                                </span>
                            </div>
                            <div className="text-[11px] text-slate-400 text-right">
                                {formatDateTime(p.updatedAt || p.createdAt)}
                            </div>
                            {canManage && (
                                <div className="flex items-center justify-end gap-2 border-t border-[#E2DDD2] pt-2">
                                    <Button
                                        type="button"
                                        size="sm"
                                        variant="outline"
                                        onClick={() => openEditModal(p)}
                                    >
                                        Sửa
                                    </Button>
                                    <Button
                                        type="button"
                                        size="sm"
                                        variant="danger"
                                        isLoading={deactivatingId === p.id}
                                        onClick={() => handleDeactivate(p)}
                                    >
                                        Vô hiệu
                                    </Button>
                                </div>
                            )}
                        </div>
                    ))
                )}
            </div>

            {/* Desktop Table */}
            <div className="hidden overflow-hidden rounded-xl border border-[#E2DDD2] bg-white md:block">
                <table className="w-full text-left text-xs text-slate-600">
                    <thead className="border-b border-[#E2DDD2] bg-[#F8F6F0] text-[11px] font-bold uppercase tracking-wider text-slate-500">
                        <tr>
                            <th className="px-4 py-3.5">Mã SKU</th>
                            <th className="px-4 py-3.5">Tên sản phẩm</th>
                            <th className="px-4 py-3.5 text-center">Tồn kho</th>
                            <th className="px-4 py-3.5 text-right">Đơn giá bán</th>
                            <th className="px-4 py-3.5">Ngày cập nhật</th>
                            {canManage && (
                                <th className="px-4 py-3.5 text-right">Thao tác</th>
                            )}
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-[#E2DDD2]">
                        {filteredProducts.length === 0 ? (
                            <tr>
                                <td
                                    colSpan={canManage ? 6 : 5}
                                    className="px-4 py-8 text-center text-xs text-slate-400"
                                >
                                    {search
                                        ? "Không tìm thấy sản phẩm nào khớp với tìm kiếm."
                                        : "Chưa có sản phẩm nào trong danh mục."}
                                </td>
                            </tr>
                        ) : (
                            filteredProducts.map((p) => (
                                <tr
                                    key={p.id}
                                    className="hover:bg-[#F8F6F0]/60 transition-colors"
                                >
                                    <td className="px-4 py-3.5 font-mono text-xs font-bold text-slate-700">
                                        {p.sku ? (
                                             <span className="inline-flex items-center rounded-md bg-[#F8F6F0] px-2 py-0.5 text-slate-800 border border-[#E2DDD2]">
                                                 {p.sku}
                                             </span>
                                        ) : (
                                            <span className="text-slate-400 italic">
                                                —
                                            </span>
                                        )}
                                    </td>
                                    <td className="px-4 py-3.5 font-bold text-slate-900">
                                        {p.name}
                                    </td>
                                    <td className="px-4 py-3.5 text-center">
                                        <span
                                            className={`inline-flex items-center font-bold px-2.5 py-0.5 rounded-full text-[11px] ${
                                                (p.stock ?? 0) > 0
                                                    ? "bg-emerald-50 text-emerald-700 border border-emerald-200"
                                                    : "bg-amber-50 text-amber-700 border border-amber-200"
                                            }`}
                                        >
                                            {p.stock ?? 0}
                                        </span>
                                    </td>
                                    <td className="px-4 py-3.5 text-right font-extrabold text-[#0D9488] tabular-nums text-sm">
                                        {formatVnd(p.priceVnd)}
                                    </td>
                                    <td className="px-4 py-3.5 text-xs text-slate-500">
                                        {formatDateTime(p.updatedAt || p.createdAt)}
                                    </td>
                                    {canManage && (
                                        <td className="px-4 py-3.5 text-right">
                                            <div className="flex items-center justify-end gap-2">
                                                <Button
                                                    type="button"
                                                    size="sm"
                                                    variant="outline"
                                                    onClick={() => openEditModal(p)}
                                                >
                                                    Sửa
                                                </Button>
                                                <Button
                                                    type="button"
                                                    size="sm"
                                                    variant="danger"
                                                    isLoading={deactivatingId === p.id}
                                                    onClick={() => handleDeactivate(p)}
                                                >
                                                    Vô hiệu hóa
                                                </Button>
                                            </div>
                                        </td>
                                    )}
                                </tr>
                            ))
                        )}
                    </tbody>
                </table>
            </div>

            {/* Edit Product Modal */}
            {editingProduct && (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
                    <div className="w-full max-w-md rounded-2xl bg-white p-6 shadow-xl space-y-4 animate-in fade-in zoom-in-95 duration-150">
                        <div className="flex items-center justify-between border-b border-[#E2DDD2] pb-3">
                            <h3 className="text-base font-bold text-[#102A43]">
                                Chỉnh sửa sản phẩm
                            </h3>
                            <button
                                type="button"
                                disabled={editLoading}
                                onClick={closeEditModal}
                                className="text-slate-400 hover:text-slate-600"
                            >
                                ✕
                            </button>
                        </div>

                        <form onSubmit={handleUpdate} className="space-y-3.5">
                            <div>
                                <label className="text-xs font-bold text-slate-700 uppercase tracking-wider">
                                    Mã SKU
                                </label>
                                <div className="mt-1">
                                    <span className="inline-block px-3 py-1.5 rounded-lg bg-slate-100 font-mono text-xs font-bold text-slate-800 border border-slate-200">
                                        {editingProduct.sku || "Chưa có"}
                                    </span>
                                    <p className="mt-1 text-[11px] text-slate-500">
                                        Mã SKU do hệ thống quản lý tự động.
                                    </p>
                                </div>
                            </div>

                            <Input
                                label="Tên sản phẩm *"
                                type="text"
                                required
                                value={editName}
                                onChange={(e) => setEditName(e.target.value)}
                            />

                            <Input
                                label="Đơn giá bán (VNĐ) *"
                                type="number"
                                required
                                min={1}
                                step={1}
                                value={editPriceVnd}
                                onChange={(e) => setEditPriceVnd(e.target.value)}
                            />

                            {editError && (
                                <InlineAlert type="error" message={editError} />
                            )}

                            <div className="flex justify-end gap-2 pt-2">
                                <Button
                                    type="button"
                                    size="lg"
                                    variant="outline"
                                    disabled={editLoading}
                                    onClick={closeEditModal}
                                    className="flex-1"
                                >
                                    Hủy
                                </Button>
                                <Button
                                    type="submit"
                                    size="lg"
                                    variant="primary"
                                    isLoading={editLoading}
                                    loadingText="Đang lưu…"
                                    className="flex-2"
                                >
                                    Lưu thay đổi
                                </Button>
                            </div>
                        </form>
                    </div>
                </div>
            )}
        </div>
    );
}
