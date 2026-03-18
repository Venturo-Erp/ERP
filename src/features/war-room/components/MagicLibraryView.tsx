'use client';

/**
 * 魔法圖書館視圖 - 列表式（Grid）
 */

import { ExternalLink, Github } from 'lucide-react';

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

interface MagicLibraryViewProps {
  items: MagicItem[];
  loading: boolean;
}

const getStatusBadge = (status: string) => {
  const badges = {
    latest: { text: '最新', class: 'bg-green-100 text-green-700' },
    update_available: { text: '有更新', class: 'bg-amber-100 text-amber-700' },
    outdated: { text: '過時', class: 'bg-red-100 text-red-700' },
    unknown: { text: '未知', class: 'bg-morandi-container text-morandi-secondary' },
  };
  return badges[status as keyof typeof badges] || badges.unknown;
};

export const MagicLibraryView: React.FC<MagicLibraryViewProps> = ({
  items,
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

  if (items.length === 0) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-center">
          <p className="text-morandi-primary">暫無魔法項目</p>
          <p className="text-sm text-morandi-secondary mt-2">請執行初始化腳本</p>
        </div>
      </div>
    );
  }

  return (
    <div className="h-full flex flex-col p-4">
      {/* 表頭 */}
      <div className="border-b border-morandi-container/60">
        <div className="grid grid-cols-[180px_100px_100px_100px_100px_1fr_100px] px-2 py-2.5 gap-4">
          <span className="text-xs font-medium text-morandi-secondary">名稱</span>
          <span className="text-xs font-medium text-morandi-secondary">分類</span>
          <span className="text-xs font-medium text-morandi-secondary">當前版本</span>
          <span className="text-xs font-medium text-morandi-secondary">最新版本</span>
          <span className="text-xs font-medium text-morandi-secondary">狀態</span>
          <span className="text-xs font-medium text-morandi-secondary">說明</span>
          <span className="text-xs font-medium text-morandi-secondary text-center">連結</span>
        </div>
      </div>

      {/* 項目列表 */}
      <div className="flex-1 overflow-auto">
        {items.map((item) => {
          const badge = getStatusBadge(item.update_status);
          return (
            <div
              key={item.id}
              className="grid grid-cols-[180px_100px_100px_100px_100px_1fr_100px] px-2 py-3 gap-4 border-b border-morandi-container/30 items-center hover:bg-morandi-container/5"
            >
              <div className="font-medium text-sm text-morandi-primary truncate" title={item.name}>
                {item.name}
              </div>
              <div>
                <span className="px-2 py-1 bg-morandi-container text-morandi-primary rounded text-xs">
                  {item.category}
                </span>
              </div>
              <div className="text-sm text-morandi-secondary">
                {item.current_version || '-'}
              </div>
              <div className="text-sm text-morandi-secondary">
                {item.latest_version || '-'}
              </div>
              <div>
                <span className={`px-2 py-1 rounded text-xs font-medium ${badge.class}`}>
                  {badge.text}
                </span>
              </div>
              <div className="text-sm text-morandi-secondary truncate" title={item.description || ''}>
                {item.description || '-'}
              </div>
              <div className="flex items-center justify-center gap-2">
                {item.official_url && (
                  <a
                    href={item.official_url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-blue-600 hover:text-blue-700"
                    title="官網"
                  >
                    <ExternalLink className="h-4 w-4" />
                  </a>
                )}
                {item.github_url && (
                  <a
                    href={item.github_url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-blue-600 hover:text-blue-700"
                    title="GitHub"
                  >
                    <Github className="h-4 w-4" />
                  </a>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};
