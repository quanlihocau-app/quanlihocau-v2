"use client";

import { useRouter } from "next/navigation";
import { FormEvent, useState } from "react";

interface AreaOption {
    id: string;
    name: string;
}

export function CreateAreaForm() {
    const router = useRouter();
    const [name, setName] = useState("");
    const [error, setError] = useState("");
    const [success, setSuccess] = useState(false);
    const [isSubmitting, setIsSubmitting] = useState(false);

    async function handleSubmit(event: FormEvent<HTMLFormElement>) {
        event.preventDefault();
        setError("");
        setSuccess(false);
        setIsSubmitting(true);

        try {
            const response = await fetch("/api/areas", {
                method: "POST",
                headers: {
                    "Content-Type": "application/json",
                },
                body: JSON.stringify({ name }),
            });

            const result = (await response.json()) as { error?: string };

            if (!response.ok) {
                setError(result.error ?? "Không thể tạo khu vực.");
                setIsSubmitting(false);
                return;
            }

            setName("");
            setSuccess(true);
            router.refresh();
        } catch {
            setError("Đã có lỗi xảy ra. Vui lòng thử lại.");
        } finally {
            setIsSubmitting(false);
        }
    }

    return (
        <form
            onSubmit={handleSubmit}
            className="rounded-xl border border-slate-200 bg-white p-6 shadow-sm"
        >
            <h3 className="text-lg font-semibold text-slate-900">
                Thêm khu vực mới
            </h3>
            <p className="mt-1 text-xs text-slate-500">
                Ví dụ: Khu VIP, Khu A, Bờ Tây...
            </p>

            <div className="mt-4 space-y-4">
                <label className="block text-sm font-medium text-slate-700">
                    Tên khu vực
                    <input
                        type="text"
                        value={name}
                        onChange={(e) => setName(e.target.value)}
                        required
                        minLength={2}
                        maxLength={100}
                        placeholder="Nhập tên khu vực"
                        className="mt-1 w-full rounded-md border border-slate-300 px-3 py-2 text-sm focus:border-slate-500 focus:outline-none"
                    />
                </label>

                {error ? <p className="text-xs text-red-600">{error}</p> : null}
                {success ? (
                    <p className="text-xs text-green-600">
                        Đã thêm khu vực thành công!
                    </p>
                ) : null}

                <button
                    type="submit"
                    disabled={isSubmitting}
                    className="w-full rounded-md bg-slate-900 px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-slate-800 disabled:opacity-60"
                >
                    {isSubmitting ? "Đang thêm..." : "Tạo khu vực"}
                </button>
            </div>
        </form>
    );
}

export function CreateHutForm({ areas }: { areas: AreaOption[] }) {
    const router = useRouter();
    const [name, setName] = useState("");
    const [areaId, setAreaId] = useState("");
    const [error, setError] = useState("");
    const [success, setSuccess] = useState(false);
    const [isSubmitting, setIsSubmitting] = useState(false);

    async function handleSubmit(event: FormEvent<HTMLFormElement>) {
        event.preventDefault();
        setError("");
        setSuccess(false);
        setIsSubmitting(true);

        try {
            const response = await fetch("/api/huts", {
                method: "POST",
                headers: {
                    "Content-Type": "application/json",
                },
                body: JSON.stringify({ name, areaId }),
            });

            const result = (await response.json()) as { error?: string };

            if (!response.ok) {
                setError(result.error ?? "Không thể tạo chòi.");
                setIsSubmitting(false);
                return;
            }

            setName("");
            setSuccess(true);
            router.refresh();
        } catch {
            setError("Đã có lỗi xảy ra. Vui lòng thử lại.");
        } finally {
            setIsSubmitting(false);
        }
    }

    if (areas.length === 0) {
        return (
            <div className="rounded-xl border border-slate-200 bg-white p-6 shadow-sm">
                <h3 className="text-lg font-semibold text-slate-900">
                    Thêm chòi câu mới
                </h3>
                <p className="mt-2 text-sm text-slate-500">
                    Bạn cần tạo ít nhất một khu vực trước khi thêm chòi.
                </p>
            </div>
        );
    }

    return (
        <form
            onSubmit={handleSubmit}
            className="rounded-xl border border-slate-200 bg-white p-6 shadow-sm"
        >
            <h3 className="text-lg font-semibold text-slate-900">
                Thêm chòi câu mới
            </h3>
            <p className="mt-1 text-xs text-slate-500">
                Ví dụ: Chòi 01, Chòi VIP 1...
            </p>

            <div className="mt-4 space-y-4">
                <label className="block text-sm font-medium text-slate-700">
                    Khu vực
                    <select
                        value={areaId}
                        onChange={(e) => setAreaId(e.target.value)}
                        required
                        className="mt-1 w-full rounded-md border border-slate-300 px-3 py-2 text-sm focus:border-slate-500 focus:outline-none"
                    >
                        <option value="">-- Chọn khu vực --</option>
                        {areas.map((area) => (
                            <option key={area.id} value={area.id}>
                                {area.name}
                            </option>
                        ))}
                    </select>
                </label>

                <label className="block text-sm font-medium text-slate-700">
                    Tên chòi
                    <input
                        type="text"
                        value={name}
                        onChange={(e) => setName(e.target.value)}
                        required
                        minLength={2}
                        maxLength={100}
                        placeholder="Nhập tên chòi câu"
                        className="mt-1 w-full rounded-md border border-slate-300 px-3 py-2 text-sm focus:border-slate-500 focus:outline-none"
                    />
                </label>

                {error ? <p className="text-xs text-red-600">{error}</p> : null}
                {success ? (
                    <p className="text-xs text-green-600">
                        Đã thêm chòi thành công!
                    </p>
                ) : null}

                <button
                    type="submit"
                    disabled={isSubmitting}
                    className="w-full rounded-md bg-slate-900 px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-slate-800 disabled:opacity-60"
                >
                    {isSubmitting ? "Đang thêm..." : "Tạo chòi"}
                </button>
            </div>
        </form>
    );
}
