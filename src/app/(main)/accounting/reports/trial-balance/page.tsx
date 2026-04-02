'use client'

import { useState, useEffect } from 'react'
import { ContentPageLayout } from '@/components/layout/content-page-layout'
import { Card } from '@/components/ui/card'
import { Label } from '@/components/ui/label'
import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'
import { Search } from 'lucide-react'
import { supabase } from '@/lib/supabase/client'
import { useAuthStore } from '@/stores/auth-store'
import { Badge } from '@/components/ui/badge'
import { logger } from '@/lib/utils/logger'

interface AccountBalance {
  account_id: string
  code: string
  name: string
  account_type: string
  debit_total: number
  credit_total: number
  balance: number
}

const typeLabels: Record<string, string> = {
  asset: '資產',
  liability: '負債',
  equity: '權益',
  revenue: '收入',
  expense: '費用',
  cost: '成本',
}

export default function TrialBalancePage() {
  const { user } = useAuthStore()
  const [endDate, setEndDate] = useState('')
  const [balances, setBalances] = useState<AccountBalance[]>([])
  const [isLoading, setIsLoading] = useState(false)
  const [totals, setTotals] = useState({ debit: 0, credit: 0 })

  useEffect(() => {
    // 預設日期（今天）
    setEndDate(new Date().toISOString().split('T')[0])
  }, [])

  const loadTrialBalance = async () => {
    if (!endDate || !user?.workspace_id) {
      alert('請選擇日期')
      return
    }

    setIsLoading(true)

    try {
      // 1. 取得所有科目
      const { data: accounts, error: accountsError } = await supabase
        .from('chart_of_accounts')
        .select('id, code, name, account_type')
        .eq('workspace_id', user.workspace_id)
        .eq('is_active', true)
        .order('code', { ascending: true })

      if (accountsError) throw accountsError

      // 2. 取得所有分錄（截至指定日期）
      const { data: lines, error: linesError } = await supabase
        .from('journal_lines')
        .select(
          `
          account_id,
          debit_amount,
          credit_amount,
          voucher:journal_vouchers!inner(
            voucher_date,
            workspace_id
          )
        `
        )
        .eq('voucher.workspace_id', user.workspace_id)
        .lte('voucher.voucher_date', endDate)

      if (linesError) throw linesError

      // 3. 計算每個科目的餘額
      const balanceMap = new Map<string, { debit: number; credit: number }>()

      ;(lines as Array<{ account_id: string; debit_amount: number; credit_amount: number }>).forEach((line) => {
        const existing = balanceMap.get(line.account_id) || { debit: 0, credit: 0 }
        existing.debit += line.debit_amount || 0
        existing.credit += line.credit_amount || 0
        balanceMap.set(line.account_id, existing)
      })

      // 4. 組合結果
      const result: AccountBalance[] = accounts
        .map(account => {
          const balance = balanceMap.get(account.id) || { debit: 0, credit: 0 }
          const net = balance.debit - balance.credit

          return {
            account_id: account.id,
            code: account.code,
            name: account.name,
            account_type: account.account_type,
            debit_total: balance.debit,
            credit_total: balance.credit,
            balance: net,
          }
        })
        .filter(item => item.debit_total > 0 || item.credit_total > 0) // 只顯示有餘額的科目

      setBalances(result)

      // 5. 計算總計
      const totalDebit = result.reduce((sum, item) => sum + item.debit_total, 0)
      const totalCredit = result.reduce((sum, item) => sum + item.credit_total, 0)
      setTotals({ debit: totalDebit, credit: totalCredit })
    } catch (error) {
      logger.error('載入試算表失敗:', error)
      alert('載入失敗')
    } finally {
      setIsLoading(false)
    }
  }

  // 按類型分組
  const groupedBalances = balances.reduce(
    (groups, item) => {
      const type = item.account_type
      if (!groups[type]) {
        groups[type] = []
      }
      groups[type].push(item)
      return groups
    },
    {} as Record<string, AccountBalance[]>
  )

  return (
    <ContentPageLayout title="試算表">
      <div className="p-6 space-y-4">
        {/* 查詢條件 */}
        <Card className="p-4">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="space-y-2">
              <Label>截止日期</Label>
              <Input type="date" value={endDate} onChange={e => setEndDate(e.target.value)} />
            </div>

            <div className="flex items-end">
              <Button onClick={loadTrialBalance} disabled={isLoading} className="w-full gap-2">
                <Search size={16} />
                {isLoading ? '查詢中...' : '查詢'}
              </Button>
            </div>
          </div>
        </Card>

        {/* 試算表 */}
        <Card className="p-0 overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-morandi-container border-b">
                <tr>
                  <th className="px-4 py-3 text-left text-sm font-semibold">科目代號</th>
                  <th className="px-4 py-3 text-left text-sm font-semibold">科目名稱</th>
                  <th className="px-4 py-3 text-center text-sm font-semibold">類型</th>
                  <th className="px-4 py-3 text-right text-sm font-semibold">借方總額</th>
                  <th className="px-4 py-3 text-right text-sm font-semibold">貸方總額</th>
                  <th className="px-4 py-3 text-right text-sm font-semibold">餘額</th>
                </tr>
              </thead>
              <tbody>
                {balances.length === 0 ? (
                  <tr>
                    <td colSpan={6} className="px-4 py-8 text-center text-muted-foreground">
                      {isLoading ? '載入中...' : '請選擇日期並查詢'}
                    </td>
                  </tr>
                ) : (
                  <>
                    {Object.entries(groupedBalances).map(([type, items]) => (
                      <>
                        {/* 類型標題 */}
                        <tr key={`header-${type}`} className="bg-morandi-container">
                          <td colSpan={6} className="px-4 py-2 text-sm font-semibold">
                            {typeLabels[type] || type}
                          </td>
                        </tr>
                        {/* 科目明細 */}
                        {items.map(item => (
                          <tr key={item.account_id} className="border-b hover:bg-morandi-container">
                            <td className="px-4 py-3 text-sm font-mono">{item.code}</td>
                            <td className="px-4 py-3 text-sm">{item.name}</td>
                            <td className="px-4 py-3 text-center">
                              <Badge variant="outline" className="text-xs">
                                {typeLabels[item.account_type]}
                              </Badge>
                            </td>
                            <td className="px-4 py-3 text-sm text-right font-mono">
                              {item.debit_total > 0 ? item.debit_total.toLocaleString() : '-'}
                            </td>
                            <td className="px-4 py-3 text-sm text-right font-mono">
                              {item.credit_total > 0 ? item.credit_total.toLocaleString() : '-'}
                            </td>
                            <td
                              className={`px-4 py-3 text-sm text-right font-mono font-semibold ${
                                item.balance > 0
                                  ? 'text-green-600'
                                  : item.balance < 0
                                    ? 'text-red-600'
                                    : ''
                              }`}
                            >
                              {item.balance !== 0 ? item.balance.toLocaleString() : '-'}
                            </td>
                          </tr>
                        ))}
                      </>
                    ))}
                    {/* 總計 */}
                    <tr className="bg-morandi-container font-bold border-t-2">
                      <td colSpan={3} className="px-4 py-3 text-sm">
                        總計
                      </td>
                      <td className="px-4 py-3 text-sm text-right font-mono">
                        {totals.debit.toLocaleString()}
                      </td>
                      <td className="px-4 py-3 text-sm text-right font-mono">
                        {totals.credit.toLocaleString()}
                      </td>
                      <td className="px-4 py-3 text-sm text-right font-mono">
                        {(totals.debit - totals.credit).toLocaleString()}
                      </td>
                    </tr>
                    {/* 平衡檢查 */}
                    {Math.abs(totals.debit - totals.credit) > 0.01 && (
                      <tr className="bg-red-50">
                        <td colSpan={6} className="px-4 py-3 text-sm text-red-600 text-center">
                          ⚠️ 警告：借貸不平衡！差額：
                          {(totals.debit - totals.credit).toLocaleString()}
                        </td>
                      </tr>
                    )}
                  </>
                )}
              </tbody>
            </table>
          </div>
        </Card>

        {/* 說明 */}
        {balances.length > 0 && (
          <Card className="p-4 bg-blue-50 border-blue-200">
            <div className="text-sm text-blue-800">
              <div className="font-semibold mb-2">試算表說明</div>
              <ul className="list-disc list-inside space-y-1">
                <li>截止日期：{endDate}</li>
                <li>借方總額 = 貸方總額 → 帳務平衡 ✅</li>
                <li>餘額 = 借方總額 - 貸方總額</li>
                <li>綠色表示借方餘額（資產/費用增加），紅色表示貸方餘額（負債/收入增加）</li>
              </ul>
            </div>
          </Card>
        )}
      </div>
    </ContentPageLayout>
  )
}
