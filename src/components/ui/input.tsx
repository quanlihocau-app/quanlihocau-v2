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
                    className={`h-11 w-full rounded-xs border bg-white px-3 text-sm font-normal text-[#1A1A1A] placeholder:text-[#777777] focus:outline-none focus:border-[#2C4C3B] focus:ring-1 focus:ring-[#2C4C3B] transition-colors font-serif shadow-none ${
                        error
                            ? "border-[#9E2A2B] focus:border-[#9E2A2B] focus:ring-[#9E2A2B] bg-[#FBEBEB]/40"
                            : "border-[#CCCCCC]"
                    } ${className}`}
                    {...props}
                />
                {error && <p className="text-xs font-semibold text-[#9E2A2B] font-serif">{error}</p>}
                {helperText && !error && (
                    <p className="text-xs text-[#555555] font-serif">{helperText}</p>
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
            <div className="space-y-1 w-full font-serif">
                {label && (
                    <label
                        htmlFor={selectId}
                        className="block text-xs font-bold text-[#1A1A1A] uppercase tracking-wide font-serif"
                    >
                        {label}
                    </label>
                )}
                <select
                    id={selectId}
                    ref={ref}
                    className={`h-11 w-full rounded-xs border bg-white px-3 text-sm font-normal text-[#1A1A1A] focus:outline-none focus:border-[#2C4C3B] focus:ring-1 focus:ring-[#2C4C3B] transition-colors cursor-pointer font-serif shadow-none ${
                        error
                            ? "border-[#9E2A2B] focus:border-[#9E2A2B] focus:ring-[#9E2A2B] bg-[#FBEBEB]/40"
                            : "border-[#CCCCCC]"
                    } ${className}`}
                    {...props}
                >
                    {children}
                </select>
                {error && <p className="text-xs font-semibold text-[#9E2A2B] font-serif">{error}</p>}
                {helperText && !error && (
                    <p className="text-xs text-[#555555] font-serif">{helperText}</p>
                )}
            </div>
        );
    },
);

Select.displayName = "Select";
