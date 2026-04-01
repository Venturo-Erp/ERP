'use client'
/**
 * PrintableQuickQuote - 快速報價單列印版
 */

import React from 'react'
import { Quote, QuickQuoteItem } from '@/types/quote.types'
import { PrintableWrapper } from '@/lib/print'
import { QuickQuoteCustomerInfo } from './QuickQuoteCustomerInfo'
import { QuickQuoteItemsTable } from './QuickQuoteItemsTable'
import { QuickQuoteSummary } from './QuickQuoteSummary'
import { QuickQuotePaymentInfo } from './QuickQuotePaymentInfo'
import { QuickQuoteReceiptInfo } from './QuickQuoteReceiptInfo'
import { PRINTABLE_QUICK_QUOTE_LABELS } from '../../../constants/labels'

interface PrintableQuickQuoteProps {
  quote: Quote
  items: QuickQuoteItem[]
  isOpen: boolean
  onClose: () => void
  onPrint: () => void
}

export const PrintableQuickQuote: React.FC<PrintableQuickQuoteProps> = ({
  quote,
  items,
  isOpen,
  onClose,
  onPrint,
}) => {
  const totalAmount = items.reduce((sum, item) => sum + item.amount, 0)

  return (
    <PrintableWrapper
      isOpen={isOpen}
      onClose={onClose}
      onPrint={onPrint}
      title={PRINTABLE_QUICK_QUOTE_LABELS.報價請款單}
      subtitle="QUOTATION"
    >
      <QuickQuoteCustomerInfo quote={quote} />
      <QuickQuoteItemsTable items={items} />
      <QuickQuoteSummary totalAmount={totalAmount} receivedAmount={quote.received_amount} />
      <QuickQuotePaymentInfo />
      <QuickQuoteReceiptInfo />
    </PrintableWrapper>
  )
}
