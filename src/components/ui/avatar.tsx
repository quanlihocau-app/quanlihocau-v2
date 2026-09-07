import React from "react";

export interface AvatarProps extends React.HTMLAttributes<HTMLDivElement> {
    name?: string;
    src?: string | null;
    size?: "sm" | "md" | "lg" | "xl";
}

function getInitials(name?: string): string {
    if (!name) return "HC";
    const parts = name.trim().split(/\s+/);
    if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
    return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
}

export function Avatar({
    name,
    src,
    size = "md",
    className = "",
    ...props
}: AvatarProps) {
    const sizeClasses = {
        sm: "h-8 w-8 text-xs",
        md: "h-10 w-10 text-sm",
        lg: "h-12 w-12 text-base",
        xl: "h-14 w-14 text-lg",
    }[size];

    return (
        <div
            className={`relative inline-flex shrink-0 items-center justify-center overflow-hidden rounded-full border border-[#D5E5D1] bg-[#E8F3E5] font-bold text-[#246B38] select-none ${sizeClasses} ${className}`}
            {...props}
        >
            {src ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img
                    src={src}
                    alt={name || "Avatar"}
                    className="h-full w-full object-cover"
                />
            ) : (
                <span>{getInitials(name)}</span>
            )}
        </div>
    );
}
