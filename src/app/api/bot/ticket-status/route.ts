/**
 * 開票狀態檢查 API
 * 用於機器人每日檢查未開票的旅客
 *
 * GET  - 查詢開票狀態（可用於手動查詢）
 * POST - 執行檢查並發送通知（用於排程任務）
 */

import { NextRequest, NextResponse } from 'next/server'
import { getSupabaseAdminClient } from '@/lib/supabase/admin'
import { logger } from '@/lib/utils/logger'
import { ApiError, successResponse } from '@/lib/api/response'
import { format, addDays } from 'date-fns'
import { zhTW } from 'date-fns/locale'
import { parseLocalDate } from '@/lib/utils/format-date'
import { validateBody } from '@/lib/api/validation'
import { ticketStatusPostSchema, ticketStatusPatchSchema } from '@/lib/validations/api-schemas'
import { SYSTEM_BOT_ID } from '@/lib/constants/workspace'

// 成員開票狀態
interface MemberTicketStatus {
  id: string
  chinese_name: string | null
  pnr: string | null
  ticket_number: string | null
  ticketing_deadline: string | null
  flight_self_arranged: boolean
}

// 訂單統計
interface OrderStats {
  order_id: string
  order_code: string
  contact_person: string
  sales_person: string | null
  assistant: string | null // OP (助理)
  ticketed: number
  needs_ticketing: number
  no_record: number
  self_arranged: number
  members: MemberTicketStatus[]
  earliest_deadline: string | null
}

// 旅遊團統計
interface TourStats {
  tour_id: string
  tour_code: string
  tour_name: string
  departure_date: string
  orders: OrderStats[]
  total_ticketed: number
  total_needs_ticketing: number
  total_no_record: number
  total_self_arranged: number
  earliest_deadline: string | null
}

// 統計成員狀態
function categorizeMember(
  member: MemberTicketStatus
): 'ticketed' | 'needs_ticketing' | 'no_record' | 'self_arranged' {
  if (member.flight_self_arranged) return 'self_arranged'
  if (member.ticket_number) return 'ticketed'
  if (member.pnr) return 'needs_ticketing'
  return 'no_record'
}

// 格式化訊息
function formatNotificationMessage(tours: TourStats[]): string {
  const now = new Date()
  const header = `🎫 開票狀態 (${format(now, 'MM/dd HH:mm', { locale: zhTW })})\n`

  let body = ''
  let totalNeedsTicketing = 0
  let totalNoRecord = 0

  for (const tour of tours) {
    // 跳過全部都開票完成或全部自理的團
    if (tour.total_needs_ticketing === 0 && tour.total_no_record === 0) continue

    totalNeedsTicketing += tour.total_needs_ticketing
    totalNoRecord += tour.total_no_record

    const departureDate = parseLocalDate(tour.departure_date)
    const departureFormatted = departureDate ? format(departureDate, 'MM/dd', { locale: zhTW }) : ''
    const earliestDeadlineDate = parseLocalDate(tour.earliest_deadline)
    const dlFormatted = earliestDeadlineDate
      ? format(earliestDeadlineDate, 'MM/dd', { locale: zhTW })
      : null

    body += `\n━━━━━━━━━━━━━━━━━━━━━━━━━━━\n`
    body += `📍 ${tour.tour_code} ${tour.tour_name} (${departureFormatted}出發)\n`
    if (dlFormatted) {
      body += `   最近 DL: ${dlFormatted} ⏰\n`
    }

    for (const order of tour.orders) {
      // 跳過全部完成或全部自理的訂單
      if (order.needs_ticketing === 0 && order.no_record === 0) continue

      const orderDlDate = parseLocalDate(order.earliest_deadline)
      const orderDl = orderDlDate ? `(DL:${format(orderDlDate, 'MM/dd', { locale: zhTW })})` : ''

      body += `\n   ┌─ ${order.order_code} ${order.contact_person}\n`

      if (order.ticketed > 0) {
        body += `   │  ✅ ${order.ticketed}位已開票\n`
      }

      if (order.needs_ticketing > 0) {
        const needsTicketingNames = order.members
          .filter(m => categorizeMember(m) === 'needs_ticketing')
          .map(m => m.chinese_name || '未知')
          .slice(0, 3)
        const moreCount = order.needs_ticketing - needsTicketingNames.length
        const namesStr =
          needsTicketingNames.join('、') + (moreCount > 0 ? `...等${order.needs_ticketing}位` : '')
        body += `   │  ⚠️ ${order.needs_ticketing}位待開票${orderDl}：${namesStr}\n`
      }

      if (order.no_record > 0) {
        const noRecordNames = order.members
          .filter(m => categorizeMember(m) === 'no_record')
          .map(m => m.chinese_name || '未知')
          .slice(0, 3)
        const moreCount = order.no_record - noRecordNames.length
        const namesStr =
          noRecordNames.join('、') + (moreCount > 0 ? `...等${order.no_record}位` : '')
        body += `   │  ❓ ${order.no_record}位無紀錄：${namesStr}\n`
      }

      if (order.self_arranged > 0) {
        body += `   │  ✈️ ${order.self_arranged}位機票自理\n`
      }
    }
  }

  if (body === '') {
    return header + '\n✅ 所有團都已完成開票！'
  }

  const footer = `\n━━━━━━━━━━━━━━━━━━━━━━━━━━━\n📊 總計: ${totalNeedsTicketing}⚠️待開票 ${totalNoRecord}❓無紀錄`

  return header + body + footer
}

// Bot API 驗證
function validateBotSecret(request: NextRequest): NextResponse | null {
  const BOT_API_SECRET = process.env.BOT_API_SECRET
  if (!BOT_API_SECRET) {
    if (process.env.NODE_ENV === 'production') {
      return ApiError.internal('Server misconfigured')
    }
  } else {
    const authHeader = request.headers.get('x-bot-secret')
    if (authHeader !== BOT_API_SECRET) {
      return ApiError.unauthorized('Unauthorized')
    }
  }
  return null
}

// GET - 查詢開票狀態
export async function GET(request: NextRequest) {
  const authError = validateBotSecret(request)
  if (authError) return authError

  try {
    const supabase = getSupabaseAdminClient()
    const searchParams = request.nextUrl.searchParams
    const daysAhead = parseInt(searchParams.get('days') || '14', 10)
    const workspaceId = searchParams.get('workspace_id')

    // 🔒 強制必填 workspace_id、避免整表跨租戶掃描
    if (!workspaceId) {
      return ApiError.validation('workspace_id 必填')
    }

    const today = new Date()
    const futureDate = addDays(today, daysAhead)

    // 查詢未來 N 天出發的團
    const toursQuery = supabase
      .from('tours')
      .select('id, code, name, departure_date')
      .eq('workspace_id', workspaceId)
      .gte('departure_date', format(today, 'yyyy-MM-dd'))
      .lte('departure_date', format(futureDate, 'yyyy-MM-dd'))
      .neq('status', '取消')
      .order('departure_date', { ascending: true })

    const { data: tours, error: toursError } = await toursQuery

    if (toursError) {
      logger.error('查詢旅遊團失敗:', toursError)
      return ApiError.database('查詢失敗')
    }

    if (!tours || tours.length === 0) {
      return NextResponse.json({
        success: true,
        message: '無需檢查的團',
        data: { tours: [], summary: { total_needs_ticketing: 0, total_no_record: 0 } },
      })
    }

    // 查詢每個團的訂單和成員
    const tourIds = tours.map(t => t.id)

    const { data: orders, error: ordersError } = await supabase
      .from('orders')
      .select('id, code, tour_id, contact_person, sales_person, assistant')
      .eq('workspace_id', workspaceId)
      .in('tour_id', tourIds)
      .neq('status', 'cancelled')

    if (ordersError) {
      logger.error('查詢訂單失敗:', ordersError)
      return ApiError.database('查詢訂單失敗')
    }

    if (!orders || orders.length === 0) {
      return NextResponse.json({
        success: true,
        message: '無訂單',
        data: { tours: [], summary: { total_needs_ticketing: 0, total_no_record: 0 } },
      })
    }

    const orderIds = orders.map(o => o.id)

    const { data: members, error: membersError } = await supabase
      .from('order_members')
      .select(
        'id, order_id, chinese_name, pnr, ticket_number, ticketing_deadline, flight_self_arranged'
      )
      .eq('workspace_id', workspaceId)
      .in('order_id', orderIds)

    if (membersError) {
      logger.error('查詢成員失敗:', membersError)
      return ApiError.database('查詢成員失敗')
    }

    // 組織資料
    const tourStats: TourStats[] = tours.map(tour => {
      const tourOrders = orders.filter(o => o.tour_id === tour.id)

      const orderStatsArray: OrderStats[] = tourOrders.map(order => {
        const orderMembers = (members || [])
          .filter(m => m.order_id === order.id)
          .map(m => ({
            id: m.id,
            chinese_name: m.chinese_name,
            pnr: m.pnr,
            ticket_number: m.ticket_number,
            ticketing_deadline: m.ticketing_deadline,
            flight_self_arranged: m.flight_self_arranged || false,
          }))

        const stats = {
          ticketed: 0,
          needs_ticketing: 0,
          no_record: 0,
          self_arranged: 0,
        }

        let earliestDeadline: string | null = null

        for (const member of orderMembers) {
          const category = categorizeMember(member)
          stats[category]++

          if (
            member.ticketing_deadline &&
            (category === 'needs_ticketing' || category === 'no_record')
          ) {
            if (!earliestDeadline || member.ticketing_deadline < earliestDeadline) {
              earliestDeadline = member.ticketing_deadline
            }
          }
        }

        return {
          order_id: order.id,
          order_code: order.code,
          contact_person: order.contact_person,
          sales_person: order.sales_person,
          assistant: order.assistant,
          ...stats,
          members: orderMembers,
          earliest_deadline: earliestDeadline,
        }
      })

      const tourTotals = orderStatsArray.reduce(
        (acc, o) => ({
          ticketed: acc.ticketed + o.ticketed,
          needs_ticketing: acc.needs_ticketing + o.needs_ticketing,
          no_record: acc.no_record + o.no_record,
          self_arranged: acc.self_arranged + o.self_arranged,
        }),
        { ticketed: 0, needs_ticketing: 0, no_record: 0, self_arranged: 0 }
      )

      const allDeadlines = orderStatsArray
        .map(o => o.earliest_deadline)
        .filter((d): d is string => d !== null)
      const earliestTourDeadline = allDeadlines.length > 0 ? allDeadlines.sort()[0] : null

      return {
        tour_id: tour.id,
        tour_code: tour.code,
        tour_name: tour.name,
        departure_date: tour.departure_date || '',
        orders: orderStatsArray,
        total_ticketed: tourTotals.ticketed,
        total_needs_ticketing: tourTotals.needs_ticketing,
        total_no_record: tourTotals.no_record,
        total_self_arranged: tourTotals.self_arranged,
        earliest_deadline: earliestTourDeadline,
      }
    })

    // 過濾掉全部完成的團
    const toursNeedingAttention = tourStats.filter(
      t => t.total_needs_ticketing > 0 || t.total_no_record > 0
    )

    const summary = {
      total_tours: tours.length,
      tours_needing_attention: toursNeedingAttention.length,
      total_needs_ticketing: tourStats.reduce((sum, t) => sum + t.total_needs_ticketing, 0),
      total_no_record: tourStats.reduce((sum, t) => sum + t.total_no_record, 0),
      total_self_arranged: tourStats.reduce((sum, t) => sum + t.total_self_arranged, 0),
    }

    return NextResponse.json({
      success: true,
      data: {
        tours: toursNeedingAttention,
        summary,
        message: formatNotificationMessage(tourStats),
      },
    })
  } catch (error) {
    logger.error('開票狀態查詢錯誤:', error)
    return ApiError.internal('伺服器錯誤')
  }
}

// POST - 執行檢查並發送通知
export async function POST(request: NextRequest) {
  const authError = validateBotSecret(request)
  if (authError) return authError

  try {
    const supabase = getSupabaseAdminClient()
    const validation = await validateBody(request, ticketStatusPostSchema)
    if (!validation.success) return validation.error
    const { workspace_id, channel_id, notify_sales, days } = validation.data

    // 先取得狀態
    const statusUrl = new URL(request.url)
    statusUrl.searchParams.set('days', String(days))
    if (workspace_id) {
      statusUrl.searchParams.set('workspace_id', workspace_id)
    }

    const statusResponse = await GET(new NextRequest(statusUrl))
    const statusData = await statusResponse.json()

    if (!statusData.success) {
      return NextResponse.json(statusData, { status: 500 })
    }

    const { tours, summary, message } = statusData.data

    // 如果沒有需要關注的團，不發送通知
    if (summary.tours_needing_attention === 0) {
      return NextResponse.json({
        success: true,
        message: '無需發送通知',
        data: { sent: false, summary },
      })
    }

    // 發送到指定頻道
    if (channel_id) {
      // 先查詢頻道的 workspace_id（若有指定 workspace_id 則驗證頻道屬於該 workspace）
      let channelQuery = supabase
        .from('channels')
        .select('workspace_id')
        .eq('id', channel_id)
      if (workspace_id) {
        channelQuery = channelQuery.eq('workspace_id', workspace_id)
      }
      const { data: channelData } = await channelQuery.single()

      const channelWorkspaceId = channelData?.workspace_id

      // 轉換資料格式為 TicketStatusCard 所需
      const cardTours = (tours as TourStats[]).map(tour => ({
        tour_id: tour.tour_id,
        tour_code: tour.tour_code,
        tour_name: tour.tour_name,
        departure_date: tour.departure_date,
        earliest_deadline: tour.earliest_deadline,
        stats: {
          total:
            tour.total_ticketed +
            tour.total_needs_ticketing +
            tour.total_no_record +
            tour.total_self_arranged,
          ticketed: tour.total_ticketed,
          needs_ticketing: tour.total_needs_ticketing,
          no_record: tour.total_no_record,
          self_arranged: tour.total_self_arranged,
        },
        orders: tour.orders.map(order => ({
          order_id: order.order_id,
          order_code: order.order_code,
          contact_person: order.contact_person,
          earliest_deadline: order.earliest_deadline,
          members: order.members.map(m => ({
            id: m.id,
            name: m.chinese_name,
            status: categorizeMember(m),
            pnr: m.pnr,
            ticket_number: m.ticket_number,
            deadline: m.ticketing_deadline,
          })),
        })),
      }))

      const { error: msgError } = await supabase.from('messages').insert({
        channel_id,
        content: message, // 純文字 fallback
        created_by: SYSTEM_BOT_ID, // 使用 created_by 而非 author_id
        author: { id: SYSTEM_BOT_ID, display_name: '系統機器人', type: 'bot' }, // JSON 格式，需用 display_name
        workspace_id: channelWorkspaceId, // 繼承頻道的 workspace_id
        metadata: {
          message_type: 'ticket_status_card',
          tours: cardTours,
          summary: {
            total: summary.total_tours,
            ticketed: 0,
            needs_ticketing: summary.total_needs_ticketing,
            no_record: summary.total_no_record,
            self_arranged: summary.total_self_arranged,
          },
          generated_at: new Date().toISOString(),
        },
      })

      if (msgError) {
        logger.error('發送開票狀態通知失敗:', msgError)
        return NextResponse.json(
          {
            success: false,
            message: '發送通知失敗',
            error: msgError.message || JSON.stringify(msgError),
          },
          { status: 500 }
        )
      }

      logger.info('開票狀態訊息已發送到頻道', { channel_id, workspace_id: channelWorkspaceId })
    }

    // 發送給各訂單的業務人員和助理 (OP)
    if (notify_sales) {
      // 收集所有需要通知的員工名稱
      const salesPersonNames = new Set<string>()
      const assistantNames = new Set<string>()

      for (const tour of tours as TourStats[]) {
        for (const order of tour.orders) {
          if (order.needs_ticketing > 0 || order.no_record > 0) {
            if (order.sales_person) {
              salesPersonNames.add(order.sales_person)
            }
            if (order.assistant) {
              assistantNames.add(order.assistant)
            }
          }
        }
      }

      // 查詢員工 ID（sales_person 和 assistant 存的是 display_name）
      const allNames = [...new Set([...salesPersonNames, ...assistantNames])]
      const { data: employees } = await supabase
        .from('employees')
        .select('id, display_name')
        .in('display_name', allNames)

      // 建立名稱 -> ID 映射
      const nameToIdMap = new Map<string, string>()
      for (const emp of employees || []) {
        if (emp.display_name) {
          nameToIdMap.set(emp.display_name, emp.id)
        }
      }

      // 發送給業務人員
      for (const salesName of salesPersonNames) {
        const salesId = nameToIdMap.get(salesName)
        if (!salesId) {
          logger.warn(`找不到業務員工: ${salesName}`)
          continue
        }

        // 過濾出該業務負責的訂單
        const relevantTours = (tours as TourStats[])
          .map(tour => ({
            ...tour,
            orders: tour.orders.filter(o => o.sales_person === salesName),
          }))
          .filter(t => t.orders.length > 0)

        // 計算總數
        const totalStats = relevantTours.reduce(
          (acc, t) => ({
            ticketed: acc.ticketed + t.total_ticketed,
            needs_ticketing: acc.needs_ticketing + t.total_needs_ticketing,
            no_record: acc.no_record + t.total_no_record,
            self_arranged: acc.self_arranged + t.total_self_arranged,
          }),
          { ticketed: 0, needs_ticketing: 0, no_record: 0, self_arranged: 0 }
        )

        // 簡短摘要（fallback 顯示）
        const summaryMessage = `🎫 開票狀態提醒：${relevantTours.length} 個團需要處理`

        // 使用 bot-notification API 發送（含結構化資料）
        try {
          await fetch(`${request.nextUrl.origin}/api/bot-notification`, {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              ...(process.env.BOT_API_SECRET && { 'x-bot-secret': process.env.BOT_API_SECRET }),
            },
            body: JSON.stringify({
              recipient_id: salesId,
              message: summaryMessage,
              type: 'info',
              metadata: {
                message_type: 'ticket_status_card',
                role: 'sales',
                tours: relevantTours.map(t => ({
                  tour_id: t.tour_id,
                  tour_code: t.tour_code,
                  tour_name: t.tour_name,
                  departure_date: t.departure_date,
                  earliest_deadline: t.earliest_deadline,
                  stats: {
                    total:
                      t.total_ticketed +
                      t.total_needs_ticketing +
                      t.total_no_record +
                      t.total_self_arranged,
                    ticketed: t.total_ticketed,
                    needs_ticketing: t.total_needs_ticketing,
                    no_record: t.total_no_record,
                    self_arranged: t.total_self_arranged,
                  },
                  orders: t.orders.map(o => ({
                    order_id: o.order_id,
                    order_code: o.order_code,
                    contact_person: o.contact_person,
                    earliest_deadline: o.earliest_deadline,
                    members: o.members.map(m => ({
                      id: m.id,
                      name: m.chinese_name,
                      status: categorizeMember(m),
                      pnr: m.pnr,
                      ticket_number: m.ticket_number,
                      deadline: m.ticketing_deadline,
                    })),
                  })),
                })),
                summary: totalStats,
                generated_at: new Date().toISOString(),
              },
            }),
          })
          logger.info(`已發送開票提醒給業務: ${salesName}`)
        } catch (notifyError) {
          logger.error(`發送給業務 ${salesName} 失敗:`, notifyError)
        }
      }

      // 發送給助理 (OP)
      for (const assistantName of assistantNames) {
        const assistantId = nameToIdMap.get(assistantName)
        if (!assistantId) {
          logger.warn(`找不到助理員工: ${assistantName}`)
          continue
        }

        // 如果助理和業務是同一人，跳過（避免重複通知）
        if (salesPersonNames.has(assistantName)) {
          continue
        }

        // 過濾出該助理負責的訂單
        const relevantTours = (tours as TourStats[])
          .map(tour => ({
            ...tour,
            orders: tour.orders.filter(o => o.assistant === assistantName),
          }))
          .filter(t => t.orders.length > 0)

        // 計算總數
        const totalStats = relevantTours.reduce(
          (acc, t) => ({
            ticketed: acc.ticketed + t.total_ticketed,
            needs_ticketing: acc.needs_ticketing + t.total_needs_ticketing,
            no_record: acc.no_record + t.total_no_record,
            self_arranged: acc.self_arranged + t.total_self_arranged,
          }),
          { ticketed: 0, needs_ticketing: 0, no_record: 0, self_arranged: 0 }
        )

        // 簡短摘要（fallback 顯示）
        const summaryMessage = `🎫 開票狀態提醒：${relevantTours.length} 個團需要處理`

        // 使用 bot-notification API 發送（含結構化資料）
        try {
          await fetch(`${request.nextUrl.origin}/api/bot-notification`, {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              ...(process.env.BOT_API_SECRET && { 'x-bot-secret': process.env.BOT_API_SECRET }),
            },
            body: JSON.stringify({
              recipient_id: assistantId,
              message: summaryMessage,
              type: 'info',
              metadata: {
                message_type: 'ticket_status_card',
                role: 'assistant',
                tours: relevantTours.map(t => ({
                  tour_id: t.tour_id,
                  tour_code: t.tour_code,
                  tour_name: t.tour_name,
                  departure_date: t.departure_date,
                  earliest_deadline: t.earliest_deadline,
                  stats: {
                    total:
                      t.total_ticketed +
                      t.total_needs_ticketing +
                      t.total_no_record +
                      t.total_self_arranged,
                    ticketed: t.total_ticketed,
                    needs_ticketing: t.total_needs_ticketing,
                    no_record: t.total_no_record,
                    self_arranged: t.total_self_arranged,
                  },
                  orders: t.orders.map(o => ({
                    order_id: o.order_id,
                    order_code: o.order_code,
                    contact_person: o.contact_person,
                    earliest_deadline: o.earliest_deadline,
                    members: o.members.map(m => ({
                      id: m.id,
                      name: m.chinese_name,
                      status: categorizeMember(m),
                      pnr: m.pnr,
                      ticket_number: m.ticket_number,
                      deadline: m.ticketing_deadline,
                    })),
                  })),
                })),
                summary: totalStats,
                generated_at: new Date().toISOString(),
              },
            }),
          })
          logger.info(`已發送開票提醒給助理: ${assistantName}`)
        } catch (notifyError) {
          logger.error(`發送給助理 ${assistantName} 失敗:`, notifyError)
        }
      }
    }

    logger.info('開票狀態通知已發送', { summary })

    return NextResponse.json({
      success: true,
      message: '通知已發送',
      data: { sent: true, summary },
    })
  } catch (error) {
    logger.error('開票狀態通知錯誤:', error)
    return ApiError.internal('伺服器錯誤')
  }
}

// PATCH - 標記機票自理
export async function PATCH(request: NextRequest) {
  const authError = validateBotSecret(request)
  if (authError) return authError

  try {
    const supabase = getSupabaseAdminClient()
    const validation = await validateBody(request, ticketStatusPatchSchema)
    if (!validation.success) return validation.error
    const { workspace_id, member_ids, order_id, flight_self_arranged } = validation.data

    let query = supabase
      .from('order_members')
      .update({ flight_self_arranged })
      .eq('workspace_id', workspace_id)

    if (member_ids && member_ids.length > 0) {
      query = query.in('id', member_ids)
    } else if (order_id) {
      query = query.eq('order_id', order_id)
    } else {
      return ApiError.validation('需要指定 member_ids 或 order_id')
    }

    const { error } = await query

    if (error) {
      logger.error('更新機票自理狀態失敗:', error)
      return ApiError.database('更新失敗')
    }

    return successResponse({ message: '已更新' })
  } catch (error) {
    logger.error('更新機票自理狀態錯誤:', error)
    return ApiError.internal('伺服器錯誤')
  }
}
