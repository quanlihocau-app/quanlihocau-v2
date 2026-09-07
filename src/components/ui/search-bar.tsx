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
        <div className={`relative flex items-center w-full ${className}`}>
            {/* Search Icon */}
            <span className="absolute left-4 pointer-events-none text-[#66716A]">
                <svg
                    className="h-5 w-5"
                    fill="none"
                    viewBox="0 0 24 24"
                    strokeWidth={2}
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
                className="h-12 w-full rounded-full border border-[#E3E8E3] bg-[#F7F9F5] pl-11 pr-11 text-sm font-normal text-[#17201A] placeholder:text-[#66716A] transition-colors focus:bg-white focus:border-[#4F9D5A] focus:outline-none focus:ring-2 focus:ring-[#4F9D5A]/20"
                {...props}
            />

            {/* Clear Button */}
            {value.length > 0 && (
                <button
                    type="button"
                    onClick={handleClear}
                    aria-label="Xóa tìm kiếm"
                    className="absolute right-3.5 flex h-6 w-6 items-center justify-center rounded-full bg-[#E3E8E3] text-[#66716A] hover:bg-[#D0D8CF] hover:text-[#17201A] transition-colors"
                >
                    <svg
                        className="h-3.5 w-3.5"
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
