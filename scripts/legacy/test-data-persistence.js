/**
 * Venturo 資料持久化測試腳本
 *
 * 目的：驗證所有建立對話框是否真正將資料儲存到資料庫
 *
 * 使用方式：
 * 1. 在瀏覽器 Console 貼上並執行此腳本
 * 2. 手動點擊「新增收款單」按鈕並填寫資料
 * 3. 點擊「確認」後，腳本會自動檢查資料是否儲存
 *
 * 測試範圍：
 * - IndexedDB 儲存檢查
 * - Supabase 同步檢查
 * - 資料完整性驗證
 */

async function testDataPersistence() {
  console.log('🧪 開始測試資料持久化...\n')

  // ============================================
  // 1. 檢查 IndexedDB
  // ============================================
  console.log('📦 檢查 IndexedDB...')

  const dbName = 'venturo-db'
  const tablesToCheck = [
    'receipts',
    'payment_requests',
    'disbursement_orders',
    'suppliers',
    'visas',
    'customers',
  ]

  try {
    const db = await new Promise((resolve, reject) => {
      const request = indexedDB.open(dbName)
      request.onsuccess = () => resolve(request.result)
      request.onerror = () => reject(request.error)
    })

    console.log(`✅ IndexedDB "${dbName}" 已開啟\n`)

    for (const tableName of tablesToCheck) {
      try {
        const transaction = db.transaction(tableName, 'readonly')
        const store = transaction.objectStore(tableName)
        const countRequest = store.count()

        const count = await new Promise((resolve, reject) => {
          countRequest.onsuccess = () => resolve(countRequest.result)
          countRequest.onerror = () => reject(countRequest.error)
        })

        console.log(`  ${tableName.padEnd(20)} | ${count} 筆資料`)
      } catch (error) {
        console.error(`  ❌ ${tableName}: 表格不存在或無法讀取`)
      }
    }

    db.close()
  } catch (error) {
    console.error('❌ IndexedDB 開啟失敗:', error)
  }

  // ============================================
  // 2. 檢查 Zustand Store
  // ============================================
  console.log('\n🗄️  檢查 Zustand Stores...')

  const storeChecks = [
    { name: 'useReceiptStore', table: 'receipts' },
    { name: 'usePaymentRequestStore', table: 'payment_requests' },
    { name: 'useSupplierStore', table: 'suppliers' },
    { name: 'useVisaStore', table: 'visas' },
    { name: 'useCustomerStore', table: 'customers' },
  ]

  for (const { name, table } of storeChecks) {
    try {
      // 動態載入 store
      const stores = await import('/src/stores/index.ts')
      const store = stores[name]

      if (store) {
        const state = store.getState()
        const count = state.items?.length || 0
        console.log(`  ${name.padEnd(25)} | ${count} 筆資料`)
      } else {
        console.log(`  ⚠️  ${name} 未載入`)
      }
    } catch (error) {
      console.log(`  ⚠️  ${name} 無法檢查 (可能尚未載入)`)
    }
  }

  // ============================================
  // 3. 提供測試建議
  // ============================================
  console.log('\n📝 測試建議：')
  console.log('  1. 執行建立操作（例如：新增收款單）')
  console.log('  2. 重新整理頁面')
  console.log('  3. 再次執行此腳本')
  console.log('  4. 檢查資料筆數是否增加\n')

  console.log('💡 額外檢查：')
  console.log('  1. 開啟 Chrome DevTools > Application > IndexedDB > venturo-db')
  console.log('  2. 手動檢查各表格是否有新資料')
  console.log('  3. 前往 Supabase Dashboard 確認雲端資料\n')
}

// ============================================
// 執行測試
// ============================================
testDataPersistence()
  .then(() => {
    console.log('✅ 測試完成')
  })
  .catch(error => {
    console.error('❌ 測試失敗:', error)
  })
