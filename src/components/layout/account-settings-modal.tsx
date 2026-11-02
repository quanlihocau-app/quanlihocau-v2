"use client";

import React, { useState, useEffect, useRef, useCallback } from "react";
import { signOut } from "next-auth/react";
import { useRouter } from "next/navigation";

export interface AccountData {
    user: {
        id: string;
        name: string;
        email: string;
        phone: string | null;
        phoneVerified?: boolean;
        role: string;
        sessionVersion: number;
        lastLoginAt: string | null;
        hasPassword?: boolean;
    };
    lake: {
        id: string;
        name: string;
        contactPhone: string | null;
    };
}

interface AccountSettingsModalProps {
    isOpen: boolean;
    onClose: () => void;
    initialLakeName: string;
    onLakeNameChange?: (newName: string) => void;
    onPhoneChange?: (newPhone: string) => void;
}

type ActiveView = "MENU" | "CHANGE_LAKE_NAME" | "CHANGE_PASSWORD" | "CHANGE_PHONE" | "DEVICES";

export function AccountSettingsModal({
    isOpen,
    onClose,
    initialLakeName,
    onLakeNameChange,
    onPhoneChange,
}: AccountSettingsModalProps) {
    const router = useRouter();
    const dialogRef = useRef<HTMLDivElement>(null);
    const [activeView, setActiveView] = useState<ActiveView>("MENU");
    const [accountData, setAccountData] = useState<AccountData | null>(null);
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [message, setMessage] = useState<{ type: "success" | "error"; text: string } | null>(null);

    // Form states
    const [lakeNameInput, setLakeNameInput] = useState(initialLakeName);
    const [currentPassword, setCurrentPassword] = useState("");
    const [newPassword, setNewPassword] = useState("");
    const [confirmPassword, setConfirmPassword] = useState("");
    const [phoneInput, setPhoneInput] = useState("");

    const isLoading = isOpen && !accountData;

    // Handle close with reset
    const handleClose = useCallback(() => {
        setActiveView("MENU");
        setMessage(null);
        onClose();
    }, [onClose]);

    // Lock body scroll and focus dialog when opened (iOS / iPhone standard)
    useEffect(() => {
        if (!isOpen) return;

        const originalOverflow = document.body.style.overflow;
        document.body.style.overflow = "hidden";
        dialogRef.current?.focus();

        const handleKeyDown = (e: KeyboardEvent) => {
            if (e.key === "Escape") {
                handleClose();
            }
        };

        window.addEventListener("keydown", handleKeyDown);

        return () => {
            document.body.style.overflow = originalOverflow;
            window.removeEventListener("keydown", handleKeyDown);
        };
    }, [isOpen, handleClose]);

    // Load account data when modal opens
    useEffect(() => {
        if (!isOpen) return;

        let isMounted = true;
        fetch("/api/me/account")
            .then((res) => (res.ok ? res.json() : null))
            .then((data) => {
                if (isMounted && data) {
                    setAccountData(data);
                    setLakeNameInput(data.lake?.name || initialLakeName);
                    setPhoneInput(data.user?.phone || data.lake?.contactPhone || "");
                }
            })
            .catch(() => {});

        return () => {
            isMounted = false;
        };
    }, [isOpen, initialLakeName]);

    if (!isOpen) return null;

    // Handle Change Lake Name
    const handleChangeLakeName = async (e: React.FormEvent) => {
        e.preventDefault();
        setMessage(null);
        if (!lakeNameInput.trim()) {
            setMessage({ type: "error", text: "Vui lòng nhập tên hồ câu." });
            return;
        }

        setIsSubmitting(true);
        try {
            const res = await fetch("/api/me/change-lake-name", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ name: lakeNameInput.trim() }),
            });
            const data = await res.json();
            if (!res.ok) {
                setMessage({ type: "error", text: data.error || "Không thể đổi tên hồ." });
            } else {
                setMessage({ type: "success", text: "Đổi tên hồ thành công!" });
                if (onLakeNameChange) onLakeNameChange(lakeNameInput.trim());
                if (accountData) {
                    setAccountData({
                        ...accountData,
                        lake: { ...accountData.lake, name: lakeNameInput.trim() },
                    });
                }
                setTimeout(() => {
                    setActiveView("MENU");
                    setMessage(null);
                    router.refresh();
                }, 1200);
            }
        } catch {
            setMessage({ type: "error", text: "Lỗi kết nối mạng, vui lòng thử lại." });
        } finally {
            setIsSubmitting(false);
        }
    };

    // Handle Change Password
    const handleChangePassword = async (e: React.FormEvent) => {
        e.preventDefault();
        setMessage(null);

        if (newPassword.length < 6) {
            setMessage({ type: "error", text: "Mật khẩu mới phải có ít nhất 6 ký tự." });
            return;
        }
        if (newPassword !== confirmPassword) {
            setMessage({ type: "error", text: "Mật khẩu xác nhận không khớp." });
            return;
        }

        setIsSubmitting(true);
        try {
            const res = await fetch("/api/me/change-password", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ currentPassword, newPassword }),
            });
            const data = await res.json();
            if (!res.ok) {
                setMessage({ type: "error", text: data.error || "Không thể đổi mật khẩu." });
            } else {
                setMessage({ type: "success", text: "Đổi mật khẩu thành công!" });
                setCurrentPassword("");
                setNewPassword("");
                setConfirmPassword("");
                setTimeout(() => {
                    setActiveView("MENU");
                    setMessage(null);
                }, 1500);
            }
        } catch {
            setMessage({ type: "error", text: "Lỗi kết nối mạng, vui lòng thử lại." });
        } finally {
            setIsSubmitting(false);
        }
    };

    // Handle Change Phone
    const handleChangePhone = async (e: React.FormEvent) => {
        e.preventDefault();
        setMessage(null);

        if (!phoneInput.trim()) {
            setMessage({ type: "error", text: "Vui lòng nhập số điện thoại." });
            return;
        }

        setIsSubmitting(true);
        try {
            const res = await fetch("/api/me/change-phone", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ phone: phoneInput.trim() }),
            });
            const data = await res.json();
            if (!res.ok) {
                setMessage({ type: "error", text: data.error || "Không thể đổi số điện thoại." });
            } else {
                setMessage({ type: "success", text: "Cập nhật số điện thoại thành công!" });
                if (onPhoneChange && data.phone) onPhoneChange(data.phone);
                if (accountData) {
                    setAccountData({
                        ...accountData,
                        user: { ...accountData.user, phone: data.phone },
                        lake: { ...accountData.lake, contactPhone: data.phone },
                    });
                }
                setTimeout(() => {
                    setActiveView("MENU");
                    setMessage(null);
                    router.refresh();
                }, 1200);
            }
        } catch {
            setMessage({ type: "error", text: "Lỗi kết nối mạng, vui lòng thử lại." });
        } finally {
            setIsSubmitting(false);
        }
    };

    // Handle Revoke All Sessions
    const handleRevokeAllSessions = async () => {
        if (!confirm("Bạn có chắc chắn muốn đăng xuất tài khoản khỏi tất cả các thiết bị khác không?")) {
            return;
        }

        setIsSubmitting(true);
        setMessage(null);
        try {
            const res = await fetch("/api/me/revoke-sessions", { method: "POST" });
            const data = await res.json();
            if (!res.ok) {
                setMessage({ type: "error", text: data.error || "Không thể thu hồi phiên đăng nhập." });
            } else {
                setMessage({ type: "success", text: "Đã đăng xuất khỏi tất cả thiết bị khác!" });
                if (accountData) {
                    setAccountData({
                        ...accountData,
                        user: { ...accountData.user, sessionVersion: data.sessionVersion },
                    });
                }
                setTimeout(() => {
                    setMessage(null);
                }, 2500);
            }
        } catch {
            setMessage({ type: "error", text: "Lỗi kết nối mạng, vui lòng thử lại." });
        } finally {
            setIsSubmitting(false);
        }
    };

    // Handle Logout
    const handleLogout = async () => {
        if (confirm("Bạn có chắc chắn muốn đăng xuất không?")) {
            await signOut({ callbackUrl: "/login" });
        }
    };

    const isOwner = accountData?.user?.role === "OWNER";
    const roleTitle = isOwner ? "Chủ hồ" : accountData?.user?.role === "MANAGER" ? "Quản lý" : "Nhân viên";

    return (
        <div
            className="fixed inset-0 z-50 flex items-center justify-center p-3.5 sm:p-5 bg-black/80 backdrop-blur-md animate-fade-in font-serif"
            role="dialog"
            aria-modal="true"
            aria-labelledby="account-modal-title"
        >
            {/* Backdrop click to close */}
            <div className="absolute inset-0" onClick={handleClose} aria-hidden="true" />

            {/* Modal Dialog Card (Centered, never covered on iPhone) */}
            <div
                ref={dialogRef}
                tabIndex={-1}
                className="relative w-full max-w-md max-h-[85dvh] flex flex-col rounded-3xl border border-emerald-500/30 bg-[#061F13] text-stone-100 shadow-[0_24px_64px_rgba(0,0,0,0.85)] z-10 overflow-hidden focus:outline-hidden"
            >
                {/* ── Fixed Header with Title and Close Button ─────────── */}
                <div className="shrink-0 flex items-center justify-between px-5 pt-4.5 pb-3 border-b border-emerald-800/40 bg-[#061F13]/95 backdrop-blur-xs">
                    <div className="flex items-center gap-2">
                        {activeView !== "MENU" && (
                            <button
                                type="button"
                                onClick={() => {
                                    setActiveView("MENU");
                                    setMessage(null);
                                }}
                                className="inline-flex h-9 w-9 items-center justify-center rounded-full bg-emerald-900/60 text-emerald-300 hover:bg-emerald-800 transition-colors cursor-pointer mr-1 active:scale-95"
                                aria-label="Quay lại"
                            >
                                ←
                            </button>
                        )}
                        <div>
                            <h3 id="account-modal-title" className="text-base sm:text-lg font-bold text-white tracking-wide flex items-center gap-1.5">
                                <span>🎣</span>
                                {activeView === "MENU" && "Tùy Chỉnh Tài Khoản"}
                                {activeView === "CHANGE_LAKE_NAME" && "Đổi Tên Hồ Câu"}
                                {activeView === "CHANGE_PASSWORD" && "Đổi Mật Khẩu"}
                                {activeView === "CHANGE_PHONE" && "Đổi Số Điện Thoại"}
                                {activeView === "DEVICES" && "Thiết Bị Đăng Nhập"}
                            </h3>
                            <p className="text-[11px] text-emerald-300/70">
                                {accountData?.lake?.name || initialLakeName} • {roleTitle}
                            </p>
                        </div>
                    </div>
                    <button
                        type="button"
                        onClick={handleClose}
                        className="h-9 w-9 rounded-full bg-emerald-950 text-stone-300 hover:text-white hover:bg-emerald-900 flex items-center justify-center text-sm font-bold transition-all cursor-pointer border border-emerald-700/40 active:scale-95"
                        aria-label="Đóng bảng tùy chỉnh"
                    >
                        ✕
                    </button>
                </div>

                {/* ── Scrollable Body Area (Proper safe-area padding for iPhone) ── */}
                <div className="overflow-y-auto overscroll-contain flex-1 px-5 py-4 space-y-4 pb-[max(1.5rem,env(safe-area-inset-bottom,1.5rem))]">
                    {/* Status Message Alert */}
                    {message && (
                        <div
                            className={`rounded-xl p-3 text-xs font-semibold flex items-center gap-2 ${
                                message.type === "success"
                                    ? "bg-emerald-900/80 text-emerald-200 border border-emerald-500/50"
                                    : "bg-red-950/80 text-red-200 border border-red-500/50"
                            }`}
                        >
                            <span>{message.type === "success" ? "✓" : "⚠️"}</span>
                            <span>{message.text}</span>
                        </div>
                    )}

                    {/* ── VIEW 1: MAIN MENU ─────────────────────────────────── */}
                    {activeView === "MENU" && (
                        <div className="space-y-4">
                            {/* Profile Info Summary Box */}
                            <div className="rounded-2xl border border-emerald-500/20 bg-linear-to-br from-emerald-950/80 to-[#0A2E1C]/90 p-3.5 space-y-1.5">
                                {isLoading ? (
                                    <p className="text-xs text-emerald-300 animate-pulse text-center py-2">Đang tải thông tin tài khoản...</p>
                                ) : (
                                    <>
                                        <div className="flex items-center justify-between">
                                            <span className="text-xs text-emerald-300 font-semibold">Tên hồ:</span>
                                            <span className="text-xs font-bold text-white">{accountData?.lake?.name || initialLakeName}</span>
                                        </div>
                                        <div className="flex items-center justify-between">
                                            <span className="text-xs text-emerald-300 font-semibold">Tài khoản:</span>
                                            <span className="text-xs font-medium text-stone-200">{accountData?.user?.name || "Người dùng"}</span>
                                        </div>
                                        <div className="flex items-center justify-between">
                                            <span className="text-xs text-emerald-300 font-semibold">Số điện thoại:</span>
                                            <span className="text-xs font-bold text-amber-300 font-mono">
                                                {accountData?.user?.phone || accountData?.lake?.contactPhone || "Chưa cập nhật"}
                                            </span>
                                        </div>
                                        <div className="flex items-center justify-between pt-1 border-t border-emerald-800/30">
                                            <span className="text-[11px] text-stone-400">Vai trò:</span>
                                            <span className="rounded-full bg-emerald-500/20 px-2 py-0.5 text-[10px] font-bold text-emerald-300 border border-emerald-400/30">
                                                {roleTitle}
                                            </span>
                                        </div>
                                    </>
                                )}
                            </div>

                            {/* Menu Actions List (Min height >= 48px for Apple HIG) */}
                            <div className="space-y-2.5">
                                {/* 1. Đổi tên hồ (Owner only) */}
                                {isOwner && (
                                    <button
                                        type="button"
                                        onClick={() => {
                                            setActiveView("CHANGE_LAKE_NAME");
                                            setMessage(null);
                                        }}
                                        className="w-full min-h-12 flex items-center justify-between p-3 rounded-2xl bg-emerald-950/50 hover:bg-emerald-900/60 border border-emerald-800/40 transition-all text-left text-sm font-semibold text-white cursor-pointer active:scale-[0.98]"
                                    >
                                        <div className="flex items-center gap-3">
                                            <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-emerald-800/60 text-emerald-300 text-sm">
                                                🏷️
                                            </span>
                                            <div>
                                                <p className="text-xs font-bold text-white">Đổi tên hồ</p>
                                                <p className="text-[10px] text-emerald-300/70">Thay đổi tên thương hiệu hiển thị của hồ</p>
                                            </div>
                                        </div>
                                        <span className="text-emerald-400 text-xs font-bold mr-1">→</span>
                                    </button>
                                )}

                                {/* 2. Đổi mật khẩu */}
                                <button
                                    type="button"
                                    onClick={() => {
                                        setActiveView("CHANGE_PASSWORD");
                                        setMessage(null);
                                    }}
                                    className="w-full min-h-12 flex items-center justify-between p-3 rounded-2xl bg-emerald-950/50 hover:bg-emerald-900/60 border border-emerald-800/40 transition-all text-left text-sm font-semibold text-white cursor-pointer active:scale-[0.98]"
                                >
                                    <div className="flex items-center gap-3">
                                        <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-emerald-800/60 text-emerald-300 text-sm">
                                            🔒
                                        </span>
                                        <div>
                                            <p className="text-xs font-bold text-white">Đổi mật khẩu</p>
                                            <p className="text-[10px] text-emerald-300/70">Cập nhật mật khẩu bảo vệ tài khoản</p>
                                        </div>
                                    </div>
                                    <span className="text-emerald-400 text-xs font-bold mr-1">→</span>
                                </button>

                                {/* 3. Đổi số điện thoại */}
                                <button
                                    type="button"
                                    onClick={() => {
                                        setActiveView("CHANGE_PHONE");
                                        setMessage(null);
                                    }}
                                    className="w-full min-h-12 flex items-center justify-between p-3 rounded-2xl bg-emerald-950/50 hover:bg-emerald-900/60 border border-emerald-800/40 transition-all text-left text-sm font-semibold text-white cursor-pointer active:scale-[0.98]"
                                >
                                    <div className="flex items-center gap-3">
                                        <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-emerald-800/60 text-emerald-300 text-sm">
                                            📞
                                        </span>
                                        <div>
                                            <p className="text-xs font-bold text-white">Đổi số điện thoại</p>
                                            <p className="text-[10px] text-emerald-300/70">Cập nhật số hotline hoặc số liên hệ</p>
                                        </div>
                                    </div>
                                    <span className="text-emerald-400 text-xs font-bold mr-1">→</span>
                                </button>

                                {/* 4. Thiết bị đăng nhập */}
                                <button
                                    type="button"
                                    onClick={() => {
                                        setActiveView("DEVICES");
                                        setMessage(null);
                                    }}
                                    className="w-full min-h-12 flex items-center justify-between p-3 rounded-2xl bg-emerald-950/50 hover:bg-emerald-900/60 border border-emerald-800/40 transition-all text-left text-sm font-semibold text-white cursor-pointer active:scale-[0.98]"
                                >
                                    <div className="flex items-center gap-3">
                                        <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-emerald-800/60 text-emerald-300 text-sm">
                                            📱
                                        </span>
                                        <div>
                                            <p className="text-xs font-bold text-white">Thiết bị đăng nhập</p>
                                            <p className="text-[10px] text-emerald-300/70">Kiểm tra phiên đăng nhập và đăng xuất từ xa</p>
                                        </div>
                                    </div>
                                    <span className="text-emerald-400 text-xs font-bold mr-1">→</span>
                                </button>

                                {/* 5. Đăng xuất */}
                                <button
                                    type="button"
                                    onClick={handleLogout}
                                    className="w-full min-h-12 flex items-center justify-between p-3 rounded-2xl bg-red-950/50 hover:bg-red-900/70 border border-red-800/50 transition-all text-left text-sm font-semibold text-red-200 cursor-pointer active:scale-[0.98] mt-3"
                                >
                                    <div className="flex items-center gap-3">
                                        <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-red-900/60 text-red-300 text-sm">
                                            🚪
                                        </span>
                                        <div>
                                            <p className="text-xs font-bold text-red-200">Đăng xuất</p>
                                            <p className="text-[10px] text-red-400/80">Thoát tài khoản khỏi phiên hiện tại</p>
                                        </div>
                                    </div>
                                    <span className="text-red-400 text-xs font-bold mr-1">→</span>
                                </button>
                            </div>
                        </div>
                    )}

                    {/* ── VIEW 2: CHANGE LAKE NAME ──────────────────────────── */}
                    {activeView === "CHANGE_LAKE_NAME" && (
                        <form onSubmit={handleChangeLakeName} className="space-y-4">
                            <div className="space-y-1.5">
                                <label className="text-xs font-semibold text-emerald-300">Tên hồ câu mới:</label>
                                <input
                                    type="text"
                                    autoFocus
                                    value={lakeNameInput}
                                    onChange={(e) => setLakeNameInput(e.target.value)}
                                    placeholder="VD: Hồ Câu Kim Thông"
                                    maxLength={100}
                                    className="w-full h-11 px-3.5 rounded-xl border border-emerald-600/40 bg-emerald-950/70 text-white text-sm focus:outline-none focus:ring-2 focus:ring-emerald-400 placeholder:text-stone-500"
                                    required
                                />
                                <p className="text-[11px] text-stone-400">
                                    Tên này sẽ xuất hiện trên đầu trang, trên hóa đơn in nhiệt và báo cáo.
                                </p>
                            </div>

                            <div className="pt-2 flex gap-2">
                                <button
                                    type="button"
                                    onClick={() => setActiveView("MENU")}
                                    className="flex-1 min-h-11 rounded-xl border border-emerald-800/50 bg-emerald-950/40 text-stone-300 text-xs font-bold hover:bg-emerald-900/50 transition-colors cursor-pointer active:scale-95"
                                >
                                    Quay lại
                                </button>
                                <button
                                    type="submit"
                                    disabled={isSubmitting}
                                    className="flex-1 min-h-11 rounded-xl bg-linear-to-r from-emerald-600 to-green-600 text-white text-xs font-bold hover:from-emerald-500 hover:to-green-500 shadow-md transition-all disabled:opacity-50 cursor-pointer active:scale-95"
                                >
                                    {isSubmitting ? "Đang lưu..." : "Lưu thay đổi"}
                                </button>
                            </div>
                        </form>
                    )}

                    {/* ── VIEW 3: CHANGE PASSWORD ───────────────────────────── */}
                    {activeView === "CHANGE_PASSWORD" && (
                        <form onSubmit={handleChangePassword} className="space-y-3.5">
                            {accountData?.user?.hasPassword && (
                                <div className="space-y-1.5">
                                    <label className="text-xs font-semibold text-emerald-300">Mật khẩu hiện tại:</label>
                                    <input
                                        type="password"
                                        autoFocus
                                        value={currentPassword}
                                        onChange={(e) => setCurrentPassword(e.target.value)}
                                        placeholder="••••••••"
                                        className="w-full h-11 px-3.5 rounded-xl border border-emerald-600/40 bg-emerald-950/70 text-white text-sm focus:outline-none focus:ring-2 focus:ring-emerald-400 placeholder:text-stone-500"
                                        required
                                    />
                                </div>
                            )}

                            <div className="space-y-1.5">
                                <label className="text-xs font-semibold text-emerald-300">Mật khẩu mới (tối thiểu 6 ký tự):</label>
                                <input
                                    type="password"
                                    autoFocus={!accountData?.user?.hasPassword}
                                    value={newPassword}
                                    onChange={(e) => setNewPassword(e.target.value)}
                                    placeholder="••••••••"
                                    minLength={6}
                                    className="w-full h-11 px-3.5 rounded-xl border border-emerald-600/40 bg-emerald-950/70 text-white text-sm focus:outline-none focus:ring-2 focus:ring-emerald-400 placeholder:text-stone-500"
                                    required
                                />
                            </div>

                            <div className="space-y-1.5">
                                <label className="text-xs font-semibold text-emerald-300">Nhập lại mật khẩu mới:</label>
                                <input
                                    type="password"
                                    value={confirmPassword}
                                    onChange={(e) => setConfirmPassword(e.target.value)}
                                    placeholder="••••••••"
                                    minLength={6}
                                    className="w-full h-11 px-3.5 rounded-xl border border-emerald-600/40 bg-emerald-950/70 text-white text-sm focus:outline-none focus:ring-2 focus:ring-emerald-400 placeholder:text-stone-500"
                                    required
                                />
                            </div>

                            <div className="pt-2 flex gap-2">
                                <button
                                    type="button"
                                    onClick={() => setActiveView("MENU")}
                                    className="flex-1 min-h-11 rounded-xl border border-emerald-800/50 bg-emerald-950/40 text-stone-300 text-xs font-bold hover:bg-emerald-900/50 transition-colors cursor-pointer active:scale-95"
                                >
                                    Quay lại
                                </button>
                                <button
                                    type="submit"
                                    disabled={isSubmitting}
                                    className="flex-1 min-h-11 rounded-xl bg-linear-to-r from-emerald-600 to-green-600 text-white text-xs font-bold hover:from-emerald-500 hover:to-green-500 shadow-md transition-all disabled:opacity-50 cursor-pointer active:scale-95"
                                >
                                    {isSubmitting ? "Đang lưu..." : "Cập nhật mật khẩu"}
                                </button>
                            </div>
                        </form>
                    )}

                    {/* ── VIEW 4: CHANGE PHONE ──────────────────────────────── */}
                    {activeView === "CHANGE_PHONE" && (
                        <form onSubmit={handleChangePhone} className="space-y-4">
                            <div className="space-y-1.5">
                                <label className="text-xs font-semibold text-emerald-300">Số điện thoại mới:</label>
                                <input
                                    type="tel"
                                    autoFocus
                                    value={phoneInput}
                                    onChange={(e) => setPhoneInput(e.target.value)}
                                    placeholder="VD: 0987654321 hoặc +84..."
                                    maxLength={15}
                                    className="w-full h-11 px-3.5 rounded-xl border border-emerald-600/40 bg-emerald-950/70 text-white text-sm focus:outline-none focus:ring-2 focus:ring-emerald-400 placeholder:text-stone-500 font-mono"
                                    required
                                />
                                <p className="text-[11px] text-stone-400">
                                    Dùng để đăng nhập và hiển thị số hotline liên hệ của hồ câu.
                                </p>
                            </div>

                            <div className="pt-2 flex gap-2">
                                <button
                                    type="button"
                                    onClick={() => setActiveView("MENU")}
                                    className="flex-1 min-h-11 rounded-xl border border-emerald-800/50 bg-emerald-950/40 text-stone-300 text-xs font-bold hover:bg-emerald-900/50 transition-colors cursor-pointer active:scale-95"
                                >
                                    Quay lại
                                </button>
                                <button
                                    type="submit"
                                    disabled={isSubmitting}
                                    className="flex-1 min-h-11 rounded-xl bg-linear-to-r from-emerald-600 to-green-600 text-white text-xs font-bold hover:from-emerald-500 hover:to-green-500 shadow-md transition-all disabled:opacity-50 cursor-pointer active:scale-95"
                                >
                                    {isSubmitting ? "Đang lưu..." : "Lưu số điện thoại"}
                                </button>
                            </div>
                        </form>
                    )}

                    {/* ── VIEW 5: LOGIN DEVICES & REVOKE ────────────────────── */}
                    {activeView === "DEVICES" && (
                        <div className="space-y-4">
                            <div className="rounded-2xl border border-emerald-500/20 bg-emerald-950/70 p-3.5 space-y-2">
                                <div className="flex items-center gap-2.5">
                                    <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-emerald-800/80 text-emerald-300 text-sm">
                                        💻
                                    </span>
                                    <div className="flex-1 min-w-0">
                                        <p className="text-xs font-bold text-white flex items-center gap-2">
                                            <span>Thiết bị hiện tại</span>
                                            <span className="inline-block h-2 w-2 rounded-full bg-emerald-400 animate-pulse" />
                                        </p>
                                        <p className="text-[10px] text-emerald-300/80 truncate">
                                            Trình duyệt web • Đang hoạt động
                                        </p>
                                    </div>
                                </div>
                                <div className="pt-2 border-t border-emerald-800/30 flex items-center justify-between text-[11px] text-stone-300">
                                    <span>Phiên xác thực bảo mật:</span>
                                    <span className="font-mono text-emerald-300 font-bold">
                                        #v{accountData?.user?.sessionVersion || 1}
                                    </span>
                                </div>
                            </div>

                            <div className="rounded-xl border border-amber-600/30 bg-amber-950/40 p-3 text-[11px] text-amber-200/90 leading-relaxed">
                                💡 <strong>Gợi ý bảo mật:</strong> Nếu anh nghi ngờ tài khoản bị đăng nhập trên máy khác hoặc nhân viên cũ vẫn lưu phiên, hãy bấm nút bên dưới để đăng xuất tất cả các thiết bị.
                            </div>

                            <div className="pt-2 space-y-2.5">
                                <button
                                    type="button"
                                    onClick={handleRevokeAllSessions}
                                    disabled={isSubmitting}
                                    className="w-full min-h-12 rounded-2xl bg-linear-to-r from-red-600 to-rose-700 hover:from-red-500 hover:to-rose-600 text-white text-xs font-bold shadow-lg transition-all flex items-center justify-center gap-2 cursor-pointer active:scale-[0.98] disabled:opacity-50"
                                >
                                    <span>🔒</span>
                                    <span>{isSubmitting ? "Đang xử lý..." : "Đăng xuất tất cả thiết bị"}</span>
                                </button>

                                <button
                                    type="button"
                                    onClick={() => setActiveView("MENU")}
                                    className="w-full min-h-11 rounded-xl border border-emerald-800/50 bg-emerald-950/40 text-stone-300 text-xs font-bold hover:bg-emerald-900/50 transition-colors cursor-pointer active:scale-95"
                                >
                                    Quay lại menu
                                </button>
                            </div>
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
}
