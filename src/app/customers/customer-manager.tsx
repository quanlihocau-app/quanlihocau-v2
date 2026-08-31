"use client";

import { useRouter } from "next/navigation";
import { FormEvent, useCallback, useRef, useState } from "react";

import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { InlineAlert } from "@/components/ui/inline-alert";

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
    const requestVersionRef = useRef(0);

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

    // Derive displayed list
    const displayedCustomers =
        searchTerm.trim() && searchResults !== null
            ? searchResults
            : initialCustomers;

    const performSearch = useCallback(
        (query: string, version: number) => {
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
                    if (version !== requestVersionRef.current) return;
                    setSearchResults(data);
                    setIsSearching(false);
                })
                .catch((err: unknown) => {
                    if (err instanceof Error && err.name === "AbortError") {
                        return;
                    }
                    if (version !== requestVersionRef.current) return;
                    setSearchError(
                        err instanceof Error
                            ? err.message
                            : "Lỗi tìm kiếm khách hàng.",
                    );
                    setIsSearching(false);
                });
        },
        [],
    );

    function handleSearchChange(val: string) {
        setSearchTerm(val);

        if (debounceTimerRef.current) {
            clearTimeout(debounceTimerRef.current);
        }
        if (abortControllerRef.current) {
            abortControllerRef.current.abort();
        }

        const newVersion = ++requestVersionRef.current;

        debounceTimerRef.current = setTimeout(() => {
            performSearch(val, newVersion);
        }, 300);
    }

    async function handleCreate(e: FormEvent) {
        e.preventDefault();
        setCreateError("");
        setCreateSuccess(false);

        if (!name.trim()) {
            setCreateError("Vui lòng nhập họ và tên khách hàng.");
            return;
        }

        setIsCreating(true);

        try {
            const res = await fetch("/api/customers", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    name: name.trim(),
                    phone: phone.trim() || undefined,
                }),
            });

            const data = (await res.json()) as {
                id?: string;
                error?: string;
            };

            if (!res.ok) {
                setCreateError(data.error ?? "Không thể tạo khách hàng.");
                setIsCreating(false);
                return;
            }

            setName("");
            setPhone("");
            setCreateSuccess(true);
            setTimeout(() => setCreateSuccess(false), 3000);
            router.refresh();
        } catch {
            setCreateError("Lỗi kết nối khi tạo khách hàng.");
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
        setEditName("");
        setEditPhone("");
        setEditError("");
    }

    async function handleEdit(e: FormEvent) {
        e.preventDefault();
        if (!editingCustomer) return;

        setEditError("");

        if (!editName.trim()) {
            setEditError("Vui lòng nhập họ và tên.");
            return;
        }

        setIsEditing(true);

        try {
            const res = await fetch(`/api/customers/${editingCustomer.id}`, {
                method: "PATCH",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    name: editName.trim(),
                    phone: editPhone.trim() || undefined,
                }),
            });

            const data = (await res.json()) as { error?: string };

            if (!res.ok) {
                setEditError(data.error ?? "Không thể cập nhật khách hàng.");
                setIsEditing(false);
                return;
            }

            closeEditModal();
            setActionMessage("Đã cập nhật thông tin khách hàng.");
            setTimeout(() => setActionMessage(""), 3000);
            router.refresh();
        } catch {
            setEditError("Lỗi kết nối khi sửa khách hàng.");
        } finally {
            setIsEditing(false);
        }
    }

    async function handleDelete(customerId: string, customerName: string) {
        if (
            !window.confirm(
                `Bạn có chắc chắn muốn vô hiệu hóa khách hàng "${customerName}" không?`,
            )
        ) {
            return;
        }

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
        <div className="space-y-6">
            {actionMessage ? (
                <InlineAlert type="success" message={actionMessage} />
            ) : null}

            {/* Create Customer Form */}
            <Card className="p-5 sm:p-6 space-y-4">
                <div>
                    <h2 className="text-sm font-bold uppercase tracking-wider text-[#102A43]">
                        Thêm khách hàng mới
                    </h2>
                    <p className="mt-0.5 text-xs text-slate-500 font-medium">
                        Nhập tên và số điện thoại di động của khách hàng câu cá.
                    </p>
                </div>

                <form onSubmit={handleCreate} className="space-y-4">
                    <div className="grid gap-3 sm:grid-cols-2">
                        <Input
                            label="Họ và tên khách hàng *"
                            type="text"
                            value={name}
                            onChange={(e) => setName(e.target.value)}
                            required
                            minLength={2}
                            maxLength={100}
                            placeholder="VD: Nguyễn Văn A"
                        />
                        <Input
                            label="Số điện thoại (tùy chọn)"
                            type="text"
                            value={phone}
                            onChange={(e) => setPhone(e.target.value)}
                            placeholder="VD: 0901234567"
                        />
                    </div>

                    {createError ? (
                        <InlineAlert type="error" message={createError} />
                    ) : null}
                    {createSuccess ? (
                        <InlineAlert type="success" message="Đã thêm khách hàng thành công!" />
                    ) : null}

                    <div className="flex justify-end pt-1">
                        <Button
                            type="submit"
                            size="lg"
                            variant="primary"
                            isLoading={isCreating}
                            loadingText="Đang thêm…"
                        >
                            Tạo khách hàng
                        </Button>
                    </div>
                </form>
            </Card>

            {/* List & Server Search */}
            <Card className="p-5 sm:p-6 space-y-4">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-[#E2DDD2] pb-4">
                    <div>
                        <h2 className="text-sm font-bold uppercase tracking-wider text-[#102A43]">
                            Danh sách Khách hàng ({displayedCustomers.length})
                            {isSearching ? (
                                <span className="ml-2 text-xs font-normal text-slate-400">
                                    Đang tìm kiếm...
                                </span>
                            ) : null}
                        </h2>
                    </div>

                    <div className="w-full sm:w-72">
                        <Input
                            placeholder="Tìm theo tên hoặc số điện thoại..."
                            value={searchTerm}
                            onChange={(e) => handleSearchChange(e.target.value)}
                        />
                    </div>
                </div>

                {searchError ? (
                    <InlineAlert type="error" message={searchError} />
                ) : null}

                {displayedCustomers.length === 0 && !isSearching ? (
                    <p className="py-8 text-center text-xs text-slate-500 font-medium">
                        {searchTerm
                            ? "Không tìm thấy khách hàng nào khớp với tìm kiếm."
                            : "Chưa có khách hàng nào được ghi nhận."}
                    </p>
                ) : (
                    <>
                        {/* Mobile view: cards */}
                        <div className="grid grid-cols-1 gap-2.5 md:hidden">
                            {displayedCustomers.map((customer) => (
                                <div
                                    key={customer.id}
                                    className="flex items-center justify-between rounded-xl border border-[#E2DDD2] bg-[#F8F6F0]/40 p-3.5"
                                >
                                    <div>
                                        <p className="text-xs font-bold text-slate-900">
                                            {customer.name}
                                        </p>
                                        <p className="text-[11px] text-slate-500 font-mono mt-0.5">
                                            {customer.phoneNormalized || "Chưa có số"}
                                        </p>
                                    </div>
                                    <div className="flex items-center gap-1.5">
                                        <Button
                                            type="button"
                                            size="sm"
                                            variant="outline"
                                            onClick={() => openEditModal(customer)}
                                        >
                                            Sửa
                                        </Button>
                                        {canDelete && (
                                            <Button
                                                type="button"
                                                size="sm"
                                                variant="danger"
                                                onClick={() =>
                                                    handleDelete(
                                                        customer.id,
                                                        customer.name,
                                                    )
                                                }
                                            >
                                                Vô hiệu
                                            </Button>
                                        )}
                                    </div>
                                </div>
                            ))}
                        </div>

                        {/* Desktop view: table */}
                        <div className="hidden overflow-hidden rounded-xl border border-[#E2DDD2] bg-white md:block">
                            <table className="w-full text-left text-xs text-slate-600">
                                <thead className="border-b border-[#E2DDD2] bg-[#F8F6F0] text-[11px] font-bold uppercase tracking-wider text-slate-500">
                                    <tr>
                                        <th className="px-4 py-3.5">Họ và tên</th>
                                        <th className="px-4 py-3.5">Số điện thoại (E.164)</th>
                                        <th className="px-4 py-3.5 text-right">Thao tác</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-[#E2DDD2]">
                                    {displayedCustomers.map((customer) => (
                                        <tr
                                            key={customer.id}
                                            className="hover:bg-[#F8F6F0]/60 transition-colors"
                                        >
                                            <td className="px-4 py-3.5 font-bold text-slate-900">
                                                {customer.name}
                                            </td>
                                            <td className="px-4 py-3.5 text-slate-600 font-mono">
                                                {customer.phoneNormalized ? (
                                                    <span>{customer.phoneNormalized}</span>
                                                ) : (
                                                    <span className="italic text-slate-400">
                                                        Chưa có số
                                                    </span>
                                                )}
                                            </td>
                                            <td className="px-4 py-3.5 text-right">
                                                <div className="flex items-center justify-end gap-2">
                                                    <Button
                                                        type="button"
                                                        size="sm"
                                                        variant="outline"
                                                        onClick={() =>
                                                            openEditModal(customer)
                                                        }
                                                    >
                                                        Sửa
                                                    </Button>
                                                    {canDelete ? (
                                                        <Button
                                                            type="button"
                                                            size="sm"
                                                            variant="danger"
                                                            onClick={() =>
                                                                handleDelete(
                                                                    customer.id,
                                                                    customer.name,
                                                                )
                                                            }
                                                        >
                                                            Vô hiệu hóa
                                                        </Button>
                                                    ) : null}
                                                </div>
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    </>
                )}
            </Card>

            {/* Edit Modal */}
            {editingCustomer ? (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
                    <div className="w-full max-w-md rounded-2xl bg-white p-6 shadow-xl space-y-4 animate-in fade-in zoom-in-95 duration-150">
                        <div className="flex items-center justify-between border-b border-[#E2DDD2] pb-3">
                            <h3 className="text-base font-bold text-[#102A43]">
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

                        <form onSubmit={handleEdit} className="space-y-4">
                            <Input
                                label="Họ và tên khách hàng *"
                                type="text"
                                value={editName}
                                onChange={(e) => setEditName(e.target.value)}
                                required
                                minLength={2}
                                maxLength={100}
                            />
                            <Input
                                label="Số điện thoại"
                                type="text"
                                value={editPhone}
                                onChange={(e) => setEditPhone(e.target.value)}
                                placeholder="VD: 0901234567"
                            />

                            {editError ? (
                                <InlineAlert type="error" message={editError} />
                            ) : null}

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
            ) : null}
        </div>
    );
}
