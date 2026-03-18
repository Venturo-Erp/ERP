'use client';

/**
 * 機器人管理中心視圖 - 列表式
 */

import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';

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

interface BotManagementViewProps {
  bots: Bot[];
  loading: boolean;
}

export const BotManagementView: React.FC<BotManagementViewProps> = ({
  bots,
  loading,
}) => {
  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-amber-600 mx-auto mb-2"></div>
          <p className="text-sm text-morandi-secondary">載入中...</p>
        </div>
      </div>
    );
  }

  if (bots.length === 0) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-center">
          <p className="text-morandi-primary">暫無機器人</p>
          <p className="text-sm text-morandi-secondary mt-2">請添加機器人數據</p>
        </div>
      </div>
    );
  }

  return (
    <div className="h-full flex flex-col">
      <div className="flex-1 overflow-auto">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead className="w-[180px]">機器人名稱</TableHead>
              <TableHead className="w-[100px]">平台</TableHead>
              <TableHead className="w-[100px]">狀態</TableHead>
              <TableHead className="w-[120px]">帳號</TableHead>
              <TableHead className="w-[100px] text-center">群組數</TableHead>
              <TableHead className="w-[300px]">Webhook URL</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {bots.map((bot) => {
              const newGroupsCount = bot.groups?.filter(g => g.is_new).length || 0;
              return (
                <TableRow key={bot.id} className="hover:bg-morandi-container/30">
                  <TableCell className="font-medium">{bot.bot_name}</TableCell>
                  <TableCell>
                    <span className="px-2 py-1 bg-morandi-container text-morandi-primary rounded text-xs">
                      {bot.platform.toUpperCase()}
                    </span>
                  </TableCell>
                  <TableCell>
                    <span
                      className={`px-2 py-1 rounded text-xs font-medium ${
                        bot.status === 'active'
                          ? 'bg-green-100 text-green-700'
                          : 'bg-red-100 text-red-700'
                      }`}
                    >
                      {bot.status === 'active' ? '運行中' : '離線'}
                    </span>
                  </TableCell>
                  <TableCell className="text-sm text-morandi-secondary">
                    {bot.bot_username ? `@${bot.bot_username}` : '-'}
                  </TableCell>
                  <TableCell className="text-center">
                    <div className="flex items-center justify-center gap-1">
                      <span className="font-medium">{bot.groups?.length || 0}</span>
                      {newGroupsCount > 0 && (
                        <span className="px-1.5 py-0.5 bg-amber-500 text-white rounded text-xs">
                          +{newGroupsCount}
                        </span>
                      )}
                    </div>
                  </TableCell>
                  <TableCell className="text-xs text-morandi-secondary font-mono truncate max-w-[300px]">
                    {bot.webhook_url || '-'}
                  </TableCell>
                </TableRow>
              );
            })}
          </TableBody>
        </Table>
      </div>
    </div>
  );
};
