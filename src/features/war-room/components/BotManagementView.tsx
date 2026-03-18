'use client';

/**
 * 機器人管理中心視圖 - 列表式（Grid）
 */

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
    <div className="h-full flex flex-col p-4">
      {/* 表頭 */}
      <div className="border-b border-morandi-container/60">
        <div className="grid grid-cols-[180px_100px_100px_120px_100px_1fr] px-2 py-2.5 gap-4">
          <span className="text-xs font-medium text-morandi-secondary">機器人名稱</span>
          <span className="text-xs font-medium text-morandi-secondary">平台</span>
          <span className="text-xs font-medium text-morandi-secondary">狀態</span>
          <span className="text-xs font-medium text-morandi-secondary">帳號</span>
          <span className="text-xs font-medium text-morandi-secondary text-center">群組數</span>
          <span className="text-xs font-medium text-morandi-secondary">Webhook URL</span>
        </div>
      </div>

      {/* 項目列表 */}
      <div className="flex-1 overflow-auto">
        {bots.map((bot) => {
          const newGroupsCount = bot.groups?.filter(g => g.is_new).length || 0;
          return (
            <div
              key={bot.id}
              className="grid grid-cols-[180px_100px_100px_120px_100px_1fr] px-2 py-3 gap-4 border-b border-morandi-container/30 items-center hover:bg-morandi-container/5"
            >
              <div className="font-medium text-sm text-morandi-primary truncate" title={bot.bot_name}>
                {bot.bot_name}
              </div>
              <div>
                <span className="px-2 py-1 bg-morandi-container text-morandi-primary rounded text-xs">
                  {bot.platform.toUpperCase()}
                </span>
              </div>
              <div>
                <span
                  className={`px-2 py-1 rounded text-xs font-medium ${
                    bot.status === 'active'
                      ? 'bg-green-100 text-green-700'
                      : 'bg-red-100 text-red-700'
                  }`}
                >
                  {bot.status === 'active' ? '運行中' : '離線'}
                </span>
              </div>
              <div className="text-sm text-morandi-secondary">
                {bot.bot_username ? `@${bot.bot_username}` : '-'}
              </div>
              <div className="flex items-center justify-center gap-1">
                <span className="font-medium">{bot.groups?.length || 0}</span>
                {newGroupsCount > 0 && (
                  <span className="px-1.5 py-0.5 bg-amber-500 text-white rounded text-xs">
                    +{newGroupsCount}
                  </span>
                )}
              </div>
              <div className="text-xs text-morandi-secondary font-mono truncate" title={bot.webhook_url || ''}>
                {bot.webhook_url || '-'}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};
