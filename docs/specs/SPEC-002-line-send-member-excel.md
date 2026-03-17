# SPEC-002: LINE 發送團員名單 Excel

**建立日期**：2026-03-17  
**負責人**：Matthew  
**優先級**：P1（高）  
**預計工時**：5 小時

---

## 📋 需求說明

**背景**：
- 業務需要將團員名單（Excel）發送給廠商
- 目前需要手動下載、手動傳送，效率低
- 廠商通常在 LINE 群組溝通

**目標**：
- 一鍵發送團員名單 Excel 到 LINE 群組
- 自動產生 Excel（團員資料）
- 記錄發送歷史

---

## 🎯 功能規格

### 使用場景

**主要流程**：
```
業務在需求單頁面 
  → 點擊「發送團員名單」
  → 選擇目標群組（飯店/交通/保險）
  → 系統產生 Excel
  → 自動發送到 LINE 群組
  → 群組成員收到檔案
```

**次要流程**：
- 發送記錄可追蹤
- 可重新發送（如果團員異動）

---

## 💻 技術架構

### 技術選型

**方案**：LINE Messaging API + Supabase Storage

**流程圖**：
```
1. 產生 Excel（ExcelJS）
   ↓
2. 上傳到 Supabase Storage
   ↓
3. 產生簽名 URL（7天有效）
   ↓
4. 呼叫 LINE Bot API 發送
   ↓
5. 記錄到資料庫
```

---

## 🗂️ 資料庫設計

### 新增表：line_messages

```sql
-- 記錄 LINE 訊息發送歷史
CREATE TABLE line_messages (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  workspace_id UUID NOT NULL REFERENCES workspaces(id),
  tour_id UUID REFERENCES tours(id),
  group_id TEXT NOT NULL, -- LINE 群組 ID
  group_name TEXT, -- 群組名稱（供參考）
  message_type TEXT NOT NULL, -- 'file', 'text', 'flex'
  file_url TEXT, -- 檔案 URL
  file_name TEXT, -- 檔案名稱
  message_content JSONB, -- 訊息內容
  status TEXT DEFAULT 'sent', -- 'sent', 'failed'
  error TEXT, -- 錯誤訊息
  sent_at TIMESTAMPTZ DEFAULT now(),
  sent_by UUID REFERENCES users(id),
  created_at TIMESTAMPTZ DEFAULT now()
);

-- 索引
CREATE INDEX idx_line_messages_tour_id ON line_messages(tour_id);
CREATE INDEX idx_line_messages_workspace_id ON line_messages(workspace_id);
```

### 擴充表：suppliers

```sql
-- 在 suppliers 表加欄位
ALTER TABLE suppliers 
ADD COLUMN line_group_id TEXT,
ADD COLUMN line_group_name TEXT;

-- 或建立關聯表（如果一個供應商有多個群組）
CREATE TABLE supplier_line_groups (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  supplier_id TEXT REFERENCES suppliers(id),
  line_group_id TEXT NOT NULL,
  group_name TEXT NOT NULL,
  group_type TEXT, -- 'hotel', 'transport', 'insurance', 'general'
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT now()
);
```

---

## 📦 Supabase Storage 設定

### 建立 Bucket

```sql
-- 在 Supabase Dashboard 或用 SQL
INSERT INTO storage.buckets (id, name, public)
VALUES ('tour-documents', 'tour-documents', false);

-- 設定 RLS 政策
CREATE POLICY "Workspace members can upload"
ON storage.objects FOR INSERT
TO authenticated
WITH CHECK (bucket_id = 'tour-documents' AND auth.uid() IS NOT NULL);

CREATE POLICY "Workspace members can read"
ON storage.objects FOR SELECT
TO authenticated
USING (bucket_id = 'tour-documents');
```

---

## 🔧 實作步驟

### Step 1：Excel 產生邏輯

**檔案**：`src/lib/excel/generate-member-excel.ts`

```typescript
import ExcelJS from 'exceljs'

interface MemberData {
  name: string
  passport_number: string
  birth_date: string
  age: number
  room_type?: string
  notes?: string
}

export async function generateMemberExcel(
  tourCode: string,
  tourName: string,
  departureDate: string,
  members: MemberData[]
): Promise<Buffer> {
  const workbook = new ExcelJS.Workbook()
  const worksheet = workbook.addWorksheet('團員名單')

  // 標題
  worksheet.mergeCells('A1:F1')
  worksheet.getCell('A1').value = `${tourCode} - ${tourName} 團員名單`
  worksheet.getCell('A1').font = { size: 16, bold: true }
  worksheet.getCell('A1').alignment = { horizontal: 'center' }

  // 出發日期
  worksheet.mergeCells('A2:F2')
  worksheet.getCell('A2').value = `出發日期：${departureDate}`
  worksheet.getCell('A2').alignment = { horizontal: 'center' }

  // 表頭
  worksheet.getRow(4).values = ['序號', '姓名', '護照號', '生日', '年齡', '房型', '備註']
  worksheet.getRow(4).font = { bold: true }
  worksheet.getRow(4).fill = {
    type: 'pattern',
    pattern: 'solid',
    fgColor: { argb: 'FFD9D9D9' }
  }

  // 資料
  members.forEach((member, index) => {
    worksheet.addRow([
      index + 1,
      member.name,
      member.passport_number,
      member.birth_date,
      member.age,
      member.room_type || '',
      member.notes || ''
    ])
  })

  // 欄寬
  worksheet.columns = [
    { width: 8 },  // 序號
    { width: 12 }, // 姓名
    { width: 15 }, // 護照號
    { width: 12 }, // 生日
    { width: 8 },  // 年齡
    { width: 12 }, // 房型
    { width: 20 }  // 備註
  ]

  // 產生 Buffer
  const buffer = await workbook.xlsx.writeBuffer()
  return Buffer.from(buffer)
}
```

---

### Step 2：檔案上傳服務

**檔案**：`src/lib/storage/upload-tour-document.ts`

```typescript
import { supabase } from '@/lib/supabase/client'

export async function uploadTourDocument(
  tourCode: string,
  fileName: string,
  fileBuffer: Buffer,
  contentType: string = 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
) {
  // 產生唯一檔名
  const timestamp = Date.now()
  const storagePath = `members/${tourCode}/${timestamp}-${fileName}`

  // 上傳到 Supabase Storage
  const { data, error } = await supabase.storage
    .from('tour-documents')
    .upload(storagePath, fileBuffer, {
      contentType,
      cacheControl: '3600',
      upsert: false // 不覆蓋（保留歷史）
    })

  if (error) {
    console.error('[Storage] 上傳失敗:', error)
    throw new Error(`上傳失敗: ${error.message}`)
  }

  // 產生簽名 URL（7 天有效）
  const { data: signedData, error: signedError } = await supabase.storage
    .from('tour-documents')
    .createSignedUrl(storagePath, 604800) // 7 days

  if (signedError) {
    console.error('[Storage] 產生 URL 失敗:', signedError)
    throw new Error(`產生 URL 失敗: ${signedError.message}`)
  }

  return {
    path: storagePath,
    url: signedData.signedUrl,
    expiresAt: new Date(Date.now() + 604800 * 1000) // 7 天後
  }
}
```

---

### Step 3：LINE 發送服務

**檔案**：`src/lib/line/send-to-group.ts`

```typescript
export async function sendFileToLineGroup(
  groupId: string,
  fileUrl: string,
  fileName: string,
  message?: string
) {
  const LINE_CHANNEL_ACCESS_TOKEN = process.env.LINE_CHANNEL_ACCESS_TOKEN

  if (!LINE_CHANNEL_ACCESS_TOKEN) {
    throw new Error('LINE_CHANNEL_ACCESS_TOKEN 未設定')
  }

  // 準備訊息
  const messages: any[] = []

  // 文字訊息（可選）
  if (message) {
    messages.push({
      type: 'text',
      text: message
    })
  }

  // 檔案連結（使用 text 類型，因為 file 類型需要特殊格式）
  messages.push({
    type: 'text',
    text: `📥 ${fileName}\n\n下載連結：\n${fileUrl}\n\n（連結7天有效）`
  })

  // 發送到群組
  const response = await fetch('https://api.line.me/v2/bot/message/push', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${LINE_CHANNEL_ACCESS_TOKEN}`,
    },
    body: JSON.stringify({
      to: groupId,
      messages
    })
  })

  if (!response.ok) {
    const error = await response.json()
    console.error('[LINE] 發送失敗:', error)
    throw new Error(`LINE 發送失敗: ${error.message}`)
  }

  return { success: true }
}
```

---

### Step 4：後端 API

**檔案**：`src/app/api/tours/[tourId]/send-members/route.ts`

```typescript
import { NextRequest, NextResponse } from 'next/server'
import { supabase } from '@/lib/supabase/server'
import { generateMemberExcel } from '@/lib/excel/generate-member-excel'
import { uploadTourDocument } from '@/lib/storage/upload-tour-document'
import { sendFileToLineGroup } from '@/lib/line/send-to-group'

export async function POST(
  req: NextRequest,
  { params }: { params: { tourId: string } }
) {
  try {
    const { groupId, groupName } = await req.json()

    // 1. 取得團資料
    const { data: tour, error: tourError } = await supabase
      .from('tours')
      .select('*')
      .eq('id', params.tourId)
      .single()

    if (tourError || !tour) {
      return NextResponse.json(
        { error: '找不到團資料' },
        { status: 404 }
      )
    }

    // 2. 取得團員資料
    const { data: orderMembers, error: membersError } = await supabase
      .from('order_members')
      .select(`
        *,
        customer:customers (
          name,
          passport_number,
          birth_date
        )
      `)
      .eq('order.tour_id', params.tourId)

    if (membersError || !orderMembers || orderMembers.length === 0) {
      return NextResponse.json(
        { error: '無團員資料' },
        { status: 400 }
      )
    }

    // 3. 整理團員資料
    const members = orderMembers.map((om: any) => ({
      name: om.customer.name,
      passport_number: om.customer.passport_number,
      birth_date: om.customer.birth_date,
      age: calculateAge(om.customer.birth_date),
      room_type: om.room_type,
      notes: om.notes
    }))

    // 4. 產生 Excel
    const excelBuffer = await generateMemberExcel(
      tour.code,
      tour.name,
      tour.departure_date,
      members
    )

    // 5. 上傳到 Supabase Storage
    const fileName = `${tour.code}_團員名單.xlsx`
    const { url, path } = await uploadTourDocument(
      tour.code,
      fileName,
      excelBuffer
    )

    // 6. 發送到 LINE 群組
    const message = `📋 ${tour.code} 團員名單\n\n團名：${tour.name}\n出發日期：${tour.departure_date}\n團員數：${members.length} 人`
    
    await sendFileToLineGroup(groupId, url, fileName, message)

    // 7. 記錄到資料庫
    await supabase.from('line_messages').insert({
      workspace_id: tour.workspace_id,
      tour_id: tour.id,
      group_id: groupId,
      group_name: groupName,
      message_type: 'file',
      file_url: url,
      file_name: fileName,
      status: 'sent',
      sent_by: req.headers.get('x-user-id') // 假設有用戶 ID
    })

    return NextResponse.json({
      success: true,
      url,
      fileName,
      memberCount: members.length
    })
  } catch (error: any) {
    console.error('[API] 發送團員名單失敗:', error)
    return NextResponse.json(
      { error: error.message || '發送失敗' },
      { status: 500 }
    )
  }
}

function calculateAge(birthDate: string): number {
  const today = new Date()
  const birth = new Date(birthDate)
  let age = today.getFullYear() - birth.getFullYear()
  const monthDiff = today.getMonth() - birth.getMonth()
  if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < birth.getDate())) {
    age--
  }
  return age
}
```

---

### Step 5：前端 UI

**檔案**：`src/features/tours/components/SendMembersButton.tsx`

```tsx
'use client'

import { useState } from 'react'
import { Button } from '@/components/ui/button'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { useToast } from '@/components/ui/use-toast'
import { Send, Loader2 } from 'lucide-react'

interface LineGroup {
  id: string
  name: string
  type: string
}

// TODO: 從資料庫讀取
const GROUPS: LineGroup[] = [
  { id: 'C1234567890abcdefghij1234567890ab', name: '飯店供應商群組', type: 'hotel' },
  { id: 'C0987654321zyxwvutsrqp0987654321', name: '交通供應商群組', type: 'transport' },
  { id: 'Cabcdef1234567890abcdefghij123456', name: '保險公司群組', type: 'insurance' },
]

export function SendMembersButton({ tourId }: { tourId: string }) {
  const { toast } = useToast()
  const [open, setOpen] = useState(false)
  const [selectedGroup, setSelectedGroup] = useState<string>('')
  const [sending, setSending] = useState(false)

  const handleSend = async () => {
    if (!selectedGroup) {
      toast({ title: '❌ 請選擇群組', variant: 'destructive' })
      return
    }

    setSending(true)

    try {
      const group = GROUPS.find(g => g.id === selectedGroup)
      
      const response = await fetch(`/api/tours/${tourId}/send-members`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          groupId: selectedGroup,
          groupName: group?.name
        })
      })

      if (!response.ok) {
        const error = await response.json()
        throw new Error(error.error || '發送失敗')
      }

      const result = await response.json()

      toast({
        title: '✅ 已發送團員名單',
        description: `已發送到「${group?.name}」，共 ${result.memberCount} 位團員`
      })

      setOpen(false)
      setSelectedGroup('')
    } catch (error: any) {
      console.error('發送失敗:', error)
      toast({
        title: '❌ 發送失敗',
        description: error.message,
        variant: 'destructive'
      })
    } finally {
      setSending(false)
    }
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant="outline" size="sm">
          <Send className="mr-2 h-4 w-4" />
          發送團員名單
        </Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>發送團員名單到 LINE 群組</DialogTitle>
          <DialogDescription>
            系統將自動產生 Excel 檔案並發送到指定群組
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-4">
          <div className="space-y-2">
            <label className="text-sm font-medium">選擇群組</label>
            <Select value={selectedGroup} onValueChange={setSelectedGroup}>
              <SelectTrigger>
                <SelectValue placeholder="請選擇 LINE 群組" />
              </SelectTrigger>
              <SelectContent>
                {GROUPS.map(group => (
                  <SelectItem key={group.id} value={group.id}>
                    {group.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="flex justify-end space-x-2">
            <Button
              variant="outline"
              onClick={() => setOpen(false)}
              disabled={sending}
            >
              取消
            </Button>
            <Button
              onClick={handleSend}
              disabled={!selectedGroup || sending}
            >
              {sending ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  發送中...
                </>
              ) : (
                <>
                  <Send className="mr-2 h-4 w-4" />
                  發送
                </>
              )}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  )
}
```

**整合到需求單頁面**：

```tsx
// TourRequirementsTab.tsx 或 RequirementsList.tsx

import { SendMembersButton } from './SendMembersButton'

// 在頁面右上角加按鈕
<div className="flex justify-between items-center mb-4">
  <h2>需求總覽</h2>
  <SendMembersButton tourId={tourId} />
</div>
```

---

## 🧪 測試清單

### 功能測試

- [ ] 產生 Excel 格式正確（標題、欄位、資料）
- [ ] 上傳到 Supabase Storage 成功
- [ ] 產生的 URL 可以下載
- [ ] 發送到 LINE 群組成功
- [ ] 群組成員收到檔案
- [ ] 檔案可以下載並開啟
- [ ] 記錄到資料庫正確

### 邊界測試

- [ ] 團員數 = 0（顯示錯誤）
- [ ] 團員數 > 100（正常產生）
- [ ] 無權限（顯示錯誤）
- [ ] LINE Token 錯誤（顯示錯誤）
- [ ] 群組 ID 錯誤（顯示錯誤）
- [ ] 網路錯誤（顯示友善錯誤訊息）

---

## 📊 驗收標準

### 功能驗收

1. ✅ 點擊按鈕後選擇群組，可成功發送
2. ✅ Excel 格式完整（團號、團名、日期、團員資料）
3. ✅ LINE 群組收到檔案連結
4. ✅ 下載檔案可正常開啟
5. ✅ 有發送記錄可追蹤

### 效能驗收

1. ✅ 產生 Excel < 2 秒
2. ✅ 上傳檔案 < 3 秒
3. ✅ 發送到 LINE < 2 秒
4. ✅ 總流程 < 10 秒

### UX 驗收

1. ✅ 有 loading 狀態
2. ✅ 有成功/失敗提示
3. ✅ 錯誤訊息友善
4. ✅ 可重新發送

---

## 🔐 環境變數

```env
# .env.local

# LINE Bot
LINE_CHANNEL_ACCESS_TOKEN=your_channel_access_token_here
LINE_CHANNEL_SECRET=your_channel_secret_here

# Supabase（應該已有）
NEXT_PUBLIC_SUPABASE_URL=https://pfqvdacxowpgfamuvnsn.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=...
SUPABASE_SERVICE_ROLE_KEY=...
```

---

## 📦 依賴套件

```bash
npm install exceljs
# 或
pnpm add exceljs
```

---

## 🚀 部署檢查

- [ ] 環境變數已設定（LINE_CHANNEL_ACCESS_TOKEN）
- [ ] Supabase Storage bucket 已建立
- [ ] LINE Bot 已建立並取得 token
- [ ] LINE Bot 已加入群組
- [ ] 取得群組 ID 並設定
- [ ] 程式碼已 commit
- [ ] 已在開發環境測試
- [ ] 通知業務新功能上線

---

## 🔄 後續優化

### Phase 2：PDF 同時發送

```typescript
// 同時產生 PDF 和 Excel
const pdfBuffer = await generateMemberPDF(...)
// 兩個檔案一起發送
```

### Phase 3：群組管理介面

```typescript
// 在設定頁面管理 LINE 群組
// 新增/編輯/刪除群組
```

### Phase 4：範本自訂

```typescript
// 業務可自訂 Excel 範本
// 選擇要顯示的欄位
```

---

## 📁 檔案變更清單

### 新增檔案

- `src/lib/excel/generate-member-excel.ts` - Excel 產生
- `src/lib/storage/upload-tour-document.ts` - 檔案上傳
- `src/lib/line/send-to-group.ts` - LINE 發送
- `src/app/api/tours/[tourId]/send-members/route.ts` - API 端點
- `src/features/tours/components/SendMembersButton.tsx` - UI 元件

### 修改檔案

- `src/features/tours/components/TourRequirementsTab.tsx` - 加入按鈕

### 資料庫

- 建立 `line_messages` 表
- 建立 `supplier_line_groups` 表（可選）
- 擴充 `suppliers` 表（可選）

---

## 📞 聯絡

**有問題找**：
- 需求確認：William
- 技術問題：Matthew
- LINE 設定：William/Leon
- 測試協助：Ben

---

## 🔖 版本記錄

| 版本 | 日期 | 變更 |
|------|------|------|
| 1.0 | 2026-03-17 | 初版規格 |
