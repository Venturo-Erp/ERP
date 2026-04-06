'use client'

import React, { useState, useRef, useEffect, useCallback, useMemo } from 'react'
import { FileSignature, Check, Loader2, ChevronDown, Printer } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { SignaturePad } from '@/components/ui/signature-pad'
import { printHtml, MORANDI_COLORS } from '@/lib/print'
import { getPreviewDailyData } from '@/features/tours/components/itinerary-editor/format-itinerary'
import DOMPurify from 'dompurify'

interface ContractMember {
  id: string
  chinese_name: string | null
  id_number: string | null
  birth_date: string | null
}

// itinerary 型別不需要，直接用 unknown 接 server 傳來的 JSON

interface Contract {
  id: string
  code: string
  template: string
  signer_type: string
  signer_name: string
  company_name?: string
  member_ids: string[]
  contract_data: Record<string, unknown>
  status: string
  signer_phone?: string | null
  signer_address?: string | null
  signer_id_number?: string | null
  signature_image?: string | null
  signed_at?: string | null
  // 附件選項
  include_member_list?: boolean
  include_itinerary?: boolean
  tours: {
    id: string
    code: string
    name: string
    location: string
    departure_date: string
    return_date: string
  }
  workspaces: {
    id: string
    name: string
    seal_image_url: string
  }
  members: ContractMember[]
  itineraryData: {
    daily_itinerary: unknown
    departure_date: string | null
    outbound_flight: unknown
    return_flight: unknown
  } | null
  itineraryDepartureDate: string | null
}

interface ContractSignPageProps {
  contract: Contract
}

const TEMPLATE_FILES: Record<string, string> = {
  domestic: 'domestic.html',
  international: 'international.html',
  individual_international: 'individual_international_full.html',
}

const TEMPLATE_LABELS: Record<string, string> = {
  domestic: '國內旅遊定型化契約',
  international: '國外旅遊定型化契約',
  individual_international: '國外個別旅遊定型化契約',
}

export function ContractSignPage({ contract }: ContractSignPageProps) {
  const isSigned = contract.status === 'signed'
  const [step, setStep] = useState<'preview' | 'fill-info' | 'sign' | 'success'>('preview')

  // 簽約人補填資訊
  const [signerPhone, setSignerPhone] = useState(contract.signer_phone || '')
  const [signerAddress, setSignerAddress] = useState(contract.signer_address || '')
  const [signerIdNumber, setSignerIdNumber] = useState(contract.signer_id_number || '')
  const [contractHtml, setContractHtml] = useState<string>('')
  const [loading, setLoading] = useState(true)
  const [canSign, setCanSign] = useState(isSigned)
  const [signing, setSigning] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [signatureWidth, setSignatureWidth] = useState(350)
  const [readingProgress, setReadingProgress] = useState(isSigned ? 100 : 0)
  const [signaturePreview, setSignaturePreview] = useState<string | null>(null)

  const scrollContainerRef = useRef<HTMLDivElement>(null)

  // 行程預覽資料（跟報價單用同一個 formatter）
  const dailyData = useMemo(() => {
    const itin = contract.itineraryData
    if (!itin?.daily_itinerary) return []
    const daily = itin.daily_itinerary as Array<{
      day: number
      route?: string
      title?: string
      meals?: { breakfast?: string; lunch?: string; dinner?: string }
      accommodation?: string
      sameAsPrevious?: boolean
      hotelBreakfast?: boolean
      lunchSelf?: boolean
      dinnerSelf?: boolean
      note?: string
      description?: string
    }>
    const schedule = daily.map((d, i) => ({
      day: d.day || i + 1,
      route: d.route || d.title || '',
      meals: {
        breakfast: d.meals?.breakfast || '',
        lunch: d.meals?.lunch || '',
        dinner: d.meals?.dinner || '',
      },
      accommodation: d.accommodation || '',
      sameAsPrevious: d.sameAsPrevious || false,
      hotelBreakfast: d.hotelBreakfast || false,
      lunchSelf: d.lunchSelf || false,
      dinnerSelf: d.dinnerSelf || false,
      note: d.note || d.description || undefined,
    }))
    return getPreviewDailyData(
      schedule,
      contract.itineraryDepartureDate || itin.departure_date || null
    )
  }, [contract.itineraryData, contract.itineraryDepartureDate])

  // 計算響應式簽名板寬度
  useEffect(() => {
    const updateWidth = () => {
      const width = Math.min(350, window.innerWidth - 96) // 左右各留 48px
      setSignatureWidth(width)
    }

    updateWidth()
    window.addEventListener('resize', updateWidth)
    return () => window.removeEventListener('resize', updateWidth)
  }, [])

  // 載入合約範本
  useEffect(() => {
    const loadContract = async () => {
      try {
        setLoading(true)

        const templateFile = TEMPLATE_FILES[contract.template] || 'international.html'
        const response = await fetch(`/contract-templates/${templateFile}`)

        if (!response.ok) {
          throw new Error('無法載入合約範本')
        }

        let template = await response.text()

        // 替換變數
        const data = contract.contract_data || {}
        Object.entries(data).forEach(([key, value]) => {
          const regex = new RegExp(`{{${key}}}`, 'g')
          const safeValue = String(value || '')
            .replace(/&/g, '&amp;')
            .replace(/</g, '&lt;')
            .replace(/>/g, '&gt;')
            .replace(/"/g, '&quot;')
            .replace(/'/g, '&#039;')
          template = template.replace(regex, safeValue)
        })

        // 在「訂約人」區塊的「甲方：」後面插入簽約人名字
        const signerBaseName =
          contract.signer_type === 'company'
            ? contract.company_name || contract.signer_name
            : contract.signer_name
        const signerDisplay =
          contract.member_ids?.length > 1
            ? `${signerBaseName} 等 ${contract.member_ids.length} 人`
            : signerBaseName
        if (signerDisplay) {
          // 在最後一個「甲方：」後面插入名字 + 簽名佔位符
          const lastIndex = template.lastIndexOf('甲方：')
          if (lastIndex !== -1) {
            const afterParty = template.indexOf('</span>', lastIndex)
            if (afterParty !== -1) {
              const insertPos = afterParty + '</span>'.length
              template =
                template.slice(0, insertPos) +
                `<span style="font-size:8pt;font-family:'PingFang TC Light',sans-serif;color:black">${signerDisplay}</span>` +
                `<span id="contract-signature-placeholder"></span>` +
                template.slice(insertPos)
            }
          }
        }

        // 在甲方的「住（居）所地址：」「身分證字號（統一編號）：」「電話或傳真：」後面插入 placeholder
        const fieldMap = [
          { label: '住（居）所地址：', placeholder: '<!--SIGNER_ADDRESS-->' },
          { label: '身分證字號（統一編號）：', placeholder: '<!--SIGNER_ID-->' },
          { label: '電話或傳真：', placeholder: '<!--SIGNER_PHONE-->' },
        ]
        // 只替換訂約人區塊中的（從最後一個「甲方：」開始到「乙方：」之間）
        const partyStart = template.lastIndexOf('甲方：')
        const partyEnd = template.indexOf('乙方：', partyStart)
        if (partyStart !== -1 && partyEnd !== -1) {
          let partySection = template.slice(partyStart, partyEnd)
          for (const { label, placeholder } of fieldMap) {
            const labelIdx = partySection.indexOf(label)
            if (labelIdx !== -1) {
              const afterLabel = partySection.indexOf('</span>', labelIdx + label.length)
              if (afterLabel !== -1) {
                const pos = afterLabel + '</span>'.length
                partySection = partySection.slice(0, pos) + placeholder + partySection.slice(pos)
              }
            }
          }
          template = template.slice(0, partyStart) + partySection + template.slice(partyEnd)
        }

        // 加入列印樣式（A4 排版 + 跨頁設定）
        const printStyles = `
          <style>
            @media print {
              @page {
                size: A4;
                margin: 15mm 10mm;
              }
              body {
                font-size: 12pt !important;
                line-height: 1.5 !important;
              }
              table {
                page-break-inside: auto;
              }
              tr {
                page-break-inside: avoid;
                page-break-after: auto;
              }
              thead {
                display: table-header-group;
              }
              tfoot {
                display: table-footer-group;
              }
              h1, h2, h3, h4, h5, h6 {
                page-break-after: avoid;
              }
              p {
                orphans: 3;
                widows: 3;
              }
              .page-break {
                page-break-before: always;
              }
              .no-print {
                display: none !important;
              }
            }
          </style>
        `
        template = printStyles + template

        // 清理 HTML
        const sanitizedHtml = DOMPurify.sanitize(template, {
          ALLOWED_TAGS: [
            'html',
            'head',
            'body',
            'style',
            'title',
            'div',
            'span',
            'p',
            'br',
            'hr',
            'h1',
            'h2',
            'h3',
            'h4',
            'h5',
            'h6',
            'table',
            'thead',
            'tbody',
            'tr',
            'th',
            'td',
            'ul',
            'ol',
            'li',
            'strong',
            'em',
            'b',
            'i',
            'u',
            'a',
            'img',
            'header',
            'footer',
            'section',
            'article',
          ],
          ALLOWED_ATTR: [
            'class',
            'id',
            'style',
            'src',
            'alt',
            'href',
            'target',
            'colspan',
            'rowspan',
            'width',
            'height',
          ],
        })

        setContractHtml(sanitizedHtml)
      } catch (err) {
        setError((err as Error).message)
      } finally {
        setLoading(false)
      }
    }

    loadContract()
  }, [contract])

  // 監聽滾動，滾到底部才能簽名
  const handleScroll = () => {
    const container = scrollContainerRef.current
    if (!container) return

    const { scrollTop, scrollHeight, clientHeight } = container
    const progress = Math.min((scrollTop / (scrollHeight - clientHeight)) * 100, 100)
    setReadingProgress(progress)

    const isAtBottom = scrollTop + clientHeight >= scrollHeight - 50

    if (isAtBottom && !canSign) {
      setCanSign(true)
    }
  }

  // 處理電子簽名預覽
  const handleSignatureCapture = (signatureDataUrl: string) => {
    setSignaturePreview(signatureDataUrl)
  }

  // 重新簽名
  const handleRetrySign = () => {
    setSignaturePreview(null)
    setError(null)
  }

  // 已簽署的簽名（提交成功後保留，或從資料庫載入）
  const [savedSignature, setSavedSignature] = useState<string | null>(
    contract.signature_image || null
  )

  // 列印合約（用 printHtml，包含附件）
  const handlePrint = useCallback(() => {
    // 團員名單 HTML
    let memberListHtml = ''
    if (contract.include_member_list && contract.members.length > 1) {
      memberListHtml = `
        <div style="page-break-before: always; padding-top: 20px;">
          <h3 style="font-size: 14pt; font-weight: bold; margin-bottom: 12px;">附件一：簽約團員名單（${contract.members.length} 人）</h3>
          <table style="width: 100%; border-collapse: collapse; font-size: 10pt;">
            <thead>
              <tr style="border-bottom: 2px solid #333;">
                <th style="text-align: left; padding: 6px 8px; width: 40px;">序號</th>
                <th style="text-align: left; padding: 6px 8px;">姓名</th>
                <th style="text-align: left; padding: 6px 8px;">身分證字號 / 護照號碼</th>
                <th style="text-align: left; padding: 6px 8px;">出生日期</th>
              </tr>
            </thead>
            <tbody>
              ${contract.members
                .map(
                  (m, i) => `
                <tr style="border-bottom: 1px solid #ddd;">
                  <td style="padding: 6px 8px;">${i + 1}</td>
                  <td style="padding: 6px 8px; font-weight: 500;">${m.chinese_name || '-'}</td>
                  <td style="padding: 6px 8px;">${m.id_number || '-'}</td>
                  <td style="padding: 6px 8px;">${m.birth_date ? new Date(m.birth_date).toLocaleDateString('zh-TW') : '-'}</td>
                </tr>
              `
                )
                .join('')}
            </tbody>
          </table>
        </div>
      `
    }

    // 行程表 HTML（跟報價單同款式）
    let itineraryHtml = ''
    if (contract.include_itinerary && dailyData.length > 0) {
      const attachmentNum =
        contract.include_member_list && contract.members.length > 1 ? '二' : '一'
      const border = `1px solid ${MORANDI_COLORS.border}`
      itineraryHtml = `
        <div style="page-break-before: always; padding-top: 20px;">
          <h3 style="font-size: 14pt; font-weight: bold; margin-bottom: 12px;">附件${attachmentNum}：簡易行程表</h3>
          <table style="width: 100%; border-collapse: separate; border-spacing: 0; font-size: 12px; border-radius: 8px; overflow: hidden; border: ${border};">
            <thead>
              <tr>
                <th style="padding: 6px 8px; text-align: center; font-weight: 600; color: white; background: ${MORANDI_COLORS.gold}; width: 50px;">天數</th>
                <th style="padding: 6px 8px; text-align: left; font-weight: 600; color: white; background: ${MORANDI_COLORS.gold};">行程內容</th>
              </tr>
            </thead>
            <tbody>
              ${dailyData
                .map((day, idx) => {
                  const bg = idx % 2 === 0 ? '#fff' : '#FAFAF8'
                  return `
                  <tr style="background: ${bg};">
                    <td rowspan="${1 + (day.note ? 1 : 0) + 1 + (day.accommodation ? 1 : 0)}" style="padding: 6px 8px; text-align: center; vertical-align: middle; font-weight: 600; color: ${MORANDI_COLORS.gold}; border-top: ${border}; border-right: ${border};">${day.date || day.dayLabel}</td>
                    <td style="padding: 6px 8px; font-weight: 500; border-top: ${border};">${day.title}</td>
                  </tr>
                  ${day.note ? `<tr style="background: ${bg};"><td style="padding: 4px 8px; color: ${MORANDI_COLORS.gold}; font-size: 11px; border-top: ${border};">※${day.note}</td></tr>` : ''}
                  <tr style="background: ${bg};">
                    <td style="padding: 4px 0; border-top: ${border};">
                      <div style="display: grid; grid-template-columns: 1fr 1fr 1fr; font-size: 11px;">
                        <div style="padding: 0 8px;"><b style="color: ${MORANDI_COLORS.lightGray}">早餐 </b>${day.meals.breakfast || 'X'}</div>
                        <div style="padding: 0 8px; border-left: ${border};"><b style="color: ${MORANDI_COLORS.lightGray}">午餐 </b>${day.meals.lunch || 'X'}</div>
                        <div style="padding: 0 8px; border-left: ${border};"><b style="color: ${MORANDI_COLORS.lightGray}">晚餐 </b>${day.meals.dinner || 'X'}</div>
                      </div>
                    </td>
                  </tr>
                  ${day.accommodation ? `<tr style="background: ${bg};"><td style="padding: 4px 8px; font-size: 11px; border-top: ${border};"><b style="color: ${MORANDI_COLORS.lightGray}">住宿 </b>${day.accommodation}</td></tr>` : ''}
                `
                })
                .join('')}
            </tbody>
          </table>
        </div>
      `
    }

    // 列印時帶入簽約人資訊 + 簽名
    const infoStyle = 'font-size:8pt;font-family:"PingFang TC Light",sans-serif;color:black'
    let printContractHtml = contractHtml
      .replace(
        '<!--SIGNER_ADDRESS-->',
        signerAddress ? `<span style="${infoStyle}">${signerAddress}</span>` : ''
      )
      .replace(
        '<!--SIGNER_ID-->',
        signerIdNumber ? `<span style="${infoStyle}">${signerIdNumber}</span>` : ''
      )
      .replace(
        '<!--SIGNER_PHONE-->',
        signerPhone ? `<span style="${infoStyle}">${signerPhone}</span>` : ''
      )
    if (savedSignature) {
      printContractHtml = printContractHtml.replace(
        '<span id="contract-signature-placeholder"></span>',
        `<span style="display:inline-block;vertical-align:middle;margin-left:12px;"><img src="${savedSignature}" alt="甲方簽名" style="height:50px;object-fit:contain;vertical-align:middle;" /></span>`
      )
    }

    printHtml(printContractHtml + memberListHtml + itineraryHtml, {
      title: `合約 - ${contract.tours.name} - ${contract.code}`,
      orientation: 'portrait',
      margin: 15,
      fontSize: 12,
    })
  }, [contractHtml, contract])

  // 確認並提交簽名
  const handleConfirmSign = async () => {
    if (!signaturePreview) {
      setError('請先簽名')
      return
    }

    setSigning(true)
    setError(null)

    try {
      const response = await fetch('/api/contracts/sign', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          contractId: contract.id,
          signature: signaturePreview,
          signerPhone: signerPhone.trim(),
          signerAddress: signerAddress.trim(),
          signerIdNumber: signerIdNumber.trim() || undefined,
        }),
      })

      const data = await response.json()

      if (!response.ok) {
        throw new Error(data.error || '簽署失敗')
      }

      setSavedSignature(signaturePreview)
      // 簽署成功後回到預覽，讓客戶看到含簽名的完整合約
      setStep('preview')
      setCanSign(true)
    } catch (err) {
      setError((err as Error).message)
    } finally {
      setSigning(false)
    }
  }

  // 預覽頁面
  if (step === 'preview') {
    return (
      <div className="min-h-screen bg-gray-100 flex flex-col">
        {/* 頂部資訊列 */}
        <div className="bg-white border-b border-border shadow-sm sticky top-0 z-10">
          <div className="px-4 py-3">
            <div className="max-w-4xl mx-auto flex items-center justify-between">
              <div className="flex items-center gap-3">
                {savedSignature ? (
                  <Check className="w-5 h-5 text-green-600" />
                ) : (
                  <FileSignature className="w-5 h-5 text-amber-600" />
                )}
                <div>
                  <div className="font-medium text-gray-900 flex items-center gap-2">
                    {TEMPLATE_LABELS[contract.template] || '旅遊合約'}
                    {savedSignature && (
                      <span className="text-xs px-2 py-0.5 rounded-full bg-green-100 text-green-700">
                        已簽署
                      </span>
                    )}
                  </div>
                  <div className="text-sm text-gray-500">
                    {contract.tours.name} · {contract.code}
                  </div>
                </div>
              </div>
              <div className="text-sm text-gray-500">{contract.workspaces.name}</div>
            </div>
          </div>

          {/* 閱讀進度條 */}
          <div className="w-full h-1 bg-gray-100">
            <div
              className="h-full bg-amber-500 transition-all duration-300"
              style={{ width: `${readingProgress}%` }}
            />
          </div>
        </div>

        {/* 合約內容區（可滾動，像 Word 文件） */}
        <div className="flex-1 overflow-hidden p-4">
          <div className="max-w-4xl mx-auto h-full">
            {loading ? (
              <div className="bg-white rounded-lg shadow-lg h-full flex items-center justify-center">
                <Loader2 className="w-8 h-8 animate-spin text-amber-500" />
              </div>
            ) : error ? (
              <div className="bg-white rounded-lg shadow-lg h-full flex items-center justify-center">
                <div className="text-center text-red-500">
                  <p>{error}</p>
                </div>
              </div>
            ) : (
              <div
                ref={scrollContainerRef}
                onScroll={handleScroll}
                className="bg-white rounded-lg shadow-lg h-full overflow-y-auto"
                style={{ maxHeight: 'calc(100vh - 200px)' }}
              >
                {/* 合約 HTML 內容（含簽名） */}
                <div
                  className="p-8"
                  dangerouslySetInnerHTML={{
                    __html: (() => {
                      let html = contractHtml
                      // 填入簽約人資訊
                      const infoStyle =
                        'font-size:8pt;font-family:"PingFang TC Light",sans-serif;color:black'
                      html = html.replace(
                        '<!--SIGNER_ADDRESS-->',
                        signerAddress ? `<span style="${infoStyle}">${signerAddress}</span>` : ''
                      )
                      html = html.replace(
                        '<!--SIGNER_ID-->',
                        signerIdNumber ? `<span style="${infoStyle}">${signerIdNumber}</span>` : ''
                      )
                      html = html.replace(
                        '<!--SIGNER_PHONE-->',
                        signerPhone ? `<span style="${infoStyle}">${signerPhone}</span>` : ''
                      )
                      // 填入簽名
                      if (savedSignature) {
                        html = html.replace(
                          '<span id="contract-signature-placeholder"></span>',
                          `<span style="display:inline-block;vertical-align:middle;margin-left:12px;"><img src="${savedSignature}" alt="甲方簽名" style="height:50px;object-fit:contain;vertical-align:middle;" /></span>`
                        )
                      }
                      return html
                    })(),
                  }}
                />


                {/* 附件：團員名單表格 */}
                {contract.include_member_list && contract.members.length > 1 && (
                  <div className="border-t-2 border-gray-200 p-8">
                    <h3 className="text-base font-semibold text-gray-900 mb-4">
                      附件一：簽約團員名單（{contract.members.length} 人）
                    </h3>
                    <table className="w-full text-sm border-collapse">
                      <thead>
                        <tr className="border-b-2 border-gray-300">
                          <th className="text-left py-2 px-3 font-medium text-gray-600 w-10">
                            序號
                          </th>
                          <th className="text-left py-2 px-3 font-medium text-gray-600">姓名</th>
                          <th className="text-left py-2 px-3 font-medium text-gray-600">
                            身分證字號 / 護照號碼
                          </th>
                          <th className="text-left py-2 px-3 font-medium text-gray-600">
                            出生日期
                          </th>
                        </tr>
                      </thead>
                      <tbody>
                        {contract.members.map((member, idx) => (
                          <tr key={member.id} className="border-b border-gray-200">
                            <td className="py-2 px-3 text-gray-500">{idx + 1}</td>
                            <td className="py-2 px-3 font-medium text-gray-900">
                              {member.chinese_name || '-'}
                            </td>
                            <td className="py-2 px-3 text-gray-700">{member.id_number || '-'}</td>
                            <td className="py-2 px-3 text-gray-700">
                              {member.birth_date
                                ? new Date(member.birth_date).toLocaleDateString('zh-TW')
                                : '-'}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}

                {/* 附件：簡易行程表（跟報價單同款式） */}
                {contract.include_itinerary && dailyData.length > 0 && (
                  <div className="border-t-2 border-gray-200 p-8">
                    <h3 className="text-base font-semibold text-gray-900 mb-4">
                      {contract.include_member_list && contract.members.length > 1
                        ? '附件二'
                        : '附件一'}
                      ：簡易行程表
                    </h3>
                    <table
                      style={{
                        width: '100%',
                        borderCollapse: 'separate',
                        borderSpacing: 0,
                        fontSize: '12px',
                        borderRadius: '8px',
                        overflow: 'hidden',
                        border: `1px solid ${MORANDI_COLORS.border}`,
                      }}
                    >
                      <thead>
                        <tr>
                          <th
                            style={{
                              padding: '6px 8px',
                              textAlign: 'center',
                              fontWeight: 600,
                              color: 'white',
                              backgroundColor: MORANDI_COLORS.gold,
                              width: '50px',
                            }}
                          >
                            天數
                          </th>
                          <th
                            style={{
                              padding: '6px 8px',
                              textAlign: 'left',
                              fontWeight: 600,
                              color: 'white',
                              backgroundColor: MORANDI_COLORS.gold,
                            }}
                          >
                            行程內容
                          </th>
                        </tr>
                      </thead>
                      <tbody>
                        {dailyData.map((day, idx) => {
                          const bg = idx % 2 === 0 ? '#fff' : '#FAFAF8'
                          const border = `1px solid ${MORANDI_COLORS.border}`
                          return (
                            <React.Fragment key={idx}>
                              <tr style={{ backgroundColor: bg }}>
                                <td
                                  rowSpan={1 + (day.note ? 1 : 0) + 1 + (day.accommodation ? 1 : 0)}
                                  style={{
                                    padding: '6px 8px',
                                    textAlign: 'center',
                                    verticalAlign: 'middle',
                                    fontWeight: 600,
                                    color: MORANDI_COLORS.gold,
                                    borderTop: border,
                                    borderRight: border,
                                  }}
                                >
                                  {day.date || day.dayLabel}
                                </td>
                                <td
                                  style={{ padding: '6px 8px', fontWeight: 500, borderTop: border }}
                                >
                                  {day.title}
                                </td>
                              </tr>
                              {day.note && (
                                <tr style={{ backgroundColor: bg }}>
                                  <td
                                    style={{
                                      padding: '4px 8px',
                                      color: MORANDI_COLORS.gold,
                                      fontSize: '11px',
                                      borderTop: border,
                                    }}
                                  >
                                    ※{day.note}
                                  </td>
                                </tr>
                              )}
                              <tr style={{ backgroundColor: bg }}>
                                <td style={{ padding: '4px 0', borderTop: border }}>
                                  <div
                                    style={{
                                      display: 'grid',
                                      gridTemplateColumns: '1fr 1fr 1fr',
                                      fontSize: '11px',
                                    }}
                                  >
                                    <div style={{ padding: '0 8px' }}>
                                      <span
                                        style={{ fontWeight: 600, color: MORANDI_COLORS.lightGray }}
                                      >
                                        早餐{' '}
                                      </span>
                                      {day.meals.breakfast || 'X'}
                                    </div>
                                    <div style={{ padding: '0 8px', borderLeft: border }}>
                                      <span
                                        style={{ fontWeight: 600, color: MORANDI_COLORS.lightGray }}
                                      >
                                        午餐{' '}
                                      </span>
                                      {day.meals.lunch || 'X'}
                                    </div>
                                    <div style={{ padding: '0 8px', borderLeft: border }}>
                                      <span
                                        style={{ fontWeight: 600, color: MORANDI_COLORS.lightGray }}
                                      >
                                        晚餐{' '}
                                      </span>
                                      {day.meals.dinner || 'X'}
                                    </div>
                                  </div>
                                </td>
                              </tr>
                              {day.accommodation && (
                                <tr style={{ backgroundColor: bg }}>
                                  <td
                                    style={{
                                      padding: '4px 8px',
                                      fontSize: '11px',
                                      borderTop: border,
                                    }}
                                  >
                                    <span
                                      style={{ fontWeight: 600, color: MORANDI_COLORS.lightGray }}
                                    >
                                      住宿{' '}
                                    </span>
                                    {day.accommodation}
                                  </td>
                                </tr>
                              )}
                            </React.Fragment>
                          )
                        })}
                      </tbody>
                    </table>
                  </div>
                )}
              </div>
            )}
          </div>
        </div>

        {/* 底部按鈕區 */}
        <div className="bg-white border-t border-border shadow-lg px-4 py-4 sticky bottom-0">
          <div className="max-w-4xl mx-auto">
            {savedSignature ? (
              /* 簽署完成：顯示狀態 + 列印按鈕 */
              <div className="flex flex-col sm:flex-row gap-3 items-center justify-center">
                <div className="flex items-center gap-2 text-green-600 font-medium">
                  <Check className="w-5 h-5" />
                  {isSigned
                    ? `已於 ${new Date(contract.signed_at!).toLocaleDateString('zh-TW')} 簽署完成`
                    : '簽署完成，請確認合約內容'}
                </div>
                <Button size="lg" variant="outline" onClick={handlePrint}>
                  <Printer className="w-5 h-5 mr-2" />
                  列印合約
                </Button>
              </div>
            ) : !canSign ? (
              <div className="text-center">
                <div className="flex items-center justify-center gap-2 text-gray-500 mb-2">
                  <ChevronDown className="w-4 h-4 animate-bounce" />
                  <span>請閱讀完整合約內容</span>
                  <ChevronDown className="w-4 h-4 animate-bounce" />
                </div>
                <p className="text-xs text-gray-400">滾動至合約底部後即可簽署</p>
              </div>
            ) : (
              <div className="flex flex-col sm:flex-row gap-3 justify-center">
                <Button
                  size="lg"
                  onClick={() => setStep('fill-info')}
                  className="bg-amber-500 hover:bg-amber-600"
                >
                  <FileSignature className="w-5 h-5 mr-2" />
                  我已閱讀，進行電子簽署
                </Button>
                <Button size="lg" variant="outline" onClick={handlePrint}>
                  <Printer className="w-5 h-5 mr-2" />
                  列印合約
                </Button>
              </div>
            )}
          </div>
        </div>
      </div>
    )
  }

  // 補填資訊頁面
  if (step === 'fill-info') {
    return (
      <div className="min-h-screen bg-gradient-to-b from-amber-50 to-white flex flex-col">
        <div className="bg-white border-b border-border px-4 py-4">
          <div className="max-w-md mx-auto flex items-center">
            <button
              onClick={() => setStep('preview')}
              className="text-gray-500 hover:text-gray-700 mr-4"
            >
              ← 返回合約
            </button>
            <h1 className="text-lg font-semibold text-gray-900">確認簽約人資訊</h1>
          </div>
        </div>

        <div className="flex-1 flex items-center justify-center p-4">
          <div className="bg-white rounded-xl shadow-lg p-6 w-full max-w-md">
            <div className="mb-6 pb-4 border-b border-gray-100">
              <div className="text-sm text-gray-500 mb-1">{TEMPLATE_LABELS[contract.template]}</div>
              <div className="font-semibold text-gray-900">{contract.tours.name}</div>
              <div className="text-sm text-gray-600 mt-1">
                簽約人：{contract.signer_name}
                {contract.member_ids?.length > 1 && ` 等 ${contract.member_ids.length} 人`}
              </div>
            </div>

            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  聯絡電話 <span className="text-red-500">*</span>
                </label>
                <input
                  type="tel"
                  value={signerPhone}
                  onChange={e => setSignerPhone(e.target.value)}
                  placeholder="請輸入手機或市話"
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-amber-500 focus:border-amber-500 outline-none"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  住（居）所地址 <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  value={signerAddress}
                  onChange={e => setSignerAddress(e.target.value)}
                  placeholder="請輸入通訊地址"
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-amber-500 focus:border-amber-500 outline-none"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  身分證字號（統一編號）
                </label>
                <input
                  type="text"
                  value={signerIdNumber}
                  onChange={e => setSignerIdNumber(e.target.value)}
                  placeholder="選填"
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-amber-500 focus:border-amber-500 outline-none"
                />
              </div>
            </div>

            {error && (
              <div className="mt-4 p-3 bg-red-50 text-red-600 rounded-lg text-sm">{error}</div>
            )}

            <div className="mt-6">
              <Button
                size="lg"
                className="w-full bg-amber-500 hover:bg-amber-600"
                onClick={() => {
                  if (!signerPhone.trim()) {
                    setError('請輸入聯絡電話')
                    return
                  }
                  if (!signerAddress.trim()) {
                    setError('請輸入地址')
                    return
                  }
                  setError(null)
                  setStep('sign')
                }}
              >
                <FileSignature className="w-5 h-5 mr-2" />
                下一步：電子簽名
              </Button>
            </div>

            <p className="text-xs text-gray-400 text-center mt-4">以上資訊將記載於合約中</p>
          </div>
        </div>
      </div>
    )
  }

  // 簽名頁面
  if (step === 'sign') {
    return (
      <div className="min-h-screen bg-gradient-to-b from-amber-50 to-white flex flex-col">
        {/* 頂部 */}
        <div className="bg-white border-b border-border px-4 py-4">
          <div className="max-w-md mx-auto flex items-center">
            <button
              onClick={() => setStep('preview')}
              className="text-gray-500 hover:text-gray-700 mr-4"
            >
              ← 返回合約
            </button>
            <h1 className="text-lg font-semibold text-gray-900">電子簽署</h1>
          </div>
        </div>

        {/* 簽名區 */}
        <div className="flex-1 flex items-center justify-center p-4">
          <div className="bg-white rounded-xl shadow-lg p-6 w-full max-w-md">
            {/* 合約摘要 */}
            <div className="mb-6 pb-6 border-b border-gray-100">
              <div className="text-sm text-gray-500 mb-1">{TEMPLATE_LABELS[contract.template]}</div>
              <div className="font-semibold text-gray-900">{contract.tours.name}</div>
              <div className="text-sm text-gray-600 mt-1">
                簽約人：
                {contract.signer_type === 'company' ? contract.company_name : contract.signer_name}
                {contract.member_ids?.length > 1 && ` 等 ${contract.member_ids.length} 人`}
              </div>
            </div>

            {/* 簽名板或預覽 */}
            {signing ? (
              <div className="flex flex-col items-center justify-center py-12">
                <Loader2 className="w-8 h-8 animate-spin text-amber-500 mb-4" />
                <p className="text-gray-600">簽署中...</p>
              </div>
            ) : signaturePreview ? (
              // 簽名預覽
              <div className="space-y-4">
                <div className="text-sm text-gray-600 text-center">請確認您的簽名：</div>
                <div className="border-2 border-amber-200 rounded-lg p-4 bg-amber-50">
                  <img
                    src={signaturePreview}
                    alt="簽名預覽"
                    className="mx-auto"
                    style={{ maxWidth: signatureWidth, height: 180 }}
                  />
                </div>
                <div className="flex gap-3">
                  <Button
                    type="button"
                    variant="outline"
                    className="flex-1"
                    onClick={handleRetrySign}
                  >
                    重新簽名
                  </Button>
                  <Button
                    type="button"
                    className="flex-1 bg-amber-500 hover:bg-amber-600"
                    onClick={handleConfirmSign}
                  >
                    <Check className="w-4 h-4 mr-1" />
                    確認提交
                  </Button>
                </div>
              </div>
            ) : (
              // 簽名板
              <SignaturePad onSave={handleSignatureCapture} width={signatureWidth} height={180} />
            )}

            {error && (
              <div className="mt-4 p-3 bg-red-50 text-red-600 rounded-lg text-sm">{error}</div>
            )}

            <p className="text-xs text-gray-400 text-center mt-6">
              簽署後將記錄您的 IP 位址及時間戳記，作為簽署證明
            </p>
          </div>
        </div>
      </div>
    )
  }

  // 成功頁面
  if (step === 'success') {
    return (
      <div className="min-h-screen bg-gradient-to-b from-green-50 to-white flex items-center justify-center p-4">
        <div className="bg-white rounded-xl shadow-lg p-8 max-w-md text-center">
          <div className="w-20 h-20 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-6">
            <Check className="w-10 h-10 text-green-600" />
          </div>
          <h1 className="text-2xl font-bold text-gray-900 mb-2">簽署完成！</h1>
          <p className="text-gray-600 mb-6">
            您的電子簽名已成功提交。
            <br />
            旅行社將會收到通知。
          </p>
          <div className="text-sm text-gray-400 mb-6">
            合約編號：{contract.code}
            <br />
            簽署時間：{new Date().toLocaleString('zh-TW')}
          </div>

          {/* 導航按鈕 */}
          <div className="flex flex-col gap-3">
            <Button
              size="lg"
              onClick={() => (window.location.href = '/')}
              className="bg-amber-500 hover:bg-amber-600"
            >
              回到首頁
            </Button>
            <Button size="lg" variant="outline" onClick={() => setStep('preview')}>
              查看合約
            </Button>
          </div>
        </div>
      </div>
    )
  }

  return null
}
