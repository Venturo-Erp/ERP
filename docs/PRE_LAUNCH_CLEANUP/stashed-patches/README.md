# Stashed Patches（過期半成品檔案）

未來想重做、暫存當參考的 patch 檔。**不要直接 git apply**（可能跟現在 main 衝突）、用 `cat` 看內容、人工抄關鍵改動。

## 為什麼有這目錄

過去用 `git stash` 暫存半成品、放著放著就過期（main 改 N 輪、原本 stash 的檔案可能被砍）。直接 pop 會「復活殭屍檔案」。

新規範：**未來不再用 stash**、改用 `wip/<日期>-<名字>` branch（見 dotfiles alias `gwip`）。

舊 stash 過期前、把內容存進這裡當「歷史紀錄 + 重做參考」、然後 stash drop 清空抽屜。

## 待重做清單

| Patch | 原 stash 日期 | 業務功能 | 為什麼放這 |
|---|---|---|---|
| `2026-04-16-regions-v2.patch` | 2026-04-16 | RegionsTab SSOT 改造（直接讀 ref_countries、加「國內/中國/南亞/中亞」4 分類、workspace toggle 啟用/停用國家） | 19 檔有 4 檔已被砍、不能直接 pop。需要時開新 branch 重做。 |

## 重做流程

```bash
# 1. 開新 branch
git checkout -b wip/$(date +%Y-%m-%d)-regions-v2

# 2. 看 patch 內容（不直接 apply）
cat docs/PRE_LAUNCH_CLEANUP/stashed-patches/2026-04-16-regions-v2.patch

# 3. 對齊現在 main 的程式碼結構、人工抄關鍵改動
# 4. 完工後 patch 可以從這裡刪掉
```
