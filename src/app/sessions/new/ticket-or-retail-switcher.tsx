"use client";

import { useSearchParams } from "next/navigation";
import { useState } from "react";

import {
    OpenSessionForm,
    SelectCustomer,
    SelectHut,
    SelectPackage,
} from "./open-session-form";
import {
    RetailCustomer,
    RetailPosForm,
    RetailProduct,
} from "./retail-pos-form";

interface TicketOrRetailSwitcherProps {
    customers: SelectCustomer[];
    packages: SelectPackage[];
    huts: SelectHut[];
    products: RetailProduct[];
    lakeName?: string;
    cashierName?: string;
}

export function TicketOrRetailSwitcher({
    customers,
    packages,
    huts,
    products,
    lakeName,
    cashierName,
}: TicketOrRetailSwitcherProps) {
    const searchParams = useSearchParams();
    const initialTab = searchParams.get("tab") === "retail" ? "retail" : "ticket";
    const [activeTab, setActiveTab] = useState<"ticket" | "retail">(initialTab);

    return (
        <div className="space-y-4">
            {/* Segmented Control Bar */}
            <div className="rounded-2xl bg-[#EAE4D9] p-1.5 flex gap-1 shadow-inner">
                <button
                    type="button"
                    onClick={() => setActiveTab("ticket")}
                    className={`flex-1 py-2.5 rounded-xl text-xs font-bold transition-all flex items-center justify-center gap-2 ${
                        activeTab === "ticket"
                            ? "bg-white text-[#27231F] shadow-sm"
                            : "text-[#766F67] hover:text-[#27231F]"
                    }`}
                >
                    <svg
                        className="h-4 w-4 text-[#8A5A20]"
                        fill="none"
                        viewBox="0 0 24 24"
                        strokeWidth={2}
                        stroke="currentColor"
                    >
                        <path
                            strokeLinecap="round"
                            strokeLinejoin="round"
                            d="M16.5 6v.75m0 3v.75m0 3v.75m0 3V18m-9-5.25h5.25M7.5 15h3M3.375 5.25c-.621 0-1.125.504-1.125 1.125v3.026a2.999 2.999 0 0 1 0 5.198v3.026c0 .621.504 1.125 1.125 1.125h17.25c.621 0 1.125-.504 1.125-1.125v-3.026a2.999 2.999 0 0 1 0-5.198V6.375c0-.621-.504-1.125-1.125-1.125H3.375Z"
                        />
                    </svg>
                    Tạo vé câu
                </button>

                <button
                    type="button"
                    onClick={() => setActiveTab("retail")}
                    className={`flex-1 py-2.5 rounded-xl text-xs font-bold transition-all flex items-center justify-center gap-2 ${
                        activeTab === "retail"
                            ? "bg-white text-[#27231F] shadow-sm"
                            : "text-[#766F67] hover:text-[#27231F]"
                    }`}
                >
                    <svg
                        className="h-4 w-4 text-[#8A5A20]"
                        fill="none"
                        viewBox="0 0 24 24"
                        strokeWidth={2}
                        stroke="currentColor"
                    >
                        <path
                            strokeLinecap="round"
                            strokeLinejoin="round"
                            d="M2.25 3h1.386c.51 0 .955.343 1.087.835l.383 1.437M7.5 14.25a3 3 0 0 0-3 3h15.75m-12.75-3h11.218c1.121-2.3 2.1-4.684 2.924-7.138a60.114 60.114 0 0 0-16.536-1.84M7.5 14.25 5.106 5.272M6 20.25a.75.75 0 1 1-1.5 0 .75.75 0 0 1 1.5 0Zm12.75 0a.75.75 0 1 1-1.5 0 .75.75 0 0 1 1.5 0Z"
                        />
                    </svg>
                    Bán lẻ hàng hóa
                </button>
            </div>

            {/* Tab Views */}
            {activeTab === "ticket" ? (
                <OpenSessionForm
                    customers={customers}
                    packages={packages}
                    huts={huts}
                    lakeName={lakeName}
                    cashierName={cashierName}
                />
            ) : (
                <RetailPosForm
                    customers={customers as RetailCustomer[]}
                    products={products}
                />
            )}
        </div>
    );
}
