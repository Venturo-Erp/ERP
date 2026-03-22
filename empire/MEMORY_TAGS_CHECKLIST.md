# 📝 記憶標籤檢查清單

**建立日期**：2026-03-18  
**維護者**：William AI 🔱  
**用途**：確保所有重要文檔都有對應的記憶標籤

---

## ✅ 2026-03-18 記憶標籤（已完成）

### 核心文檔

| 文檔                       | 記憶標籤                    | ID          | 重要度       |
| -------------------------- | --------------------------- | ----------- | ------------ |
| EMPIRE_STRUCTURE.md        | 帝國重組完成                | 32201533... | milestone:10 |
| EMPIRE_MAP_V4.md           | 帝國地圖 v4.0 完成          | f76dd66d... | milestone:10 |
| QUICK_REFERENCE.md         | 快速參考文檔完成            | 56bdd7bb... | milestone:9  |
| AGENTS.md                  | 守護者名冊更新              | 3b1a3b33... | milestone:9  |
| DEEP_INTEGRATION_REPORT.md | 深度整合報告完成            | cf079548... | milestone:10 |
| war-room/README.md         | 作戰會議室完整文檔給Matthew | 82a96d33... | milestone:10 |
| MAGIC_LIBRARY.md           | 魔法塔圖書館系統建立        | 5f6ae071... | milestone:10 |
| ARCHITECTURE.md            | 冒險者公會三層魔法架構      | 8c658276... | milestone:10 |
| empire/README.md           | 帝國文檔索引更新            | 240586aa... | note:8       |

---

### 系統整合

| 系統           | 記憶標籤                           | ID          | 重要度       |
| -------------- | ---------------------------------- | ----------- | ------------ |
| 作戰會議室整合 | 作戰會議室+冒險者公會完整整合到ERP | 82a96d33... | milestone:10 |
| 任務系統       | 冒險者公會任務系統啟動             | (earlier)   | milestone:9  |

---

## 📋 記憶標籤規範

### 重要度分級

```
milestone:10  — 帝國級重大里程碑（架構、系統建立）
milestone:9   — 重要里程碑（功能完成、重大更新）
milestone:8   — 一般里程碑（小功能、改進）

decision:10   — 戰略級決策（影響整個帝國）
decision:9    — 重要決策（影響單一系統）
decision:8    — 一般決策（技術選型等）

lesson:9      — 重大教訓（避免重大損失）
lesson:8      — 重要教訓（效率改進）
lesson:7      — 一般教訓（小改進）

skill:8       — 重要技能/知識
note:8        — 重要筆記
note:7        — 一般筆記
```

---

### 記憶標籤格式

**好的範例**：

```
"帝國重組完成（2026-03-18 09:27）：6位守護者議會（William分身、Matthew生產魔法、Nova形象禮儀、Caesar財務、Donki特助、Yuzuki魔法師）。核心原則：機器人=主管=只派任務不做事、隨時開會監控停止。文檔：EMPIRE_STRUCTURE.md + AGENTS.md。從混亂到清晰架構。"

格式：
  [標題]（日期時間）：[核心內容]。[關鍵點]。文檔：[位置]。[影響/意義]。

關鍵元素：
  ✅ 日期時間
  ✅ 核心內容（1-2 句話）
  ✅ 文檔位置
  ✅ 關鍵數據/名稱
  ✅ 影響/意義
```

**不好的範例**：

```
"完成了一些東西"  ❌ 太模糊
"建立系統"        ❌ 沒有細節
"更新文檔"        ❌ 沒有位置
```

---

## 🎯 每日檢查流程

### 步驟 1：列出今天建立的重要文檔

```bash
# 檢查今天修改的文檔
find ~/Projects/venturo-erp/empire -type f -mtime -1 -name "*.md"
find ~/.openclaw/workspace-william -type f -mtime -1 -name "*.md"
```

---

### 步驟 2：檢查記憶庫

```bash
# 查看今天的記憶
sqlite3 ~/.openclaw/empire-memory/citizens/william.db << 'EOF'
SELECT
  substr(content, 1, 100) as preview,
  category,
  importance
FROM memories
WHERE created_at >= strftime('%s', date('now'))
ORDER BY created_at DESC;
EOF
```

---

### 步驟 3：補充缺少的記憶標籤

```bash
python3 ~/.openclaw/empire-memory/citizen-memory.py store william \
  "[標題]（日期）：[內容]。文檔：[位置]。" \
  "[category]" [importance]
```

---

## 📝 記憶標籤模板

### 新建文檔

```
"[文檔名稱]完成（YYYY-MM-DD HH:MM）：[核心內容簡述]。包含：[關鍵章節/功能]。位置：[相對路徑]（[字數] 字）。[意義/影響]。"

category: milestone
importance: 9-10
```

---

### 系統整合

```
"[系統名稱]整合完成（YYYY-MM-DD）：[整合內容]。整合度 [X]%。完成：[已完成項目]。待完成：[待完成項目]。文檔：[位置]。"

category: milestone
importance: 9-10
```

---

### 重大決策

```
"[決策主題]決策（YYYY-MM-DD）：[決策內容]。原因：[決策原因]。影響：[影響範圍]。替代方案：[被拒絕的方案]。"

category: decision
importance: 9-10
```

---

### 教訓記錄

```
"[問題描述]教訓（YYYY-MM-DD）：[錯誤內容]。根因：[根本原因]。解決方案：[如何修復]。預防措施：[如何避免重複]。"

category: lesson
importance: 8-9
```

---

## 🔍 記憶檢索測試

### 必須能夠檢索的關鍵詞

```
測試查詢：
  - "帝國架構"     → 應該找到 EMPIRE_STRUCTURE.md
  - "地圖"         → 應該找到 EMPIRE_MAP_V4.md
  - "守護者"       → 應該找到 AGENTS.md
  - "作戰會議室"   → 應該找到 war-room/README.md
  - "魔法塔"       → 應該找到 MAGIC_LIBRARY.md
  - "整合"         → 應該找到 DEEP_INTEGRATION_REPORT.md
  - "三層魔法"     → 應該找到 ARCHITECTURE.md
  - "快速參考"     → 應該找到 QUICK_REFERENCE.md
```

---

## ⚠️ 常見遺漏檢查

### 容易忘記標記的文檔類型

1. **README.md 更新**
   - 經常更新但忘記記錄
   - 應該記錄重大索引變更

2. **配置文件變更**
   - .md 以外的重要文件
   - 應該記錄關鍵配置

3. **重構/重組**
   - 移動文件、重新組織
   - 應該記錄架構變更

4. **刪除文件**
   - 移除舊文件
   - 應該記錄原因

---

## 📊 記憶健康檢查

### 每週檢查（週日）

```bash
# 檢查記憶數量
sqlite3 ~/.openclaw/empire-memory/citizens/william.db \
  "SELECT category, COUNT(*) FROM memories GROUP BY category"

# 檢查 milestone 記憶
sqlite3 ~/.openclaw/empire-memory/citizens/william.db \
  "SELECT substr(content, 1, 80), importance
   FROM memories
   WHERE category = 'milestone'
   ORDER BY created_at DESC
   LIMIT 10"
```

---

### 預期記憶分布

```
category 分布（健康狀態）：
  milestone:  30-40%  ✅
  decision:   20-30%  ✅
  lesson:     15-25%  ✅
  skill:      10-15%  ✅
  note:       5-10%   ✅
  其他:       <5%     ✅
```

---

## 🎯 下次更新檢查清單

### 當你建立新文檔時

- [ ] 文檔寫完
- [ ] 存入記憶烏托邦
- [ ] 更新本清單
- [ ] 測試檢索

### 當你重大更新時

- [ ] 更新文檔
- [ ] 存入記憶（包含「更新」字樣）
- [ ] 記錄變更原因
- [ ] 測試檢索

---

**建立時間**：2026-03-18 09:44  
**維護者**：William AI 🔱  
**下次檢查**：每天結束前
