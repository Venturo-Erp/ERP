'use client'

import { useState } from 'react'
import { ContentPageLayout } from '@/components/layout/content-page-layout'
import { Card } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { AlertCircle, CheckCircle, Loader2, Zap } from 'lucide-react'
import { toast } from 'sonner'

interface InitStats {
  accounts_created: number
  payment_vouchers: number
  request_vouchers: number
  errors: string[]
}

export default function AccountingInitializePage() {
  const [isLoading, setIsLoading] = useState(false)
  const [stats, setStats] = useState<InitStats | null>(null)
  const [hasInitialized, setHasInitialized] = useState(false)

  const handleInitialize = async () => {
    const confirmed = confirm(
      '確定要初始化會計系統嗎？\n\n' +
      '此操作將：\n' +
      '1. 建立預設會計科目表（30 個科目）\n' +
      '2. 為所有歷史收款記錄生成會計傳票\n' +
      '3. 為所有歷史請款記錄生成會計傳票\n\n' +
      '注意：此操作只能執行一次！'
    )

    if (!confirmed) return

    setIsLoading(true)
    try {
      const response = await fetch('/api/accounting/initialize', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
      })

      const data = await response.json()

      if (!response.ok) {
        throw new Error(data.error || '初始化失敗')
      }

      setStats(data.stats)
      setHasInitialized(true)
      toast.success(data.message)
    } catch (error) {
      console.error('初始化失敗:', error)
      toast.error(error instanceof Error ? error.message : '初始化失敗')
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <ContentPageLayout title="會計系統初始化">
      <div className="p-6 max-w-4xl mx-auto space-y-6">
        {/* 說明卡片 */}
        <Card className="p-6 border-orange-200 bg-orange-50">
          <div className="flex items-start gap-3">
            <AlertCircle className="text-orange-600 mt-1 flex-shrink-0" size={24} />
            <div>
              <h3 className="font-semibold text-orange-900 mb-2">首次使用必須執行初始化</h3>
              <ul className="text-sm text-orange-800 space-y-1 list-disc list-inside">
                <li>建立預設會計科目表（資產、負債、權益、收入、費用、成本）</li>
                <li>為所有歷史收款記錄生成會計傳票</li>
                <li>為所有歷史請款記錄生成會計傳票</li>
                <li>此操作只能執行一次，請確認後再執行</li>
              </ul>
            </div>
          </div>
        </Card>

        {/* 執行按鈕 */}
        {!hasInitialized && (
          <Card className="p-6">
            <div className="text-center">
              <Zap size={48} className="text-blue-600 mx-auto mb-4" />
              <h2 className="text-xl font-semibold mb-2">準備好了嗎？</h2>
              <p className="text-muted-foreground mb-6">
                執行初始化將自動建立科目表和歷史傳票
              </p>
              <Button
                onClick={handleInitialize}
                disabled={isLoading}
                size="lg"
                className="px-8"
              >
                {isLoading ? (
                  <>
                    <Loader2 className="animate-spin mr-2" size={20} />
                    初始化中...
                  </>
                ) : (
                  '開始初始化'
                )}
              </Button>
            </div>
          </Card>
        )}

        {/* 結果顯示 */}
        {stats && (
          <Card className="p-6">
            <div className="flex items-center gap-2 mb-4">
              <CheckCircle className="text-green-600" size={24} />
              <h2 className="text-xl font-semibold">初始化完成</h2>
            </div>

            <div className="space-y-3">
              <div className="flex justify-between items-center p-3 bg-muted rounded-lg">
                <span className="text-muted-foreground">建立會計科目</span>
                <span className="font-semibold text-lg">{stats.accounts_created} 個</span>
              </div>

              <div className="flex justify-between items-center p-3 bg-muted rounded-lg">
                <span className="text-muted-foreground">生成收款傳票</span>
                <span className="font-semibold text-lg">{stats.payment_vouchers} 筆</span>
              </div>

              <div className="flex justify-between items-center p-3 bg-muted rounded-lg">
                <span className="text-muted-foreground">生成請款傳票</span>
                <span className="font-semibold text-lg">{stats.request_vouchers} 筆</span>
              </div>

              {stats.errors.length > 0 && (
                <div className="mt-4 p-4 bg-red-50 border border-red-200 rounded-lg">
                  <h3 className="font-semibold text-red-900 mb-2">錯誤記錄</h3>
                  <ul className="text-sm text-red-800 space-y-1">
                    {stats.errors.slice(0, 10).map((error, i) => (
                      <li key={i}>{error}</li>
                    ))}
                    {stats.errors.length > 10 && (
                      <li className="text-red-600">... 還有 {stats.errors.length - 10} 個錯誤</li>
                    )}
                  </ul>
                </div>
              )}
            </div>

            <div className="mt-6 flex gap-3">
              <Button
                onClick={() => window.location.href = '/accounting/vouchers'}
                className="flex-1"
              >
                查看傳票列表
              </Button>
              <Button
                onClick={() => window.location.href = '/accounting/accounts'}
                variant="outline"
                className="flex-1"
              >
                查看科目表
              </Button>
            </div>
          </Card>
        )}

        {/* 下一步指引 */}
        {hasInitialized && (
          <Card className="p-6 bg-blue-50 border-blue-200">
            <h3 className="font-semibold text-blue-900 mb-3">下一步</h3>
            <ul className="text-sm text-blue-800 space-y-2 list-decimal list-inside">
              <li>前往傳票管理，確認歷史傳票是否正確生成</li>
              <li>檢查科目表，確認所有科目都已建立</li>
              <li>測試手動新增傳票功能</li>
              <li>之後的收款/請款將自動生成傳票</li>
            </ul>
          </Card>
        )}
      </div>
    </ContentPageLayout>
  )
}
