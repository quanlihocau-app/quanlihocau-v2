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
            <span className="absolute left-3.5 pointer-events-none text-[#555555]">
                <svg
                    className="h-4.5 w-4.5"
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
                className="h-10 w-full rounded-xs border border-[#CCCCCC] bg-white pl-10 pr-9 text-xs font-normal text-[#1A1A1A] placeholder:text-[#777777] transition-colors focus:bg-white focus:border-[#2C4C3B] focus:outline-none focus:ring-1 focus:ring-[#2C4C3B] font-serif shadow-none"
                {...props}
            />

            {/* Clear Button */}
            {value.length > 0 && (
                <button
                    type="button"
                    onClick={handleClear}
                    aria-label="Xóa tìm kiếm"
                    className="absolute right-2.5 flex h-5 w-5 items-center justify-center rounded-xs bg-[#F2F2F0] text-[#1A1A1A] hover:bg-[#EAEAE6] transition-colors cursor-pointer"
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
