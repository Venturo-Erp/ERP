'use client'

import { COMPANY_NAME, COMPANY_NAME_EN } from '@/lib/tenant'

import React from 'react'
import { Plus } from 'lucide-react'
import { Combobox, ComboboxOption } from '@/components/ui/combobox'
import { DatePicker } from '@/components/ui/date-picker'
import { TravelInvoiceItem, BuyerInfo } from '@/stores/travel-invoice-store'
import type { Order } from '@/types/order.types'
import type { Tour } from '@/types/tour.types'
import { INVOICE_LABELS } from './constants/labels'

interface InvoiceFormProps {
  fixedOrder?: Order
  fixedTour?: Tour
  selectedTourId: string
  selectedOrderId: string
  invoiceDate: string
  reportStatus: 'unreported' | 'reported'
  customNo: string
  buyerInfo: BuyerInfo
  items: TravelInvoiceItem[]
  remark: string
  tourOptions: ComboboxOption[]
  orderOptions: ComboboxOption[]
  ordersLoading: boolean
  toursLoading: boolean
  setSelectedTourId: (value: string) => void
  setSelectedOrderId: (value: string) => void
  setInvoiceDate: (value: string) => void
  setReportStatus: (value: 'unreported' | 'reported') => void
  setCustomNo: (value: string) => void
  setBuyerInfo: (value: BuyerInfo) => void
  setRemark: (value: string) => void
  addItem: () => void
  removeItem: (index: number) => void
  updateItem: (index: number, field: keyof TravelInvoiceItem, value: unknown) => void
}

export function InvoiceForm({
  fixedOrder,
  fixedTour,
  selectedTourId,
  selectedOrderId,
  invoiceDate,
  reportStatus,
  buyerInfo,
  items,
  remark,
  tourOptions,
  orderOptions,
  ordersLoading,
  toursLoading,
  setSelectedTourId,
  setSelectedOrderId,
  setInvoiceDate,
  setReportStatus,
  setBuyerInfo,
  setRemark,
  addItem,
  removeItem,
  updateItem,
}: InvoiceFormProps) {
  // 自動判斷 B2B/B2C：有統編就是 B2B
  const isB2B = Boolean(buyerInfo.buyerUBN && buyerInfo.buyerUBN.length > 0)

  return (
    <div className="space-y-4">
      {/* 基本資訊表格 */}
      <table className="w-full border-collapse border border-border">
        <tbody>
          {/* 團別 + 訂單（如果需要選擇） */}
          {(!fixedTour || !fixedOrder) && (
            <tr>
              {!fixedTour && (
                <>
                  <td className="w-24 py-2 px-3 border border-border bg-muted/30 text-sm font-medium text-morandi-primary">
                    {INVOICE_LABELS.LABEL_2201}
                  </td>
                  <td className="py-1 px-2 border border-border">
                    <Combobox
                      value={selectedTourId}
                      onChange={value => {
                        setSelectedTourId(value)
                        setSelectedOrderId('')
                      }}
                      options={tourOptions}
                      placeholder={
                        toursLoading ? INVOICE_LABELS.LOADING : INVOICE_LABELS.SEARCH_TOUR
                      }
                      emptyMessage={
                        toursLoading ? INVOICE_LABELS.LOADING : INVOICE_LABELS.TOUR_NOT_FOUND
                      }
                      showSearchIcon={true}
                      showClearButton={true}
                      disabled={toursLoading}
                      className="input-no-focus [&_button]:border-0 [&_button]:shadow-none [&_button]:bg-transparent"
                    />
                  </td>
                </>
              )}
              {!fixedOrder && (
                <>
                  <td className="w-24 py-2 px-3 border border-border bg-muted/30 text-sm font-medium text-morandi-primary">
                    {INVOICE_LABELS.LABEL_5934}
                  </td>
                  <td className="py-1 px-2 border border-border">
                    <Combobox
                      value={selectedOrderId}
                      onChange={setSelectedOrderId}
                      options={orderOptions}
                      placeholder={
                        ordersLoading
                          ? INVOICE_LABELS.LOADING
                          : selectedTourId || fixedTour
                            ? INVOICE_LABELS.SEARCH_ORDER
                            : INVOICE_LABELS.SELECT_TOUR_FIRST
                      }
                      emptyMessage={
                        ordersLoading ? INVOICE_LABELS.LOADING : INVOICE_LABELS.ORDER_NOT_FOUND
                      }
                      showSearchIcon={true}
                      showClearButton={true}
                      disabled={(!selectedTourId && !fixedTour) || ordersLoading}
                      className="input-no-focus [&_button]:border-0 [&_button]:shadow-none [&_button]:bg-transparent"
                    />
                  </td>
                </>
              )}
            </tr>
          )}

          {/* 開立日期 + 買受人 */}
          <tr>
            <td className="w-24 py-2 px-3 border border-border bg-muted/30 text-sm font-medium text-morandi-primary">
              {INVOICE_LABELS.LABEL_4782}
            </td>
            <td className="py-1 px-2 border border-border">
              <DatePicker
                value={invoiceDate}
                onChange={date => setInvoiceDate(date)}
                placeholder={INVOICE_LABELS.SELECT_5234}
                className="input-no-focus [&_button]:border-0 [&_button]:shadow-none [&_button]:bg-transparent"
              />
            </td>
            <td className="w-24 py-2 px-3 border border-border bg-muted/30 text-sm font-medium text-morandi-primary">
              {isB2B ? INVOICE_LABELS.COMPANY_NAME_REQUIRED : INVOICE_LABELS.BUYER_REQUIRED}
            </td>
            <td className="py-1 px-2 border border-border">
              <input
                type="text"
                value={buyerInfo.buyerName}
                onChange={e => setBuyerInfo({ ...buyerInfo, buyerName: e.target.value })}
                placeholder={
                  isB2B
                    ? INVOICE_LABELS.COMPANY_NAME_PLACEHOLDER
                    : INVOICE_LABELS.BUYER_NAME_PLACEHOLDER
                }
                className="input-no-focus w-full h-9 px-2 bg-transparent text-sm"
              />
            </td>
          </tr>

          {/* 統編 + Email */}
          <tr>
            <td className="py-2 px-3 border border-border bg-muted/30 text-sm font-medium text-morandi-primary">
              {INVOICE_LABELS.LABEL_8296}
              <span className="text-xs text-morandi-secondary ml-1">
                {isB2B ? '(B2B)' : '(B2C)'}
              </span>
            </td>
            <td className="py-1 px-2 border border-border">
              <input
                type="text"
                value={buyerInfo.buyerUBN || ''}
                onChange={e => setBuyerInfo({ ...buyerInfo, buyerUBN: e.target.value })}
                placeholder={INVOICE_LABELS.LABEL_6444}
                maxLength={8}
                className="input-no-focus w-full h-9 px-2 bg-transparent text-sm"
              />
            </td>
            <td className="py-2 px-3 border border-border bg-muted/30 text-sm font-medium text-morandi-primary">
              Email
            </td>
            <td className="py-1 px-2 border border-border">
              <input
                type="email"
                value={buyerInfo.buyerEmail || ''}
                onChange={e => setBuyerInfo({ ...buyerInfo, buyerEmail: e.target.value })}
                placeholder={INVOICE_LABELS.LABEL_7311}
                className="input-no-focus w-full h-9 px-2 bg-transparent text-sm"
              />
            </td>
          </tr>

          {/* 手機 + 申報狀態 */}
          <tr>
            <td className="py-2 px-3 border border-border bg-muted/30 text-sm font-medium text-morandi-primary">
              {INVOICE_LABELS.LABEL_7287}
            </td>
            <td className="py-1 px-2 border border-border">
              <input
                type="text"
                value={buyerInfo.buyerMobile || ''}
                onChange={e => setBuyerInfo({ ...buyerInfo, buyerMobile: e.target.value })}
                placeholder="09xxxxxxxx"
                className="input-no-focus w-full h-9 px-2 bg-transparent text-sm"
              />
            </td>
            <td className="py-2 px-3 border border-border bg-muted/30 text-sm font-medium text-morandi-primary">
              {INVOICE_LABELS.LABEL_2931}
            </td>
            <td className="py-1 px-2 border border-border">
              <div className="flex items-center gap-4 h-9">
                <label className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="radio"
                    name="reportStatus"
                    checked={reportStatus === 'unreported'}
                    onChange={() => setReportStatus('unreported')}
                    className="w-4 h-4 accent-morandi-gold"
                  />
                  <span className="text-sm">{INVOICE_LABELS.LABEL_5921}</span>
                </label>
                <label className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="radio"
                    name="reportStatus"
                    checked={reportStatus === 'reported'}
                    onChange={() => setReportStatus('reported')}
                    className="w-4 h-4 accent-morandi-gold"
                  />
                  <span className="text-sm">{INVOICE_LABELS.LABEL_7889}</span>
                </label>
              </div>
            </td>
          </tr>
        </tbody>
      </table>

      {/* 商品明細表格 */}
      <table className="w-full border-collapse border border-border">
        <thead>
          <tr className="text-sm text-morandi-primary font-medium bg-muted/30">
            <th className="text-left py-2 px-3 border border-border">
              {INVOICE_LABELS.LABEL_9447}
            </th>
            <th className="text-center py-2 px-3 border border-border w-20">
              {INVOICE_LABELS.QUANTITY}
            </th>
            <th className="text-center py-2 px-3 border border-border w-24">
              {INVOICE_LABELS.LABEL_9413}
            </th>
            <th className="text-center py-2 px-3 border border-border w-16">
              {INVOICE_LABELS.LABEL_9062}
            </th>
            <th className="text-right py-2 px-3 border border-border w-24">
              {INVOICE_LABELS.AMOUNT}
            </th>
            <th className="border border-border w-10"></th>
          </tr>
        </thead>
        <tbody>
          {items.map((item, index) => (
            <tr key={index} className="bg-card">
              <td className="py-1 px-1 border border-border">
                <input
                  type="text"
                  value={item.item_name}
                  onChange={e => updateItem(index, 'item_name', e.target.value)}
                  placeholder={INVOICE_LABELS.LABEL_6937}
                  className="input-no-focus w-full h-8 px-2 bg-transparent text-sm"
                />
              </td>
              <td className="py-1 px-1 border border-border">
                <input
                  type="number"
                  min="1"
                  value={item.item_count}
                  onChange={e => updateItem(index, 'item_count', parseInt(e.target.value) || 1)}
                  className="input-no-focus w-full h-8 px-2 bg-transparent text-sm text-center"
                />
              </td>
              <td className="py-1 px-1 border border-border">
                <input
                  type="number"
                  min="0"
                  value={item.item_price || ''}
                  onChange={e => updateItem(index, 'item_price', parseFloat(e.target.value) || 0)}
                  placeholder="0"
                  className="input-no-focus w-full h-8 px-2 bg-transparent text-sm text-center"
                />
              </td>
              <td className="py-1 px-1 border border-border">
                <input
                  type="text"
                  value={item.item_unit}
                  onChange={e => updateItem(index, 'item_unit', e.target.value)}
                  className="input-no-focus w-full h-8 px-2 bg-transparent text-sm text-center"
                />
              </td>
              <td className="py-1 px-2 border border-border text-right text-sm font-medium bg-muted/20">
                {item.itemAmt.toLocaleString()}
              </td>
              <td className="py-1 px-2 border border-border text-center">
                <span
                  onClick={() => items.length > 1 && removeItem(index)}
                  className={`cursor-pointer text-sm ${items.length > 1 ? 'text-morandi-secondary hover:text-morandi-red' : 'text-morandi-muted cursor-not-allowed'}`}
                >
                  ✕
                </span>
              </td>
            </tr>
          ))}
          {/* 新增行 */}
          <tr className="bg-card hover:bg-muted/10">
            <td
              colSpan={6}
              className="py-2 px-3 border border-border text-center cursor-pointer"
              onClick={addItem}
            >
              <span className="flex items-center justify-center gap-1 text-morandi-gold hover:text-morandi-gold-hover text-sm">
                <Plus size={16} />
                {INVOICE_LABELS.ADD_8750}
              </span>
            </td>
          </tr>
        </tbody>
      </table>

      {/* 備註 */}
      <table className="w-full border-collapse border border-border">
        <tbody>
          <tr>
            <td className="w-24 py-2 px-3 border border-border bg-muted/30 text-sm font-medium text-morandi-primary">
              {INVOICE_LABELS.REMARKS}
            </td>
            <td className="py-1 px-2 border border-border">
              <div className="flex items-center gap-2">
                <input
                  type="text"
                  value={remark}
                  onChange={e => setRemark(e.target.value.slice(0, 50))}
                  placeholder={INVOICE_LABELS.LABEL_3060}
                  maxLength={50}
                  className="input-no-focus flex-1 h-9 px-2 bg-transparent text-sm"
                />
                <span className="text-xs text-morandi-secondary shrink-0">{remark.length}/50</span>
              </div>
            </td>
          </tr>
        </tbody>
      </table>
    </div>
  )
}
