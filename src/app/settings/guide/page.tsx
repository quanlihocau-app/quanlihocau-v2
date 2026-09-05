"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { ONBOARDING_STEPS } from "@/lib/guides/onboarding-data";
import { openGuideModal } from "@/components/guide/onboarding-modal";
import { MobileBottomNav } from "@/components/layout/mobile-bottom-nav";

export default function GuidePage() {
    const [search, setSearch] = useState("");
    const [selectedRole, setSelectedRole] = useState<"ALL" | "STAFF" | "OWNER">("ALL");
    const [expandedStepId, setExpandedStepId] = useState<number | null>(null);

    const filteredSteps = useMemo(() => {
        return ONBOARDING_STEPS.filter((step) => {
            if (selectedRole === "STAFF" && !step.roles.includes("STAFF")) {
                return false;
            }
            if (selectedRole === "OWNER" && !step.roles.includes("OWNER")) {
                return false;
            }

            if (search.trim()) {
                const q = search.toLowerCase().trim();
                const matchTitle = step.title.toLowerCase().includes(q);
                const matchSummary = step.summary.toLowerCase().includes(q);
                const matchTips = step.tips.toLowerCase().includes(q);
                const matchInst = step.instructions.some((i) =>
                    i.toLowerCase().includes(q),
                );
                if (!matchTitle && !matchSummary && !matchTips && !matchInst) {
                    return false;
                }
            }

            return true;
        });
    }, [search, selectedRole]);

    function toggleExpand(id: number) {
        setExpandedStepId((prev) => (prev === id ? null : id));
    }

    return (
        <main className="mx-auto min-h-screen max-w-lg bg-[#F4F2EE] px-4 pb-28 pt-5 sm:px-6">
            {/* Header bar */}
            <div className="mb-4 flex items-center justify-between">
                <div className="flex items-center gap-2.5">
                    <Link
                        href="/settings"
                        className="inline-flex h-9 w-9 items-center justify-center rounded-xl border border-[#D9D2C8] bg-white text-[#27231F] hover:bg-[#F4F2EE] transition-colors"
                        aria-label="Quay lại Cài đặt"
                    >
                        <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" strokeWidth={2.5} stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" d="M15.75 19.5 8.25 12l7.5-7.5" />
                        </svg>
                    </Link>
                    <div>
                        <h1 className="text-[20px] font-bold tracking-tight text-[#27231F]">
                            Hướng dẫn sử dụng
                        </h1>
                        <p className="text-[11px] text-[#766F67]">
                            Cẩm nang 11 bước vận hành chuẩn hồ câu
                        </p>
                    </div>
                </div>

                <span className="badge-pill">11 Bài</span>
            </div>

            {/* Quick Launch Banner */}
            <div className="rounded-2xl border border-[#C89B3C]/40 bg-linear-to-br from-[#FDF9F0] to-[#F5EBDA] p-4 space-y-2.5 shadow-xs mb-4">
                <div className="flex items-center justify-between">
                    <span className="text-[11px] font-bold uppercase tracking-wider text-[#8A5A20]">
                        Trải nghiệm từng bước
                    </span>
                    <span className="text-[10px] font-semibold text-[#8A5A20] bg-white/80 px-2 py-0.5 rounded-full">
                        ~5-10 phút
                    </span>
                </div>
                <h3 className="text-sm font-bold text-[#27231F]">
                    Hướng dẫn thao tác trực quan (Interactive Wizard)
                </h3>
                <p className="text-xs text-[#766F67] leading-relaxed">
                    Học sinh lớp 5 hoặc nhân viên mới đều có thể thành thạo mở vé, tính tiền và chốt ca nhanh chóng.
                </p>
                <Button
                    type="button"
                    size="md"
                    variant="primary"
                    onClick={() => openGuideModal(1)}
                    className="w-full text-xs font-bold min-h-11"
                >
                    Bắt đầu xem từ Bài 1
                </Button>
            </div>

            {/* Search & Filter */}
            <Card className="p-3 space-y-2.5 mb-4">
                <Input
                    placeholder="Tìm kiếm bài hướng dẫn, thao tác..."
                    value={search}
                    onChange={(e) => setSearch(e.target.value)}
                />

                <div className="flex items-center gap-1.5">
                    <button
                        type="button"
                        onClick={() => setSelectedRole("ALL")}
                        className={`px-2.5 py-1 rounded-lg text-xs font-bold transition-colors ${
                            selectedRole === "ALL"
                                ? "bg-[#8A5A20] text-white"
                                : "bg-[#F4F2EE] text-[#766F67] hover:text-[#27231F]"
                        }`}
                    >
                        Tất cả ({ONBOARDING_STEPS.length})
                    </button>
                    <button
                        type="button"
                        onClick={() => setSelectedRole("STAFF")}
                        className={`px-2.5 py-1 rounded-lg text-xs font-bold transition-colors ${
                            selectedRole === "STAFF"
                                ? "bg-[#8A5A20] text-white"
                                : "bg-[#F4F2EE] text-[#766F67] hover:text-[#27231F]"
                        }`}
                    >
                        Cho Nhân viên
                    </button>
                    <button
                        type="button"
                        onClick={() => setSelectedRole("OWNER")}
                        className={`px-2.5 py-1 rounded-lg text-xs font-bold transition-colors ${
                            selectedRole === "OWNER"
                                ? "bg-[#8A5A20] text-white"
                                : "bg-[#F4F2EE] text-[#766F67] hover:text-[#27231F]"
                        }`}
                    >
                        Cho Chủ hồ / Quản lý
                    </button>
                </div>
            </Card>

            {/* List of 11 Guide Articles */}
            <div className="space-y-3">
                {filteredSteps.map((step) => {
                    const isExpanded = expandedStepId === step.id;

                    return (
                        <Card
                            key={step.id}
                            className="p-4 space-y-2.5 hover:border-[#8A5A20] transition-colors"
                        >
                            <div className="flex items-start justify-between gap-2">
                                <div className="space-y-1">
                                    <div className="flex items-center gap-2">
                                        <span className="flex h-5 w-5 items-center justify-center rounded-full bg-[#8A5A20] text-[10px] font-bold text-white font-mono">
                                            {step.id}
                                        </span>
                                        <span className="rounded bg-[#EFE4CF] px-1.5 py-0.2 text-[10px] font-bold text-[#8A5A20] uppercase">
                                            {step.badge}
                                        </span>
                                    </div>
                                    <h3 className="text-sm font-bold text-[#27231F]">
                                        {step.title}
                                    </h3>
                                </div>

                                <button
                                    type="button"
                                    onClick={() => openGuideModal(step.id)}
                                    className="rounded-lg p-1.5 text-xs text-[#8A5A20] font-bold hover:bg-[#F4F2EE] transition-colors shrink-0"
                                    title="Mở dạng wizard"
                                >
                                    Xem mẫu
                                </button>
                            </div>

                            <p className="text-xs text-[#766F67] leading-relaxed">
                                {step.summary}
                            </p>

                            {/* Collapsible details */}
                            {isExpanded && (
                                <div className="space-y-3 pt-2 border-t border-[#D9D2C8]">
                                    <div className="rounded-xl bg-[#F8F6F0] p-3 space-y-2">
                                        <h4 className="text-xs font-bold text-[#8A5A20] uppercase">
                                            Các bước thao tác:
                                        </h4>
                                        <ul className="space-y-1.5 text-xs text-[#27231F]">
                                            {step.instructions.map((inst, i) => (
                                                <li key={i} className="flex items-start gap-2">
                                                    <span className="font-bold text-[#8A5A20]">
                                                        {i + 1}.
                                                    </span>
                                                    <span>{inst}</span>
                                                </li>
                                            ))}
                                        </ul>
                                    </div>

                                    <div className="rounded-xl bg-amber-50 border border-amber-200 p-2.5 text-xs text-amber-900">
                                        <span className="font-bold">Mẹo: </span>
                                        {step.tips}
                                    </div>
                                </div>
                            )}

                            <div className="flex items-center justify-between pt-1">
                                <button
                                    type="button"
                                    onClick={() => toggleExpand(step.id)}
                                    className="text-xs font-semibold text-[#8A5A20] hover:underline"
                                >
                                    {isExpanded ? "Thu gọn ▲" : "Xem chi tiết ▼"}
                                </button>

                                <button
                                    type="button"
                                    onClick={() => openGuideModal(step.id)}
                                    className="inline-flex items-center gap-1 text-xs font-bold text-[#27231F] hover:text-[#8A5A20]"
                                >
                                    Bật cửa sổ thực hành →
                                </button>
                            </div>
                        </Card>
                    );
                })}
            </div>

            <MobileBottomNav />
        </main>
    );
}
