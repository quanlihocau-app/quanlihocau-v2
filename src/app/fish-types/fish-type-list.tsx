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

    // Deactivate confirm modal state
    const [deactivatingItem, setDeactivatingItem] = useState<FishTypeItem | null>(null);
    const [deactivateLoading, setDeactivateLoading] = useState(false);
    const [deactivateError, setDeactivateError] = useState<string | null>(null);

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

    function openDeactivateModal(item: FishTypeItem) {
        setDeactivatingItem(item);
        setDeactivateError(null);
    }

    function closeDeactivateModal() {
        if (!deactivateLoading) {
            setDeactivatingItem(null);
            setDeactivateError(null);
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

    async function handleConfirmDeactivate() {
        if (!deactivatingItem) return;

        setDeactivateLoading(true);
        setDeactivateError(null);

        try {
            const res = await fetch(`/api/fish-types/${deactivatingItem.id}`, {
                method: "DELETE",
            });

            const data = await res.json();

            if (!res.ok) {
                setDeactivateError(data.error || "Không thể ngừng dùng loại cá.");
                return;
            }

            setDeactivatingItem(null);
            router.refresh();
        } catch {
            setDeactivateError("Lỗi kết nối mạng, vui lòng thử lại sau.");
        } finally {
            setDeactivateLoading(false);
        }
    }

    const formatEditVnd = (amount: number) => {
        return new Intl.NumberFormat("vi-VN").format(amount) + " đ";
    };

    return (
        <div className="space-y-4">
            {/* Search Toolbar */}
            <div className="flex flex-col justify-between gap-3 sm:flex-row sm:items-center">
                <div className="relative w-full max-w-sm">
                    <div className="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-3">
                        <svg className="h-4 w-4 text-slate-400" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" d="m21 21-5.197-5.197m0 0A7.5 7.5 0 1 0 5.196 5.196a7.5 7.5 0 0 0 10.607 10.607Z" />
                        </svg>
                    </div>
                    <input
                        type="text"
                        value={search}
                        onChange={(e) => setSearch(e.target.value)}
                        placeholder="Tìm kiếm loại cá..."
                        className="h-10 w-full rounded-md border border-slate-200 bg-white pl-9 pr-3 text-xs text-slate-900 placeholder:text-slate-400 focus:border-blue-600 focus:outline-none focus:ring-1 focus:ring-blue-600 transition-colors"
                    />
                </div>
                <div className="text-xs font-medium text-slate-500">
                    Hiển thị <span className="font-bold text-slate-800">{filteredItems.length}</span> / {fishTypes.length} loại cá
                </div>
            </div>

            {/* Mobile Cards (Flat, Low Border Radius, High Legibility) */}
            <div className="grid grid-cols-1 gap-3 md:hidden">
                {filteredItems.length === 0 ? (
                    <div className="rounded-lg border border-dashed border-slate-200 py-10 text-center">
                        <p className="text-xs font-medium text-slate-500">
                            {search
                                ? "Không tìm thấy loại cá nào khớp với tìm kiếm."
                                : "Chưa có loại cá nào trong danh mục."}
                        </p>
                    </div>
                ) : (
                    filteredItems.map((ft) => (
                        <div
                            key={ft.id}
                            className="flex flex-col gap-2.5 rounded-lg border border-slate-200 bg-white p-3.5"
                        >
                            <div className="flex items-start justify-between gap-2">
                                <div className="space-y-0.5">
                                    <h3 className="text-sm font-bold text-[#0f172a]">
                                        {ft.name}
                                    </h3>
                                    <p className="text-[11px] text-slate-400">
                                        Cập nhật: {formatDateTime(ft.updatedAt || ft.createdAt)}
                                    </p>
                                </div>
                                <div className="text-right">
                                    <span className="text-sm font-extrabold text-blue-600 tabular-nums">
                                        {formatVnd(ft.pricePerKg)}
                                    </span>
                                </div>
                            </div>

                            <div className="flex items-center justify-between border-t border-slate-100 pt-2.5">
                                <span className="inline-flex items-center rounded-sm bg-emerald-50 px-2 py-0.5 text-[11px] font-semibold text-emerald-700 border border-emerald-200/60">
                                    Đang áp dụng
                                </span>

                                {canManage && (
                                    <div className="flex items-center gap-2">
                                        <button
                                            type="button"
                                            onClick={() => openEditModal(ft)}
                                            className="flex min-h-9.5 items-center justify-center rounded-md border border-slate-200 bg-white px-3 text-xs font-semibold text-slate-700 hover:bg-slate-50 active:bg-slate-100 transition-colors cursor-pointer"
                                        >
                                            Sửa
                                        </button>
                                        <button
                                            type="button"
                                            onClick={() => openDeactivateModal(ft)}
                                            className="flex min-h-9.5 items-center justify-center rounded-md border border-rose-200 bg-white px-3 text-xs font-semibold text-rose-600 hover:bg-rose-50 active:bg-rose-100 transition-colors cursor-pointer"
                                        >
                                            Ngừng dùng
                                        </button>
                                    </div>
                                )}
                            </div>
                        </div>
                    ))
                )}
            </div>

            {/* Desktop Table (Flat, Crisp, Minimal Borders) */}
            <div className="hidden overflow-hidden rounded-lg border border-slate-200 bg-white md:block">
                <table className="w-full text-left text-xs text-slate-600">
                    <thead className="border-b border-slate-200 bg-slate-50 text-[11px] font-bold uppercase tracking-wider text-slate-700">
                        <tr>
                            <th className="px-4 py-3.5">Tên loại cá</th>
                            <th className="px-4 py-3.5 text-right">Đơn giá thu mua</th>
                            <th className="px-4 py-3.5">Ngày cập nhật</th>
                            <th className="px-4 py-3.5">Trạng thái</th>
                            {canManage && (
                                <th className="px-4 py-3.5 text-right">Thao tác</th>
                            )}
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                        {filteredItems.length === 0 ? (
                            <tr>
                                <td
                                    colSpan={canManage ? 5 : 4}
                                    className="px-4 py-10 text-center text-xs text-slate-400 font-medium"
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
                                    className="hover:bg-slate-50/70 transition-colors"
                                >
                                    <td className="px-4 py-3.5 font-bold text-slate-900 text-sm">
                                        {ft.name}
                                    </td>
                                    <td className="px-4 py-3.5 text-right font-extrabold text-blue-600 tabular-nums text-sm">
                                        {formatVnd(ft.pricePerKg)}
                                    </td>
                                    <td className="px-4 py-3.5 text-xs text-slate-500">
                                        {formatDateTime(ft.updatedAt || ft.createdAt)}
                                    </td>
                                    <td className="px-4 py-3.5">
                                        <span className="inline-flex items-center rounded-sm bg-emerald-50 px-2 py-0.5 text-[11px] font-semibold text-emerald-700 border border-emerald-200/60">
                                            Đang áp dụng
                                        </span>
                                    </td>
                                    {canManage && (
                                        <td className="px-4 py-3.5 text-right">
                                            <div className="flex items-center justify-end gap-2">
                                                <button
                                                    type="button"
                                                    onClick={() => openEditModal(ft)}
                                                    className="inline-flex h-8 items-center justify-center rounded-md border border-slate-200 bg-white px-3 text-xs font-semibold text-slate-700 hover:bg-slate-50 active:bg-slate-100 transition-colors cursor-pointer"
                                                >
                                                    Sửa
                                                </button>
                                                <button
                                                    type="button"
                                                    onClick={() => openDeactivateModal(ft)}
                                                    className="inline-flex h-8 items-center justify-center rounded-md border border-rose-200 bg-white px-3 text-xs font-semibold text-rose-600 hover:bg-rose-50 active:bg-rose-100 transition-colors cursor-pointer"
                                                >
                                                    Ngừng dùng
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

            {/* Edit Modal (Flat Navy/Blue styling, 44px buttons, 6px radius) */}
            {editingItem && (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/40 backdrop-blur-xs p-4 animate-in fade-in duration-150">
                    <div className="w-full max-w-md rounded-lg border border-slate-200 bg-white p-6 shadow-sm space-y-4 animate-in zoom-in-95 duration-150">
                        <div className="flex items-center justify-between border-b border-slate-100 pb-3">
                            <h3 className="text-base font-bold text-[#0f172a]">
                                Chỉnh sửa loại cá
                            </h3>
                            <button
                                type="button"
                                disabled={editLoading}
                                onClick={closeEditModal}
                                className="text-slate-400 hover:text-slate-600 focus:outline-none cursor-pointer"
                            >
                                <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor">
                                    <path strokeLinecap="round" strokeLinejoin="round" d="M6 18 18 6M6 6l12 12" />
                                </svg>
                            </button>
                        </div>

                        <form onSubmit={handleUpdate} className="space-y-4">
                            {editError && (
                                <div className="flex items-start gap-2 rounded-md border border-rose-200 bg-rose-50 px-3 py-2 text-xs text-rose-800">
                                    <svg className="h-4 w-4 shrink-0 text-rose-600 mt-0.5" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor">
                                        <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v3.75m9-.75a9 9 0 1 1-18 0 9 9 0 0 1 18 0Zm-9 3.75h.008v.008H12v-.008Z" />
                                    </svg>
                                    <span>{editError}</span>
                                </div>
                            )}

                            <div className="space-y-1.5">
                                <label
                                    htmlFor="edit-fish-name"
                                    className="block text-xs font-semibold uppercase tracking-wider text-slate-700"
                                >
                                    Tên loại cá <span className="text-rose-500">*</span>
                                </label>
                                <input
                                    id="edit-fish-name"
                                    type="text"
                                    required
                                    disabled={editLoading}
                                    value={editName}
                                    onChange={(e) => setEditName(e.target.value)}
                                    className="h-11 w-full rounded-md border border-slate-200 bg-white px-3.5 text-sm text-slate-900 placeholder:text-slate-400 focus:border-blue-600 focus:outline-none focus:ring-1 focus:ring-blue-600 transition-colors disabled:bg-slate-50"
                                />
                            </div>

                            <div className="space-y-1.5">
                                <label
                                    htmlFor="edit-fish-price"
                                    className="block text-xs font-semibold uppercase tracking-wider text-slate-700"
                                >
                                    Đơn giá thu mua (VNĐ/kg) <span className="text-rose-500">*</span>
                                </label>
                                <input
                                    id="edit-fish-price"
                                    type="number"
                                    required
                                    min={0}
                                    step={1000}
                                    disabled={editLoading}
                                    value={editPricePerKg}
                                    onChange={(e) => setEditPricePerKg(e.target.value)}
                                    className="h-11 w-full rounded-md border border-slate-200 bg-white px-3.5 text-sm text-slate-900 placeholder:text-slate-400 focus:border-blue-600 focus:outline-none focus:ring-1 focus:ring-blue-600 transition-colors disabled:bg-slate-50 tabular-nums"
                                />
                                {editPricePerKg !== "" && !isNaN(Number(editPricePerKg)) && Number(editPricePerKg) > 0 ? (
                                    <p className="text-[11px] font-semibold text-blue-600">
                                        Định dạng: {formatEditVnd(Number(editPricePerKg))} / kg
                                    </p>
                                ) : (
                                    <p className="text-[11px] text-slate-400">
                                        Nhập đơn giá tính theo 1 kg (bội số 1.000đ)
                                    </p>
                                )}
                            </div>

                            <div className="flex flex-col-reverse sm:flex-row justify-end gap-2 pt-2">
                                <button
                                    type="button"
                                    disabled={editLoading}
                                    onClick={closeEditModal}
                                    className="flex min-h-11 sm:min-h-9.5 h-11 sm:h-9 items-center justify-center rounded-md border border-slate-200 bg-white px-4 text-xs font-semibold text-slate-700 hover:bg-slate-50 transition-colors cursor-pointer"
                                >
                                    Hủy
                                </button>
                                <button
                                    type="submit"
                                    disabled={editLoading}
                                    className="flex min-h-11 sm:min-h-9.5 h-11 sm:h-9 items-center justify-center gap-2 rounded-md bg-[#0f172a] px-5 text-xs font-bold uppercase tracking-wider text-white hover:bg-[#1e293b] transition-colors disabled:opacity-50 cursor-pointer"
                                >
                                    {editLoading ? "Đang lưu…" : "Lưu thay đổi"}
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}

            {/* Deactivate Confirm Modal (Flat, Clean, Confirmation) */}
            {deactivatingItem && (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/40 backdrop-blur-xs p-4 animate-in fade-in duration-150">
                    <div className="w-full max-w-md rounded-lg border border-slate-200 bg-white p-6 shadow-sm space-y-4 animate-in zoom-in-95 duration-150">
                        <div className="flex items-start gap-3">
                            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-md bg-rose-50 text-rose-600 border border-rose-200">
                                <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor">
                                    <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v3.75m-9.303 3.376c-.866 1.5.217 3.374 1.948 3.374h14.71c1.73 0 2.813-1.874 1.948-3.374L13.949 3.378c-.866-1.5-3.032-1.5-3.898 0L2.697 16.126ZM12 15.75h.007v.008H12v-.008Z" />
                                </svg>
                            </div>
                            <div className="space-y-1">
                                <h3 className="text-base font-bold text-[#0f172a]">
                                    Xác nhận ngừng dùng loại cá
                                </h3>
                                <p className="text-xs text-slate-600 leading-relaxed">
                                    Bạn có chắc chắn muốn ngừng dùng loại cá <strong className="text-slate-900">&quot;{deactivatingItem.name}&quot;</strong> không?
                                </p>
                                <p className="text-[11px] text-slate-400">
                                    Sau khi ngừng dùng, loại cá này sẽ không còn xuất hiện khi thu mua cá từ cần thủ. Dữ liệu lịch sử thu mua trước đây vẫn được giữ nguyên.
                                </p>
                            </div>
                        </div>

                        {deactivateError && (
                            <div className="flex items-start gap-2 rounded-md border border-rose-200 bg-rose-50 px-3 py-2 text-xs text-rose-800">
                                <span>{deactivateError}</span>
                            </div>
                        )}

                        <div className="flex flex-col-reverse sm:flex-row justify-end gap-2 pt-2 border-t border-slate-100">
                            <button
                                type="button"
                                disabled={deactivateLoading}
                                onClick={closeDeactivateModal}
                                className="flex min-h-11 sm:min-h-9.5 h-11 sm:h-9 items-center justify-center rounded-md border border-slate-200 bg-white px-4 text-xs font-semibold text-slate-700 hover:bg-slate-50 transition-colors cursor-pointer"
                            >
                                Giữ lại
                            </button>
                            <button
                                type="button"
                                disabled={deactivateLoading}
                                onClick={handleConfirmDeactivate}
                                className="flex min-h-11 sm:min-h-9.5 h-11 sm:h-9 items-center justify-center gap-2 rounded-md bg-rose-600 px-5 text-xs font-bold uppercase tracking-wider text-white hover:bg-rose-700 transition-colors disabled:opacity-50 cursor-pointer"
                            >
                                {deactivateLoading ? "Đang xử lý…" : "Ngừng dùng"}
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}
