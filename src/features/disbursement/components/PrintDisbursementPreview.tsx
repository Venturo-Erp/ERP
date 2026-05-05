'use client'
/**
 * PrintDisbursementPreview
 * 出納單列印預覽組件
 *
 * 設計風格：
 * - 使用 Morandi 色系配合公司品牌
 * - 直向 (portrait) A4 格式
 * - 極簡線條設計
 * - 付款對象和小計用 rowSpan 合併並垂直置中
 * - 每組最多 5 筆，超過自動拆分（避免跨頁問題）
 */

import { PRINT_LABELS } from '../constants/labels'

import React, { forwardRef, useMemo } from 'react'
import type { DisbursementOrder, PaymentRequest, PaymentRequestItem } from '@/stores/types'
import { formatDate } from '@/lib/utils'
import { DISBURSEMENT_LABELS } from '../constants/labels'
import { useAuthStore } from '@/stores/auth-store'
import { useWorkspaceSettings, getLogoStyle } from '@/hooks/useWorkspaceSettings'
import { logger } from '@/lib/utils/logger'

// Morandi 色系
const COLORS = {
  gold: '#B8A99A',
  brown: '#3a3633',
  lightBrown: '#FAF7F2',
  gray: '#4B5563',
  lightGray: '#9CA3AF',
  red: '#B84C4C', // 轉移出（負金額）、Morandi 紅
}

interface PrintDisbursementPreviewProps {
  order: DisbursementOrder
  paymentRequests: PaymentRequest[]
  paymentRequestItems: PaymentRequestItem[]
}

interface ProcessedItem {
  requestId: string // 用來過濾成本轉移 pair requests
  requestCode: string
  createdBy: string
  tourName: string
  description: string
  payFor: string
  amount: number
  isCompany: boolean // 是否為公司請款
}

interface PayForGroup {
  payFor: string
  items: ProcessedItem[]
  total: number
  showTotal: boolean // 是否顯示小計（只在該供應商最後一個區塊顯示）
}

function processItems(
  paymentRequests: PaymentRequest[],
  paymentRequestItems: PaymentRequestItem[]
): ProcessedItem[] {
  const requestMap = new Map(paymentRequests.map(r => [r.id, r]))

  return paymentRequestItems.map(item => {
    const request = requestMap.get(item.request_id)
    const isCompany = request?.request_category === 'company'
    // 公司請款顯示費用類型，團體請款顯示團名
    const tourName = isCompany
      ? request?.request_type || DISBURSEMENT_LABELS.公司
      : request?.tour_name || '-'

    // 有代墊人時，付款對象是「代墊人（廠商）」
    const advancedBy = (item as unknown as Record<string, unknown>).advanced_by_name as
      | string
      | undefined
    const supplierName = item.supplier_name || DISBURSEMENT_LABELS.未指定供應商
    const payFor = advancedBy ? `${advancedBy}（${supplierName}）` : supplierName

    return {
      requestId: item.request_id,
      requestCode: request?.code || '-',
      createdBy: request?.created_by_name || '-',
      tourName,
      description: item.description || item.category || '-',
      payFor,
      amount: item.subtotal || 0,
      isCompany,
    }
  })
}

function groupByPayFor(items: ProcessedItem[]): PayForGroup[] {
  const grouped = new Map<string, ProcessedItem[]>()

  for (const item of items) {
    if (!grouped.has(item.payFor)) {
      grouped.set(item.payFor, [])
    }
    grouped.get(item.payFor)!.push(item)
  }

  const groups: PayForGroup[] = Array.from(grouped.entries()).map(([payFor, groupItems]) => ({
    payFor,
    items: groupItems,
    total: groupItems.reduce((sum, item) => sum + item.amount, 0),
    showTotal: true,
  }))

  groups.sort((a, b) => a.payFor.localeCompare(b.payFor, 'zh-TW'))

  return groups
}

/**
 * 提取實際收款人（去掉括號部分）
 * 例如："William（XX）" → "William"
 */
function extractPayee(payFor: string): string {
  const match = payFor.match(/^([^（]+)/)
  return match ? match[1].trim() : payFor
}

/**
 * 拆分付款對象為兩行顯示
 * 例如："William（XX）" → { payee: "William", supplier: "（XX）" }
 */
function splitPayFor(payFor: string): { payee: string; supplier: string | null } {
  const match = payFor.match(/^([^（]+)(（.+）)$/)
  if (match) {
    return {
      payee: match[1].trim(),
      supplier: match[2],
    }
  }
  return {
    payee: payFor,
    supplier: null,
  }
}

/**
 * 分割大型群組 + 同收款人合併小計
 * - 每個區塊都顯示供應商名稱
 * - 同一個收款人的多個分組，只在最後一組顯示總金額
 */
function splitLargeGroups(groups: PayForGroup[], maxSize = 5): PayForGroup[] {
  const result: PayForGroup[] = []

  for (const group of groups) {
    if (group.items.length <= maxSize) {
      result.push(group)
    } else {
      // 拆成多個區塊
      const totalChunks = Math.ceil(group.items.length / maxSize)
      for (let i = 0; i < group.items.length; i += maxSize) {
        const chunk = group.items.slice(i, i + maxSize)
        const chunkIndex = Math.floor(i / maxSize)
        const isLastChunk = chunkIndex === totalChunks - 1

        result.push({
          payFor: group.payFor,
          items: chunk,
          total: group.total,
          showTotal: isLastChunk, // 只在最後一個區塊顯示小計
        })
      }
    }
  }

  // 計算每個收款人的總金額，並標記誰是最後一組
  const payeeGroups = new Map<string, { total: number; indices: number[] }>()

  result.forEach((group, idx) => {
    const payee = extractPayee(group.payFor)
    if (!payeeGroups.has(payee)) {
      payeeGroups.set(payee, { total: 0, indices: [] })
    }
    const pg = payeeGroups.get(payee)!
    pg.total += group.total
    pg.indices.push(idx)
  })

  // 如果同一個收款人有多個分組，只在最後一組顯示總金額
  payeeGroups.forEach(pg => {
    if (pg.indices.length > 1) {
      // 前面的分組不顯示小計
      pg.indices.slice(0, -1).forEach(idx => {
        result[idx].showTotal = false
      })
      // 最後一組顯示該收款人的總金額
      const lastIdx = pg.indices[pg.indices.length - 1]
      result[lastIdx].total = pg.total
      result[lastIdx].showTotal = true
    }
  })

  // 計算每個收款人的總行數（用於 rowSpan）
  result.forEach((group, idx) => {
    const payee = extractPayee(group.payFor)
    const pg = payeeGroups.get(payee)!
    const isFirstGroupOfPayee = pg.indices[0] === idx

    if (isFirstGroupOfPayee) {
      // 計算該收款人的所有行數
      const totalRows = pg.indices.reduce((sum, gIdx) => sum + result[gIdx].items.length, 0)
      ;((group as unknown as Record<string, unknown>).subtotalRowSpan as number) = totalRows
      // 強制設定 showTotal=true（確保顯示小計）
      group.showTotal = true
      group.total = pg.total
    } else {
      ;((group as unknown as Record<string, unknown>).subtotalRowSpan as number) = 0 // 不顯示小計欄位
    }
  })

  return result
}

export const PrintDisbursementPreview = forwardRef<HTMLDivElement, PrintDisbursementPreviewProps>(
  function PrintDisbursementPreview({ order, paymentRequests, paymentRequestItems }, ref) {
    const ws = useWorkspaceSettings()
    const workspaceName = ws.name || useAuthStore.getState().user?.workspace_name || ''
    const companyFullName = ws.legal_name || workspaceName || ''
    const logoUrl = ws.logo_url
    const subtitle = ws.subtitle

    const processedItems = useMemo(
      () => processItems(paymentRequests, paymentRequestItems),
      [paymentRequests, paymentRequestItems]
    )

    // 偵測成本轉移請款單（按 transferred_pair_id、新對沖模式）
    const transferredRequestIds = useMemo(() => {
      const ids = new Set<string>()
      for (const req of paymentRequests) {
        const pairId = (req as unknown as Record<string, unknown>).transferred_pair_id
        if (pairId) ids.add(req.id)
      }
      return ids
    }, [paymentRequests])

    // 分離：團體請款、公司請款（都排除成本轉移 pair requests）
    const companyItems = useMemo(
      () =>
        processedItems.filter(item => item.isCompany && !transferredRequestIds.has(item.requestId)),
      [processedItems, transferredRequestIds]
    )
    const tourItems = useMemo(
      () =>
        processedItems.filter(
          item => !item.isCompany && !transferredRequestIds.has(item.requestId)
        ),
      [processedItems, transferredRequestIds]
    )

    // 成本轉移 pairs（按 transferred_pair_id 配對兩張請款單、A 負 + B 正）
    interface TransferPairRow {
      pairId: string
      fromTourCode: string
      fromTourName: string
      toTourCode: string
      toTourName: string
      amount: number
      items: Array<{ description: string; supplier: string; subtotal: number }>
    }
    // orphan pair = pair_id 存在但 src/dst 找不到對手（pair 一邊被刪 / 狀態異常）
    const [transferPairs, orphanPairIds] = useMemo<[TransferPairRow[], string[]]>(() => {
      // 1. group requests by pair_id
      const pairGroups = new Map<string, PaymentRequest[]>()
      for (const req of paymentRequests) {
        const pairId = (req as unknown as Record<string, unknown>).transferred_pair_id as
          | string
          | undefined
        if (!pairId) continue
        if (!pairGroups.has(pairId)) pairGroups.set(pairId, [])
        pairGroups.get(pairId)!.push(req)
      }

      // 2. 每對取 src（amount<0）跟 dst（amount>0）、構造 row
      const rows: TransferPairRow[] = []
      const orphans: string[] = []
      for (const [pairId, reqs] of pairGroups) {
        const src = reqs.find(r => (r.amount || 0) < 0)
        const dst = reqs.find(r => (r.amount || 0) > 0)
        if (!src || !dst) {
          orphans.push(pairId)
          logger.warn(
            `[PrintDisbursementPreview] 孤兒轉移 pair ${pairId}：${
              !src ? '缺 src（amount<0）' : '缺 dst（amount>0）'
            }、共 ${reqs.length} 張 PR、UI 跳過顯示`,
            reqs.map(r => ({ id: r.id, code: r.code, amount: r.amount }))
          )
          continue
        }
        // 正向 items（給 UI 顯示 description、supplier）
        const dstItems = paymentRequestItems
          .filter(i => i.request_id === dst.id)
          .map(i => ({
            description: i.description || '-',
            supplier: i.supplier_name || '-',
            subtotal: i.subtotal || 0,
          }))
        rows.push({
          pairId,
          fromTourCode: src.tour_code || '-',
          fromTourName: src.tour_name || '-',
          toTourCode: dst.tour_code || '-',
          toTourName: dst.tour_name || '-',
          amount: dst.amount || 0,
          items: dstItems,
        })
      }
      return [rows, orphans]
    }, [paymentRequests, paymentRequestItems])

    // 分別分組
    const companyGroups = useMemo(
      () => splitLargeGroups(groupByPayFor(companyItems), 5),
      [companyItems]
    )
    const tourGroups = useMemo(() => splitLargeGroups(groupByPayFor(tourItems), 5), [tourItems])

    // 計算小計
    const companyTotal = companyItems.reduce((sum, item) => sum + item.amount, 0)
    const tourTotal = tourItems.reduce((sum, item) => sum + item.amount, 0)
    const totalAmount = order.amount || 0

    return (
      <div
        ref={ref}
        style={{
          width: '100%',
          minHeight: '400px',
          padding: '32px 28px',
          margin: '0 auto',
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
            marginBottom: '28px',
            borderBottom: `1px solid ${COLORS.gold}`,
          }}
        >
          {/* Logo 區域 - 左上（沒設 logo_url 就留空、避免洩漏其他租戶 logo）*/}
          {logoUrl && (
            <div
              style={{
                position: 'absolute',
                left: 0,
                top: 0,
              }}
            >
              <img
                src={logoUrl}
                alt={DISBURSEMENT_LABELS.公司Logo_Alt}
                style={getLogoStyle('print')}
              />
            </div>
          )}

          {/* 標題 - 置中 */}
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
              DISBURSEMENT
            </div>
            <h1
              style={{
                fontSize: '20px',
                fontWeight: 'bold',
                color: COLORS.brown,
                margin: 0,
              }}
            >
              {PRINT_LABELS.LABEL_7295}
            </h1>
          </div>

          {/* 單號和日期 - 右上 */}
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
            <div style={{ fontWeight: 600 }}>{order.order_number || '-'}</div>
            <div style={{ color: COLORS.lightGray, marginTop: '2px' }}>
              {order.disbursement_date ? formatDate(order.disbursement_date) : '-'}
            </div>
          </div>
        </div>

        {/* 團體請款區塊 */}
        {tourGroups.length > 0 && (
          <>
            <div
              style={{
                fontSize: '13px',
                fontWeight: 600,
                color: COLORS.brown,
                marginBottom: '12px',
                paddingBottom: '8px',
                borderBottom: `1px solid ${COLORS.gold}`,
              }}
            >
              {PRINT_LABELS.LABEL_3396}
            </div>
            <table
              style={{
                width: '100%',
                borderCollapse: 'collapse',
                marginBottom: '16px',
              }}
            >
              <colgroup>
                <col style={{ width: '18%' }} />
                <col style={{ width: '14%' }} />
                <col style={{ width: '18%' }} />
                <col style={{ width: '24%' }} />
                <col style={{ width: '13%' }} />
                <col style={{ width: '13%' }} />
              </colgroup>
              <thead>
                <tr style={{ borderBottom: `2px solid ${COLORS.brown}` }}>
                  <th
                    style={{
                      padding: '8px 6px',
                      textAlign: 'left',
                      fontWeight: 600,
                      color: COLORS.brown,
                      fontSize: '10px',
                    }}
                  >
                    {PRINT_LABELS.PAYEE}
                  </th>
                  <th
                    style={{
                      padding: '8px 6px',
                      textAlign: 'left',
                      fontWeight: 600,
                      color: COLORS.brown,
                      fontSize: '10px',
                    }}
                  >
                    {PRINT_LABELS.REQUEST_NO}
                  </th>
                  <th
                    style={{
                      padding: '8px 6px',
                      textAlign: 'left',
                      fontWeight: 600,
                      color: COLORS.brown,
                      fontSize: '10px',
                    }}
                  >
                    {PRINT_LABELS.TOUR_NAME}
                  </th>
                  <th
                    style={{
                      padding: '8px 6px',
                      textAlign: 'left',
                      fontWeight: 600,
                      color: COLORS.brown,
                      fontSize: '10px',
                    }}
                  >
                    {PRINT_LABELS.ITEM_DESC}
                  </th>
                  <th
                    style={{
                      padding: '8px 6px',
                      textAlign: 'right',
                      fontWeight: 600,
                      color: COLORS.brown,
                      fontSize: '10px',
                    }}
                  >
                    {PRINT_LABELS.AMOUNT}
                  </th>
                  <th
                    style={{
                      padding: '8px 6px',
                      textAlign: 'right',
                      fontWeight: 600,
                      color: COLORS.brown,
                      fontSize: '10px',
                    }}
                  >
                    {PRINT_LABELS.SUBTOTAL}
                  </th>
                </tr>
              </thead>
              <tbody>
                {tourGroups.map((group, groupIdx) =>
                  group.items.map((item, itemIdx) => {
                    const isFirstInGroup = itemIdx === 0
                    const { payee: groupPayee, supplier: groupSupplier } = splitPayFor(group.payFor)
                    const subtotalRowSpan =
                      ((group as unknown as Record<string, unknown>).subtotalRowSpan as number) || 0
                    const showSubtotalCell = subtotalRowSpan > 0 && isFirstInGroup

                    return (
                      <tr key={`tour-${groupIdx}-${itemIdx}`}>
                        {isFirstInGroup && (
                          <td
                            rowSpan={group.items.length}
                            style={{
                              padding: '6px',
                              verticalAlign: 'middle',
                              fontSize: '10px',
                              fontWeight: 600,
                              color: COLORS.brown,
                              borderTop: groupIdx > 0 ? `1px solid ${COLORS.gold}` : 'none',
                            }}
                          >
                            <div>{groupPayee}</div>
                            {groupSupplier && (
                              <div
                                style={{
                                  fontSize: '9px',
                                  fontWeight: 'normal',
                                  color: COLORS.gray,
                                  marginTop: '2px',
                                }}
                              >
                                {groupSupplier}
                              </div>
                            )}
                          </td>
                        )}
                        <td
                          style={{
                            padding: '6px',
                            verticalAlign: 'middle',
                            fontSize: '10px',
                            color: COLORS.gray,
                            borderTop:
                              isFirstInGroup && groupIdx > 0 ? `1px solid ${COLORS.gold}` : 'none',
                          }}
                        >
                          {item.requestCode}
                        </td>
                        <td
                          style={{
                            padding: '6px',
                            verticalAlign: 'middle',
                            fontSize: '10px',
                            color: COLORS.gray,
                            borderTop:
                              isFirstInGroup && groupIdx > 0 ? `1px solid ${COLORS.gold}` : 'none',
                            maxWidth: '140px',
                            overflow: 'hidden',
                            textOverflow: 'ellipsis',
                            whiteSpace: 'nowrap',
                          }}
                        >
                          {item.tourName}
                        </td>
                        <td
                          style={{
                            padding: '6px',
                            verticalAlign: 'middle',
                            fontSize: '10px',
                            color: COLORS.gray,
                            borderTop:
                              isFirstInGroup && groupIdx > 0 ? `1px solid ${COLORS.gold}` : 'none',
                          }}
                        >
                          {item.description}
                        </td>
                        <td
                          style={{
                            padding: '6px',
                            verticalAlign: 'middle',
                            fontSize: '10px',
                            textAlign: 'right',
                            color: COLORS.gray,
                            borderTop:
                              isFirstInGroup && groupIdx > 0 ? `1px solid ${COLORS.gold}` : 'none',
                          }}
                        >
                          {item.amount.toLocaleString()}
                        </td>
                        {showSubtotalCell && (
                          <td
                            rowSpan={subtotalRowSpan}
                            style={{
                              padding: '6px',
                              verticalAlign: 'middle',
                              fontSize: '10px',
                              textAlign: 'center',
                              fontWeight: 600,
                              color: COLORS.brown,
                              borderTop: groupIdx > 0 ? `1px solid ${COLORS.gold}` : 'none',
                            }}
                          >
                            {group.showTotal ? group.total.toLocaleString() : ''}
                          </td>
                        )}
                      </tr>
                    )
                  })
                )}
              </tbody>
            </table>
            {/* 團體小計 */}
            <div
              style={{
                display: 'flex',
                justifyContent: 'flex-end',
                alignItems: 'center',
                padding: '6px',
                marginBottom: '24px',
                borderTop: `1px solid ${COLORS.gold}`,
              }}
            >
              <span style={{ fontSize: '12px', color: COLORS.gray, marginRight: '16px' }}>
                {PRINT_LABELS.TOUR_SUBTOTAL}
              </span>
              <span style={{ fontSize: '13px', fontWeight: 600, color: COLORS.brown }}>
                NT$ {tourTotal.toLocaleString()}
              </span>
            </div>
          </>
        )}

        {/* 公司請款區塊 */}
        {companyGroups.length > 0 && (
          <>
            <div
              style={{
                fontSize: '13px',
                fontWeight: 600,
                color: COLORS.brown,
                marginBottom: '12px',
                paddingBottom: '8px',
                borderBottom: `1px solid ${COLORS.gold}`,
              }}
            >
              {PRINT_LABELS.LABEL_5030}
            </div>
            <table
              style={{
                width: '100%',
                borderCollapse: 'collapse',
                marginBottom: '16px',
              }}
            >
              <colgroup>
                <col style={{ width: '18%' }} />
                <col style={{ width: '14%' }} />
                <col style={{ width: '18%' }} />
                <col style={{ width: '24%' }} />
                <col style={{ width: '13%' }} />
                <col style={{ width: '13%' }} />
              </colgroup>
              <thead>
                <tr style={{ borderBottom: `2px solid ${COLORS.brown}` }}>
                  <th
                    style={{
                      padding: '8px 6px',
                      textAlign: 'left',
                      fontWeight: 600,
                      color: COLORS.brown,
                      fontSize: '10px',
                    }}
                  >
                    {PRINT_LABELS.PAYEE}
                  </th>
                  <th
                    style={{
                      padding: '8px 6px',
                      textAlign: 'left',
                      fontWeight: 600,
                      color: COLORS.brown,
                      fontSize: '10px',
                    }}
                  >
                    {PRINT_LABELS.REQUEST_NO}
                  </th>
                  <th
                    style={{
                      padding: '8px 6px',
                      textAlign: 'left',
                      fontWeight: 600,
                      color: COLORS.brown,
                      fontSize: '10px',
                    }}
                  >
                    {PRINT_LABELS.TYPE}
                  </th>
                  <th
                    style={{
                      padding: '8px 6px',
                      textAlign: 'left',
                      fontWeight: 600,
                      color: COLORS.brown,
                      fontSize: '10px',
                    }}
                  >
                    {PRINT_LABELS.ITEM_DESC}
                  </th>
                  <th
                    style={{
                      padding: '8px 6px',
                      textAlign: 'right',
                      fontWeight: 600,
                      color: COLORS.brown,
                      fontSize: '10px',
                    }}
                  >
                    {PRINT_LABELS.AMOUNT}
                  </th>
                  <th
                    style={{
                      padding: '8px 6px',
                      textAlign: 'right',
                      fontWeight: 600,
                      color: COLORS.brown,
                      fontSize: '10px',
                    }}
                  >
                    {PRINT_LABELS.SUBTOTAL}
                  </th>
                </tr>
              </thead>
              <tbody>
                {companyGroups.map((group, groupIdx) =>
                  group.items.map((item, itemIdx) => {
                    const isFirstInGroup = itemIdx === 0
                    const { payee: groupPayee, supplier: groupSupplier } = splitPayFor(group.payFor)
                    const subtotalRowSpan =
                      ((group as unknown as Record<string, unknown>).subtotalRowSpan as number) || 0
                    const showSubtotalCell = subtotalRowSpan > 0 && isFirstInGroup
                    return (
                      <tr key={`company-${groupIdx}-${itemIdx}`}>
                        {isFirstInGroup && (
                          <td
                            rowSpan={group.items.length}
                            style={{
                              padding: '6px',
                              verticalAlign: 'middle',
                              fontSize: '10px',
                              fontWeight: 600,
                              color: COLORS.brown,
                              borderTop: groupIdx > 0 ? `1px solid ${COLORS.gold}` : 'none',
                            }}
                          >
                            <div>{groupPayee}</div>
                            {groupSupplier && (
                              <div
                                style={{
                                  fontSize: '9px',
                                  fontWeight: 'normal',
                                  color: COLORS.gray,
                                  marginTop: '2px',
                                }}
                              >
                                {groupSupplier}
                              </div>
                            )}
                          </td>
                        )}
                        <td
                          style={{
                            padding: '6px',
                            verticalAlign: 'middle',
                            fontSize: '10px',
                            color: COLORS.gray,
                            borderTop:
                              isFirstInGroup && groupIdx > 0 ? `1px solid ${COLORS.gold}` : 'none',
                          }}
                        >
                          {item.requestCode}
                        </td>
                        <td
                          style={{
                            padding: '6px',
                            verticalAlign: 'middle',
                            fontSize: '10px',
                            color: COLORS.gray,
                            borderTop:
                              isFirstInGroup && groupIdx > 0 ? `1px solid ${COLORS.gold}` : 'none',
                          }}
                        >
                          {item.tourName}
                        </td>
                        <td
                          style={{
                            padding: '6px',
                            verticalAlign: 'middle',
                            fontSize: '10px',
                            color: COLORS.gray,
                            borderTop:
                              isFirstInGroup && groupIdx > 0 ? `1px solid ${COLORS.gold}` : 'none',
                          }}
                        >
                          {item.description}
                        </td>
                        <td
                          style={{
                            padding: '6px',
                            verticalAlign: 'middle',
                            fontSize: '10px',
                            textAlign: 'right',
                            color: COLORS.gray,
                            borderTop:
                              isFirstInGroup && groupIdx > 0 ? `1px solid ${COLORS.gold}` : 'none',
                          }}
                        >
                          {item.amount.toLocaleString()}
                        </td>
                        {showSubtotalCell && (
                          <td
                            rowSpan={subtotalRowSpan}
                            style={{
                              padding: '6px',
                              verticalAlign: 'middle',
                              fontSize: '10px',
                              textAlign: 'center',
                              fontWeight: 600,
                              color: COLORS.brown,
                              borderTop: groupIdx > 0 ? `1px solid ${COLORS.gold}` : 'none',
                            }}
                          >
                            {group.showTotal ? group.total.toLocaleString() : ''}
                          </td>
                        )}
                      </tr>
                    )
                  })
                )}
              </tbody>
            </table>
            {/* 公司小計 */}
            <div
              style={{
                display: 'flex',
                justifyContent: 'flex-end',
                alignItems: 'center',
                padding: '6px',
                marginBottom: '24px',
                borderTop: `1px solid ${COLORS.gold}`,
              }}
            >
              <span style={{ fontSize: '12px', color: COLORS.gray, marginRight: '16px' }}>
                {PRINT_LABELS.LABEL_5145}
              </span>
              <span style={{ fontSize: '13px', fontWeight: 600, color: COLORS.brown }}>
                NT$ {companyTotal.toLocaleString()}
              </span>
            </div>
          </>
        )}

        {/* 無資料時顯示 */}
        {tourGroups.length === 0 && companyGroups.length === 0 && (
          <div style={{ textAlign: 'center', padding: '40px', color: COLORS.lightGray }}>
            {PRINT_LABELS.LABEL_9162}
          </div>
        )}

        {/* 孤兒 pair 警告：pair_id 存在但對手 PR 缺失（被誤刪 / 狀態異常） */}
        {orphanPairIds.length > 0 && (
          <div
            style={{
              marginBottom: '12px',
              padding: '8px 12px',
              border: `1px solid ${COLORS.red}`,
              borderRadius: '4px',
              backgroundColor: '#FEF2F2',
              fontSize: '11px',
              color: COLORS.red,
            }}
          >
            ⚠ 偵測到 {orphanPairIds.length} 組異常的成本轉移配對（找不到對手方）、未列入下方明細。
            請確認 PR 是否被誤刪或狀態異常（pair_id：
            {orphanPairIds.map(id => id.slice(0, 8)).join('、')}）。
          </div>
        )}

        {/* 成本轉移區塊（對沖模式：每對顯示「原團 -X / 新團 +X」、小計自動 = 0） */}
        {transferPairs.length > 0 && (
          <div style={{ marginBottom: '12px' }}>
            <div
              style={{
                fontSize: '11px',
                fontWeight: 600,
                color: COLORS.brown,
                letterSpacing: '2px',
                marginBottom: '6px',
                paddingTop: '8px',
              }}
            >
              成本轉移 COST TRANSFER
            </div>
            <table
              style={{
                width: '100%',
                borderCollapse: 'collapse',
                fontSize: '11px',
              }}
            >
              <thead>
                <tr
                  style={{
                    backgroundColor: COLORS.lightBrown,
                    borderBottom: `1px solid ${COLORS.gold}`,
                  }}
                >
                  <th
                    style={{
                      textAlign: 'left',
                      padding: '6px 8px',
                      color: COLORS.gray,
                      fontWeight: 500,
                    }}
                  >
                    團
                  </th>
                  <th
                    style={{
                      textAlign: 'left',
                      padding: '6px 8px',
                      color: COLORS.gray,
                      fontWeight: 500,
                    }}
                  >
                    供應商
                  </th>
                  <th
                    style={{
                      textAlign: 'left',
                      padding: '6px 8px',
                      color: COLORS.gray,
                      fontWeight: 500,
                    }}
                  >
                    項目說明
                  </th>
                  <th
                    style={{
                      textAlign: 'right',
                      padding: '6px 8px',
                      color: COLORS.gray,
                      fontWeight: 500,
                    }}
                  >
                    金額
                  </th>
                </tr>
              </thead>
              <tbody>
                {transferPairs.map(pair => {
                  const primary = pair.items[0] || { description: '-', supplier: '-', subtotal: 0 }
                  return (
                    <React.Fragment key={pair.pairId}>
                      {/* 原團（出）— 負金額 */}
                      <tr style={{ borderBottom: `1px solid #e5e5e5` }}>
                        <td style={{ padding: '5px 8px', color: COLORS.gray }}>
                          {pair.fromTourCode}
                        </td>
                        <td style={{ padding: '5px 8px', color: COLORS.gray }}>
                          {primary.supplier}
                        </td>
                        <td style={{ padding: '5px 8px', color: COLORS.gray }}>
                          轉出：{primary.description}
                        </td>
                        <td style={{ padding: '5px 8px', textAlign: 'right', color: COLORS.red }}>
                          {(-pair.amount).toLocaleString()}
                        </td>
                      </tr>
                      {/* 新團（入）— 正金額 */}
                      <tr style={{ borderBottom: `1px solid #e5e5e5` }}>
                        <td style={{ padding: '5px 8px', color: COLORS.gray }}>
                          {pair.toTourCode}
                        </td>
                        <td style={{ padding: '5px 8px', color: COLORS.gray }}>
                          {primary.supplier}
                        </td>
                        <td style={{ padding: '5px 8px', color: COLORS.gray }}>
                          轉入：{primary.description}
                        </td>
                        <td style={{ padding: '5px 8px', textAlign: 'right', color: COLORS.gray }}>
                          {pair.amount.toLocaleString()}
                        </td>
                      </tr>
                    </React.Fragment>
                  )
                })}
              </tbody>
            </table>
            <div
              style={{
                display: 'flex',
                justifyContent: 'flex-end',
                alignItems: 'center',
                padding: '8px 8px',
                borderTop: `1px solid ${COLORS.gold}`,
                fontSize: '12px',
              }}
            >
              <span style={{ color: COLORS.lightGray, marginRight: '16px' }}>轉移小計</span>
              <span style={{ fontWeight: 600, color: COLORS.gray }}>NT$ 0</span>
            </div>
          </div>
        )}

        {/* 總計 - 獨立區塊 */}
        <div
          style={{
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            borderTop: `2px solid ${COLORS.brown}`,
            padding: '14px 8px',
            marginBottom: '28px',
          }}
        >
          <span
            style={{
              fontSize: '13px',
              fontWeight: 600,
              color: COLORS.brown,
            }}
          >
            {PRINT_LABELS.TOTAL_3184}
          </span>
          <span
            style={{
              fontSize: '15px',
              fontWeight: 700,
              color: COLORS.gold,
            }}
          >
            NT$ {totalAmount.toLocaleString()}
          </span>
        </div>

        {/* 頁尾 */}
        <div
          style={{
            marginTop: '40px',
            textAlign: 'center',
          }}
        >
          {subtitle && (
            <p
              style={{
                fontSize: '11px',
                fontStyle: 'italic',
                color: COLORS.lightGray,
                margin: '0 0 8px 0',
              }}
            >
              {subtitle}
            </p>
          )}
          <p
            style={{
              fontSize: '10px',
              color: COLORS.lightGray,
              margin: 0,
            }}
          >
            {companyFullName} © {new Date().getFullYear()}
          </p>
        </div>
      </div>
    )
  }
)

