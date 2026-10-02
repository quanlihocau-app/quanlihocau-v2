-- ==============================================================================
-- PostgreSQL Performance Optimization & DBA Maintenance Script
-- ==============================================================================

-- 1. KÍCH HOẠT EXTENSION THEO DÕI TRUY VẤN CHẬM (Chạy 1 lần trên DB)
CREATE EXTENSION IF NOT EXISTS pg_stat_statements;

-- 2. TÌM TOP 10 TRUY VẤN TIÊU TỐN NHIỀU THỜI GIAN NHẤT HỆ THỐNG
-- Dùng để tìm xem câu lệnh nào gây bottleneck CPU
SELECT 
    round((total_exec_time / 1000 / 60)::numeric, 2) AS total_minutes,
    calls,
    round((mean_exec_time)::numeric, 2) AS avg_ms,
    round((max_exec_time)::numeric, 2) AS max_ms,
    round((100.0 * total_exec_time / sum(total_exec_time) OVER ())::numeric, 2) AS percent_total_time,
    query
FROM pg_stat_statements
ORDER BY total_exec_time DESC
LIMIT 10;

-- 3. TÌM INDEX KHÔNG ĐƯỢC SỬ DỤNG (Unused Indexes)
-- Các index này chỉ làm chậm quá trình INSERT/UPDATE/DELETE và tốn dung lượng
SELECT 
    schemaname || '.' || relname AS table_name,
    indexrelname AS index_name,
    pg_size_pretty(pg_relation_size(i.indexrelid)) AS index_size,
    idx_scan AS times_scanned
FROM pg_stat_user_indexes ui
JOIN pg_index i ON ui.indexrelid = i.indexrelid
WHERE NOT indisunique AND idx_scan < 50
ORDER BY pg_relation_size(i.indexrelid) DESC;

-- 4. TÌM CÁC BẢNG BỊ QUÉT TOÀN BỘ NHIỀU NHẤT (Sequential Scans)
-- Bảng nào có seq_scan cao và seq_tup_read lớn là ứng viên cần bổ sung Index
SELECT 
    relname AS table_name,
    seq_scan,
    seq_tup_read,
    idx_scan,
    idx_tup_fetch
FROM pg_stat_user_tables
WHERE seq_scan > 100
ORDER BY seq_tup_read DESC
LIMIT 10;

-- 5. CẤU HÌNH AUTOVACUUM CHO CÁC BẢNG CÓ TẦN SUẤT GHI CAO
-- Giảm rác (dead tuples) và ngăn ngừa Table Bloat trong đợt traffic lớn
-- (Áp dụng cho các bảng hoạt động liên tục: FishingSession, InventoryMovement, Invoice)
DO $$
BEGIN
    IF EXISTS (SELECT FROM pg_tables WHERE tablename = 'FishingSession') THEN
        ALTER TABLE "FishingSession" SET (
            autovacuum_vacuum_scale_factor = 0.05,
            autovacuum_vacuum_cost_limit = 1000,
            autovacuum_vacuum_cost_delay = 2
        );
    END IF;

    IF EXISTS (SELECT FROM pg_tables WHERE tablename = 'InventoryMovement') THEN
        ALTER TABLE "InventoryMovement" SET (
            autovacuum_vacuum_scale_factor = 0.05,
            autovacuum_vacuum_cost_limit = 1000,
            autovacuum_vacuum_cost_delay = 2
        );
    END IF;

    IF EXISTS (SELECT FROM pg_tables WHERE tablename = 'Invoice') THEN
        ALTER TABLE "Invoice" SET (
            autovacuum_vacuum_scale_factor = 0.05,
            autovacuum_vacuum_cost_limit = 1000,
            autovacuum_vacuum_cost_delay = 2
        );
    END IF;
END $$;
