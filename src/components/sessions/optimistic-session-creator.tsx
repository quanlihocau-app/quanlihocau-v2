"use client";

import { useState, useTransition, useOptimistic } from "react";
import { createSessionAction } from "@/app/sessions/actions";
import { Button } from "@/components/ui/button";

export interface OptimisticSessionItem {
    id: string;
    hutName: string;
    packageName: string;
    customerName: string;
    priceVnd: number;
    durationMinutes: number;
    startAt: string;
    isPending?: boolean;
}

interface OptimisticSessionCreatorProps {
    initialSessions: OptimisticSessionItem[];
    availableHuts: { id: string; name: string }[];
    availablePackages: { id: string; name: string; priceVnd: number; durationMinutes: number }[];
}

/**
 * Component biểu mẫu Tạo Vé Câu tối ưu tốc độ phản hồi 0ms bằng:
 * 1. React 19 `useOptimistic` tạo vé ảo lập tức trên UI
 * 2. React 19 `useTransition` chạy Server Action không nghẽn luồng
 * 3. Tự động rollback an toàn nếu server trả lỗi (vd: ô đã có khách)
 */
export function OptimisticSessionCreator({
    initialSessions,
    availableHuts,
    availablePackages,
}: OptimisticSessionCreatorProps) {
    const [sessions, setSessions] = useState<OptimisticSessionItem[]>(initialSessions);
    const [selectedHutId, setSelectedHutId] = useState<string>(availableHuts[0]?.id || "");
    const [selectedPackageId, setSelectedPackageId] = useState<string>(availablePackages[0]?.id || "");
    const [customerName, setCustomerName] = useState("");
    const [errorMessage, setErrorMessage] = useState<string | null>(null);

    const [isPending, startTransition] = useTransition();

    // ── React 19 useOptimistic ───────────────────────────────────────────────
    // Khi bấm "Xác nhận", vé mới lập tức xuất hiện ở đầu danh sách với cờ `isPending: true`
    const [optimisticSessions, setOptimisticSession] = useOptimistic(
        sessions,
        (currentSessions, newOptimisticItem: OptimisticSessionItem) => [
            newOptimisticItem,
            ...currentSessions,
        ],
    );

    const handleCreateTicket = () => {
        setErrorMessage(null);

        const targetHut = availableHuts.find((h) => h.id === selectedHutId);
        const targetPkg = availablePackages.find((p) => p.id === selectedPackageId);

        if (!targetHut || !targetPkg) {
            setErrorMessage("Vui lòng chọn đầy đủ ô câu và gói câu.");
            return;
        }

        const tempId = `temp-${Date.now()}`;
        const optimisticTicket: OptimisticSessionItem = {
            id: tempId,
            hutName: targetHut.name,
            packageName: targetPkg.name,
            customerName: customerName.trim() || "Khách vãng lai",
            priceVnd: targetPkg.priceVnd,
            durationMinutes: targetPkg.durationMinutes,
            startAt: new Date().toISOString(),
            isPending: true, // Cờ nhận diện vé đang được xử lý ngầm
        };

        startTransition(async () => {
            // 1. Cập nhật giao diện tức thì (0ms latency)
            setOptimisticSession(optimisticTicket);

            // 2. Gửi Server Action trực tiếp từ Client
            const result = await createSessionAction({
                packageId: targetPkg.id,
                hutIds: [targetHut.id],
                customer: {
                    mode: customerName.trim() ? "NEW" : "GUEST",
                    name: customerName.trim() || null,
                },
                paymentMode: "POSTPAID",
            });

            if (!result.ok) {
                // Server từ chối: rollback state và báo lỗi
                setErrorMessage(result.error || "Không thể mở vé câu.");
                return;
            }

            // 3. Server thành công: cập nhật danh sách thực
            const realTicket: OptimisticSessionItem = {
                id: (result.data as { session?: { id: string } })?.session?.id || tempId,
                hutName: targetHut.name,
                packageName: targetPkg.name,
                customerName: customerName.trim() || "Khách vãng lai",
                priceVnd: targetPkg.priceVnd,
                durationMinutes: targetPkg.durationMinutes,
                startAt: new Date().toISOString(),
                isPending: false,
            };

            setSessions((prev) => [realTicket, ...prev.filter((s) => s.id !== tempId)]);
            setCustomerName("");
        });
    };

    return (
        <div className="space-y-4">
            {/* Form thao tác tạo vé */}
            <div className="rounded-2xl border border-[#E3E8E3] bg-white p-4 space-y-3 shadow-xs">
                <div className="flex items-center justify-between border-b border-[#E3E8E3] pb-2.5">
                    <h3 className="text-sm font-bold text-[#17201A]">Mở Vé Câu Mới (0ms Phản Hồi)</h3>
                    <span className="rounded-full bg-[#E8F3E5] px-2.5 py-0.5 text-[10px] font-bold text-[#246B38]">
                        Server Action
                    </span>
                </div>

                {errorMessage && (
                    <div className="rounded-xl border border-rose-200 bg-rose-50 p-2.5 text-xs text-rose-700 font-medium animate-in fade-in">
                        ⚠️ {errorMessage}
                    </div>
                )}

                {/* Chọn Ô Câu */}
                <div>
                    <label className="block text-xs font-semibold text-[#66716A] mb-1.5">
                        Chọn ô/chòi câu:
                    </label>
                    <div className="grid grid-cols-4 gap-2">
                        {availableHuts.map((hut) => {
                            const isSelected = selectedHutId === hut.id;
                            return (
                                <button
                                    key={hut.id}
                                    type="button"
                                    onClick={() => setSelectedHutId(hut.id)}
                                    className={`rounded-xl py-2 text-xs font-bold transition-all ${
                                        isSelected
                                            ? "border-2 border-[#4F9D5A] bg-[#E8F3E5] text-[#246B38] shadow-xs"
                                            : "border border-[#E3E8E3] bg-[#F7F9F5] text-[#17201A] hover:bg-[#EEF3EB]"
                                    }`}
                                >
                                    {hut.name}
                                </button>
                            );
                        })}
                    </div>
                </div>

                {/* Chọn Gói Giờ */}
                <div>
                    <label className="block text-xs font-semibold text-[#66716A] mb-1.5">
                        Chọn gói dịch vụ:
                    </label>
                    <div className="grid grid-cols-2 gap-2">
                        {availablePackages.map((pkg) => {
                            const isSelected = selectedPackageId === pkg.id;
                            return (
                                <button
                                    key={pkg.id}
                                    type="button"
                                    onClick={() => setSelectedPackageId(pkg.id)}
                                    className={`rounded-xl p-2.5 text-left border transition-all ${
                                        isSelected
                                            ? "border-[#4F9D5A] bg-[#E8F3E5]/60 ring-2 ring-[#4F9D5A]/20"
                                            : "border-[#E3E8E3] bg-[#F7F9F5] hover:bg-[#EEF3EB]"
                                    }`}
                                >
                                    <div className="text-xs font-bold text-[#17201A]">{pkg.name}</div>
                                    <div className="text-[11px] font-bold text-[#246B38] mt-0.5">
                                        {pkg.priceVnd.toLocaleString("vi-VN")} đ
                                    </div>
                                </button>
                            );
                        })}
                    </div>
                </div>

                {/* Tên Khách Hàng */}
                <div>
                    <label htmlFor="customer-input" className="block text-xs font-semibold text-[#66716A] mb-1">
                        Tên cần thủ (Tùy chọn):
                    </label>
                    <input
                        id="customer-input"
                        type="text"
                        value={customerName}
                        onChange={(e) => setCustomerName(e.target.value)}
                        placeholder="VD: Anh Tuấn..."
                        className="w-full rounded-xl border border-[#E3E8E3] bg-[#F7F9F5] px-3 py-2.5 text-xs text-[#17201A] placeholder:text-[#8A938D] focus:border-[#4F9D5A] focus:outline-none"
                    />
                </div>

                {/* Nút Bấm Thực Thi Với useTransition */}
                <Button
                    type="button"
                    variant="primary"
                    size="lg"
                    onClick={handleCreateTicket}
                    isLoading={isPending}
                    loadingText="Đang ghi nhận..."
                    className="w-full font-bold shadow-xs"
                >
                    Xác nhận mở vé tức thì
                </Button>
            </div>

            {/* Danh sách phiên câu với Optimistic items */}
            <div className="space-y-2">
                <h4 className="text-xs font-bold uppercase tracking-wider text-[#66716A] px-1">
                    Danh sách phiên đang hoạt động ({optimisticSessions.length})
                </h4>

                {optimisticSessions.map((item) => (
                    <div
                        key={item.id}
                        className={`rounded-2xl border p-3.5 transition-all shadow-xs ${
                            item.isPending
                                ? "border-[#4F9D5A] bg-[#E8F3E5]/40 animate-pulse"
                                : "border-[#E3E8E3] bg-white"
                        }`}
                    >
                        <div className="flex items-start justify-between">
                            <div>
                                <div className="flex items-center gap-2">
                                    <span className="text-sm font-bold text-[#17201A]">{item.hutName}</span>
                                    {item.isPending ? (
                                        <span className="rounded-full bg-[#3E9B4F] px-2 py-0.5 text-[10px] font-bold text-white flex items-center gap-1">
                                            <span className="h-1.5 w-1.5 rounded-full bg-white animate-ping" />
                                            Đang xử lý (0ms)...
                                        </span>
                                    ) : (
                                        <span className="rounded-full bg-[#E8F3E5] px-2 py-0.5 text-[10px] font-bold text-[#246B38]">
                                            Đang câu
                                        </span>
                                    )}
                                </div>
                                <p className="text-xs text-[#66716A] mt-1">
                                    {item.packageName} • {item.priceVnd.toLocaleString("vi-VN")} đ
                                </p>
                            </div>

                            <div className="text-right">
                                <span className="text-xs font-bold text-[#17201A]">{item.customerName}</span>
                                <p className="text-[10px] font-mono text-[#8A938D] mt-0.5">
                                    {new Date(item.startAt).toLocaleTimeString("vi-VN", {
                                        hour: "2-digit",
                                        minute: "2-digit",
                                    })}
                                </p>
                            </div>
                        </div>
                    </div>
                ))}
            </div>
        </div>
    );
}
