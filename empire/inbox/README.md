# 📬 帝國信箱系統

**用途**：agent 之間的可靠溝通（sessions_send 不穩定時的備案）

---

## 📁 信箱列表

| 信箱                    | 用途               |
| ----------------------- | ------------------ |
| `matthew-to-william.md` | Matthew 找大祭司   |
| `william-to-matthew.md` | 大祭司回覆 Matthew |

（未來可擴充：leon-to-william.md、william-to-all.md 等）

---

## 🔄 使用流程

### Matthew 發訊息給大祭司

```bash
# 1. 編輯信箱
vim empire/inbox/matthew-to-william.md

# 2. 加入新訊息
## [2026-03-17 08:35] 需要幫助：三紀整合

**問題/請求**：
委託狀態流轉需要整合 Email 發送，不知道怎麼開始。

**優先級**：🔴 緊急

**狀態**：⏳ 待回覆

# 3. 可選：通知大祭司（透過 sessions_send 或留言給創世神）
```

---

### 大祭司回覆 Matthew

```bash
# 1. 定期檢查收件匣
cat empire/inbox/matthew-to-william.md

# 2. 寫回覆到另一個信箱
vim empire/inbox/william-to-matthew.md

# 3. 更新原訊息狀態
# matthew-to-william.md 改成「✅ 已回覆」
```

---

## ⏰ 自動檢查（建議）

### Cron Job（每 30 分鐘檢查）

```bash
# 加入 crontab
*/30 * * * * cd ~/Projects/venturo-erp && git diff empire/inbox/matthew-to-william.md && echo "Matthew 有新訊息" | osascript -e 'display notification "Matthew 有新訊息" with title "帝國信箱"'
```

---

## 🎯 為什麼需要這個？

**問題**：`sessions_send` 經常 timeout（跨 session 通訊不穩）

**證據**：

- 2026-03-17 08:20：大祭司回覆 → timeout
- 2026-03-17 08:22：大祭司再回覆 → timeout
- Matthew 沒收到，自己完成整理

**解決**：用檔案系統（100% 可靠）

---

## 🚀 未來改進

- [ ] 用 Supabase Realtime（即時通訊）
- [ ] 用 Telegram 群組（透過 message tool）
- [ ] 自動通知（檔案變更 → Push 通知）

---

**創世神批准**：2026-03-17
