import { getServerSession } from "next-auth";
import Link from "next/link";
import { redirect } from "next/navigation";

import { authOptions } from "@/lib/auth";
import { getTenantContext } from "@/lib/tenant";
import { PrinterSettingsSection } from "../printer-settings";
import { MobileBottomNav } from "@/components/layout/mobile-bottom-nav";
import { MobileAppHeader } from "@/components/layout/mobile-app-header";

export default async function PrinterSettingsPage() {
    const session = await getServerSession(authOptions);

    if (!session?.user?.email) {
        redirect("/login");
    }

    const tenantContext = await getTenantContext();

    return (
        <div className="flex min-h-screen flex-col bg-[#F7F9F5]">
            <MobileAppHeader
                lakeName={tenantContext?.lakeName || "Hồ câu"}
                isSupportMode={tenantContext?.isSupportMode}
            />

            <main className="mx-auto flex-1 w-full max-w-lg px-4 pb-28 pt-4 sm:px-6">
                {/* Header Navigation */}
                <div className="mb-4 flex items-center justify-between">
                    <div className="flex items-center gap-2.5">
                        <Link
                            href="/settings"
                            className="inline-flex h-9 w-9 items-center justify-center rounded-xl border border-[#E3E8E3] bg-white text-[#17201A] hover:bg-[#EEF3EB] active:scale-95 transition-all shadow-xs"
                            aria-label="Quay lại Cài đặt"
                        >
                            <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" strokeWidth={2.5} stroke="currentColor">
                                <path strokeLinecap="round" strokeLinejoin="round" d="M15.75 19.5 8.25 12l7.5-7.5" />
                            </svg>
                        </Link>
                        <div>
                            <h1 className="text-[19px] font-bold tracking-tight text-[#17201A]">
                                Cài đặt máy in
                            </h1>
                            <p className="text-[12px] text-[#66716A]">
                                Hóa đơn 58 mm • Bluetooth, USB-OTG, Wi-Fi ESC/POS
                            </p>
                        </div>
                    </div>

                    <Link
                        href="/settings/guide"
                        className="inline-flex items-center gap-1 rounded-xl bg-[#E8F3E5] px-2.5 py-1 text-xs font-bold text-[#246B38] border border-[#D1E5CE] hover:bg-[#DDF0D8] transition-colors"
                        title="Xem hướng dẫn sử dụng"
                    >
                        <span>📖 Hướng dẫn</span>
                    </Link>
                </div>

                {/* Printer Settings Full Component */}
                <div className="space-y-4">
                    <PrinterSettingsSection />
                </div>
            </main>

            <MobileBottomNav />
        </div>
    );
}
