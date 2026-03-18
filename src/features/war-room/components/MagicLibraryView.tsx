'use client';

/**
 * 魔法塔图书馆视图 - 简化版
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
    latest: { text: '✅ 最新', class: 'bg-green-100 text-green-700' },
    update_available: { text: '⚠️ 有更新', class: 'bg-amber-100 text-amber-700' },
    outdated: { text: '🔴 過時', class: 'bg-red-100 text-red-700' },
    unknown: { text: '❓ 未知', class: 'bg-gray-100 text-gray-700' },
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
          <p className="text-sm text-gray-600">載入中...</p>
        </div>
      </div>
    );
  }

  if (items.length === 0) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-center">
          <p className="text-gray-600">暫無魔法項目</p>
          <p className="text-sm text-gray-500 mt-2">請執行初始化腳本</p>
        </div>
      </div>
    );
  }

  return (
    <div className="p-6">
      <div className="space-y-3">
        {items.map((item) => {
          const badge = getStatusBadge(item.update_status);
          return (
            <div
              key={item.id}
              className="bg-white rounded-lg border border-gray-200 p-4 hover:shadow-md transition-shadow"
            >
              <div className="flex items-start justify-between">
                <div className="flex-1">
                  <div className="flex items-center gap-3">
                    <h3 className="font-semibold text-gray-900">{item.name}</h3>
                    <span className={`px-2 py-1 rounded text-xs font-medium ${badge.class}`}>
                      {badge.text}
                    </span>
                  </div>
                  {item.description && (
                    <p className="text-sm text-gray-600 mt-1">{item.description}</p>
                  )}
                  <div className="flex items-center gap-6 mt-3 text-sm text-gray-600">
                    <div>
                      <span className="text-gray-500">當前：</span>
                      <span className="font-medium">{item.current_version || '-'}</span>
                    </div>
                    <div>
                      <span className="text-gray-500">最新：</span>
                      <span className="font-medium">{item.latest_version || '-'}</span>
                    </div>
                    {item.official_url && (
                      <a
                        href={item.official_url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-blue-600 hover:text-blue-700 flex items-center gap-1"
                      >
                        <ExternalLink className="h-4 w-4" />
                        官網
                      </a>
                    )}
                    {item.github_url && (
                      <a
                        href={item.github_url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-blue-600 hover:text-blue-700 flex items-center gap-1"
                      >
                        <Github className="h-4 w-4" />
                        GitHub
                      </a>
                    )}
                  </div>
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};
