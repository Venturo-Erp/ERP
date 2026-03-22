'use client'

import { useState } from 'react'
import { FileSignature, Printer, Download, Check, Loader2 } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { SignaturePad } from '@/components/ui/signature-pad'

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

const TEMPLATE_LABELS: Record<string, string> = {
  domestic: '國內旅遊定型化契約',
  international: '國外旅遊定型化契約',
  individual_international: '國外個別旅遊定型化契約',
}

export function ContractSignPage({ contract }: ContractSignPageProps) {
  const [mode, setMode] = useState<'choose' | 'sign' | 'print' | 'success'>('choose')
  const [signing, setSigning] = useState(false)
  const [error, setError] = useState<string | null>(null)

  // 處理電子簽名
  const handleSign = async (signatureDataUrl: string) => {
    setSigning(true)
    setError(null)

    try {
      const response = await fetch('/api/contracts/sign', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          contractId: contract.id,
          signature: signatureDataUrl,
        }),
      })

      if (!response.ok) {
        const data = await response.json()
        throw new Error(data.error || '簽署失敗')
      }

      setMode('success')
    } catch (err) {
      setError((err as Error).message)
    } finally {
      setSigning(false)
    }
  }

  // 處理列印/下載
  const handlePrint = () => {
    // TODO: 產生 PDF 並下載
    window.print()
  }

  // 選擇模式頁面
  if (mode === 'choose') {
    return (
      <div className="min-h-screen bg-gradient-to-b from-amber-50 to-white">
        {/* Header */}
        <div className="bg-white border-b border-amber-100 px-4 py-6">
          <div className="max-w-lg mx-auto text-center">
            <div className="inline-flex items-center justify-center w-16 h-16 bg-amber-100 rounded-full mb-4">
              <FileSignature className="w-8 h-8 text-amber-600" />
            </div>
            <h1 className="text-2xl font-bold text-gray-900">
              {TEMPLATE_LABELS[contract.template] || '旅遊合約'}
            </h1>
            <p className="text-gray-600 mt-1">{contract.workspaces.name}</p>
          </div>
        </div>

        {/* 合約資訊 */}
        <div className="max-w-lg mx-auto p-4">
          <div className="bg-white rounded-xl shadow-sm border border-amber-100 p-6 mb-6">
            <h2 className="font-semibold text-gray-900 mb-4">旅遊資訊</h2>
            <div className="space-y-3 text-sm">
              <div className="flex justify-between">
                <span className="text-gray-500">團號</span>
                <span className="font-medium">{contract.tours.code}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-500">行程名稱</span>
                <span className="font-medium">{contract.tours.name}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-500">目的地</span>
                <span className="font-medium">{contract.tours.location || '-'}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-500">出發日期</span>
                <span className="font-medium">
                  {contract.tours.departure_date
                    ? new Date(contract.tours.departure_date).toLocaleDateString('zh-TW')
                    : '-'}
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-500">簽約人</span>
                <span className="font-medium">
                  {contract.signer_type === 'company'
                    ? contract.company_name
                    : contract.signer_name}
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-500">團員人數</span>
                <span className="font-medium">{contract.member_ids?.length || 0} 人</span>
              </div>
            </div>
          </div>

          {/* 選擇簽約方式 */}
          <div className="bg-white rounded-xl shadow-sm border border-amber-100 p-6">
            <h2 className="font-semibold text-gray-900 mb-4">請選擇簽約方式</h2>
            <p className="text-sm text-gray-500 mb-6">
              依據電子簽章法，電子簽名與紙本簽名具有同等法律效力。
            </p>

            <div className="grid grid-cols-2 gap-4">
              <button
                onClick={() => setMode('sign')}
                className="flex flex-col items-center justify-center p-6 border-2 border-amber-200 rounded-xl hover:border-amber-400 hover:bg-amber-50 transition-colors"
              >
                <div className="w-12 h-12 bg-amber-100 rounded-full flex items-center justify-center mb-3">
                  <FileSignature className="w-6 h-6 text-amber-600" />
                </div>
                <span className="font-medium text-gray-900">電子簽約</span>
                <span className="text-xs text-gray-500 mt-1">手寫簽名</span>
              </button>

              <button
                onClick={() => setMode('print')}
                className="flex flex-col items-center justify-center p-6 border-2 border-gray-200 rounded-xl hover:border-gray-400 hover:bg-gray-50 transition-colors"
              >
                <div className="w-12 h-12 bg-gray-100 rounded-full flex items-center justify-center mb-3">
                  <Printer className="w-6 h-6 text-gray-600" />
                </div>
                <span className="font-medium text-gray-900">列印紙本</span>
                <span className="text-xs text-gray-500 mt-1">下載 PDF</span>
              </button>
            </div>
          </div>
        </div>
      </div>
    )
  }

  // 電子簽名頁面
  if (mode === 'sign') {
    return (
      <div className="min-h-screen bg-gradient-to-b from-amber-50 to-white">
        <div className="bg-white border-b border-amber-100 px-4 py-4">
          <div className="max-w-lg mx-auto flex items-center">
            <button
              onClick={() => setMode('choose')}
              className="text-gray-500 hover:text-gray-700 mr-4"
            >
              ← 返回
            </button>
            <h1 className="text-lg font-semibold text-gray-900">電子簽約</h1>
          </div>
        </div>

        <div className="max-w-lg mx-auto p-4">
          <div className="bg-white rounded-xl shadow-sm border border-amber-100 p-6">
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

            {/* 簽名板 */}
            {signing ? (
              <div className="flex flex-col items-center justify-center py-12">
                <Loader2 className="w-8 h-8 animate-spin text-amber-500 mb-4" />
                <p className="text-gray-600">簽署中...</p>
              </div>
            ) : (
              <SignaturePad
                onSave={handleSign}
                width={350}
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

  // 列印頁面
  if (mode === 'print') {
    return (
      <div className="min-h-screen bg-gradient-to-b from-gray-50 to-white">
        <div className="bg-white border-b border-gray-100 px-4 py-4">
          <div className="max-w-lg mx-auto flex items-center">
            <button
              onClick={() => setMode('choose')}
              className="text-gray-500 hover:text-gray-700 mr-4"
            >
              ← 返回
            </button>
            <h1 className="text-lg font-semibold text-gray-900">列印合約</h1>
          </div>
        </div>

        <div className="max-w-lg mx-auto p-4">
          <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6 text-center">
            <div className="w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-4">
              <Download className="w-8 h-8 text-gray-600" />
            </div>
            <h2 className="text-xl font-semibold text-gray-900 mb-2">下載合約 PDF</h2>
            <p className="text-gray-600 mb-6">
              下載後請列印、簽名，並寄回或掃描回傳給旅行社。
            </p>
            <Button onClick={handlePrint} className="w-full">
              <Download className="w-4 h-4 mr-2" />
              下載 PDF
            </Button>
          </div>
        </div>
      </div>
    )
  }

  // 成功頁面
  if (mode === 'success') {
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
          <div className="text-sm text-gray-400">
            合約編號：{contract.code}
            <br />
            簽署時間：{new Date().toLocaleString('zh-TW')}
          </div>
        </div>
      </div>
    )
  }

  return null
}
