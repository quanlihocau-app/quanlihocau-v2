import { TransactionDetail } from "@/components/finance/transaction-detail";

export default async function ExpensePage({ params, searchParams }: {
    params: Promise<{ expenseId: string }>; searchParams: Promise<{ returnTo?: string }>;
}) {
    const [{ expenseId }, { returnTo }] = await Promise.all([params, searchParams]);
    return <TransactionDetail id={expenseId} type="expense" returnTo={returnTo} />;
}
