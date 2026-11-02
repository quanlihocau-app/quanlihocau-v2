import React from "react";

export interface BadgeProps extends React.HTMLAttributes<HTMLSpanElement> {
    variant?: "default" | "success" | "warning" | "danger" | "info" | "neutral";
    icon?: React.ReactNode;
}

/**
 * Badge â€” Brand-standard status chip.
 * Clean 1px border, no heavy shadows. Text 12px semibold, readable for seniors.
 */
export function Badge({
    children,
    variant = "default",
    icon,
    className = "",
    ...props
}: BadgeProps) {
    const variantClasses = {
        default: "bg-[#E8F0EC] text-[#1B3B2B] border border-[#1B3B2B]/20",
        success: "bg-[#F0FDF4] text-[#166534] border border-[#166534]/20",
        warning: "bg-[#FFFBEB] text-[#92400E] border border-[#92400E]/20",
        danger:  "bg-[#FEF2F2] text-[#B91C1C] border border-[#B91C1C]/20",
        info:    "bg-[#EFF6FF] text-[#1E40AF] border border-[#1E40AF]/20",
        neutral: "bg-[#F8FAF8] text-[#4B5563] border border-[#E5E7EB]",
    }[variant];

    return (
        <span
            className={`inline-flex items-center gap-1.5 rounded-md px-2.5 py-0.5 text-xs font-semibold ${variantClasses} ${className}`}
            {...props}
        >
            {icon && <span className="shrink-0">{icon}</span>}
            <span>{children}</span>
        </span>
    );
}

export function SessionStatusBadge({ status }: { status: string }) {
    switch (status) {
        case "ACTIVE":
            return (
                <Badge
                    variant="success"
                    icon={<span className="h-1.5 w-1.5 rounded-md bg-[#166534]" />}
                >
                    Äang cÃ¢u
                </Badge>
            );
        case "COMPLETED":
            return (
                <Badge
                    variant="neutral"
                    icon={
                        <svg className="h-3 w-3" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                        </svg>
                    }
                >
                    ÄÃ£ hoÃ n thÃ nh
                </Badge>
            );
        case "CANCELLED":
            return (
                <Badge
                    variant="danger"
                    icon={
                        <svg className="h-3 w-3" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                        </svg>
                    }
                >
                    ÄÃ£ há»§y
                </Badge>
            );
        default:
            return <Badge variant="neutral">{status}</Badge>;
    }
}

export function InvoiceStatusBadge({ status }: { status: string }) {
    switch (status) {
        case "DRAFT":
            return (
                <Badge
                    variant="warning"
                    icon={
                        <svg className="h-3 w-3" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
                        </svg>
                    }
                >
                    Táº¡m tÃ­nh
                </Badge>
            );
        case "PAID":
            return (
                <Badge
                    variant="success"
                    icon={
                        <svg className="h-3 w-3" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                        </svg>
                    }
                >
                    ÄÃ£ thanh toÃ¡n
                </Badge>
            );
        case "PARTIALLY_PAID":
            return (
                <Badge
                    variant="info"
                    icon={
                        <svg className="h-3 w-3" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                        </svg>
                    }
                >
                    Thanh toÃ¡n 1 pháº§n
                </Badge>
            );
        case "VOIDED":
            return (
                <Badge
                    variant="danger"
                    icon={
                        <svg className="h-3 w-3" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                        </svg>
                    }
                >
                    ÄÃ£ há»§y (VOIDED)
                </Badge>
            );
        default:
            return <Badge variant="neutral">{status}</Badge>;
    }
}

