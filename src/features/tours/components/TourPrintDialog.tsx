'use client'

/**
 * TourPrintDialog - 團體列印對話框
 * 整合所有列印功能：成員名單、航班確認單、住宿確認單
 */

import React, { useState, useEffect } from 'react'
import { Printer, X, Plane, Hotel, Users, Check, Loader2, FileSpreadsheet } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs'
import { useReferenceData } from '@/lib/pnr'
import {
  fetchTourPnrs,
  fetchPnrsByLocators,
} from '@/features/tours/services/tour_dependency.service'
import type { Tour } from '@/stores/types'
import type { OrderMember, ExportColumnsConfig } from '@/features/orders/types/order-member.types'
import type { PNR } from '@/types/pnr.types'
import { COLUMN_LABELS, DEFAULT_COLUMNS } from './tour-print-constants'
import { TOUR_PRINT_DIALOG_LABELS } from '../constants/labels'
import { logger } from '@/lib/utils/logger'
import {
  generateMembersPrintContent,
  generateFlightPrintContent,
  generateHotelPrintContent,
} from './print-templates'

// 備援機場/航空公司名稱
const AIRPORT_NAMES: Record<string, string> = {
  TPE: '台北桃園',
  TSA: '台北松山',
  KHH: '高雄',
  RMQ: '台中',
  HKG: '香港',
  MFM: '澳門',
  NRT: '東京成田',
  HND: '東京羽田',
  KIX: '大阪關西',
  NGO: '名古屋',
  FUK: '福岡',
  CTS: '札幌',
  OKA: '沖繩',
  ICN: '首爾仁川',
  GMP: '首爾金浦',
  PUS: '釜山',
  BKK: '曼谷',
  CNX: '清邁',
  HKT: '普吉島',
  SIN: '新加坡',
  KUL: '吉隆坡',
  PVG: '上海浦東',
  SHA: '上海虹橋',
  PEK: '北京首都',
  PKX: '北京大興',
  CAN: '廣州',
  SZX: '深圳',
  MNL: '馬尼拉',
  SGN: '胡志明市',
  HAN: '河內',
  LAX: '洛杉磯',
  SFO: '舊金山',
  JFK: '紐約乾迺迪',
  SEA: '西雅圖',
  LHR: '倫敦希斯洛',
  CDG: '巴黎戴高樂',
  FRA: '法蘭克福',
  AMS: '阿姆斯特丹',
  SYD: '雪梨',
  MEL: '墨爾本',
  AKL: '奧克蘭',
}

const AIRLINE_NAMES: Record<string, string> = {
  CI: '中華航空',
  BR: '長榮航空',
  JX: '星宇航空',
  IT: '台灣虎航',
  B7: '立榮航空',
  AE: '華信航空',
  CX: '國泰航空',
  KA: '國泰港龍',
  HX: '香港航空',
  UO: '香港快運',
  JL: '日本航空',
  NH: '全日空',
  MM: '樂桃航空',
  BC: '天馬航空',
  KE: '大韓航空',
  OZ: '韓亞航空',
  TW: '德威航空',
  LJ: '真航空',
  '7C': '濟州航空',
  SQ: '新加坡航空',
  TR: '酷航',
  MH: '馬來西亞航空',
  AK: '亞洲航空',
  TG: '泰國航空',
  FD: '泰亞航空',
  VZ: '泰越捷',
  VN: '越南航空',
  PR: '菲律賓航空',
  CA: '中國國航',
  MU: '東方航空',
  CZ: '南方航空',
  HU: '海南航空',
  UA: '聯合航空',
  AA: '美國航空',
  DL: '達美航空',
  BA: '英國航空',
  AF: '法國航空',
  LH: '漢莎航空',
  KL: '荷蘭皇家',
  EK: '阿聯酋航空',
  QR: '卡達航空',
  EY: '阿提哈德',
  QF: '澳洲航空',
  NZ: '紐西蘭航空',
}

interface TourPrintDialogProps {
  isOpen: boolean
  tour: Tour
  members: OrderMember[]
  onClose: () => void
}

export function TourPrintDialog({ isOpen, tour, members, onClose }: TourPrintDialogProps) {
  const [activeTab, setActiveTab] = useState<'members' | 'flight' | 'hotel'>('members')
  const [columns, setColumns] = useState<ExportColumnsConfig>(DEFAULT_COLUMNS)
  // 只預選有資料的成員（有名字或護照資料的）
  const [selectedMembers, setSelectedMembers] = useState<Set<string>>(
    new Set(
      members.filter(m => m.chinese_name || m.passport_name || m.passport_number).map(m => m.id)
    )
  )
  const [pnrData, setPnrData] = useState<PNR[]>([])
  const [loadingPnr, setLoadingPnr] = useState(false)

  const { getAirportName: getAirportNameFromDb, getAirlineName: getAirlineNameFromDb } =
    useReferenceData({ enabled: false })

  const getAirportName = (code: string) => {
    const dbName = getAirportNameFromDb(code)
    if (dbName && dbName !== code) return dbName
    return AIRPORT_NAMES[code] || code
  }

  const getAirlineName = (code: string) => {
    const dbName = getAirlineNameFromDb(code)
    if (dbName && dbName !== code) return dbName
    return AIRLINE_NAMES[code] || code
  }

  // 載入 PNR 資料
  useEffect(() => {
    if (isOpen && tour.id) {
      setLoadingPnr(true)
      const memberPnrCodes = members.map(m => m.pnr).filter((pnr): pnr is string => !!pnr)

      const fetchPnrs = async () => {
        const results: PNR[] = []
        const tourPnrs = await fetchTourPnrs(tour.id)
        if (tourPnrs.length > 0) results.push(...(tourPnrs as unknown as PNR[]))

        if (memberPnrCodes.length > 0) {
          const existingLocators = new Set(results.map(p => p.record_locator))
          const missingCodes = memberPnrCodes.filter(c => !existingLocators.has(c))
          if (missingCodes.length > 0) {
            const memberPnrs = await fetchPnrsByLocators(missingCodes)
            if (memberPnrs.length > 0) results.push(...(memberPnrs as unknown as PNR[]))
          }
        }

        setPnrData(results)
        setLoadingPnr(false)
      }
      fetchPnrs().catch(err => logger.error('[fetchPnrs]', err))
    }
  }, [isOpen, tour.id, members])

  // 欄位 & 成員選擇
  const toggleColumn = (key: keyof ExportColumnsConfig) =>
    setColumns({ ...columns, [key]: !columns[key] })
  const toggleAllColumns = () => {
    const allSelected = Object.values(columns).every(v => v)
    setColumns(
      Object.keys(columns).reduce(
        (acc, key) => ({ ...acc, [key]: !allSelected }),
        {} as ExportColumnsConfig
      )
    )
  }
  const toggleMember = (memberId: string) => {
    const newSelected = new Set(selectedMembers)
    if (newSelected.has(memberId)) newSelected.delete(memberId)
    else newSelected.add(memberId)
    setSelectedMembers(newSelected)
  }
  const toggleAllMembers = () => {
    setSelectedMembers(
      selectedMembers.size === members.length ? new Set() : new Set(members.map(m => m.id))
    )
  }

  // 開啟列印視窗
  const openPrintWindow = (content: string) => {
    const printWindow = window.open('', '_blank')
    if (printWindow) {
      printWindow.document.write(content)
      printWindow.document.close()
      printWindow.focus()
      setTimeout(() => printWindow.print(), 250)
    }
    onClose()
  }

  // 列印成員名單
  const handlePrintMembers = () => {
    const printMembers = members.filter(m => selectedMembers.has(m.id))
    openPrintWindow(generateMembersPrintContent({ tour, members: printMembers, columns }))
  }

  // 列印航班確認單
  const handlePrintFlightConfirmation = () => {
    const printMembers = members.filter(m => selectedMembers.has(m.id))
    openPrintWindow(
      generateFlightPrintContent({
        tour,
        members: printMembers,
        pnrData,
        getAirportName,
        getAirlineName,
      })
    )
  }

  // 列印住宿確認單
  const handlePrintHotelConfirmation = () => {
    const printMembers = members.filter(m => selectedMembers.has(m.id))
    openPrintWindow(generateHotelPrintContent({ tour, members: printMembers }))
  }

  // 匯出 Excel
  const handleExportExcel = async () => {
    const selectedColumns = Object.entries(columns)
      .filter(([, selected]) => selected)
      .map(([key]) => key as keyof ExportColumnsConfig)

    if (selectedColumns.length === 0) return

    const XLSX = await import('xlsx')
    const data = members.map((member, idx) => {
      const row: Record<string, string | number> = { 序: idx + 1 }
      selectedColumns.forEach(col => {
        const label = COLUMN_LABELS[col]
        switch (col) {
          case 'gender':
            row[label] = member.gender === 'M' ? '男' : member.gender === 'F' ? '女' : ''
            break
          case 'balance':
            row[label] = (member.total_payable || 0) - (member.deposit_amount || 0)
            break
          case 'total_payable':
          case 'deposit_amount':
            row[label] = member[col] || 0
            break
          default:
            row[label] = (member[col as keyof OrderMember] as string) || ''
        }
      })
      return row
    })

    const worksheet = XLSX.utils.json_to_sheet(data)
    const workbook = XLSX.utils.book_new()
    XLSX.utils.book_append_sheet(workbook, worksheet, '團員名單')

    const colWidths = [{ wch: 5 }]
    selectedColumns.forEach(col => {
      if (['chinese_name', 'passport_name'].includes(col)) colWidths.push({ wch: 20 })
      else if (['remarks', 'special_meal'].includes(col)) colWidths.push({ wch: 25 })
      else if (['total_payable', 'deposit_amount', 'balance'].includes(col))
        colWidths.push({ wch: 12 })
      else colWidths.push({ wch: 15 })
    })
    worksheet['!cols'] = colWidths

    const today = new Date().toISOString().split('T')[0].replace(/-/g, '')
    XLSX.writeFile(workbook, `${tour.code}_團員名單_${today}.xlsx`)
  }

  const selectedCount = selectedMembers.size

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent level={2} className="max-w-lg">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Printer size={18} />
            {TOUR_PRINT_DIALOG_LABELS.列印} - {tour.code}
          </DialogTitle>
        </DialogHeader>

        <Tabs value={activeTab} onValueChange={v => setActiveTab(v as typeof activeTab)}>
          <TabsList className="grid w-full grid-cols-3">
            <TabsTrigger value="members" className="gap-1">
              <Users size={14} />
              {TOUR_PRINT_DIALOG_LABELS.成員名單}
            </TabsTrigger>
            <TabsTrigger value="flight" className="gap-1">
              <Plane size={14} />
              {TOUR_PRINT_DIALOG_LABELS.航班確認}
            </TabsTrigger>
            <TabsTrigger value="hotel" className="gap-1">
              <Hotel size={14} />
              {TOUR_PRINT_DIALOG_LABELS.住宿確認}
            </TabsTrigger>
          </TabsList>

          {/* 成員名單 Tab */}
          <TabsContent value="members" className="space-y-4">
            <div className="flex items-center justify-between">
              <span className="text-sm text-morandi-secondary">
                {TOUR_PRINT_DIALOG_LABELS.選擇要匯出的欄位}
              </span>
              <Button variant="ghost" size="sm" onClick={toggleAllColumns}>
                {Object.values(columns).every(v => v)
                  ? TOUR_PRINT_DIALOG_LABELS.取消全選
                  : TOUR_PRINT_DIALOG_LABELS.全選}
              </Button>
            </div>
            <div className="grid grid-cols-2 gap-2 max-h-[300px] overflow-y-auto">
              {(Object.keys(columns) as (keyof ExportColumnsConfig)[]).map(key => (
                <label
                  key={key}
                  className="flex items-center gap-2 p-2 rounded hover:bg-morandi-bg cursor-pointer"
                >
                  <input
                    type="checkbox"
                    checked={columns[key]}
                    onChange={() => toggleColumn(key)}
                    className="rounded border-border"
                  />
                  <span className="text-sm">{COLUMN_LABELS[key]}</span>
                </label>
              ))}
            </div>
            <div className="flex justify-end gap-2 pt-4 border-t border-border">
              <Button variant="outline" onClick={onClose}>
                <X size={16} className="mr-1" />
                {TOUR_PRINT_DIALOG_LABELS.取消}
              </Button>
              <Button variant="outline" onClick={handleExportExcel}>
                <FileSpreadsheet size={16} className="mr-1" />
                {TOUR_PRINT_DIALOG_LABELS.Excel}
              </Button>
              <Button
                onClick={handlePrintMembers}
                className="bg-morandi-gold hover:bg-morandi-gold-hover text-white"
              >
                <Printer size={16} className="mr-1" />
                {TOUR_PRINT_DIALOG_LABELS.列印}
              </Button>
            </div>
          </TabsContent>

          {/* 航班確認單 Tab */}
          <TabsContent value="flight" className="space-y-4">
            <div className="text-sm text-morandi-secondary mb-2">
              {TOUR_PRINT_DIALOG_LABELS.選擇要列印航班確認單的成員_每人一頁}
              {loadingPnr && (
                <span className="ml-2 inline-flex items-center gap-1">
                  <Loader2 size={12} className="animate-spin" />
                  {TOUR_PRINT_DIALOG_LABELS.載入航班資料中}
                </span>
              )}
              {!loadingPnr && pnrData.length > 0 && (
                <span className="ml-2 text-morandi-green">
                  {TOUR_PRINT_DIALOG_LABELS.已載入_筆_PNR_資料(pnrData.length)}
                </span>
              )}
            </div>
            <MemberSelectionList
              members={members}
              selectedMembers={selectedMembers}
              toggleMember={toggleMember}
              toggleAllMembers={toggleAllMembers}
              renderDetail={member => (
                <div className="text-xs text-morandi-secondary flex gap-2">
                  <span>PNR: {member.pnr || '-'}</span>
                  <span>
                    {TOUR_PRINT_DIALOG_LABELS.票號_冒號} {member.ticket_number || '-'}
                  </span>
                </div>
              )}
              renderBadge={member =>
                member.ticket_number ? <Check size={14} className="text-morandi-green" /> : null
              }
            />
            <div className="flex justify-end gap-2 pt-4 border-t border-border">
              <Button variant="outline" onClick={onClose}>
                <X size={16} className="mr-1" />
                {TOUR_PRINT_DIALOG_LABELS.取消}
              </Button>
              <Button
                onClick={handlePrintFlightConfirmation}
                disabled={selectedCount === 0}
                className="bg-morandi-gold hover:bg-morandi-gold-hover text-white"
              >
                <Printer size={16} className="mr-1" />
                列印 ({selectedCount} 人)
              </Button>
            </div>
          </TabsContent>

          {/* 住宿確認單 Tab */}
          <TabsContent value="hotel" className="space-y-4">
            <div className="text-sm text-morandi-secondary mb-2">
              {TOUR_PRINT_DIALOG_LABELS.選擇要列印住宿確認單的成員_每人一頁}
            </div>
            <MemberSelectionList
              members={members}
              selectedMembers={selectedMembers}
              toggleMember={toggleMember}
              toggleAllMembers={toggleAllMembers}
              renderDetail={member => (
                <div className="text-xs text-morandi-secondary">
                  {member.hotel_1_name || '未設定住宿'}
                  {member.hotel_2_name && ` / ${member.hotel_2_name}`}
                </div>
              )}
              renderBadge={member =>
                member.hotel_1_name ? <Check size={14} className="text-morandi-green" /> : null
              }
            />
            <div className="flex justify-end gap-2 pt-4 border-t border-border">
              <Button variant="outline" onClick={onClose}>
                <X size={16} className="mr-1" />
                {TOUR_PRINT_DIALOG_LABELS.取消}
              </Button>
              <Button
                onClick={handlePrintHotelConfirmation}
                disabled={selectedCount === 0}
                className="bg-morandi-gold hover:bg-morandi-gold-hover text-white"
              >
                <Printer size={16} className="mr-1" />
                列印 ({selectedCount} 人)
              </Button>
            </div>
          </TabsContent>
        </Tabs>
      </DialogContent>
    </Dialog>
  )
}

/**
 * 成員選擇列表（航班/住宿共用）
 */
function MemberSelectionList({
  members,
  selectedMembers,
  toggleMember,
  toggleAllMembers,
  renderDetail,
  renderBadge,
}: {
  members: OrderMember[]
  selectedMembers: Set<string>
  toggleMember: (id: string) => void
  toggleAllMembers: () => void
  renderDetail: (member: OrderMember) => React.ReactNode
  renderBadge: (member: OrderMember) => React.ReactNode
}) {
  return (
    <>
      <div className="flex items-center justify-between mb-2">
        <span className="text-sm">
          {selectedMembers.size} / {members.length} 人已選
        </span>
        <Button variant="ghost" size="sm" onClick={toggleAllMembers}>
          {selectedMembers.size === members.length
            ? TOUR_PRINT_DIALOG_LABELS.取消全選
            : TOUR_PRINT_DIALOG_LABELS.全選}
        </Button>
      </div>
      <div className="max-h-[250px] overflow-y-auto border border-border rounded-lg">
        {members.map(member => (
          <label
            key={member.id}
            className="flex items-center gap-3 p-3 hover:bg-morandi-bg cursor-pointer border-b border-border/50 last:border-b-0"
          >
            <input
              type="checkbox"
              checked={selectedMembers.has(member.id)}
              onChange={() => toggleMember(member.id)}
              className="rounded border-border"
            />
            <div className="flex-1 min-w-0">
              <div className="font-medium truncate">
                {member.chinese_name || member.passport_name}
              </div>
              {renderDetail(member)}
            </div>
            {renderBadge(member)}
          </label>
        ))}
      </div>
    </>
  )
}
