"use client";

import { useEffect, useCallback } from "react";

interface UseModalDismissOptions {
    isOpen?: boolean;
    onClose: () => void;
    disabled?: boolean;
    closeOnEscape?: boolean;
    closeOnBackdrop?: boolean;
}

/**
 * Hook tối ưu tốc độ tương tác cho Modal & Popup:
 * 1. Bắt phím Escape đóng ngay lập tức (0ms).
 * 2. Khóa cuộn trang nền (body scroll lock) chống giật khung hình.
 * 3. Hỗ trợ onBackdropClick chạm vào nền ngoài là đóng ngay mà không cần bấm nút "✕".
 */
export function useModalDismiss({
    isOpen = true,
    onClose,
    disabled = false,
    closeOnEscape = true,
    closeOnBackdrop = true,
}: UseModalDismissOptions) {
    const handleKeyDown = useCallback(
        (e: KeyboardEvent) => {
            if (disabled || !closeOnEscape) return;
            if (e.key === "Escape") {
                e.preventDefault();
                e.stopPropagation();
                onClose();
            }
        },
        [onClose, disabled, closeOnEscape],
    );

    useEffect(() => {
        if (!isOpen) return;

        window.addEventListener("keydown", handleKeyDown);
        const originalOverflow = document.body.style.overflow;
        document.body.style.overflow = "hidden";

        return () => {
            window.removeEventListener("keydown", handleKeyDown);
            document.body.style.overflow = originalOverflow;
        };
    }, [isOpen, handleKeyDown]);

    const onBackdropClick = useCallback(
        (e: React.MouseEvent) => {
            if (e.target === e.currentTarget && !disabled && closeOnBackdrop) {
                onClose();
            }
        },
        [onClose, disabled, closeOnBackdrop],
    );

    return { onBackdropClick };
}

