import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

// GET - 取得請款類別列表
export async function GET(request: NextRequest) {
  const supabase = await createClient()
  const { searchParams } = new URL(request.url)
  const workspaceId = searchParams.get('workspace_id')

  if (!workspaceId) {
    return NextResponse.json({ error: '缺少 workspace_id' }, { status: 400 })
  }

  const { data, error } = await supabase
    .from('expense_categories')
    .select('*')
    .eq('type', 'payment_request') // 只取請款類別
    .or(`user_id.is.null,user_id.eq.${workspaceId}`) // 系統預設或該工作區的
    .order('sort_order', { ascending: true })

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  return NextResponse.json(data || [])
}

// POST - 新增請款類別
export async function POST(request: NextRequest) {
  const supabase = await createClient()
  const body = await request.json()
  const { name, icon, color, workspace_id, sort_order } = body

  if (!name || !workspace_id) {
    return NextResponse.json({ error: '缺少必要欄位' }, { status: 400 })
  }

  const { data, error } = await supabase
    .from('expense_categories')
    .insert({
      name,
      icon: icon || '💰',
      color: color || '#c9aa7c',
      type: 'payment_request',
      user_id: workspace_id,
      is_active: true,
      is_system: false,
      sort_order: sort_order || 100,
    })
    .select()
    .single()

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  return NextResponse.json(data)
}

// PUT - 更新請款類別
export async function PUT(request: NextRequest) {
  const supabase = await createClient()
  const body = await request.json()
  const { id, name, icon, color, is_active, sort_order } = body

  if (!id) {
    return NextResponse.json({ error: '缺少 id' }, { status: 400 })
  }

  const { data, error } = await supabase
    .from('expense_categories')
    .update({
      name,
      icon,
      color,
      is_active,
      sort_order,
    })
    .eq('id', id)
    .select()
    .single()

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  return NextResponse.json(data)
}

// DELETE - 刪除請款類別
export async function DELETE(request: NextRequest) {
  const supabase = await createClient()
  const { searchParams } = new URL(request.url)
  const id = searchParams.get('id')

  if (!id) {
    return NextResponse.json({ error: '缺少 id' }, { status: 400 })
  }

  // 檢查是否為系統預設（不能刪除）
  const { data: category } = await supabase
    .from('expense_categories')
    .select('is_system')
    .eq('id', id)
    .single()

  if (category?.is_system) {
    return NextResponse.json({ error: '系統預設類別無法刪除' }, { status: 400 })
  }

  const { error } = await supabase.from('expense_categories').delete().eq('id', id)

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  return NextResponse.json({ success: true })
}
