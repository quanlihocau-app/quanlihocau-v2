"use client";

import { useEffect, useState } from "react";
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
            // Auto open once with a smooth entry delay
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

    if (!isModalOpen || !activeStep) return null;

    return (
        <div
            className="fixed inset-0 z-50 flex items-center justify-center bg-black/65 p-4 backdrop-blur-xs animate-in fade-in duration-200"
            role="dialog"
            aria-modal="true"
            aria-labelledby="guide-modal-title"
        >
            <div className="w-full max-w-lg rounded-2xl border border-[#D9D2C8] bg-white shadow-2xl flex flex-col max-h-[92vh] overflow-hidden">
                {/* Modal Top Bar */}
                <div className="border-b border-[#D9D2C8] bg-[#F4F2EE] px-5 py-3.5 flex items-center justify-between">
                    <div className="flex items-center gap-2">
                        <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-[#8A5A20] text-white text-xs font-bold">
                            ?
                        </div>
                        <div>
                            <h3 className="text-xs font-bold text-[#27231F] uppercase tracking-wider">
                                Cẩm nang sử dụng hồ câu
                            </h3>
                            <p className="text-[11px] text-[#766F67]">
                                Dành cho nhân viên & quản lý mới
                            </p>
                        </div>
                    </div>

                    <div className="flex items-center gap-2">
                        <span className="rounded-full bg-[#EFE4CF] px-2 py-0.5 text-[11px] font-bold text-[#8A5A20] font-mono">
                            Bước {currentStepIndex + 1}/{totalSteps}
                        </span>
                        <button
                            type="button"
                            onClick={handleClose}
                            className="rounded-lg p-1 text-[#766F67] hover:bg-[#D9D2C8] hover:text-[#27231F] transition-colors"
                            aria-label="Đóng hướng dẫn"
                        >
                            <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor">
                                <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                            </svg>
                        </button>
                    </div>
                </div>

                {/* Progress bar */}
                <div className="h-1.5 w-full bg-[#EAE4D9]">
                    <div
                        className="h-full bg-[#8A5A20] transition-all duration-300 ease-out"
                        style={{ width: `${progressPercent}%` }}
                    />
                </div>

                {/* Modal Content Scroll Area */}
                <div className="p-5 space-y-4 overflow-y-auto flex-1">
                    {/* Header of the step */}
                    <div className="space-y-1">
                        <div className="flex items-center gap-2">
                            <span className="rounded bg-[#EFE4CF] px-2 py-0.5 text-[10px] font-bold text-[#8A5A20] uppercase tracking-wide">
                                {activeStep.badge}
                            </span>
                            <span className="text-[11px] font-mono text-[#766F67]">
                                Bài {activeStep.id}/11
                            </span>
                        </div>
                        <h2 id="guide-modal-title" className="text-lg font-bold text-[#27231F]">
                            {activeStep.title}
                        </h2>
                        <p className="text-xs text-[#766F67] leading-relaxed">
                            {activeStep.summary}
                        </p>
                    </div>

                    {/* Step-by-step instructions box */}
                    <div className="rounded-xl border border-[#D9D2C8] bg-[#F8F6F0] p-4 space-y-2.5">
                        <h4 className="text-xs font-bold uppercase tracking-wider text-[#8A5A20]">
                            Các thao tác thực hiện:
                        </h4>
                        <ol className="space-y-2">
                            {activeStep.instructions.map((inst, idx) => (
                                <li key={idx} className="flex items-start gap-2.5 text-xs text-[#27231F]">
                                    <span className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-[#8A5A20] text-[11px] font-bold text-white mt-0.5">
                                        {idx + 1}
                                    </span>
                                    <span className="leading-relaxed flex-1">{inst}</span>
                                </li>
                            ))}
                        </ol>
                    </div>

                    {/* Helpful Tip box */}
                    <div className="rounded-xl border border-amber-200 bg-amber-50/80 p-3 flex items-start gap-2.5">
                        <svg
                            className="h-5 w-5 shrink-0 text-amber-700 mt-0.5"
                            fill="none"
                            viewBox="0 0 24 24"
                            strokeWidth={2}
                            stroke="currentColor"
                        >
                            <path
                                strokeLinecap="round"
                                strokeLinejoin="round"
                                d="M12 18v-5.25m0 0a6.01 6.01 0 0 0 1.5-.189m-1.5.189a6.01 6.01 0 0 1-1.5-.189m3.75 7.5a6.002 6.002 0 0 0 4.5-4.5m-4.5 4.5v-1.5m-3 1.5a6.002 6.002 0 0 1-4.5-4.5m4.5 4.5v-1.5M12 6a3 3 0 1 0 0-6 3 3 0 0 0 0 6Z"
                            />
                        </svg>
                        <div className="text-xs text-amber-900 leading-relaxed">
                            <span className="font-bold">Mẹo nhanh: </span>
                            {activeStep.tips}
                        </div>
                    </div>
                </div>

                {/* Modal Footer Controls */}
                <div className="border-t border-[#D9D2C8] bg-white p-4 flex items-center justify-between gap-2">
                    <button
                        type="button"
                        onClick={handleDismiss}
                        className="text-xs font-semibold text-[#766F67] hover:text-[#27231F] underline py-2 px-1"
                    >
                        Bỏ qua
                    </button>

                    <div className="flex items-center gap-2">
                        {currentStepIndex > 0 && (
                            <Button
                                type="button"
                                size="md"
                                variant="outline"
                                onClick={handlePrev}
                                className="text-xs font-bold min-h-11 px-3.5"
                            >
                                Quay lại
                            </Button>
                        )}

                        <Button
                            type="button"
                            size="md"
                            variant="primary"
                            onClick={handleNext}
                            className="text-xs font-bold min-h-11 px-4"
                        >
                            {currentStepIndex === totalSteps - 1 ? "Hoàn tất" : "Tiếp tục"}
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
