'use client';

/**
 * 机器人管理中心视图 - 简化版
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
          <p className="text-sm text-gray-600">載入中...</p>
        </div>
      </div>
    );
  }

  if (bots.length === 0) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-center">
          <p className="text-gray-600">暫無機器人</p>
          <p className="text-sm text-gray-500 mt-2">請添加機器人數據</p>
        </div>
      </div>
    );
  }

  return (
    <div className="p-6">
      <div className="space-y-3">
        {bots.map((bot) => (
          <div
            key={bot.id}
            className="bg-white rounded-lg border border-gray-200 p-4 hover:shadow-md transition-shadow"
          >
            <div className="flex items-start justify-between mb-3">
              <div>
                <div className="flex items-center gap-3">
                  <h3 className="font-semibold text-gray-900">{bot.bot_name}</h3>
                  <span className="px-2 py-1 bg-gray-100 text-gray-700 rounded text-xs">
                    {bot.platform.toUpperCase()}
                  </span>
                  <span
                    className={`px-2 py-1 rounded text-xs font-medium ${
                      bot.status === 'active'
                        ? 'bg-green-100 text-green-700'
                        : 'bg-red-100 text-red-700'
                    }`}
                  >
                    {bot.status === 'active' ? '✅ 運行中' : '🔴 離線'}
                  </span>
                </div>
                {bot.bot_username && (
                  <p className="text-sm text-gray-600 mt-1">@{bot.bot_username}</p>
                )}
              </div>
            </div>

            {bot.webhook_url && (
              <div className="mb-3 pb-3 border-b border-gray-100">
                <div className="text-xs text-gray-500 mb-1">Webhook URL</div>
                <div className="text-xs text-gray-700 font-mono bg-gray-50 p-2 rounded truncate">
                  {bot.webhook_url}
                </div>
              </div>
            )}

            {bot.groups && bot.groups.length > 0 && (
              <div>
                <div className="text-sm font-medium text-gray-700 mb-2 flex items-center gap-2">
                  加入的群組
                  <span className="px-2 py-0.5 bg-gray-100 text-gray-600 rounded-full text-xs">
                    {bot.groups.length}
                  </span>
                  {bot.groups.some(g => g.is_new) && (
                    <span className="px-2 py-0.5 bg-amber-100 text-amber-700 rounded-full text-xs">
                      {bot.groups.filter(g => g.is_new).length} 個新加入
                    </span>
                  )}
                </div>
                <div className="grid grid-cols-2 gap-2">
                  {bot.groups.map((group) => (
                    <div
                      key={group.id}
                      className={`p-2 rounded border text-sm ${
                        group.is_new
                          ? 'bg-amber-50 border-amber-200'
                          : 'bg-gray-50 border-gray-200'
                      }`}
                    >
                      <div className="font-medium text-gray-900">
                        {group.group_name || group.group_id}
                        {group.is_new && (
                          <span className="ml-1 px-1.5 py-0.5 bg-amber-500 text-white rounded text-xs">新</span>
                        )}
                      </div>
                      <div className="text-xs text-gray-600 mt-0.5">
                        {new Date(group.joined_at).toLocaleDateString('zh-TW')}
                        {group.member_count && ` · ${group.member_count} 人`}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  );
};
