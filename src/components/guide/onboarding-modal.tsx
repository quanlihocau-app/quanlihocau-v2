"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { GuideStep, ONBOARDING_STEPS } from "@/lib/guides/onboarding-data";

interface OnboardingModalProps {
    isOpen?: boolean;
    onClose?: () => void;
    userRole?: "OWNER" | "MANAGER" | "STAFF";
    initialStepId?: number;
}

export function OnboardingModal({
    isOpen: controlledIsOpen,
    onClose: controlledOnClose,
    userRole = "OWNER",
    initialStepId = 1,
}: OnboardingModalProps) {
    const router = useRouter();
    const filteredSteps: GuideStep[] = ONBOARDING_STEPS.filter((step) =>
        step.roles.includes(userRole),
    );

    const [internalIsOpen, setInternalIsOpen] = useState(false);
    const isModalOpen = controlledIsOpen !== undefined ? controlledIsOpen : internalIsOpen;

    const [currentStepIndex, setCurrentStepIndex] = useState(() => {
        const idx = filteredSteps.findIndex((s) => s.id === initialStepId);
        return idx !== -1 ? idx : 0;
    });

    const activeStep = filteredSteps[currentStepIndex] || filteredSteps[0];
    const totalSteps = filteredSteps.length;
    const progressPercent = Math.round(((currentStepIndex + 1) / totalSteps) * 100);

    // Check auto-show on initial login if not seen before
    useEffect(() => {
        if (typeof window === "undefined") return;

        const hasSeenOnboarding = localStorage.getItem("quanlihocau_onboarding_completed_v1");
        if (!hasSeenOnboarding && controlledIsOpen === undefined) {
            const timer = setTimeout(() => {
                setInternalIsOpen(true);
            }, 800);
            return () => clearTimeout(timer);
        }
    }, [controlledIsOpen]);

    // Listen for custom trigger event (e.g. from header '?' button)
    useEffect(() => {
        function handleOpenEvent(e: Event) {
            const customEvent = e as CustomEvent<{ stepId?: number }>;
            if (customEvent.detail?.stepId) {
                const targetIdx = filteredSteps.findIndex(
                    (s) => s.id === customEvent.detail.stepId,
                );
                if (targetIdx !== -1) setCurrentStepIndex(targetIdx);
            }
            setInternalIsOpen(true);
        }

        window.addEventListener("open-guide-modal", handleOpenEvent);
        return () => window.removeEventListener("open-guide-modal", handleOpenEvent);
    }, [filteredSteps]);

    function handleClose() {
        setInternalIsOpen(false);
        if (controlledOnClose) controlledOnClose();
    }

    function handleDismiss() {
        if (typeof window !== "undefined") {
            localStorage.setItem("quanlihocau_onboarding_completed_v1", "true");
        }
        handleClose();
    }

    function handleNext() {
        if (currentStepIndex < totalSteps - 1) {
            const nextIdx = currentStepIndex + 1;
            setCurrentStepIndex(nextIdx);
            if (typeof window !== "undefined") {
                localStorage.setItem("quanlihocau_guide_step", String(nextIdx));
            }
        } else {
            handleDismiss();
        }
    }

    function handlePrev() {
        if (currentStepIndex > 0) {
            setCurrentStepIndex(currentStepIndex - 1);
        }
    }

    function handlePracticeNow() {
        handleClose();
        if (activeStep?.practiceUrl) {
            router.push(activeStep.practiceUrl);
        }
    }

    if (!isModalOpen || !activeStep) return null;

    return (
        <div
            className="fixed inset-0 z-50 flex items-center justify-center bg-black/65 p-4 backdrop-blur-xs animate-in fade-in duration-200"
            role="dialog"
            aria-modal="true"
            aria-labelledby="guide-modal-title"
        >
            <div className="w-full max-w-lg rounded-2xl border border-[#E3E8E3] bg-white shadow-2xl flex flex-col max-h-[92vh] overflow-hidden animate-page-enter">
                {/* Modal Top Bar */}
                <div className="border-b border-[#E3E8E3] bg-[#F7F9F5] px-5 py-3.5 flex items-center justify-between">
                    <div className="flex items-center gap-2.5">
                        <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-[#246B38] text-white text-xs font-bold shadow-xs">
                            ?
                        </div>
                        <div>
                            <h3 className="text-xs font-bold text-[#17201A] uppercase tracking-wider">
                                Hướng dẫn & Thực hành
                            </h3>
                            <p className="text-[11px] text-[#66716A]">
                                Chỉ dẫn mũi tên • Áp dụng dữ liệu thật
                            </p>
                        </div>
                    </div>

                    <div className="flex items-center gap-2">
                        <span className="rounded-full bg-[#E8F3E5] px-2.5 py-0.5 text-[11px] font-bold text-[#246B38] font-mono border border-[#D1E5CE]">
                            Bài {currentStepIndex + 1}/{totalSteps}
                        </span>
                        <button
                            type="button"
                            onClick={handleClose}
                            className="rounded-lg p-1 text-[#66716A] hover:bg-[#EEF3EB] hover:text-[#17201A] transition-colors cursor-pointer"
                            aria-label="Đóng hướng dẫn"
                        >
                            <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor">
                                <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                            </svg>
                        </button>
                    </div>
                </div>

                {/* Progress bar */}
                <div className="h-1.5 w-full bg-[#EEF3EB]">
                    <div
                        className="h-full bg-[#246B38] transition-all duration-300 ease-out"
                        style={{ width: `${progressPercent}%` }}
                    />
                </div>

                {/* Modal Content Scroll Area */}
                <div className="p-5 space-y-4 overflow-y-auto flex-1 overscroll-contain">
                    {/* Header of the step */}
                    <div className="space-y-1">
                        <div className="flex items-center gap-2">
                            <span className="rounded-md bg-[#E8F3E5] px-2 py-0.5 text-[10px] font-bold text-[#246B38] uppercase tracking-wide">
                                {activeStep.badge}
                            </span>
                            <span className="text-[11px] font-mono text-[#66716A]">
                                Bài {activeStep.id}/11
                            </span>
                        </div>
                        <h2 id="guide-modal-title" className="text-base font-bold text-[#17201A]">
                            {activeStep.title}
                        </h2>
                        <p className="text-xs text-[#526057] leading-relaxed">
                            {activeStep.summary}
                        </p>
                    </div>

                    {/* ─── VISUAL ARROW STEPPER (MŨI TÊN & CHÚ THÍCH THỰC HÀNH) ─── */}
                    <div className="rounded-2xl border border-[#D1E5CE] bg-[#F7FAF6] p-3.5 space-y-3">
                        <h4 className="text-[11px] font-bold uppercase tracking-wider text-[#246B38] flex items-center gap-1.5">
                            <span>🧭</span> Quy trình thao tác theo mũi tên:
                        </h4>

                        <div className="space-y-3 relative pl-2">
                            {activeStep.flowSteps.map((flow, idx) => {
                                const isLast = idx === activeStep.flowSteps.length - 1;

                                return (
                                    <div key={flow.stepNumber} className="space-y-1.5">
                                        <div className="flex items-start gap-2.5">
                                            <span className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-[#246B38] text-[11px] font-bold text-white shadow-2xs mt-0.5">
                                                {flow.stepNumber}
                                            </span>
                                            <div className="flex-1 space-y-1">
                                                <div className="flex items-center justify-between gap-1 flex-wrap">
                                                    <span className="text-xs font-bold text-[#17201A]">
                                                        {flow.title}
                                                    </span>
                                                    <span className="text-[10px] text-[#246B38] font-semibold bg-white border border-[#D1E5CE] px-1.5 py-0.5 rounded">
                                                        📍 {flow.screenLocation}
                                                    </span>
                                                </div>
                                                <p className="text-[11px] text-[#526057]">
                                                    {flow.actionDescription}
                                                </p>

                                                {/* UI Mockup preview element */}
                                                <div className="rounded-lg border border-[#CCD5CA] bg-white p-2 flex items-center justify-between shadow-2xs">
                                                    <span className="text-xs font-bold text-[#17201A]">
                                                        {flow.mockupElement.label}
                                                    </span>
                                                    <span className="text-[9px] font-bold text-[#246B38] bg-[#E8F3E5] px-2 py-0.5 rounded-full">
                                                        Chạm tại đây
                                                    </span>
                                                </div>

                                                {/* Annotation Callout */}
                                                <div className="rounded bg-[#F0F5EE] px-2 py-1 text-[10px] text-[#246B38] border border-[#D1E5CE] font-medium">
                                                    <strong>👉 Chú thích: </strong>
                                                    {flow.annotation}
                                                </div>
                                            </div>
                                        </div>

                                        {!isLast && (
                                            <div className="flex items-center justify-center py-0.5 text-[#246B38]">
                                                <div className="flex items-center gap-1 text-[10px] font-bold uppercase bg-white px-2 py-0.5 rounded-full border border-[#D1E5CE] shadow-2xs">
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

                    {/* Real-world Scenario callout */}
                    <div className="rounded-xl border border-[#D99A32]/30 bg-[#FDF6E9] p-3 space-y-1">
                        <div className="text-xs text-[#8F5A0E] flex items-center gap-1 font-bold">
                            <span>🎣 Tình huống thực tế trên hồ:</span>
                        </div>
                        <p className="text-xs text-[#17201A] italic">
                            &ldquo;{activeStep.realWorldExample.scenario}&rdquo;
                        </p>
                        <div className="text-[11px] text-[#246B38] font-medium pt-1">
                            <span className="font-bold">✓ Kết quả: </span>
                            {activeStep.realWorldExample.expectedResult}
                        </div>
                    </div>

                    {/* Pro tip */}
                    <div className="rounded-xl border border-[#D1E5CE] bg-[#F7F9F5] p-2.5 text-xs text-[#526057] flex items-start gap-2">
                        <span className="text-sm">💡</span>
                        <div>
                            <span className="font-bold text-[#17201A]">Mẹo: </span>
                            {activeStep.tips}
                        </div>
                    </div>
                </div>

                {/* Modal Footer Controls with Practice Button */}
                <div className="border-t border-[#E3E8E3] bg-white p-3.5 flex items-center justify-between gap-2">
                    <button
                        type="button"
                        onClick={handleDismiss}
                        className="text-xs font-semibold text-[#66716A] hover:text-[#17201A] underline py-2 px-1 cursor-pointer"
                    >
                        Đóng
                    </button>

                    <div className="flex items-center gap-2">
                        {/* DIRECT PRACTICE BUTTON */}
                        <Button
                            type="button"
                            size="md"
                            variant="outline"
                            onClick={handlePracticeNow}
                            className="text-xs font-bold min-h-10 px-3 border-[#246B38] text-[#246B38] hover:bg-[#E8F3E5]"
                            title="Chuyển ngay tới màn hình thực tế"
                        >
                            🚀 Thực hành ngay
                        </Button>

                        {currentStepIndex > 0 && (
                            <Button
                                type="button"
                                size="md"
                                variant="outline"
                                onClick={handlePrev}
                                className="text-xs font-bold min-h-10 px-3"
                            >
                                Quay lại
                            </Button>
                        )}

                        <Button
                            type="button"
                            size="md"
                            variant="primary"
                            onClick={handleNext}
                            className="text-xs font-bold min-h-10 px-3.5"
                        >
                            {currentStepIndex === totalSteps - 1 ? "Hoàn tất" : "Tiếp ➔"}
                        </Button>
                    </div>
                </div>
            </div>
        </div>
    );
}

/** Utility to open the guide modal from any button */
export function openGuideModal(stepId?: number) {
    if (typeof window !== "undefined") {
        window.dispatchEvent(
            new CustomEvent("open-guide-modal", { detail: { stepId } }),
        );
    }
}
