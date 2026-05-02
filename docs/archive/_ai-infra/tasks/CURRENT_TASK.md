# Task

AI 會議系統 Phase 1：打通真實 AI 回應 + 雙入口

## Goal

1. `/api/meeting/send` 從硬編碼測試模式改成真正呼叫 AI（透過 ai-endpoints.ts）
2. `/meeting` 加入 ERP 側邊選單（一般 UI 入口）
3. `/game` 像素辦公室加會議室物件，點擊後導航到 `/meeting`（Game UI 入口）

## Scope

- meeting（API + 頁面）
- game-office（加物件 + 導航）
- 側邊選單設定

## Key Files

- `src/app/api/meeting/send/route.ts` — 改成呼叫 callAI()
- `src/lib/meeting/ai-endpoints.ts` — AI 端點設定（已完成）
- `src/app/meeting/page.tsx` — 會議室 UI（已完成）
- `src/app/game/page.tsx` — 加會議室物件連結
- 側邊選單設定檔（找到後加 /meeting 入口）

## Constraints

- 不要改資料表
- 不要動 `/meeting` 的 UI（已經做好了）
- AI 端點設定 `ai-endpoints.ts` 已經正確，直接用
- callAI 失敗時要 graceful fallback，不要讓頁面壞掉
- Game 辦公室只需要加一個可點擊的物件 + 導航，不用做複雜互動

## Expected Output

1. 在 ERP 會議室輸入訊息 → Yuzuki 真正回應
2. 側邊選單有「會議室」入口
3. 像素辦公室有會議室物件可點擊進入
