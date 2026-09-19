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
        default: "bg-[#F2F2F0] text-[#1A1A1A] border border-[#CCCCCC]",
        success: "bg-[#EAEFEA] text-[#2C4C3B] border border-[#B8CEB8]",
        warning: "bg-[#FDF7EB] text-[#8C5C00] border border-[#E8D1A3]",
        danger: "bg-[#FBEBEB] text-[#9E2A2B] border border-[#E9B6B7]",
        info: "bg-[#EDF3F8] text-[#1F4E79] border border-[#B4CCE0]",
        neutral: "bg-[#F2F2F0] text-[#555555] border border-[#CCCCCC]",
    }[variant];

    return (
        <span
            className={`inline-flex items-center gap-1.5 rounded-xs px-2 py-0.5 text-[11px] font-bold tracking-normal font-serif ${variantClasses} ${className}`}
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
                        <span className="h-1.5 w-1.5 rounded-none bg-[#2C4C3B]" />
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
                        <svg className="h-3 w-3" fill="none" viewBox="0 0 24 24" stroke="currentColor">
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
                        <svg className="h-3 w-3" fill="none" viewBox="0 0 24 24" stroke="currentColor">
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
                        <svg className="h-3 w-3" fill="none" viewBox="0 0 24 24" stroke="currentColor">
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
                        <svg className="h-3 w-3" fill="none" viewBox="0 0 24 24" stroke="currentColor">
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
                        <svg className="h-3 w-3" fill="none" viewBox="0 0 24 24" stroke="currentColor">
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
                        <svg className="h-3 w-3" fill="none" viewBox="0 0 24 24" stroke="currentColor">
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
