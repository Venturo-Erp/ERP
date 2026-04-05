'use client'
/**
 * CompanyAssetsList - 公司資源列表
 */

import React from 'react'
import { EnhancedTable, type TableColumn } from '@/components/ui/enhanced-table'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import {
  Edit2,
  Trash2,
  Eye,
  FileText,
  Image as ImageIcon,
  Video,
  Download,
  Lock,
} from 'lucide-react'
import { supabase } from '@/lib/supabase/client'
import { format } from 'date-fns'
import { zhTW } from 'date-fns/locale'
import type { CompanyAsset, CompanyAssetType } from '@/types/company-asset.types'
import { COMPANY_ASSETS_LABELS } from '../constants/labels'

interface CompanyAssetsListProps {
  assets: CompanyAsset[]
  loading?: boolean
  onEdit?: (asset: CompanyAsset) => void
  onDelete?: (asset: CompanyAsset) => void
  onPreview?: (asset: CompanyAsset) => void
  onDownload?: (asset: CompanyAsset) => void
  onThumbnailClick?: (asset: CompanyAsset) => void
}

// 檔案類型中文對應
const TYPE_LABELS: Record<CompanyAssetType, string> = {
  document: COMPANY_ASSETS_LABELS.文件,
  image: COMPANY_ASSETS_LABELS.圖片,
  video: COMPANY_ASSETS_LABELS.影片,
}

// 檔案類型圖示
const TypeIcon: React.FC<{ type: CompanyAssetType }> = ({ type }) => {
  switch (type) {
    case 'document':
      return <FileText size={14} />
    case 'image':
      return <ImageIcon size={14} />
    case 'video':
      return <Video size={14} />
  }
}

export const CompanyAssetsList: React.FC<CompanyAssetsListProps> = ({
  assets,
  loading = false,
  onEdit,
  onDelete,
  onPreview,
  onDownload,
  onThumbnailClick,
}) => {
  const columns: TableColumn[] = [
    {
      key: 'thumbnail',
      label: COMPANY_ASSETS_LABELS.縮圖,
      width: '80px',
      render: (_value, row) => {
        const asset = row as CompanyAsset
        const { data } = supabase.storage.from('company-assets').getPublicUrl(asset.file_path)

        return (
          <div
            className="w-10 h-10 rounded border border-border overflow-hidden bg-morandi-container/20 flex items-center justify-center cursor-pointer hover:opacity-80 transition-opacity"
            onClick={e => {
              e.stopPropagation()
              onThumbnailClick?.(asset)
            }}
          >
            {asset.asset_type === 'image' ? (
              <img src={data.publicUrl} alt={asset.name} className="w-full h-full object-cover" />
            ) : asset.asset_type === 'video' ? (
              <Video className="h-5 w-5 text-morandi-secondary" />
            ) : (
              <FileText className="h-5 w-5 text-morandi-secondary" />
            )}
          </div>
        )
      },
    },
    {
      key: 'name',
      label: COMPANY_ASSETS_LABELS.檔案名稱,
      sortable: true,
      render: (value, row) => {
        const asset = row as CompanyAsset
        return (
          <div className="flex items-center gap-2">
            <span className="font-medium text-morandi-primary">{String(value || '')}</span>
            {asset.restricted && (
              <span className="inline-flex items-center gap-1 text-xs text-status-warning bg-status-warning-bg px-1.5 py-0.5 rounded">
                <Lock size={12} />
                {COMPANY_ASSETS_LABELS.LABEL_7861}
              </span>
            )}
          </div>
        )
      },
    },
    {
      key: 'asset_type',
      label: COMPANY_ASSETS_LABELS.檔案類型,
      sortable: true,
      width: '100px',
      render: value => {
        const type = value as CompanyAssetType
        const label = TYPE_LABELS[type] || String(value)
        return (
          <Badge variant="secondary" className="text-xs gap-1">
            <TypeIcon type={type} />
            {label}
          </Badge>
        )
      },
    },
    {
      key: 'created_at',
      label: COMPANY_ASSETS_LABELS.上傳時間,
      sortable: true,
      width: '150px',
      render: value => (
        <span className="text-sm text-morandi-secondary">
          {value ? format(new Date(String(value)), 'yyyy/MM/dd HH:mm', { locale: zhTW }) : '-'}
        </span>
      ),
    },
  ]

  return (
    <EnhancedTable
      className="min-h-full"
      columns={columns}
      data={assets}
      loading={loading}
      actions={row => {
        const asset = row as CompanyAsset
        return (
          <div className="flex items-center gap-1">
            {onPreview && (
              <Button
                variant="ghost"
                size="iconSm"
                onClick={e => {
                  e.stopPropagation()
                  onPreview(asset)
                }}
                className="text-morandi-secondary hover:bg-morandi-container/20"
                title={COMPANY_ASSETS_LABELS.預覽}
              >
                <Eye size={16} />
              </Button>
            )}
            {onDownload && (
              <Button
                variant="ghost"
                size="iconSm"
                onClick={e => {
                  e.stopPropagation()
                  onDownload(asset)
                }}
                className="text-morandi-green hover:bg-morandi-green/10"
                title={COMPANY_ASSETS_LABELS.下載}
              >
                <Download size={16} />
              </Button>
            )}
            {onEdit && (
              <Button
                variant="ghost"
                size="iconSm"
                onClick={e => {
                  e.stopPropagation()
                  onEdit(asset)
                }}
                className="text-morandi-blue hover:bg-morandi-blue/10"
                title={COMPANY_ASSETS_LABELS.編輯}
              >
                <Edit2 size={16} />
              </Button>
            )}
            {onDelete && (
              <Button
                variant="ghost"
                size="iconSm"
                onClick={e => {
                  e.stopPropagation()
                  onDelete(asset)
                }}
                className="text-morandi-red hover:bg-morandi-red/10"
                title={COMPANY_ASSETS_LABELS.刪除}
              >
                <Trash2 size={16} />
              </Button>
            )}
          </div>
        )
      }}
    />
  )
}
