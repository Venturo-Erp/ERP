# 部署指南 - Venturo ERP

## 📋 **部署前檢查清單**

### 1. **Git 設定（必須）**

```bash
git config --global user.name "William Chien"
git config --global user.email "venturo.admin@gmail.com"
```

### 2. **GitHub 權限**

- 確認有權限推送到 `Venturo-Erp/ERP` repo
- 如果遇到權限問題，請聯絡 William

### 3. **Vercel 部署**

- 自動部署：推送到 `main` 分支會自動觸發
- 手動部署：訪問 https://vercel.com/williamchien/venturo-erp → Redeploy

## 🚀 **標準部署流程**

### **步驟 1：本地開發**

```bash
# 拉取最新程式碼
git pull origin main

# 開發、修改...

# 檢查 TypeScript
npm run type-check

# 提交變更
git add .
git commit -m "fix: 描述變更內容"
```

### **步驟 2：推送到 GitHub**

```bash
# 推送到 main 分支
git push origin main
```

### **步驟 3：監控 Vercel 部署**

1. 訪問 https://vercel.com/williamchien/venturo-erp
2. 檢查 "Deployments" 頁面
3. 等待部署完成（約 2-3 分鐘）

## 🔧 **常見問題解決**

### **問題 1：GitHub 權限錯誤**

```
Error: The Deployment was blocked because GitHub could not associate the committer with a GitHub user.
```

**解決方案：**

```bash
# 1. 確認 git 設定正確
git config --global user.name
git config --global user.email

# 2. 如果錯誤，修正
git config --global user.name "William Chien"
git config --global user.email "venturo.admin@gmail.com"

# 3. 重新提交
git commit --amend --reset-author
git push --force origin main
```

### **問題 2：Vercel 部署失敗**

**解決方案：**

1. 檢查 Vercel 的錯誤日誌
2. 通常是環境變數問題或 TypeScript 錯誤
3. 修正錯誤後重新部署

### **問題 3：TypeScript 錯誤**

**解決方案：**

```bash
# 本地先檢查
npm run type-check

# 如果通過，才能提交
```

## 📊 **生產環境設定**

### **重要提醒：**

- **資料庫設定**（如 `workspace_line_config`）由廠商處理
- **LINE Bot 設定**由廠商在後台設定
- **環境變數**已在 Vercel 設定

### **如果生產環境有問題：**

1. **檢查 Console 錯誤**（F12 → Console）
2. **檢查 API 回應**
3. **聯絡 William 或廠商**

## 🎯 **核心記憶點**

### **必須記住的：**

1. **Git 帳號**: `William Chien / venturo.admin@gmail.com`
2. **GitHub Repo**: `Venturo-Erp/ERP`
3. **Vercel URL**: https://vercel.com/williamchien/venturo-erp
4. **生產環境**: https://erp.venturo.tw

### **交給廠商的：**

1. 資料庫設定
2. LINE Bot 設定
3. 環境變數配置
4. 伺服器維護

## 📞 **聯絡資訊**

- **William Chien**: LINE Bot 開發、部署問題
- **廠商**: 資料庫設定、伺服器問題
- **Vercel 支援**: 部署技術問題

---

**最後更新**: 2026-04-08  
**版本**: v1.0
