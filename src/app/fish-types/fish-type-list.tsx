"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { InlineAlert } from "@/components/ui/inline-alert";

export interface FishTypeItem {
    id: string;
    name: string;
    pricePerKg: number;
    createdAt: Date | string;
    updatedAt: Date | string;
}

interface FishTypeListProps {
    fishTypes: FishTypeItem[];
    canManage: boolean;
}

function formatVnd(amount: number): string {
    return new Intl.NumberFormat("vi-VN").format(amount) + " đ/kg";
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

export function FishTypeList({ fishTypes, canManage }: FishTypeListProps) {
    const router = useRouter();
    const [search, setSearch] = useState("");

    // Edit modal state
    const [editingItem, setEditingItem] = useState<FishTypeItem | null>(null);
    const [editName, setEditName] = useState("");
    const [editPricePerKg, setEditPricePerKg] = useState<number | string>("");
    const [editLoading, setEditLoading] = useState(false);
    const [editError, setEditError] = useState<string | null>(null);

    // Deactivate state
    const [deactivatingId, setDeactivatingId] = useState<string | null>(null);

    const filteredItems = fishTypes.filter((ft) => {
        const query = search.toLowerCase().trim();
        if (!query) return true;
        return ft.name.toLowerCase().includes(query);
    });

    function openEditModal(item: FishTypeItem) {
        setEditingItem(item);
        setEditName(item.name);
        setEditPricePerKg(item.pricePerKg);
        setEditError(null);
    }

    function closeEditModal() {
        if (!editLoading) {
            setEditingItem(null);
            setEditError(null);
        }
    }

    async function handleUpdate(e: React.FormEvent<HTMLFormElement>) {
        e.preventDefault();
        if (!editingItem) return;

        setEditError(null);

        if (!editName.trim()) {
            setEditError("Vui lòng nhập tên loại cá.");
            return;
        }

        const numPrice =
            typeof editPricePerKg === "string"
                ? Number(editPricePerKg)
                : editPricePerKg;
        if (
            typeof numPrice !== "number" ||
            isNaN(numPrice) ||
            !Number.isInteger(numPrice) ||
            numPrice <= 0
        ) {
            setEditError("Giá thu mua phải là số nguyên dương lớn hơn 0.");
            return;
        }

        setEditLoading(true);

        try {
            const res = await fetch(`/api/fish-types/${editingItem.id}`, {
                method: "PATCH",
                headers: {
                    "Content-Type": "application/json",
                },
                body: JSON.stringify({
                    name: editName.trim(),
                    pricePerKg: numPrice,
                }),
            });

            const data = await res.json();

            if (!res.ok) {
                setEditError(data.error || "Không thể cập nhật loại cá.");
                return;
            }

            setEditingItem(null);
            router.refresh();
        } catch {
            setEditError("Lỗi kết nối mạng, vui lòng thử lại sau.");
        } finally {
            setEditLoading(false);
        }
    }

    async function handleDeactivate(item: FishTypeItem) {
        const confirmed = window.confirm(
            `Bạn có chắc chắn muốn ngừng dùng loại cá "${item.name}" không?\n\nSau khi ngừng dùng, loại cá này sẽ không còn xuất hiện khi thu mua cá từ cần thủ.`,
        );

        if (!confirmed) return;

        setDeactivatingId(item.id);

        try {
            const res = await fetch(`/api/fish-types/${item.id}`, {
                method: "DELETE",
            });

            const data = await res.json();

            if (!res.ok) {
                alert(data.error || "Không thể ngừng dùng loại cá.");
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
            {/* Search Input */}
            <div className="flex flex-col justify-between gap-3 sm:flex-row sm:items-center">
                <div className="w-full max-w-sm">
                    <Input
                        value={search}
                        onChange={(e) => setSearch(e.target.value)}
                        placeholder="Tìm kiếm theo tên loại cá..."
                    />
                </div>
                <div className="text-xs text-slate-500 font-medium">
                    Hiển thị{" "}
                    <span className="font-bold text-slate-800">
                        {filteredItems.length}
                    </span>{" "}
                    / {fishTypes.length} loại cá
                </div>
            </div>

            {/* Mobile Cards */}
            <div className="grid grid-cols-1 gap-2.5 md:hidden">
                {filteredItems.length === 0 ? (
                    <p className="py-8 text-center text-xs text-slate-500 font-medium">
                        {search
                            ? "Không tìm thấy loại cá nào khớp với tìm kiếm."
                            : "Chưa có loại cá nào trong danh mục."}
                    </p>
                ) : (
                    filteredItems.map((ft) => (
                        <div
                            key={ft.id}
                            className="flex flex-col gap-2 rounded-xl border border-[#E2DDD2] bg-[#F8F6F0]/40 p-3.5"
                        >
                            <div className="flex items-center justify-between">
                                <span className="text-xs font-bold text-slate-900">
                                    {ft.name}
                                </span>
                                <span className="text-xs font-extrabold text-[#0D9488] tabular-nums">
                                    {formatVnd(ft.pricePerKg)}
                                </span>
                            </div>
                            <div className="flex items-center justify-between text-[11px] text-slate-500">
                                <span className="inline-flex items-center rounded-md bg-teal-50 px-2 py-0.5 font-bold text-teal-800 border border-teal-200">
                                    Đang áp dụng
                                </span>
                                <span>{formatDateTime(ft.updatedAt || ft.createdAt)}</span>
                            </div>
                            {canManage && (
                                <div className="flex items-center justify-end gap-2 border-t border-[#E2DDD2] pt-2">
                                    <Button
                                        type="button"
                                        size="sm"
                                        variant="outline"
                                        onClick={() => openEditModal(ft)}
                                    >
                                        Sửa
                                    </Button>
                                    <Button
                                        type="button"
                                        size="sm"
                                        variant="danger"
                                        isLoading={deactivatingId === ft.id}
                                        onClick={() => handleDeactivate(ft)}
                                    >
                                        Ngừng dùng
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
                            <th className="px-4 py-3.5">Tên loại cá</th>
                            <th className="px-4 py-3.5 text-right">Giá thu mua</th>
                            <th className="px-4 py-3.5">Ngày cập nhật</th>
                            <th className="px-4 py-3.5">Trạng thái</th>
                            {canManage && (
                                <th className="px-4 py-3.5 text-right">Thao tác</th>
                            )}
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-[#E2DDD2]">
                        {filteredItems.length === 0 ? (
                            <tr>
                                <td
                                    colSpan={canManage ? 5 : 4}
                                    className="px-4 py-8 text-center text-xs text-slate-400"
                                >
                                    {search
                                        ? "Không tìm thấy loại cá nào khớp với tìm kiếm."
                                        : "Chưa có loại cá nào trong danh mục."}
                                </td>
                            </tr>
                        ) : (
                            filteredItems.map((ft) => (
                                <tr
                                    key={ft.id}
                                    className="hover:bg-[#F8F6F0]/60 transition-colors"
                                >
                                    <td className="px-4 py-3.5 font-bold text-slate-900">
                                        {ft.name}
                                    </td>
                                    <td className="px-4 py-3.5 text-right font-extrabold text-[#0D9488] tabular-nums text-sm">
                                        {formatVnd(ft.pricePerKg)}
                                    </td>
                                    <td className="px-4 py-3.5 text-xs text-slate-500">
                                        {formatDateTime(ft.updatedAt || ft.createdAt)}
                                    </td>
                                    <td className="px-4 py-3.5">
                                        <span className="inline-flex items-center rounded-md bg-teal-50 px-2 py-0.5 text-[11px] font-bold text-teal-800 border border-teal-200">
                                            Đang áp dụng
                                        </span>
                                    </td>
                                    {canManage && (
                                        <td className="px-4 py-3.5 text-right">
                                            <div className="flex items-center justify-end gap-2">
                                                <Button
                                                    type="button"
                                                    size="sm"
                                                    variant="outline"
                                                    onClick={() => openEditModal(ft)}
                                                >
                                                    Sửa
                                                </Button>
                                                <Button
                                                    type="button"
                                                    size="sm"
                                                    variant="danger"
                                                    isLoading={deactivatingId === ft.id}
                                                    onClick={() => handleDeactivate(ft)}
                                                >
                                                    Ngừng dùng
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

            {/* Edit Modal */}
            {editingItem && (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
                    <div className="w-full max-w-md rounded-2xl bg-white p-6 shadow-xl space-y-4 animate-in fade-in zoom-in-95 duration-150">
                        <div className="flex items-center justify-between border-b border-[#E2DDD2] pb-3">
                            <h3 className="text-base font-bold text-[#102A43]">
                                Chỉnh sửa loại cá
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
                            <Input
                                label="Tên loại cá *"
                                type="text"
                                required
                                value={editName}
                                onChange={(e) => setEditName(e.target.value)}
                            />

                            <Input
                                label="Đơn giá thu mua (VNĐ / kg) *"
                                type="number"
                                required
                                min={1}
                                step={1000}
                                value={editPricePerKg}
                                onChange={(e) =>
                                    setEditPricePerKg(e.target.value)
                                }
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
                                    className="flex-[2]"
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
