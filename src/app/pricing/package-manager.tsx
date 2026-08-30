"use client";

import { useRouter } from "next/navigation";
import { FormEvent, useState } from "react";

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
    return new Intl.NumberFormat("vi-VN", {
        style: "currency",
        currency: "VND",
    }).format(amount);
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
            setActionMessage("Đã cập nhật gói câu thành công!");
            setTimeout(() => setActionMessage(""), 4000);
            router.refresh();
        } catch {
            setEditError("Đã xảy ra lỗi khi cập nhật gói câu.");
        } finally {
            setIsEditing(false);
        }
    }

    async function handleDelete(packageId: string, packageName: string) {
        const confirmDelete = window.confirm(
            `Bạn có chắc chắn muốn vô hiệu hóa gói câu "${packageName}"?`,
        );
        if (!confirmDelete) return;

        try {
            const response = await fetch(`/api/packages/${packageId}`, {
                method: "DELETE",
            });

            const result = (await response.json()) as { error?: string; message?: string };

            if (!response.ok) {
                alert(result.error ?? "Không thể vô hiệu hóa gói câu.");
                return;
            }

            setActionMessage(result.message ?? "Đã vô hiệu hóa gói câu.");
            setTimeout(() => setActionMessage(""), 4000);
            router.refresh();
        } catch {
            alert("Đã xảy ra lỗi khi vô hiệu hóa gói câu.");
        }
    }

    return (
        <div className="space-y-8">
            {actionMessage ? (
                <div className="rounded-lg border border-green-200 bg-green-50 p-4 text-sm text-green-800">
                    {actionMessage}
                </div>
            ) : null}

            {canManage ? (
                <form
                    onSubmit={handleCreate}
                    className="rounded-xl border border-slate-200 bg-white p-6 shadow-sm"
                >
                    <h2 className="text-lg font-semibold text-slate-900">
                        Thêm gói câu mới
                    </h2>
                    <p className="mt-1 text-xs text-slate-500">
                        Cấu hình tên gói câu, thời lượng và đơn giá quy định.
                    </p>

                    <div className="mt-4 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
                        <div>
                            <label className="block text-sm font-medium text-slate-700">
                                Tên gói câu
                                <input
                                    type="text"
                                    value={name}
                                    onChange={(e) => setName(e.target.value)}
                                    required
                                    minLength={2}
                                    maxLength={100}
                                    placeholder="VD: Gói 4 giờ, Gói câu đêm..."
                                    className="mt-1 w-full rounded-md border border-slate-300 px-3 py-2 text-sm focus:border-slate-500 focus:outline-none"
                                />
                            </label>
                        </div>

                        <div>
                            <label className="block text-sm font-medium text-slate-700">
                                Thời lượng (phút)
                                <input
                                    type="number"
                                    value={durationMinutes}
                                    onChange={(e) =>
                                        setDurationMinutes(
                                            e.target.value === "" ? "" : Number(e.target.value),
                                        )
                                    }
                                    required
                                    min={15}
                                    max={1440}
                                    step={15}
                                    className="mt-1 w-full rounded-md border border-slate-300 px-3 py-2 text-sm focus:border-slate-500 focus:outline-none"
                                />
                            </label>
                        </div>

                        <div>
                            <label className="block text-sm font-medium text-slate-700">
                                Giá gói (VNĐ)
                                <input
                                    type="number"
                                    value={priceVnd}
                                    onChange={(e) =>
                                        setPriceVnd(
                                            e.target.value === "" ? "" : Number(e.target.value),
                                        )
                                    }
                                    required
                                    min={0}
                                    step={1000}
                                    className="mt-1 w-full rounded-md border border-slate-300 px-3 py-2 text-sm focus:border-slate-500 focus:outline-none"
                                />
                            </label>
                        </div>

                        <div>
                            <label className="block text-sm font-medium text-slate-700">
                                Giá quá giờ (VNĐ/giờ)
                                <input
                                    type="number"
                                    value={overtimeHourlyVnd}
                                    onChange={(e) =>
                                        setOvertimeHourlyVnd(
                                            e.target.value === "" ? "" : Number(e.target.value),
                                        )
                                    }
                                    required
                                    min={0}
                                    step={1000}
                                    className="mt-1 w-full rounded-md border border-slate-300 px-3 py-2 text-sm focus:border-slate-500 focus:outline-none"
                                />
                            </label>
                        </div>
                    </div>

                    {createError ? (
                        <p className="mt-3 text-xs text-red-600">{createError}</p>
                    ) : null}
                    {createSuccess ? (
                        <p className="mt-3 text-xs text-green-600">
                            Đã thêm gói câu thành công!
                        </p>
                    ) : null}

                    <div className="mt-4 flex justify-end">
                        <button
                            type="submit"
                            disabled={isCreating}
                            className="rounded-md bg-slate-900 px-5 py-2 text-sm font-medium text-white transition-colors hover:bg-slate-800 disabled:opacity-60"
                        >
                            {isCreating ? "Đang thêm..." : "Tạo gói câu"}
                        </button>
                    </div>
                </form>
            ) : null}

            {/* List of packages */}
            <div className="rounded-xl border border-slate-200 bg-white p-6 shadow-sm">
                <div className="border-b border-slate-100 pb-4">
                    <h2 className="text-lg font-semibold text-slate-900">
                        Danh sách Gói câu ({packages.length})
                    </h2>
                </div>

                {packages.length === 0 ? (
                    <p className="mt-6 text-center text-sm text-slate-500">
                        Chưa có gói câu nào được cấu hình cho hồ câu này.
                    </p>
                ) : (
                    <div className="mt-4 overflow-x-auto">
                        <table className="w-full text-left text-sm">
                            <thead className="border-b border-slate-200 bg-slate-50 text-xs font-semibold uppercase text-slate-600">
                                <tr>
                                    <th className="px-4 py-3">Tên gói</th>
                                    <th className="px-4 py-3">Thời lượng</th>
                                    <th className="px-4 py-3">Giá gói</th>
                                    <th className="px-4 py-3">Giá quá giờ</th>
                                    {canManage ? (
                                        <th className="px-4 py-3 text-right">
                                            Thao tác
                                        </th>
                                    ) : null}
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-slate-100">
                                {packages.map((pkg) => (
                                    <tr key={pkg.id} className="hover:bg-slate-50">
                                        <td className="px-4 py-3 font-medium text-slate-900">
                                            {pkg.name}
                                        </td>
                                        <td className="px-4 py-3 text-slate-600">
                                            {formatDuration(pkg.durationMinutes)}
                                        </td>
                                        <td className="px-4 py-3 font-medium text-slate-900">
                                            {formatVnd(pkg.priceVnd)}
                                        </td>
                                        <td className="px-4 py-3 text-slate-600">
                                            {formatVnd(pkg.overtimeHourlyVnd)}/giờ
                                        </td>
                                        {canManage ? (
                                            <td className="px-4 py-3 text-right">
                                                <div className="flex items-center justify-end gap-2">
                                                    <button
                                                        type="button"
                                                        onClick={() =>
                                                            openEditModal(pkg)
                                                        }
                                                        className="rounded px-2.5 py-1 text-xs font-medium text-slate-700 hover:bg-slate-200"
                                                    >
                                                        Sửa
                                                    </button>
                                                    <button
                                                        type="button"
                                                        onClick={() =>
                                                            handleDelete(
                                                                pkg.id,
                                                                pkg.name,
                                                            )
                                                        }
                                                        className="rounded px-2.5 py-1 text-xs font-medium text-red-600 hover:bg-red-50"
                                                    >
                                                        Vô hiệu hóa
                                                    </button>
                                                </div>
                                            </td>
                                        ) : null}
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                )}
            </div>

            {/* Edit Modal */}
            {editingPackage ? (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 p-4">
                    <div className="w-full max-w-md rounded-xl bg-white p-6 shadow-xl">
                        <div className="flex items-center justify-between border-b border-slate-100 pb-3">
                            <h3 className="text-lg font-semibold text-slate-900">
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

                        <form onSubmit={handleEdit} className="mt-4 space-y-4">
                            <div>
                                <label className="block text-sm font-medium text-slate-700">
                                    Tên gói câu
                                    <input
                                        type="text"
                                        value={editName}
                                        onChange={(e) =>
                                            setEditName(e.target.value)
                                        }
                                        required
                                        minLength={2}
                                        maxLength={100}
                                        className="mt-1 w-full rounded-md border border-slate-300 px-3 py-2 text-sm focus:border-slate-500 focus:outline-none"
                                    />
                                </label>
                            </div>

                            <div>
                                <label className="block text-sm font-medium text-slate-700">
                                    Thời lượng (phút)
                                    <input
                                        type="number"
                                        value={editDurationMinutes}
                                        onChange={(e) =>
                                            setEditDurationMinutes(
                                                e.target.value === ""
                                                    ? ""
                                                    : Number(e.target.value),
                                            )
                                        }
                                        required
                                        min={15}
                                        max={1440}
                                        step={15}
                                        className="mt-1 w-full rounded-md border border-slate-300 px-3 py-2 text-sm focus:border-slate-500 focus:outline-none"
                                    />
                                </label>
                            </div>

                            <div>
                                <label className="block text-sm font-medium text-slate-700">
                                    Giá gói (VNĐ)
                                    <input
                                        type="number"
                                        value={editPriceVnd}
                                        onChange={(e) =>
                                            setEditPriceVnd(
                                                e.target.value === ""
                                                    ? ""
                                                    : Number(e.target.value),
                                            )
                                        }
                                        required
                                        min={0}
                                        step={1000}
                                        className="mt-1 w-full rounded-md border border-slate-300 px-3 py-2 text-sm focus:border-slate-500 focus:outline-none"
                                    />
                                </label>
                            </div>

                            <div>
                                <label className="block text-sm font-medium text-slate-700">
                                    Giá quá giờ (VNĐ/giờ)
                                    <input
                                        type="number"
                                        value={editOvertimeHourlyVnd}
                                        onChange={(e) =>
                                            setEditOvertimeHourlyVnd(
                                                e.target.value === ""
                                                    ? ""
                                                    : Number(e.target.value),
                                            )
                                        }
                                        required
                                        min={0}
                                        step={1000}
                                        className="mt-1 w-full rounded-md border border-slate-300 px-3 py-2 text-sm focus:border-slate-500 focus:outline-none"
                                    />
                                </label>
                            </div>

                            {editError ? (
                                <p className="text-xs text-red-600">{editError}</p>
                            ) : null}

                            <div className="flex justify-end gap-3 pt-2">
                                <button
                                    type="button"
                                    onClick={closeEditModal}
                                    className="rounded-md border border-slate-300 px-4 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50"
                                >
                                    Hủy
                                </button>
                                <button
                                    type="submit"
                                    disabled={isEditing}
                                    className="rounded-md bg-slate-900 px-4 py-2 text-sm font-medium text-white hover:bg-slate-800 disabled:opacity-60"
                                >
                                    {isEditing ? "Đang lưu..." : "Lưu thay đổi"}
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            ) : null}
        </div>
    );
}
