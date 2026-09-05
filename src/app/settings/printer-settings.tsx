"use client";

import { useState } from "react";

import { usePrinter } from "@/lib/printing/use-printer";
import {
    PrinterConnectionType,
    PrinterDevice,
    PrinterTemplateConfig,
} from "@/lib/printing/types";

import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input, Select } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { InlineAlert } from "@/components/ui/inline-alert";

export function PrinterSettingsSection() {
    const {
        status,
        config,
        templateConfig,
        isConnected,
        scanBluetooth,
        connectBluetooth,
        listUsbDevices,
        connectUsb,
        connectWifi,
        disconnect,
        saveTemplateConfig,
        printTest,
    } = usePrinter();

    // Local form states for template settings
    const [headerTitle, setHeaderTitle] = useState(templateConfig.headerTitle);
    const [footerNote, setFooterNote] = useState(templateConfig.footerNote);
    const [copiesCount, setCopiesCount] = useState(templateConfig.copiesCount);
    const [paperWidthMm, setPaperWidthMm] = useState<58 | 80>(templateConfig.paperWidthMm);

    // Active connection modal
    const [activeTab, setActiveTab] = useState<PrinterConnectionType | null>(null);

    // Bluetooth states
    const [btDevices, setBtDevices] = useState<PrinterDevice[]>([]);
    const [scanningBt, setScanningBt] = useState(false);
    const [connectingBtAddress, setConnectingBtAddress] = useState<string | null>(null);

    // USB states
    const [usbDevicesList, setUsbDevicesList] = useState<PrinterDevice[]>([]);
    const [scanningUsb, setScanningUsb] = useState(false);
    const [connectingUsbId, setConnectingUsbId] = useState<string | null>(null);

    // Wi-Fi states
    const [wifiIp, setWifiIp] = useState(
        config?.connectionType === "WIFI" ? config.device.address : "192.168.1.200",
    );
    const [wifiPort, setWifiPort] = useState(
        config?.connectionType === "WIFI" ? (config.device.port || 9100) : 9100,
    );
    const [connectingWifi, setConnectingWifi] = useState(false);

    // Test print & status states
    const [testingPrint, setTestingPrint] = useState(false);
    const [alertMessage, setAlertMessage] = useState<{
        type: "success" | "error" | "info" | "warning";
        text: string;
    } | null>(null);
    const [showHelp, setShowHelp] = useState(false);

    // Template update helper
    function updateTemplate(partial: Partial<PrinterTemplateConfig>, successMsg?: string) {
        const next: PrinterTemplateConfig = { ...templateConfig, ...partial };
        saveTemplateConfig(next);
        if (successMsg) {
            setAlertMessage({ type: "success", text: successMsg });
            setTimeout(() => setAlertMessage(null), 3000);
        }
    }

    // 1. Bluetooth Scan & Connect
    async function handleScanBluetooth() {
        setScanningBt(true);
        setAlertMessage(null);
        try {
            const devices = await scanBluetooth();
            setBtDevices(devices);
            if (devices.length === 0) {
                setAlertMessage({
                    type: "info",
                    text: "Không tìm thấy thiết bị Bluetooth đã ghép đôi. Vui lòng vào Cài đặt Android > Bluetooth để ghép đôi máy in trước.",
                });
            }
        } catch (err: unknown) {
            const msg = err instanceof Error ? err.message : "Lỗi khi quét Bluetooth.";
            setAlertMessage({ type: "error", text: msg });
        } finally {
            setScanningBt(false);
        }
    }

    async function handleConnectBluetooth(device: PrinterDevice) {
        setConnectingBtAddress(device.address);
        setAlertMessage(null);
        try {
            const ok = await connectBluetooth(device);
            if (ok) {
                setAlertMessage({
                    type: "success",
                    text: `Đã kết nối thành công với ${device.name}!`,
                });
                setActiveTab(null);
            } else {
                setAlertMessage({
                    type: "error",
                    text: "Không thể kết nối máy in Bluetooth. Vui lòng kiểm tra lại thiết bị.",
                });
            }
        } catch (err: unknown) {
            const msg = err instanceof Error ? err.message : "Lỗi kết nối Bluetooth.";
            setAlertMessage({ type: "error", text: msg });
        } finally {
            setConnectingBtAddress(null);
        }
    }

    // 2. USB Scan & Connect
    async function handleListUsb() {
        setScanningUsb(true);
        setAlertMessage(null);
        try {
            const devices = await listUsbDevices();
            setUsbDevicesList(devices);
            if (devices.length === 0) {
                setAlertMessage({
                    type: "info",
                    text: "Không phát hiện máy in cắm qua cáp USB-OTG. Vui lòng kiểm tra cáp và nguồn máy in.",
                });
            }
        } catch (err: unknown) {
            const msg = err instanceof Error ? err.message : "Lỗi khi nhận diện thiết bị USB.";
            setAlertMessage({ type: "error", text: msg });
        } finally {
            setScanningUsb(false);
        }
    }

    async function handleConnectUsb(device: PrinterDevice) {
        setConnectingUsbId(device.id);
        setAlertMessage(null);
        try {
            const ok = await connectUsb(device);
            if (ok) {
                setAlertMessage({
                    type: "success",
                    text: `Đã kết nối máy in USB ${device.name}!`,
                });
                setActiveTab(null);
            } else {
                setAlertMessage({
                    type: "error",
                    text: "Không thể kết nối máy in USB. Vui lòng kiểm tra lại cáp và quyền truy cập thiết bị.",
                });
            }
        } catch (err: unknown) {
            const msg = err instanceof Error ? err.message : "Lỗi kết nối USB.";
            setAlertMessage({ type: "error", text: msg });
        } finally {
            setConnectingUsbId(null);
        }
    }

    // 3. Wi-Fi / LAN Connect
    async function handleConnectWifi(e: React.FormEvent) {
        e.preventDefault();
        setConnectingWifi(true);
        setAlertMessage(null);
        try {
            const ok = await connectWifi(wifiIp.trim(), Number(wifiPort) || 9100);
            if (ok) {
                setAlertMessage({
                    type: "success",
                    text: `Đã kết nối máy in Wi-Fi (${wifiIp}:${wifiPort}) thành công!`,
                });
                setActiveTab(null);
            } else {
                setAlertMessage({
                    type: "error",
                    text: "Không thể kết nối máy in qua IP. Vui lòng kiểm tra lại địa chỉ IP và cổng mạng.",
                });
            }
        } catch (err: unknown) {
            const msg = err instanceof Error ? err.message : "Lỗi kết nối Wi-Fi.";
            setAlertMessage({ type: "error", text: msg });
        } finally {
            setConnectingWifi(false);
        }
    }

    // Disconnect
    async function handleDisconnect() {
        setAlertMessage(null);
        try {
            await disconnect();
            setAlertMessage({
                type: "info",
                text: "Đã ngắt kết nối máy in.",
            });
        } catch (err: unknown) {
            const msg = err instanceof Error ? err.message : "Lỗi khi ngắt kết nối.";
            setAlertMessage({ type: "error", text: msg });
        }
    }

    // Test print
    async function handleTestPrint() {
        setTestingPrint(true);
        setAlertMessage(null);
        try {
            const res = await printTest();
            if (res.success) {
                setAlertMessage({
                    type: "success",
                    text: "Đã gửi lệnh in test thành công đến máy in nhiệt!",
                });
            } else {
                setAlertMessage({
                    type: "error",
                    text: res.error || "Không thể in thử. Vui lòng kiểm tra kết nối máy in.",
                });
            }
        } catch (err: unknown) {
            const msg = err instanceof Error ? err.message : "Lỗi khi in thử.";
            setAlertMessage({ type: "error", text: msg });
        } finally {
            setTestingPrint(false);
        }
    }

    return (
        <div className="space-y-6">
            <div>
                <h2 className="text-sm font-semibold uppercase tracking-wide text-[#27231F]">
                    Máy in nhiệt & Mẫu vé
                </h2>
                <p className="text-xs text-[#766F67] mt-0.5">
                    Hỗ trợ in nhiệt thật trên Android qua Bluetooth, USB-OTG hoặc Wi-Fi/LAN ESC/POS.
                </p>
            </div>

            {alertMessage && (
                <InlineAlert type={alertMessage.type} message={alertMessage.text} />
            )}

            {/* NHÓM 1: KẾT NỐI MÁY IN */}
            <Card className="p-5 sm:p-6 space-y-4">
                <div className="flex flex-col justify-between gap-3 sm:flex-row sm:items-center border-b border-[#D9D2C8] pb-4">
                    <div>
                        <div className="flex items-center gap-2">
                            <h2 className="text-base font-bold text-[#27231F]">
                                Kết nối máy in
                            </h2>
                            {isConnected ? (
                                <Badge variant="success">Đã kết nối</Badge>
                            ) : status === "connecting" ? (
                                <Badge variant="warning">Đang kết nối…</Badge>
                            ) : status === "error" ? (
                                <Badge variant="danger">Lỗi kết nối</Badge>
                            ) : (
                                <Badge variant="default">Chưa kết nối</Badge>
                            )}
                        </div>
                        <p className="text-xs text-[#766F67] mt-0.5">
                            Quản lý kết nối Bluetooth Classic/SPP, USB-OTG và Wi-Fi/LAN ESC/POS.
                        </p>
                    </div>

                    <button
                        type="button"
                        onClick={() => setShowHelp(!showHelp)}
                        className="inline-flex h-9 items-center gap-1.5 rounded-lg border border-[#D9D2C8] bg-white px-3 text-xs font-semibold text-[#27231F] hover:bg-[#F4F2EE] transition-colors self-start sm:self-auto cursor-pointer"
                        aria-label="Hướng dẫn kết nối máy in"
                        aria-expanded={showHelp}
                    >
                        <span className="flex h-4 w-4 items-center justify-center rounded-full bg-[#8A5A20] text-[10px] text-white">?</span>
                        <span>{showHelp ? "Ẩn trợ giúp" : "Hướng dẫn"}</span>
                    </button>
                </div>

                {showHelp && (
                    <div className="rounded-2xl border border-[#2D6A4F]/30 bg-[#E8F3ED] p-4 text-xs text-[#27231F] space-y-2">
                        <p className="font-bold text-[#2D6A4F]">
                            💡 Hướng dẫn kết nối máy in nhiệt bỏ túi (PT210, Xprinter, v.v.):
                        </p>
                        <ul className="list-disc list-inside space-y-1 text-xs text-[#27231F] leading-relaxed">
                            <li><strong>Bluetooth (Khuyên dùng):</strong> Bật nguồn máy in, mở Cài đặt Android &gt; Bluetooth &gt; Ghép đôi thiết bị (mật mã 0000 hoặc 1234), rồi bấm &ldquo;Quét Bluetooth&rdquo;.</li>
                            <li><strong>USB-OTG:</strong> Cắm dây cáp máy in vào điện thoại qua đầu chuyển OTG, bấm &ldquo;Quét USB&rdquo; và chọn &ldquo;Cho phép&rdquo; trên thông báo Android.</li>
                            <li><strong>Wi-Fi/LAN:</strong> Nhập địa chỉ IP nội bộ của máy in (ví dụ: 192.168.1.200) và cổng 9100.</li>
                            <li><em>Lưu ý:</em> Trình duyệt web trên máy tính/iPhone hỗ trợ in chuẩn qua hộp thoại in của hệ điều hành.</li>
                        </ul>
                    </div>
                )}

                {/* Device Info & Status Row */}
                {config && (
                    <div className="rounded-xl border border-[#D9D2C8] bg-[#F4F2EE] p-4 flex flex-col justify-between gap-3 sm:flex-row sm:items-center text-xs">
                        <div>
                            <span className="text-[#766F67]">Máy in đang chọn:</span>{" "}
                            <strong className="text-[#27231F] font-bold">{config.device.name}</strong>
                            <span className="ml-2 font-mono text-[11px] text-[#766F67]">({config.connectionType} • {config.device.address})</span>
                        </div>
                        <div className="flex items-center gap-2">
                            {isConnected ? (
                                <Button
                                    type="button"
                                    size="sm"
                                    variant="danger"
                                    onClick={handleDisconnect}
                                >
                                    Ngắt kết nối
                                </Button>
                            ) : (
                                <Button
                                    type="button"
                                    size="sm"
                                    variant="outline"
                                    onClick={() => {
                                        if (config.connectionType === "BLUETOOTH") handleConnectBluetooth(config.device);
                                        else if (config.connectionType === "USB") handleConnectUsb(config.device);
                                        else if (config.connectionType === "WIFI") connectWifi(config.device.address, config.device.port);
                                    }}
                                >
                                    Kết nối lại
                                </Button>
                            )}
                        </div>
                    </div>
                )}

                {/* Connection Transport Selection Grid */}
                <div className="grid grid-cols-1 gap-3 sm:grid-cols-3 pt-1">
                    <Button
                        type="button"
                        size="lg"
                        variant={config?.connectionType === "BLUETOOTH" ? "primary" : "outline"}
                        onClick={() => {
                            setActiveTab("BLUETOOTH");
                            handleScanBluetooth();
                        }}
                    >
                        Quét Bluetooth
                    </Button>

                    <Button
                        type="button"
                        size="lg"
                        variant={config?.connectionType === "USB" ? "primary" : "outline"}
                        onClick={() => {
                            setActiveTab("USB");
                            handleListUsb();
                        }}
                    >
                        Quét USB-OTG
                    </Button>

                    <Button
                        type="button"
                        size="lg"
                        variant={config?.connectionType === "WIFI" ? "primary" : "outline"}
                        onClick={() => setActiveTab("WIFI")}
                    >
                        Thiết lập Wi-Fi / LAN
                    </Button>
                </div>
            </Card>

            {/* NHÓM 2: NỘI DUNG VÉ / BIÊN LAI */}
            <Card className="p-5 sm:p-6 space-y-1">
                <div className="border-b border-[#D9D2C8] pb-3 mb-2">
                    <h2 className="text-base font-bold text-[#27231F]">
                        Nội dung vé / biên lai
                    </h2>
                    <p className="text-xs text-[#766F67] mt-0.5">
                        Tùy chỉnh các thông tin hiển thị trên mẫu in nhiệt và chế độ in tự động.
                    </p>
                </div>

                {/* Hàng 1: Tiêu đề hóa đơn */}
                <div className="flex flex-col justify-between gap-3 py-4 border-b border-[#D9D2C8] sm:flex-row sm:items-center">
                    <div className="space-y-0.5">
                        <label htmlFor="header-title-input" className="text-xs font-semibold text-[#27231F] block">
                            Tiêu đề hóa đơn
                        </label>
                        <p className="text-xs text-[#766F67]">
                            Dòng chữ in lớn ở phần đầu vé (Mặc định: &ldquo;Vé câu&rdquo;).
                        </p>
                    </div>
                    <div className="flex items-center gap-2 w-full sm:w-80">
                        <input
                            id="header-title-input"
                            type="text"
                            value={headerTitle}
                            onChange={(e) => setHeaderTitle(e.target.value)}
                            className="h-12 w-full rounded-xl border border-[#D9D2C8] bg-white px-3 text-xs font-medium text-[#27231F] focus:border-[#8A5A20] focus:ring-2 focus:ring-[#8A5A20] focus:outline-none"
                            placeholder="Vé câu"
                        />
                        <Button
                            type="button"
                            size="md"
                            variant="outline"
                            onClick={() => updateTemplate({ headerTitle }, "Đã lưu tiêu đề hóa đơn!")}
                        >
                            Lưu
                        </Button>
                    </div>
                </div>

                {/* Hàng 2: Nội dung cuối hóa đơn */}
                <div className="flex flex-col justify-between gap-3 py-4 border-b border-[#D9D2C8] sm:flex-row sm:items-center">
                    <div className="space-y-0.5">
                        <label htmlFor="footer-note-input" className="text-xs font-semibold text-[#27231F] block">
                            Nội dung cuối hóa đơn
                        </label>
                        <p className="text-xs text-[#766F67]">
                            Lời cảm ơn hoặc thông báo in ở chân vé.
                        </p>
                    </div>
                    <div className="flex items-center gap-2 w-full sm:w-80">
                        <input
                            id="footer-note-input"
                            type="text"
                            value={footerNote}
                            onChange={(e) => setFooterNote(e.target.value)}
                            className="h-12 w-full rounded-xl border border-[#D9D2C8] bg-white px-3 text-xs font-medium text-[#27231F] focus:border-[#8A5A20] focus:ring-2 focus:ring-[#8A5A20] focus:outline-none"
                            placeholder="Cảm ơn quý khách & Hẹn gặp lại!"
                        />
                        <Button
                            type="button"
                            size="md"
                            variant="outline"
                            onClick={() => updateTemplate({ footerNote }, "Đã lưu nội dung cuối hóa đơn!")}
                        >
                            Lưu
                        </Button>
                    </div>
                </div>

                {/* Hàng 3: Hiện tên hồ */}
                <div className="flex items-center justify-between py-4 border-b border-[#D9D2C8]">
                    <div className="space-y-0.5 pr-4">
                        <p className="text-xs font-semibold text-[#27231F]">Hiện tên hồ</p>
                        <p className="text-xs text-[#766F67]">In tên hồ câu ở đầu phiếu.</p>
                    </div>
                    <button
                        type="button"
                        role="switch"
                        aria-checked={templateConfig.showLakeName}
                        onClick={() => updateTemplate({ showLakeName: !templateConfig.showLakeName })}
                        className={`relative inline-flex h-7 w-12 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none focus:ring-2 focus:ring-[#8A5A20] ${
                            templateConfig.showLakeName ? "bg-[#8A5A20]" : "bg-[#D9D2C8]"
                        }`}
                    >
                        <span
                            className={`pointer-events-none inline-block h-6 w-6 transform rounded-full bg-white shadow-sm ring-0 transition duration-200 ease-in-out ${
                                templateConfig.showLakeName ? "translate-x-5" : "translate-x-0"
                            }`}
                        />
                    </button>
                </div>

                {/* Hàng 4: Hiện logo hồ */}
                <div className="flex items-center justify-between py-4 border-b border-[#D9D2C8]">
                    <div className="space-y-0.5 pr-4">
                        <p className="text-xs font-semibold text-[#27231F]">Hiện logo hồ</p>
                        <p className="text-xs text-[#766F67]">In logo monochrome nếu máy in hỗ trợ.</p>
                    </div>
                    <button
                        type="button"
                        role="switch"
                        aria-checked={templateConfig.showLogo}
                        onClick={() => updateTemplate({ showLogo: !templateConfig.showLogo })}
                        className={`relative inline-flex h-7 w-12 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none focus:ring-2 focus:ring-[#8A5A20] ${
                            templateConfig.showLogo ? "bg-[#8A5A20]" : "bg-[#D9D2C8]"
                        }`}
                    >
                        <span
                            className={`pointer-events-none inline-block h-6 w-6 transform rounded-full bg-white shadow-sm ring-0 transition duration-200 ease-in-out ${
                                templateConfig.showLogo ? "translate-x-5" : "translate-x-0"
                            }`}
                        />
                    </button>
                </div>

                {/* Hàng 5: Hiện số điện thoại hồ */}
                <div className="flex items-center justify-between py-4 border-b border-[#D9D2C8]">
                    <div className="space-y-0.5 pr-4">
                        <p className="text-xs font-semibold text-[#27231F]">Hiện số điện thoại hồ</p>
                        <p className="text-xs text-[#766F67]">In hotline liên hệ của hồ câu.</p>
                    </div>
                    <button
                        type="button"
                        role="switch"
                        aria-checked={templateConfig.showPhone}
                        onClick={() => updateTemplate({ showPhone: !templateConfig.showPhone })}
                        className={`relative inline-flex h-7 w-12 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none focus:ring-2 focus:ring-[#8A5A20] ${
                            templateConfig.showPhone ? "bg-[#8A5A20]" : "bg-[#D9D2C8]"
                        }`}
                    >
                        <span
                            className={`pointer-events-none inline-block h-6 w-6 transform rounded-full bg-white shadow-sm ring-0 transition duration-200 ease-in-out ${
                                templateConfig.showPhone ? "translate-x-5" : "translate-x-0"
                            }`}
                        />
                    </button>
                </div>

                {/* Hàng 6: Hiện địa chỉ hồ */}
                <div className="flex items-center justify-between py-4 border-b border-[#D9D2C8]">
                    <div className="space-y-0.5 pr-4">
                        <p className="text-xs font-semibold text-[#27231F]">Hiện địa chỉ hồ</p>
                        <p className="text-xs text-[#766F67]">In địa chỉ vị trí hồ câu.</p>
                    </div>
                    <button
                        type="button"
                        role="switch"
                        aria-checked={templateConfig.showAddress}
                        onClick={() => updateTemplate({ showAddress: !templateConfig.showAddress })}
                        className={`relative inline-flex h-7 w-12 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none focus:ring-2 focus:ring-[#8A5A20] ${
                            templateConfig.showAddress ? "bg-[#8A5A20]" : "bg-[#D9D2C8]"
                        }`}
                    >
                        <span
                            className={`pointer-events-none inline-block h-6 w-6 transform rounded-full bg-white shadow-sm ring-0 transition duration-200 ease-in-out ${
                                templateConfig.showAddress ? "translate-x-5" : "translate-x-0"
                            }`}
                        />
                    </button>
                </div>

                {/* Hàng 7: Hiện tên nhân viên bán hàng */}
                <div className="flex items-center justify-between py-4 border-b border-[#D9D2C8]">
                    <div className="space-y-0.5 pr-4">
                        <p className="text-xs font-semibold text-[#27231F]">Hiện tên nhân viên bán hàng</p>
                        <p className="text-xs text-[#766F67]">In tên tài khoản thu ngân lập phiếu.</p>
                    </div>
                    <button
                        type="button"
                        role="switch"
                        aria-checked={templateConfig.showCashierName}
                        onClick={() => updateTemplate({ showCashierName: !templateConfig.showCashierName })}
                        className={`relative inline-flex h-7 w-12 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none focus:ring-2 focus:ring-[#8A5A20] ${
                            templateConfig.showCashierName ? "bg-[#8A5A20]" : "bg-[#D9D2C8]"
                        }`}
                    >
                        <span
                            className={`pointer-events-none inline-block h-6 w-6 transform rounded-full bg-white shadow-sm ring-0 transition duration-200 ease-in-out ${
                                templateConfig.showCashierName ? "translate-x-5" : "translate-x-0"
                            }`}
                        />
                    </button>
                </div>

                {/* Hàng 8: Tự in vé sau khi tạo phiên thành công */}
                <div className="flex items-center justify-between py-4 border-b border-[#D9D2C8]">
                    <div className="space-y-0.5 pr-4">
                        <p className="text-xs font-semibold text-[#27231F]">Tự in vé sau khi tạo phiên thành công</p>
                        <p className="text-xs text-[#766F67]">Tự động phát lệnh in vé câu khi mở phiên nếu có máy in kết nối.</p>
                    </div>
                    <button
                        type="button"
                        role="switch"
                        aria-checked={templateConfig.autoPrintSession}
                        onClick={() => updateTemplate({ autoPrintSession: !templateConfig.autoPrintSession })}
                        className={`relative inline-flex h-7 w-12 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none focus:ring-2 focus:ring-[#8A5A20] ${
                            templateConfig.autoPrintSession ? "bg-[#8A5A20]" : "bg-[#D9D2C8]"
                        }`}
                    >
                        <span
                            className={`pointer-events-none inline-block h-6 w-6 transform rounded-full bg-white shadow-sm ring-0 transition duration-200 ease-in-out ${
                                templateConfig.autoPrintSession ? "translate-x-5" : "translate-x-0"
                            }`}
                        />
                    </button>
                </div>

                {/* Hàng 9: Tự in biên lai sau khi thanh toán thành công */}
                <div className="flex items-center justify-between py-4 border-b border-[#D9D2C8]">
                    <div className="space-y-0.5 pr-4">
                        <p className="text-xs font-semibold text-[#27231F]">Tự in biên lai sau khi thanh toán thành công</p>
                        <p className="text-xs text-[#766F67]">Tự động in phiếu thu tiền khi nhân viên bấm thu tiền thành công.</p>
                    </div>
                    <button
                        type="button"
                        role="switch"
                        aria-checked={templateConfig.autoPrintPayment}
                        onClick={() => updateTemplate({ autoPrintPayment: !templateConfig.autoPrintPayment })}
                        className={`relative inline-flex h-7 w-12 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none focus:ring-2 focus:ring-[#8A5A20] ${
                            templateConfig.autoPrintPayment ? "bg-[#8A5A20]" : "bg-[#D9D2C8]"
                        }`}
                    >
                        <span
                            className={`pointer-events-none inline-block h-6 w-6 transform rounded-full bg-white shadow-sm ring-0 transition duration-200 ease-in-out ${
                                templateConfig.autoPrintPayment ? "translate-x-5" : "translate-x-0"
                            }`}
                        />
                    </button>
                </div>

                {/* Hàng 10: Khổ giấy */}
                <div className="flex flex-col justify-between gap-3 py-4 border-b border-[#D9D2C8] sm:flex-row sm:items-center">
                    <div className="space-y-0.5">
                        <p className="text-xs font-semibold text-[#27231F]">Khổ giấy</p>
                        <p className="text-xs text-[#766F67]">
                            Chọn độ rộng giấy in nhiệt (58 mm cho máy in bỏ túi, 80 mm cho máy để bàn).
                        </p>
                    </div>
                    <div className="w-full sm:w-48">
                        <Select
                            id="paper-width-select"
                            value={paperWidthMm.toString()}
                            onChange={(e) => {
                                const val = Number(e.target.value) as 58 | 80;
                                setPaperWidthMm(val);
                                updateTemplate({ paperWidthMm: val }, "Đã cập nhật khổ giấy in!");
                            }}
                        >
                            <option value="58">58 mm (32 ký tự)</option>
                            <option value="80">80 mm (48 ký tự)</option>
                        </Select>
                    </div>
                </div>

                {/* Hàng 11: Số bản in */}
                <div className="flex flex-col justify-between gap-3 py-4 border-b border-[#D9D2C8] sm:flex-row sm:items-center">
                    <div className="space-y-0.5">
                        <label htmlFor="copies-count-input" className="text-xs font-semibold text-[#27231F] block">
                            Số bản in
                        </label>
                        <p className="text-xs text-[#766F67]">
                            Số lượng liên in mỗi lần (từ 1 đến 3 bản).
                        </p>
                    </div>
                    <div className="flex items-center gap-2 w-full sm:w-48">
                        <input
                            id="copies-count-input"
                            type="number"
                            min={1}
                            max={3}
                            value={copiesCount}
                            onChange={(e) => setCopiesCount(Math.min(3, Math.max(1, Number(e.target.value))))}
                            className="h-12 w-full rounded-xl border border-[#D9D2C8] bg-white px-3 text-xs font-semibold text-[#27231F] text-center focus:border-[#8A5A20] focus:ring-2 focus:ring-[#8A5A20] focus:outline-none"
                        />
                        <Button
                            type="button"
                            size="md"
                            variant="outline"
                            onClick={() => updateTemplate({ copiesCount }, "Đã lưu số bản in!")}
                        >
                            Lưu
                        </Button>
                    </div>
                </div>

                {/* Hàng 12: In thử */}
                <div className="flex flex-col justify-between gap-3 py-4 sm:flex-row sm:items-center">
                    <div className="space-y-0.5">
                        <p className="text-xs font-semibold text-[#27231F]">In thử phiếu test</p>
                        <p className="text-xs text-[#766F67]">
                            Kiểm tra kết nối và độ sắc nét của máy in nhiệt với nội dung mẫu.
                        </p>
                    </div>
                    <Button
                        type="button"
                        size="lg"
                        variant="primary"
                        isLoading={testingPrint}
                        loadingText="Đang in thử…"
                        onClick={handleTestPrint}
                        icon={
                            <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                                <path strokeLinecap="round" strokeLinejoin="round" d="M17 17h2a2 2 0 002-2v-4a2 2 0 00-2-2H5a2 2 0 00-2 2v4a2 2 0 002 2h2m2 4h6a2 2 0 002-2v-4a2 2 0 00-2-2H9a2 2 0 00-2 2v4a2 2 0 002 2zm8-12V5a2 2 0 00-2-2H9a2 2 0 00-2 2v4h10z" />
                            </svg>
                        }
                    >
                        In phiếu test
                    </Button>
                </div>
            </Card>

            {/* Modal: Bluetooth Connection */}
            {activeTab === "BLUETOOTH" && (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
                    <div className="w-full max-w-md rounded-2xl bg-white p-6 shadow-xl space-y-4 animate-in fade-in zoom-in-95 duration-150">
                        <div className="flex items-center justify-between border-b border-[#D9D2C8] pb-3">
                            <h3 className="text-base font-bold text-[#27231F]">
                                Quét máy in Bluetooth
                            </h3>
                            <button
                                type="button"
                                onClick={() => setActiveTab(null)}
                                className="text-[#766F67] hover:text-[#27231F] p-1 cursor-pointer"
                            >
                                ✕
                            </button>
                        </div>

                        <p className="text-xs text-[#766F67]">
                            Chọn máy in đã ghép đôi từ danh sách bên dưới để kết nối:
                        </p>

                        <div className="max-h-60 overflow-y-auto space-y-2 pr-1">
                            {scanningBt ? (
                                <p className="text-center py-6 text-xs text-[#766F67]">
                                    Đang quét thiết bị Bluetooth…
                                </p>
                            ) : btDevices.length === 0 ? (
                                <div className="text-center py-6 text-xs text-[#766F67] space-y-2">
                                    <p>Chưa có máy in Bluetooth nào trong danh sách ghép đôi.</p>
                                    <p className="text-[11px] text-[#766F67]">Vui lòng ghép đôi máy in trong Cài đặt Bluetooth của Android trước.</p>
                                </div>
                            ) : (
                                btDevices.map((d) => (
                                    <div
                                        key={d.address}
                                        className="flex items-center justify-between p-3 rounded-xl border border-[#D9D2C8] bg-[#F4F2EE] hover:bg-[#EFE4CF]/40 transition-colors"
                                    >
                                        <div>
                                            <p className="text-xs font-semibold text-[#27231F]">{d.name}</p>
                                            <p className="text-[11px] font-mono text-[#766F67]">{d.address}</p>
                                        </div>
                                        <Button
                                            type="button"
                                            size="sm"
                                            variant="primary"
                                            isLoading={connectingBtAddress === d.address}
                                            loadingText="Đang nối…"
                                            onClick={() => handleConnectBluetooth(d)}
                                        >
                                            Kết nối
                                        </Button>
                                    </div>
                                ))
                            )}
                        </div>

                        <div className="flex justify-between items-center border-t border-[#D9D2C8] pt-3">
                            <Button
                                type="button"
                                size="sm"
                                variant="outline"
                                isLoading={scanningBt}
                                onClick={handleScanBluetooth}
                            >
                                Quét lại
                            </Button>
                            <Button
                                type="button"
                                size="sm"
                                variant="outline"
                                onClick={() => setActiveTab(null)}
                            >
                                Đóng
                            </Button>
                        </div>
                    </div>
                </div>
            )}

            {/* Modal: USB-OTG Connection */}
            {activeTab === "USB" && (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
                    <div className="w-full max-w-md rounded-2xl bg-white p-6 shadow-xl space-y-4 animate-in fade-in zoom-in-95 duration-150">
                        <div className="flex items-center justify-between border-b border-[#D9D2C8] pb-3">
                            <h3 className="text-base font-bold text-[#27231F]">
                                Kết nối qua cáp USB-OTG
                            </h3>
                            <button
                                type="button"
                                onClick={() => setActiveTab(null)}
                                className="text-[#766F67] hover:text-[#27231F] p-1 cursor-pointer"
                            >
                                ✕
                            </button>
                        </div>

                        <p className="text-xs text-[#766F67]">
                            Cắm cáp máy in vào cổng sạc điện thoại qua đầu chuyển OTG:
                        </p>

                        <div className="max-h-60 overflow-y-auto space-y-2 pr-1">
                            {scanningUsb ? (
                                <p className="text-center py-6 text-xs text-[#766F67]">
                                    Đang nhận diện thiết bị USB…
                                </p>
                            ) : usbDevicesList.length === 0 ? (
                                <div className="text-center py-6 text-xs text-[#766F67] space-y-2">
                                    <p>Chưa phát hiện thiết bị USB nào được cắm vào máy.</p>
                                    <p className="text-[11px] text-[#766F67]">Kiểm tra lại cáp OTG và bật nguồn máy in.</p>
                                </div>
                            ) : (
                                usbDevicesList.map((d) => (
                                    <div
                                        key={d.id}
                                        className="flex items-center justify-between p-3 rounded-xl border border-[#D9D2C8] bg-[#F4F2EE] hover:bg-[#EFE4CF]/40 transition-colors"
                                    >
                                        <div>
                                            <p className="text-xs font-semibold text-[#27231F]">{d.name}</p>
                                            <p className="text-[11px] font-mono text-[#766F67]">VID: {d.vendorId} • PID: {d.productId}</p>
                                        </div>
                                        <Button
                                            type="button"
                                            size="sm"
                                            variant="primary"
                                            isLoading={connectingUsbId === d.id}
                                            loadingText="Đang nối…"
                                            onClick={() => handleConnectUsb(d)}
                                        >
                                            Kết nối
                                        </Button>
                                    </div>
                                ))
                            )}
                        </div>

                        <div className="flex justify-between items-center border-t border-[#D9D2C8] pt-3">
                            <Button
                                type="button"
                                size="sm"
                                variant="outline"
                                isLoading={scanningUsb}
                                onClick={handleListUsb}
                            >
                                Quét lại
                            </Button>
                            <Button
                                type="button"
                                size="sm"
                                variant="outline"
                                onClick={() => setActiveTab(null)}
                            >
                                Đóng
                            </Button>
                        </div>
                    </div>
                </div>
            )}

            {/* Modal: Wi-Fi/LAN Connection */}
            {activeTab === "WIFI" && (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
                    <div className="w-full max-w-md rounded-2xl bg-white p-6 shadow-xl space-y-4 animate-in fade-in zoom-in-95 duration-150">
                        <div className="flex items-center justify-between border-b border-[#D9D2C8] pb-3">
                            <h3 className="text-base font-bold text-[#27231F]">
                                Thiết lập máy in Wi-Fi / LAN
                            </h3>
                            <button
                                type="button"
                                onClick={() => setActiveTab(null)}
                                className="text-[#766F67] hover:text-[#27231F] p-1 cursor-pointer"
                            >
                                ✕
                            </button>
                        </div>

                        <form onSubmit={handleConnectWifi} className="space-y-4">
                            <Input
                                id="wifi-ip"
                                label="Địa chỉ IP máy in (mạng nội bộ) *"
                                type="text"
                                required
                                value={wifiIp}
                                onChange={(e) => setWifiIp(e.target.value)}
                                placeholder="Ví dụ: 192.168.1.200"
                                helperText="Máy in và điện thoại phải cùng kết nối một mạng Wi-Fi."
                            />

                            <Input
                                id="wifi-port"
                                label="Cổng kết nối (Port) *"
                                type="number"
                                required
                                min={1}
                                max={65535}
                                value={wifiPort}
                                onChange={(e) => setWifiPort(Number(e.target.value))}
                                placeholder="9100"
                                helperText="Mặc định của máy in hóa đơn ESC/POS là cổng 9100."
                            />

                            <div className="flex justify-end gap-2 border-t border-[#D9D2C8] pt-3">
                                <Button
                                    type="button"
                                    size="lg"
                                    variant="outline"
                                    onClick={() => setActiveTab(null)}
                                    className="flex-1"
                                >
                                    Hủy
                                </Button>
                                <Button
                                    type="submit"
                                    size="lg"
                                    variant="primary"
                                    isLoading={connectingWifi}
                                    loadingText="Đang kết nối…"
                                    className="flex-[2]"
                                >
                                    Lưu & Kiểm tra kết nối
                                </Button>
                            </div>
                        </form>
                    </div>
                </div>
            )}
        </div>
    );
}
