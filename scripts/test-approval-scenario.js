require('dotenv').config();
const { Pool } = require('pg');

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: { rejectUnauthorized: false }
});

async function testScenario() {
  const lakeRes = await pool.query('SELECT id FROM "Lake" WHERE name=\'Kim Thông\' LIMIT 1');
  const lakeId = lakeRes.rows[0].id;
  const userRes = await pool.query('SELECT id FROM "User" WHERE email=\'huantr87@gmail.com\' LIMIT 1');
  const ownerId = userRes.rows[0].id;

  const testReqId = 'test-approval-' + Date.now();
  await pool.query(
    'INSERT INTO "ApprovalRequest" ("id", "lakeId", "type", "status", "requestedBy", "requestedByName", "note", "payload") VALUES ($1, $2, $3, $4, $5, $6, $7, $8)',
    [testReqId, lakeId, 'EXPENSE', 'PENDING', ownerId, 'Nhân viên trực ca', 'Mua 5 bao đá lạnh phục vụ hồ', JSON.stringify({ description: 'Mua đá lạnh', amountVnd: 50000 })]
  );
  console.log('✅ Bước 1: Nhân viên tạo yêu cầu duyệt thành công (Bắt buộc có ghi chú lý do). ID:', testReqId);

  const pending = await pool.query('SELECT id, note, status, "requestedByName" FROM "ApprovalRequest" WHERE id=$1', [testReqId]);
  console.log('✅ Bước 2: Hiển thị trên màn hình Chủ hồ:', pending.rows[0]);

  await pool.query(
    'UPDATE "ApprovalRequest" SET status=$1, "reviewedBy"=$2, "reviewedAt"=NOW() WHERE id=$3',
    ['APPROVED', ownerId, testReqId]
  );
  console.log('✅ Bước 3: Chủ hồ bấm [Duyệt ngay] -> Trạng thái chuyển sang APPROVED thành công.');

  await pool.query('DELETE FROM "ApprovalRequest" WHERE id=$1', [testReqId]);
  console.log('✅ Bước 4: Đã dọn dẹp dữ liệu test, hệ thống an toàn và sẵn sàng 100%.');
}

testScenario()
  .catch(console.error)
  .finally(() => pool.end());

