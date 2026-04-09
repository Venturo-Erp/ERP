'use client'

/**
 * Quotes Entity
 */

import { createEntityHook } from '../core/createEntityHook'
import { CACHE_PRESETS } from '../core/types'
import type { Quote } from '@/stores/types'

export const quoteEntity = createEntityHook<Quote>('quotes', {
  list: {
    select:
      '*',
    orderBy: { column: 'created_at', ascending: false },
  },
  slim: {
    select: 'id,tour_id,name,total_cost,group_size',
  },
  detail: { select: '*' },
  cache: CACHE_PRESETS.medium,
})

export const useQuotes = quoteEntity.useList
export const useQuotesSlim = quoteEntity.useListSlim
export const useQuote = quoteEntity.useDetail
export const useQuotesPaginated = quoteEntity.usePaginated
export const useQuoteDictionary = quoteEntity.useDictionary

export const createQuote = quoteEntity.create
export const updateQuote = quoteEntity.update
export const deleteQuote = quoteEntity.delete
export const invalidateQuotes = quoteEntity.invalidate
