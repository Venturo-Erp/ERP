'use client';

/**
 * 作战会议室 - 顶部标题栏
 * 使用 ResponsiveHeader（ERP 标准）
 */

import { ResponsiveHeader } from '@/components/layout/responsive-header';
import { Target, BookOpen, Bot, ClipboardList, Workflow } from 'lucide-react';
import { Button } from '@/components/ui/button';

type TabType = 'magic' | 'bots' | 'tasks-individual' | 'tasks-workflow';

interface WarRoomHeaderProps {
  activeTab: TabType;
  onTabChange: (tab: TabType) => void;
  magicCount: number;
  botCount: number;
  tasksIndividualCount?: number;
  tasksWorkflowCount?: number;
  searchQuery?: string;
  onSearchChange?: (query: string) => void;
}

export const WarRoomHeader: React.FC<WarRoomHeaderProps> = ({
  activeTab,
  onTabChange,
  magicCount,
  botCount,
  tasksIndividualCount = 0,
  tasksWorkflowCount = 0,
  searchQuery = '',
  onSearchChange,
}) => {
  return (
    <ResponsiveHeader
      title="作戰會議室"
      icon={Target}
      breadcrumb={[
        { label: '作戰會議室', href: '/war-room' },
      ]}
      showSearch={true}
      searchTerm={searchQuery}
      onSearchChange={onSearchChange || (() => {})}
      searchPlaceholder="搜尋..."
      tabs={[
        { 
          value: 'magic', 
          label: `魔法圖書館 (${magicCount})`, 
          icon: BookOpen 
        },
        { 
          value: 'bots', 
          label: `機器人管理 (${botCount})`, 
          icon: Bot 
        },
        { 
          value: 'tasks-individual', 
          label: `獨立任務 (${tasksIndividualCount})`, 
          icon: ClipboardList 
        },
        { 
          value: 'tasks-workflow', 
          label: `工作流任務 (${tasksWorkflowCount})`, 
          icon: Workflow 
        },
      ]}
      activeTab={activeTab}
      onTabChange={(tab) => onTabChange(tab as TabType)}
      customActions={
        activeTab.startsWith('tasks') ? (
          <Button className="bg-morandi-gold hover:bg-morandi-gold-hover text-white">
            + 新任務
          </Button>
        ) : null
      }
    />
  );
};
