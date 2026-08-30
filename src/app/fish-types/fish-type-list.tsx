"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";

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

            alert(data.message || "Cập nhật loại cá thành công.");
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

            alert(data.message || "Ngừng dùng loại cá thành công.");
            router.refresh();
        } catch {
            alert("Lỗi kết nối mạng, vui lòng thử lại sau.");
        } finally {
            setDeactivatingId(null);
        }
    }

    return (
        <div>
            {/* Search Input */}
            <div className="mb-4 flex flex-col justify-between gap-3 sm:flex-row sm:items-center">
                <div className="relative w-full max-w-sm">
                    <div className="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-3">
                        <svg
                            className="h-4 w-4 text-slate-400"
                            fill="none"
                            viewBox="0 0 24 24"
                            strokeWidth={2}
                            stroke="currentColor"
                        >
                            <path
                                strokeLinecap="round"
                                strokeLinejoin="round"
                                d="m21 21-5.197-5.197m0 0A7.5 7.5 0 1 0 5.196 5.196a7.5 7.5 0 0 0 10.607 10.607Z"
                            />
                        </svg>
                    </div>
                    <input
                        type="text"
                        value={search}
                        onChange={(e) => setSearch(e.target.value)}
                        placeholder="Tìm kiếm theo tên loại cá..."
                        className="block w-full rounded-lg border border-slate-300 bg-white py-2 pl-9 pr-3 text-xs text-slate-900 placeholder-slate-400 shadow-sm focus:border-emerald-500 focus:outline-none focus:ring-1 focus:ring-emerald-500"
                    />
                </div>
                <div className="text-xs text-slate-500">
                    Hiển thị{" "}
                    <span className="font-semibold text-slate-800">
                        {filteredItems.length}
                    </span>{" "}
                    / {fishTypes.length} loại cá
                </div>
            </div>

            {/* Table */}
            <div className="overflow-x-auto">
                <table className="w-full text-left text-sm text-slate-600">
                    <thead className="border-b border-slate-200 bg-slate-50 text-xs font-semibold uppercase text-slate-500">
                        <tr>
                            <th className="px-4 py-3">Tên loại cá</th>
                            <th className="px-4 py-3 text-right">Giá thu mua</th>
                            <th className="px-4 py-3">Ngày cập nhật</th>
                            <th className="px-4 py-3">Trạng thái</th>
                            {canManage && (
                                <th className="px-4 py-3 text-right">Thao tác</th>
                            )}
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                        {filteredItems.length === 0 ? (
                            <tr>
                                <td
                                    colSpan={canManage ? 5 : 4}
                                    className="px-4 py-8 text-center text-sm text-slate-400"
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
                                    className="transition hover:bg-slate-50/50"
                                >
                                    <td className="px-4 py-3.5 font-medium text-slate-900">
                                        {ft.name}
                                    </td>
                                    <td className="px-4 py-3.5 text-right font-semibold text-emerald-700">
                                        {formatVnd(ft.pricePerKg)}
                                    </td>
                                    <td className="px-4 py-3.5 text-xs text-slate-500">
                                        {formatDateTime(ft.updatedAt || ft.createdAt)}
                                    </td>
                                    <td className="px-4 py-3.5 text-xs">
                                        <span className="inline-flex items-center rounded-md bg-emerald-50 px-2 py-1 font-medium text-emerald-700 ring-1 ring-inset ring-emerald-600/10">
                                            Đang áp dụng
                                        </span>
                                    </td>
                                    {canManage && (
                                        <td className="px-4 py-3.5 text-right">
                                            <div className="flex items-center justify-end gap-2">
                                                <button
                                                    type="button"
                                                    onClick={() => openEditModal(ft)}
                                                    className="inline-flex items-center rounded-md border border-slate-300 bg-white px-2.5 py-1 text-xs font-medium text-slate-700 shadow-sm transition hover:bg-slate-50"
                                                >
                                                    Sửa
                                                </button>
                                                <button
                                                    type="button"
                                                    disabled={
                                                        deactivatingId === ft.id
                                                    }
                                                    onClick={() =>
                                                        handleDeactivate(ft)
                                                    }
                                                    className="inline-flex items-center rounded-md border border-rose-200 bg-white px-2.5 py-1 text-xs font-medium text-rose-700 shadow-sm transition hover:bg-rose-50 disabled:opacity-50"
                                                >
                                                    {deactivatingId === ft.id
                                                        ? "Đang xử lý..."
                                                        : "Ngừng dùng"}
                                                </button>
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
                    <div className="w-full max-w-md rounded-2xl bg-white p-6 shadow-xl">
                        <div className="flex items-center justify-between border-b border-slate-100 pb-3">
                            <h3 className="text-base font-semibold text-slate-900">
                                Chỉnh sửa loại cá
                            </h3>
                            <button
                                type="button"
                                disabled={editLoading}
                                onClick={closeEditModal}
                                className="text-slate-400 hover:text-slate-600"
                            >
                                <svg
                                    className="h-5 w-5"
                                    fill="none"
                                    viewBox="0 0 24 24"
                                    strokeWidth={2}
                                    stroke="currentColor"
                                >
                                    <path
                                        strokeLinecap="round"
                                        strokeLinejoin="round"
                                        d="M6 18 18 6M6 6l12 12"
                                    />
                                </svg>
                            </button>
                        </div>

                        <form onSubmit={handleUpdate} className="mt-4 space-y-4">
                            {editError && (
                                <div className="rounded-lg border border-red-200 bg-red-50 p-3 text-xs text-red-700">
                                    {editError}
                                </div>
                            )}

                            <div>
                                <label
                                    htmlFor="edit-fish-name"
                                    className="block text-xs font-semibold text-slate-700"
                                >
                                    Tên loại cá <span className="text-red-500">*</span>
                                </label>
                                <input
                                    id="edit-fish-name"
                                    type="text"
                                    required
                                    value={editName}
                                    onChange={(e) => setEditName(e.target.value)}
                                    className="mt-1 block w-full rounded-lg border border-slate-300 px-3 py-2 text-sm text-slate-900 shadow-sm focus:border-emerald-500 focus:outline-none focus:ring-1 focus:ring-emerald-500"
                                />
                            </div>

                            <div>
                                <label
                                    htmlFor="edit-fish-price"
                                    className="block text-xs font-semibold text-slate-700"
                                >
                                    Đơn giá thu mua (VNĐ / kg){" "}
                                    <span className="text-red-500">*</span>
                                </label>
                                <input
                                    id="edit-fish-price"
                                    type="number"
                                    required
                                    min={1}
                                    step={1000}
                                    value={editPricePerKg}
                                    onChange={(e) =>
                                        setEditPricePerKg(e.target.value)
                                    }
                                    className="mt-1 block w-full rounded-lg border border-slate-300 px-3 py-2 text-sm text-slate-900 shadow-sm focus:border-emerald-500 focus:outline-none focus:ring-1 focus:ring-emerald-500"
                                />
                            </div>

                            <div className="mt-6 flex justify-end gap-3 pt-2">
                                <button
                                    type="button"
                                    disabled={editLoading}
                                    onClick={closeEditModal}
                                    className="rounded-lg border border-slate-300 bg-white px-4 py-2 text-sm font-medium text-slate-700 shadow-sm transition hover:bg-slate-50 disabled:opacity-50"
                                >
                                    Hủy
                                </button>
                                <button
                                    type="submit"
                                    disabled={editLoading}
                                    className="rounded-lg bg-emerald-600 px-4 py-2 text-sm font-semibold text-white shadow-sm transition hover:bg-emerald-700 active:bg-emerald-800 disabled:opacity-50"
                                >
                                    {editLoading
                                        ? "Đang lưu..."
                                        : "Lưu thay đổi"}
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}
        </div>
    );
}
