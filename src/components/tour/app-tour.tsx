"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { usePathname } from "next/navigation";
import { TOUR_STEPS, TourStep } from "@/lib/tour/tour-steps";

const STORAGE_COMPLETED = "hocau_tour_completed_v2";
const STORAGE_DISMISSED = "hocau_tour_dismissed_v2";
const OPEN_TOUR_EVENT = "open-app-tour";

/** Dispatch this from anywhere to open the tour (optionally at a specific step) */
export function openAppTour(stepId?: string) {
  if (typeof window !== "undefined") {
    window.dispatchEvent(
      new CustomEvent(OPEN_TOUR_EVENT, { detail: { stepId } }),
    );
  }
}

/** Blacklisted routes where the tour should never auto-pop */
const SENSITIVE_ROUTES = ["/sessions/new", "/invoices", "/settings/printer", "/login", "/register"];

export function AppTour({ userRole = "OWNER" }: { userRole?: "OWNER" | "MANAGER" | "STAFF" }) {
  const pathname = usePathname();

  const filteredSteps: TourStep[] = TOUR_STEPS.filter(
    (s) => !s.roles || s.roles.includes(userRole),
  );

  const [isOpen, setIsOpen] = useState(false);
  const [stepIndex, setStepIndex] = useState(0);
  const [exiting, setExiting] = useState(false);

  const activeStep: TourStep = filteredSteps[stepIndex] ?? filteredSteps[0];
  const total = filteredSteps.length;

  /* ---------- auto-show on first login ---------- */
  useEffect(() => {
    if (typeof window === "undefined") return;
    const completed = localStorage.getItem(STORAGE_COMPLETED);
    const dismissed = localStorage.getItem(STORAGE_DISMISSED);
    const isSensitive = SENSITIVE_ROUTES.some((r) => pathname?.startsWith(r));
    if (!completed && !dismissed && !isSensitive) {
      const t = setTimeout(() => setIsOpen(true), 900);
      return () => clearTimeout(t);
    }
  }, [pathname]);

  /* ---------- listen for manual open trigger ---------- */
  useEffect(() => {
    function handler(e: Event) {
      const evt = e as CustomEvent<{ stepId?: string }>;
      if (evt.detail?.stepId) {
        const idx = filteredSteps.findIndex((s) => s.id === evt.detail.stepId);
        if (idx !== -1) setStepIndex(idx);
        else setStepIndex(0);
      } else {
        setStepIndex(0);
      }
      setExiting(false);
      setIsOpen(true);
    }
    window.addEventListener(OPEN_TOUR_EVENT, handler);
    return () => window.removeEventListener(OPEN_TOUR_EVENT, handler);
  }, [filteredSteps]);

  /* ---------- helpers ---------- */
  const animateClose = useCallback(
    (then: () => void) => {
      setExiting(true);
      setTimeout(() => {
        setExiting(false);
        setIsOpen(false);
        then();
      }, 200);
    },
    [],
  );

  function skip() {
    animateClose(() => {
      localStorage.setItem(STORAGE_DISMISSED, "true");
    });
  }

  function next() {
    if (stepIndex < total - 1) {
      setStepIndex((i) => i + 1);
    } else {
      animateClose(() => {
        localStorage.setItem(STORAGE_COMPLETED, "true");
        localStorage.setItem(STORAGE_DISMISSED, "true");
      });
    }
  }

  function back() {
    if (stepIndex > 0) setStepIndex((i) => i - 1);
  }

  if (!isOpen || !activeStep) return null;

  const isLast = stepIndex === total - 1;

  return (
    <>
      {/* Backdrop – semi-transparent but not fully blocking */}
      <div
        className="fixed inset-0 z-[900] bg-black/40"
        onClick={skip}
        aria-hidden="true"
      />

      {/* Tour card */}
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="tour-title"
        style={{
          animation: exiting
            ? "tourFadeOut 0.18s ease forwards"
            : "tourFadeIn 0.22s ease forwards",
        }}
        className="fixed bottom-24 left-1/2 z-[901] w-[calc(100%-2rem)] max-w-sm -translate-x-1/2 rounded-2xl border border-white/20 bg-[#1A2B20] text-white shadow-2xl overflow-hidden"
      >
        {/* Top bar: step counter + close */}
        <div className="flex items-center justify-between px-4 pt-3.5 pb-2">
          <span className="text-[10px] font-bold tracking-widest text-emerald-400 uppercase">
            {stepIndex + 1}&nbsp;/&nbsp;{total}&nbsp;·&nbsp;{activeStep.category}
          </span>
          <button
            type="button"
            onClick={skip}
            aria-label="Bỏ qua hướng dẫn"
            className="rounded-lg p-1 text-white/50 hover:text-white hover:bg-white/10 transition-colors cursor-pointer"
          >
            <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" strokeWidth={2.5} stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        {/* Progress bar */}
        <div className="h-[3px] w-full bg-white/10">
          <div
            className="h-full bg-emerald-400 transition-all duration-300 ease-out"
            style={{ width: `${Math.round(((stepIndex + 1) / total) * 100)}%` }}
          />
        </div>

        {/* Content */}
        <div className="px-4 pt-3 pb-1 space-y-2">
          <h2 id="tour-title" className="text-[15px] font-bold leading-snug">
            {activeStep.title}
          </h2>
          <p className="text-[13px] text-white/75 leading-relaxed">
            {activeStep.body}
          </p>
          {activeStep.highlight && (
            <div className="rounded-lg bg-emerald-700/50 border border-emerald-500/40 px-3 py-2 text-[12px] text-emerald-200 leading-relaxed">
              {activeStep.highlight}
            </div>
          )}
        </div>

        {/* Footer buttons */}
        <div className="flex items-center justify-between px-4 py-3 mt-1">
          {/* Skip / Back on the left */}
          <div className="flex items-center gap-3">
            {stepIndex === 0 ? (
              <button
                type="button"
                onClick={skip}
                className="text-[12px] text-white/50 hover:text-white underline cursor-pointer"
              >
                Bỏ qua
              </button>
            ) : (
              <button
                type="button"
                onClick={back}
                className="flex items-center gap-1 rounded-lg border border-white/20 bg-white/10 px-3 py-1.5 text-[12px] font-semibold text-white hover:bg-white/20 transition-colors cursor-pointer"
              >
                ← Quay lại
              </button>
            )}
          </div>

          {/* Next / Finish on the right */}
          <button
            type="button"
            onClick={next}
            className="flex items-center gap-1.5 rounded-lg bg-emerald-500 px-4 py-1.5 text-[13px] font-bold text-white hover:bg-emerald-400 active:scale-95 transition-all cursor-pointer shadow-sm"
          >
            {isLast ? "Bắt đầu →" : "Tiếp →"}
          </button>
        </div>
      </div>

      <style>{`
        @keyframes tourFadeIn {
          from { opacity: 0; transform: translate(-50%, 16px); }
          to   { opacity: 1; transform: translate(-50%, 0); }
        }
        @keyframes tourFadeOut {
          from { opacity: 1; transform: translate(-50%, 0); }
          to   { opacity: 0; transform: translate(-50%, 12px); }
        }
      `}</style>
    </>
  );
}
