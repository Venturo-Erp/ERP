'use client'

/**
 * PNR AI Queries Entity - PNR AI 查詢記錄
 */

import { createEntityHook } from '../core/createEntityHook'
import { CACHE_PRESETS } from '../core/types'

export interface PnrAiQuery {
  id: string
  pnr_id: string | null
  query_text: string
  response_text: string | null
  queried_by: string | null
  query_context: Record<string, unknown> | null
  response_metadata: Record<string, unknown> | null
  workspace_id: string
  created_at: string | null
}

export const pnrAiQueryEntity = createEntityHook<PnrAiQuery>('pnr_ai_queries', {
  list: {
    select:
      'id,pnr_id,query_text,response_text,queried_by,query_context,response_metadata,workspace_id,created_at',
    orderBy: { column: 'created_at', ascending: false },
  },
  slim: {
    select: 'id,pnr_id,query_text,created_at',
  },
  detail: { select: '*' },
  cache: CACHE_PRESETS.low,
})

export const usePnrAiQueries = pnrAiQueryEntity.useList
export const usePnrAiQueriesSlim = pnrAiQueryEntity.useListSlim
export const usePnrAiQuery = pnrAiQueryEntity.useDetail
export const usePnrAiQueriesPaginated = pnrAiQueryEntity.usePaginated
export const usePnrAiQueryDictionary = pnrAiQueryEntity.useDictionary

export const createPnrAiQuery = pnrAiQueryEntity.create
export const updatePnrAiQuery = pnrAiQueryEntity.update
export const deletePnrAiQuery = pnrAiQueryEntity.delete
export const invalidatePnrAiQueries = pnrAiQueryEntity.invalidate
