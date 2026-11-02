import React from "react";

export interface InputProps
    extends React.InputHTMLAttributes<HTMLInputElement> {
    label?: string;
    error?: string;
    helperText?: string;
}

/**
 * Input â€” Brand-standard text input.
 * 48px height, #E5E7EB border, focus ring #1B3B2B, sans-serif body text.
 */
export const Input = React.forwardRef<HTMLInputElement, InputProps>(
    ({ label, error, helperText, className = "", id, ...props }, ref) => {
        const inputId =
            id || (label ? label.toLowerCase().replace(/\s+/g, "-") : undefined);
        const resolvedInputMode =
            props.inputMode || (props.type === "number" ? "decimal" : undefined);

        return (
            <div className="flex flex-col gap-1.5 w-full">
                {label && (
                    <label
                        htmlFor={inputId}
                        className="text-sm font-medium text-[#111827]"
                    >
                        {label}
                    </label>
                )}
                <input
                    id={inputId}
                    ref={ref}
                    inputMode={resolvedInputMode}
                    className={[
                        "h-12 w-full rounded-lg border bg-white px-4",
                        "text-sm text-[#111827] placeholder:text-[#9CA3AF]",
                        "focus:outline-none focus:border-[#1B3B2B] focus:ring-1 focus:ring-[#1B3B2B]",
                        "transition-colors",
                        error
                            ? "border-[#B91C1C] bg-[#FEF2F2] text-[#B91C1C]"
                            : "border-[#E5E7EB]",
                        className,
                    ].join(" ")}
                    {...props}
                />
                {error && (
                    <p className="text-xs font-medium text-[#B91C1C]">{error}</p>
                )}
                {helperText && !error && (
                    <p className="text-xs text-[#4B5563]">{helperText}</p>
                )}
            </div>
        );
    },
);

Input.displayName = "Input";

export interface SelectProps
    extends React.SelectHTMLAttributes<HTMLSelectElement> {
    label?: string;
    error?: string;
    helperText?: string;
}

/**
 * Select â€” Brand-standard dropdown.
 * Same 48px height, matching border/focus design as Input.
 */
export const Select = React.forwardRef<HTMLSelectElement, SelectProps>(
    (
        { label, error, helperText, children, className = "", id, ...props },
        ref,
    ) => {
        const selectId =
            id || (label ? label.toLowerCase().replace(/\s+/g, "-") : undefined);

        return (
            <div className="flex flex-col gap-1.5 w-full">
                {label && (
                    <label
                        htmlFor={selectId}
                        className="text-sm font-medium text-[#111827]"
                    >
                        {label}
                    </label>
                )}
                <select
                    id={selectId}
                    ref={ref}
                    className={[
                        "h-12 w-full rounded-lg border bg-white px-4",
                        "text-sm text-[#111827]",
                        "focus:outline-none focus:border-[#1B3B2B] focus:ring-1 focus:ring-[#1B3B2B]",
                        "transition-colors cursor-pointer",
                        error
                            ? "border-[#B91C1C] bg-[#FEF2F2] text-[#B91C1C]"
                            : "border-[#E5E7EB]",
                        className,
                    ].join(" ")}
                    {...props}
                >
                    {children}
                </select>
                {error && (
                    <p className="text-xs font-medium text-[#B91C1C]">{error}</p>
                )}
                {helperText && !error && (
                    <p className="text-xs text-[#4B5563]">{helperText}</p>
                )}
            </div>
        );
    },
);

Select.displayName = "Select";

