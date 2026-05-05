'use client'

/**
 * PrintTourClosingPreview — 結帳明細列印預覽（HTML、仿出納單樣式）
 *
 * 設計：
 * - A4 直式、Morandi 色系
 * - logo 左上、標題置中、團號 + 日期右上、底部金線
 * - 利潤計算表（4 列 × 2 欄）+ 收入明細 + 支出明細 + 獎金明細
 * - 純 HTML、由父層用 iframe.print() 列印（仿 DisbursementPrintDialog 模式）
 */

import { forwardRef, useMemo } from 'react'
import type { Tour } from '@/stores/types'
import type { ProfitCalculationResult } from '@/types/bonus.types'
import { BonusSettingType, BonusCalculationType } from '@/types/bonus.types'
import { formatDate } from '@/lib/utils'
import { useAuthStore } from '@/stores/auth-store'
import { useWorkspaceSettings, getLogoStyle } from '@/hooks/useWorkspaceSettings'
import { BONUS_TYPE_LABELS } from '../constants/bonus-labels'

const COLORS = {
  gold: '#B8A99A',
  brown: '#3a3633',
  lightBrown: '#FAF7F2',
  gray: '#4B5563',
  lightGray: '#9CA3AF',
  red: '#B84C4C',
}

interface ReceiptRow {
  receipt_number?: string
  receipt_date?: string
  receipt_amount?: number
  amount?: number
  payment_method?: string
}

interface CostRow {
  code?: string | null
  request_number?: string | null
  supplier_name?: string | null
  request_type?: string | null
  amount?: number | null
}

export interface PrintTourClosingPreviewProps {
  tour: Tour
  receipts: ReceiptRow[]
  costs: CostRow[]
  profitResult: ProfitCalculationResult
  preparedBy?: string
}

const PAYMENT_METHOD_MAP: Record<string, string> = {
  transfer: '匯款',
  cash: '現金',
  card: '信用卡',
  check: '支票',
  linkpay: 'LinkPay',
}

const fmt = (n: number) => n.toLocaleString('zh-TW')

const SectionHeader = ({ children }: { children: React.ReactNode }) => (
  <div
    style={{
      fontSize: '13px',
      fontWeight: 600,
      color: COLORS.brown,
      marginBottom: '10px',
      paddingBottom: '6px',
      borderBottom: `1px solid ${COLORS.gold}`,
    }}
  >
    {children}
  </div>
)

const thStyle: React.CSSProperties = {
  padding: '8px 6px',
  textAlign: 'left',
  fontWeight: 600,
  color: COLORS.brown,
  fontSize: '10px',
}

const tdStyle: React.CSSProperties = {
  padding: '6px',
  fontSize: '10px',
  color: COLORS.gray,
  verticalAlign: 'middle',
}

export const PrintTourClosingPreview = forwardRef<HTMLDivElement, PrintTourClosingPreviewProps>(
  function PrintTourClosingPreview(
    { tour, receipts, costs, profitResult, preparedBy },
    ref
  ) {
    const ws = useWorkspaceSettings()
    const workspaceName = ws.name || useAuthStore.getState().user?.workspace_name || ''
    const logoUrl = ws.logo_url

    // 利潤計算表 4 列
    const grossRevenue = profitResult.receipt_total - profitResult.expense_total
    const profitPreTax = grossRevenue - profitResult.administrative_cost
    const summaryRows = useMemo(
      () => [
        {
          label: '收款總額',
          pre: profitResult.receipt_total,
          post: profitResult.receipt_total,
        },
        {
          label: '付款總額',
          pre: profitResult.expense_total,
          post: profitResult.expense_total,
        },
        {
          label: '營收總額',
          pre: grossRevenue,
          post: grossRevenue - profitResult.profit_tax,
        },
        {
          label: '利潤總額',
          pre: profitPreTax,
          post: profitPreTax - profitResult.profit_tax,
        },
      ],
      [profitResult, grossRevenue, profitPreTax]
    )

    // 獎金明細
    interface DetailRow {
      label: string
      sub?: string
      amount: number
    }
    const detailRows: DetailRow[] = []
    if (profitResult.administrative_cost !== 0) {
      detailRows.push({
        label: '行政費用',
        sub:
          profitResult.admin_cost_per_person > 0
            ? `${profitResult.admin_cost_per_person} 元/人 × ${profitResult.member_count} 人`
            : '',
        amount: profitResult.administrative_cost,
      })
    }
    if (profitResult.profit_tax !== 0) {
      detailRows.push({
        label: '營收稅額',
        sub: profitResult.tax_rate > 0 ? `${profitResult.tax_rate}%` : '',
        amount: profitResult.profit_tax,
      })
    }
    for (const b of profitResult.employee_bonuses) {
      if (b.amount === 0) continue
      const v = Number(b.setting.bonus)
      const sub =
        b.setting.bonus_type === BonusCalculationType.PERCENT ? `${v}%` : `$${v}`
      const employee = b.employee_name ? ` — ${b.employee_name}` : ''
      detailRows.push({
        label: `${BONUS_TYPE_LABELS[b.setting.type as BonusSettingType]}${employee}`,
        sub,
        amount: b.amount,
      })
    }
    for (const b of profitResult.team_bonuses) {
      if (b.amount === 0) continue
      const v = Number(b.setting.bonus)
      const sub =
        b.setting.bonus_type === BonusCalculationType.PERCENT ? `${v}%` : `$${v}`
      detailRows.push({
        label: BONUS_TYPE_LABELS[BonusSettingType.TEAM_BONUS],
        sub,
        amount: b.amount,
      })
    }

    return (
      <div
        ref={ref}
        style={{
          width: '100%',
          padding: '32px 28px',
          background: 'white',
          fontFamily:
            '-apple-system, BlinkMacSystemFont, "Segoe UI", "PingFang TC", "Microsoft JhengHei", sans-serif',
          fontSize: '12px',
          color: COLORS.gray,
          boxSizing: 'border-box',
        }}
      >
        {/* 頁首 */}
        <div
          style={{
            position: 'relative',
            paddingBottom: '16px',
            marginBottom: '24px',
            borderBottom: `1px solid ${COLORS.gold}`,
          }}
        >
          {logoUrl && (
            <div style={{ position: 'absolute', left: 0, top: 0 }}>
              <img src={logoUrl} alt="logo" style={getLogoStyle('print')} />
            </div>
          )}

          <div style={{ textAlign: 'center', padding: '8px 0' }}>
            <div
              style={{
                fontSize: '11px',
                letterSpacing: '3px',
                color: COLORS.gold,
                fontWeight: 500,
                marginBottom: '4px',
              }}
            >
              TOUR CLOSING REPORT
            </div>
            <h1
              style={{
                fontSize: '20px',
                fontWeight: 'bold',
                color: COLORS.brown,
                margin: 0,
              }}
            >
              結帳明細報表
            </h1>
          </div>

          <div
            style={{
              position: 'absolute',
              right: 0,
              top: 0,
              textAlign: 'right',
              fontSize: '11px',
              color: COLORS.gray,
            }}
          >
            <div style={{ fontWeight: 600 }}>{tour.code || '-'}</div>
            <div style={{ color: COLORS.lightGray, marginTop: '2px' }}>
              {tour.departure_date && tour.return_date
                ? `${formatDate(tour.departure_date)} ~ ${formatDate(tour.return_date)}`
                : '-'}
            </div>
          </div>
        </div>

        {/* meta：團名 + 製表人 + 列印日 */}
        <div
          style={{
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            marginBottom: '24px',
            fontSize: '11px',
            color: COLORS.gray,
          }}
        >
          <div>
            <span style={{ color: COLORS.lightGray }}>團名：</span>
            <span style={{ color: COLORS.brown, fontWeight: 600 }}>{tour.name || '-'}</span>
          </div>
          <div style={{ textAlign: 'right' }}>
            {preparedBy && (
              <div>
                <span style={{ color: COLORS.lightGray }}>製表人：</span>
                <span>{preparedBy}</span>
              </div>
            )}
            <div style={{ color: COLORS.lightGray, marginTop: '2px' }}>
              列印日期：{formatDate(new Date().toISOString())}
            </div>
          </div>
        </div>

        {/* === 利潤計算表 === */}
        <SectionHeader>利潤計算表</SectionHeader>
        <table
          style={{
            width: '100%',
            borderCollapse: 'collapse',
            marginBottom: '24px',
          }}
        >
          <colgroup>
            <col style={{ width: '40%' }} />
            <col style={{ width: '30%' }} />
            <col style={{ width: '30%' }} />
          </colgroup>
          <thead>
            <tr style={{ borderBottom: `2px solid ${COLORS.brown}` }}>
              <th style={thStyle}>項目</th>
              <th style={{ ...thStyle, textAlign: 'right' }}>未扣營業稅</th>
              <th style={{ ...thStyle, textAlign: 'right' }}>已扣營業稅</th>
            </tr>
          </thead>
          <tbody>
            {summaryRows.map((row, i) => {
              const isLast = i === summaryRows.length - 1
              return (
                <tr
                  key={i}
                  style={{
                    borderBottom: i < summaryRows.length - 1 ? `1px solid ${COLORS.gold}` : 'none',
                    background: isLast ? COLORS.lightBrown : 'transparent',
                  }}
                >
                  <td
                    style={{
                      ...tdStyle,
                      fontWeight: isLast ? 600 : 'normal',
                      color: isLast ? COLORS.brown : COLORS.gray,
                    }}
                  >
                    {row.label}
                  </td>
                  <td
                    style={{
                      ...tdStyle,
                      textAlign: 'right',
                      fontWeight: isLast ? 600 : 'normal',
                      color: isLast ? COLORS.brown : COLORS.gray,
                    }}
                  >
                    NT$ {fmt(row.pre)}
                  </td>
                  <td
                    style={{
                      ...tdStyle,
                      textAlign: 'right',
                      fontWeight: isLast ? 600 : 'normal',
                      color: isLast ? COLORS.brown : COLORS.gray,
                    }}
                  >
                    NT$ {fmt(row.post)}
                  </td>
                </tr>
              )
            })}
          </tbody>
        </table>

        {/* === 收入明細 === */}
        <SectionHeader>收入明細</SectionHeader>
        <table
          style={{
            width: '100%',
            borderCollapse: 'collapse',
            marginBottom: '24px',
          }}
        >
          <colgroup>
            <col style={{ width: '8%' }} />
            <col style={{ width: '32%' }} />
            <col style={{ width: '20%' }} />
            <col style={{ width: '20%' }} />
            <col style={{ width: '20%' }} />
          </colgroup>
          <thead>
            <tr style={{ borderBottom: `2px solid ${COLORS.brown}` }}>
              <th style={{ ...thStyle, textAlign: 'center' }}>#</th>
              <th style={thStyle}>收款單號</th>
              <th style={{ ...thStyle, textAlign: 'center' }}>日期</th>
              <th style={{ ...thStyle, textAlign: 'center' }}>收款方式</th>
              <th style={{ ...thStyle, textAlign: 'right' }}>金額</th>
            </tr>
          </thead>
          <tbody>
            {receipts.length === 0 ? (
              <tr>
                <td colSpan={5} style={{ ...tdStyle, textAlign: 'center', padding: '16px' }}>
                  無收入紀錄
                </td>
              </tr>
            ) : (
              receipts.map((r, i) => (
                <tr key={i} style={{ borderBottom: `1px solid ${COLORS.gold}` }}>
                  <td style={{ ...tdStyle, textAlign: 'center' }}>{i + 1}</td>
                  <td style={tdStyle}>{r.receipt_number || '-'}</td>
                  <td style={{ ...tdStyle, textAlign: 'center' }}>
                    {r.receipt_date ? formatDate(r.receipt_date) : '-'}
                  </td>
                  <td style={{ ...tdStyle, textAlign: 'center' }}>
                    {r.payment_method ? PAYMENT_METHOD_MAP[r.payment_method] || r.payment_method : '-'}
                  </td>
                  <td style={{ ...tdStyle, textAlign: 'right' }}>
                    NT$ {fmt(r.receipt_amount ?? r.amount ?? 0)}
                  </td>
                </tr>
              ))
            )}
            <tr style={{ borderTop: `1px solid ${COLORS.gold}` }}>
              <td colSpan={3} />
              <td style={{ ...tdStyle, textAlign: 'right', color: COLORS.lightGray }}>收入小計</td>
              <td
                style={{
                  ...tdStyle,
                  textAlign: 'right',
                  fontWeight: 600,
                  color: COLORS.brown,
                  fontSize: '11px',
                }}
              >
                NT$ {fmt(profitResult.receipt_total)}
              </td>
            </tr>
          </tbody>
        </table>

        {/* === 支出明細 === */}
        <SectionHeader>支出明細</SectionHeader>
        <table
          style={{
            width: '100%',
            borderCollapse: 'collapse',
            marginBottom: '24px',
          }}
        >
          <colgroup>
            <col style={{ width: '8%' }} />
            <col style={{ width: '24%' }} />
            <col style={{ width: '28%' }} />
            <col style={{ width: '20%' }} />
            <col style={{ width: '20%' }} />
          </colgroup>
          <thead>
            <tr style={{ borderBottom: `2px solid ${COLORS.brown}` }}>
              <th style={{ ...thStyle, textAlign: 'center' }}>#</th>
              <th style={thStyle}>請款單號</th>
              <th style={thStyle}>供應商</th>
              <th style={thStyle}>類別</th>
              <th style={{ ...thStyle, textAlign: 'right' }}>金額</th>
            </tr>
          </thead>
          <tbody>
            {costs.length === 0 ? (
              <tr>
                <td colSpan={5} style={{ ...tdStyle, textAlign: 'center', padding: '16px' }}>
                  無支出紀錄
                </td>
              </tr>
            ) : (
              costs.map((c, i) => (
                <tr key={i} style={{ borderBottom: `1px solid ${COLORS.gold}` }}>
                  <td style={{ ...tdStyle, textAlign: 'center' }}>{i + 1}</td>
                  <td style={tdStyle}>{c.code || c.request_number || '-'}</td>
                  <td style={tdStyle}>{c.supplier_name || '-'}</td>
                  <td style={tdStyle}>{c.request_type || '-'}</td>
                  <td style={{ ...tdStyle, textAlign: 'right' }}>NT$ {fmt(c.amount || 0)}</td>
                </tr>
              ))
            )}
            <tr style={{ borderTop: `1px solid ${COLORS.gold}` }}>
              <td colSpan={3} />
              <td style={{ ...tdStyle, textAlign: 'right', color: COLORS.lightGray }}>支出小計</td>
              <td
                style={{
                  ...tdStyle,
                  textAlign: 'right',
                  fontWeight: 600,
                  color: COLORS.brown,
                  fontSize: '11px',
                }}
              >
                NT$ {fmt(profitResult.expense_total)}
              </td>
            </tr>
          </tbody>
        </table>

        {/* === 獎金明細 === */}
        <SectionHeader>獎金明細</SectionHeader>
        <table
          style={{
            width: '100%',
            borderCollapse: 'collapse',
            marginBottom: '20px',
          }}
        >
          <colgroup>
            <col style={{ width: '40%' }} />
            <col style={{ width: '30%' }} />
            <col style={{ width: '30%' }} />
          </colgroup>
          <thead>
            <tr style={{ borderBottom: `2px solid ${COLORS.brown}` }}>
              <th style={thStyle}>項目</th>
              <th style={thStyle}>說明</th>
              <th style={{ ...thStyle, textAlign: 'right' }}>金額</th>
            </tr>
          </thead>
          <tbody>
            {detailRows.length === 0 ? (
              <tr>
                <td colSpan={3} style={{ ...tdStyle, textAlign: 'center', padding: '16px' }}>
                  無獎金明細
                </td>
              </tr>
            ) : (
              detailRows.map((row, i) => (
                <tr key={i} style={{ borderBottom: `1px solid ${COLORS.gold}` }}>
                  <td style={{ ...tdStyle, color: COLORS.brown }}>{row.label}</td>
                  <td style={{ ...tdStyle, color: COLORS.lightGray }}>{row.sub || ''}</td>
                  <td style={{ ...tdStyle, textAlign: 'right' }}>NT$ {fmt(row.amount)}</td>
                </tr>
              ))
            )}
          </tbody>
        </table>

        {/* === 公司盈餘 === */}
        <div
          style={{
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            padding: '12px 6px',
            marginTop: '12px',
            borderTop: `2px solid ${COLORS.brown}`,
            background: COLORS.lightBrown,
          }}
        >
          <span style={{ fontSize: '13px', fontWeight: 600, color: COLORS.brown }}>公司盈餘</span>
          <span style={{ fontSize: '15px', fontWeight: 'bold', color: COLORS.brown }}>
            NT$ {fmt(profitResult.company_profit)}
          </span>
        </div>

        {/* 頁尾 slogan */}
        <div
          style={{
            marginTop: '32px',
            paddingTop: '12px',
            borderTop: `1px solid ${COLORS.gold}`,
            textAlign: 'center',
            fontSize: '10px',
            color: COLORS.lightGray,
            letterSpacing: '2px',
          }}
        >
          {workspaceName ? `─ ${workspaceName} ─` : '─'}
        </div>
      </div>
    )
  }
)
