import { buildPaymentReceiptEscPos, buildSessionTicketEscPos } from "../src/lib/printing/receipt-builder";
import { PaymentReceiptData, SessionTicketData } from "../src/lib/printing/types";
import { performance } from "perf_hooks";

function uint8ArrayToBase64(bytes: Uint8Array): string {
  let binary = "";
  const len = bytes.byteLength;
  for (let i = 0; i < len; i++) {
    binary += String.fromCharCode(bytes[i]);
  }
  return Buffer.from(binary, "binary").toString("base64");
}

function runPrintingBenchmark() {
  const sampleTicket: SessionTicketData = {
    sessionId: "sess-test-12345678",
    ticketCode: "SESS1234",
    lakeName: "Hồ Câu Đại Gia",
    organizationName: "Hệ thống Hồ câu ABC",
    huts: [
      { name: "Chòi VIP 1", areaName: "Khu A" },
      { name: "Chòi VIP 2", areaName: "Khu A" },
    ],
    packageName: "Ca ngày 5 tiếng",
    durationMinutes: 300,
    packagePriceVnd: 250000,
    customerName: "Nguyễn Văn Cần Thủ",
    customerPhone: "0912345678",
    startAt: new Date().toISOString(),
    plannedEndAt: new Date(Date.now() + 5 * 3600 * 1000).toISOString(),
    cashierName: "Thu ngân 01",
    paymentTiming: "PREPAID",
    paymentMethod: "CASH",
    prepaidAmountVnd: 250000,
    items: [
      { name: "Nước suối Aquafina", quantity: 2, unitPrice: 10000, totalVnd: 20000 },
      { name: "Cám câu cá chép", quantity: 1, unitPrice: 35000, totalVnd: 35000 },
    ],
    note: "Khách quen - tặng mồi câu thử",
  };

  const sampleReceipt: PaymentReceiptData = {
    invoiceId: "inv-98765432",
    sessionId: "sess-test-12345678",
    lakeName: "Hồ Câu Đại Gia",
    customerName: "Nguyễn Văn Cần Thủ",
    customerPhone: "0912345678",
    hutNames: "Chòi VIP 1, Chòi VIP 2",
    packageName: "Ca ngày 5 tiếng",
    lines: [
      { name: "Tiền ca: Ca ngày 5 tiếng (2 ô)", quantity: 2, unitPrice: 250000, totalVnd: 500000 },
      { name: "Nước suối Aquafina", quantity: 2, unitPrice: 10000, totalVnd: 20000 },
      { name: "Cám câu cá chép", quantity: 1, unitPrice: 35000, totalVnd: 35000 },
      { name: "Gia hạn: Thêm 1 giờ", quantity: 1, unitPrice: 50000, totalVnd: 50000 },
      { name: "Thêm giờ: Quá giờ 30p", quantity: 0.5, unitPrice: 50000, totalVnd: 25000 },
      { name: "Thu cá: Cá tra (4.5 kg)", quantity: 4.5, unitPrice: -30000, totalVnd: -135000 },
    ],
    packageTotalVnd: 500000,
    itemsTotalVnd: 55000,
    extensionsTotalVnd: 50000,
    overtimeTotalVnd: 25000,
    fishBuybackTotalVnd: 135000,
    totalAmountVnd: 495000,
    prepaidAmountVnd: 250000,
    supplementaryAmountVnd: 245000,
    paidAmountVnd: 495000,
    remainingVnd: 0,
    paymentMethod: "CASH",
    paymentTime: new Date().toISOString(),
    cashierName: "Thu ngân 01",
  };

  const ITERATIONS = 1000;

  // 1. Benchmark Ticket Generation
  let t0 = performance.now();
  let ticketBytes: Uint8Array = new Uint8Array();
  for (let i = 0; i < ITERATIONS; i++) {
    ticketBytes = buildSessionTicketEscPos(sampleTicket, { charsPerLine: 32, paperWidthMm: 58 });
  }
  const ticketTime = (performance.now() - t0) / ITERATIONS;

  // 2. Benchmark Receipt Generation
  t0 = performance.now();
  let receiptBytes: Uint8Array = new Uint8Array();
  for (let i = 0; i < ITERATIONS; i++) {
    receiptBytes = buildPaymentReceiptEscPos(sampleReceipt, { charsPerLine: 32, paperWidthMm: 58 });
  }
  const receiptTime = (performance.now() - t0) / ITERATIONS;

  // 3. Benchmark 80mm Receipt
  t0 = performance.now();
  let receipt80Bytes: Uint8Array = new Uint8Array();
  for (let i = 0; i < ITERATIONS; i++) {
    receipt80Bytes = buildPaymentReceiptEscPos(sampleReceipt, { charsPerLine: 48, paperWidthMm: 80 });
  }
  const receipt80Time = (performance.now() - t0) / ITERATIONS;

  // 4. Benchmark Base64 Bridge Encoding
  t0 = performance.now();
  let base64Result = "";
  for (let i = 0; i < ITERATIONS; i++) {
    base64Result = uint8ArrayToBase64(receiptBytes);
  }
  const base64Time = (performance.now() - t0) / ITERATIONS;

  console.log("================== PRINTING PAYLOAD AUDIT ==================");
  console.log(`1. Session Ticket ESC/POS Generation (58mm):`);
  console.log(`   - Time:           ${(ticketTime * 1000).toFixed(2)} µs (${ticketTime.toFixed(4)} ms)`);
  console.log(`   - Payload Size:   ${ticketBytes.length} bytes`);

  console.log(`\n2. Payment Receipt ESC/POS Generation (58mm):`);
  console.log(`   - Time:           ${(receiptTime * 1000).toFixed(2)} µs (${receiptTime.toFixed(4)} ms)`);
  console.log(`   - Payload Size:   ${receiptBytes.length} bytes`);

  console.log(`\n3. Payment Receipt ESC/POS Generation (80mm):`);
  console.log(`   - Time:           ${(receipt80Time * 1000).toFixed(2)} µs (${receipt80Time.toFixed(4)} ms)`);
  console.log(`   - Payload Size:   ${receipt80Bytes.length} bytes`);

  console.log(`\n4. Base64 Serialization for Native Bridge:`);
  console.log(`   - Time:           ${(base64Time * 1000).toFixed(2)} µs (${base64Time.toFixed(4)} ms)`);
  console.log(`   - Encoded String: ${base64Result.length} characters`);

  console.log(`\n>> TOTAL PAYLOAD GENERATION LATENCY:`);
  console.log(`   - Ticket:  ${((ticketTime + base64Time) * 1000).toFixed(2)} µs (~${(ticketTime + base64Time).toFixed(3)} ms)`);
  console.log(`   - Receipt: ${((receiptTime + base64Time) * 1000).toFixed(2)} µs (~${(receiptTime + base64Time).toFixed(3)} ms)`);
  console.log("=============================================================");
}

runPrintingBenchmark();
