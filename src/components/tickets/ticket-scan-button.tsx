"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Capacitor, registerPlugin } from "@capacitor/core";
import { parseTicketScan } from "@/lib/tickets/ticket-code";

interface TicketScannerPlugin {
    scan(): Promise<{ text?: string }>;
}

const scanner = registerPlugin<TicketScannerPlugin>("TicketScanner");

export function TicketScanButton() {
    const router = useRouter();
    const [message, setMessage] = useState("");

    async function scan() {
        setMessage("");
        try {
            if (!Capacitor.isNativePlatform()) {
                setMessage("Mở app Quản Lý Hồ Câu trên điện thoại để dùng camera.");
                return;
            }
            const result = await scanner.scan();
            const parsed = parseTicketScan(result.text || "");
            if (!parsed) {
                setMessage("Mã này không phải vé câu.");
                return;
            }
            router.push(`/sessions?sessionId=${parsed.sessionId}`);
        } catch (error) {
            setMessage(error instanceof Error ? error.message : "Không quét được vé.");
        }
    }

    return (
        <div className="mb-3">
            <button
                type="button"
                onClick={scan}
                className="min-h-12 rounded-xl bg-[#1B3B2B] px-4 text-sm font-bold text-white"
            >
                Quét vé
            </button>
            {message ? <p className="mt-2 text-sm text-rose-700">{message}</p> : null}
        </div>
    );
}
