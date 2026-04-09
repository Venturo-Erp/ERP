'use client'

import { createEntityHook } from '../core/createEntityHook'
import { CACHE_PRESETS } from '../core/types'
import type { QuoteItem } from '@/types/quote.types'

export const quoteItemEntity = createEntityHook<QuoteItem>('quote_items', {
  list: {
    select: '*',
    orderBy: { column: 'order', ascending: true },
  },
  slim: {
    select: 'id,quote_id,type,name,quantity,unit_price,total_price,order,is_optional,is_active',
  },
  detail: { select: '*' },
  cache: CACHE_PRESETS.medium,
})

// Hooks
export const useQuoteItems = quoteItemEntity.useList
export const useQuoteItemsSlim = quoteItemEntity.useListSlim
export const useQuoteItem = quoteItemEntity.useDetail
export const useQuoteItemsPaginated = quoteItemEntity.usePaginated
export const useQuoteItemDictionary = quoteItemEntity.useDictionary

// Actions
export const createQuoteItem = quoteItemEntity.create
export const updateQuoteItem = quoteItemEntity.update
export const deleteQuoteItem = quoteItemEntity.delete
export const invalidateQuoteItems = quoteItemEntity.invalidate
