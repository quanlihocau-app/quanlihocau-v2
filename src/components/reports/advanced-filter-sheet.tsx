"use client";

import { useState } from "react";

export interface AdvancedFilterValues {
    areaId?: string;
    hutId?: string;
    employeeId?: string;
    customerId?: string;
    packageId?: string;
    productId?: string;
    paymentMethod?: string;
    sessionStatus?: string;
}

interface FilterOptions {
    areas: Array<{ id: string; name: string }>;
    huts: Array<{ id: string; name: string; areaName: string }>;
    packages: Array<{ id: string; name: string }>;
    products: Array<{ id: string; name: string }>;
    staff: Array<{ id: string; name: string }>;
}

interface AdvancedFilterSheetProps {
    isOpen: boolean;
    onClose: () => void;
    filters: AdvancedFilterValues;
    options: FilterOptions;
    onApply: (newFilters: AdvancedFilterValues) => void;
    onReset: () => void;
}

export function AdvancedFilterSheet(props: AdvancedFilterSheetProps) {
    if (!props.isOpen) return null;
    return <AdvancedFilterSheetContent {...props} />;
}

function AdvancedFilterSheetContent({
    onClose,
    filters,
    options,
    onApply,
    onReset,
}: AdvancedFilterSheetProps) {
    const [localFilters, setLocalFilters] = useState<AdvancedFilterValues>(filters);

    const filteredHuts = localFilters.areaId
        ? options.huts.filter((h) => options.areas.find((a) => a.id === localFilters.areaId)?.name === h.areaName)
        : options.huts;

    const handleApply = () => {
        onApply(localFilters);
        onClose();
    };

    const handleReset = () => {
        setLocalFilters({});
        onReset();
        onClose();
    };

    const activeCount = Object.values(localFilters).filter(Boolean).length;

    return (
        <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/40 backdrop-blur-xs transition-opacity animate-in fade-in">
            {/* Backdrop click to close */}
            <div className="absolute inset-0" onClick={onClose} />

            {/* Bottom sheet content */}
            <div className="relative z-10 w-full max-w-lg rounded-t-2xl bg-white p-4 shadow-2xl transition-transform animate-in slide-in-from-bottom duration-200 max-h-[85vh] flex flex-col">
                {/* Header */}
                <div className="flex items-center justify-between border-b border-slate-100 pb-3">
                    <div className="flex items-center gap-2">
                        <h3 className="text-base font-bold text-slate-800">Bộ lọc nâng cao</h3>
                        {activeCount > 0 && (
                            <span className="rounded-full bg-emerald-100 px-2 py-0.5 text-xs font-semibold text-emerald-800">
                                {activeCount} đang chọn
                            </span>
                        )}
                    </div>
                    <button
                        type="button"
                        onClick={onClose}
                        className="rounded-full p-2 text-slate-400 hover:bg-slate-100 hover:text-slate-600"
                    >
                        ✕
                    </button>
                </div>

                {/* Form fields scrollable */}
                <div className="flex-1 overflow-y-auto py-3 space-y-3.5 pr-1 text-xs">
                    {/* Khu vực & Ô câu */}
                    <div className="grid grid-cols-2 gap-2">
                        <div>
                            <label className="font-semibold text-slate-700 block mb-1">Khu vực hồ</label>
                            <select
                                aria-label="Khu vực hồ"
                                value={localFilters.areaId || ""}
                                onChange={(e) => setLocalFilters({ ...localFilters, areaId: e.target.value || undefined, hutId: undefined })}
                                className="w-full min-h-12 rounded-lg border border-slate-200 bg-slate-50 px-2.5 font-medium text-slate-800"
                            >
                                <option value="">-- Tất cả khu vực --</option>
                                {options.areas.map((a) => (
                                    <option key={a.id} value={a.id}>{a.name}</option>
                                ))}
                            </select>
                        </div>
                        <div>
                            <label className="font-semibold text-slate-700 block mb-1">Ô câu / Chòi</label>
                            <select
                                aria-label="Ô câu hoặc chòi"
                                value={localFilters.hutId || ""}
                                onChange={(e) => setLocalFilters({ ...localFilters, hutId: e.target.value || undefined })}
                                className="w-full min-h-12 rounded-lg border border-slate-200 bg-slate-50 px-2.5 font-medium text-slate-800"
                            >
                                <option value="">-- Tất cả ô câu --</option>
                                {filteredHuts.map((h) => (
                                    <option key={h.id} value={h.id}>{h.name} ({h.areaName})</option>
                                ))}
                            </select>
                        </div>
                    </div>

                    {/* Nhân viên & Khách hàng */}
                    <div>
                        <label className="font-semibold text-slate-700 block mb-1">Nhân viên thực hiện</label>
                        <select
                            aria-label="Nhân viên thực hiện"
                            value={localFilters.employeeId || ""}
                            onChange={(e) => setLocalFilters({ ...localFilters, employeeId: e.target.value || undefined })}
                            className="w-full min-h-12 rounded-lg border border-slate-200 bg-slate-50 px-2.5 font-medium text-slate-800"
                        >
                            <option value="">-- Tất cả nhân viên --</option>
                            {options.staff.map((s) => (
                                <option key={s.id} value={s.id}>{s.name}</option>
                            ))}
                        </select>
                    </div>

                    {/* Gói câu & Sản phẩm */}
                    <div className="grid grid-cols-2 gap-2">
                        <div>
                            <label className="font-semibold text-slate-700 block mb-1">Gói câu</label>
                            <select
                                aria-label="Gói câu"
                                value={localFilters.packageId || ""}
                                onChange={(e) => setLocalFilters({ ...localFilters, packageId: e.target.value || undefined })}
                                className="w-full min-h-12 rounded-lg border border-slate-200 bg-slate-50 px-2.5 font-medium text-slate-800"
                            >
                                <option value="">-- Tất cả gói --</option>
                                {options.packages.map((p) => (
                                    <option key={p.id} value={p.id}>{p.name}</option>
                                ))}
                            </select>
                        </div>
                        <div>
                            <label className="font-semibold text-slate-700 block mb-1">Sản phẩm / Nước uống</label>
                            <select
                                aria-label="Sản phẩm hoặc nước uống"
                                value={localFilters.productId || ""}
                                onChange={(e) => setLocalFilters({ ...localFilters, productId: e.target.value || undefined })}
                                className="w-full min-h-12 rounded-lg border border-slate-200 bg-slate-50 px-2.5 font-medium text-slate-800"
                            >
                                <option value="">-- Tất cả mặt hàng --</option>
                                {options.products.map((p) => (
                                    <option key={p.id} value={p.id}>{p.name}</option>
                                ))}
                            </select>
                        </div>
                    </div>

                    {/* Phương thức thanh toán & Trạng thái vé */}
                    <div className="grid grid-cols-2 gap-2">
                        <div>
                            <label className="font-semibold text-slate-700 block mb-1">Phương thức thanh toán</label>
                            <select
                                aria-label="Phương thức thanh toán"
                                value={localFilters.paymentMethod || ""}
                                onChange={(e) => setLocalFilters({ ...localFilters, paymentMethod: e.target.value || undefined })}
                                className="w-full min-h-12 rounded-lg border border-slate-200 bg-slate-50 px-2.5 font-medium text-slate-800"
                            >
                                <option value="">-- Tất cả phương thức --</option>
                                <option value="CASH">Tiền mặt</option>
                                <option value="BANK_TRANSFER">Chuyển khoản</option>
                            </select>
                        </div>
                        <div>
                            <label className="font-semibold text-slate-700 block mb-1">Trạng thái vé câu</label>
                            <select
                                aria-label="Trạng thái vé câu"
                                value={localFilters.sessionStatus || ""}
                                onChange={(e) => setLocalFilters({ ...localFilters, sessionStatus: e.target.value || undefined })}
                                className="w-full min-h-12 rounded-lg border border-slate-200 bg-slate-50 px-2.5 font-medium text-slate-800"
                            >
                                <option value="">-- Tất cả trạng thái --</option>
                                <option value="ACTIVE">Đang câu</option>
                                <option value="COMPLETED">Đã kết thúc</option>
                                <option value="CANCELLED">Đã hủy</option>
                            </select>
                        </div>
                    </div>
                </div>

                {/* Footer buttons */}
                <div className="flex items-center gap-2 border-t border-slate-100 pt-3">
                    <button
                        type="button"
                        onClick={handleReset}
                        className="flex-1 min-h-12 rounded-xl border border-slate-200 bg-slate-50 text-xs font-semibold text-slate-700 hover:bg-slate-100 active:scale-95 transition-all"
                    >
                        Xóa bộ lọc
                    </button>
                    <button
                        type="button"
                        onClick={handleApply}
                        className="flex-1 min-h-12 rounded-xl bg-emerald-700 text-xs font-semibold text-white shadow-sm hover:bg-emerald-800 active:scale-95 transition-all"
                    >
                        Áp dụng kết quả
                    </button>
                </div>
            </div>
        </div>
    );
}
