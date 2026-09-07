"use client";

import React, { createContext, useContext, useMemo } from "react";
import { toast as sonnerToast } from "sonner";
import { Toaster } from "./sonner";

export type ToastType = "success" | "error" | "warning" | "info";

export interface ToastMessage {
    id: string;
    type: ToastType;
    message: string;
    description?: string;
}

interface ToastContextValue {
    showToast: (message: string, type?: ToastType, description?: string) => void;
    success: (message: string, description?: string) => void;
    error: (message: string, description?: string) => void;
    warning: (message: string, description?: string) => void;
    info: (message: string, description?: string) => void;
    promise: typeof sonnerToast.promise;
    loading: typeof sonnerToast.loading;
    dismiss: typeof sonnerToast.dismiss;
}

const ToastContext = createContext<ToastContextValue | null>(null);

/**
 * ToastProvider tích hợp Sonner Toaster tự động
 */
export function ToastProvider({ children }: { children: React.ReactNode }) {
    const value = useMemo<ToastContextValue>(() => ({
        showToast: (message: string, type: ToastType = "info", description?: string) => {
            if (type === "success") sonnerToast.success(message, { description });
            else if (type === "error") sonnerToast.error(message, { description });
            else if (type === "warning") sonnerToast.warning(message, { description });
            else sonnerToast.info(message, { description });
        },
        success: (message: string, description?: string) =>
            sonnerToast.success(message, { description }),
        error: (message: string, description?: string) =>
            sonnerToast.error(message, { description }),
        warning: (message: string, description?: string) =>
            sonnerToast.warning(message, { description }),
        info: (message: string, description?: string) =>
            sonnerToast.info(message, { description }),
        promise: sonnerToast.promise,
        loading: sonnerToast.loading,
        dismiss: sonnerToast.dismiss,
    }), []);

    return (
        <ToastContext.Provider value={value}>
            {children}
            <Toaster />
        </ToastContext.Provider>
    );
}

export function useToast() {
    const context = useContext(ToastContext);
    if (!context) {
        return {
            showToast: (msg: string) => sonnerToast(msg),
            success: (msg: string, desc?: string) => sonnerToast.success(msg, { description: desc }),
            error: (msg: string, desc?: string) => sonnerToast.error(msg, { description: desc }),
            warning: (msg: string, desc?: string) => sonnerToast.warning(msg, { description: desc }),
            info: (msg: string, desc?: string) => sonnerToast.info(msg, { description: desc }),
            promise: sonnerToast.promise,
            loading: sonnerToast.loading,
            dismiss: sonnerToast.dismiss,
        };
    }
    return context;
}

export { sonnerToast as toast };
