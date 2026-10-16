"use client";

import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useEffect, useRef, useState } from "react";
import { BottomSheet } from "@/components/ui/bottom-sheet";
import { MobileBottomNav } from "@/components/layout/mobile-bottom-nav";
import { safeRedirectPath } from "@/lib/navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { InlineAlert } from "@/components/ui/inline-alert";
import { CASHBOOK_QUICK_CREATE_EVENT, cashbookQuickAction } from "@/lib/quick-actions";

type Item = { id: string; createdAt: string; amountVnd: number; method: string; direction: string; description: string; invoiceId: string | null; reversalOfId: string | null; recordedBy: string };
type Data = { items: Item[]; summary: { cashIn: number; cashOut: number; transferIn: number; transferOut: number; netCash: number; netTransfer: number }; unlinkedExpensesVnd: number; pagination: { totalPages: number; total: number } };
const money = (v: number) => new Intl.NumberFormat("vi-VN", { style: "currency", currency: "VND" }).format(v);
const formatDateTime = (value: string) => new Date(value).toLocaleString("vi-VN", { timeZone: "Asia/Ho_Chi_Minh", day: "2-digit", month: "2-digit", hour: "2-digit", minute: "2-digit" });
const today = () => new Intl.DateTimeFormat("en-CA", { timeZone: "Asia/Ho_Chi_Minh", year: "numeric", month: "2-digit", day: "2-digit" }).format(new Date());
const IN_CATEGORIES = ["Bán gà", "Bán máy", "Bán hàng ngoài khác", "Thu dịch vụ", "Thu khác"];
const OUT_CATEGORIES = ["Tiền điện", "Tiền nước", "Internet", "Tiền hàng shipper / COD", "Phí vận chuyển", "Nhập hàng ngoài", "Chi phí khác"];

export function CashbookView({ canWrite, lakeName, lakeId }: { canWrite: boolean; lakeName: string; lakeId: string }) {
    const url = useSearchParams();
    const client = useQueryClient();
    const [from, setFrom] = useState(() => url.get("from") || today());
    const [to, setTo] = useState(() => url.get("to") || today());
    const [fromTime, setFromTime] = useState(() => url.get("fromTime") || "00:00");
    const [toTime, setToTime] = useState(() => url.get("toTime") || "23:59");
    const [method, setMethod] = useState(() => url.get("method") || "");
    const [direction, setDirection] = useState(() => url.get("direction") || "");
    const [scope, setScope] = useState(() => url.get("scope") === "all" ? "all" : "manual");
    const [page, setPage] = useState(() => Math.max(1, Number(url.get("page")) || 1));
    const [formOpen, setFormOpen] = useState(() => Boolean(cashbookQuickAction(url.get("action"))));
    const [search, setSearch] = useState(() => url.get("q") || "");
    const [q, setQ] = useState(search);
    const [exporting, setExporting] = useState(false);
    const [error, setError] = useState("");
    const [busy, setBusy] = useState(false);
    const [message, setMessage] = useState("");
    const [kind, setKind] = useState(() => url.get("action") === "expense" ? "OUT" : "IN");
    const [payMethod, setPayMethod] = useState("CASH");
    const [amount, setAmount] = useState("");
    const [description, setDescription] = useState("");
    const [category, setCategory] = useState(() => url.get("action") === "expense" ? OUT_CATEGORIES[0] : IN_CATEGORIES[0]);
    const pending = useRef<{ body: string; key: string } | null>(null);
    const submitting = useRef(false);
    const scopeFilters = Object.fromEntries(["areaId", "hutId", "customerId", "packageId", "productId", "employeeId", "sessionStatus"].flatMap(k => url.get(k) ? [[k, url.get(k)!]] : []));
    const params = new URLSearchParams({ ...scopeFilters, from, to, fromTime, toTime, scope, page: String(page), ...(q ? { q } : {}), ...(method ? { method } : {}), ...(direction ? { direction } : {}) }).toString();
    const returnTo = safeRedirectPath(url.get("returnTo") || "/home", "/home");
    const listHref = `/cashbook?${params}&returnTo=${encodeURIComponent(returnTo)}`;
    const reportHref = `/reports?${new URLSearchParams({ ...scopeFilters, preset: "custom", from, to, fromTime, toTime, compare: "none", ...(method ? { paymentMethod: method } : {}) })}`;
    useEffect(() => { window.history.replaceState(null, "", listHref); }, [listHref]);
    useEffect(() => {
        function createFromShortcut(event: Event) {
            const action = cashbookQuickAction((event as CustomEvent<string>).detail);
            if (!action) return;
            setKind(action === "expense" ? "OUT" : "IN");
            setCategory(action === "expense" ? OUT_CATEGORIES[0] : IN_CATEGORIES[0]);
            setError(""); setFormOpen(true);
        }
        window.addEventListener(CASHBOOK_QUICK_CREATE_EVENT, createFromShortcut);
        return () => window.removeEventListener(CASHBOOK_QUICK_CREATE_EVENT, createFromShortcut);
    }, []);

    const { data, isFetching: loading, error: loadError, refetch } = useQuery<Data>({
        queryKey: ["cashbook", lakeId, params],
        queryFn: async ({ signal }) => {
            const r = await fetch(`/api/cashbook?${params}`, { signal, cache: "no-store" });
            const body = await r.json();
            if (!r.ok) throw new Error(body.error || "Không thể tải sổ thu chi.");
            return body;
        },
        staleTime: 10000, refetchOnWindowFocus: true,
    });

    async function submit(e: React.FormEvent) {
        e.preventDefault(); if (submitting.current) return;
        const amountVnd = Number(amount);
        if (!Number.isInteger(amountVnd) || amountVnd <= 0 || amountVnd > 2147483647 || !description.trim()) {
            setError("Nhập nội dung và số tiền nguyên dương không quá 2.147.483.647đ."); return;
        }
        const body = JSON.stringify({ amountVnd, description: description.trim(), category: category.trim(), paymentMethod: payMethod });
        const fingerprint = kind + body;
        if (pending.current?.body !== fingerprint) pending.current = { body: fingerprint, key: crypto.randomUUID() };
        submitting.current = true; setBusy(true); setError(""); setMessage("");
        try {
            const r = await fetch(kind === "IN" ? "/api/receipts" : "/api/expenses", { method: "POST",
                headers: { "Content-Type": "application/json", "Idempotency-Key": pending.current.key }, body });
            const result = await r.json(); if (!r.ok) throw new Error(result.error);
            pending.current = null; setAmount(""); setDescription(""); setPage(1); setFormOpen(false);
            setFrom(today()); setTo(today()); setFromTime("00:00"); setToTime("23:59");
            setDirection(""); setMethod(""); setQ(""); setSearch("");
            await Promise.all([client.invalidateQueries({ queryKey: ["cashbook", lakeId] }), client.invalidateQueries({ queryKey: ["reports", lakeId] }), client.invalidateQueries({ queryKey: ["report-detail", lakeId] })]);
            setMessage("Đã lưu phiếu và cập nhật báo cáo. Đang hiển thị sổ hôm nay.");
        } catch (e) { setError(e instanceof Error ? e.message : "Không thể lưu phiếu. Có thể thử lại an toàn."); }
        finally { submitting.current = false; setBusy(false); }
    }

    async function download() {
        setExporting(true); setError("");
        try {
            const r = await fetch(`/api/cashbook?${params}&export=csv`);
            if (!r.ok) { const body = await r.json(); throw new Error(body.error); }
            const blobUrl = URL.createObjectURL(await r.blob());
            const a = document.createElement("a"); a.href = blobUrl; a.download = `Thu-chi-${from}-${to}.csv`; a.click();
            setTimeout(() => URL.revokeObjectURL(blobUrl), 1000);
        } catch (e) { setError(e instanceof Error ? e.message : "Không thể xuất file."); }
        finally { setExporting(false); }
    }
    function openForm(value: string) { setKind(value); setCategory(value === "IN" ? IN_CATEGORIES[0] : OUT_CATEGORIES[0]); setError(""); setFormOpen(true); }
    return <div className="finance-ui cashbook-page min-h-screen bg-slate-50"><main className="cashbook-main mx-auto max-w-5xl space-y-4 text-slate-900">
        <header className="cashbook-header flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between" data-no-auto-center="true"><div className="min-w-0"><Link href={returnTo} className="inline-flex min-h-10 items-center text-xs font-semibold text-slate-500">← Quay lại</Link><h1 className="text-2xl font-bold tracking-tight">Sổ thu chi</h1><p className="mt-1 break-words text-sm text-slate-500">{lakeName}</p></div>{canWrite && <div className="grid w-full grid-cols-2 gap-2 sm:flex sm:w-auto"><Button disabled={busy} onClick={() => openForm("IN")}>＋ Phiếu thu</Button><Button variant="outline" disabled={busy} onClick={() => openForm("OUT")}>＋ Phiếu chi</Button></div>}</header>
        <nav aria-label="Quản lý tài chính" className="grid grid-cols-3 gap-1 rounded-2xl border border-slate-200 bg-white p-1 text-center text-sm font-semibold" data-no-auto-center="true"><span aria-current="page" className="rounded-xl bg-[#DCFCE7] px-2 py-3 text-[#16A34A]">Thu chi</span><Link href={reportHref} title="Báo cáo cùng kỳ" className="rounded-xl px-2 py-3 text-slate-600 hover:bg-slate-50">Báo cáo →</Link><Link href="/reports/daily" className="rounded-xl px-2 py-3 text-slate-600 hover:bg-slate-50">Chốt ca</Link></nav>
        <p className="text-xs leading-relaxed text-slate-500">Dòng tiền thực thu, thực chi theo bộ lọc. Chênh lệch chưa gồm số dư đầu kỳ; doanh thu và lợi nhuận xem ở báo cáo cùng kỳ.</p>
        {(error || loadError) && <InlineAlert type="error" message={error || loadError?.message || "Không thể tải sổ."} />}
        {loadError && <Button variant="outline" onClick={() => void refetch()}>Thử tải lại</Button>}
        {message && <p role="status" className="rounded-xl bg-green-50 p-3 text-green-800">{message}</p>}
        <label className="block text-sm font-semibold">Sổ đang xem<select className="mt-2 block w-full rounded-lg border border-slate-200 bg-white p-2" value={scope} onChange={e => { setScope(e.target.value); setPage(1); }}><option value="manual">Thu chi riêng: bán hàng ngoài và phiếu chi</option><option value="all">Toàn bộ dòng tiền: gồm cả vé câu, bán hàng và hoàn tiền</option></select></label>
        <div className="grid gap-3 rounded-xl border border-slate-200 bg-white p-4 sm:grid-cols-4">
            <Input label="Từ ngày" type="date" value={from} onChange={e => { setFrom(e.target.value); setPage(1); }} />
            <Input label="Đến ngày" type="date" value={to} onChange={e => { setTo(e.target.value); setPage(1); }} />
            <label className="text-sm">Phương thức<select className="mt-2 block w-full rounded-lg border border-slate-200 p-2" value={method} onChange={e => { setMethod(e.target.value); setPage(1); }}><option value="">Tất cả</option><option value="CASH">Tiền mặt</option><option value="BANK_TRANSFER">Chuyển khoản</option></select></label>
            <label className="text-sm">Loại giao dịch<select className="mt-2 block w-full rounded-lg border border-slate-200 p-2" value={direction} onChange={e => { setDirection(e.target.value); setPage(1); }}><option value="">Tất cả</option><option value="IN">Thu</option><option value="OUT">Chi</option></select></label>
        </div>
        <details className="rounded-xl border border-slate-200 bg-white p-3 text-xs text-slate-500"><summary className="cursor-pointer">Giờ ghi nhận · {fromTime} – {toTime}</summary><div className="mt-2 grid grid-cols-2 gap-3"><Input label="Từ giờ" type="time" value={fromTime} onChange={e => { setFromTime(e.target.value); setPage(1); }} /><Input label="Đến giờ" type="time" value={toTime} onChange={e => { setToTime(e.target.value); setPage(1); }} /></div></details>
        {data && <>
            <div className="grid grid-cols-3 gap-2 sm:gap-3">{[
                { label: "Tiền vào", value: data.summary.cashIn + data.summary.transferIn, direction: "IN", color: "text-emerald-700" },
                { label: "Tiền ra", value: data.summary.cashOut + data.summary.transferOut, direction: "OUT", color: "text-rose-700" },
                { label: "Chênh lệch", value: data.summary.netCash + data.summary.netTransfer, direction: "", color: "text-slate-900" },
            ].map(c => <button key={c.label} type="button" onClick={() => { setDirection(c.direction); setPage(1); }} className="rounded-2xl border border-slate-200 bg-white px-2 py-4 text-left hover:border-slate-400 sm:p-4"><span className="text-xs text-slate-500">{c.label} ↗</span><span className={`mt-2 block break-words text-sm font-bold tracking-tight sm:text-xl ${c.color}`}>{money(c.value)}</span></button>)}</div>
            <div className="flex flex-wrap gap-4 text-xs text-slate-500"><button type="button" onClick={() => { setMethod("CASH"); setPage(1); }}>Tiền mặt: <strong>{money(data.summary.netCash)}</strong> ↗</button><button type="button" onClick={() => { setMethod("BANK_TRANSFER"); setPage(1); }}>Ngân hàng: <strong>{money(data.summary.netTransfer)}</strong> ↗</button></div>
            {data.unlinkedExpensesVnd > 0 && <Link href={reportHref + "&metric=totalExpense"} className="block rounded-xl bg-amber-50 p-3 text-xs text-amber-800">Có {money(data.unlinkedExpensesVnd)} chi phí cũ chưa gắn thanh toán; vẫn được tính trong báo cáo chi phí. Xem chi tiết →</Link>}
        </>}
        <BottomSheet className="finance-ui cashbook-sheet" isOpen={formOpen} onClose={() => { if (!busy) setFormOpen(false); }} title={kind === "IN" ? "Lập phiếu thu" : "Lập phiếu chi"}>
        {canWrite && <form onSubmit={submit} className="space-y-3 bg-white p-4">
            <h2 className="font-bold">Lập phiếu thu / chi</h2>
            <p className="text-xs text-slate-600">Dùng cho bán gà, bán máy và hàng ngoài; chi điện, nước, internet, trả tiền hàng shipper. Ghi rõ người mua / người nhận tiền và mã đơn nếu có. Phiếu bán hàng ngoài không trừ kho hồ câu. Tiền vé và hàng đã bán trong app được ghi tự động, không nhập lại ở đây.</p>
            <fieldset disabled={busy} className="grid gap-3 sm:grid-cols-2">
                <label>Loại phiếu<select className="mt-1 block w-full rounded-lg border border-slate-200 p-2" value={kind} onChange={e => { setKind(e.target.value); setCategory(e.target.value === "IN" ? IN_CATEGORIES[0] : OUT_CATEGORIES[0]); }}><option value="IN">Phiếu thu / bán hàng ngoài</option><option value="OUT">Phiếu chi / trả tiền hàng</option></select></label>
                <label>Thanh toán<select className="mt-1 block w-full rounded-lg border border-slate-200 p-2" value={payMethod} onChange={e => setPayMethod(e.target.value)}><option value="CASH">Tiền mặt</option><option value="BANK_TRANSFER">Chuyển khoản</option></select></label>
                <label>Hạng mục<select className="mt-1 block w-full rounded-lg border border-slate-200 p-2" value={category} onChange={e => setCategory(e.target.value)}>{(kind === "IN" ? IN_CATEGORIES : OUT_CATEGORIES).map(c => <option key={c}>{c}</option>)}</select></label>
                <Input label="Số tiền (VNĐ)" required type="number" min={1} max={2147483647} step={1} value={amount} onChange={e => setAmount(e.target.value)} />
                <Input label="Nội dung / người nhận, người nộp" required maxLength={200} value={description} onChange={e => setDescription(e.target.value)} />
            </fieldset>
            <Button type="submit" disabled={busy} isLoading={busy}>Lưu phiếu</Button>
        </form>}
        </BottomSheet>
        <section className="overflow-hidden rounded-2xl border border-slate-200 bg-white">
            <div className="flex items-center justify-between border-b border-slate-100 p-4"><div><h2 className="font-bold">Giao dịch <span className="font-normal text-slate-400">({data?.pagination.total ?? "…"})</span></h2><p role="status" className="mt-1 text-xs text-slate-400">{loading ? "Đang cập nhật…" : "Bấm giao dịch để xem chứng từ"}</p></div><Button variant="outline" disabled={!data || exporting} isLoading={exporting} onClick={() => void download()}>Xuất CSV</Button></div>
            <form onSubmit={e => { e.preventDefault(); setQ(search.trim()); setPage(1); }} className="flex gap-2 border-b border-slate-100 p-3"><input aria-label="Tìm nội dung giao dịch" placeholder="Tìm bán gà, điện, shipper…" maxLength={100} className="min-h-11 min-w-0 flex-1 rounded-xl bg-slate-50 px-3 text-sm" value={search} onChange={e => setSearch(e.target.value)} /><Button variant="outline" type="submit">Tìm</Button>{q && <Button variant="outline" onClick={() => { setSearch(""); setQ(""); setPage(1); }}>Xóa lọc</Button>}</form>
            {loading && !data && <div className="space-y-3 p-4" aria-label="Đang tải giao dịch">{[1, 2, 3].map(i => <div key={i} className="h-16 animate-pulse rounded-xl bg-slate-100" />)}</div>}
            {data?.items.length === 0 && <div className="px-4 py-10 text-center"><p className="font-semibold">Chưa có giao dịch phù hợp</p><p className="mt-1 text-sm text-slate-500">Chọn khoảng ngày khác hoặc lập phiếu mới.</p></div>}
            <div className="divide-y divide-slate-100">{data?.items.map(p => <Link key={p.id} href={`/cashbook/${p.id}?returnTo=${encodeURIComponent(listHref)}`} className="flex items-center gap-3 px-4 py-4 transition hover:bg-slate-50"><span aria-hidden="true" className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-full font-bold ${p.direction === "IN" ? "bg-emerald-50 text-emerald-700" : "bg-rose-50 text-rose-700"}`}>{p.direction === "IN" ? "↓" : "↑"}</span><div className="min-w-0 flex-1"><p className="line-clamp-2 break-words text-sm font-semibold">{p.description}</p><p className="mt-1 text-xs text-slate-400">{formatDateTime(p.createdAt)} · {p.method === "CASH" ? "Tiền mặt" : "Ngân hàng"}</p><p className="mt-1 truncate text-xs text-slate-500">{p.recordedBy} · #{p.id.slice(0, 8).toUpperCase()}{p.reversalOfId ? " · Hoàn tiền" : ""}</p></div><div className="text-right"><p className={`text-sm font-bold ${p.direction === "IN" ? "text-emerald-700" : "text-rose-700"}`}>{p.direction === "IN" ? "+" : "−"}{money(p.amountVnd)}</p><span className="mt-1 block text-xs text-slate-400">Chi tiết →</span></div></Link>)}</div>
            <div className="flex items-center justify-between border-t border-slate-100 p-3"><Button variant="outline" disabled={loading || page <= 1} onClick={() => setPage(v => v - 1)}>← Trước</Button><span className="text-xs text-slate-500">Trang {page} / {data?.pagination.totalPages ?? 1}</span><Button variant="outline" disabled={loading || !data || page >= data.pagination.totalPages} onClick={() => setPage(v => v + 1)}>Sau →</Button></div>
        </section>
    </main><MobileBottomNav /></div>;
}
