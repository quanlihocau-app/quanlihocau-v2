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
                        className="block text-xs font-semibold text-[#27231F] uppercase tracking-wide"
                    >
                        {label}
                    </label>
                )}
                <input
                    id={inputId}
                    ref={ref}
                    className={`h-12 w-full rounded-xl border bg-white px-3.5 text-sm font-normal text-[#27231F] placeholder:text-[#766F67]/60 focus:outline-none focus:ring-2 focus:ring-[#8A5A20] focus:border-transparent transition-colors ${
                        error
                            ? "border-[#8B1E1E] focus:ring-[#8B1E1E] bg-[#FAECEC]/30"
                            : "border-[#D9D2C8]"
                    } ${className}`}
                    {...props}
                />
                {error && <p className="text-xs font-semibold text-[#8B1E1E]">{error}</p>}
                {helperText && !error && (
                    <p className="text-xs text-[#766F67]">{helperText}</p>
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
                        className="block text-xs font-semibold text-[#27231F] uppercase tracking-wide"
                    >
                        {label}
                    </label>
                )}
                <select
                    id={selectId}
                    ref={ref}
                    className={`h-12 w-full rounded-xl border bg-white px-3.5 text-sm font-normal text-[#27231F] focus:outline-none focus:ring-2 focus:ring-[#8A5A20] focus:border-transparent transition-colors cursor-pointer ${
                        error
                            ? "border-[#8B1E1E] focus:ring-[#8B1E1E] bg-[#FAECEC]/30"
                            : "border-[#D9D2C8]"
                    } ${className}`}
                    {...props}
                >
                    {children}
                </select>
                {error && <p className="text-xs font-semibold text-[#8B1E1E]">{error}</p>}
                {helperText && !error && (
                    <p className="text-xs text-[#766F67]">{helperText}</p>
                )}
            </div>
        );
    },
);

Select.displayName = "Select";
