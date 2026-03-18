-- 新增 Akaunting 到魔法塔圖書館
-- 執行方式：在 Supabase SQL Editor 執行

INSERT INTO magic_library (
  name,
  category,
  official_url,
  github_url,
  current_version,
  latest_version,
  update_status,
  description
) VALUES (
  'Akaunting',
  'Accounting',
  'https://akaunting.com',
  'https://github.com/akaunting/akaunting',
  null,
  '3.1.22',
  'unknown',
  '開源會計軟體，Laravel 框架，支援多公司、多幣別、API 完整。用於 Venturo ERP 的自動化會計記帳系統。'
) ON CONFLICT (name) DO UPDATE SET
  latest_version = EXCLUDED.latest_version,
  description = EXCLUDED.description;
