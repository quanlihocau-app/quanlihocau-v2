"use client";

import React from "react";

export interface SearchBarProps
    extends Omit<React.InputHTMLAttributes<HTMLInputElement>, "onChange"> {
    value: string;
    onChange: (value: string) => void;
    placeholder?: string;
    onClear?: () => void;
    className?: string;
}

export function SearchBar({
    value,
    onChange,
    placeholder = "Tìm kiếm...",
    onClear,
    className = "",
    ...props
}: SearchBarProps) {
    const handleClear = () => {
        onChange("");
        onClear?.();
    };

    return (
        <div className={`relative flex items-center w-full font-serif ${className}`}>
            {/* Search Icon */}
            <span className="absolute left-3.5 pointer-events-none text-[#64748B]">
                <svg
                    className="h-4.5 w-4.5"
                    fill="none"
                    viewBox="0 0 24 24"
                    strokeWidth={2.2}
                    stroke="currentColor"
                >
                    <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        d="m21 21-5.197-5.197m0 0A7.5 7.5 0 1 0 5.196 5.196a7.5 7.5 0 0 0 10.607 10.607Z"
                    />
                </svg>
            </span>

            <input
                type="text"
                value={value}
                onChange={(e) => onChange(e.target.value)}
                placeholder={placeholder}
                className="h-12 w-full rounded-2xl border border-[#CBD5E1] bg-white pl-10 pr-9 text-xs font-normal text-[#0F172A] placeholder:text-[#94A3B8] transition-all focus:bg-white focus:border-2 focus:border-[#16A34A] focus:outline-none font-serif shadow-2xs"
                {...props}
            />

            {/* Clear Button */}
            {value.length > 0 && (
                <button
                    type="button"
                    onClick={handleClear}
                    aria-label="Xóa tìm kiếm"
                    className="absolute right-3 flex h-6 w-6 items-center justify-center rounded-full bg-slate-100 text-slate-600 hover:bg-slate-200 transition-colors cursor-pointer"
                >
                    <svg
                        className="h-3 w-3"
                        fill="none"
                        viewBox="0 0 24 24"
                        strokeWidth={2.5}
                        stroke="currentColor"
                    >
                        <path
                            strokeLinecap="round"
                            strokeLinejoin="round"
                            d="M6 18 18 6M6 6l12 12"
                        />
                    </svg>
                </button>
            )}
        </div>
    );
}
