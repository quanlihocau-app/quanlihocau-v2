"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { ONBOARDING_STEPS } from "@/lib/guides/onboarding-data";
import { openGuideModal } from "@/components/guide/onboarding-modal";
import { MobileBottomNav } from "@/components/layout/mobile-bottom-nav";

type CategoryFilter = "ALL" | "OPERATION" | "SETUP" | "REPORT";

export default function GuidePage() {
    const [search, setSearch] = useState("");
    const [selectedCategory, setSelectedCategory] = useState<CategoryFilter>("ALL");
    const [expandedStepId, setExpandedStepId] = useState<number | null>(4); // Default expand Bài 4 (Tạo vé - cốt lõi)

    // Demo Interactive Playground state
    const [playgroundHut, setPlaygroundHut] = useState<string>("Ô 03");
    const [playgroundPackage, setPlaygroundPackage] = useState<string>("Ca 4 tiếng (240p)");
    const [playgroundSimulated, setPlaygroundSimulated] = useState<boolean>(false);

    const filteredSteps = useMemo(() => {
        return ONBOARDING_STEPS.filter((step) => {
            if (selectedCategory === "OPERATION") {
                // Bài 4, 5, 6, 7, 8: Bán vé & Vận hành ca
                if (![4, 5, 6, 7, 8].includes(step.id)) return false;
            } else if (selectedCategory === "SETUP") {
                // Bài 1, 2, 3, 10: Thiết lập hồ, biểu giá, kho, máy in
                if (![1, 2, 3, 10].includes(step.id)) return false;
            } else if (selectedCategory === "REPORT") {
                // Bài 9, 11: Báo cáo & Xử lý sự cố
                if (![9, 11].includes(step.id)) return false;
            }

            if (search.trim()) {
                const q = search.toLowerCase().trim();
                const matchTitle = step.title.toLowerCase().includes(q);
                const matchSummary = step.summary.toLowerCase().includes(q);
                const matchTips = step.tips.toLowerCase().includes(q);
                const matchFlow = step.flowSteps.some(
                    (f) =>
                        f.title.toLowerCase().includes(q) ||
                        f.actionDescription.toLowerCase().includes(q) ||
                        f.annotation.toLowerCase().includes(q),
                );
                if (!matchTitle && !matchSummary && !matchTips && !matchFlow) {
                    return false;
                }
            }

            return true;
        });
    }, [search, selectedCategory]);

    function toggleExpand(id: number) {
        setExpandedStepId((prev) => (prev === id ? null : id));
    }

    return (
        <main className="mx-auto min-h-screen max-w-lg bg-[#F7F9F5] px-4 pb-28 pt-4 sm:px-6">
            {/* Header bar */}
            <div className="mb-4 flex items-center justify-between">
                <div className="flex items-center gap-2.5">
                    <Link
                        href="/settings"
                        className="inline-flex h-9 w-9 items-center justify-center rounded-xl border border-[#E3E8E3] bg-white text-[#17201A] hover:bg-[#EEF3EB] active:scale-95 transition-all shadow-xs"
                        aria-label="Quay lại Cài đặt"
                    >
                        <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" strokeWidth={2.5} stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" d="M15.75 19.5 8.25 12l7.5-7.5" />
                        </svg>
                    </Link>
                    <div>
                        <h1 className="text-[19px] font-bold tracking-tight text-[#17201A]">
                            Hướng dẫn & Thực hành
                        </h1>
                        <p className="text-[12px] text-[#66716A]">
                            Từng bước có mũi tên chỉ dẫn • Thực hành trên dữ liệu thật
                        </p>
                    </div>
                </div>

                <span className="inline-flex items-center rounded-full bg-[#E8F3E5] px-2.5 py-1 text-xs font-bold text-[#246B38] font-mono border border-[#D1E5CE]">
                    11 Bài học
                </span>
            </div>

            {/* Quick Practice Banner */}
            <div className="rounded-2xl border border-[#4F9D5A]/30 bg-linear-to-br from-[#E8F3E5] via-[#E2F0DE] to-[#D5E8D1] p-4 space-y-3 shadow-xs mb-4">
                <div className="flex items-center justify-between">
                    <span className="text-[11px] font-bold uppercase tracking-wider text-[#246B38] flex items-center gap-1.5">
                        <span className="inline-block h-2 w-2 rounded-full bg-[#246B38] animate-pulse" />
                        Thực hành trực tiếp 100%
                    </span>
                    <span className="text-[11px] font-bold text-[#246B38] bg-white/90 px-2.5 py-0.5 rounded-full shadow-xs">
                        Dễ học • Dễ nhớ
                    </span>
                </div>
                <div>
                    <h3 className="text-sm font-bold text-[#17201A]">
                        Học theo mũi tên chỉ dẫn từng bước
                    </h3>
                    <p className="text-xs text-[#526057] leading-relaxed mt-0.5">
                        Mỗi bài học được thiết kế kèm sơ đồ mũi tên thao tác rõ ràng và nút bấm chuyển thẳng sang màn hình của hồ để bạn làm theo thực tế.
                    </p>
                </div>
                <div className="flex items-center gap-2">
                    <Button
                        type="button"
                        size="sm"
                        variant="primary"
                        onClick={() => openGuideModal(4)}
                        className="flex-1 text-xs font-bold min-h-10 shadow-xs"
                    >
                        ⚡ Mở cửa sổ Thực hành (Pop-up)
                    </Button>
                    <Link
                        href="/sessions/new"
                        className="inline-flex items-center justify-center rounded-xl border border-[#246B38] bg-white px-3 py-2 text-xs font-bold text-[#246B38] hover:bg-[#F7FAF6] transition-colors"
                    >
                        🚀 Vào màn hình Tạo vé
                    </Link>
                </div>
            </div>

            {/* Interactive Demo Sandbox / Playground */}
            <Card className="p-4 space-y-3 bg-white border-[#D1E5CE] rounded-2xl shadow-xs mb-4">
                <div className="flex items-center justify-between border-b border-[#E3E8E3] pb-2">
                    <div className="flex items-center gap-1.5">
                        <span className="text-base">🎯</span>
                        <h3 className="text-xs font-bold text-[#17201A] uppercase tracking-wide">
                            Khu vực thử nghiệm nhanh (Bấm thử tại đây)
                        </h3>
                    </div>
                    <span className="text-[10px] font-semibold text-[#246B38] bg-[#E8F3E5] px-2 py-0.5 rounded-md">
                        Mô phỏng 0 rủi ro
                    </span>
                </div>

                <p className="text-[11px] text-[#66716A]">
                    Bấm thử chọn ô và gói câu bên dưới để xem hệ thống phản hồi như thế nào trước khi làm trên hồ thật:
                </p>

                {/* Simulated Step 1: Choose Hut */}
                <div className="space-y-1.5">
                    <span className="text-[11px] font-bold text-[#17201A] flex items-center gap-1">
                        <span className="flex h-4 w-4 items-center justify-center rounded-full bg-[#246B38] text-[9px] font-bold text-white">1</span>
                        Chọn ô câu:
                    </span>
                    <div className="grid grid-cols-3 gap-1.5">
                        {["Ô 01", "Ô 02", "Ô 03"].map((hut) => {
                            const isSelected = playgroundHut === hut;
                            return (
                                <button
                                    key={hut}
                                    type="button"
                                    onClick={() => {
                                        setPlaygroundHut(hut);
                                        setPlaygroundSimulated(false);
                                    }}
                                    className={`py-1.5 rounded-lg text-xs font-bold border transition-all cursor-pointer ${
                                        isSelected
                                            ? "bg-[#246B38] text-white border-[#246B38] shadow-xs"
                                            : "bg-[#F7F9F5] text-[#17201A] border-[#E3E8E3] hover:bg-[#EEF3EB]"
                                    }`}
                                >
                                    {hut} {isSelected ? "✓" : ""}
                                </button>
                            );
                        })}
                    </div>
                </div>

                {/* Arrow connector */}
                <div className="flex items-center justify-center text-[#4F9D5A]">
                    <svg className="h-4 w-4 animate-bounce" fill="none" viewBox="0 0 24 24" strokeWidth={2.5} stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" d="M19.5 13.5 12 21m0 0-7.5-7.5M12 21V3" />
                    </svg>
                </div>

                {/* Simulated Step 2: Choose Package */}
                <div className="space-y-1.5">
                    <span className="text-[11px] font-bold text-[#17201A] flex items-center gap-1">
                        <span className="flex h-4 w-4 items-center justify-center rounded-full bg-[#246B38] text-[9px] font-bold text-white">2</span>
                        Chọn gói câu:
                    </span>
                    <div className="grid grid-cols-2 gap-1.5">
                        {["Ca 2 tiếng (120p)", "Ca 4 tiếng (240p)"].map((pkg) => {
                            const isSelected = playgroundPackage === pkg;
                            return (
                                <button
                                    key={pkg}
                                    type="button"
                                    onClick={() => {
                                        setPlaygroundPackage(pkg);
                                        setPlaygroundSimulated(false);
                                    }}
                                    className={`p-2 rounded-lg text-xs font-bold border text-left transition-all cursor-pointer ${
                                        isSelected
                                            ? "bg-[#E8F3E5] text-[#246B38] border-[#4F9D5A] shadow-xs"
                                            : "bg-white text-[#17201A] border-[#E3E8E3] hover:bg-[#F7F9F5]"
                                    }`}
                                >
                                    {pkg}
                                </button>
                            );
                        })}
                    </div>
                </div>

                {/* Action button */}
                <Button
                    type="button"
                    size="sm"
                    variant="primary"
                    onClick={() => setPlaygroundSimulated(true)}
                    className="w-full text-xs font-bold min-h-10 mt-1"
                >
                    {playgroundSimulated ? "✓ Đã mở ô thành công (Xem vé mô phỏng)" : "👉 Bấm thử: [Tạo vé và mở ô]"}
                </Button>

                {playgroundSimulated && (
                    <div className="rounded-xl border border-[#4F9D5A] bg-[#E8F3E5] p-3 space-y-2 animate-in fade-in duration-200">
                        <div className="flex items-center justify-between">
                            <span className="text-xs font-bold text-[#246B38] flex items-center gap-1">
                                <span>🎉</span> Kết quả mô phỏng:
                            </span>
                            <span className="text-[10px] font-mono bg-white px-2 py-0.5 rounded text-[#246B38] font-bold">
                                Vé #TC-0012
                            </span>
                        </div>
                        <p className="text-xs text-[#17201A]">
                            Đã chọn <strong>{playgroundHut}</strong> • Gói <strong>{playgroundPackage}</strong>.
                            Trên màn hình thật, máy in sẽ nhả vé và đồng hồ đếm ngược sẽ bắt đầu chạy ngay lập tức!
                        </p>
                        <Link
                            href="/sessions/new"
                            className="inline-flex items-center gap-1 text-xs font-bold text-[#246B38] hover:underline"
                        >
                            🚀 Áp dụng thao tác này trên hồ thật của bạn ➔
                        </Link>
                    </div>
                )}
            </Card>

            {/* Search & Category Filter */}
            <Card className="p-3.5 space-y-2.5 mb-4 bg-white border-[#E3E8E3] rounded-2xl shadow-xs">
                <Input
                    placeholder="Tìm theo từ khóa (vé câu, tính tiền, kho, máy in...)"
                    value={search}
                    onChange={(e) => setSearch(e.target.value)}
                />

                <div className="flex items-center gap-1.5 flex-wrap">
                    <button
                        type="button"
                        onClick={() => setSelectedCategory("ALL")}
                        className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                            selectedCategory === "ALL"
                                ? "bg-[#246B38] text-white shadow-xs"
                                : "bg-[#F7F9F5] text-[#66716A] hover:bg-[#EEF3EB]"
                        }`}
                    >
                        Tất cả (11)
                    </button>
                    <button
                        type="button"
                        onClick={() => setSelectedCategory("OPERATION")}
                        className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                            selectedCategory === "OPERATION"
                                ? "bg-[#246B38] text-white shadow-xs"
                                : "bg-[#F7F9F5] text-[#66716A] hover:bg-[#EEF3EB]"
                        }`}
                    >
                        🎫 Bán vé & Quyết toán
                    </button>
                    <button
                        type="button"
                        onClick={() => setSelectedCategory("SETUP")}
                        className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                            selectedCategory === "SETUP"
                                ? "bg-[#246B38] text-white shadow-xs"
                                : "bg-[#F7F9F5] text-[#66716A] hover:bg-[#EEF3EB]"
                        }`}
                    >
                        ⚙️ Cài đặt hồ & Kho
                    </button>
                    <button
                        type="button"
                        onClick={() => setSelectedCategory("REPORT")}
                        className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                            selectedCategory === "REPORT"
                                ? "bg-[#246B38] text-white shadow-xs"
                                : "bg-[#F7F9F5] text-[#66716A] hover:bg-[#EEF3EB]"
                        }`}
                    >
                        📊 Báo cáo & Sự cố
                    </button>
                </div>
            </Card>

            {/* List of 11 Guide Articles with Visual Flow & Arrow Stepper */}
            <div className="space-y-4">
                {filteredSteps.map((step) => {
                    const isExpanded = expandedStepId === step.id;

                    return (
                        <Card
                            key={step.id}
                            className={`p-4 space-y-3 bg-white rounded-2xl transition-all border ${
                                isExpanded
                                    ? "border-[#4F9D5A] shadow-md ring-1 ring-[#4F9D5A]/20"
                                    : "border-[#E3E8E3] hover:border-[#CCD5CA] shadow-xs"
                            }`}
                        >
                            {/* Header of Step Card */}
                            <div className="flex items-start justify-between gap-2">
                                <div className="space-y-1">
                                    <div className="flex items-center gap-2">
                                        <span className="flex h-6 w-6 items-center justify-center rounded-full bg-[#246B38] text-xs font-bold text-white font-mono shadow-xs">
                                            {step.id}
                                        </span>
                                        <span className="rounded-md bg-[#E8F3E5] px-2 py-0.5 text-[10px] font-bold text-[#246B38] uppercase">
                                            {step.badge}
                                        </span>
                                    </div>
                                    <h3 className="text-[15px] font-bold text-[#17201A]">
                                        {step.title}
                                    </h3>
                                </div>

                                <button
                                    type="button"
                                    onClick={() => openGuideModal(step.id)}
                                    className="rounded-xl px-2.5 py-1 text-xs text-[#246B38] font-bold bg-[#E8F3E5] hover:bg-[#DDF0D8] transition-colors shrink-0 cursor-pointer"
                                    title="Mở cửa sổ xem nhanh"
                                >
                                    Xem Wizard ➔
                                </button>
                            </div>

                            <p className="text-xs text-[#526057] leading-relaxed">
                                {step.summary}
                            </p>

                            {/* ─── VISUAL ARROW STEPPER (LUỒNG MŨI TÊN KÈM CHÚ THÍCH) ─── */}
                            <div className="rounded-2xl bg-[#F7FAF6] border border-[#D1E5CE] p-3.5 space-y-3">
                                <div className="flex items-center justify-between">
                                    <h4 className="text-[11px] font-bold text-[#246B38] uppercase tracking-wider flex items-center gap-1.5">
                                        <span>🧭</span> Quy trình thực hành theo mũi tên:
                                    </h4>
                                    <span className="text-[10px] text-[#66716A]">
                                        {step.flowSteps.length} thao tác
                                    </span>
                                </div>

                                {/* Flow Nodes connected by Arrows */}
                                <div className="relative pl-3 space-y-3">
                                    {/* Spine connector line */}
                                    <div className="absolute left-4.75 top-3 bottom-3 w-0.5 bg-[#CCD5CA] z-0" />

                                    {step.flowSteps.map((flow, index) => {
                                        const isLast = index === step.flowSteps.length - 1;

                                        return (
                                            <div key={flow.stepNumber} className="relative z-10 space-y-1.5">
                                                <div className="flex items-start gap-2.5">
                                                    {/* Step Circle Badge */}
                                                    <div className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-[#246B38] text-white text-xs font-bold shadow-xs">
                                                        {flow.stepNumber}
                                                    </div>

                                                    <div className="flex-1 space-y-1">
                                                        <div className="flex items-center justify-between gap-1 flex-wrap">
                                                            <span className="text-xs font-bold text-[#17201A]">
                                                                {flow.title}
                                                            </span>
                                                            <span className="text-[10px] text-[#246B38] font-semibold bg-white border border-[#D1E5CE] px-1.5 py-0.5 rounded-md">
                                                                📍 {flow.screenLocation}
                                                            </span>
                                                        </div>
                                                        <p className="text-[11px] text-[#526057]">
                                                            {flow.actionDescription}
                                                        </p>

                                                        {/* Visual UI Mockup Element */}
                                                        <div className="rounded-xl border border-[#CCD5CA] bg-white p-2 flex items-center justify-between shadow-2xs">
                                                            <div>
                                                                <span className="text-xs font-bold text-[#17201A]">
                                                                    {flow.mockupElement.label}
                                                                </span>
                                                                {flow.mockupElement.subLabel && (
                                                                    <p className="text-[10px] text-[#66716A]">
                                                                        {flow.mockupElement.subLabel}
                                                                    </p>
                                                                )}
                                                            </div>
                                                            <span className="text-[10px] font-bold text-[#246B38] bg-[#E8F3E5] px-2 py-0.5 rounded-full">
                                                                Chạm vào đây
                                                            </span>
                                                        </div>

                                                        {/* Arrow Annotation Callout */}
                                                        <div className="rounded-lg bg-[#F0F5EE] px-2.5 py-1 text-[11px] text-[#246B38] font-medium flex items-center gap-1.5 border border-[#D1E5CE]">
                                                            <span className="font-bold">👉 Chú thích:</span>
                                                            <span>{flow.annotation}</span>
                                                        </div>
                                                    </div>
                                                </div>

                                                {/* Connecting Arrow Downward */}
                                                {!isLast && (
                                                    <div className="flex items-center justify-center py-0.5 text-[#246B38]">
                                                        <div className="flex items-center gap-1 text-[10px] font-bold uppercase tracking-wider bg-white px-2 py-0.5 rounded-full border border-[#D1E5CE] shadow-2xs">
                                                            <span>Sau đó</span>
                                                            <svg className="h-3 w-3 animate-pulse" fill="none" viewBox="0 0 24 24" strokeWidth={3} stroke="currentColor">
                                                                <path strokeLinecap="round" strokeLinejoin="round" d="M19.5 13.5 12 21m0 0-7.5-7.5M12 21V3" />
                                                            </svg>
                                                        </div>
                                                    </div>
                                                )}
                                            </div>
                                        );
                                    })}
                                </div>
                            </div>

                            {/* Real-world Scenario & Expected Result */}
                            <div className="rounded-xl bg-[#FDF6E9] border border-[#D99A32]/30 p-3 space-y-1.5">
                                <div className="text-xs text-[#8F5A0E] flex items-center gap-1.5 font-bold">
                                    <span>🎣 Tình huống thực tế trên hồ:</span>
                                </div>
                                <p className="text-xs text-[#17201A] italic">
                                    &ldquo;{step.realWorldExample.scenario}&rdquo;
                                </p>
                                <div className="text-[11px] text-[#246B38] bg-white/80 p-2 rounded-lg border border-[#D99A32]/20 font-medium">
                                    <span className="font-bold">✓ Kết quả thực tế: </span>
                                    {step.realWorldExample.expectedResult}
                                </div>
                            </div>

                            {/* Collapsible details (Mẹo & Hướng dẫn mở rộng) */}
                            {isExpanded && (
                                <div className="space-y-2.5 pt-2 border-t border-[#E3E8E3] animate-in fade-in duration-200">
                                    <div className="rounded-xl bg-[#F7F9F5] border border-[#E3E8E3] p-3 space-y-2">
                                        <h4 className="text-xs font-bold text-[#246B38] uppercase tracking-wider">
                                            Chi tiết các lưu ý thêm:
                                        </h4>
                                        <ul className="space-y-1.5 text-xs text-[#17201A]">
                                            {step.instructions.map((inst, i) => (
                                                <li key={i} className="flex items-start gap-2">
                                                    <span className="font-bold text-[#246B38]">
                                                        {i + 1}.
                                                    </span>
                                                    <span>{inst}</span>
                                                </li>
                                            ))}
                                        </ul>
                                    </div>

                                    <div className="rounded-xl bg-[#E8F3E5] border border-[#4F9D5A]/40 p-2.5 text-xs text-[#246B38]">
                                        <span className="font-bold">💡 Mẹo vận hành: </span>
                                        {step.tips}
                                    </div>
                                </div>
                            )}

                            {/* Card Action Footer */}
                            <div className="flex items-center justify-between gap-2 pt-1 border-t border-[#E3E8E3]">
                                <button
                                    type="button"
                                    onClick={() => toggleExpand(step.id)}
                                    className="text-xs font-semibold text-[#66716A] hover:text-[#17201A] cursor-pointer"
                                >
                                    {isExpanded ? "Thu gọn ▲" : "Xem thêm mẹo ▼"}
                                </button>

                                {/* REAL PRACTICE BUTTON: JUMP TO THE REAL DATA SCREEN */}
                                <Link
                                    href={step.practiceUrl}
                                    className="inline-flex items-center gap-1.5 rounded-xl bg-[#246B38] px-3.5 py-2 text-xs font-bold text-white shadow-xs hover:bg-[#1C552C] active:scale-95 transition-all cursor-pointer"
                                >
                                    <span>🚀</span>
                                    <span>{step.practiceActionLabel}</span>
                                </Link>
                            </div>
                        </Card>
                    );
                })}
            </div>

            <MobileBottomNav />
        </main>
    );
}
