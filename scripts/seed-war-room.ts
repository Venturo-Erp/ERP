/**
 * 作战会议室 - 初始数据种子
 * 从 MAGIC_LIBRARY.md 同步数据
 */

import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;

const supabase = createClient(supabaseUrl, supabaseKey);

const WORKSPACE_ID = '8ef05a74-1f87-48ab-afd3-9bfeb423935d'; // Venturo workspace

const magicItems = [
  // 冒险者公会
  {
    name: '@hello-pangea/dnd',
    category: 'task_management',
    layer: 'layer2_opensource',
    source_type: 'npm',
    official_url: 'https://www.npmjs.com/package/@hello-pangea/dnd',
    github_url: 'https://github.com/hello-pangea/dnd',
    current_version: '17.0.0',
    latest_version: '17.0.0',
    update_status: 'latest',
    description: '拖拽功能库（React DnD 继任者）',
    check_frequency: 'quarterly',
  },
  {
    name: 'Plane',
    category: 'task_management',
    layer: 'layer2_opensource',
    source_type: 'github',
    official_url: 'https://plane.so',
    github_url: 'https://github.com/makeplane/plane',
    current_version: '2026-03-18 snapshot',
    latest_version: 'v1.2.3',
    update_status: 'update_available',
    description: '任务看板架构参考',
    check_frequency: 'quarterly',
  },
  {
    name: 'venturo-online 卡片设计',
    category: 'task_management',
    layer: 'layer3_internal',
    source_type: 'internal',
    official_url: null,
    github_url: null,
    current_version: '2026-02-23',
    latest_version: '2026-02-23',
    update_status: 'latest',
    description: '内部卡片设计系统',
    check_frequency: 'monthly',
  },
  
  // 记忆系统
  {
    name: 'OpenViking',
    category: 'memory',
    layer: 'layer2_opensource',
    source_type: 'github',
    official_url: null,
    github_url: 'https://github.com/your/openviking',
    current_version: 'unknown',
    latest_version: 'unknown',
    update_status: 'unknown',
    description: '向量搜索引擎',
    check_frequency: 'half_yearly',
  },
  
  // 搜索魔法
  {
    name: 'Tavily Search API',
    category: 'search',
    layer: 'layer2_opensource',
    source_type: 'api',
    official_url: 'https://tavily.com',
    github_url: null,
    current_version: 'API v1',
    latest_version: 'API v1',
    update_status: 'latest',
    description: 'AI 优化的网页搜索',
    check_frequency: 'monthly',
  },
  {
    name: 'agent-reach',
    category: 'search',
    layer: 'layer2_opensource',
    source_type: 'github',
    official_url: null,
    github_url: 'https://github.com/your/agent-reach',
    current_version: 'unknown',
    latest_version: 'unknown',
    update_status: 'unknown',
    description: '16 平台搜索整合',
    check_frequency: 'monthly',
  },
  
  // AI 框架
  {
    name: 'AutoGen',
    category: 'ai_framework',
    layer: 'layer2_opensource',
    source_type: 'github',
    official_url: 'https://microsoft.github.io/autogen/',
    github_url: 'https://github.com/microsoft/autogen',
    current_version: '0.7.5',
    latest_version: 'python-v0.7.5',
    update_status: 'latest',
    description: '多 Agent 自动对话框架',
    check_frequency: 'quarterly',
  },
  {
    name: 'OpenClaw',
    category: 'ai_framework',
    layer: 'layer2_opensource',
    source_type: 'github',
    official_url: 'https://docs.openclaw.ai',
    github_url: 'https://github.com/openclaw/openclaw',
    current_version: '2026.3.2',
    latest_version: '2026.3.2',
    update_status: 'latest',
    description: 'Agent 运行环境',
    check_frequency: 'weekly',
  },
  
  // 开发工具
  {
    name: 'Next.js',
    category: 'dev_tool',
    layer: 'layer2_opensource',
    source_type: 'npm',
    official_url: 'https://nextjs.org',
    github_url: 'https://github.com/vercel/next.js',
    current_version: '13.x',
    latest_version: '14.x',
    update_status: 'update_available',
    description: 'React 框架',
    check_frequency: 'half_yearly',
  },
  {
    name: 'Supabase',
    category: 'dev_tool',
    layer: 'layer2_opensource',
    source_type: 'api',
    official_url: 'https://supabase.com',
    github_url: 'https://github.com/supabase/supabase',
    current_version: '2.89.0',
    latest_version: '2.99.2',
    update_status: 'update_available',
    description: '数据库 + Realtime',
    check_frequency: 'monthly',
  },
  {
    name: 'Tailwind CSS',
    category: 'dev_tool',
    layer: 'layer2_opensource',
    source_type: 'npm',
    official_url: 'https://tailwindcss.com',
    github_url: 'https://github.com/tailwindlabs/tailwindcss',
    current_version: '3.x',
    latest_version: '3.x',
    update_status: 'latest',
    description: 'CSS 框架',
    check_frequency: 'half_yearly',
  },
  {
    name: 'framer-motion',
    category: 'dev_tool',
    layer: 'layer2_opensource',
    source_type: 'npm',
    official_url: 'https://www.framer.com/motion/',
    github_url: 'https://github.com/framer/motion',
    current_version: '11.x',
    latest_version: '11.x',
    update_status: 'latest',
    description: '动画库',
    check_frequency: 'half_yearly',
  },
];

const bots = [
  {
    bot_name: 'Venturo 播報員',
    bot_username: 'VENTURO_NEW_BOT',
    platform: 'telegram',
    status: 'active',
    webhook_url: null,
    description: '主要通知机器人',
    managed_by: 'eddie',
  },
  {
    bot_name: 'William AI',
    bot_username: 'william_ai_bot',
    platform: 'telegram',
    status: 'active',
    webhook_url: null,
    description: 'William 的 AI 替身',
    managed_by: 'eddie',
  },
];

async function seed() {
  console.log('🌱 开始种子数据...');

  // 插入魔法库
  console.log('📚 插入魔法库...');
  for (const item of magicItems) {
    const { error } = await supabase
      .from('magic_library')
      .upsert({
        workspace_id: WORKSPACE_ID,
        ...item,
        last_checked_at: new Date().toISOString(),
      }, {
        onConflict: 'name,workspace_id',
      });

    if (error) {
      console.error(`  ❌ ${item.name}:`, error.message);
    } else {
      console.log(`  ✅ ${item.name}`);
    }
  }

  // 插入机器人
  console.log('🤖 插入机器人...');
  for (const bot of bots) {
    const { error } = await supabase
      .from('bot_registry')
      .upsert({
        workspace_id: WORKSPACE_ID,
        ...bot,
      }, {
        onConflict: 'bot_username,platform,workspace_id',
      });

    if (error) {
      console.error(`  ❌ ${bot.bot_name}:`, error.message);
    } else {
      console.log(`  ✅ ${bot.bot_name}`);
    }
  }

  console.log('✅ 种子数据完成！');
}

seed().catch(console.error);
