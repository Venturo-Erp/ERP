'use client'

/**
 * 報價確認頁面（客戶公開連結）
 * /confirm/[token]
 *
 * 客戶透過此頁面確認報價單
 */

import { useState, useEffect } from 'react'
import { useParams } from 'next/navigation'
import { Check, Loader2, AlertCircle, CheckCircle2, Building2 } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { logger } from '@/lib/utils/logger'
import { formatDateChinese } from '@/lib/utils/format-date'
import { formatCurrency } from '@/lib/utils/format-currency'
import { COMPANY_NAME } from '@/lib/tenant'
import { QUOTE_CONFIRM_PAGE_LABELS } from './constants/labels'

interface QuoteInfo {
  code: string
  name: string | null
  customer_name: string
  destination: string | null
  start_date: string | null
  end_date: string | null
  days: number | null
  number_of_people: number | null
  total_amount: number | null
}

type PageState = 'loading' | 'ready' | 'confirming' | 'success' | 'error' | 'already_confirmed'

export default function QuoteConfirmPage() {
  const params = useParams()
  const token = params.token as string

  const [state, setState] = useState<PageState>('loading')
  const [quote, setQuote] = useState<QuoteInfo | null>(null)
  const [error, setError] = useState<string>('')

  // 表單欄位
  const [name, setName] = useState('')
  const [email, setEmail] = useState('')
  const [phone, setPhone] = useState('')
  const [notes, setNotes] = useState('')

  // 載入報價單資訊
  useEffect(() => {
    async function fetchQuote() {
      try {
        const res = await fetch(`/api/quotes/confirmation/customer?token=${token}`)
        const data = await res.json()

        if (data.success) {
          setQuote(data.quote)
          setName(data.quote.customer_name || '')
          setState('ready')
        } else if (data.already_confirmed) {
          setState('already_confirmed')
          setError(data.error)
        } else {
          setState('error')
          setError(data.error || QUOTE_CONFIRM_PAGE_LABELS.LOAD_ERROR_DEFAULT)
        }
      } catch (err) {
        logger.error('載入報價單失敗:', err)
        setState('error')
        setError(QUOTE_CONFIRM_PAGE_LABELS.NETWORK_ERROR)
      }
    }

    if (token) {
      fetchQuote()
    }
  }, [token])

  // 提交確認
  async function handleConfirm() {
    if (!name.trim()) {
      setError(QUOTE_CONFIRM_PAGE_LABELS.NAME_REQUIRED_ERROR)
      return
    }

    setState('confirming')
    setError('')

    try {
      const res = await fetch('/api/quotes/confirmation/customer', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          token,
          name: name.trim(),
          email: email.trim() || undefined,
          phone: phone.trim() || undefined,
          notes: notes.trim() || undefined,
        }),
      })

      const data = await res.json()

      if (data.success) {
        setState('success')
      } else if (data.already_confirmed) {
        setState('already_confirmed')
      } else {
        setState('ready')
        setError(data.error || QUOTE_CONFIRM_PAGE_LABELS.CONFIRM_ERROR_DEFAULT)
      }
    } catch (err) {
      logger.error('確認失敗:', err)
      setState('ready')
      setError(QUOTE_CONFIRM_PAGE_LABELS.NETWORK_ERROR)
    }
  }

  // 格式化日期
  function formatDate(dateStr: string | null) {
    if (!dateStr) return '-'
    try {
      return formatDateChinese(dateStr)
    } catch {
      return dateStr
    }
  }

  return (
    <div className="min-h-screen bg-gradient-to-b from-morandi-container to-background flex items-center justify-center p-4">
      <div className="w-full max-w-lg">
        {/* Logo / 公司名稱 */}
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-morandi-gold/10 mb-4">
            <Building2 className="w-8 h-8 text-morandi-gold" />
          </div>
          <h1 className="text-2xl font-semibold text-morandi-primary">
            {QUOTE_CONFIRM_PAGE_LABELS.PAGE_TITLE}
          </h1>
        </div>

        {/* 主要卡片 */}
        <div className="bg-card rounded-xl shadow-lg border border-border p-6">
          {/* 載入中 */}
          {state === 'loading' && (
            <div className="flex flex-col items-center py-12">
              <Loader2 className="w-10 h-10 text-morandi-gold animate-spin mb-4" />
              <p className="text-morandi-secondary">{QUOTE_CONFIRM_PAGE_LABELS.LOADING_QUOTE}</p>
            </div>
          )}

          {/* 錯誤 */}
          {state === 'error' && (
            <div className="flex flex-col items-center py-12">
              <div className="w-16 h-16 rounded-full bg-morandi-red/10 flex items-center justify-center mb-4">
                <AlertCircle className="w-8 h-8 text-morandi-red" />
              </div>
              <h2 className="text-lg font-medium text-morandi-primary mb-2">
                {QUOTE_CONFIRM_PAGE_LABELS.LOAD_ERROR_TITLE}
              </h2>
              <p className="text-morandi-secondary text-center">{error}</p>
              <p className="text-sm text-morandi-muted mt-4">
                {QUOTE_CONFIRM_PAGE_LABELS.LOAD_ERROR_CONTACT}
              </p>
            </div>
          )}

          {/* 已確認 */}
          {state === 'already_confirmed' && (
            <div className="flex flex-col items-center py-12">
              <div className="w-16 h-16 rounded-full bg-morandi-green/10 flex items-center justify-center mb-4">
                <CheckCircle2 className="w-8 h-8 text-morandi-green" />
              </div>
              <h2 className="text-lg font-medium text-morandi-primary mb-2">
                {QUOTE_CONFIRM_PAGE_LABELS.ALREADY_CONFIRMED_TITLE}
              </h2>
              <p className="text-morandi-secondary text-center">
                {QUOTE_CONFIRM_PAGE_LABELS.ALREADY_CONFIRMED_MESSAGE}
              </p>
            </div>
          )}

          {/* 準備確認 */}
          {state === 'ready' && quote && (
            <>
              {/* 報價單資訊 */}
              <div className="bg-morandi-container/30 rounded-lg p-4 mb-6">
                <div className="flex justify-between items-start mb-3">
                  <div>
                    <p className="text-sm text-morandi-secondary">
                      {QUOTE_CONFIRM_PAGE_LABELS.QUOTE_NUMBER}
                    </p>
                    <p className="font-medium text-morandi-primary">{quote.code}</p>
                  </div>
                  {quote.total_amount && (
                    <div className="text-right">
                      <p className="text-sm text-morandi-secondary">
                        {QUOTE_CONFIRM_PAGE_LABELS.TOTAL_AMOUNT}
                      </p>
                      <p className="font-semibold text-morandi-gold text-lg">
                        {formatCurrency(quote.total_amount)}
                      </p>
                    </div>
                  )}
                </div>

                {quote.name && (
                  <p className="font-medium text-morandi-primary mb-2">{quote.name}</p>
                )}

                <div className="grid grid-cols-2 gap-3 text-sm">
                  {quote.destination && (
                    <div>
                      <span className="text-morandi-secondary">
                        {QUOTE_CONFIRM_PAGE_LABELS.DESTINATION_LABEL}
                      </span>
                      <span className="text-morandi-primary">{quote.destination}</span>
                    </div>
                  )}
                  {quote.days && (
                    <div>
                      <span className="text-morandi-secondary">
                        {QUOTE_CONFIRM_PAGE_LABELS.DAYS_LABEL}
                      </span>
                      <span className="text-morandi-primary">
                        {quote.days}
                        {QUOTE_CONFIRM_PAGE_LABELS.DAYS_SUFFIX}
                      </span>
                    </div>
                  )}
                  {quote.start_date && (
                    <div>
                      <span className="text-morandi-secondary">
                        {QUOTE_CONFIRM_PAGE_LABELS.DEPARTURE_LABEL}
                      </span>
                      <span className="text-morandi-primary">{formatDate(quote.start_date)}</span>
                    </div>
                  )}
                  {quote.number_of_people && (
                    <div>
                      <span className="text-morandi-secondary">
                        {QUOTE_CONFIRM_PAGE_LABELS.PEOPLE_COUNT_LABEL}
                      </span>
                      <span className="text-morandi-primary">
                        {quote.number_of_people}
                        {QUOTE_CONFIRM_PAGE_LABELS.PEOPLE_SUFFIX}
                      </span>
                    </div>
                  )}
                </div>
              </div>

              {/* 確認表單 */}
              <div className="space-y-4">
                <div>
                  <Label htmlFor="name" className="text-morandi-primary">
                    {QUOTE_CONFIRM_PAGE_LABELS.CONFIRM_NAME_LABEL}{' '}
                    <span className="text-morandi-red">
                      {QUOTE_CONFIRM_PAGE_LABELS.CONFIRM_NAME_REQUIRED}
                    </span>
                  </Label>
                  <Input
                    id="name"
                    value={name}
                    onChange={e => setName(e.target.value)}
                    placeholder={QUOTE_CONFIRM_PAGE_LABELS.NAME_PLACEHOLDER}
                    className="mt-1"
                  />
                </div>

                <div>
                  <Label htmlFor="email" className="text-morandi-primary">
                    {QUOTE_CONFIRM_PAGE_LABELS.EMAIL_LABEL}
                  </Label>
                  <Input
                    id="email"
                    type="email"
                    value={email}
                    onChange={e => setEmail(e.target.value)}
                    placeholder={QUOTE_CONFIRM_PAGE_LABELS.EMAIL_PLACEHOLDER}
                    className="mt-1"
                  />
                </div>

                <div>
                  <Label htmlFor="phone" className="text-morandi-primary">
                    {QUOTE_CONFIRM_PAGE_LABELS.PHONE_LABEL}
                  </Label>
                  <Input
                    id="phone"
                    type="tel"
                    value={phone}
                    onChange={e => setPhone(e.target.value)}
                    placeholder={QUOTE_CONFIRM_PAGE_LABELS.PHONE_PLACEHOLDER}
                    className="mt-1"
                  />
                </div>

                <div>
                  <Label htmlFor="notes" className="text-morandi-primary">
                    {QUOTE_CONFIRM_PAGE_LABELS.NOTES_LABEL}
                  </Label>
                  <Textarea
                    id="notes"
                    value={notes}
                    onChange={e => setNotes(e.target.value)}
                    placeholder={QUOTE_CONFIRM_PAGE_LABELS.NOTES_PLACEHOLDER}
                    className="mt-1"
                    rows={3}
                  />
                </div>

                {error && (
                  <p className="text-sm text-morandi-red flex items-center gap-1">
                    <AlertCircle className="w-4 h-4" />
                    {error}
                  </p>
                )}

                <Button
                  onClick={handleConfirm}
                  className="w-full bg-morandi-gold hover:bg-morandi-gold-hover text-white gap-2"
                  size="lg"
                >
                  <Check className="w-5 h-5" />
                  {QUOTE_CONFIRM_PAGE_LABELS.CONFIRM_BUTTON}
                </Button>

                <p className="text-xs text-morandi-muted text-center">
                  {QUOTE_CONFIRM_PAGE_LABELS.CONFIRM_AGREEMENT}
                </p>
              </div>
            </>
          )}

          {/* 確認中 */}
          {state === 'confirming' && (
            <div className="flex flex-col items-center py-12">
              <Loader2 className="w-10 h-10 text-morandi-gold animate-spin mb-4" />
              <p className="text-morandi-secondary">{QUOTE_CONFIRM_PAGE_LABELS.PROCESSING}</p>
            </div>
          )}

          {/* 確認成功 */}
          {state === 'success' && (
            <div className="flex flex-col items-center py-12">
              <div className="w-16 h-16 rounded-full bg-morandi-green/10 flex items-center justify-center mb-4">
                <CheckCircle2 className="w-8 h-8 text-morandi-green" />
              </div>
              <h2 className="text-lg font-medium text-morandi-primary mb-2">
                {QUOTE_CONFIRM_PAGE_LABELS.SUCCESS_TITLE}
              </h2>
              <p className="text-morandi-secondary text-center">
                {QUOTE_CONFIRM_PAGE_LABELS.SUCCESS_MESSAGE}
              </p>
              {quote && (
                <p className="text-sm text-morandi-muted mt-4">
                  {QUOTE_CONFIRM_PAGE_LABELS.QUOTE_NUMBER_PREFIX}
                  {quote.code}
                </p>
              )}
            </div>
          )}
        </div>

        {/* 版權資訊 */}
        <p className="text-center text-xs text-morandi-muted mt-6">
          {QUOTE_CONFIRM_PAGE_LABELS.COPYRIGHT
            .replace('{year}', new Date().getFullYear().toString())
            .replace('{company}', COMPANY_NAME)}
        </p>
      </div>
    </div>
  )
}
