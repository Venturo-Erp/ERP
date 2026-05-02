# Git Stash 殘留盤點
> 2026-05-02 / 砍了 9 個 cleanup branch 殘留、剩 9 個是 William 的 WIP 待你決定

---

## 剩餘 9 個 stash（按建議優先順序）

### 🟢 可看一眼後砍（小、過期、特殊任務）

| Stash | 內容 | 建議 |
|---|---|---|
| `stash@{3}` | OpenClaw test：`# Test OK` 加進 ai/reports（45 行 metadata 改動）| 看內容、應該可砍（測試輸出）|
| `stash@{4}` | feat(about-page) WIP：8 檔（含 MemberPassportInfo、useOrderMembersData）| 看你還要不要 about page、不要就砍 |
| `stash@{6}` | .gitignore 加 1 行 | 應該可砍（1 行）|

### 🟡 真 WIP、可能有用

| Stash | 內容 | 建議 |
|---|---|---|
| `stash@{0}` | auto-stash before pull 20260426（系統自動）| pull 前的自動暫存、應該已 merge、可砍 |
| `stash@{1}` | tenant detail login-style cards 改 4 檔 | 看 UI 改動是否還想做 |
| `stash@{2}` | meeting AI endpoints 提取硬編 730 行 | 大改動、看是不是真進行中的功能 |
| `stash@{5}` | **退款功能開發中（品質巡邏前暫存）** | 標明真在開發、**不要砍**、之後接著做 |
| `stash@{7}` | 行事曆硬編碼中文提取到 labels（87 檔！）| 大改動、看是不是 i18n 的另一波、可能跟現在重構衝突 |
| `stash@{8}` | test: add 169 tests to reach 1515 total（receipt service）| 測試補充、看 |

### ❌ 已砍（cleanup/* branch 殘留）

砍掉的 9 個都是 `cleanup/labels-finance-orders` / `cleanup/css-surgery` / `cleanup/god-components-tours` / `cleanup/dead-code` 4 個過期 branch 的 WIP、且多個重複。

---

## 操作指南

```bash
# 看某個 stash 完整 diff
git stash show -p stash@{3}

# 砍掉
git stash drop stash@{3}

# 應用回來（不刪 stash）
git stash apply stash@{5}

# 應用 + 刪
git stash pop stash@{5}
```

**注意**：`stash drop` 後號碼會往前漂移、要從高號開始 drop。

---

## 建議流程

1. 先把 stash@{0} / stash@{3} / stash@{6} 砍掉（明顯小垃圾）
2. stash@{4}（about-page）/ stash@{1}（tenant UI）— 看內容決定
3. **stash@{5}（退款）千萬留著** — 是真 WIP
4. stash@{2}（meeting AI）/ stash@{7}（行事曆 i18n）/ stash@{8}（測試）— 跟這次重構可能衝突、先別 pop、看內容再說
