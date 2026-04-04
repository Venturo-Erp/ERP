# Golutra + OpenClaw 整合測試報告

**測試日期**: 2026-04-04  
**執行者**: Matthew 🔧  
**基於研究**: Force 的 `golutra-openclaw-integration.md`  
**狀態**: ✅ 環境準備完成 / 🟡 功能測試進行中

---

## 執行摘要

成功完成 Golutra Desktop App 安裝與基礎環境配置。當前處於「雙軌並行」模式，保留現有 Telegram + sessions_send 機制，新增 Golutra 可視化層。

**關鍵成果**:
- ✅ Golutra Desktop App 已安裝（v2024.3.27）
- ✅ golutra-mcp MCP 橋接器已安裝（v0.1.2）
- ✅ Workspace 目錄結構已建立
- ✅ 配置檔案已生成
- 🟡 MCP 連接測試待完成
- 🟡 可視化功能測試待完成

---

## 階段 1：環境準備 ✅

### 1.1 Golutra Desktop App 安裝

**發現**: Golutra 已正式發布！最新版本 v2024.3.27 包含：
- ✅ macOS Apple Silicon 支援
- ✅ MCP 聊天功能
- ✅ 終端穩定性優化
- ✅ 協作模式增強

**安裝步驟**:
```bash
# 1. 下載 DMG
cd ~/Downloads
curl -L -o golutra_darwin_aarch64.dmg \
  "https://github.com/golutra/golutra/releases/latest/download/golutra_darwin_aarch64.dmg"

# 2. 掛載並安裝
hdiutil attach golutra_darwin_aarch64.dmg
cp -R /Volumes/Golutra/Golutra.app /Applications/
hdiutil detach /Volumes/Golutra -force

# 3. 移除隔離屬性
xattr -rd com.apple.quarantine /Applications/Golutra.app

# 4. 驗證安裝
ls -la /Applications/Golutra.app
```

**結果**: ✅ 安裝成功，應用位於 `/Applications/Golutra.app`

### 1.2 golutra-mcp 安裝

```bash
npm install -g golutra-mcp
```

**結果**: ✅ 已安裝 v0.1.2，包含 92 個依賴套件

**CLI 位置**: `/Applications/Golutra.app/Contents/MacOS/golutra-cli`

### 1.3 Workspace 目錄建立

```bash
# 建立 Golutra workspace 根目錄
mkdir -p ~/golutra-workspaces/{logan,matthew,nova,caesar,donki,forge}

# 建立符號連結到 OpenClaw workspace
ln -s ~/.openclaw/workspace-logan ~/golutra-workspaces/logan/openclaw
ln -s ~/.openclaw/workspace-matthew ~/golutra-workspaces/matthew/openclaw
ln -s ~/.openclaw/workspace-nova ~/golutra-workspaces/nova/openclaw
ln -s ~/.openclaw/workspace-forge ~/golutra-workspaces/forge/openclaw
```

**結果**: ✅ 6 個 workspace 目錄已建立，符號連結正常

**目錄結構**:
```
~/golutra-workspaces/
├── logan/
│   └── openclaw -> ~/.openclaw/workspace-logan
├── matthew/
│   └── openclaw -> ~/.openclaw/workspace-matthew
├── nova/
│   └── openclaw -> ~/.openclaw/workspace-nova
├── caesar/
├── donki/
└── forge/
    └── openclaw -> ~/.openclaw/workspace-forge
```

### 1.4 環境變數配置

**檔案**: `~/.openclaw/golutra.env`

```bash
export GOLUTRA_CLI_PATH=/Applications/Golutra.app/Contents/MacOS/golutra-cli
export GOLUTRA_PROFILE=stable
export GOLUTRA_WORKSPACE_PATH=/Users/tokichin/golutra-workspaces/logan
export GOLUTRA_COMMAND_TIMEOUT_MS=30000
```

**載入方式**: `source ~/.openclaw/golutra.env`

---

## 階段 2：OpenClaw MCP 配置 ✅

### 2.1 配置檔案

**檔案**: `~/.openclaw/golutra-config.json`

```json
{
  "mcp": {
    "servers": {
      "golutra": {
        "command": "golutra-mcp",
        "env": {
          "GOLUTRA_CLI_PATH": "/Applications/Golutra.app/Contents/MacOS/golutra-cli",
          "GOLUTRA_PROFILE": "stable",
          "GOLUTRA_WORKSPACE_PATH": "/Users/tokichin/golutra-workspaces/logan"
        },
        "enabled": true,
        "description": "Golutra MCP Bridge - 多智能體協作可視化平台"
      }
    }
  },
  "workspaces": {
    "logan": "/Users/tokichin/golutra-workspaces/logan",
    "matthew": "/Users/tokichin/golutra-workspaces/matthew",
    "nova": "/Users/tokichin/golutra-workspaces/nova",
    "caesar": "/Users/tokichin/golutra-workspaces/caesar",
    "donki": "/Users/tokichin/golutra-workspaces/donki",
    "forge": "/Users/tokichin/golutra-workspaces/forge"
  },
  "integration": {
    "mode": "dual-track",
    "telegram": {
      "enabled": true,
      "description": "保留 Telegram 快速通知"
    },
    "sessions_send": {
      "enabled": true,
      "description": "保留現有 sessions_send 機制"
    },
    "golutra": {
      "enabled": true,
      "description": "新增 Golutra 可視化層"
    }
  }
}
```

### 2.2 整合模式：雙軌並行

根據 Force 的建議，採用「模式 A：雙軌並行」：

| 通道 | 用途 | 狀態 |
|------|------|------|
| **Telegram** | William 快速通知與指令 | ✅ 保留 |
| **sessions_send** | Agent 間直接通信 | ✅ 保留 |
| **Golutra** | 可視化協作、任務追蹤 | 🆕 新增 |

**優勢**:
- 保留現有穩定性
- 漸進式遷移
- 降低風險

---

## 階段 3：Workspace 可視化測試 🟡

### 3.1 Golutra Desktop 啟動

```bash
open -a Golutra
```

**狀態**: ✅ Golutra 已啟動

### 3.2 MCP 連接測試

#### 測試 1: 診斷連接

**待執行命令**:
```bash
# 透過 OpenClaw 測試 MCP 連接
openclaw mcp call golutra golutra-diagnose
```

**預期結果**:
```json
{
  "summary": {
    "status": "ok",
    "message": "All checks passed"
  },
  "checks": {
    "cliPath": { "status": "ok" },
    "cliCommand": { "status": "ok" },
    "workspace": { "status": "ok" },
    "appConnection": { "status": "ok", "profile": "stable" }
  }
}
```

**實際結果**: 🟡 待測試（需 OpenClaw 支援 MCP 命令）

#### 測試 2: 讀取上下文

**待執行**:
```bash
openclaw mcp call golutra golutra-get-context
```

**預期**: 返回當前 workspace 路徑與 profile

#### 測試 3: 發送測試訊息

**待執行**:
```bash
openclaw mcp call golutra golutra-send-message \
  --workspacePath "/Users/tokichin/golutra-workspaces/logan" \
  --userId "matthew" \
  --conversationId "test-integration" \
  --content "🧪 OpenClaw + Golutra 整合測試"
```

**驗證步驟**:
1. 打開 Golutra Desktop
2. 切換到 logan workspace
3. 查看 `test-integration` 會話
4. 確認訊息顯示

### 3.3 多 Workspace 監控測試

**目標**: 在 Golutra 中同時監控所有 agent workspace

**測試場景**:
1. Logan 發佈任務
2. Matthew 接收並執行
3. Nova 更新行銷進度
4. Force 記錄工具評估

**驗證點**:
- [ ] 所有 workspace 在 Golutra 中可見
- [ ] 訊息在對應會話中正確顯示
- [ ] @mention 通知正常
- [ ] 歷史記錄可查詢

---

## 階段 4：雙軌並行驗證 🟡

### 4.1 訊息流測試

**場景**: William 透過 Telegram 派任務給 Matthew

#### 傳統流程（保留）
1. William → Telegram Bot → OpenClaw
2. Logan 接收 → sessions_send(Matthew)
3. Matthew 執行 → sessions_send(Logan)
4. Logan → Telegram → William

#### 新流程（新增 Golutra）
1. William → Telegram Bot → OpenClaw
2. Logan 接收 → **同時**:
   - sessions_send(Matthew)
   - golutra-send-message(conv-tech-tasks, @Matthew)
3. Matthew 執行 → **同時**:
   - sessions_send(Logan)
   - golutra-send-message(conv-tech-tasks, "✅ 完成")
4. Logan → Telegram → William
5. **額外**: Golutra 中留存完整對話記錄與任務狀態

### 4.2 效能評估

**待測量指標**:
- MCP 調用延遲（目標 < 500ms）
- 訊息送達率（目標 100%）
- Golutra Desktop 記憶體使用
- CLI 命令執行穩定性

---

## 技術發現與注意事項

### 發現 1: golutra-cli 需要參數

**問題**: 直接執行 `golutra-cli --version` 會報錯：
```json
{
  "ok": false,
  "error": "workspace_path is required"
}
```

**解決**: 透過 golutra-mcp 作為橋接層，由 MCP server 處理參數傳遞

### 發現 2: 符號連結策略

**採用**: `~/golutra-workspaces/<agent>/openclaw -> ~/.openclaw/workspace-<agent>`

**優勢**:
- 保持 OpenClaw workspace 為主資料源
- Golutra 透過連結讀取檔案
- 避免雙重寫入衝突

### 發現 3: 雙軌模式實作建議

**關鍵**:
```javascript
// Logan 派發任務時
async function dispatchTask(agent, task) {
  // 1. 現有機制（降級保障）
  await sessions_send(agent, task);
  
  // 2. Golutra 可視化（新增層）
  try {
    await mcpClient.callTool('golutra-send-message', {
      workspacePath: `/Users/tokichin/golutra-workspaces/${agent}`,
      userId: 'logan',
      conversationId: 'team-tasks',
      content: `@${agent} ${task}`
    });
  } catch (error) {
    // Golutra 失敗不影響核心功能
    console.warn('Golutra notification failed:', error);
  }
}
```

---

## 下一步行動

### 立即（今日）
- [ ] 確認 OpenClaw 是否支援 `openclaw mcp call` 命令
- [ ] 如不支援，研究替代測試方法（直接呼叫 golutra-mcp stdio）
- [ ] 完成 MCP 連接測試
- [ ] 驗證基本訊息發送與接收

### 短期（本週）
- [ ] 實作 Logan 的雙軌派發邏輯
- [ ] 在 Matthew 中加入 Golutra 回報機制
- [ ] 測試 Roadmap 功能（任務可視化）
- [ ] 收集效能數據

### 中期（本月）
- [ ] 擴展至其他 agents（Nova、Caesar、Donki）
- [ ] 建立檔案變更監控（workspace 即時更新）
- [ ] 整合技能系統（與 OpenClaw AgentSkills 對接）
- [ ] 優化訊息輪詢機制（考慮 webhook）

---

## 風險與緩解措施

| 風險 | 影響 | 緩解 | 狀態 |
|------|------|------|------|
| **Golutra Desktop 崩潰** | 🔴 可視化失效 | 雙軌模式保留核心功能 | ✅ 已緩解 |
| **MCP 協議不相容** | 🟡 功能受限 | 使用官方 golutra-mcp 套件 | ✅ 已緩解 |
| **效能開銷** | 🟡 延遲增加 | 非同步調用 + 失敗降級 | 🟡 待驗證 |
| **Workspace 同步問題** | 🟡 資料不一致 | OpenClaw workspace 為主資料源 | ✅ 已處理 |

---

## 參考資源

- **Force 研究報告**: `~/.openclaw/workspace-forge/reports/golutra-openclaw-integration.md`
- **Golutra GitHub**: https://github.com/golutra/golutra
- **golutra-mcp 文檔**: https://github.com/golutra/golutra-mcp
- **配置檔案**: `~/.openclaw/golutra-config.json`
- **環境變數**: `~/.openclaw/golutra.env`

---

**最後更新**: 2026-04-04 11:06  
**狀態**: 環境準備完成，等待 MCP 測試指導
