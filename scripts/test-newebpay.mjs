/**
 * 測試藍新金流 API 連線
 * 執行: node scripts/test-newebpay.mjs
 */

import crypto from 'crypto'

const config = {
  merchantId: '83212711', // 使用公司統一編號
  hashKey: 'YsZf5WBrzAyKujdQX1qabToN60pkgGxl',
  hashIV: 'P1KqUTm2Oh5SctBC',
}

// AES 加密
function aesEncrypt(data, key, iv) {
  const cipher = crypto.createCipheriv('aes-256-cbc', key, iv)
  cipher.setAutoPadding(true)
  let encrypted = cipher.update(data, 'utf8', 'hex')
  encrypted += cipher.final('hex')
  return encrypted
}

// 正式環境
const API_URL = 'https://api.travelinvoice.com.tw/invoice_issue'

async function testConnection() {
  console.log('🔍 測試藍新金流 API 連線...\n')
  console.log('設定:', {
    merchantId: config.merchantId,
    hashKey: config.hashKey.slice(0, 4) + '****',
    hashIV: config.hashIV.slice(0, 4) + '****',
    url: API_URL,
  })

  // 組裝測試資料 - B2C（無統編）
  const testData = {
    Version: '1.1',
    TimeStamp: Math.floor(Date.now() / 1000),
    MerchantOrderNo: 'TEST' + Date.now(),
    Status: 1,
    Category: 'B2C',
    BuyerName: '測試客戶',
    BuyerEmail: 'test@example.com',
    SellerName: '系統管理員',
    TotalAmt: 100,
    ItemName: '測試商品',
    ItemCount: '1',
    ItemUnit: '式',
    ItemPrice: '100',
    ItemAmt: '100',
  }

  // 轉為 URL encoded
  const urlEncoded = Object.entries(testData)
    .map(([k, v]) => `${encodeURIComponent(k)}=${encodeURIComponent(String(v))}`)
    .join('&')

  console.log('\n📦 PostData (未加密):', urlEncoded.slice(0, 100) + '...')

  // 加密
  const encrypted = aesEncrypt(urlEncoded, config.hashKey, config.hashIV)
  console.log('🔐 PostData (加密後):', encrypted.slice(0, 50) + '...')

  // 發送請求
  console.log('\n📡 發送請求到:', API_URL)
  console.log('⏳ 等待回應...\n')

  try {
    const controller = new AbortController()
    const timeout = setTimeout(() => controller.abort(), 30000)

    const startTime = Date.now()
    const response = await fetch(API_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
      },
      body: new URLSearchParams({
        MerchantID_: config.merchantId,
        PostData_: encrypted,
      }),
      signal: controller.signal,
    })

    clearTimeout(timeout)
    const elapsed = Date.now() - startTime

    console.log('✅ 收到回應！耗時:', elapsed, 'ms')
    console.log('📬 HTTP Status:', response.status)

    const responseText = await response.text()
    console.log('\n📄 回應內容:')
    console.log(responseText)

    // 解析回應
    if (responseText.includes('Status=')) {
      const params = new URLSearchParams(responseText)
      console.log('\n🔍 解析結果:')
      console.log('  Status:', params.get('Status'))
      console.log('  Message:', params.get('Message'))
    }
  } catch (error) {
    if (error.name === 'AbortError') {
      console.error('❌ 請求超時（30秒）')
    } else {
      console.error('❌ 請求失敗:', error.message)
    }
  }
}

testConnection()
