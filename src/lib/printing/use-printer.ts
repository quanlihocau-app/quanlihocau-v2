"use client";

import { useEffect, useState } from "react";

import { printManager } from "./print-manager";
import {
    PaymentReceiptData,
    PrinterConfig,
    PrinterDevice,
    PrinterStatus,
    PrinterTemplateConfig,
    SessionTicketData,
} from "./types";

export function usePrinter() {
    const [status, setStatus] = useState<PrinterStatus>(printManager.getStatus());
    const [config, setConfig] = useState<PrinterConfig | null>(printManager.getConfig());
    const [templateConfig, setTemplateConfig] = useState<PrinterTemplateConfig>(printManager.getTemplateConfig());
    const isNative = printManager.isNative();

    useEffect(() => {
        const unsubscribe = printManager.subscribe((newStatus, newConfig, newTemplate) => {
            setStatus(newStatus);
            setConfig(newConfig);
            setTemplateConfig(newTemplate);
        });
        return unsubscribe;
    }, []);

    return {
        status,
        config,
        templateConfig,
        isNative,
        isConnected: printManager.isConnected(),
        scanBluetooth: () => printManager.scanBluetooth(),
        connectBluetooth: (device: PrinterDevice) => printManager.connectBluetooth(device),
        listUsbDevices: () => printManager.listUsbDevices(),
        connectUsb: (device: PrinterDevice) => printManager.connectUsb(device),
        connectWifi: (ip: string, port?: number, name?: string) => printManager.connectWifi(ip, port, name),
        disconnect: () => printManager.disconnect(),
        saveConfig: (newConfig: PrinterConfig) => printManager.saveConfig(newConfig),
        saveTemplateConfig: (newTemplate: PrinterTemplateConfig) => printManager.saveTemplateConfig(newTemplate),
        clearConfig: () => printManager.clearConfig(),
        printTest: () => printManager.printTest(),
        printSessionTicket: (data: SessionTicketData, options?: { jobId?: string; manual?: boolean }) =>
            printManager.printSessionTicket(data, options),
        printPaymentReceipt: (data: PaymentReceiptData, options?: { jobId?: string; manual?: boolean }) =>
            printManager.printPaymentReceipt(data, options),
    };
}
