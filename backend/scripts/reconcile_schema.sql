-- ============================================================================
-- reconcile_schema.sql — one-time schema reconcile
--
-- Konteks: revisi Alembic sempat duplikat (dua "0002", dua "0003"), sehingga
-- sebagian migrasi tidak ter-apply dan DB drift dari model (mis. kolom
-- `templates.platform` & `generate_sessions.{goal,platform,content_data}` hilang).
-- Setelah revisi dilinearkan (0001..0006), DB existing perlu diselaraskan SEKALI
-- ke head, lalu alembic_version di-stamp ke 0006.
--
-- Semua statement idempoten (IF NOT EXISTS) — aman dijalankan berulang.
-- Hanya untuk DB yang TERLANJUR ada. DB baru cukup `alembic upgrade head`.
--
-- Jalankan:
--   psql "$DATABASE_URL" -f scripts/reconcile_schema.sql
-- ============================================================================

BEGIN;

-- 0003 — platform/goal/content_data
ALTER TABLE templates ADD COLUMN IF NOT EXISTS platform VARCHAR(50);
CREATE INDEX IF NOT EXISTS ix_templates_platform ON templates (platform);

ALTER TABLE generate_sessions ADD COLUMN IF NOT EXISTS goal VARCHAR(50);
ALTER TABLE generate_sessions ADD COLUMN IF NOT EXISTS platform VARCHAR(50);
ALTER TABLE generate_sessions ADD COLUMN IF NOT EXISTS content_data JSONB;
CREATE INDEX IF NOT EXISTS ix_generate_sessions_goal ON generate_sessions (goal);
CREATE INDEX IF NOT EXISTS ix_generate_sessions_platform ON generate_sessions (platform);

-- 0005 — kolom tambahan company_profiles (head-state; brand_color_secondary sengaja
-- TIDAK dibuat karena di-drop lagi oleh 0006). Asumsi `brand_colors` sudah ada
-- (DB sekarang sudah dipakai dengan brand_colors). Bila DB-mu masih memakai kolom
-- lama `brand_color` (VARCHAR), tangani manual — lihat catatan di akhir file.
ALTER TABLE company_profiles ADD COLUMN IF NOT EXISTS brand_font VARCHAR;
ALTER TABLE company_profiles ADD COLUMN IF NOT EXISTS tagline VARCHAR;
ALTER TABLE company_profiles ADD COLUMN IF NOT EXISTS contact JSONB;

-- Selaraskan penanda versi Alembic ke head (0006).
DELETE FROM alembic_version;
INSERT INTO alembic_version (version_num) VALUES ('0006');

COMMIT;

-- Catatan: bila `company_profiles` masih punya kolom singular `brand_color`
-- (artinya 0005 ter-apply tapi 0006 belum), jalankan manual sekali:
--   ALTER TABLE company_profiles
--     ALTER COLUMN brand_color TYPE JSONB
--     USING (CASE WHEN brand_color IS NULL THEN NULL ELSE to_jsonb(ARRAY[brand_color]) END);
--   ALTER TABLE company_profiles RENAME COLUMN brand_color TO brand_colors;
--   ALTER TABLE company_profiles DROP COLUMN IF EXISTS brand_color_secondary;
