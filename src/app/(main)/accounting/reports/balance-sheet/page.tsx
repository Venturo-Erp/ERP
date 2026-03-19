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

interface AccountBalance {
  code: string
  name: string
  balance: number
}

interface BalanceSheetData {
  assets: AccountBalance[]
  liabilities: AccountBalance[]
  equity: AccountBalance[]
  totalAssets: number
  totalLiabilities: number
  totalEquity: number
  netIncome: number // 本期損益
}

export default function BalanceSheetPage() {
  const { user } = useAuthStore()
  const [asOfDate, setAsOfDate] = useState('')
  const [data, setData] = useState<BalanceSheetData | null>(null)
  const [isLoading, setIsLoading] = useState(false)

  useEffect(() => {
    // 預設今天
    setAsOfDate(new Date().toISOString().split('T')[0])
  }, [])

  const loadBalanceSheet = async () => {
    if (!asOfDate || !user?.workspace_id) {
      alert('請選擇日期')
      return
    }

    setIsLoading(true)

    try {
      

      // 1. 取得資產、負債、權益科目
      const { data: accounts, error: accountsError } = await supabase
        .from('chart_of_accounts')
        .select('id, code, name, account_type')
        .eq('workspace_id', user.workspace_id)
        .in('account_type', ['asset', 'liability', 'equity'])
        .order('code', { ascending: true })

      if (accountsError) throw accountsError

      // 2. 取得截至指定日期的所有分錄
      const { data: lines, error: linesError } = await supabase
        .from('journal_lines')
        .select(`
          account_id,
          debit_amount,
          credit_amount,
          voucher:journal_vouchers!inner(
            voucher_date,
            workspace_id
          )
        `)
        .eq('voucher.workspace_id', user.workspace_id)
        .lte('voucher.voucher_date', asOfDate)

      if (linesError) throw linesError

      // 3. 計算各科目餘額
      const balanceMap = new Map<string, number>()
      
      lines.forEach((line: any) => {
        const existing = balanceMap.get(line.account_id) || 0
        // 資產：借方增加（debit - credit）
        // 負債/權益：貸方增加（credit - debit）
        balanceMap.set(line.account_id, existing + (line.debit_amount - line.credit_amount))
      })

      // 4. 整理數據
      const assets: AccountBalance[] = []
      const liabilities: AccountBalance[] = []
      const equity: AccountBalance[] = []

      accounts.forEach(account => {
        const rawBalance = balanceMap.get(account.id) || 0
        if (rawBalance === 0) return

        // 資產：借方餘額為正
        // 負債/權益：貸方餘額為正（所以要取負值）
        const balance = account.account_type === 'asset' 
          ? rawBalance 
          : -rawBalance

        if (balance === 0) return

        const item = {
          code: account.code,
          name: account.name,
          balance: Math.abs(balance),
        }

        if (account.account_type === 'asset') {
          assets.push(item)
        } else if (account.account_type === 'liability') {
          liabilities.push(item)
        } else if (account.account_type === 'equity') {
          equity.push(item)
        }
      })

      // 5. 計算本期損益（年初至今）
      const yearStart = `${asOfDate.substring(0, 4)}-01-01`
      
      const { data: plLines, error: plError } = await supabase
        .from('journal_lines')
        .select(`
          account_id,
          debit_amount,
          credit_amount,
          voucher:journal_vouchers!inner(
            voucher_date,
            workspace_id
          )
        `)
        .eq('voucher.workspace_id', user.workspace_id)
        .gte('voucher.voucher_date', yearStart)
        .lte('voucher.voucher_date', asOfDate)

      if (plError) throw plError

      // 取得損益科目
      const { data: plAccounts } = await supabase
        .from('chart_of_accounts')
        .select('id, account_type')
        .eq('workspace_id', user.workspace_id)
        .in('account_type', ['revenue', 'cost', 'expense'])

      const plAccountIds = new Set(plAccounts?.map(a => a.id) || [])
      
      let revenueTotal = 0
      let costExpenseTotal = 0

      plLines.forEach((line: any) => {
        if (!plAccountIds.has(line.account_id)) return

        const account = plAccounts?.find(a => a.id === line.account_id)
        if (!account) return

        if (account.account_type === 'revenue') {
          revenueTotal += (line.credit_amount - line.debit_amount)
        } else {
          costExpenseTotal += (line.debit_amount - line.credit_amount)
        }
      })

      const netIncome = revenueTotal - costExpenseTotal

      // 6. 計算總計
      const totalAssets = assets.reduce((sum, item) => sum + item.balance, 0)
      const totalLiabilities = liabilities.reduce((sum, item) => sum + item.balance, 0)
      const totalEquity = equity.reduce((sum, item) => sum + item.balance, 0) + netIncome

      setData({
        assets,
        liabilities,
        equity,
        totalAssets,
        totalLiabilities,
        totalEquity,
        netIncome,
      })

    } catch (error) {
      console.error('載入資產負債表失敗:', error)
      alert('載入失敗')
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <ContentPageLayout title="資產負債表">
      <div className="p-6 space-y-4">
        {/* 查詢條件 */}
        <Card className="p-4">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="space-y-2">
              <Label>截止日期</Label>
              <Input
                type="date"
                value={asOfDate}
                onChange={(e) => setAsOfDate(e.target.value)}
              />
            </div>

            <div className="flex items-end">
              <Button onClick={loadBalanceSheet} disabled={isLoading} className="w-full gap-2">
                <Search size={16} />
                {isLoading ? '查詢中...' : '查詢'}
              </Button>
            </div>
          </div>
        </Card>

        {/* 資產負債表 */}
        {data && (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {/* 左側：資產 */}
            <Card className="p-6">
              <div className="space-y-4">
                <div className="text-center border-b pb-4">
                  <h2 className="text-xl font-bold">資產</h2>
                  <p className="text-sm text-muted-foreground mt-1">
                    截至 {asOfDate}
                  </p>
                </div>

                <div>
                  <div className="font-semibold mb-2 text-blue-700">流動資產</div>
                  {data.assets.map(item => (
                    <div key={item.code} className="flex justify-between py-1 pl-4">
                      <span className="text-sm">{item.code} {item.name}</span>
                      <span className="text-sm font-mono">${item.balance.toLocaleString()}</span>
                    </div>
                  ))}
                  {data.assets.length === 0 && (
                    <div className="text-sm text-muted-foreground pl-4">無資產記錄</div>
                  )}
                </div>

                <div className="flex justify-between py-3 border-t-2 font-bold text-lg text-blue-600">
                  <span>資產總計</span>
                  <span className="font-mono">${data.totalAssets.toLocaleString()}</span>
                </div>
              </div>
            </Card>

            {/* 右側：負債 + 權益 */}
            <Card className="p-6">
              <div className="space-y-4">
                <div className="text-center border-b pb-4">
                  <h2 className="text-xl font-bold">負債與權益</h2>
                  <p className="text-sm text-muted-foreground mt-1">
                    截至 {asOfDate}
                  </p>
                </div>

                {/* 負債 */}
                <div>
                  <div className="font-semibold mb-2 text-red-700">負債</div>
                  {data.liabilities.map(item => (
                    <div key={item.code} className="flex justify-between py-1 pl-4">
                      <span className="text-sm">{item.code} {item.name}</span>
                      <span className="text-sm font-mono">${item.balance.toLocaleString()}</span>
                    </div>
                  ))}
                  {data.liabilities.length === 0 && (
                    <div className="text-sm text-muted-foreground pl-4">無負債記錄</div>
                  )}
                  <div className="flex justify-between py-2 border-t mt-2 font-semibold">
                    <span>負債合計</span>
                    <span className="font-mono">${data.totalLiabilities.toLocaleString()}</span>
                  </div>
                </div>

                {/* 權益 */}
                <div>
                  <div className="font-semibold mb-2 text-green-700">權益</div>
                  {data.equity.map(item => (
                    <div key={item.code} className="flex justify-between py-1 pl-4">
                      <span className="text-sm">{item.code} {item.name}</span>
                      <span className="text-sm font-mono">${item.balance.toLocaleString()}</span>
                    </div>
                  ))}
                  {/* 本期損益 */}
                  {data.netIncome !== 0 && (
                    <div className="flex justify-between py-1 pl-4">
                      <span className="text-sm">本期損益</span>
                      <span className={`text-sm font-mono ${data.netIncome >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                        ${data.netIncome.toLocaleString()}
                      </span>
                    </div>
                  )}
                  {data.equity.length === 0 && data.netIncome === 0 && (
                    <div className="text-sm text-muted-foreground pl-4">無權益記錄</div>
                  )}
                  <div className="flex justify-between py-2 border-t mt-2 font-semibold">
                    <span>權益合計</span>
                    <span className="font-mono">${data.totalEquity.toLocaleString()}</span>
                  </div>
                </div>

                <div className="flex justify-between py-3 border-t-2 font-bold text-lg text-purple-600">
                  <span>負債與權益總計</span>
                  <span className="font-mono">
                    ${(data.totalLiabilities + data.totalEquity).toLocaleString()}
                  </span>
                </div>
              </div>
            </Card>
          </div>
        )}

        {/* 平衡檢查 */}
        {data && (
          <Card className={`p-4 ${
            Math.abs(data.totalAssets - (data.totalLiabilities + data.totalEquity)) < 0.01
              ? 'bg-green-50 border-green-200'
              : 'bg-red-50 border-red-200'
          }`}>
            <div className={`text-sm ${
              Math.abs(data.totalAssets - (data.totalLiabilities + data.totalEquity)) < 0.01
                ? 'text-green-800'
                : 'text-red-800'
            }`}>
              <div className="font-semibold mb-2">會計等式驗證</div>
              <div className="space-y-1">
                <div>資產 = ${data.totalAssets.toLocaleString()}</div>
                <div>負債 + 權益 = ${(data.totalLiabilities + data.totalEquity).toLocaleString()}</div>
                <div className="font-bold mt-2">
                  {Math.abs(data.totalAssets - (data.totalLiabilities + data.totalEquity)) < 0.01
                    ? '✅ 平衡（資產 = 負債 + 權益）'
                    : `⚠️ 不平衡！差額：${(data.totalAssets - (data.totalLiabilities + data.totalEquity)).toLocaleString()}`
                  }
                </div>
              </div>
            </div>
          </Card>
        )}

        {!data && !isLoading && (
          <Card className="p-8">
            <div className="text-center text-muted-foreground">
              請選擇日期並查詢
            </div>
          </Card>
        )}
      </div>
    </ContentPageLayout>
  )
}
