import { NextRequest, NextResponse } from 'next/server'
import { 
  notifyRequestSent, 
  notifyRequestReplied, 
  notifyRequestConfirmed,
  notifyTaskAssigned,
  notifyTaskCompleted,
  notifyContractSigned,
  notifyPaymentReceived
} from '@/lib/notifications'

/**
 * 頻道通知 API
 * POST /api/notify
 * 
 * 統一處理業務事件的頻道通知
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { event, tourId, workspaceId, ...data } = body

    if (!event || !tourId || !workspaceId) {
      return NextResponse.json(
        { error: '缺少必要參數：event, tourId, workspaceId' },
        { status: 400 }
      )
    }

    let success = false

    switch (event) {
      case 'request_sent':
        success = await notifyRequestSent(
          tourId, 
          workspaceId, 
          data.requestType || '需求', 
          data.supplierName || '供應商'
        )
        break

      case 'request_replied':
        success = await notifyRequestReplied(
          tourId,
          workspaceId,
          data.requestType || '需求',
          data.supplierName || '供應商'
        )
        break

      case 'request_confirmed':
        success = await notifyRequestConfirmed(
          tourId,
          workspaceId,
          data.requestType || '需求',
          data.supplierName || '供應商'
        )
        break

      case 'task_assigned':
        success = await notifyTaskAssigned(
          tourId,
          workspaceId,
          data.taskName || '任務',
          data.assigneeName || '同事',
          data.assigneeId || ''
        )
        break

      case 'task_completed':
        success = await notifyTaskCompleted(
          tourId,
          workspaceId,
          data.taskName || '任務',
          data.completedByName || '同事'
        )
        break

      case 'contract_signed':
        success = await notifyContractSigned(
          tourId,
          workspaceId,
          data.customerName || '客戶'
        )
        break

      case 'payment_received':
        success = await notifyPaymentReceived(
          tourId,
          workspaceId,
          data.amount || 0,
          data.payerName || '客戶'
        )
        break

      default:
        return NextResponse.json(
          { error: `不支援的事件類型：${event}` },
          { status: 400 }
        )
    }

    return NextResponse.json({ success })
  } catch (err) {
    console.error('[Notify API] Error:', err)
    return NextResponse.json(
      { error: '通知失敗' },
      { status: 500 }
    )
  }
}
