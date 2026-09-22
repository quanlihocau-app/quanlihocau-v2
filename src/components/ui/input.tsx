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

        return (
            <div className="space-y-1 w-full font-serif">
                {label && (
                    <label
                        htmlFor={inputId}
                        className="block text-xs font-bold text-[#1A1A1A] uppercase tracking-wide font-serif"
                    >
                        {label}
                    </label>
                )}
                <input
                    id={inputId}
                    ref={ref}
                    className={`h-12 w-full rounded-2xl border bg-[#F8FAFC] px-3.5 text-sm font-normal text-[#0F172A] placeholder:text-[#94A3B8] focus:outline-none focus:bg-white focus:border-2 focus:border-[#16A34A] transition-all font-serif shadow-2xs ${
                        error
                            ? "border-[#DC2626] focus:border-[#DC2626] bg-[#FEF2F2]/50 text-[#DC2626]"
                            : "border-[#CBD5E1]"
                    } ${className}`}
                    {...props}
                />
                {error && <p className="text-xs font-semibold text-[#DC2626] font-serif">{error}</p>}
                {helperText && !error && (
                    <p className="text-xs text-[#64748B] font-serif">{helperText}</p>
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
                        className="block text-xs font-bold text-[#0F172A] uppercase tracking-wide font-serif"
                    >
                        {label}
                    </label>
                )}
                <select
                    id={selectId}
                    ref={ref}
                    className={`h-12 w-full rounded-2xl border bg-[#F8FAFC] px-3.5 text-sm font-normal text-[#0F172A] focus:outline-none focus:bg-white focus:border-2 focus:border-[#16A34A] transition-all cursor-pointer font-serif shadow-2xs ${
                        error
                            ? "border-[#DC2626] focus:border-[#DC2626] bg-[#FEF2F2]/50 text-[#DC2626]"
                            : "border-[#CBD5E1]"
                    } ${className}`}
                    {...props}
                >
                    {children}
                </select>
                {error && <p className="text-xs font-semibold text-[#DC2626] font-serif">{error}</p>}
                {helperText && !error && (
                    <p className="text-xs text-[#64748B] font-serif">{helperText}</p>
                )}
            </div>
        );
    },
);

Select.displayName = "Select";
