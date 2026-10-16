-- CreateEnum
CREATE TYPE "FinancialTransactionType" AS ENUM ('RECEIPT', 'EXPENSE');

-- CreateEnum
CREATE TYPE "FinancialTransactionStatus" AS ENUM ('DRAFT', 'APPROVED', 'CANCELLED', 'REVERSED');

-- CreateEnum
CREATE TYPE "FinancialAccountType" AS ENUM ('CASH', 'BANK', 'WALLET');

-- CreateEnum
CREATE TYPE "DebtType" AS ENUM ('RECEIVABLE', 'PAYABLE');

-- CreateEnum
CREATE TYPE "DebtStatus" AS ENUM ('PENDING', 'PARTIAL', 'SETTLED', 'OVERDUE', 'CANCELLED');

-- CreateTable
CREATE TABLE "FinancialCategory" (
    "id" TEXT NOT NULL,
    "lakeId" TEXT NOT NULL,
    "type" "PaymentDirection" NOT NULL,
    "name" TEXT NOT NULL,
    "code" TEXT,
    "color" TEXT DEFAULT '#0284c7',
    "icon" TEXT DEFAULT 'Tag',
    "parentId" TEXT,
    "isSystem" BOOLEAN NOT NULL DEFAULT false,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "displayOrder" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "FinancialCategory_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "FinancialAccount" (
    "id" TEXT NOT NULL,
    "lakeId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "accountType" "FinancialAccountType" NOT NULL DEFAULT 'CASH',
    "accountNumber" TEXT,
    "bankName" TEXT,
    "initialBalanceVnd" INTEGER NOT NULL DEFAULT 0,
    "currentBalanceVnd" INTEGER NOT NULL DEFAULT 0,
    "isDefault" BOOLEAN NOT NULL DEFAULT false,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "FinancialAccount_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "FinancialTransaction" (
    "id" TEXT NOT NULL,
    "lakeId" TEXT NOT NULL,
    "code" TEXT NOT NULL,
    "type" "FinancialTransactionType" NOT NULL,
    "amountVnd" INTEGER NOT NULL,
    "paymentMethod" "PaymentMethod" NOT NULL DEFAULT 'CASH',
    "status" "FinancialTransactionStatus" NOT NULL DEFAULT 'APPROVED',
    "categoryId" TEXT,
    "accountId" TEXT,
    "customerId" TEXT,
    "supplierName" TEXT,
    "payerOrReceiver" TEXT,
    "description" TEXT NOT NULL,
    "note" TEXT,
    "invoiceId" TEXT,
    "expenseId" TEXT,
    "paymentId" TEXT,
    "idempotencyKey" TEXT,
    "attachments" TEXT,
    "createdById" TEXT NOT NULL,
    "approvedById" TEXT,
    "cancelledById" TEXT,
    "cancelledReason" TEXT,
    "transactionDate" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "FinancialTransaction_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "FundTransfer" (
    "id" TEXT NOT NULL,
    "lakeId" TEXT NOT NULL,
    "code" TEXT NOT NULL,
    "fromAccountId" TEXT NOT NULL,
    "toAccountId" TEXT NOT NULL,
    "amountVnd" INTEGER NOT NULL,
    "feeAmountVnd" INTEGER NOT NULL DEFAULT 0,
    "note" TEXT,
    "transferredAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "createdById" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "FundTransfer_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Debt" (
    "id" TEXT NOT NULL,
    "lakeId" TEXT NOT NULL,
    "code" TEXT NOT NULL,
    "type" "DebtType" NOT NULL,
    "customerId" TEXT,
    "supplierName" TEXT,
    "title" TEXT NOT NULL,
    "invoiceId" TEXT,
    "totalAmountVnd" INTEGER NOT NULL,
    "paidAmountVnd" INTEGER NOT NULL DEFAULT 0,
    "remainingAmountVnd" INTEGER NOT NULL,
    "dueDate" TIMESTAMP(3),
    "status" "DebtStatus" NOT NULL DEFAULT 'PENDING',
    "note" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Debt_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "DebtPayment" (
    "id" TEXT NOT NULL,
    "lakeId" TEXT NOT NULL,
    "debtId" TEXT NOT NULL,
    "transactionId" TEXT,
    "amountVnd" INTEGER NOT NULL,
    "paymentMethod" "PaymentMethod" NOT NULL DEFAULT 'CASH',
    "paymentDate" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "note" TEXT,
    "createdById" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "DebtPayment_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "FinancialPeriod" (
    "id" TEXT NOT NULL,
    "lakeId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "startDate" TIMESTAMP(3) NOT NULL,
    "endDate" TIMESTAMP(3) NOT NULL,
    "isLocked" BOOLEAN NOT NULL DEFAULT false,
    "lockedAt" TIMESTAMP(3),
    "lockedById" TEXT,
    "note" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "FinancialPeriod_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ReconciliationRecord" (
    "id" TEXT NOT NULL,
    "lakeId" TEXT NOT NULL,
    "accountId" TEXT NOT NULL,
    "systemBalanceVnd" INTEGER NOT NULL,
    "actualBalanceVnd" INTEGER NOT NULL,
    "differenceVnd" INTEGER NOT NULL,
    "reason" TEXT,
    "checkedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "checkedById" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ReconciliationRecord_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "FinancialCategory_lakeId_type_isActive_idx" ON "FinancialCategory"("lakeId", "type", "isActive");
CREATE INDEX "FinancialCategory_lakeId_createdAt_idx" ON "FinancialCategory"("lakeId", "createdAt");
CREATE UNIQUE INDEX "FinancialCategory_lakeId_type_name_key" ON "FinancialCategory"("lakeId", "type", "name");

-- CreateIndex
CREATE INDEX "FinancialAccount_lakeId_isActive_idx" ON "FinancialAccount"("lakeId", "isActive");
CREATE INDEX "FinancialAccount_lakeId_createdAt_idx" ON "FinancialAccount"("lakeId", "createdAt");
CREATE UNIQUE INDEX "FinancialAccount_lakeId_name_key" ON "FinancialAccount"("lakeId", "name");

-- CreateIndex
CREATE INDEX "FinancialTransaction_lakeId_type_status_idx" ON "FinancialTransaction"("lakeId", "type", "status");
CREATE INDEX "FinancialTransaction_lakeId_transactionDate_idx" ON "FinancialTransaction"("lakeId", "transactionDate");
CREATE INDEX "FinancialTransaction_lakeId_createdAt_idx" ON "FinancialTransaction"("lakeId", "createdAt");
CREATE INDEX "FinancialTransaction_lakeId_categoryId_idx" ON "FinancialTransaction"("lakeId", "categoryId");
CREATE INDEX "FinancialTransaction_lakeId_accountId_idx" ON "FinancialTransaction"("lakeId", "accountId");
CREATE INDEX "FinancialTransaction_lakeId_customerId_idx" ON "FinancialTransaction"("lakeId", "customerId");
CREATE UNIQUE INDEX "FinancialTransaction_lakeId_code_key" ON "FinancialTransaction"("lakeId", "code");
CREATE UNIQUE INDEX "FinancialTransaction_lakeId_idempotencyKey_key" ON "FinancialTransaction"("lakeId", "idempotencyKey");

-- CreateIndex
CREATE INDEX "FundTransfer_lakeId_transferredAt_idx" ON "FundTransfer"("lakeId", "transferredAt");
CREATE INDEX "FundTransfer_lakeId_createdAt_idx" ON "FundTransfer"("lakeId", "createdAt");
CREATE UNIQUE INDEX "FundTransfer_lakeId_code_key" ON "FundTransfer"("lakeId", "code");

-- CreateIndex
CREATE INDEX "Debt_lakeId_type_status_idx" ON "Debt"("lakeId", "type", "status");
CREATE INDEX "Debt_lakeId_customerId_idx" ON "Debt"("lakeId", "customerId");
CREATE INDEX "Debt_lakeId_dueDate_idx" ON "Debt"("lakeId", "dueDate");
CREATE INDEX "Debt_lakeId_createdAt_idx" ON "Debt"("lakeId", "createdAt");
CREATE UNIQUE INDEX "Debt_lakeId_code_key" ON "Debt"("lakeId", "code");

-- CreateIndex
CREATE INDEX "DebtPayment_lakeId_debtId_idx" ON "DebtPayment"("lakeId", "debtId");
CREATE INDEX "DebtPayment_lakeId_paymentDate_idx" ON "DebtPayment"("lakeId", "paymentDate");
CREATE INDEX "DebtPayment_lakeId_createdAt_idx" ON "DebtPayment"("lakeId", "createdAt");

-- CreateIndex
CREATE INDEX "FinancialPeriod_lakeId_isLocked_idx" ON "FinancialPeriod"("lakeId", "isLocked");
CREATE INDEX "FinancialPeriod_lakeId_startDate_endDate_idx" ON "FinancialPeriod"("lakeId", "startDate", "endDate");
CREATE UNIQUE INDEX "FinancialPeriod_lakeId_name_key" ON "FinancialPeriod"("lakeId", "name");

-- CreateIndex
CREATE INDEX "ReconciliationRecord_lakeId_accountId_idx" ON "ReconciliationRecord"("lakeId", "accountId");
CREATE INDEX "ReconciliationRecord_lakeId_checkedAt_idx" ON "ReconciliationRecord"("lakeId", "checkedAt");
CREATE INDEX "ReconciliationRecord_lakeId_createdAt_idx" ON "ReconciliationRecord"("lakeId", "createdAt");

-- AddForeignKey
ALTER TABLE "FinancialCategory" ADD CONSTRAINT "FinancialCategory_lakeId_fkey" FOREIGN KEY ("lakeId") REFERENCES "Lake"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "FinancialCategory" ADD CONSTRAINT "FinancialCategory_parentId_fkey" FOREIGN KEY ("parentId") REFERENCES "FinancialCategory"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "FinancialAccount" ADD CONSTRAINT "FinancialAccount_lakeId_fkey" FOREIGN KEY ("lakeId") REFERENCES "Lake"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "FinancialTransaction" ADD CONSTRAINT "FinancialTransaction_lakeId_fkey" FOREIGN KEY ("lakeId") REFERENCES "Lake"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "FinancialTransaction" ADD CONSTRAINT "FinancialTransaction_categoryId_fkey" FOREIGN KEY ("categoryId") REFERENCES "FinancialCategory"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "FinancialTransaction" ADD CONSTRAINT "FinancialTransaction_accountId_fkey" FOREIGN KEY ("accountId") REFERENCES "FinancialAccount"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "FinancialTransaction" ADD CONSTRAINT "FinancialTransaction_customerId_fkey" FOREIGN KEY ("customerId") REFERENCES "Customer"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "FinancialTransaction" ADD CONSTRAINT "FinancialTransaction_invoiceId_fkey" FOREIGN KEY ("invoiceId") REFERENCES "Invoice"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "FinancialTransaction" ADD CONSTRAINT "FinancialTransaction_expenseId_fkey" FOREIGN KEY ("expenseId") REFERENCES "Expense"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "FinancialTransaction" ADD CONSTRAINT "FinancialTransaction_paymentId_fkey" FOREIGN KEY ("paymentId") REFERENCES "Payment"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "FinancialTransaction" ADD CONSTRAINT "FinancialTransaction_createdById_fkey" FOREIGN KEY ("createdById") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "FinancialTransaction" ADD CONSTRAINT "FinancialTransaction_approvedById_fkey" FOREIGN KEY ("approvedById") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "FundTransfer" ADD CONSTRAINT "FundTransfer_lakeId_fkey" FOREIGN KEY ("lakeId") REFERENCES "Lake"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "FundTransfer" ADD CONSTRAINT "FundTransfer_fromAccountId_fkey" FOREIGN KEY ("fromAccountId") REFERENCES "FinancialAccount"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "FundTransfer" ADD CONSTRAINT "FundTransfer_toAccountId_fkey" FOREIGN KEY ("toAccountId") REFERENCES "FinancialAccount"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Debt" ADD CONSTRAINT "Debt_lakeId_fkey" FOREIGN KEY ("lakeId") REFERENCES "Lake"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "Debt" ADD CONSTRAINT "Debt_customerId_fkey" FOREIGN KEY ("customerId") REFERENCES "Customer"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "Debt" ADD CONSTRAINT "Debt_invoiceId_fkey" FOREIGN KEY ("invoiceId") REFERENCES "Invoice"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "DebtPayment" ADD CONSTRAINT "DebtPayment_debtId_fkey" FOREIGN KEY ("debtId") REFERENCES "Debt"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "DebtPayment" ADD CONSTRAINT "DebtPayment_transactionId_fkey" FOREIGN KEY ("transactionId") REFERENCES "FinancialTransaction"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "FinancialPeriod" ADD CONSTRAINT "FinancialPeriod_lakeId_fkey" FOREIGN KEY ("lakeId") REFERENCES "Lake"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ReconciliationRecord" ADD CONSTRAINT "ReconciliationRecord_lakeId_fkey" FOREIGN KEY ("lakeId") REFERENCES "Lake"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "ReconciliationRecord" ADD CONSTRAINT "ReconciliationRecord_accountId_fkey" FOREIGN KEY ("accountId") REFERENCES "FinancialAccount"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
