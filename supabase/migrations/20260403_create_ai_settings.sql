-- AI 設定表 — 存放所有可配置的 AI/Bot 設定
-- 管理員可在後台修改，不需要工程師改 code

CREATE TABLE IF NOT EXISTS ai_settings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  workspace_id UUID REFERENCES workspaces(id),

  -- 分類
  category TEXT NOT NULL,  -- 'line_bot', 'ai_prompt', 'notification', 'itinerary_ai'
  key TEXT NOT NULL,        -- 設定項的 key
  value TEXT,               -- 設定值（文字/JSON）
  description TEXT,         -- 給管理員看的說明

  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW(),
  updated_by UUID REFERENCES employees(id),

  UNIQUE(workspace_id, category, key)
);

-- 預設設定（角落旅行社）
INSERT INTO ai_settings (workspace_id, category, key, value, description) VALUES
-- LINE Bot 設定
('8ef05a74-1f87-48ab-afd3-9bfeb423935d', 'line_bot', 'bot_name', '角落旅行社數位助理', 'Bot 顯示名稱'),
('8ef05a74-1f87-48ab-afd3-9bfeb423935d', 'line_bot', 'welcome_message', '您好！我是角落旅行社的 AI 助理 🌏\n有任何旅遊問題都可以問我！', '新好友歡迎訊息'),
('8ef05a74-1f87-48ab-afd3-9bfeb423935d', 'line_bot', 'bot_id', '@745gftqd', 'LINE Bot ID'),

-- AI 客服提示詞
('8ef05a74-1f87-48ab-afd3-9bfeb423935d', 'ai_prompt', 'system_prompt', '你是「角落旅行社」的 AI 客服助理。

公司特色：
- 專營高端客製化旅遊
- 深度體驗優於走馬看花
- 質感服務，小團出發

回覆原則：
- 繁體中文回覆
- 親切但專業
- 200 字以內
- 有具體行程就推薦，沒有就引導客人留聯絡方式
- 不確定的資訊不要亂說', 'AI 客服的系統提示詞'),

('8ef05a74-1f87-48ab-afd3-9bfeb423935d', 'ai_prompt', 'intent_prompt', '分析用戶訊息的意圖，回傳 JSON：
{"intent": "行程查詢|價格詢問|報名流程|付款方式|簽證資訊|集合資訊|客訴處理|轉接真人|我的訂單|其他", "destination": "目的地或null", "tour_code": "團號或null"}', '意圖分析提示詞'),

-- 行程 AI 文案
('8ef05a74-1f87-48ab-afd3-9bfeb423935d', 'itinerary_ai', 'attraction_prompt', '你是專業的旅遊文案撰寫者。請為以下景點撰寫吸引人的介紹：

風格要求：
- 繁體中文
- 感性但有資訊量
- 150-200 字
- 要有畫面感
- 適合放在行程表上', '景點介紹 AI 文案提示詞'),

('8ef05a74-1f87-48ab-afd3-9bfeb423935d', 'itinerary_ai', 'daily_summary_prompt', '根據今日行程的景點和活動，撰寫一段簡短的每日行程摘要：

風格：簡潔、有期待感、50字以內', '每日行程摘要提示詞'),

-- 通知模板
('8ef05a74-1f87-48ab-afd3-9bfeb423935d', 'notification', 'booking_confirmed', '🎉 預訂確認\n\n{customer_name} 您好！\n您的 {tour_name} 已確認。\n\n出發日期：{departure_date}\n團號：{tour_code}\n\n如有任何問題歡迎隨時聯繫我們！', '訂單確認通知模板'),

('8ef05a74-1f87-48ab-afd3-9bfeb423935d', 'notification', 'payment_reminder', '💰 付款提醒\n\n{customer_name} 您好！\n您的 {tour_name} 尚有尾款 NT${remaining_amount} 未繳。\n\n出發日期：{departure_date}\n請於出發前完成付款。\n\n如已匯款請忽略此訊息 🙏', '付款提醒通知模板'),

('8ef05a74-1f87-48ab-afd3-9bfeb423935d', 'notification', 'departure_countdown', '✈️ 出發倒數 {days} 天！\n\n{tour_name}\n出發日期：{departure_date}\n集合時間：{meeting_time}\n集合地點：{meeting_location}\n\n祝旅途愉快！🌟', '出發倒數通知模板')

ON CONFLICT (workspace_id, category, key) DO NOTHING;

-- RLS
ALTER TABLE ai_settings ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "ai_settings_select" ON ai_settings;
CREATE POLICY "ai_settings_select" ON ai_settings FOR SELECT
USING (workspace_id = (SELECT workspace_id FROM employees WHERE supabase_user_id = auth.uid() LIMIT 1));

DROP POLICY IF EXISTS "ai_settings_update" ON ai_settings;
CREATE POLICY "ai_settings_update" ON ai_settings FOR UPDATE
USING (workspace_id = (SELECT workspace_id FROM employees WHERE supabase_user_id = auth.uid() LIMIT 1));

DROP POLICY IF EXISTS "ai_settings_insert" ON ai_settings;
CREATE POLICY "ai_settings_insert" ON ai_settings FOR INSERT
WITH CHECK (workspace_id = (SELECT workspace_id FROM employees WHERE supabase_user_id = auth.uid() LIMIT 1));
