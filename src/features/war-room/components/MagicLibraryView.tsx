'use client';

/**
 * 魔法圖書館視圖 - 列表式
 */

import { ExternalLink, Github } from 'lucide-react';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';

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
    unknown: { text: '未知', class: 'bg-gray-100 text-gray-700' },
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
    <div className="h-full flex flex-col">
      <div className="flex-1 overflow-auto">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead className="w-[200px]">名稱</TableHead>
              <TableHead className="w-[120px]">分類</TableHead>
              <TableHead className="w-[100px]">當前版本</TableHead>
              <TableHead className="w-[100px]">最新版本</TableHead>
              <TableHead className="w-[100px]">狀態</TableHead>
              <TableHead className="w-[300px]">說明</TableHead>
              <TableHead className="w-[120px] text-center">連結</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {items.map((item) => {
              const badge = getStatusBadge(item.update_status);
              return (
                <TableRow key={item.id} className="hover:bg-morandi-container/30">
                  <TableCell className="font-medium">{item.name}</TableCell>
                  <TableCell>
                    <span className="px-2 py-1 bg-morandi-container text-morandi-primary rounded text-xs">
                      {item.category}
                    </span>
                  </TableCell>
                  <TableCell className="text-sm text-morandi-secondary">
                    {item.current_version || '-'}
                  </TableCell>
                  <TableCell className="text-sm text-morandi-secondary">
                    {item.latest_version || '-'}
                  </TableCell>
                  <TableCell>
                    <span className={`px-2 py-1 rounded text-xs font-medium ${badge.class}`}>
                      {badge.text}
                    </span>
                  </TableCell>
                  <TableCell className="text-sm text-morandi-secondary">
                    {item.description || '-'}
                  </TableCell>
                  <TableCell>
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
