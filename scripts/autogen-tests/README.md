# AutoGen 測試腳本

**用途**：測試 AutoGen 能否在帝國使用

---

## 📦 安裝

```bash
cd ~/Projects/venturo-erp

# 安裝 AutoGen
pip install autogen-agentchat autogen-ext

# 或用 uv
uv pip install autogen-agentchat autogen-ext
```

---

## 🧪 測試清單

### 測試 1：簡單對話

**檔案**：`test_simple_chat.py`

**測試**：2 個 agents 對話

**執行**：

```bash
python scripts/autogen-tests/test_simple_chat.py
```

**修改重點**：

- 第 13 行：改成你的 OpenAI API key

---

### 測試 2：開會

**檔案**：`test_meeting.py`

**測試**：3 個 agents 開會

**執行**：

```bash
python scripts/autogen-tests/test_meeting.py
```

**修改重點**：

- 第 16 行：改成你的 OpenAI API key

---

## 🔑 API Key 設定

### 方式 1：環境變數（推薦）

```bash
export OPENAI_API_KEY="sk-..."
```

然後程式碼改成：

```python
import os
model_client = OpenAIChatCompletionClient(
    model="gpt-4o",
    api_key=os.getenv("OPENAI_API_KEY")
)
```

### 方式 2：.env 檔案

建立 `scripts/autogen-tests/.env`：

```
OPENAI_API_KEY=sk-...
```

程式碼改成：

```python
from dotenv import load_dotenv
load_dotenv()

model_client = OpenAIChatCompletionClient(
    model="gpt-4o",
    api_key=os.getenv("OPENAI_API_KEY")
)
```

---

## 📝 測試記錄

### 測試 1 結果

- 日期：
- 狀態：⏳ 未測試 / ✅ 通過 / ❌ 失敗
- 備註：

### 測試 2 結果

- 日期：
- 狀態：⏳ 未測試 / ✅ 通過 / ❌ 失敗
- 備註：

---

## 🆘 常見問題

### Q: `ModuleNotFoundError: No module named 'autogen_agentchat'`

**A**: 重新安裝

```bash
pip uninstall autogen autogen-agentchat autogen-ext
pip install autogen-agentchat autogen-ext
```

### Q: API key 錯誤

**A**: 確認 key 正確，或用環境變數

### Q: 太慢

**A**: 改用 gpt-4o-mini（更快更便宜）

```python
model="gpt-4o-mini"
```

---

**建立時間**：2026-03-17  
**負責人**：Matthew
