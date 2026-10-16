import { TransactionDetail } from "@/components/finance/transaction-detail";

export default async function PaymentPage({ params, searchParams }: {
    params: Promise<{ paymentId: string }>; searchParams: Promise<{ returnTo?: string }>;
}) {
    const [{ paymentId }, { returnTo }] = await Promise.all([params, searchParams]);
    return <TransactionDetail id={paymentId} type="payment" returnTo={returnTo} />;
}
