import React from "react";

export interface InputProps
    extends React.InputHTMLAttributes<HTMLInputElement> {
    label?: string;
    error?: string;
    helperText?: string;
}

export const Input = React.forwardRef<HTMLInputElement, InputProps>(
    ({ label, error, helperText, className = "", id, ...props }, ref) => {
        const inputId = id || (label ? label.toLowerCase().replace(/\s+/g, "-") : undefined);
        const resolvedInputMode = props.inputMode || (props.type === "number" ? "decimal" : undefined);

        return (
            <div className="space-y-1 w-full font-serif">
                {label && (
                    <label
                        htmlFor={inputId}
                        className="block text-xs font-bold text-[#111827] uppercase tracking-wide font-serif"
                    >
                        {label}
                    </label>
                )}
                <input
                    id={inputId}
                    ref={ref}
                    inputMode={resolvedInputMode}
                    className={`h-12 w-full rounded-lg border bg-white px-3.5 text-base font-normal text-[#111827] placeholder:text-[#9CA3AF] focus:outline-none focus:bg-white focus:border-[#1B3B2B] focus:ring-1 focus:ring-[#1B3B2B] transition-all font-serif ${
                        error
                            ? "border-[#B91C1C] focus:border-[#B91C1C] bg-[#FEF2F2]/50 text-[#B91C1C]"
                            : "border-[#E5E7EB]"
                    } ${className}`}
                    {...props}
                />
                {error && <p className="text-xs font-semibold text-[#B91C1C] font-serif">{error}</p>}
                {helperText && !error && (
                    <p className="text-xs text-[#4B5563] font-serif">{helperText}</p>
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

export const Select = React.forwardRef<HTMLSelectElement, SelectProps>(
    ({ label, error, helperText, children, className = "", id, ...props }, ref) => {
        const selectId = id || (label ? label.toLowerCase().replace(/\s+/g, "-") : undefined);

        return (
            <div className="space-y-1.5 w-full font-serif">
                {label && (
                    <label
                        htmlFor={selectId}
                        className="block text-xs font-bold text-[#111827] uppercase tracking-wide font-serif"
                    >
                        {label}
                    </label>
                )}
                <select
                    id={selectId}
                    ref={ref}
                    className={`h-12 w-full rounded-lg border bg-white px-3.5 text-base font-normal text-[#111827] focus:outline-none focus:bg-white focus:border-[#1B3B2B] focus:ring-1 focus:ring-[#1B3B2B] transition-all cursor-pointer font-serif ${
                        error
                            ? "border-[#B91C1C] focus:border-[#B91C1C] bg-[#FEF2F2]/50 text-[#B91C1C]"
                            : "border-[#E5E7EB]"
                    } ${className}`}
                    {...props}
                >
                    {children}
                </select>
                {error && <p className="text-xs font-semibold text-[#B91C1C] font-serif">{error}</p>}
                {helperText && !error && (
                    <p className="text-xs text-[#4B5563] font-serif">{helperText}</p>
                )}
            </div>
        );
    },
);

Select.displayName = "Select";
