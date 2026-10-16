"use client";

import { useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { FinanceNav } from "@/components/finance/finance-nav";
import { MobileBottomNav } from "@/components/layout/mobile-bottom-nav";

type Category = { id: string; name: string; type: "IN" | "OUT"; parentId: string | null; isActive: boolean; isSystem: boolean; color: string | null; icon: string | null; code: string | null; parent?: { id: string; name: string } | null; children?: { id: string; name: string; type: "IN" | "OUT"; color: string | null; icon: string | null; isActive: boolean }[]; _count?: { transactions: number } };
const errorMessage = (error: unknown, fallback: string) => error instanceof Error ? error.message : fallback;

const PRESET_COLORS = [
    "#10b981", "#06b6d4", "#3b82f6", "#8b5cf6", "#ec4899",
    "#ef4444", "#f97316", "#eab308", "#84cc16", "#64748b",
];

export function CategoriesView({
    lakeId,
    lakeName,
}: {
    lakeId: string;
    lakeName: string;
}) {
    const queryClient = useQueryClient();

    const [activeTab, setActiveTab] = useState<"IN" | "OUT">("IN");
    const [isCreateOpen, setIsCreateOpen] = useState(false);
    const [catName, setCatName] = useState("");
    const [catCode, setCatCode] = useState("");
    const [catColor, setCatColor] = useState("#10b981");
    const [catParentId, setCatParentId] = useState("");
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [errorMsg, setErrorMsg] = useState("");
    const [successMsg, setSuccessMsg] = useState("");

    const { data, isLoading } = useQuery({
        queryKey: ["finance-categories-all", lakeId],
        queryFn: async () => {
            const res = await fetch(`/api/finance/categories`);
            if (!res.ok) throw new Error("Không thể tải danh mục.");
            return res.json();
        },
    });

    const allCategories: Category[] = data?.categories || [];
    const filteredCategories = allCategories.filter((c) => c.type === activeTab);
    const parentCandidates = filteredCategories.filter((c) => !c.parentId);

    async function handleCreate(e: React.FormEvent) {
        e.preventDefault();
        if (!catName.trim()) return;

        setIsSubmitting(true);
        setErrorMsg("");
        setSuccessMsg("");

        try {
            const res = await fetch("/api/finance/categories", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    name: catName.trim(),
                    type: activeTab,
                    code: catCode.trim() || undefined,
                    color: catColor,
                    parentId: catParentId || null,
                }),
            });
            const json = await res.json();
            if (!res.ok) throw new Error(json.error || "Lỗi tạo danh mục.");

            setSuccessMsg("Đã tạo danh mục thành công.");
            setCatName("");
            setCatCode("");
            setCatParentId("");
            await queryClient.invalidateQueries({ queryKey: ["finance-categories", lakeId] });
            await queryClient.invalidateQueries({ queryKey: ["finance-categories-all", lakeId] });
            setTimeout(() => setIsCreateOpen(false), 800);
        } catch (err: unknown) {
            setErrorMsg(errorMessage(err, "Có lỗi xảy ra."));
        } finally {
            setIsSubmitting(false);
        }
    }

    async function handleToggleActive(category: Category) {
        try {
            const res = await fetch(`/api/finance/categories/${category.id}`, {
                method: "PUT",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ isActive: !category.isActive }),
            });
            if (!res.ok) {
                const j = await res.json();
                throw new Error(j.error);
            }
            await queryClient.invalidateQueries({ queryKey: ["finance-categories-all", lakeId] });
        } catch (err: unknown) {
            alert(errorMessage(err, "Không thể cập nhật danh mục."));
        }
    }

    async function handleDeleteCategory(category: Category) {
        if (!confirm(`Bạn có chắc chắn muốn xóa danh mục "${category.name}"?`)) return;

        try {
            const res = await fetch(`/api/finance/categories/${category.id}`, {
                method: "DELETE",
            });
            const json = await res.json();
            if (!res.ok) throw new Error(json.error || "Lỗi khi xóa danh mục.");

            alert(json.message);
            await queryClient.invalidateQueries({ queryKey: ["finance-categories-all", lakeId] });
        } catch (err: unknown) {
            alert(errorMessage(err, "Không thể xóa danh mục."));
        }
    }

    return (
        <div className="min-h-screen bg-slate-50 pb-20 font-sans text-slate-800">
            {/* Header */}
            <header className="border-b border-slate-200 bg-white">
                <div className="mx-auto flex max-w-7xl flex-col gap-4 px-4 py-4 sm:flex-row sm:items-center sm:justify-between">
                    <div>
                        <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wider text-emerald-600">
                            <span>SaaS Tài chính</span>
                            <span>•</span>
                            <span>{lakeName}</span>
                        </div>
                        <h1 className="mt-1 text-2xl font-bold tracking-tight text-slate-900 sm:text-3xl">
                            Cấu hình Danh mục Thu & Chi
                        </h1>
                    </div>

                    <button
                        onClick={() => {
                            setErrorMsg("");
                            setSuccessMsg("");
                            setIsCreateOpen(true);
                        }}
                        className="inline-flex items-center gap-1.5 rounded-xl bg-emerald-600 px-4 py-2 text-sm font-bold text-white shadow-xs hover:bg-emerald-700"
                    >
                        <span>＋</span> Thêm danh mục {activeTab === "IN" ? "Thu" : "Chi"} mới
                    </button>
                </div>
            </header>

            <FinanceNav />

            <main className="mx-auto max-w-7xl space-y-5 px-4 py-6">
                {/* Tab Thu vs Chi */}
                <div className="flex items-center justify-between border-b border-slate-200 pb-2">
                    <div className="flex space-x-2">
                        <button
                            onClick={() => {
                                setActiveTab("IN");
                                setCatColor("#10b981");
                            }}
                            className={`rounded-xl px-4 py-2 text-sm font-bold transition-all ${
                                activeTab === "IN"
                                    ? "bg-emerald-600 text-white shadow-xs"
                                    : "bg-white text-slate-600 hover:bg-slate-100"
                            }`}
                        >
                            🟢 Danh mục Thu tiền ({allCategories.filter((c) => c.type === "IN").length})
                        </button>
                        <button
                            onClick={() => {
                                setActiveTab("OUT");
                                setCatColor("#ef4444");
                            }}
                            className={`rounded-xl px-4 py-2 text-sm font-bold transition-all ${
                                activeTab === "OUT"
                                    ? "bg-red-600 text-white shadow-xs"
                                    : "bg-white text-slate-600 hover:bg-slate-100"
                            }`}
                        >
                            🔴 Danh mục Chi tiền ({allCategories.filter((c) => c.type === "OUT").length})
                        </button>
                    </div>
                </div>

                <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-xs">
                    {isLoading ? (
                        <p className="py-8 text-center text-sm text-slate-400">Đang tải danh mục...</p>
                    ) : filteredCategories.length === 0 ? (
                        <p className="py-8 text-center text-sm text-slate-400">Chưa có danh mục nào.</p>
                    ) : (
                        <div className="divide-y divide-slate-100">
                            {filteredCategories.map((cat) => (
                                <div
                                    key={cat.id}
                                    className="flex items-center justify-between py-3.5 transition-colors hover:bg-slate-50/60 px-2 rounded-xl"
                                >
                                    <div className="flex items-center gap-3">
                                        <span
                                            className="h-3.5 w-3.5 rounded-full shrink-0"
                                            style={{ backgroundColor: cat.color || "#64748b" }}
                                        />
                                        <div>
                                            <div className="flex items-center gap-2">
                                                <p className="font-bold text-slate-900">{cat.name}</p>
                                                {cat.isSystem && (
                                                    <span className="rounded-full bg-slate-100 px-2 py-0.5 text-[10px] font-bold text-slate-500">
                                                        Mặc định
                                                    </span>
                                                )}
                                                {!cat.isActive && (
                                                    <span className="rounded-full bg-amber-100 px-2 py-0.5 text-[10px] font-bold text-amber-800">
                                                        Đã tắt
                                                    </span>
                                                )}
                                            </div>
                                            <p className="text-xs text-slate-400">
                                                {cat._count?.transactions || 0} giao dịch đã sử dụng
                                                {cat.parent ? ` • Thuộc: ${cat.parent.name}` : ""}
                                            </p>
                                        </div>
                                    </div>

                                    <div className="flex items-center gap-2">
                                        <button
                                            onClick={() => handleToggleActive(cat)}
                                            className={`rounded-lg px-2.5 py-1 text-xs font-semibold ${
                                                cat.isActive
                                                    ? "bg-slate-100 text-slate-600 hover:bg-slate-200"
                                                    : "bg-emerald-100 text-emerald-800 hover:bg-emerald-200"
                                            }`}
                                        >
                                            {cat.isActive ? "Tắt" : "Bật"}
                                        </button>
                                        {!cat.isSystem && cat._count?.transactions === 0 && (
                                            <button
                                                onClick={() => handleDeleteCategory(cat)}
                                                className="rounded-lg bg-red-50 px-2.5 py-1 text-xs font-semibold text-red-600 hover:bg-red-100"
                                            >
                                                Xóa
                                            </button>
                                        )}
                                    </div>
                                </div>
                            ))}
                        </div>
                    )}
                </div>
            </main>

            {/* Modal Thêm danh mục */}
            {isCreateOpen && (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4 backdrop-blur-xs">
                    <div className="w-full max-w-md rounded-2xl bg-white p-6 shadow-2xl space-y-4">
                        <div className="flex justify-between items-center border-b pb-3">
                            <h3 className="font-bold text-base text-slate-900">
                                Thêm Danh Mục {activeTab === "IN" ? "Thu" : "Chi"} Mới
                            </h3>
                            <button onClick={() => setIsCreateOpen(false)} className="text-slate-400">
                                ✕
                            </button>
                        </div>
                        {errorMsg && <p className="text-xs text-red-600 bg-red-50 p-2 rounded-lg">{errorMsg}</p>}
                        {successMsg && <p className="text-xs text-emerald-600 bg-emerald-50 p-2 rounded-lg">{successMsg}</p>}
                        <form onSubmit={handleCreate} className="space-y-3 text-xs sm:text-sm">
                            <div>
                                <label className="font-semibold text-slate-700">Tên danh mục</label>
                                <input
                                    type="text"
                                    required
                                    placeholder="Ví dụ: Bán nước tăng lực, Mua cá basa..."
                                    value={catName}
                                    onChange={(e) => setCatName(e.target.value)}
                                    className="w-full mt-1 border rounded-xl p-2"
                                />
                            </div>
                            <div>
                                <label className="font-semibold text-slate-700">Mã ký hiệu (Tùy chọn)</label>
                                <input
                                    type="text"
                                    placeholder="Ví dụ: THU_FNB_01..."
                                    value={catCode}
                                    onChange={(e) => setCatCode(e.target.value)}
                                    className="w-full mt-1 border rounded-xl p-2"
                                />
                            </div>
                            <div>
                                <label className="font-semibold text-slate-700">Danh mục cha (Tùy chọn)</label>
                                <select
                                    value={catParentId}
                                    onChange={(e) => setCatParentId(e.target.value)}
                                    className="w-full mt-1 border rounded-xl p-2"
                                >
                                    <option value="">-- Là danh mục chính (Không có cha) --</option>
                                    {parentCandidates.map((p) => (
                                        <option key={p.id} value={p.id}>
                                            {p.name}
                                        </option>
                                    ))}
                                </select>
                            </div>
                            <div>
                                <label className="font-semibold text-slate-700">Màu sắc nhận diện</label>
                                <div className="mt-2 flex flex-wrap gap-2">
                                    {PRESET_COLORS.map((col) => (
                                        <button
                                            type="button"
                                            key={col}
                                            onClick={() => setCatColor(col)}
                                            className={`h-6 w-6 rounded-full border-2 transition-transform ${
                                                catColor === col ? "scale-125 border-slate-900" : "border-transparent"
                                            }`}
                                            style={{ backgroundColor: col }}
                                        />
                                    ))}
                                </div>
                            </div>
                            <div className="flex justify-end gap-2 pt-2 border-t">
                                <button
                                    type="button"
                                    onClick={() => setIsCreateOpen(false)}
                                    className="px-4 py-2 border rounded-xl font-semibold text-slate-600"
                                >
                                    Hủy
                                </button>
                                <button
                                    type="submit"
                                    disabled={isSubmitting}
                                    className="px-5 py-2 bg-emerald-600 text-white rounded-xl font-bold"
                                >
                                    {isSubmitting ? "Đang lưu..." : "Tạo danh mục"}
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}

            <MobileBottomNav />
        </div>
    );
}
