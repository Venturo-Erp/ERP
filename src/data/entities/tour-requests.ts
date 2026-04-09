'use client'

/**
 * Tour Requests Entity - 團務需求管理
 */

import { createEntityHook } from '../core/createEntityHook'
import { CACHE_PRESETS } from '../core/types'

export interface TourRequest {
  id: string
  code: string
  title: string
  category: string
  status: string | null
  priority: string | null
  description: string | null
  notes: string | null
  handler_type: string
  request_type: string | null
  order_id: string | null
  tour_id: string | null
  tour_code: string | null
  tour_name: string | null
  service_date: string | null
  service_date_end: string | null
  resource_id: string | null
  resource_type: string | null
  supplier_id: string | null
  supplier_name: string | null
  supplier_type: string | null
  assignee_id: string | null
  assignee_name: string | null
  assigned_leader_id: string | null
  assigned_vehicle_id: string | null
  assigned_at: string | null
  assigned_by: string | null
  assigned_by_name: string | null
  assignment_note: string | null
  itinerary_item_id: string | null
  quantity: number | null
  currency: string | null
  estimated_cost: number | null
  quoted_cost: number | null
  final_cost: number | null
  member_ids: string[] | null
  member_data: unknown | null
  specifications: unknown | null
  hidden: boolean | null
  response_status: string | null
  reply_content: unknown | null
  reply_note: string | null
  replied_at: string | null
  replied_by: string | null
  confirmed_at: string | null
  confirmed_by: string | null
  confirmed_by_name: string | null
  recipient_workspace_id: string | null
  target_workspace_id: string | null
  driver_name: string | null
  driver_phone: string | null
  plate_number: string | null
  google_maps_url: string | null
  latitude: number | null
  longitude: number | null
  app_sync_data: unknown | null
  sync_to_app: boolean | null
  synced_at: string | null
  workspace_id: string
  created_at: string | null
  created_by: string | null
  created_by_name: string | null
  updated_at: string | null
  updated_by: string | null
  updated_by_name: string | null
}

export const tourRequestEntity = createEntityHook<TourRequest>('tour_requests', {
  workspaceScoped: true,
  list: {
    select:
      'id,code,tour_id,tour_code,tour_name,order_id,handler_type,assignee_id,assignee_name,supplier_id,supplier_name,supplier_type,category,service_date,service_date_end,title,description,quantity,specifications,member_ids,member_data,status,priority,reply_content,reply_note,replied_at,replied_by,estimated_cost,quoted_cost,final_cost,currency,confirmed_at,confirmed_by,confirmed_by_name,sync_to_app,synced_at,workspace_id,target_workspace_id,created_by,created_by_name,updated_by,updated_by_name,created_at,updated_at,hidden,is_from_core,response_status,supplier_response_at,recipient_workspace_id,sent_at,request_type,items,note',
    orderBy: { column: 'created_at', ascending: false },
  },
  slim: {
    select: 'id,code,title,category,status,priority,tour_id,tour_code,service_date',
  },
  detail: { select: '*' },
  cache: CACHE_PRESETS.high,
})

export const useTourRequests = tourRequestEntity.useList
export const useTourRequestsSlim = tourRequestEntity.useListSlim
export const useTourRequest = tourRequestEntity.useDetail
export const useTourRequestsPaginated = tourRequestEntity.usePaginated
export const useTourRequestDictionary = tourRequestEntity.useDictionary

export const createTourRequest = tourRequestEntity.create
export const updateTourRequest = tourRequestEntity.update
export const deleteTourRequest = tourRequestEntity.delete
export const invalidateTourRequests = tourRequestEntity.invalidate
