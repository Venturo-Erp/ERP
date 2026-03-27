'use client'

import { useState, useRef, useEffect } from 'react'
import { FileSignature, Check, Loader2, ChevronDown } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { SignaturePad } from '@/components/ui/signature-pad'
import DOMPurify from 'dompurify'

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
  const [step, setStep] = useState<'preview' | 'sign' | 'success'>('preview')
  const [contractHtml, setContractHtml] = useState<string>('')
  const [loading, setLoading] = useState(true)
  const [canSign, setCanSign] = useState(false)
  const [signing, setSigning] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [signatureWidth, setSignatureWidth] = useState(350)
  const [readingProgress, setReadingProgress] = useState(0)
  const [signaturePreview, setSignaturePreview] = useState<string | null>(null)
  
  const scrollContainerRef = useRef<HTMLDivElement>(null)

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
            'html', 'head', 'body', 'style', 'title', 'div', 'span', 'p', 'br', 'hr',
            'h1', 'h2', 'h3', 'h4', 'h5', 'h6', 'table', 'thead', 'tbody', 'tr', 'th', 'td',
            'ul', 'ol', 'li', 'strong', 'em', 'b', 'i', 'u', 'a', 'img', 'header', 'footer',
            'section', 'article',
          ],
          ALLOWED_ATTR: ['class', 'id', 'style', 'src', 'alt', 'href', 'target', 'colspan', 'rowspan', 'width', 'height'],
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

  // 確認並提交簽名
  const handleConfirmSign = async () => {
    if (!signaturePreview) {
      setError('請先簽名')
      return
    }
    
    setSigning(true)
    setError(null)

    try {
      console.log('[簽名] 開始提交，contractId:', contract.id)
      console.log('[簽名] signature 長度:', signaturePreview.length)
      
      const response = await fetch('/api/contracts/sign', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          contractId: contract.id,
          signature: signaturePreview,
        }),
      })

      console.log('[簽名] API 回應狀態:', response.status)
      
      const data = await response.json()
      console.log('[簽名] API 回應內容:', data)

      if (!response.ok) {
        throw new Error(data.error || '簽署失敗')
      }

      setStep('success')
    } catch (err) {
      console.error('[簽名] 錯誤:', err)
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
        <div className="bg-white border-b shadow-sm sticky top-0 z-10">
          <div className="px-4 py-3">
            <div className="max-w-4xl mx-auto flex items-center justify-between">
              <div className="flex items-center gap-3">
                <FileSignature className="w-5 h-5 text-amber-600" />
                <div>
                  <div className="font-medium text-gray-900">
                    {TEMPLATE_LABELS[contract.template] || '旅遊合約'}
                  </div>
                  <div className="text-sm text-gray-500">
                    {contract.tours.name} · {contract.code}
                  </div>
                </div>
              </div>
              <div className="text-sm text-gray-500">
                {contract.workspaces.name}
              </div>
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
                {/* 合約 HTML 內容 */}
                <div
                  className="p-8"
                  dangerouslySetInnerHTML={{ __html: contractHtml }}
                />
                
                {/* 附件區域 */}
                {(contract.include_itinerary || contract.include_member_list) && (
                  <div className="border-t border-gray-200 p-8 bg-gray-50">
                    <h3 className="text-lg font-medium text-gray-900 mb-4">📎 合約附件</h3>
                    <div className="space-y-3">
                      {contract.include_itinerary && (
                        <a
                          href={`/public/itinerary/${contract.tours.id}`}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="flex items-center gap-2 text-amber-600 hover:text-amber-700 underline"
                        >
                          📋 行程表
                        </a>
                      )}
                      {contract.include_member_list && contract.member_ids.length > 1 && (
                        <div className="text-gray-700">
                          👥 簽約團員名單（{contract.member_ids.length} 人）
                          <div className="text-sm text-gray-500 mt-1">
                            {(contract.contract_data?.memberNames as string[])?.join('、') || ''}
                          </div>
                        </div>
                      )}
                    </div>
                  </div>
                )}
              </div>
            )}
          </div>
        </div>

        {/* 底部按鈕區 */}
        <div className="bg-white border-t shadow-lg px-4 py-4 sticky bottom-0">
          <div className="max-w-4xl mx-auto">
            {!canSign ? (
              <div className="text-center">
                <div className="flex items-center justify-center gap-2 text-gray-500 mb-2">
                  <ChevronDown className="w-4 h-4 animate-bounce" />
                  <span>請閱讀完整合約內容</span>
                  <ChevronDown className="w-4 h-4 animate-bounce" />
                </div>
                <p className="text-xs text-gray-400">
                  滾動至合約底部後即可簽署
                </p>
              </div>
            ) : (
              <div className="flex flex-col sm:flex-row gap-3 justify-center">
                <Button
                  size="lg"
                  onClick={() => setStep('sign')}
                  className="bg-amber-500 hover:bg-amber-600"
                >
                  <FileSignature className="w-5 h-5 mr-2" />
                  我已閱讀，進行電子簽署
                </Button>
                <Button
                  size="lg"
                  variant="outline"
                  onClick={() => window.print()}
                >
                  列印合約
                </Button>
              </div>
            )}
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
        <div className="bg-white border-b px-4 py-4">
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
              <div className="text-sm text-gray-500 mb-1">
                {TEMPLATE_LABELS[contract.template]}
              </div>
              <div className="font-semibold text-gray-900">{contract.tours.name}</div>
              <div className="text-sm text-gray-600 mt-1">
                簽約人：
                {contract.signer_type === 'company'
                  ? contract.company_name
                  : contract.signer_name}
                {contract.member_ids?.length > 1 &&
                  ` 等 ${contract.member_ids.length} 人`}
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
                <div className="text-sm text-gray-600 text-center">
                  請確認您的簽名：
                </div>
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
              <SignaturePad
                onSave={handleSignatureCapture}
                width={signatureWidth}
                height={180}
              />
            )}

            {error && (
              <div className="mt-4 p-3 bg-red-50 text-red-600 rounded-lg text-sm">
                {error}
              </div>
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
              onClick={() => window.location.href = '/'}
              className="bg-amber-500 hover:bg-amber-600"
            >
              回到首頁
            </Button>
            <Button
              size="lg"
              variant="outline"
              onClick={() => setStep('preview')}
            >
              查看合約
            </Button>
          </div>
        </div>
      </div>
    )
  }

  return null
}
