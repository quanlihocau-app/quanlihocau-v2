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
                        className="block text-xs font-bold text-slate-700 uppercase tracking-wider"
                    >
                        {label}
                    </label>
                )}
                <input
                    id={inputId}
                    ref={ref}
                    className={`h-12 w-full rounded-xl border bg-white px-3.5 text-sm font-medium text-slate-900 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-[#102A43] focus:border-transparent transition-all duration-150 ${
                        error
                            ? "border-red-400 focus:ring-red-500 bg-red-50/20"
                            : "border-[#E2DDD2]"
                    } ${className}`}
                    {...props}
                />
                {error && <p className="text-xs font-semibold text-red-600">{error}</p>}
                {helperText && !error && (
                    <p className="text-[11px] text-slate-500">{helperText}</p>
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
                        className="block text-xs font-bold text-slate-700 uppercase tracking-wider"
                    >
                        {label}
                    </label>
                )}
                <select
                    id={selectId}
                    ref={ref}
                    className={`h-12 w-full rounded-xl border bg-white px-3.5 text-sm font-medium text-slate-900 focus:outline-none focus:ring-2 focus:ring-[#102A43] focus:border-transparent transition-all duration-150 cursor-pointer ${
                        error
                            ? "border-red-400 focus:ring-red-500 bg-red-50/20"
                            : "border-[#E2DDD2]"
                    } ${className}`}
                    {...props}
                >
                    {children}
                </select>
                {error && <p className="text-xs font-semibold text-red-600">{error}</p>}
                {helperText && !error && (
                    <p className="text-[11px] text-slate-500">{helperText}</p>
                )}
            </div>
        );
    },
);

Select.displayName = "Select";
