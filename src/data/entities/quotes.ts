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
      'id,workspace_id,code,quote_number,quote_type,name,destination,days,status,tour_id,itinerary_id,converted_to_tour,is_pinned,is_active,customer_name,contact_person,contact_phone,contact_email,handler_name,created_by,created_by_name,issue_date,group_size,accommodation_days,budget_range,valid_until,payment_terms,total_cost,total_amount,version,current_version_index,confirmation_status,created_at,updated_at',
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
