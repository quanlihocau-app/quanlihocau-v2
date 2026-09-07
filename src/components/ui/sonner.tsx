"use client";

import { Toaster as Sonner, toast } from "sonner";

type ToasterProps = React.ComponentProps<typeof Sonner>;

/**
 * Mobile-first Toaster Component tối ưu cho Capacitor & Hybrid App
 * - Vị trí top-center: Tránh bị bàn phím ảo che khi mở biểu mẫu POS
 * - Safe area: Tự động thụt lề tránh tai thỏ (Notch) & Dynamic Island
 * - Hỗ trợ vuốt ngang tắt (Swipe to dismiss)
 * - Tự động thích ứng Dark Mode / Light Mode
 */
export function Toaster({ ...props }: ToasterProps) {
    return (
        <Sonner
            theme="system"
            className="toaster group"
            position="top-center"
            richColors
            closeButton
            expand={false}
            duration={3500}
            toastOptions={{
                classNames: {
                    toast:
                        "group toast group-[.toaster]:bg-white group-[.toaster]:text-[#17201A] group-[.toaster]:border-[#E3E8E3] group-[.toaster]:shadow-2xl group-[.toaster]:rounded-2xl group-[.toaster]:font-sans group-[.toaster]:text-sm group-[.toaster]:py-3.5 group-[.toaster]:px-4 dark:group-[.toaster]:bg-[#1E2420] dark:group-[.toaster]:text-[#F1F5F2] dark:group-[.toaster]:border-[#2E3B32]",
                    title: "font-bold text-sm tracking-tight",
                    description: "group-[.toast]:text-[#66716A] dark:group-[.toast]:text-[#9AA59D] text-xs font-normal mt-0.5",
                    actionButton:
                        "group-[.toast]:bg-[#246B38] group-[.toast]:text-white font-bold rounded-xl text-xs px-3 py-1.5",
                    cancelButton:
                        "group-[.toast]:bg-slate-100 group-[.toast]:text-[#17201A] rounded-xl text-xs px-3 py-1.5",
                    closeButton:
                        "!bg-white/90 dark:!bg-[#2A342D] !border-[#D1D8D2] dark:!border-[#3B473E] !text-[#66716A] hover:!text-[#17201A] !shadow-xs transition-all",
                    success: "!bg-[#F0FDF4] !text-[#14532D] !border-[#86EFAC] dark:!bg-[#143820] dark:!text-[#86EFAC] dark:!border-[#22543D]",
                    error: "!bg-[#FEF2F2] !text-[#7F1D1D] !border-[#FCA5A5] dark:!bg-[#3B1818] dark:!text-[#FCA5A5] dark:!border-[#5C2323]",
                    warning: "!bg-[#FFFBEB] !text-[#78350F] !border-[#FCD34D] dark:!bg-[#39240A] dark:!text-[#FCD34D] dark:!border-[#5B3E11]",
                    info: "!bg-[#EFF6FF] !text-[#1E3A8A] !border-[#93C5FD] dark:!bg-[#15233E] dark:!text-[#93C5FD] dark:!border-[#1E3A6C]",
                    loading: "!bg-white !text-[#17201A] !border-[#E3E8E3] dark:!bg-[#1E2420] dark:!text-[#F1F5F2] dark:!border-[#2E3B32]",
                },
                style: {
                    marginTop: "calc(env(safe-area-inset-top, 0px) + 10px)",
                },
            }}
            {...props}
        />
    );
}

export { toast };
