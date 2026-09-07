import React from "react";

export interface BadgeProps extends React.HTMLAttributes<HTMLSpanElement> {
    variant?: "default" | "success" | "warning" | "danger" | "info" | "neutral";
    icon?: React.ReactNode;
}

export function Badge({
    children,
    variant = "default",
    icon,
    className = "",
    ...props
}: BadgeProps) {
    const variantClasses = {
        default: "bg-[#EEF3EB] text-[#17201A] border border-[#E3E8E3]",
        success: "bg-[#EBF6ED] text-[#246B38] border border-[#CDE8C7]",
        warning: "bg-[#FDF6E9] text-[#9A600B] border border-[#F6E1B6]",
        danger: "bg-[#FCEEED] text-[#AC3430] border border-[#F7CBC9]",
        info: "bg-[#EBF4FA] text-[#1A649B] border border-[#C6DFEF]",
        neutral: "bg-[#F7F9F5] text-[#66716A] border border-[#E3E8E3]",
    }[variant];

    return (
        <span
            className={`inline-flex items-center gap-1.5 rounded-full px-3 py-0.5 text-xs font-semibold tracking-tight ${variantClasses} ${className}`}
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
                    icon={
                        <span className="h-2 w-2 rounded-full bg-[#3E9B4F] animate-pulse" />
                    }
                >
                    Đang câu
                </Badge>
            );
        case "COMPLETED":
            return (
                <Badge
                    variant="neutral"
                    icon={
                        <svg className="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                        </svg>
                    }
                >
                    Đã hoàn thành
                </Badge>
            );
        case "CANCELLED":
            return (
                <Badge
                    variant="danger"
                    icon={
                        <svg className="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                        </svg>
                    }
                >
                    Đã hủy
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
                        <svg className="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
                        </svg>
                    }
                >
                    Tạm tính
                </Badge>
            );
        case "PAID":
            return (
                <Badge
                    variant="success"
                    icon={
                        <svg className="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                        </svg>
                    }
                >
                    Đã thanh toán
                </Badge>
            );
        case "PARTIALLY_PAID":
            return (
                <Badge
                    variant="info"
                    icon={
                        <svg className="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                        </svg>
                    }
                >
                    Thanh toán 1 phần
                </Badge>
            );
        case "VOIDED":
            return (
                <Badge
                    variant="danger"
                    icon={
                        <svg className="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                        </svg>
                    }
                >
                    Đã hủy (VOIDED)
                </Badge>
            );
        default:
            return <Badge variant="neutral">{status}</Badge>;
    }
}
