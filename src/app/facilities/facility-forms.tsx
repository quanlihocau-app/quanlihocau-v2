"use client";

import { useRouter } from "next/navigation";
import { FormEvent, useState } from "react";

import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input, Select } from "@/components/ui/input";
import { InlineAlert } from "@/components/ui/inline-alert";

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
        <Card className="p-5 sm:p-6 space-y-4">
            <div>
                <h3 className="text-sm font-bold uppercase tracking-wider text-[#102A43]">
                    Thêm khu vực mới
                </h3>
                <p className="mt-0.5 text-xs text-slate-500 font-medium">
                    Ví dụ: Khu VIP, Khu A, Bờ Tây...
                </p>
            </div>

            <form onSubmit={handleSubmit} className="space-y-4">
                <Input
                    label="Tên khu vực *"
                    type="text"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    required
                    minLength={2}
                    maxLength={100}
                    placeholder="Nhập tên khu vực"
                />

                {error ? <InlineAlert type="error" message={error} /> : null}
                {success ? (
                    <InlineAlert type="success" message="Đã thêm khu vực thành công!" />
                ) : null}

                <Button
                    type="submit"
                    size="lg"
                    variant="primary"
                    isLoading={isSubmitting}
                    loadingText="Đang thêm…"
                    className="w-full"
                >
                    Tạo khu vực
                </Button>
            </form>
        </Card>
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
            <Card className="p-5 sm:p-6 space-y-2">
                <h3 className="text-sm font-bold uppercase tracking-wider text-[#102A43]">
                    Thêm chòi câu mới
                </h3>
                <p className="text-xs text-slate-500 font-medium">
                    Bạn cần tạo ít nhất một khu vực trước khi thêm chòi.
                </p>
            </Card>
        );
    }

    return (
        <Card className="p-5 sm:p-6 space-y-4">
            <div>
                <h3 className="text-sm font-bold uppercase tracking-wider text-[#102A43]">
                    Thêm chòi câu mới
                </h3>
                <p className="mt-0.5 text-xs text-slate-500 font-medium">
                    Ví dụ: Chòi 01, Chòi VIP 1...
                </p>
            </div>

            <form onSubmit={handleSubmit} className="space-y-4">
                <Select
                    label="Khu vực *"
                    value={areaId}
                    onChange={(e) => setAreaId(e.target.value)}
                    required
                >
                    <option value="">-- Chọn khu vực --</option>
                    {areas.map((area) => (
                        <option key={area.id} value={area.id}>
                            {area.name}
                        </option>
                    ))}
                </Select>

                <Input
                    label="Tên chòi *"
                    type="text"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    required
                    minLength={2}
                    maxLength={100}
                    placeholder="Nhập tên chòi câu"
                />

                {error ? <InlineAlert type="error" message={error} /> : null}
                {success ? (
                    <InlineAlert type="success" message="Đã thêm chòi thành công!" />
                ) : null}

                <Button
                    type="submit"
                    size="lg"
                    variant="primary"
                    isLoading={isSubmitting}
                    loadingText="Đang thêm…"
                    className="w-full"
                >
                    Tạo chòi
                </Button>
            </form>
        </Card>
    );
}
