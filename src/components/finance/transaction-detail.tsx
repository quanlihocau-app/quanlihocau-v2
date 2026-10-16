import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { z } from "zod";
import { getTenantContext } from "@/lib/tenant";
import { prisma } from "@/lib/prisma";
import { safeRedirectPath } from "@/lib/navigation";
import { formatVnd, formatVnDateTimeDisplay } from "@/lib/reports/date-utils";

export async function TransactionDetail({ id, type, returnTo }: { id: string; type: "payment" | "expense"; returnTo?: string }) {
    const tenant = await getTenantContext();
    if (!tenant) redirect("/login");
    if (!z.string().uuid().safeParse(id).success) notFound();
    const payment = type === "payment" ? await prisma.payment.findFirst({ where: { id, lakeId: tenant.lakeId },
        include: { expense: { include: { payments: true } }, invoice: { include: { lines: true } }, reversalOf: true, reversals: true } }) : null;
    const expense = type === "expense" ? await prisma.expense.findFirst({ where: { id, lakeId: tenant.lakeId }, include: { payments: true } }) : payment?.expense;
    if (!payment && !expense) notFound();
    const entityId = expense?.id ?? payment?.invoiceId ?? payment?.id;
    const audit = await prisma.auditEvent.findFirst({ where: { lakeId: tenant.lakeId, entityId,
        action: { in: ["EXPENSE_CREATED", "RECEIPT_CREATED", "PAYMENT_RECORDED", "PAYMENT_REVERSED"] } }, orderBy: { createdAt: "asc" } });
    const recorder = audit ? await prisma.user.findUnique({ where: { id: audit.createdBy }, select: { name: true } }) : null;
    const back = safeRedirectPath(returnTo ?? "/cashbook", "/cashbook");
    const amount = payment?.amountVnd ?? expense!.amountVnd;
    const incoming = payment?.direction === "IN";
    const date = payment?.createdAt ?? expense!.createdAt;
    const description = expense?.description ?? payment?.invoice?.lines.map(l => l.name).join("; ") ?? "Giao dịch thanh toán";
    const reportParams = new URLSearchParams({ preset: "custom", from: new Date(date.getTime() + 7 * 3600000).toISOString().slice(0, 10), to: new Date(date.getTime() + 7 * 3600000).toISOString().slice(0, 10) });
    return <main className="finance-ui mx-auto max-w-2xl space-y-5 px-4 py-6 pb-24 text-slate-900">
        <Link href={back} className="inline-flex min-h-11 items-center text-sm font-semibold text-slate-600">← Quay lại danh sách</Link>
        <section className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
            <div className="border-b border-slate-100 p-5"><p className="text-xs font-semibold uppercase tracking-wider text-slate-500">{tenant.lakeName} · #{id.slice(0, 8).toUpperCase()}</p><h1 className="mt-2 text-xl font-bold">{incoming ? "Chi tiết phiếu thu" : "Chi tiết phiếu chi"}</h1><p className={`mt-3 text-3xl font-bold ${incoming ? "text-emerald-700" : "text-rose-700"}`}>{formatVnd(amount)}</p></div>
            <dl className="grid gap-5 p-5 text-sm sm:grid-cols-2">
                <div className="sm:col-span-2"><dt className="text-slate-500">Nội dung</dt><dd className="mt-1 break-words font-medium">{description}</dd></div>
                <div><dt className="text-slate-500">Thời gian ghi nhận</dt><dd className="mt-1 font-medium">{formatVnDateTimeDisplay(date)}</dd></div>
                <div><dt className="text-slate-500">Người lập phiếu</dt><dd className="mt-1 font-medium">{recorder?.name ?? "Hệ thống / dữ liệu cũ"}</dd></div>
                <div><dt className="text-slate-500">Phương thức</dt><dd className="mt-1 font-medium">{payment ? payment.method === "CASH" ? "Tiền mặt" : "Chuyển khoản" : "Xem giao dịch thanh toán bên dưới"}</dd></div>
                <div><dt className="text-slate-500">Trạng thái</dt><dd className="mt-1 font-medium">{payment?.reversalOfId ? "Giao dịch hoàn tiền" : payment?.reversals.length ? "Đã có giao dịch hoàn tiền" : payment ? "Đã ghi sổ" : expense?.payments.length ? "Đã ghi nhận thanh toán" : "Chi phí cũ chưa gắn thanh toán"}</dd></div>
            </dl>
        </section>
        <nav aria-label="Chứng từ liên quan" className="flex flex-wrap gap-3">
            {payment?.invoiceId && <Link href={`/invoices/${payment.invoiceId}?returnTo=${encodeURIComponent(`/cashbook/${id}?returnTo=${encodeURIComponent(back)}`)}`} className="rounded-xl border bg-white px-4 py-3 text-sm font-semibold">Xem hóa đơn gốc →</Link>}
            {type === "expense" && expense?.payments.map(p => <Link key={p.id} href={`/cashbook/${p.id}?returnTo=${encodeURIComponent(`/expenses/${id}?returnTo=${encodeURIComponent(back)}`)}`} className="rounded-xl border bg-white px-4 py-3 text-sm font-semibold">Thanh toán #{p.id.slice(0, 8)} →</Link>)}
            <Link href={`/reports?${reportParams}`} className="rounded-xl border bg-white px-4 py-3 text-sm font-semibold">Báo cáo ngày ghi nhận →</Link>
            <Link href={back} className="rounded-xl bg-slate-900 px-4 py-3 text-sm font-semibold text-white">Quay lại danh sách</Link>
        </nav>
    </main>;
}
