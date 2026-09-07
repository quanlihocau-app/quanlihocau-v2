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
            <div className="space-y-1.5 w-full">
                {label && (
                    <label
                        htmlFor={inputId}
                        className="block text-xs font-semibold text-[#17201A] uppercase tracking-wide"
                    >
                        {label}
                    </label>
                )}
                <input
                    id={inputId}
                    ref={ref}
                    className={`h-12 w-full rounded-2xl border bg-white px-4 text-sm font-normal text-[#17201A] placeholder:text-[#66716A]/60 focus:outline-none focus:ring-2 focus:ring-[#4F9D5A] focus:border-transparent transition-colors shadow-2xs ${
                        error
                            ? "border-[#D9534F] focus:ring-[#D9534F] bg-[#FCEEED]/30"
                            : "border-[#E3E8E3]"
                    } ${className}`}
                    {...props}
                />
                {error && <p className="text-xs font-medium text-[#D9534F]">{error}</p>}
                {helperText && !error && (
                    <p className="text-xs text-[#66716A]">{helperText}</p>
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
            <div className="space-y-1.5 w-full">
                {label && (
                    <label
                        htmlFor={selectId}
                        className="block text-xs font-semibold text-[#17201A] uppercase tracking-wide"
                    >
                        {label}
                    </label>
                )}
                <select
                    id={selectId}
                    ref={ref}
                    className={`h-12 w-full rounded-2xl border bg-white px-4 text-sm font-normal text-[#17201A] focus:outline-none focus:ring-2 focus:ring-[#4F9D5A] focus:border-transparent transition-colors cursor-pointer shadow-2xs ${
                        error
                            ? "border-[#D9534F] focus:ring-[#D9534F] bg-[#FCEEED]/30"
                            : "border-[#E3E8E3]"
                    } ${className}`}
                    {...props}
                >
                    {children}
                </select>
                {error && <p className="text-xs font-medium text-[#D9534F]">{error}</p>}
                {helperText && !error && (
                    <p className="text-xs text-[#66716A]">{helperText}</p>
                )}
            </div>
        );
    },
);

Select.displayName = "Select";
