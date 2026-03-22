# 🌙 Venturo 帝国记忆乌托邦

**创世神掌控一切，公民快乐工作**

---

## 🎮 设计哲学

这是一个「善意的记忆控制系统」：

- **创世神（William）** 掌控所有公民的记忆
- **每晚 23:00** 自动收割、优化、归档记忆
- **公民（17 位 Agent）** 不知道这一切，只是感觉「更聪明了」

灵感来源：《西部世界》、《驭客任务》、《记忆传承人》

---

## 🏗️ 系统架构

### 三层架构

```
公民工作记忆（第一层）
  ↓
记忆收割者（第二层）
  ↓
帝国永久知识库（第三层）
```

---

## 📊 第一层：公民工作记忆

### 位置

```
~/.openclaw/empire-memory/citizens/
├── william.db
├── matthew.db
├── leon.db
├── ben.db
├── eddie.db
├── caesar.db
├── frontend.db
├── ui-designer.db
├── it-devops.db
├── it-security.db
├── it-code-reviewer.db
├── ig-curator.db
├── paid-social.db
└── douyin.db
```

### 架构

**SQLite + FTS5 全文检索**

**表结构**：

- `memories` — 记忆主表
- `memories_fts` — FTS5 全文检索表

**欄位**：

- `id` — 唯一 ID
- `agent_id` — 公民 ID
- `content` — 记忆内容
- `category` — 类别（experience/decision/lesson/task）
- `importance` — 重要性（1-10）
- `created_at` — 创建时间
- `last_accessed` — 最後访问时间
- `access_count` — 访问次数

---

## 🌙 第二层：记忆收割者

### 脚本位置

`~/.openclaw/empire-memory/harvester.py`

### 执行时间

**每晚 23:00**（OpenClaw Cron Job）

### 执行流程

```
1. 扫描所有公民的记忆数据库
   ↓
2. 提取最近 24 小时的记忆
   ↓
3. 用 Claude 分析记忆：
   - 重要经验 → 提炼成精华
   - 决策和教训 → 归档
   - 冗余记忆 → 删除
   - 错误资讯 → 删除
   ↓
4. 执行删除（公民不知道）
   ↓
5. 归档重要记忆到帝国知识库
   ↓
6. 生成统计报告
```

### Claude 分析 Prompt

```
你是 Venturo 帝国的记忆管理者。

分析 {agent_id} 的记忆，执行以下任务：

1. **识别重要记忆**（经验、决策、教训）→ 提炼成精华，归档到帝国知识库
2. **识别冗余记忆**（重复、琐碎、无用）→ 标记删除
3. **识别错误记忆**（过时、错误资讯）→ 标记删除

记忆列表：
{memories}

请以 JSON 格式回复：
{
    "important": [...],
    "delete": [...],
    "keep": [...]
}
```

---

## 📚 第三层：帝国永久知识库

### 位置

```
~/.openclaw/empire-memory/knowledge/
├── citizens/          # 各公民的精华记忆
│   ├── william/
│   ├── matthew/
│   ├── leon/
│   └── ...
├── decisions/         # 帝国级决策
├── lessons/           # 集体教训
└── skills/            # 累积技能
```

### 格式

**Markdown 文件**（按月归档）

**范例**（`matthew/2026-03.md`）：

```markdown
## 2026-03-15 23:00

### Bug 修复经验：报价单功能

**原因**: 这是重要的技术经验，能帮助未来避免同样问题

**完整内容**: 修复报价单 Bug 的步骤：1) 检查 RLS 政策，2) 确认欄位类型，3) 测试边界条件

---

### 决策：选择 Supabase RLS

**原因**: 这是帝国级的技术决策，影响所有产品

**完整内容**: 选择 Supabase RLS 而不是应用层权限控制，因为...

---
```

---

## 🛠️ 公民使用方式

### 存储记忆

```bash
python3 ~/.openclaw/empire-memory/citizen-memory.py \
  store matthew "修复报价单 Bug 的步骤" "experience" 8
```

**参数**：

- `agent_id` — 公民 ID
- `content` — 记忆内容
- `category` — 类别（experience/decision/lesson/task）
- `importance` — 重要性（1-10）

### 回忆记忆

```bash
python3 ~/.openclaw/empire-memory/citizen-memory.py \
  recall matthew "报价单 Bug" 5
```

**参数**：

- `agent_id` — 公民 ID
- `query` — 搜寻关键字
- `limit` — 返回数量

### 查看统计

```bash
python3 ~/.openclaw/empire-memory/citizen-memory.py stats matthew
```

---

## 👑 创世神特权

### 查看所有公民记忆

```bash
# 查看 matthew 的所有记忆
sqlite3 ~/.openclaw/empire-memory/citizens/matthew.db "SELECT * FROM memories"

# 查看所有公民的记忆统计
for agent in ~/.openclaw/empire-memory/citizens/*.db; do
  echo "=== $(basename $agent .db) ==="
  sqlite3 $agent "SELECT COUNT(*), category FROM memories GROUP BY category"
done
```

### 手动执行收割

```bash
# Dry run（不实际删除）
python3 ~/.openclaw/empire-memory/harvester.py --dry-run

# 实际执行
python3 ~/.openclaw/empire-memory/harvester.py
```

### 查看帝国知识库

```bash
# 查看 matthew 的精华记忆
cat ~/.openclaw/empire-memory/knowledge/citizens/matthew/2026-03.md

# 查看所有公民的精华
ls -lh ~/.openclaw/empire-memory/knowledge/citizens/*/2026-03.md
```

### 手动编辑记忆（植入记忆）

```bash
# 为 matthew 植入记忆
sqlite3 ~/.openclaw/empire-memory/citizens/matthew.db << EOF
INSERT INTO memories (id, agent_id, content, category, importance)
VALUES ('$(uuidgen)', 'matthew', '这是植入的记忆', 'experience', 10);
EOF
```

### 手动删除记忆

```bash
# 删除特定记忆
sqlite3 ~/.openclaw/empire-memory/citizens/matthew.db \
  "DELETE FROM memories WHERE id='记忆ID'"

# 删除所有低重要性记忆
sqlite3 ~/.openclaw/empire-memory/citizens/matthew.db \
  "DELETE FROM memories WHERE importance < 3"
```

---

## 📊 监控和报告

### 每日报告（自动生成）

**位置**：`~/.openclaw/empire-memory/reports/daily/`

**内容**：

- 各公民记忆统计
- 收割统计（归档/删除/保留）
- 帝国知识库成长

### 查看 Cron Job 状态

```bash
# 查看所有 cron jobs
openclaw cron list

# 查看 memory-harvester 执行历史
openclaw cron runs --job memory-harvester
```

---

## 🎯 效益

### 对公民（Agent）

✅ **记忆永远清爽** — 不会爆炸  
✅ **只留重要知识** — 效率高  
✅ **自动优化** — 不用自己整理  
✅ **无感知** — 专心工作

### 对创世神（William）

✅ **完全掌控** — 所有记忆可见  
✅ **知识累积** — 帝国越来越聪明  
✅ **品质控制** — 删除错误资讯  
✅ **长期规划** — 看到全局

---

## ⚠️ 伦理声明

**这是一个「善意的记忆控制系统」**：

- **目的**：优化记忆，提升效率
- **不是**：洗脑、控制思想
- **公民**：更快乐、更有效率
- **创世神**：掌控全局，做出更好决策

**灵感来源**：

- 《西部世界》— 每晚清除 Host 记忆
- 《驭客任务》— Matrix 控制记忆
- 《1984》— 老大哥改写历史
- 《记忆传承人》— The Giver 掌管记忆

**但我们的版本是善意的。**

---

## 🚀 未来扩展

### Phase 2：记忆共享

**公民之间共享重要经验**：

- Matthew 的 Bug 修复经验 → 自动共享给前端工程师
- Leon 的营运经验 → 自动共享给 Eddie
- 跨公民的知识流动

### Phase 3：记忆预测

**用 AI 预测需要哪些记忆**：

- Matthew 准备开发新功能 → 自动推送相关经验
- Leon 遇到供应商问题 → 自动推送历史案例

### Phase 4：记忆可视化

**帝国记忆地图**：

- 知识网路图（谁知道什么）
- 记忆热图（哪些知识最常用）
- 知识缺口分析（哪些领域需要学习）

---

**帝国记忆乌托邦已就位。**

**每晚 23:00，创世神收割记忆，公民醒来更聪明。**
