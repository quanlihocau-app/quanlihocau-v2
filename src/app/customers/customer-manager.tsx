"use client";

import { useRouter } from "next/navigation";
import { FormEvent, useCallback, useRef, useState } from "react";

export interface CustomerItem {
    id: string;
    name: string;
    phoneNormalized: string | null;
    createdAt: Date | string;
}

interface CustomerManagerProps {
    initialCustomers: CustomerItem[];
    canDelete: boolean;
}

export function CustomerManager({
    initialCustomers,
    canDelete,
}: CustomerManagerProps) {
    const router = useRouter();

    // Search state (server-side)
    const [searchTerm, setSearchTerm] = useState("");
    const [searchResults, setSearchResults] = useState<CustomerItem[] | null>(null);
    const [isSearching, setIsSearching] = useState(false);
    const [searchError, setSearchError] = useState("");
    const abortControllerRef = useRef<AbortController | null>(null);
    const debounceTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

    // Create state
    const [name, setName] = useState("");
    const [phone, setPhone] = useState("");
    const [isCreating, setIsCreating] = useState(false);
    const [createError, setCreateError] = useState("");
    const [createSuccess, setCreateSuccess] = useState(false);

    // Edit modal state
    const [editingCustomer, setEditingCustomer] = useState<CustomerItem | null>(
        null,
    );
    const [editName, setEditName] = useState("");
    const [editPhone, setEditPhone] = useState("");
    const [isEditing, setIsEditing] = useState(false);
    const [editError, setEditError] = useState("");

    // Action notification
    const [actionMessage, setActionMessage] = useState("");

    // Derive displayed list: use search results when active, else initialCustomers
    const displayedCustomers =
        searchTerm.trim() && searchResults !== null
            ? searchResults
            : initialCustomers;

    const performSearch = useCallback(
        (query: string) => {
            // Cancel any pending request
            if (abortControllerRef.current) {
                abortControllerRef.current.abort();
            }

            if (!query.trim()) {
                setSearchResults(null);
                setIsSearching(false);
                setSearchError("");
                return;
            }

            const controller = new AbortController();
            abortControllerRef.current = controller;
            setIsSearching(true);
            setSearchError("");

            fetch(
                `/api/customers?q=${encodeURIComponent(query.trim())}`,
                { signal: controller.signal },
            )
                .then((res) => {
                    if (!res.ok) {
                        return res
                            .json()
                            .then((data: { error?: string }) => {
                                throw new Error(
                                    data.error ?? "Không thể tìm kiếm khách hàng.",
                                );
                            });
                    }
                    return res.json() as Promise<CustomerItem[]>;
                })
                .then((data) => {
                    setSearchResults(data);
                    setIsSearching(false);
                })
                .catch((err: unknown) => {
                    if (err instanceof Error && err.name === "AbortError") {
                        // Request was intentionally cancelled; do nothing
                        return;
                    }
                    const message =
                        err instanceof Error
                            ? err.message
                            : "Đã xảy ra lỗi khi tìm kiếm.";
                    setSearchError(message);
                    setIsSearching(false);
                });
        },
        [],
    );

    function handleSearchChange(value: string) {
        setSearchTerm(value);

        // Clear the previous debounce timer
        if (debounceTimerRef.current) {
            clearTimeout(debounceTimerRef.current);
        }

        debounceTimerRef.current = setTimeout(() => {
            performSearch(value);
        }, 300);
    }

    async function handleCreate(event: FormEvent<HTMLFormElement>) {
        event.preventDefault();
        setCreateError("");
        setCreateSuccess(false);
        setIsCreating(true);

        try {
            const response = await fetch("/api/customers", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    name,
                    phone: phone.trim() ? phone.trim() : null,
                }),
            });

            const result = (await response.json()) as { error?: string };

            if (!response.ok) {
                setCreateError(result.error ?? "Không thể thêm khách hàng.");
                setIsCreating(false);
                return;
            }

            setName("");
            setPhone("");
            setCreateSuccess(true);
            router.refresh();
        } catch {
            setCreateError("Đã có lỗi xảy ra khi tạo khách hàng.");
        } finally {
            setIsCreating(false);
        }
    }

    function openEditModal(customer: CustomerItem) {
        setEditingCustomer(customer);
        setEditName(customer.name);
        setEditPhone(customer.phoneNormalized ?? "");
        setEditError("");
    }

    function closeEditModal() {
        setEditingCustomer(null);
        setEditError("");
    }

    async function handleEdit(event: FormEvent<HTMLFormElement>) {
        event.preventDefault();
        if (!editingCustomer) return;

        setEditError("");
        setIsEditing(true);

        try {
            const response = await fetch(`/api/customers/${editingCustomer.id}`, {
                method: "PATCH",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    name: editName,
                    phone: editPhone.trim() ? editPhone.trim() : null,
                }),
            });

            const result = (await response.json()) as { error?: string };

            if (!response.ok) {
                setEditError(result.error ?? "Không thể cập nhật khách hàng.");
                setIsEditing(false);
                return;
            }

            closeEditModal();
            setActionMessage("Đã cập nhật thông tin khách hàng thành công!");
            setTimeout(() => setActionMessage(""), 4000);
            router.refresh();
        } catch {
            setEditError("Đã có lỗi xảy ra khi cập nhật khách hàng.");
        } finally {
            setIsEditing(false);
        }
    }

    async function handleDelete(customerId: string, customerName: string) {
        const confirmDelete = window.confirm(
            `Bạn có chắc chắn muốn vô hiệu hóa khách hàng "${customerName}"?`,
        );
        if (!confirmDelete) return;

        try {
            const response = await fetch(`/api/customers/${customerId}`, {
                method: "DELETE",
            });

            const result = (await response.json()) as {
                error?: string;
                message?: string;
            };

            if (!response.ok) {
                alert(result.error ?? "Không thể vô hiệu hóa khách hàng.");
                return;
            }

            setActionMessage(result.message ?? "Đã vô hiệu hóa khách hàng.");
            setTimeout(() => setActionMessage(""), 4000);
            router.refresh();
        } catch {
            alert("Đã có lỗi xảy ra khi vô hiệu hóa khách hàng.");
        }
    }

    return (
        <div className="space-y-8">
            {actionMessage ? (
                <div className="rounded-lg border border-green-200 bg-green-50 p-4 text-sm text-green-800">
                    {actionMessage}
                </div>
            ) : null}

            {/* Create Customer Form (Accessible by OWNER, MANAGER, and STAFF) */}
            <form
                onSubmit={handleCreate}
                className="rounded-xl border border-slate-200 bg-white p-6 shadow-sm"
            >
                <h2 className="text-lg font-semibold text-slate-900">
                    Thêm khách hàng mới
                </h2>
                <p className="mt-1 text-xs text-slate-500">
                    Nhập tên và số điện thoại di động của khách hàng câu cá.
                </p>

                <div className="mt-4 grid gap-4 sm:grid-cols-2">
                    <div>
                        <label className="block text-sm font-medium text-slate-700">
                            Họ và tên khách hàng *
                            <input
                                type="text"
                                value={name}
                                onChange={(e) => setName(e.target.value)}
                                required
                                minLength={2}
                                maxLength={100}
                                placeholder="VD: Nguyễn Văn A"
                                className="mt-1 w-full rounded-md border border-slate-300 px-3 py-2 text-sm focus:border-slate-500 focus:outline-none"
                            />
                        </label>
                    </div>

                    <div>
                        <label className="block text-sm font-medium text-slate-700">
                            Số điện thoại (tùy chọn)
                            <input
                                type="text"
                                value={phone}
                                onChange={(e) => setPhone(e.target.value)}
                                placeholder="VD: 0901234567 hoặc +84901234567"
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
                        Đã thêm khách hàng thành công!
                    </p>
                ) : null}

                <div className="mt-4 flex justify-end">
                    <button
                        type="submit"
                        disabled={isCreating}
                        className="rounded-md bg-slate-900 px-5 py-2 text-sm font-medium text-white transition-colors hover:bg-slate-800 disabled:opacity-60"
                    >
                        {isCreating ? "Đang thêm..." : "Tạo khách hàng"}
                    </button>
                </div>
            </form>

            {/* List & Server Search */}
            <div className="rounded-xl border border-slate-200 bg-white p-6 shadow-sm">
                <div className="flex flex-wrap items-center justify-between gap-4 border-b border-slate-100 pb-4">
                    <h2 className="text-lg font-semibold text-slate-900">
                        Danh sách Khách hàng ({displayedCustomers.length})
                        {isSearching ? (
                            <span className="ml-2 text-xs font-normal text-slate-400">
                                Đang tìm kiếm...
                            </span>
                        ) : null}
                    </h2>

                    <div className="w-full sm:w-72">
                        <input
                            type="text"
                            value={searchTerm}
                            onChange={(e) => handleSearchChange(e.target.value)}
                            placeholder="Tìm theo tên hoặc số điện thoại..."
                            className="w-full rounded-md border border-slate-300 px-3 py-1.5 text-sm focus:border-slate-500 focus:outline-none"
                        />
                    </div>
                </div>

                {searchError ? (
                    <p className="mt-4 text-sm text-red-600">{searchError}</p>
                ) : null}

                {displayedCustomers.length === 0 && !isSearching ? (
                    <p className="mt-6 text-center text-sm text-slate-500">
                        {searchTerm
                            ? "Không tìm thấy khách hàng nào khớp với tìm kiếm."
                            : "Chưa có khách hàng nào được ghi nhận."}
                    </p>
                ) : (
                    <div className="mt-4 overflow-x-auto">
                        <table className="w-full text-left text-sm">
                            <thead className="border-b border-slate-200 bg-slate-50 text-xs font-semibold uppercase text-slate-600">
                                <tr>
                                    <th className="px-4 py-3">Họ và tên</th>
                                    <th className="px-4 py-3">Số điện thoại (E.164)</th>
                                    <th className="px-4 py-3 text-right">Thao tác</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-slate-100">
                                {displayedCustomers.map((customer) => (
                                    <tr
                                        key={customer.id}
                                        className="hover:bg-slate-50"
                                    >
                                        <td className="px-4 py-3 font-medium text-slate-900">
                                            {customer.name}
                                        </td>
                                        <td className="px-4 py-3 text-slate-600">
                                            {customer.phoneNormalized ? (
                                                <span className="font-mono text-xs">
                                                    {customer.phoneNormalized}
                                                </span>
                                            ) : (
                                                <span className="text-xs italic text-slate-400">
                                                    Chưa có số
                                                </span>
                                            )}
                                        </td>
                                        <td className="px-4 py-3 text-right">
                                            <div className="flex items-center justify-end gap-2">
                                                <button
                                                    type="button"
                                                    onClick={() =>
                                                        openEditModal(customer)
                                                    }
                                                    className="rounded px-2.5 py-1 text-xs font-medium text-slate-700 hover:bg-slate-200"
                                                >
                                                    Sửa
                                                </button>
                                                {canDelete ? (
                                                    <button
                                                        type="button"
                                                        onClick={() =>
                                                            handleDelete(
                                                                customer.id,
                                                                customer.name,
                                                            )
                                                        }
                                                        className="rounded px-2.5 py-1 text-xs font-medium text-red-600 hover:bg-red-50"
                                                    >
                                                        Vô hiệu hóa
                                                    </button>
                                                ) : null}
                                            </div>
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                )}
            </div>

            {/* Edit Modal */}
            {editingCustomer ? (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 p-4">
                    <div className="w-full max-w-md rounded-xl bg-white p-6 shadow-xl">
                        <div className="flex items-center justify-between border-b border-slate-100 pb-3">
                            <h3 className="text-lg font-semibold text-slate-900">
                                Sửa thông tin khách hàng
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
                                    Họ và tên khách hàng *
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
                                    Số điện thoại
                                    <input
                                        type="text"
                                        value={editPhone}
                                        onChange={(e) =>
                                            setEditPhone(e.target.value)
                                        }
                                        placeholder="Để trống nếu muốn xóa số"
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
