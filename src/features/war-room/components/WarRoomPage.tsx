'use client';

/**
 * 作战会议室 (War Room)
 * William 的中央控制台 - 魔法塔图书馆 + 机器人管理
 */

import { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabase/client';
import { WarRoomHeader } from './WarRoomHeader';
import { MagicLibraryView } from './MagicLibraryView';
import { BotManagementView } from './BotManagementView';
import { TasksView } from './TasksView';

type TabType = 'magic' | 'bots' | 'tasks-individual' | 'tasks-workflow';

type MagicItem = {
  id: string;
  name: string;
  category: string;
  official_url: string | null;
  github_url: string | null;
  current_version: string | null;
  latest_version: string | null;
  update_status: 'latest' | 'update_available' | 'outdated' | 'unknown';
  last_checked_at: string | null;
  description: string | null;
};

type Bot = {
  id: string;
  bot_name: string;
  bot_username: string | null;
  platform: string;
  status: string;
  webhook_url: string | null;
  groups: BotGroup[];
};

type BotGroup = {
  id: string;
  group_id: string;
  group_name: string | null;
  is_new: boolean;
  joined_at: string;
  member_count: number | null;
};

export const WarRoomPage: React.FC = () => {
  const [activeTab, setActiveTab] = useState<TabType>('magic');
  const [magicItems, setMagicItems] = useState<MagicItem[]>([]);
  const [bots, setBots] = useState<Bot[]>([]);
  const [tasksIndividualCount, setTasksIndividualCount] = useState(0);
  const [tasksWorkflowCount, setTasksWorkflowCount] = useState(0);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    setLoading(true);
    try {
      // 加载魔法库
      const { data: magic } = (await supabase
        .from('magic_library')
        .select('*')
        .order('category')) as unknown as { data: MagicItem[] | null };

      if (magic) setMagicItems(magic);

      // 加载机器人
      const { data: botData } = await supabase
        .from('bot_registry')
        .select(`
          *,
          groups:bot_groups(*)
        `)
        .order('platform');

      if (botData) setBots(botData as any);

      // 加载任务统计
      const { count: individualCount } = await supabase
        .from('tasks')
        .select('*', { count: 'exact', head: true })
        .eq('task_type', 'individual')
        .neq('status', 'completed');

      const { count: workflowCount } = await supabase
        .from('tasks')
        .select('*', { count: 'exact', head: true })
        .eq('task_type', 'workflow')
        .neq('status', 'completed');

      setTasksIndividualCount(individualCount || 0);
      setTasksWorkflowCount(workflowCount || 0);
    } catch (err) {
      console.error('加载失败:', err);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="h-full flex flex-col">
      {/* 顶部标题/筛选区 - 参照 TourFilters */}
      <WarRoomHeader
        activeTab={activeTab}
        onTabChange={setActiveTab}
        magicCount={magicItems.length}
        botCount={bots.length}
        tasksIndividualCount={tasksIndividualCount}
        tasksWorkflowCount={tasksWorkflowCount}
        searchQuery={searchQuery}
        onSearchChange={setSearchQuery}
      />

      {/* 主内容区 - 参照 ToursPage */}
      <div className="flex-1 overflow-hidden flex flex-col">
        <div className="flex-1 overflow-auto">
          {activeTab === 'magic' && (
            <MagicLibraryView items={magicItems} loading={loading} />
          )}
          {activeTab === 'bots' && (
            <BotManagementView bots={bots} loading={loading} />
          )}
          {(activeTab === 'tasks-individual' || activeTab === 'tasks-workflow') && (
            <TasksView taskType={activeTab === 'tasks-individual' ? 'individual' : 'workflow'} />
          )}
        </div>
      </div>
    </div>
  );
};
