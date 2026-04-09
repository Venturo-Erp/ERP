'use client'

import { createEntityHook } from '../core/createEntityHook'
import { CACHE_PRESETS } from '../core/types'
import type { QuoteItem } from '@/types/quote.types'

export const quoteItemEntity = createEntityHook<QuoteItem>('quote_items', {
  list: {
    select:
      'id,workspace_id,quote_id,category_id,category_name,type,name,description,quantity,unit_price,total_price,order,notes,is_optional,is_active,created_at,updated_at',
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
