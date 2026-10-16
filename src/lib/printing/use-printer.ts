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

    const [isStation, setIsStation] = useState<boolean>(printManager.isStation());

    useEffect(() => {
        const unsubscribe = printManager.subscribe((newStatus, newConfig, newTemplate) => {
            setStatus(newStatus);
            setConfig(newConfig);
            setTemplateConfig(newTemplate);
        });
        const unsubscribeStation = printManager.subscribeDeskStation((station) => {
            setIsStation(station);
        });
        void printManager.autoConnect();
        if (printManager.isStation()) {
            printManager.startDeskStationPolling();
        }
        const reconnect = () => { void printManager.autoConnect(); };
        window.addEventListener("focus", reconnect);
        const usbTimer = window.setInterval(() => { void printManager.refreshUsbConnection(); }, 5000);
        return () => {
            unsubscribe();
            unsubscribeStation();
            window.clearInterval(usbTimer);
            window.removeEventListener("focus", reconnect);
        };
    }, []);

    return {
        status,
        config,
        templateConfig,
        isNative,
        isStation,
        setDeskStation: (enabled: boolean) => printManager.setDeskStation(enabled),
        sendToCloudSpooler: (jobType: "SESSION_TICKET" | "PAYMENT_RECEIPT" | "TEST", targetName: string, payload: SessionTicketData | PaymentReceiptData | object) =>
            printManager.sendToCloudSpooler(jobType, targetName, payload),
        isConnected: printManager.isConnected(),
        connectWithConsent: (connectionType?: "USB" | "BLUETOOTH") => printManager.connectWithConsent(connectionType),
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
