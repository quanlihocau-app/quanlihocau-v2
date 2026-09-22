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
        default: "bg-[#F1F5F9] text-[#0F172A] border border-[#E2E8F0]",
        success: "bg-[#DCFCE7] text-[#16A34A] border border-[#BBF7D0]",
        warning: "bg-[#FFFBEB] text-[#D97706] border border-[#FDE68A]",
        danger: "bg-[#FEF2F2] text-[#DC2626] border border-[#FECACA]",
        info: "bg-[#F0F9FF] text-[#0284C7] border border-[#BAE6FD]",
        neutral: "bg-[#F1F5F9] text-[#64748B] border border-[#E2E8F0]",
    }[variant];

    return (
        <span
            className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-0.5 text-[11px] font-bold tracking-normal font-serif ${variantClasses} ${className}`}
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
                        <span className="h-1.5 w-1.5 rounded-full bg-[#16A34A]" />
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
