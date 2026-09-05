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
            bg: "bg-[#E8F3ED] border-[#2D6A4F]/30 text-[#2D6A4F]",
            icon: (
                <svg className="h-5 w-5 text-[#2D6A4F] shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
            ),
        },
        warning: {
            bg: "bg-[#F8ECE2] border-[#9A4C16]/30 text-[#9A4C16]",
            icon: (
                <svg className="h-5 w-5 text-[#9A4C16] shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                </svg>
            ),
        },
        error: {
            bg: "bg-[#FAECEC] border-[#8B1E1E]/30 text-[#8B1E1E]",
            icon: (
                <svg className="h-5 w-5 text-[#8B1E1E] shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 14l2-2m0 0l2-2m-2 2l-2-2m2 2l2 2m7-2a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
            ),
        },
        info: {
            bg: "bg-[#EFE4CF] border-[#D9D2C8] text-[#27231F]",
            icon: (
                <svg className="h-5 w-5 text-[#8A5A20] shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
            ),
        },
    }[type];

    return (
        <div
            className={`flex items-start gap-3 rounded-2xl border p-3.5 text-xs ${config.bg} ${className}`}
        >
            {config.icon}
            <div className="space-y-0.5 flex-1">
                {title && <p className="font-bold text-[#27231F]">{title}</p>}
                <div className="font-normal leading-relaxed">{message}</div>
            </div>
        </div>
    );
}
