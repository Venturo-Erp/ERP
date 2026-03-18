import { createClient } from '@supabase/supabase-js';
import { NextRequest, NextResponse } from 'next/server';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;

export async function POST(request: NextRequest) {
  try {
    const supabase = createClient(supabaseUrl, supabaseKey);
    const body = await request.json();

    const {
      title,
      description,
      priority = 'P1',
      assignees = [],
      created_by = 'william',
    } = body;

    // 验证
    if (!title) {
      return NextResponse.json(
        { error: '缺少任务标题' },
        { status: 400 }
      );
    }

    const workspace_id = '8ef05a74-1f87-48ab-afd3-9bfeb423935d'; // Venturo workspace

    // 创建任务
    const { data, error } = await supabase
      .from('tasks')
      .insert({
        workspace_id,
        title,
        description: description || null,
        priority,
        assignees,
        created_by,
        status: 'todo',
        progress: 0,
      })
      .select()
      .single();

    if (error) throw error;

    return NextResponse.json({
      success: true,
      task: data,
    });
  } catch (error: any) {
    console.error('创建任务失败:', error);
    return NextResponse.json(
      { error: error.message },
      { status: 500 }
    );
  }
}
