import React from "react";

export interface InlineAlertProps {
    type?: "success" | "warning" | "error" | "info";
    title?: string;
    message: React.ReactNode;
    className?: string;
}

export function InlineAlert({
    type = "info",
    title,
    message,
    className = "",
}: InlineAlertProps) {
    const config = {
        success: {
            bg: "bg-[#F0FDF4] border-[#86EFAC] text-[#16A34A]",
            icon: (
                <svg className="h-5 w-5 text-[#16A34A] shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
            ),
        },
        warning: {
            bg: "bg-[#FFFBEB] border-[#FDE68A] text-[#D97706]",
            icon: (
                <svg className="h-5 w-5 text-[#D97706] shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                </svg>
            ),
        },
        error: {
            bg: "bg-[#FEF2F2] border-[#FECACA] text-[#DC2626]",
            icon: (
                <svg className="h-5 w-5 text-[#DC2626] shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 14l2-2m0 0l2-2m-2 2l-2-2m2 2l2 2m7-2a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
            ),
        },
        info: {
            bg: "bg-[#F0FDF4] border-[#BBF7D0] text-[#16A34A]",
            icon: (
                <div className="h-5 w-5 rounded-full border-2 border-[#16A34A] flex items-center justify-center text-[#16A34A] shrink-0 text-xs font-bold">
                    i
                </div>
            ),
        },
    }[type];

    return (
        <div
            className={`flex items-start gap-3 rounded-2xl border p-4 text-xs font-serif ${config.bg} ${className}`}
        >
            {config.icon}
            <div className="space-y-0.5 flex-1 font-serif">
                {title && <p className="font-bold uppercase tracking-wide">{title}</p>}
                <div className="font-normal leading-relaxed">{message}</div>
            </div>
        </div>
    );
}
