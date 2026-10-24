# Backfill số tiền đã thu trên hoá đơn

Script `scripts/backfill-invoice-paid-amount.mjs` tính lại `paidAmountVnd`, `refundedAmountVnd`, `balanceDueVnd` và `status` của từng hoá đơn từ các phiếu thu/chi gắn với hoá đơn đó. Công thức trùng `invoiceMoneyFromPayments` trong `src/lib/money.ts`.

## Cách chạy

Mặc định là dry-run, không ghi gì.

```bash
DATABASE_URL="postgresql://USER:PASS@127.0.0.1:5432/DBNAME" node scripts/backfill-invoice-paid-amount.mjs
```

Ghi vào bản Postgres local hoặc bản sao vứt đi:

```bash
DATABASE_URL="postgresql://USER:PASS@127.0.0.1:5432/DBNAME" node scripts/backfill-invoice-paid-amount.mjs --apply
```

Host không phải `localhost`, `127.0.0.1` hoặc `::1` bị từ chối. `--allow-nonlocal` chỉ dùng khi cố ý trỏ vào một bản sao vứt đi. Không chạy script này với database production.

Chạy lại nhiều lần không đổi những dòng đã đúng. Hoá đơn `VOIDED` giữ trạng thái `VOIDED` và số còn nợ bằng 0.

## Việc script không làm

- Không huỷ các phiên đã `CANCELLED` từ trước. Chủ hồ huỷ từng hoá đơn nếu cần hoàn tiền.
- Không bịa phương thức cho các lần thu cá cũ không gắn vé.
- Không sửa các bản chốt ca đã đóng. Số trên thẻ ca cũ là ảnh chụp. Màn đối soát tính lại theo quy tắc mới.
- Doanh thu theo giờ thêm dòng (`InvoiceLine.createdAt`, giờ Sài Gòn) làm báo cáo ngày cũ có thể khác: dòng thêm sau nửa đêm UTC nhưng trước nửa đêm giờ Việt Nam sẽ nằm ở ngày hôm sau.

## Migration

`prisma/migrations/20261023180000_lake_bank_and_line_time` chỉ thêm cột và index:

- `Lake.contactPhone`, `bankCode`, `bankName`, `bankAccountNumber`, `bankAccountName`
- index `InvoiceLine.createdAt` và `(invoiceId, createdAt)`

Không xoá cột, không đổi dữ liệu sẵn có. Triển khai bằng `prisma migrate deploy` khi đã kiểm tra trên bản sao, không chạy nhầm vào production từ máy này.
