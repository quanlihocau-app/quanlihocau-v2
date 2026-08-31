"use client";

import { useRouter } from "next/navigation";
import { FormEvent, useState } from "react";

import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { InlineAlert } from "@/components/ui/inline-alert";

export interface PackageItem {
    id: string;
    name: string;
    durationMinutes: number;
    priceVnd: number;
    overtimeHourlyVnd: number;
    createdAt: Date | string;
}

interface PackageManagerProps {
    packages: PackageItem[];
    canManage: boolean;
}

function formatVnd(amount: number): string {
    return new Intl.NumberFormat("vi-VN").format(amount) + " đ";
}

function formatDuration(minutes: number): string {
    const hours = Math.floor(minutes / 60);
    const remainingMinutes = minutes % 60;

    if (hours > 0 && remainingMinutes > 0) {
        return `${hours} giờ ${remainingMinutes} phút (${minutes}p)`;
    }
    if (hours > 0) {
        return `${hours} giờ (${minutes}p)`;
    }
    return `${minutes} phút`;
}

export function PackageManager({ packages, canManage }: PackageManagerProps) {
    const router = useRouter();

    // Create state
    const [name, setName] = useState("");
    const [durationMinutes, setDurationMinutes] = useState<number | "">(240);
    const [priceVnd, setPriceVnd] = useState<number | "">(200000);
    const [overtimeHourlyVnd, setOvertimeHourlyVnd] = useState<number | "">(50000);
    const [isCreating, setIsCreating] = useState(false);
    const [createError, setCreateError] = useState("");
    const [createSuccess, setCreateSuccess] = useState(false);

    // Edit modal state
    const [editingPackage, setEditingPackage] = useState<PackageItem | null>(null);
    const [editName, setEditName] = useState("");
    const [editDurationMinutes, setEditDurationMinutes] = useState<number | "">(0);
    const [editPriceVnd, setEditPriceVnd] = useState<number | "">(0);
    const [editOvertimeHourlyVnd, setEditOvertimeHourlyVnd] = useState<number | "">(0);
    const [isEditing, setIsEditing] = useState(false);
    const [editError, setEditError] = useState("");

    // Action message
    const [actionMessage, setActionMessage] = useState("");

    async function handleCreate(event: FormEvent<HTMLFormElement>) {
        event.preventDefault();
        setCreateError("");
        setCreateSuccess(false);
        setIsCreating(true);

        try {
            const response = await fetch("/api/packages", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    name,
                    durationMinutes: Number(durationMinutes),
                    priceVnd: Number(priceVnd),
                    overtimeHourlyVnd: Number(overtimeHourlyVnd),
                }),
            });

            const result = (await response.json()) as { error?: string };

            if (!response.ok) {
                setCreateError(result.error ?? "Không thể tạo gói câu.");
                setIsCreating(false);
                return;
            }

            setName("");
            setDurationMinutes(240);
            setPriceVnd(200000);
            setOvertimeHourlyVnd(50000);
            setCreateSuccess(true);
            setTimeout(() => setCreateSuccess(false), 3000);
            router.refresh();
        } catch {
            setCreateError("Đã xảy ra lỗi khi tạo gói câu.");
        } finally {
            setIsCreating(false);
        }
    }

    function openEditModal(pkg: PackageItem) {
        setEditingPackage(pkg);
        setEditName(pkg.name);
        setEditDurationMinutes(pkg.durationMinutes);
        setEditPriceVnd(pkg.priceVnd);
        setEditOvertimeHourlyVnd(pkg.overtimeHourlyVnd);
        setEditError("");
    }

    function closeEditModal() {
        setEditingPackage(null);
        setEditName("");
        setEditDurationMinutes(0);
        setEditPriceVnd(0);
        setEditOvertimeHourlyVnd(0);
        setEditError("");
    }

    async function handleEdit(event: FormEvent<HTMLFormElement>) {
        event.preventDefault();
        if (!editingPackage) return;

        setEditError("");
        setIsEditing(true);

        try {
            const response = await fetch(`/api/packages/${editingPackage.id}`, {
                method: "PATCH",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    name: editName,
                    durationMinutes: Number(editDurationMinutes),
                    priceVnd: Number(editPriceVnd),
                    overtimeHourlyVnd: Number(editOvertimeHourlyVnd),
                }),
            });

            const result = (await response.json()) as { error?: string };

            if (!response.ok) {
                setEditError(result.error ?? "Không thể cập nhật gói câu.");
                setIsEditing(false);
                return;
            }

            closeEditModal();
            setActionMessage("Đã cập nhật gói câu thành công.");
            setTimeout(() => setActionMessage(""), 3000);
            router.refresh();
        } catch {
            setEditError("Đã xảy ra lỗi khi cập nhật gói câu.");
        } finally {
            setIsEditing(false);
        }
    }

    async function handleDelete(pkg: PackageItem) {
        if (!window.confirm(`Bạn có chắc chắn muốn xóa gói câu "${pkg.name}" không?`)) {
            return;
        }

        try {
            const response = await fetch(`/api/packages/${pkg.id}`, {
                method: "DELETE",
            });

            const result = (await response.json()) as {
                error?: string;
                message?: string;
            };

            if (!response.ok) {
                alert(result.error ?? "Không thể xóa gói câu.");
                return;
            }

            setActionMessage(result.message ?? "Đã xóa gói câu thành công.");
            setTimeout(() => setActionMessage(""), 3000);
            router.refresh();
        } catch {
            alert("Đã xảy ra lỗi khi xóa gói câu.");
        }
    }

    return (
        <div className="space-y-6">
            {actionMessage ? (
                <InlineAlert type="success" message={actionMessage} />
            ) : null}

            {/* Create Form */}
            {canManage && (
                <Card className="p-5 sm:p-6 space-y-4">
                    <div>
                        <h2 className="text-sm font-bold uppercase tracking-wider text-[#102A43]">
                            Thêm gói câu mới
                        </h2>
                        <p className="mt-0.5 text-xs text-slate-500 font-medium">
                            Cấu hình thời lượng câu, giá gói cơ bản và phụ thu quá giờ.
                        </p>
                    </div>

                    <form onSubmit={handleCreate} className="space-y-4">
                        <div className="grid gap-3 sm:grid-cols-2">
                            <Input
                                label="Tên gói câu *"
                                type="text"
                                value={name}
                                onChange={(e) => setName(e.target.value)}
                                required
                                minLength={2}
                                maxLength={100}
                                placeholder="VD: Ca 4 Giờ, Ca Sáng..."
                            />
                            <Input
                                label="Thời lượng (Phút) *"
                                type="number"
                                min={15}
                                step={15}
                                value={durationMinutes}
                                onChange={(e) =>
                                    setDurationMinutes(
                                        e.target.value === "" ? "" : Number(e.target.value),
                                    )
                                }
                                required
                            />
                            <Input
                                label="Giá gói (VNĐ) *"
                                type="number"
                                min={0}
                                step={1000}
                                value={priceVnd}
                                onChange={(e) =>
                                    setPriceVnd(
                                        e.target.value === "" ? "" : Number(e.target.value),
                                    )
                                }
                                required
                            />
                            <Input
                                label="Phụ thu quá giờ (VNĐ/giờ) *"
                                type="number"
                                min={0}
                                step={1000}
                                value={overtimeHourlyVnd}
                                onChange={(e) =>
                                    setOvertimeHourlyVnd(
                                        e.target.value === "" ? "" : Number(e.target.value),
                                    )
                                }
                                required
                            />
                        </div>

                        {createError ? (
                            <InlineAlert type="error" message={createError} />
                        ) : null}
                        {createSuccess ? (
                            <InlineAlert type="success" message="Đã thêm gói câu thành công!" />
                        ) : null}

                        <div className="flex justify-end pt-1">
                            <Button
                                type="submit"
                                size="lg"
                                variant="primary"
                                isLoading={isCreating}
                                loadingText="Đang thêm…"
                            >
                                Tạo gói câu
                            </Button>
                        </div>
                    </form>
                </Card>
            )}

            {/* Packages List */}
            <Card className="p-5 sm:p-6 space-y-4">
                <div className="border-b border-[#E2DDD2] pb-3">
                    <h2 className="text-sm font-bold uppercase tracking-wider text-[#102A43]">
                        Danh sách Gói câu ({packages.length})
                    </h2>
                </div>

                {packages.length === 0 ? (
                    <p className="py-8 text-center text-xs text-slate-500 font-medium">
                        Chưa có gói câu nào được tạo.
                    </p>
                ) : (
                    <>
                        {/* Mobile Cards */}
                        <div className="grid grid-cols-1 gap-2.5 md:hidden">
                            {packages.map((pkg) => (
                                <div
                                    key={pkg.id}
                                    className="flex flex-col gap-2 rounded-xl border border-[#E2DDD2] bg-[#F8F6F0]/40 p-3.5"
                                >
                                    <div className="flex items-center justify-between">
                                        <span className="text-xs font-bold text-slate-900">
                                            {pkg.name}
                                        </span>
                                        <span className="text-xs font-extrabold text-[#0D9488] tabular-nums">
                                            {formatVnd(pkg.priceVnd)}
                                        </span>
                                    </div>
                                    <p className="text-[11px] text-slate-600 font-medium">
                                        Thời lượng: {formatDuration(pkg.durationMinutes)} • Quá giờ: {formatVnd(pkg.overtimeHourlyVnd)}/h
                                    </p>
                                    {canManage && (
                                        <div className="flex items-center justify-end gap-2 border-t border-[#E2DDD2] pt-2">
                                            <Button
                                                type="button"
                                                size="sm"
                                                variant="outline"
                                                onClick={() => openEditModal(pkg)}
                                            >
                                                Sửa
                                            </Button>
                                            <Button
                                                type="button"
                                                size="sm"
                                                variant="danger"
                                                onClick={() => handleDelete(pkg)}
                                            >
                                                Xóa
                                            </Button>
                                        </div>
                                    )}
                                </div>
                            ))}
                        </div>

                        {/* Desktop Table */}
                        <div className="hidden overflow-hidden rounded-xl border border-[#E2DDD2] bg-white md:block">
                            <table className="w-full text-left text-xs text-slate-600">
                                <thead className="border-b border-[#E2DDD2] bg-[#F8F6F0] text-[11px] font-bold uppercase tracking-wider text-slate-500">
                                    <tr>
                                        <th className="px-4 py-3.5">Tên gói</th>
                                        <th className="px-4 py-3.5">Thời lượng</th>
                                        <th className="px-4 py-3.5">Giá gói</th>
                                        <th className="px-4 py-3.5">Quá giờ</th>
                                        {canManage && <th className="px-4 py-3.5 text-right">Thao tác</th>}
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-[#E2DDD2]">
                                    {packages.map((pkg) => (
                                        <tr key={pkg.id} className="hover:bg-[#F8F6F0]/60 transition-colors">
                                            <td className="px-4 py-3.5 font-bold text-slate-900">
                                                {pkg.name}
                                            </td>
                                            <td className="px-4 py-3.5 font-medium">
                                                {formatDuration(pkg.durationMinutes)}
                                            </td>
                                            <td className="px-4 py-3.5 font-extrabold text-[#0D9488] tabular-nums">
                                                {formatVnd(pkg.priceVnd)}
                                            </td>
                                            <td className="px-4 py-3.5 text-slate-500 tabular-nums">
                                                {formatVnd(pkg.overtimeHourlyVnd)} / giờ
                                            </td>
                                            {canManage && (
                                                <td className="px-4 py-3.5 text-right">
                                                    <div className="flex items-center justify-end gap-2">
                                                        <Button
                                                            type="button"
                                                            size="sm"
                                                            variant="outline"
                                                            onClick={() => openEditModal(pkg)}
                                                        >
                                                            Sửa
                                                        </Button>
                                                        <Button
                                                            type="button"
                                                            size="sm"
                                                            variant="danger"
                                                            onClick={() => handleDelete(pkg)}
                                                        >
                                                            Xóa
                                                        </Button>
                                                    </div>
                                                </td>
                                            )}
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    </>
                )}
            </Card>

            {/* Edit Modal */}
            {editingPackage && (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
                    <div className="w-full max-w-md rounded-2xl bg-white p-6 shadow-xl space-y-4 animate-in fade-in zoom-in-95 duration-150">
                        <div className="flex items-center justify-between border-b border-[#E2DDD2] pb-3">
                            <h3 className="text-base font-bold text-[#102A43]">
                                Sửa gói câu
                            </h3>
                            <button
                                type="button"
                                onClick={closeEditModal}
                                className="text-slate-400 hover:text-slate-600"
                            >
                                ✕
                            </button>
                        </div>

                        <form onSubmit={handleEdit} className="space-y-3.5">
                            <Input
                                label="Tên gói câu *"
                                type="text"
                                value={editName}
                                onChange={(e) => setEditName(e.target.value)}
                                required
                            />
                            <Input
                                label="Thời lượng (Phút) *"
                                type="number"
                                min={15}
                                step={15}
                                value={editDurationMinutes}
                                onChange={(e) =>
                                    setEditDurationMinutes(
                                        e.target.value === "" ? "" : Number(e.target.value),
                                    )
                                }
                                required
                            />
                            <Input
                                label="Giá gói (VNĐ) *"
                                type="number"
                                min={0}
                                step={1000}
                                value={editPriceVnd}
                                onChange={(e) =>
                                    setEditPriceVnd(
                                        e.target.value === "" ? "" : Number(e.target.value),
                                    )
                                }
                                required
                            />
                            <Input
                                label="Phụ thu quá giờ (VNĐ/giờ) *"
                                type="number"
                                min={0}
                                step={1000}
                                value={editOvertimeHourlyVnd}
                                onChange={(e) =>
                                    setEditOvertimeHourlyVnd(
                                        e.target.value === "" ? "" : Number(e.target.value),
                                    )
                                }
                                required
                            />

                            {editError && (
                                <InlineAlert type="error" message={editError} />
                            )}

                            <div className="flex justify-end gap-2 pt-2">
                                <Button
                                    type="button"
                                    size="lg"
                                    variant="outline"
                                    onClick={closeEditModal}
                                    disabled={isEditing}
                                    className="flex-1"
                                >
                                    Hủy
                                </Button>
                                <Button
                                    type="submit"
                                    size="lg"
                                    variant="primary"
                                    isLoading={isEditing}
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
