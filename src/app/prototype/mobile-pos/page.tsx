"use client";

import React, { useRef, useState } from "react";

type TabKey = "sessions" | "new-ticket" | "pos" | "reports" | "settings";

interface SpotItem {
    id: string;
    code: string;
    packageLabel: string;
    anglerName: string;
    timeRemaining: string;
    isEndingSoon: boolean;
    estimatedPriceVnd: number;
    isEmpty?: boolean;
}

interface ProductItem {
    id: string;
    name: string;
    priceVnd: number;
    stock: number;
    allowNegative?: boolean;
}

interface SessionProductLine {
    productId: string;
    name: string;
    quantity: number;
    unitPriceVnd: number;
}

interface SessionActivity {
    products: SessionProductLine[];
    extensionHours: number;
    extensionTotalVnd: number;
    fishBuybacks?: Array<{
        id: string;
        fishName: string;
        weightKg: number;
        unitPriceVnd: number;
        totalVnd: number;
    }>;
    fishBuybackTotalVnd?: number;
}

interface OtherExpenseRow {
    id: string;
    label: string;
    note: string;
    amountVnd: number;
}

type ReportDetailKey = "revenue" | "expense" | "cash" | "transfer" | "fish" | "other";

const REPORT_DETAILS: Record<
    ReportDetailKey,
    { label: string; totalVnd: number; rows: Array<{ label: string; note: string; amountVnd: number }> }
> = {
    revenue: {
        label: "Chi tiết doanh thu",
        totalVnd: 4860000,
        rows: [
            { label: "Vé câu", note: "12 vé đã hoàn tất", amountVnd: 3820000 },
            { label: "Bán sản phẩm", note: "Nước, mồi và đồ dùng", amountVnd: 740000 },
            { label: "Gia hạn", note: "5 lượt gia hạn", amountVnd: 300000 },
        ],
    },
    expense: {
        label: "Chi tiết chi phí",
        totalVnd: 1240000,
        rows: [
            { label: "Thu mua cá", note: "4 phiếu trong ngày", amountVnd: 1100000 },
            { label: "Chi khác", note: "Đá lạnh và vật tư", amountVnd: 140000 },
        ],
    },
    cash: {
        label: "Chi tiết tiền mặt",
        totalVnd: 2910000,
        rows: [
            { label: "Thu vé câu", note: "8 giao dịch", amountVnd: 2240000 },
            { label: "Bán hàng", note: "11 giao dịch", amountVnd: 510000 },
            { label: "Gia hạn", note: "2 giao dịch", amountVnd: 160000 },
        ],
    },
    transfer: {
        label: "Chi tiết chuyển khoản",
        totalVnd: 1950000,
        rows: [
            { label: "Thu vé câu", note: "4 giao dịch", amountVnd: 1580000 },
            { label: "Bán hàng", note: "6 giao dịch", amountVnd: 230000 },
            { label: "Gia hạn", note: "2 giao dịch", amountVnd: 140000 },
        ],
    },
    fish: {
        label: "Chi tiết thu mua cá",
        totalVnd: -1100000,
        rows: [
            { label: "Cá trắm", note: "12,5 kg", amountVnd: -625000 },
            { label: "Cá chép", note: "9,5 kg", amountVnd: -380000 },
            { label: "Cá rô", note: "3,8 kg", amountVnd: -95000 },
        ],
    },
    other: {
        label: "Chi tiết chi khác",
        totalVnd: -140000,
        rows: [
            { label: "Đá lạnh", note: "Phiếu chi #PC-018", amountVnd: -80000 },
            { label: "Vật tư vệ sinh", note: "Phiếu chi #PC-019", amountVnd: -60000 },
        ],
    },
};

const INITIAL_SPOTS: SpotItem[] = [
    {
        id: "s-1",
        code: "A01",
        packageLabel: "5 giờ",
        anglerName: "Anh Nam",
        timeRemaining: "03:42:18",
        isEndingSoon: false,
        estimatedPriceVnd: 400000,
    },
    {
        id: "s-2",
        code: "A02 + A03",
        packageLabel: "10 giờ",
        anglerName: "Chú Thành",
        timeRemaining: "00:08:41",
        isEndingSoon: true,
        estimatedPriceVnd: 620000,
    },
    {
        id: "s-3",
        code: "B01",
        packageLabel: "5 giờ",
        anglerName: "Anh Hải",
        timeRemaining: "04:31:06",
        isEndingSoon: false,
        estimatedPriceVnd: 440000,
    },
    {
        id: "s-4",
        code: "B02",
        packageLabel: "Trống",
        anglerName: "Sẵn sàng",
        timeRemaining: "",
        isEndingSoon: false,
        estimatedPriceVnd: 0,
        isEmpty: true,
    },
];

const MOCK_PRODUCTS: ProductItem[] = [
    { id: "p1", name: "Nước suối", priceVnd: 10000, stock: 45 },
    { id: "p2", name: "Nước ngọt", priceVnd: 15000, stock: 28 },
    { id: "p3", name: "Cơm phần", priceVnd: 40000, stock: 12 },
    {
        id: "p4",
        name: "Thuốc lá",
        priceVnd: 25000,
        stock: -2,
        allowNegative: true,
    },
];

const MOCK_FISH_PRICES = [
    { id: "tram", name: "Cá trắm", priceVndPerKg: 50000 },
    { id: "chep", name: "Cá chép", priceVndPerKg: 40000 },
    { id: "ro", name: "Cá rô", priceVndPerKg: 25000 },
    { id: "tra", name: "Cá tra", priceVndPerKg: 30000 },
];

function formatVnd(amount: number): string {
    return new Intl.NumberFormat("vi-VN").format(amount) + "đ";
}

function getExtensionPriceVnd(spot: SpotItem, hours: number): number {
    const packageHours = Number.parseInt(spot.packageLabel, 10);
    const initialSnapshot = INITIAL_SPOTS.find((item) => item.id === spot.id);
    if (!initialSnapshot || !Number.isFinite(packageHours) || packageHours <= 0) return 0;
    return Math.round(initialSnapshot.estimatedPriceVnd / packageHours) * hours;
}

interface FishingTicketPrintData {
    customer: string;
    huts: string;
    startTime: string;
    endTime: string;
}

function calculateTicketEndTime(start: string, packageLabel: string): string {
    const match = start.trim().match(/^(\d{1,2}):(\d{2})\s*(SA|CH)?$/i);
    const durationHours = Number.parseInt(packageLabel, 10);
    if (!match || !Number.isFinite(durationHours)) return "Theo giờ thực tế";

    let hour = Number(match[1]);
    const minute = Number(match[2]);
    const period = match[3]?.toUpperCase();
    if (period === "CH" && hour < 12) hour += 12;
    if (period === "SA" && hour === 12) hour = 0;
    const endHour = (hour + durationHours) % 24;
    const endPeriod = endHour >= 12 ? "CH" : "SA";
    const displayHour = endHour % 12 || 12;
    return `${String(displayHour).padStart(2, "0")}:${String(minute).padStart(2, "0")} ${endPeriod}`;
}

function escapeTicketText(value: string): string {
    return value.replace(/[&<>'"]/g, (character) => ({
        "&": "&amp;",
        "<": "&lt;",
        ">": "&gt;",
        "'": "&#39;",
        '"': "&quot;",
    })[character] ?? character);
}

function printFishingTicket(ticket: FishingTicketPrintData) {
    const printWindow = window.open("", "_blank", "width=420,height=680");
    if (!printWindow) return;
    printWindow.document.write(`<!doctype html>
        <html lang="vi"><head><meta charset="utf-8"><title>Vé câu cá</title>
        <style>
            @page { size: 80mm auto; margin: 5mm; }
            * { box-sizing: border-box; }
            body { width: 70mm; margin: 0 auto; color: #111; font-family: Arial, sans-serif; font-size: 13px; line-height: 1.45; }
            h1 { margin: 0 0 12px; text-align: center; font-size: 20px; text-transform: uppercase; letter-spacing: .06em; }
            .rule { border-top: 1px dashed #111; margin: 10px 0; }
            .row { display: flex; justify-content: space-between; gap: 12px; margin: 6px 0; }
            .row strong { text-align: right; }
            .note { margin-top: 12px; text-align: center; font-size: 12px; }
            .wish { margin-top: 8px; text-align: center; font-weight: 700; }
        </style></head><body>
            <h1>Vé câu cá</h1><div class="rule"></div>
            <div class="row"><span>Khách hàng</span><strong>${escapeTicketText(ticket.customer)}</strong></div>
            <div class="row"><span>Ô số</span><strong>${escapeTicketText(ticket.huts)}</strong></div>
            <div class="row"><span>Giờ vào</span><strong>${escapeTicketText(ticket.startTime)}</strong></div>
            <div class="row"><span>Giờ ra</span><strong>${escapeTicketText(ticket.endTime)}</strong></div>
            <div class="rule"></div>
            <p class="note">Lưu ý: Cá lên chỉ áp dụng trong thời gian ghi trên vé.</p>
            <p class="wish">Chúc quý cần thủ lên nhiều cá!</p>
            <script>window.addEventListener('load', () => { window.print(); });<\/script>
        </body></html>`);
    printWindow.document.close();
}

export default function MobilePosPrototypePage() {
    const [activeTab, setActiveTab] = useState<TabKey>("sessions");

    // Screen 1: Sessions
    const [spots, setSpots] = useState<SpotItem[]>(INITIAL_SPOTS);
    const [selectedSpotId, setSelectedSpotId] = useState<string>("s-1");
    const [sessionActivity, setSessionActivity] = useState<Record<string, SessionActivity>>({});
    const selectedSpot = spots.find((s) => s.id === selectedSpotId);
    const activeSpots = spots.filter((spot) => !spot.isEmpty);
    const activeHutCount = activeSpots.reduce(
        (total, spot) => total + spot.code.split("+").length,
        0,
    );
    const holdTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
    const didLongPressRef = useRef(false);

    // Screen 2: New Ticket
    const [customerPhone, setCustomerPhone] = useState("0909 123 456");
    const [selectedCustomer, setSelectedCustomer] = useState<string | null>(
        "Anh Minh · 0909 123 456",
    );
    const [selectedHuts, setSelectedHuts] = useState<string[]>(["A04", "A05"]);
    const [selectedPackage, setSelectedPackage] = useState("5 giờ · 400.000đ");
    const [startTime, setStartTime] = useState("05:30 CH");
    const [cashAmount, setCashAmount] = useState("200.000đ");
    const [transferAmount, setTransferAmount] = useState("200.000đ");

    // Screen 3: POS
    const [posTargetTicket, setPosTargetTicket] = useState("A01 · Anh Nam");
    const [posCart, setPosCart] = useState<Record<string, number>>({});
    const [otherExpenses, setOtherExpenses] = useState<OtherExpenseRow[]>([
        { id: "expense-1", label: "Đá lạnh", note: "Tiền mặt · Phiếu chi #PC-018", amountVnd: 80000 },
        { id: "expense-2", label: "Vật tư vệ sinh", note: "Tiền mặt · Phiếu chi #PC-019", amountVnd: 60000 },
    ]);
    const otherExpenseTotalVnd = otherExpenses.reduce((sum, item) => sum + item.amountVnd, 0);
    const totalExpenseVnd = 1100000 + otherExpenseTotalVnd;

    // Modals
    const [modalConfig, setModalConfig] = useState<{
        isOpen: boolean;
        title: string;
        description?: string;
        content?: React.ReactNode;
    }>({ isOpen: false, title: "" });

    // Action Toast
    const [toastMessage, setToastMessage] = useState<string | null>(null);

    function showToast(msg: string) {
        setToastMessage(msg);
        setTimeout(() => setToastMessage(null), 3000);
    }

    function toggleHut(hut: string) {
        setSelectedHuts((prev) =>
            prev.includes(hut) ? prev.filter((h) => h !== hut) : [...prev, hut],
        );
    }

    function toggleProductCart(pId: string) {
        setPosCart((prev) => {
            const current = prev[pId] || 0;
            if (current === 0) {
                return { ...prev, [pId]: 1 };
            } else {
                const next = { ...prev };
                delete next[pId];
                return next;
            }
        });
    }

    function finishCreatingTicket() {
        if (selectedHuts.length === 0) {
            showToast("Vui lòng chọn ít nhất một ô câu.");
            return;
        }
        const ticket: FishingTicketPrintData = {
            customer: (selectedCustomer || "Khách vãng lai").split(" · ")[0],
            huts: selectedHuts.join(", "),
            startTime,
            endTime: calculateTicketEndTime(startTime, selectedPackage),
        };
        showToast(`Đã mở ô ${ticket.huts} cho ${ticket.customer} thành công!`);
        setModalConfig({
            isOpen: true,
            title: "Tạo vé thành công",
            description: "Kiểm tra nhanh nội dung trước khi in",
            content: (
                <div className="space-y-4 text-xs">
                    <div className="rounded-xl bg-white p-4 text-slate-900 shadow-sm">
                        <h4 className="text-center text-base font-extrabold uppercase tracking-wider">Vé câu cá</h4>
                        <div className="my-3 border-t border-dashed border-slate-400" />
                        <div className="space-y-2">
                            <div className="flex justify-between gap-3"><span>Khách hàng</span><strong className="text-right">{ticket.customer}</strong></div>
                            <div className="flex justify-between gap-3"><span>Ô số</span><strong className="text-right">{ticket.huts}</strong></div>
                            <div className="flex justify-between gap-3"><span>Giờ vào</span><strong className="text-right">{ticket.startTime}</strong></div>
                            <div className="flex justify-between gap-3"><span>Giờ ra</span><strong className="text-right">{ticket.endTime}</strong></div>
                        </div>
                        <div className="my-3 border-t border-dashed border-slate-400" />
                        <p className="text-center text-[11px]">Lưu ý: Cá lên chỉ áp dụng trong thời gian ghi trên vé.</p>
                        <p className="mt-2 text-center font-bold">Chúc quý cần thủ lên nhiều cá!</p>
                    </div>
                    <button
                        type="button"
                        onClick={() => printFishingTicket(ticket)}
                        className="h-12 w-full rounded-xl bg-[#9E6B05] text-sm font-bold text-white"
                    >
                        In vé câu
                    </button>
                    <button
                        type="button"
                        onClick={() => {
                            setModalConfig((current) => ({ ...current, isOpen: false }));
                            setActiveTab("sessions");
                        }}
                        className="h-11 w-full rounded-xl bg-white font-semibold text-slate-800"
                    >
                        Để sau · về Đang câu
                    </button>
                </div>
            ),
        });
    }

    function addHoursToClock(clock: string, hours: number): string {
        const [hour = "0", minute = "0", second = "0"] = clock.split(":");
        return [String(Number(hour) + hours).padStart(2, "0"), minute, second].join(":");
    }

    function extendSession(spot: SpotItem, hours: number) {
        const extraVnd = getExtensionPriceVnd(spot, hours);
        setSpots((current) =>
            current.map((item) =>
                item.id === spot.id
                    ? {
                          ...item,
                          timeRemaining: addHoursToClock(item.timeRemaining, hours),
                          estimatedPriceVnd: item.estimatedPriceVnd + extraVnd,
                          isEndingSoon: false,
                      }
                    : item,
            ),
        );
        setSessionActivity((current) => {
            const activity = current[spot.id] ?? {
                products: [],
                extensionHours: 0,
                extensionTotalVnd: 0,
            };
            return {
                ...current,
                [spot.id]: {
                    ...activity,
                    extensionHours: activity.extensionHours + hours,
                    extensionTotalVnd: activity.extensionTotalVnd + extraVnd,
                },
            };
        });
        setModalConfig((current) => ({ ...current, isOpen: false }));
        showToast(`Đã gia hạn +${hours} giờ và cộng ${formatVnd(extraVnd)} vào ${spot.code}.`);
    }

    function saveProductsToSession() {
        const totalItems = Object.values(posCart).reduce((sum, quantity) => sum + quantity, 0);
        if (totalItems === 0) {
            showToast("Vui lòng chạm chọn ít nhất 1 sản phẩm.");
            return;
        }

        const targetSpot = spots.find(
            (spot) => `${spot.code} · ${spot.anglerName}` === posTargetTicket,
        );
        if (!targetSpot) {
            showToast("Bán lẻ tại quầy không gắn vào phiên câu.");
            setPosCart({});
            return;
        }

        const addedLines = MOCK_PRODUCTS.flatMap((product) => {
            const quantity = posCart[product.id] || 0;
            return quantity > 0
                ? [{ productId: product.id, name: product.name, quantity, unitPriceVnd: product.priceVnd }]
                : [];
        });
        const addedTotalVnd = addedLines.reduce(
            (sum, line) => sum + line.quantity * line.unitPriceVnd,
            0,
        );

        setSessionActivity((current) => {
            const activity = current[targetSpot.id] ?? {
                products: [],
                extensionHours: 0,
                extensionTotalVnd: 0,
            };
            let products = activity.products.map((line) => ({ ...line }));
            for (const line of addedLines) {
                const existing = products.find((item) => item.productId === line.productId);
                products = existing
                    ? products.map((item) =>
                          item.productId === line.productId
                              ? { ...item, quantity: item.quantity + line.quantity }
                              : item,
                      )
                    : [...products, { ...line }];
            }
            return { ...current, [targetSpot.id]: { ...activity, products } };
        });
        setSpots((current) =>
            current.map((spot) =>
                spot.id === targetSpot.id
                    ? { ...spot, estimatedPriceVnd: spot.estimatedPriceVnd + addedTotalVnd }
                    : spot,
            ),
        );
        setSelectedSpotId(targetSpot.id);
        setPosCart({});
        setActiveTab("sessions");
        showToast(`Đã thêm ${totalItems} món và cộng ${formatVnd(addedTotalVnd)} vào ${targetSpot.code}.`);
    }

    function openSessionDetails(spot: SpotItem) {
        const activity = sessionActivity[spot.id] ?? {
            products: [],
            extensionHours: 0,
            extensionTotalVnd: 0,
        };
        const productTotalVnd = activity.products.reduce(
            (sum, line) => sum + line.quantity * line.unitPriceVnd,
            0,
        );
        setModalConfig({
            isOpen: true,
            title: `Chi tiết phiên — ${spot.code}`,
            description: `${spot.anglerName} · ${spot.packageLabel}`,
            content: (
                <div className="space-y-4 text-xs">
                    <div className="grid grid-cols-2 gap-2">
                        <div className="rounded-xl bg-white p-3">
                            <p className="text-slate-500">Thời gian còn</p>
                            <p className="mt-1 font-bold text-emerald-700">{spot.timeRemaining}</p>
                        </div>
                        <div className="rounded-xl bg-white p-3 text-right">
                            <p className="text-slate-500">Tạm tính hiện tại</p>
                            <p className="mt-1 font-bold text-[#8A5B00]">{formatVnd(spot.estimatedPriceVnd)}</p>
                        </div>
                    </div>
                    <div className="rounded-xl bg-white p-3 space-y-2">
                        <div className="flex justify-between">
                            <span>Gia hạn đã thêm</span>
                            <strong>+{activity.extensionHours} giờ · {formatVnd(activity.extensionTotalVnd)}</strong>
                        </div>
                        <div className="border-t border-[#EAE4D7] pt-2">
                            <p className="font-bold">Sản phẩm trong phiên</p>
                            {activity.products.length === 0 ? (
                                <p className="mt-2 text-slate-500">Chưa thêm sản phẩm.</p>
                            ) : (
                                <div className="mt-2 space-y-2">
                                    {activity.products.map((line) => (
                                        <div key={line.productId} className="flex justify-between">
                                            <span>{line.name} × {line.quantity}</span>
                                            <strong>{formatVnd(line.quantity * line.unitPriceVnd)}</strong>
                                        </div>
                                    ))}
                                    <div className="flex justify-between border-t border-[#EAE4D7] pt-2 text-[#8A5B00]">
                                        <strong>Tổng hàng</strong>
                                        <strong>{formatVnd(productTotalVnd)}</strong>
                                    </div>
                                </div>
                            )}
                        </div>
                        <div className="border-t border-[#EAE4D7] pt-2">
                            <p className="font-bold">Cá đã thu</p>
                            {(activity.fishBuybacks?.length ?? 0) === 0 ? (
                                <p className="mt-2 text-slate-500">Chưa ghi nhận thu cá.</p>
                            ) : (
                                <div className="mt-2 space-y-2">
                                    {activity.fishBuybacks?.map((item) => (
                                        <div key={item.id} className="flex justify-between gap-3">
                                            <span>{item.fishName} · {item.weightKg} kg × {formatVnd(item.unitPriceVnd)}</span>
                                            <strong className="text-rose-700">-{formatVnd(item.totalVnd)}</strong>
                                        </div>
                                    ))}
                                    <div className="flex justify-between border-t border-[#EAE4D7] pt-2 text-rose-700">
                                        <strong>Tổng thu cá</strong>
                                        <strong>-{formatVnd(activity.fishBuybackTotalVnd ?? 0)}</strong>
                                    </div>
                                </div>
                            )}
                        </div>
                    </div>
                    <p className="text-center text-[11px] text-slate-500">Nhấn giữ thẻ phiên để mở lại thông tin này.</p>
                </div>
            ),
        });
    }

    function openReportDetails(key: ReportDetailKey) {
        const detail = key === "other"
            ? {
                  label: "Chi tiết chi khác",
                  totalVnd: -otherExpenseTotalVnd,
                  rows: otherExpenses.map((item) => ({
                      label: item.label,
                      note: item.note,
                      amountVnd: -item.amountVnd,
                  })),
              }
            : key === "expense"
              ? {
                    label: "Chi tiết chi phí",
                    totalVnd: totalExpenseVnd,
                    rows: [
                        { label: "Thu mua cá", note: "4 phiếu trong ngày", amountVnd: 1100000 },
                        { label: "Chi khác", note: `${otherExpenses.length} phiếu chi`, amountVnd: otherExpenseTotalVnd },
                    ],
                }
              : REPORT_DETAILS[key];
        setModalConfig({
            isOpen: true,
            title: detail.label,
            description: "Số liệu ca hiện tại · chạm từng dòng để đối chiếu chứng từ",
            content: (
                <div className="space-y-3 text-xs">
                    <div className="overflow-hidden rounded-xl bg-white">
                        {detail.rows.map((row, index) => (
                            <div
                                key={`${row.label}-${row.note}`}
                                className={`flex items-center justify-between gap-3 p-3 ${
                                    index > 0 ? "border-t border-[#EAE4D7]" : ""
                                }`}
                            >
                                <div className="min-w-0">
                                    <p className="font-bold text-slate-900">{row.label}</p>
                                    <p className="mt-0.5 truncate text-[11px] text-slate-500">{row.note}</p>
                                </div>
                                <strong className={row.amountVnd < 0 ? "text-rose-700" : "text-slate-900"}>
                                    {formatVnd(row.amountVnd)}
                                </strong>
                            </div>
                        ))}
                    </div>
                    <div className="flex items-center justify-between rounded-xl bg-[#EAE2CE] p-3 text-sm text-[#664200]">
                        <strong>Tổng cộng</strong>
                        <strong>{formatVnd(detail.totalVnd)}</strong>
                    </div>
                </div>
            ),
        });
    }

    function openCreateExpenseModal() {
        setModalConfig({
            isOpen: true,
            title: "Ghi chi phí phát sinh",
            description: "Khoản chi sẽ được cộng vào báo cáo ca hiện tại",
            content: (
                <form
                    className="space-y-3 text-xs"
                    onSubmit={(event) => {
                        event.preventDefault();
                        const form = new FormData(event.currentTarget);
                        const category = String(form.get("category") || "Chi khác");
                        const paymentMethod = String(form.get("paymentMethod") || "Tiền mặt");
                        const note = String(form.get("note") || "Không có ghi chú").trim();
                        const amountVnd = Number(String(form.get("amount") || "0").replace(/\D/g, ""));
                        if (!Number.isFinite(amountVnd) || amountVnd <= 0) {
                            showToast("Vui lòng nhập số tiền chi hợp lệ.");
                            return;
                        }
                        setOtherExpenses((current) => [
                            ...current,
                            {
                                id: `expense-${Date.now()}`,
                                label: category,
                                note: `${paymentMethod} · ${note}`,
                                amountVnd,
                            },
                        ]);
                        setModalConfig((current) => ({ ...current, isOpen: false }));
                        showToast(`Đã ghi chi ${formatVnd(amountVnd)} cho ${category}.`);
                    }}
                >
                    <label className="block">
                        <span className="mb-1 block font-semibold text-slate-700">Loại chi</span>
                        <select name="category" className="h-11 w-full rounded-xl bg-white px-3" defaultValue="Điện nước">
                            <option>Điện nước</option>
                            <option>Đá lạnh</option>
                            <option>Vật tư</option>
                            <option>Sửa chữa</option>
                            <option>Chi khác</option>
                        </select>
                    </label>
                    <label className="block">
                        <span className="mb-1 block font-semibold text-slate-700">Số tiền</span>
                        <input name="amount" inputMode="numeric" required placeholder="Ví dụ: 250.000đ" className="h-11 w-full rounded-xl bg-white px-3" />
                    </label>
                    <label className="block">
                        <span className="mb-1 block font-semibold text-slate-700">Phương thức chi</span>
                        <select name="paymentMethod" className="h-11 w-full rounded-xl bg-white px-3" defaultValue="Tiền mặt">
                            <option>Tiền mặt</option>
                            <option>Chuyển khoản</option>
                        </select>
                    </label>
                    <label className="block">
                        <span className="mb-1 block font-semibold text-slate-700">Nội dung / ghi chú</span>
                        <input name="note" placeholder="Nêu rõ lý do chi" className="h-11 w-full rounded-xl bg-white px-3" />
                    </label>
                    <button type="submit" className="h-12 w-full rounded-xl bg-[#9E6B05] font-bold text-white">
                        Lưu khoản chi
                    </button>
                </form>
            ),
        });
    }

    function startLongPress(spot: SpotItem) {
        didLongPressRef.current = false;
        if (holdTimerRef.current) clearTimeout(holdTimerRef.current);
        holdTimerRef.current = setTimeout(() => {
            didLongPressRef.current = true;
            setSelectedSpotId(spot.id);
            openSessionDetails(spot);
        }, 550);
    }

    function cancelLongPress() {
        if (holdTimerRef.current) clearTimeout(holdTimerRef.current);
        holdTimerRef.current = null;
    }

    function openQuickActionModal(actionType: string) {
        if (!selectedSpot) return;

        if (actionType === "add-product") {
            setPosTargetTicket(`${selectedSpot.code} · ${selectedSpot.anglerName}`);
            setActiveTab("pos");
            return;
        }

        if (actionType === "extend") {
            setModalConfig({
                isOpen: true,
                title: `Gia hạn vé — ${selectedSpot.code}`,
                description: `Khách: ${selectedSpot.anglerName} (Tạm tính: ${formatVnd(selectedSpot.estimatedPriceVnd)})`,
                content: (
                    <div className="space-y-4 text-xs">
                        <div>
                            <label className="block font-semibold text-slate-700 mb-1">
                                Chọn thời gian gia hạn thêm
                            </label>
                            <div className="grid grid-cols-3 gap-2">
                                <button
                                    type="button"
                                    onClick={() => {
                                        extendSession(selectedSpot, 1);
                                    }}
                                    className="h-11 rounded-xl border border-[#EAE4D7] bg-white font-semibold text-slate-800 active:bg-[#F5F2EB]"
                                >
                                    +1 Giờ
                                </button>
                                <button
                                    type="button"
                                    onClick={() => {
                                        extendSession(selectedSpot, 2);
                                    }}
                                    className="h-11 rounded-xl border border-[#EAE4D7] bg-white font-semibold text-slate-800 active:bg-[#F5F2EB]"
                                >
                                    +2 Giờ
                                </button>
                                <button
                                    type="button"
                                    onClick={() => {
                                        extendSession(selectedSpot, 5);
                                    }}
                                    className="h-11 rounded-xl border border-[#EAE4D7] bg-white font-semibold text-slate-800 active:bg-[#F5F2EB]"
                                >
                                    +5 Giờ
                                </button>
                            </div>
                        </div>
                        <button
                            type="button"
                            onClick={() => {
                                setModalConfig((m) => ({ ...m, isOpen: false }));
                                showToast(`Đã lưu gia hạn cho ${selectedSpot.code}`);
                            }}
                            className="w-full h-11 rounded-xl bg-[#9E6B05] font-semibold text-white active:opacity-90"
                        >
                            Xác nhận gia hạn
                        </button>
                    </div>
                ),
            });
        }

        if (actionType === "fish-buyback") {
            const targetSpot = selectedSpot;
            setModalConfig({
                isOpen: true,
                title: `Thu cá — ${targetSpot.code}`,
                description: `${targetSpot.anglerName} · tiền thu cá sẽ trừ trực tiếp vào phiên`,
                content: (
                    <form
                        className="space-y-4 text-xs"
                        onSubmit={(event) => {
                            event.preventDefault();
                            const form = new FormData(event.currentTarget);
                            const fishType = MOCK_FISH_PRICES.find(
                                (fish) => fish.id === String(form.get("fishType")),
                            );
                            const weightKg = Number(String(form.get("weightKg") || "0").replace(",", "."));
                            if (!fishType || !Number.isFinite(weightKg) || weightKg <= 0) {
                                showToast("Vui lòng chọn loại cá và nhập trọng lượng hợp lệ.");
                                return;
                            }
                            const totalVnd = Math.round(weightKg * fishType.priceVndPerKg);
                            setSpots((current) =>
                                current.map((spot) =>
                                    spot.id === targetSpot.id
                                        ? { ...spot, estimatedPriceVnd: spot.estimatedPriceVnd - totalVnd }
                                        : spot,
                                ),
                            );
                            setSessionActivity((current) => {
                                const activity = current[targetSpot.id] ?? {
                                    products: [],
                                    extensionHours: 0,
                                    extensionTotalVnd: 0,
                                };
                                const buyback = {
                                    id: `fish-${Date.now()}`,
                                    fishName: fishType.name,
                                    weightKg,
                                    unitPriceVnd: fishType.priceVndPerKg,
                                    totalVnd,
                                };
                                return {
                                    ...current,
                                    [targetSpot.id]: {
                                        ...activity,
                                        fishBuybacks: [...(activity.fishBuybacks ?? []), buyback],
                                        fishBuybackTotalVnd: (activity.fishBuybackTotalVnd ?? 0) + totalVnd,
                                    },
                                };
                            });
                            setModalConfig((current) => ({ ...current, isOpen: false }));
                            showToast(`Đã thu ${weightKg} kg ${fishType.name}, trừ ${formatVnd(totalVnd)} khỏi ${targetSpot.code}.`);
                        }}
                    >
                        <div className="overflow-hidden rounded-xl bg-white">
                            {MOCK_FISH_PRICES.map((fish) => (
                                <label key={fish.id} className="flex min-h-11 items-center justify-between border-b border-[#EAE4D7] px-3 last:border-0">
                                    <span className="flex items-center gap-2 font-semibold text-slate-800">
                                        <input type="radio" name="fishType" value={fish.id} required className="h-4 w-4" />
                                        {fish.name}
                                    </span>
                                    <strong className="text-[#8A5B00]">{formatVnd(fish.priceVndPerKg)}/kg</strong>
                                </label>
                            ))}
                        </div>
                        <label className="block">
                            <span className="mb-1 block font-semibold text-slate-700">Trọng lượng cá (kg)</span>
                            <input
                                name="weightKg"
                                type="number"
                                inputMode="decimal"
                                min="0.1"
                                step="0.1"
                                required
                                placeholder="Ví dụ: 3.5"
                                className="h-11 w-full rounded-xl bg-white px-3"
                            />
                        </label>
                        <p className="rounded-xl bg-[#EAE2CE] p-3 text-[#664200]">
                            Tổng tiền thu cá được tính theo trọng lượng × đơn giá và trừ khỏi tạm tính của phiên.
                        </p>
                        <button type="submit" className="h-12 w-full rounded-xl bg-[#9E6B05] font-bold text-white">
                            Xác nhận thu cá
                        </button>
                    </form>
                ),
            });
        }

        if (actionType === "checkout") {
            setModalConfig({
                isOpen: true,
                title: `Kết thúc & Thanh toán — ${selectedSpot.code}`,
                description: `Khách: ${selectedSpot.anglerName}`,
                content: (
                    <div className="space-y-4 text-xs">
                        <div className="rounded-xl border border-[#EAE4D7] bg-[#F7F4EE] p-3 space-y-2">
                            <div className="flex justify-between text-slate-600">
                                <span>Gói câu gốc:</span>
                                <span className="font-semibold text-slate-900">
                                    {formatVnd(selectedSpot.estimatedPriceVnd)}
                                </span>
                            </div>
                            <div className="flex justify-between text-slate-600">
                                <span>Nước uống & đồ dùng:</span>
                                <span className="font-semibold text-slate-900">0đ</span>
                            </div>
                            <div className="border-t border-[#EAE4D7] pt-2 flex justify-between font-bold text-sm text-[#9E6B05]">
                                <span>Tổng thanh toán:</span>
                                <span>{formatVnd(selectedSpot.estimatedPriceVnd)}</span>
                            </div>
                        </div>
                        <div className="grid grid-cols-2 gap-2">
                            <button
                                type="button"
                                onClick={() => {
                                    setModalConfig((m) => ({ ...m, isOpen: false }));
                                    showToast(`Đã thu tiền mặt & đóng phiên ${selectedSpot.code}`);
                                }}
                                className="h-11 rounded-xl bg-[#9E6B05] font-semibold text-white active:opacity-90"
                            >
                                Tiền mặt ({formatVnd(selectedSpot.estimatedPriceVnd)})
                            </button>
                            <button
                                type="button"
                                onClick={() => {
                                    setModalConfig((m) => ({ ...m, isOpen: false }));
                                    showToast(`Đã thu chuyển khoản & đóng phiên ${selectedSpot.code}`);
                                }}
                                className="h-11 rounded-xl border border-[#9E6B05] text-[#9E6B05] bg-white font-semibold active:bg-[#F5F2EB]"
                            >
                                Chuyển khoản QR
                            </button>
                        </div>
                    </div>
                ),
            });
        }
    }

    return (
        <div className="luxury-pos min-h-screen bg-[#EBE7DF] text-slate-900 flex justify-center selection:bg-[#9E6B05] selection:text-white">
            {/* Mobile App Container (360px - 430px on mobile, centered max-w-md on desktop) */}
            <div className="w-full max-w-md min-h-screen bg-[#F5F2EB] shadow-2xl flex flex-col relative pb-20">
                {/* Prototype Banner Header */}
                <div className="bg-[#9E6B05] text-white px-4 py-1 text-center text-[11px] font-medium tracking-wide">
                    Bản dùng thử giao diện — không ghi dữ liệu thật
                </div>

                {/* Top Info Bar */}
                <header className="px-5 pt-4 pb-3 flex items-center justify-between border-b border-[#EAE4D7] bg-[#F5F2EB]">
                    <div>
                        <h2 className="text-sm font-bold text-slate-900">
                            Hồ Câu Kim Thông
                        </h2>
                        <p className="text-[11px] text-slate-500">
                            Thứ Bảy, 29/08/2026
                        </p>
                    </div>
                    <span className="inline-flex items-center rounded-full bg-[#EAE2CE] px-2.5 py-1 text-[11px] font-semibold text-[#8A5B00]">
                        Đang online
                    </span>
                </header>

                {/* Toast Notification */}
                {toastMessage && (
                    <div className="fixed top-16 left-1/2 -translate-x-1/2 z-50 max-w-xs w-11/12 rounded-xl bg-slate-900/90 text-white px-4 py-2.5 text-xs text-center shadow-lg backdrop-blur animate-fade-in">
                        {toastMessage}
                    </div>
                )}

                {/* Main Content Area based on Active Tab */}
                <main className="flex-1 px-5 py-4 overflow-y-auto">
                    {/* ======================================================== */}
                    {/* TAB 1: ĐANG CÂU */}
                    {/* ======================================================== */}
                    {activeTab === "sessions" && (
                        <div className="space-y-4">
                            <div className="flex items-center justify-between">
                                <h1 className="text-xl font-bold tracking-tight text-slate-900">
                                    Đang câu
                                </h1>
                                <span className="inline-flex items-center rounded-full bg-[#EAE2CE] px-3 py-1 text-xs font-semibold text-[#8A5B00]">
                                    {activeSpots.length} vé · {activeHutCount} ô
                                </span>
                            </div>

                            {/* Spot Grid 2x2 */}
                            <div className="grid grid-cols-2 gap-3">
                                {activeSpots.map((spot) => {
                                    const isSelected = selectedSpotId === spot.id;
                                    const activity = sessionActivity[spot.id];
                                    const productCount = activity?.products.reduce(
                                        (sum, line) => sum + line.quantity,
                                        0,
                                    ) ?? 0;

                                    return (
                                        <div
                                            key={spot.id}
                                            onPointerDown={() => startLongPress(spot)}
                                            onPointerUp={cancelLongPress}
                                            onPointerLeave={cancelLongPress}
                                            onPointerCancel={cancelLongPress}
                                            onContextMenu={(event) => event.preventDefault()}
                                            onClick={() => {
                                                if (didLongPressRef.current) {
                                                    didLongPressRef.current = false;
                                                    return;
                                                }
                                                setSelectedSpotId(spot.id);
                                            }}
                                            className={`cursor-pointer rounded-2xl border bg-white p-3.5 shadow-sm transition-all duration-150 ease-out active:scale-98 ${
                                                isSelected
                                                    ? "border-2 border-[#9E6B05] ring-2 ring-[#9E6B05]/20"
                                                    : "border-[#EAE4D7]"
                                            }`}
                                        >
                                            <div className="flex justify-between items-center text-xs">
                                                <span className="font-bold text-slate-900">
                                                    {spot.code}
                                                </span>
                                                <span className="text-slate-500">
                                                    {spot.packageLabel}
                                                </span>
                                            </div>

                                            <p className="mt-1 text-sm font-semibold text-slate-900">
                                                {spot.anglerName}
                                            </p>

                                            <p
                                                className={`mt-1 text-base font-mono font-bold tracking-tight ${
                                                    spot.isEndingSoon
                                                        ? "text-rose-600 animate-pulse"
                                                        : "text-emerald-700"
                                                }`}
                                            >
                                                {spot.timeRemaining}
                                            </p>

                                            <p className="mt-1 text-[11px] text-slate-500">
                                                Tạm tính {formatVnd(spot.estimatedPriceVnd)}
                                            </p>
                                            {(productCount > 0 || (activity?.extensionHours ?? 0) > 0 || (activity?.fishBuybackTotalVnd ?? 0) > 0) && (
                                                <div className="mt-2 space-y-1 text-[10px] font-semibold text-[#8A5B00]">
                                                    <div className="flex flex-wrap gap-1">
                                                        {productCount > 0 && (
                                                            <span className="rounded bg-[#EAE2CE] px-1.5 py-0.5">
                                                                +{productCount} món
                                                            </span>
                                                        )}
                                                        {(activity?.extensionHours ?? 0) > 0 && (
                                                            <span className="rounded bg-[#EAE2CE] px-1.5 py-0.5">
                                                                +{activity.extensionHours} giờ
                                                            </span>
                                                        )}
                                                        {(activity?.fishBuybackTotalVnd ?? 0) > 0 && (
                                                            <span className="rounded bg-rose-100 px-1.5 py-0.5 text-rose-700">
                                                                Thu cá -{formatVnd(activity?.fishBuybackTotalVnd ?? 0)}
                                                            </span>
                                                        )}
                                                    </div>
                                                    {activity?.products.slice(0, 2).map((line) => (
                                                        <p key={line.productId} className="truncate text-slate-500">
                                                            {line.name} × {line.quantity}
                                                        </p>
                                                    ))}
                                                </div>
                                            )}
                                        </div>
                                    );
                                })}
                            </div>

                            {/* Spot Selection Indicator & Action Buttons */}
                            {selectedSpot && !selectedSpot.isEmpty && (
                                <div className="mt-5 space-y-3">
                                    <div className="text-center text-xs font-semibold text-[#8A5B00]">
                                        Đang chọn: {selectedSpot.code} ·{" "}
                                        {selectedSpot.anglerName}
                                    </div>

                                    <div className="grid grid-cols-3 gap-2">
                                        <button
                                            type="button"
                                            onClick={() =>
                                                openQuickActionModal("add-product")
                                            }
                                            className="h-12 rounded-xl border border-[#EAE4D7] bg-white text-xs font-semibold text-slate-900 shadow-sm transition-transform duration-150 ease-out active:scale-95 hover:border-[#9E6B05]"
                                        >
                                            Thêm hàng
                                        </button>
                                        <button
                                            type="button"
                                            onClick={() =>
                                                openQuickActionModal("extend")
                                            }
                                            className="h-12 rounded-xl border border-[#EAE4D7] bg-white text-xs font-semibold text-slate-900 shadow-sm transition-transform duration-150 ease-out active:scale-95 hover:border-[#9E6B05]"
                                        >
                                            Gia hạn
                                        </button>
                                        <button
                                            type="button"
                                            onClick={() =>
                                                openQuickActionModal("fish-buyback")
                                            }
                                            className="h-12 rounded-xl border border-[#EAE4D7] bg-white text-xs font-semibold text-slate-900 shadow-sm transition-transform duration-150 ease-out active:scale-95 hover:border-rose-400"
                                        >
                                            Thu cá
                                        </button>
                                    </div>
                                </div>
                            )}
                        </div>
                    )}

                    {/* ======================================================== */}
                    {/* TAB 2: TẠO VÉ */}
                    {/* ======================================================== */}
                    {activeTab === "new-ticket" && (
                        <div className="space-y-4">
                            <div className="flex items-center justify-between">
                                <h1 className="text-xl font-bold tracking-tight text-slate-900">
                                    Tạo vé
                                </h1>
                                <span className="inline-flex items-center rounded-full bg-[#EAE2CE] px-3 py-1 text-xs font-semibold text-[#8A5B00]">
                                    Thu trước
                                </span>
                            </div>

                            {/* Customer Search Input */}
                            <div>
                                <label className="block text-xs font-medium text-slate-600 mb-1.5">
                                    Tìm khách bằng tên hoặc số điện thoại
                                </label>
                                <input
                                    type="text"
                                    value={customerPhone}
                                    onChange={(e) => setCustomerPhone(e.target.value)}
                                    placeholder="Nhập số điện thoại..."
                                    className="w-full h-11 rounded-xl border border-[#EAE4D7] bg-white px-3.5 text-xs text-slate-900 shadow-sm focus:border-[#9E6B05] focus:outline-none"
                                />
                            </div>

                            {/* Customer Match Card */}
                            <div className="rounded-xl border border-[#EAE4D7] bg-white p-3.5 shadow-sm flex items-center justify-between">
                                <div>
                                    <p className="text-xs font-bold text-slate-900">
                                        Anh Minh
                                    </p>
                                    <p className="text-[11px] text-slate-500 mt-0.5">
                                        0909 123 456 · đã đến 8 lần
                                    </p>
                                </div>
                                <button
                                    type="button"
                                    onClick={() =>
                                        setSelectedCustomer(
                                            "Anh Minh · 0909 123 456",
                                        )
                                    }
                                    className="text-xs font-semibold text-[#9E6B05] px-2 py-1 hover:underline"
                                >
                                    Chọn
                                </button>
                            </div>

                            {/* Quick Select Buttons */}
                            <div className="flex items-center gap-4 text-xs font-semibold text-[#9E6B05]">
                                <button
                                    type="button"
                                    onClick={() =>
                                        setSelectedCustomer("Khách mới (Anh Tuấn)")
                                    }
                                    className="hover:underline"
                                >
                                    Tạo khách mới
                                </button>
                                <button
                                    type="button"
                                    onClick={() =>
                                        setSelectedCustomer("Khách vãng lai")
                                    }
                                    className="hover:underline"
                                >
                                    Khách lẻ
                                </button>
                            </div>

                            {/* Selected Customer Badge */}
                            {selectedCustomer && (
                                <div className="rounded-xl bg-[#EAE2CE]/70 px-4 py-2.5 text-xs font-semibold text-[#664200]">
                                    Khách: {selectedCustomer}
                                </div>
                            )}

                            {/* Multi-Spot Selection */}
                            <div>
                                <label className="block text-xs font-medium text-slate-600 mb-1.5">
                                    Chọn một hoặc nhiều ô
                                </label>
                                <div className="grid grid-cols-4 gap-2">
                                    {["A04", "A05", "A06", "B02"].map((hut) => {
                                        const isHutActive = selectedHuts.includes(hut);
                                        return (
                                            <button
                                                key={hut}
                                                type="button"
                                                onClick={() => toggleHut(hut)}
                                                className={`h-11 rounded-xl text-xs font-bold transition-transform duration-150 ease-out active:scale-95 ${
                                                    isHutActive
                                                        ? "bg-[#9E6B05] text-white shadow-sm"
                                                        : "bg-white border border-[#EAE4D7] text-slate-800"
                                                }`}
                                            >
                                                {hut}
                                            </button>
                                        );
                                    })}
                                </div>
                            </div>

                            {/* Package Dropdown */}
                            <div>
                                <label className="block text-xs font-medium text-slate-600 mb-1.5">
                                    Ca câu
                                </label>
                                <select
                                    value={selectedPackage}
                                    onChange={(e) => setSelectedPackage(e.target.value)}
                                    className="w-full h-11 rounded-xl border border-[#EAE4D7] bg-white px-3.5 text-xs font-medium text-slate-900 shadow-sm focus:border-[#9E6B05] focus:outline-none"
                                >
                                    <option value="5 giờ · 400.000đ">
                                        5 giờ · 400.000đ
                                    </option>
                                    <option value="10 giờ · 700.000đ">
                                        10 giờ · 700.000đ
                                    </option>
                                    <option value="Theo giờ · 90.000đ/h">
                                        Theo giờ · 90.000đ/h
                                    </option>
                                </select>
                            </div>

                            {/* Start Time */}
                            <div>
                                <label className="block text-xs font-medium text-slate-600 mb-1.5">
                                    Giờ bắt đầu — chọn thủ công
                                </label>
                                <div className="relative">
                                    <input
                                        type="text"
                                        value={startTime}
                                        onChange={(e) => setStartTime(e.target.value)}
                                        className="w-full h-11 rounded-xl border border-[#EAE4D7] bg-white px-3.5 pr-10 text-xs font-medium text-slate-900 shadow-sm focus:border-[#9E6B05] focus:outline-none"
                                    />
                                    <svg
                                        className="absolute right-3 top-3 h-5 w-5 text-slate-400 pointer-events-none"
                                        fill="none"
                                        viewBox="0 0 24 24"
                                        strokeWidth={1.5}
                                        stroke="currentColor"
                                    >
                                        <path
                                            strokeLinecap="round"
                                            strokeLinejoin="round"
                                            d="M12 6v6h4.5m4.5 0a9 9 0 1 1-18 0 9 9 0 0 1 18 0Z"
                                        />
                                    </svg>
                                </div>
                            </div>

                            {/* Payment Split */}
                            <div className="grid grid-cols-2 gap-2">
                                <div>
                                    <label className="block text-xs font-medium text-slate-600 mb-1.5">
                                        Tiền mặt
                                    </label>
                                    <input
                                        type="text"
                                        value={cashAmount}
                                        onChange={(e) => setCashAmount(e.target.value)}
                                        className="w-full h-11 rounded-xl border border-[#EAE4D7] bg-white px-3.5 text-xs font-medium text-slate-900 shadow-sm focus:border-[#9E6B05] focus:outline-none"
                                    />
                                </div>
                                <div>
                                    <label className="block text-xs font-medium text-slate-600 mb-1.5">
                                        Chuyển khoản
                                    </label>
                                    <input
                                        type="text"
                                        value={transferAmount}
                                        onChange={(e) =>
                                            setTransferAmount(e.target.value)
                                        }
                                        className="w-full h-11 rounded-xl border border-[#EAE4D7] bg-white px-3.5 text-xs font-medium text-slate-900 shadow-sm focus:border-[#9E6B05] focus:outline-none"
                                    />
                                </div>
                            </div>

                            {/* Submit Button */}
                            <button
                                type="button"
                                onClick={finishCreatingTicket}
                                className="mt-2 w-full h-12 rounded-xl bg-[#9E6B05] text-sm font-bold text-white shadow-md transition-transform duration-150 ease-out active:scale-98"
                            >
                                Tạo vé và mở ô
                            </button>
                        </div>
                    )}

                    {/* ======================================================== */}
                    {/* TAB 3: BÁN HÀNG */}
                    {/* ======================================================== */}
                    {activeTab === "pos" && (
                        <div className="space-y-4">
                            <div className="flex items-center justify-between">
                                <h1 className="text-xl font-bold tracking-tight text-slate-900">
                                    Bán hàng
                                </h1>
                                <span className="inline-flex items-center rounded-full bg-[#EAE2CE] px-3 py-1 text-xs font-semibold text-[#8A5B00]">
                                    Thêm vào vé
                                </span>
                            </div>

                            {/* Target Ticket Dropdown */}
                            <div>
                                <label className="block text-xs font-medium text-slate-600 mb-1.5">
                                    Khách hoặc vé
                                </label>
                                <select
                                    value={posTargetTicket}
                                    onChange={(e) =>
                                        setPosTargetTicket(e.target.value)
                                    }
                                    className="w-full h-11 rounded-xl border border-[#EAE4D7] bg-white px-3.5 text-xs font-semibold text-slate-900 shadow-sm focus:border-[#9E6B05] focus:outline-none"
                                >
                                    <option value="A01 · Anh Nam">
                                        A01 · Anh Nam
                                    </option>
                                    <option value="A02 + A03 · Chú Thành">
                                        A02 + A03 · Chú Thành
                                    </option>
                                    <option value="B01 · Anh Hải">
                                        B01 · Anh Hải
                                    </option>
                                    <option value="Bán lẻ tại quầy">
                                        Bán lẻ tại quầy (Không mở ô)
                                    </option>
                                </select>
                            </div>

                            {/* Products Grid 2x2 */}
                            <div className="grid grid-cols-2 gap-3">
                                {MOCK_PRODUCTS.map((prod) => {
                                    const qty = posCart[prod.id] || 0;
                                    const isSelected = qty > 0;

                                    return (
                                        <div
                                            key={prod.id}
                                            onClick={() => toggleProductCart(prod.id)}
                                            className={`cursor-pointer rounded-2xl border bg-white p-3.5 shadow-sm transition-all duration-150 ease-out active:scale-98 ${
                                                isSelected
                                                    ? "border-2 border-[#9E6B05] ring-2 ring-[#9E6B05]/20"
                                                    : "border-[#EAE4D7]"
                                            }`}
                                        >
                                            <div className="flex justify-between items-start">
                                                <p className="text-xs font-bold text-slate-900">
                                                    {prod.name}
                                                </p>
                                                {qty > 0 && (
                                                    <span className="rounded-full bg-[#9E6B05] text-white text-[10px] font-bold px-2 py-0.5">
                                                        x{qty}
                                                    </span>
                                                )}
                                            </div>

                                            <p className="mt-2 text-xs font-semibold text-[#8A5B00]">
                                                {formatVnd(prod.priceVnd)}
                                            </p>

                                            {prod.stock < 0 ? (
                                                <p className="mt-1 text-[11px] font-medium text-rose-600">
                                                    Kho: {prod.stock} · vẫn được bán
                                                </p>
                                            ) : (
                                                <p className="mt-1 text-[11px] text-slate-400">
                                                    Kho: {prod.stock}
                                                </p>
                                            )}
                                        </div>
                                    );
                                })}
                            </div>

                            {/* Submit Button */}
                            <button
                                type="button"
                                onClick={saveProductsToSession}
                                className="w-full h-12 rounded-xl bg-[#9E6B05] text-sm font-bold text-white shadow-md transition-transform duration-150 ease-out active:scale-98"
                            >
                                Xác nhận thêm hàng
                            </button>
                        </div>
                    )}

                    {/* ======================================================== */}
                    {/* TAB 4: BÁO CÁO NGÀY */}
                    {/* ======================================================== */}
                    {activeTab === "reports" && (
                        <div className="space-y-4">
                            <div className="flex items-center justify-between">
                                <h1 className="text-xl font-bold tracking-tight text-slate-900">
                                    Báo cáo ngày
                                </h1>
                                <span className="inline-flex items-center rounded-full bg-[#EAE2CE] px-3 py-1 text-xs font-semibold text-[#8A5B00]">
                                    Chưa chốt ca
                                </span>
                            </div>

                            {/* Top 2 KPI Cards */}
                            <div className="grid grid-cols-2 gap-3">
                                <button
                                    type="button"
                                    onClick={() => openReportDetails("revenue")}
                                    className="rounded-2xl border border-[#EAE4D7] bg-white p-3.5 text-left shadow-sm"
                                >
                                    <span className="text-xs text-slate-500 font-medium">
                                        Doanh thu
                                    </span>
                                    <div className="mt-1 flex items-center justify-between gap-2">
                                        <p className="text-base font-bold text-slate-900">4.860.000đ</p>
                                        <span aria-hidden="true" className="text-lg text-[#8A5B00]">›</span>
                                    </div>
                                </button>
                                <button
                                    type="button"
                                    onClick={() => openReportDetails("expense")}
                                    className="rounded-2xl border border-[#EAE4D7] bg-white p-3.5 text-left shadow-sm"
                                >
                                    <span className="text-xs text-slate-500 font-medium">
                                        Chi phí
                                    </span>
                                    <div className="mt-1 flex items-center justify-between gap-2">
                                        <p className="text-base font-bold text-slate-900">{formatVnd(totalExpenseVnd)}</p>
                                        <span aria-hidden="true" className="text-lg text-[#8A5B00]">›</span>
                                    </div>
                                </button>
                            </div>

                            {/* Financial Breakdown List */}
                            <div className="space-y-2">
                                <button type="button" onClick={() => openReportDetails("cash")} className="w-full rounded-2xl border border-[#EAE4D7] bg-white p-3.5 shadow-sm flex items-center justify-between">
                                    <span className="text-xs font-medium text-slate-700">
                                        Tiền mặt
                                    </span>
                                    <span className="flex items-center gap-3 text-xs font-bold text-slate-900">2.910.000đ <span aria-hidden="true" className="text-lg text-[#8A5B00]">›</span></span>
                                </button>

                                <button type="button" onClick={() => openReportDetails("transfer")} className="w-full rounded-2xl border border-[#EAE4D7] bg-white p-3.5 shadow-sm flex items-center justify-between">
                                    <span className="text-xs font-medium text-slate-700">
                                        Chuyển khoản
                                    </span>
                                    <span className="flex items-center gap-3 text-xs font-bold text-slate-900">1.950.000đ <span aria-hidden="true" className="text-lg text-[#8A5B00]">›</span></span>
                                </button>

                                <button type="button" onClick={() => openReportDetails("fish")} className="w-full rounded-2xl border border-[#EAE4D7] bg-white p-3.5 shadow-sm flex items-center justify-between">
                                    <span className="text-xs font-medium text-slate-700">
                                        Thu mua cá
                                    </span>
                                    <span className="flex items-center gap-3 text-xs font-bold text-slate-900">-1.100.000đ <span aria-hidden="true" className="text-lg text-[#8A5B00]">›</span></span>
                                </button>

                                <button type="button" onClick={() => openReportDetails("other")} className="w-full rounded-2xl border border-[#EAE4D7] bg-white p-3.5 shadow-sm flex items-center justify-between">
                                    <span className="text-xs font-medium text-slate-700">
                                        Chi khác
                                    </span>
                                    <span className="flex items-center gap-3 text-xs font-bold text-slate-900">-{formatVnd(otherExpenseTotalVnd)} <span aria-hidden="true" className="text-lg text-[#8A5B00]">›</span></span>
                                </button>
                            </div>

                            <button
                                type="button"
                                onClick={openCreateExpenseModal}
                                className="h-12 w-full rounded-xl bg-white text-sm font-bold text-[#704716] shadow-sm"
                            >
                                + Ghi chi phí
                            </button>

                            {/* Action Button */}
                            <button
                                type="button"
                                onClick={() => {
                                    setModalConfig({
                                        isOpen: true,
                                        title: "Chốt ca làm việc",
                                        description: "Xác nhận kiểm kê tiền mặt thực tế trong két",
                                        content: (
                                            <div className="space-y-4 text-xs">
                                                <div className="rounded-xl bg-[#F7F4EE] border border-[#EAE4D7] p-3 space-y-1">
                                                    <div className="flex justify-between">
                                                        <span className="text-slate-600">
                                                            Tiền mặt theo sổ sách:
                                                        </span>
                                                        <span className="font-bold text-slate-900">
                                                            2.910.000đ
                                                        </span>
                                                    </div>
                                                    <div className="flex justify-between">
                                                        <span className="text-slate-600">
                                                            Tiền chi mua cá:
                                                        </span>
                                                        <span className="font-bold text-rose-600">
                                                            -1.100.000đ
                                                        </span>
                                                    </div>
                                                    <div className="border-t border-[#EAE4D7] pt-1 flex justify-between font-bold text-[#9E6B05]">
                                                        <span>Thực thu két:</span>
                                                        <span>1.670.000đ</span>
                                                    </div>
                                                </div>
                                                <button
                                                    type="button"
                                                    onClick={() => {
                                                        setModalConfig((m) => ({
                                                            ...m,
                                                            isOpen: false,
                                                        }));
                                                        showToast(
                                                            "Đã in biên bản và chốt ca thành công!",
                                                        );
                                                    }}
                                                    className="w-full h-11 rounded-xl bg-[#9E6B05] font-semibold text-white active:opacity-90"
                                                >
                                                    Xác nhận chốt ca & In phiếu
                                                </button>
                                            </div>
                                        ),
                                    });
                                }}
                                className="w-full h-12 rounded-xl bg-[#9E6B05] text-sm font-bold text-white shadow-md transition-transform duration-150 ease-out active:scale-98"
                            >
                                Xem và chốt ca
                            </button>
                        </div>
                    )}

                    {/* ======================================================== */}
                    {/* TAB 5: CÀI ĐẶT */}
                    {/* ======================================================== */}
                    {activeTab === "settings" && (
                        <div className="space-y-4">
                            <div className="flex items-center justify-between">
                                <h1 className="text-xl font-bold tracking-tight text-slate-900">
                                    Cài đặt
                                </h1>
                                <span className="inline-flex items-center rounded-full bg-[#EAE2CE] px-3 py-1 text-xs font-semibold text-[#8A5B00]">
                                    Chủ hồ
                                </span>
                            </div>

                            {/* Settings Menu List */}
                            <div className="space-y-2">
                                {[
                                    {
                                        title: "Khách hàng",
                                        desc: "Tên, số điện thoại và lịch sử tự động",
                                    },
                                    {
                                        title: "Hồ và ô câu",
                                        desc: "Khu A, khu B · 24 ô",
                                    },
                                    {
                                        title: "Ca và bảng giá",
                                        desc: "5 giờ, 10 giờ, phụ thu theo giờ",
                                    },
                                    {
                                        title: "Sản phẩm và kho",
                                        desc: "Cho bán âm có cảnh báo",
                                    },
                                    {
                                        title: "Nhân viên và quyền",
                                        desc: "Chỉ chủ hồ được sửa giờ, hủy vé",
                                    },
                                    {
                                        title: "Máy in",
                                        desc: "Hóa đơn 58 mm",
                                    },
                                ].map((item, i) => (
                                    <div
                                        key={i}
                                        onClick={() =>
                                            showToast(`Mở cài đặt: ${item.title}`)
                                        }
                                        className="cursor-pointer rounded-2xl border border-[#EAE4D7] bg-white p-3.5 shadow-sm flex items-center justify-between transition-transform duration-150 ease-out active:scale-98 hover:border-[#9E6B05]"
                                    >
                                        <div>
                                            <p className="text-xs font-bold text-slate-900">
                                                {item.title}
                                            </p>
                                            <p className="text-[11px] text-slate-500 mt-0.5">
                                                {item.desc}
                                            </p>
                                        </div>
                                        <svg
                                            className="h-4 w-4 text-slate-400"
                                            fill="none"
                                            viewBox="0 0 24 24"
                                            strokeWidth={2}
                                            stroke="currentColor"
                                        >
                                            <path
                                                strokeLinecap="round"
                                                strokeLinejoin="round"
                                                d="M8.25 4.5l7.5 7.5-7.5 7.5"
                                            />
                                        </svg>
                                    </div>
                                ))}
                            </div>

                            {/* Save Settings Button */}
                            <button
                                type="button"
                                onClick={() =>
                                    showToast("Đã lưu cấu hình mẫu thành công!")
                                }
                                className="w-full h-12 rounded-xl bg-[#9E6B05] text-sm font-bold text-white shadow-md transition-transform duration-150 ease-out active:scale-98"
                            >
                                Lưu cấu hình
                            </button>
                        </div>
                    )}

                    {/* Bottom Footnote on Prototype */}
                    <div className="mt-8 pt-4 border-t border-[#EAE4D7] text-center pb-2">
                        <p className="text-[11px] font-medium text-slate-500">
                            Bản dùng thử giao diện — không ghi dữ liệu thật.
                        </p>
                    </div>
                </main>

                {/* Bottom Fixed Navigation Bar (5 tabs) */}
                <nav
                    aria-label="Điều hướng POS"
                    className="fixed bottom-0 max-w-md w-full z-40 bg-[#F5F2EB] border-t border-[#EAE4D7] px-2 py-1 shadow-lg"
                >
                    <div className="grid grid-cols-5">
                        {/* Tab 1: Đang câu */}
                        <button
                            type="button"
                            onClick={() => setActiveTab("sessions")}
                            className={`flex flex-col items-center justify-center gap-0.5 py-1 text-[10px] font-medium transition-colors duration-150 ease-out active:scale-95 ${
                                activeTab === "sessions"
                                    ? "text-[#8A5B00] font-bold"
                                    : "text-slate-500"
                            }`}
                        >
                            <svg
                                className="h-5 w-5"
                                fill="none"
                                viewBox="0 0 24 24"
                                strokeWidth={activeTab === "sessions" ? 2.5 : 1.75}
                                stroke="currentColor"
                            >
                                <path
                                    strokeLinecap="round"
                                    strokeLinejoin="round"
                                    d="M12 6v6h4.5m4.5 0a9 9 0 1 1-18 0 9 9 0 0 1 18 0Z"
                                />
                            </svg>
                            <span>Đang câu</span>
                        </button>

                        {/* Tab 2: Tạo vé */}
                        <button
                            type="button"
                            onClick={() => setActiveTab("new-ticket")}
                            className={`flex flex-col items-center justify-center gap-0.5 py-1 text-[10px] font-medium transition-colors duration-150 ease-out active:scale-95 ${
                                activeTab === "new-ticket"
                                    ? "text-[#8A5B00] font-bold"
                                    : "text-slate-500"
                            }`}
                        >
                            <svg
                                className="h-5 w-5"
                                fill="none"
                                viewBox="0 0 24 24"
                                strokeWidth={activeTab === "new-ticket" ? 2.5 : 1.75}
                                stroke="currentColor"
                            >
                                <path
                                    strokeLinecap="round"
                                    strokeLinejoin="round"
                                    d="M16.5 6v.75m0 3v.75m0 3v.75m0 3V18m-9-5.25h5.25M7.5 15h3M3.375 5.25c-.621 0-1.125.504-1.125 1.125v3.026a2.999 2.999 0 0 1 0 5.198v3.026c0 .621.504 1.125 1.125 1.125h17.25c.621 0 1.125-.504 1.125-1.125v-3.026a2.999 2.999 0 0 1 0-5.198V6.375c0-.621-.504-1.125-1.125-1.125H3.375Z"
                                />
                            </svg>
                            <span>Tạo vé</span>
                        </button>

                        {/* Tab 3: Bán hàng */}
                        <button
                            type="button"
                            onClick={() => setActiveTab("pos")}
                            className={`flex flex-col items-center justify-center gap-0.5 py-1 text-[10px] font-medium transition-colors duration-150 ease-out active:scale-95 ${
                                activeTab === "pos"
                                    ? "text-[#8A5B00] font-bold"
                                    : "text-slate-500"
                            }`}
                        >
                            <svg
                                className="h-5 w-5"
                                fill="none"
                                viewBox="0 0 24 24"
                                strokeWidth={activeTab === "pos" ? 2.5 : 1.75}
                                stroke="currentColor"
                            >
                                <path
                                    strokeLinecap="round"
                                    strokeLinejoin="round"
                                    d="M2.25 3h1.386c.51 0 .955.343 1.087.835l.383 1.437M7.5 14.25a3 3 0 0 0-3 3h15.75m-12.75-3h11.218c1.121-2.3 2.1-4.684 2.924-7.138a60.114 60.114 0 0 0-16.536-1.84M7.5 14.25 5.106 5.272M6 20.25a.75.75 0 1 1-1.5 0 .75.75 0 0 1 1.5 0Zm12.75 0a.75.75 0 1 1-1.5 0 .75.75 0 0 1 1.5 0Z"
                                />
                            </svg>
                            <span>Bán hàng</span>
                        </button>

                        {/* Tab 4: Báo cáo */}
                        <button
                            type="button"
                            onClick={() => setActiveTab("reports")}
                            className={`flex flex-col items-center justify-center gap-0.5 py-1 text-[10px] font-medium transition-colors duration-150 ease-out active:scale-95 ${
                                activeTab === "reports"
                                    ? "text-[#8A5B00] font-bold"
                                    : "text-slate-500"
                            }`}
                        >
                            <svg
                                className="h-5 w-5"
                                fill="none"
                                viewBox="0 0 24 24"
                                strokeWidth={activeTab === "reports" ? 2.5 : 1.75}
                                stroke="currentColor"
                            >
                                <path
                                    strokeLinecap="round"
                                    strokeLinejoin="round"
                                    d="M3 13.125C3 12.504 3.504 12 4.125 12h2.25c.621 0 1.125.504 1.125 1.125v6.75C7.5 20.496 6.996 21 6.375 21h-2.25A1.125 1.125 0 0 1 3 19.875v-6.75ZM9.75 8.625c0-.621.504-1.125 1.125-1.125h2.25c.621 0 1.125.504 1.125 1.125v11.25c0 .621-.504 1.125-1.125 1.125h-2.25a1.125 1.125 0 0 1-1.125-1.125V8.625ZM16.5 4.125c0-.621.504-1.125 1.125-1.125h2.25C20.496 3 21 3.504 21 4.125v15.75c0 .621-.504 1.125-1.125 1.125h-2.25a1.125 1.125 0 0 1-1.125-1.125V4.125Z"
                                />
                            </svg>
                            <span>Báo cáo</span>
                        </button>

                        {/* Tab 5: Cài đặt */}
                        <button
                            type="button"
                            onClick={() => setActiveTab("settings")}
                            className={`flex flex-col items-center justify-center gap-0.5 py-1 text-[10px] font-medium transition-colors duration-150 ease-out active:scale-95 ${
                                activeTab === "settings"
                                    ? "text-[#8A5B00] font-bold"
                                    : "text-slate-500"
                            }`}
                        >
                            <svg
                                className="h-5 w-5"
                                fill="none"
                                viewBox="0 0 24 24"
                                strokeWidth={activeTab === "settings" ? 2.5 : 1.75}
                                stroke="currentColor"
                            >
                                <path
                                    strokeLinecap="round"
                                    strokeLinejoin="round"
                                    d="M10.5 6h9.75M10.5 6a1.5 1.5 0 1 1-3 0m3 0a1.5 1.5 0 1 0-3 0M3.75 6H7.5m3 12h9.75m-9.75 0a1.5 1.5 0 0 1-3 0m3 0a1.5 1.5 0 0 0-3 0m-3.75 0H7.5m9-6h3.75m-3.75 0a1.5 1.5 0 0 1-3 0m3 0a1.5 1.5 0 0 0-3 0m-9.75 0h9.75"
                                />
                            </svg>
                            <span>Cài đặt</span>
                        </button>
                    </div>
                </nav>

                {/* Instant Modal/Popup */}
                {modalConfig.isOpen && (
                    <div
                        className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-slate-900/40 backdrop-blur-sm p-0 sm:p-4 animate-fade-in"
                        role="dialog"
                        aria-modal="true"
                    >
                        <div className="w-full max-w-md rounded-t-3xl sm:rounded-3xl border border-[#EAE4D7] bg-[#F5F2EB] p-5 shadow-2xl space-y-4">
                            <div className="flex items-center justify-between border-b border-[#EAE4D7] pb-3">
                                <div>
                                    <h3 className="text-sm font-bold text-slate-900">
                                        {modalConfig.title}
                                    </h3>
                                    {modalConfig.description && (
                                        <p className="text-[11px] text-slate-500 mt-0.5">
                                            {modalConfig.description}
                                        </p>
                                    )}
                                </div>
                                <button
                                    type="button"
                                    onClick={() =>
                                        setModalConfig((m) => ({
                                            ...m,
                                            isOpen: false,
                                        }))
                                    }
                                    className="rounded-full p-1 text-slate-400 hover:bg-[#EAE4D7] hover:text-slate-700"
                                >
                                    <svg
                                        className="h-5 w-5"
                                        fill="none"
                                        viewBox="0 0 24 24"
                                        strokeWidth={2}
                                        stroke="currentColor"
                                    >
                                        <path
                                            strokeLinecap="round"
                                            strokeLinejoin="round"
                                            d="M6 18L18 6M6 6l12 12"
                                        />
                                    </svg>
                                </button>
                            </div>
                            <div>{modalConfig.content}</div>
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
}
