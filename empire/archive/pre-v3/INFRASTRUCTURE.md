# 🏗️ Venturo 帝國基礎建設

**Supabase、Tailscale、Dev Server、部署流程**

---

## 🗺️ 基礎建設地圖

```
┌─────────────────────────────────────────────────────────┐
│                   網際網路                                │
└─────────────────────────────────────────────────────────┘
                          ↓
        ┌─────────────────┼─────────────────┐
        ↓                 ↓                 ↓
┌───────────────┐ ┌───────────────┐ ┌───────────────┐
│  Vercel       │ │  Supabase     │ │  Tailscale    │
│  (部署)       │ │  (資料庫)     │ │  (VPN)        │
└───────────────┘ └───────────────┘ └───────────────┘
        ↓                 ↑                 ↓
┌───────────────┐         │         ┌───────────────┐
│ ERP 正式站    │─────────┘         │ Mac mini      │
│ (生產環境)    │                   │ (Dev Server)  │
└───────────────┘                   └───────────────┘
                                            ↓
                                    ┌───────────────┐
                                    │ ERP:3000      │
                                    │ Online:3001   │
                                    └───────────────┘
```

---

## 🗄️ Supabase（資料庫）

### 專案資訊

| 項目 | 內容 |
|------|------|
| **專案 ID** | `pfqvdacxowpgfamuvnsn` |
| **專案名稱** | Venturo Production |
| **Region** | Northeast Asia (Tokyo) |
| **PostgreSQL 版本** | 15.1 |
| **Dashboard** | https://supabase.com/dashboard/project/pfqvdacxowpgfamuvnsn |

### 連線資訊

**API URL**：
```
https://pfqvdacxowpgfamuvnsn.supabase.co
```

**Database URL** _(敏感資訊，不記錄在此)_：
- 存放位置：`~/Projects/venturo-erp/.env.local`
- 格式：`postgresql://postgres:[PASSWORD]@[HOST]:5432/postgres`

**Service Role Key** _(敏感資訊)_：
- 存放位置：`~/Projects/venturo-erp/.env.local`
- 用途：Server-side API 呼叫（繞過 RLS）

---

### 核心資料表

| 表名 | 說明 | 行數（估計） | 索引 |
|------|------|--------------|------|
| **tour_itinerary_items** | 核心表（唯一真相來源） | 54 欄位 | id, tour_id |
| **tour_quotes** | 報價單 | 關聯表 | id, tour_id |
| **tour_requests** | 需求單 | 關聯表 | id, tour_id |
| **suppliers** | 供應商 | 關聯表 | id, company_id |
| **hotels** | 飯店 | 關聯表 | id |
| **customers** | 客戶 | 關聯表 | id, company_id |

**查看 Schema**：
```sql
SELECT table_name, column_name, data_type
FROM information_schema.columns
WHERE table_name = 'tour_itinerary_items'
ORDER BY ordinal_position;
```

---

### Row Level Security (RLS)

**狀態**：✅ 所有表都已啟用 RLS

**政策範例**：
```sql
-- 使用者只能看自己公司的資料
CREATE POLICY "company_isolation"
ON tours FOR SELECT
USING (company_id = auth.jwt() ->> 'company_id');
```

**檢查 RLS**：
```sql
SELECT schemaname, tablename, rowsecurity
FROM pg_tables
WHERE schemaname = 'public';
```

---

### 備份策略

**自動備份**：
- Supabase 每日自動備份
- 保留 7 天

**手動備份**：
```bash
# 匯出整個資料庫
pg_dump -h pfqvdacxowpgfamuvnsn.supabase.co -U postgres -d postgres > backup.sql

# 匯入
psql -h pfqvdacxowpgfamuvnsn.supabase.co -U postgres -d postgres < backup.sql
```

---

## 🌐 Tailscale（VPN）

### 用途

**讓 William 的 MacBook 可以存取 Mac mini 的 Dev Server。**

```
MacBook (William)
  ↓ Tailscale VPN
Mac mini (Dev Server)
  ↓ localhost:3000
ERP Dev Server
```

---

### 網路資訊

| 設備 | Tailscale IP | 用途 |
|------|--------------|------|
| **Mac mini** | `100.89.92.46` | Dev Server 主機 |
| **MacBook** | _(動態)_ | William 的電腦 |

**Dev Server 位置**：
- **ERP**：http://100.89.92.46:3000
- **Online**：http://100.89.92.46:3001

---

### 連線測試

```bash
# 測試 Tailscale 連線
ping 100.89.92.46

# 測試 Dev Server
curl http://100.89.92.46:3000
```

---

## 💻 Dev Server（Mac mini）

### 系統資訊

| 項目 | 內容 |
|------|------|
| **設備** | Mac mini (M2, 2023) |
| **作業系統** | macOS Sonoma 14.x |
| **RAM** | 16 GB |
| **Storage** | 512 GB SSD |
| **Tailscale IP** | 100.89.92.46 |

---

### Dev Server 啟動

#### ERP Dev Server (Port 3000)

```bash
# 啟動
cd ~/Projects/venturo-erp
rm -rf .next
npm run dev > /tmp/erp-dev.log 2>&1 &

# 查看 log
tail -f /tmp/erp-dev.log

# 查看錯誤
grep -i "error\|module not found" /tmp/erp-dev.log

# 停止
pkill -f "next dev --port 3000"
```

---

#### Online Dev Server (Port 3001)

```bash
# 啟動
cd ~/Projects/venturo-online
rm -rf .next
npm run dev --port 3001 > /tmp/online-dev.log 2>&1 &

# 查看 log
tail -f /tmp/online-dev.log

# 查看錯誤
grep -i "error\|module not found" /tmp/online-dev.log

# 停止
pkill -f "next dev --port 3001"
```

---

### Dev Server 健康檢查

```bash
# 檢查 ERP 是否運行
curl http://localhost:3000

# 檢查 Online 是否運行
curl http://localhost:3001

# 檢查 process
ps aux | grep "next dev"

# 檢查 log
tail -30 /tmp/erp-dev.log
tail -30 /tmp/online-dev.log
```

---

## 🚀 Vercel（部署）

### 專案資訊

| 專案 | Vercel URL | GitHub Repo | Branch |
|------|-----------|-------------|--------|
| **Venturo ERP** | venturo-erp.vercel.app | venturo-erp | main |
| **Venturo Online** | venturo-online.vercel.app | venturo-online | main |

---

### 部署流程

#### 自動部署（推薦）

```bash
# 1. 本機測試
npm run dev

# 2. 提交程式碼
git add .
git commit -m "feat: 新功能"
git push origin main

# 3. Vercel 自動部署（2-3 分鐘）
# 4. 檢查 https://venturo-erp.vercel.app
```

---

#### 手動部署

```bash
# 安裝 Vercel CLI
npm install -g vercel

# 登入
vercel login

# 部署
cd ~/Projects/venturo-erp
vercel --prod
```

---

### 環境變數管理

**查看環境變數**：
```bash
vercel env ls
```

**新增環境變數**：
```bash
vercel env add SUPABASE_URL production
vercel env add SUPABASE_ANON_KEY production
```

**重要環境變數**：
- `NEXT_PUBLIC_SUPABASE_URL`
- `NEXT_PUBLIC_SUPABASE_ANON_KEY`
- `SUPABASE_SERVICE_ROLE_KEY`（Server-side only）

---

### 部署檢查清單

- [ ] 本機測試通過（`npm run dev`）
- [ ] TypeScript 編譯通過（`npm run build`）
- [ ] 沒有 console.error
- [ ] 環境變數已設定
- [ ] RLS 政策已更新（如有資料庫變更）
- [ ] 通知 William/Leon 即將部署

---

## 🔧 開發工具

### Node.js & npm

```bash
# 版本
node -v  # v20.x 或以上
npm -v   # v10.x 或以上

# 安裝依賴
npm install

# 清除快取
npm cache clean --force
rm -rf node_modules package-lock.json
npm install
```

---

### Git

```bash
# 設定
git config --global user.name "William"
git config --global user.email "william@venturo.com"

# 常用指令
git status
git add .
git commit -m "message"
git push origin main
git pull origin main

# 救回誤刪
git reflog
git reset --hard HEAD@{1}
```

---

### VS Code

**推薦擴充套件**：
- ESLint
- Prettier
- Tailwind CSS IntelliSense
- TypeScript Vue Plugin (Volar)
- GitLens

**設定檔**（`.vscode/settings.json`）：
```json
{
  "editor.formatOnSave": true,
  "editor.defaultFormatter": "esbenp.prettier-vscode",
  "typescript.tsdk": "node_modules/typescript/lib"
}
```

---

## 📊 監控 & 日誌

### Vercel Analytics

**查看**：https://vercel.com/analytics

**指標**：
- 頁面瀏覽量
- 使用者數
- 效能指標（Core Web Vitals）

---

### Supabase Logs

**查看**：https://supabase.com/dashboard/project/pfqvdacxowpgfamuvnsn/logs

**類型**：
- API Logs（API 呼叫）
- Database Logs（SQL 查詢）
- Auth Logs（登入/登出）

---

### Dev Server Logs

```bash
# ERP
tail -f /tmp/erp-dev.log

# Online
tail -f /tmp/online-dev.log

# 只看錯誤
grep -i error /tmp/erp-dev.log
```

---

## 🚨 常見問題 & 解決方案

### 問題 1：Dev Server 無法啟動

**症狀**：
```
Error: listen EADDRINUSE: address already in use :::3000
```

**解決**：
```bash
# 找出佔用 port 的 process
lsof -i :3000

# 殺掉 process
kill -9 [PID]

# 重新啟動
npm run dev
```

---

### 問題 2：Supabase 連線失敗

**症狀**：
```
Error: Connection timeout
```

**解決**：
1. 檢查環境變數：`echo $NEXT_PUBLIC_SUPABASE_URL`
2. 檢查網路：`ping pfqvdacxowpgfamuvnsn.supabase.co`
3. 檢查 Supabase 狀態：https://status.supabase.com

---

### 問題 3：Vercel 部署失敗

**症狀**：
```
Error: Build failed
```

**解決**：
1. 本機測試：`npm run build`
2. 查看 Vercel 錯誤訊息
3. 檢查環境變數是否正確
4. 回滾到上一版：Vercel Dashboard → Deployments → Rollback

---

### 問題 4：Tailscale 連線失敗

**症狀**：
```
ping: cannot resolve 100.89.92.46
```

**解決**：
1. 檢查 Tailscale 是否運行：`tailscale status`
2. 重新連線：`tailscale up`
3. 檢查防火牆

---

## 🔐 安全 & 權限

### Supabase 權限

| 角色 | 權限 | 用途 |
|------|------|------|
| **Service Role** | 繞過 RLS，完整存取 | Server-side API |
| **Anon Key** | 遵守 RLS，公開 Key | Client-side API |

**絕對不要**：
- ❌ 在前端使用 Service Role Key
- ❌ 把 Service Role Key 提交到 Git

---

### Vercel 權限

| 角色 | 權限 |
|------|------|
| **Owner** | 完整權限（William） |
| **Member** | 部署權限（Matthew） |

---

### GitHub 權限

| 角色 | 權限 |
|------|------|
| **Admin** | 完整權限（William） |
| **Write** | Push 權限（Matthew, 前端工程師） |

---

## 📚 相關文檔

- [帝國憲法](LAWS.md) — 設計原則、禁止事項
- [帝國總覽](EMPIRE_OVERVIEW.md) — 組織架構、產品矩陣
- [ERP 商店](shops/erp/) — ERP 開發文檔

---

**基礎建設穩固 = 帝國穩固。**
