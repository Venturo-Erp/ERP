'use client'

import { logger } from '@/lib/utils/logger'
import { useState, useEffect, useMemo } from 'react'
import { Button } from '@/components/ui/button'
import { Sparkles, Award, Users, Clock, Edit2, Power, Trash2, X, Save } from 'lucide-react'
import { supabase } from '@/lib/supabase/client'
import { deletePremiumExperience } from '@/data/entities/premium-experiences'
import { dynamicFrom } from '@/lib/supabase/typed-client'
import { toast } from 'sonner'
import { EnhancedTable } from '@/components/ui/enhanced-table'
import { cn } from '@/lib/utils'
import { confirm } from '@/lib/ui/alert-dialog'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog'
import { Input } from '@/components/ui/input'
import {
  ATTRACTIONS_LIST_LABELS,
  MICHELIN_RESTAURANTS_TAB_LABELS,
  PREMIUM_EXPERIENCES_TAB_LABELS,
} from '../../constants/labels'

interface PremiumExperience {
  id: string
  name: string
  english_name?: string
  category: string
  country_id: string
  city_id: string
  exclusivity_level: string
  description?: string
  highlights?: string[]
  duration_hours?: number
  group_size_min?: number
  group_size_max?: number
  price_per_person_min?: number
  price_per_person_max?: number
  currency?: string
  expert_name?: string
  expert_credentials?: string
  commission_rate?: number
  recommended_for?: string[]
  is_active: boolean
}

interface PremiumExperiencesTabProps {
  selectedCountry: string
}

export default function PremiumExperiencesTab({ selectedCountry }: PremiumExperiencesTabProps) {
  const [experiences, setExperiences] = useState<PremiumExperience[]>([])
  const [loading, setLoading] = useState(true)
  const [countries, setCountries] = useState<Array<{ id: string; name: string; emoji?: string }>>(
    []
  )
  const [cities, setCities] = useState<Array<{ id: string; name: string }>>([])

  const [editingExperience, setEditingExperience] = useState<PremiumExperience | null>(null)
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false)

  // 載入體驗資料
  useEffect(() => {
    loadExperiences()
  }, [])

  async function loadExperiences() {
    try {
      const { data, error } = await supabase
        .from('premium_experiences')
        .select('id, name, english_name, description, category, country_id, city_id, exclusivity_level, images, is_active, is_featured, created_at')
        .order('exclusivity_level', { ascending: false })
        .order('name')
        .limit(1000)

      if (error) throw error
      setExperiences((data as unknown as PremiumExperience[]) || [])

      // 載入用到的國家和城市資料
      if (data && data.length > 0) {
        const countryIds = Array.from(new Set(data.map(e => e.country_id).filter(Boolean)))
        const cityIds = Array.from(new Set(data.map(e => e.city_id).filter(Boolean)))

        if (countryIds.length > 0) {
          supabase
            .from('countries')
            .select('id, name, emoji')
            .in('id', countryIds)
            .limit(500)
            .then(({ data }) => {
              if (data)
                setCountries(
                  data.map(c => ({ id: c.id, name: c.name, emoji: c.emoji ?? undefined }))
                )
            })
        }

        if (cityIds.length > 0) {
          supabase
            .from('cities')
            .select('id, name')
            .in('id', cityIds)
            .limit(500)
            .then(({ data }) => {
              if (data) setCities(data.map(c => ({ id: c.id, name: c.name })))
            })
        }
      }
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error)
      logger.error('載入頂級體驗失敗:', error)
      toast.error(MICHELIN_RESTAURANTS_TAB_LABELS.載入失敗 + errorMessage)
    } finally {
      setLoading(false)
    }
  }

  // 刪除體驗
  const handleDelete = async (id: string) => {
    const confirmed = await confirm(PREMIUM_EXPERIENCES_TAB_LABELS.確定要刪除此體驗, {
      title: PREMIUM_EXPERIENCES_TAB_LABELS.刪除體驗,
      type: 'warning',
    })
    if (!confirmed) return

    try {
      await deletePremiumExperience(id)
      await loadExperiences()
      toast.success(MICHELIN_RESTAURANTS_TAB_LABELS.刪除成功)
    } catch (error) {
      toast.error(MICHELIN_RESTAURANTS_TAB_LABELS.刪除失敗)
    }
  }

  // 開啟編輯對話框
  const handleEdit = (experience: PremiumExperience) => {
    setEditingExperience(experience)
    setIsEditDialogOpen(true)
  }

  // 關閉編輯對話框
  const handleCloseEdit = () => {
    setEditingExperience(null)
    setIsEditDialogOpen(false)
  }

  // 更新體驗
  const handleUpdate = async (updatedData: Partial<PremiumExperience>) => {
    if (!editingExperience) return

    try {
      const { error } = await dynamicFrom('premium_experiences')
        .update(updatedData)
        .eq('id', editingExperience.id)

      if (error) throw error
      await loadExperiences()
      handleCloseEdit()
      toast.success(MICHELIN_RESTAURANTS_TAB_LABELS.更新成功)
    } catch (error) {
      toast.error(MICHELIN_RESTAURANTS_TAB_LABELS.更新失敗)
    }
  }

  // 切換啟用狀態
  const handleToggleStatus = async (experience: PremiumExperience) => {
    const newStatus = !experience.is_active
    setExperiences(prev =>
      prev.map(item => (item.id === experience.id ? { ...item, is_active: newStatus } : item))
    )

    try {
      const { error } = await supabase
        .from('premium_experiences')
        .update({ is_active: newStatus })
        .eq('id', experience.id)

      if (error) throw error
      toast.success(newStatus ? '已啟用' : MICHELIN_RESTAURANTS_TAB_LABELS.已停用)
    } catch (error) {
      setExperiences(prev =>
        prev.map(item =>
          item.id === experience.id ? { ...item, is_active: experience.is_active } : item
        )
      )
      toast.error(PREMIUM_EXPERIENCES_TAB_LABELS.更新失敗)
    }
  }

  // 獨特性等級顏色
  const getExclusivityColor = (level: string) => {
    switch (level) {
      case 'ultra_exclusive':
        return 'bg-morandi-container text-morandi-secondary border-morandi-secondary/30'
      case 'highly_exclusive':
        return 'bg-rose-100 text-rose-800 border-rose-300'
      case 'exclusive':
        return 'bg-status-warning-bg text-status-warning border-status-warning/30'
      case 'premium':
        return 'bg-status-info-bg text-status-info border-status-info/30'
      default:
        return 'bg-muted text-foreground border-border'
    }
  }

  // 獨特性等級文字
  const getExclusivityLabel = (level: string) => {
    switch (level) {
      case 'ultra_exclusive':
        return PREMIUM_EXPERIENCES_TAB_LABELS.極致獨家
      case 'highly_exclusive':
        return PREMIUM_EXPERIENCES_TAB_LABELS.高度獨家
      case 'exclusive':
        return PREMIUM_EXPERIENCES_TAB_LABELS.獨家
      case 'premium':
        return PREMIUM_EXPERIENCES_TAB_LABELS.精品
      default:
        return level
    }
  }

  // 類別文字
  const getCategoryLabel = (category: string) => {
    const labels: Record<string, string> = {
      cultural_immersion: PREMIUM_EXPERIENCES_TAB_LABELS.文化沉浸,
      exclusive_access: PREMIUM_EXPERIENCES_TAB_LABELS.獨家通道,
      culinary_mastery: PREMIUM_EXPERIENCES_TAB_LABELS.烹飪大師,
      artisan_workshop: PREMIUM_EXPERIENCES_TAB_LABELS.工藝工作坊,
      private_performance: PREMIUM_EXPERIENCES_TAB_LABELS.私人表演,
      nature_adventure: PREMIUM_EXPERIENCES_TAB_LABELS.自然探險,
      wellness_retreat: PREMIUM_EXPERIENCES_TAB_LABELS.養生靜修,
    }
    return labels[category] || category
  }

  // 根據國家篩選體驗
  const filteredExperiences = useMemo(() => {
    if (!selectedCountry) return experiences
    return experiences.filter(e => e.country_id === selectedCountry)
  }, [experiences, selectedCountry])

  // 定義表格欄位
  const columns = useMemo(
    () => [
      {
        key: 'name',
        label: PREMIUM_EXPERIENCES_TAB_LABELS.體驗名稱,
        sortable: true,
        render: (_: unknown, experience: PremiumExperience) => (
          <div className="min-w-[180px]">
            <div className="font-medium text-morandi-primary line-clamp-1">{experience.name}</div>
            {experience.english_name && (
              <div className="text-xs text-morandi-muted line-clamp-1">
                {experience.english_name}
              </div>
            )}
          </div>
        ),
      },
      {
        key: 'exclusivity_level',
        label: PREMIUM_EXPERIENCES_TAB_LABELS.獨特性,
        sortable: true,
        render: (_: unknown, experience: PremiumExperience) => (
          <span
            className={`px-2 py-1 text-xs font-medium rounded border ${getExclusivityColor(
              experience.exclusivity_level
            )}`}
          >
            {getExclusivityLabel(experience.exclusivity_level)}
          </span>
        ),
      },
      {
        key: 'category',
        label: ATTRACTIONS_LIST_LABELS.類別,
        sortable: true,
        render: (_: unknown, experience: PremiumExperience) => (
          <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-morandi-gold/10 text-morandi-gold">
            {getCategoryLabel(experience.category)}
          </span>
        ),
      },
      {
        key: 'city',
        label: MICHELIN_RESTAURANTS_TAB_LABELS.地點,
        sortable: false,
        render: (_: unknown, experience: PremiumExperience) => {
          const country = countries.find(c => c.id === experience.country_id)
          const city = cities.find(c => c.id === experience.city_id)
          return (
            <div className="text-sm text-morandi-secondary line-clamp-1">{city?.name || '-'}</div>
          )
        },
      },
      {
        key: 'expert_name',
        label: PREMIUM_EXPERIENCES_TAB_LABELS.專家,
        sortable: true,
        render: (_: unknown, experience: PremiumExperience) => (
          <div className="min-w-[120px]">
            {experience.expert_name ? (
              <>
                <div className="text-sm text-morandi-primary font-medium">
                  {experience.expert_name}
                </div>
                {experience.expert_credentials && (
                  <div className="text-xs text-morandi-muted line-clamp-1">
                    {experience.expert_credentials}
                  </div>
                )}
              </>
            ) : (
              <span className="text-sm text-morandi-secondary">-</span>
            )}
          </div>
        ),
      },
      {
        key: 'duration',
        label: ATTRACTIONS_LIST_LABELS.時長,
        sortable: false,
        render: (_: unknown, experience: PremiumExperience) => (
          <div className="flex items-center gap-1 text-sm text-morandi-secondary">
            {experience.duration_hours ? (
              <>
                <Clock className="w-3 h-3" />
                <span>{experience.duration_hours}h</span>
              </>
            ) : (
              '-'
            )}
          </div>
        ),
      },
      {
        key: 'participants',
        label: PREMIUM_EXPERIENCES_TAB_LABELS.人數,
        sortable: false,
        render: (_: unknown, experience: PremiumExperience) => (
          <div className="flex items-center gap-1 text-sm text-morandi-secondary">
            {experience.group_size_min || experience.group_size_max ? (
              <>
                <Users className="w-3 h-3" />
                <span>
                  {experience.group_size_min || 1}-{experience.group_size_max || '∞'}
                </span>
              </>
            ) : (
              '-'
            )}
          </div>
        ),
      },
      {
        key: 'price',
        label: MICHELIN_RESTAURANTS_TAB_LABELS.價格,
        sortable: false,
        render: (_: unknown, experience: PremiumExperience) => (
          <div className="text-sm text-morandi-gold font-medium min-w-[100px]">
            {experience.price_per_person_min
              ? `${experience.price_per_person_min.toLocaleString()}${
                  experience.price_per_person_max &&
                  experience.price_per_person_max !== experience.price_per_person_min
                    ? `-${experience.price_per_person_max.toLocaleString()}`
                    : ''
                } ${experience.currency || 'TWD'}`
              : '-'}
          </div>
        ),
      },
      {
        key: 'is_active',
        label: ATTRACTIONS_LIST_LABELS.狀態,
        sortable: true,
        render: (_: unknown, experience: PremiumExperience) => (
          <span
            className={cn(
              'inline-flex items-center px-2 py-0.5 rounded text-xs font-medium',
              experience.is_active
                ? 'bg-morandi-green/80 text-white'
                : 'bg-morandi-container text-morandi-secondary'
            )}
          >
            {experience.is_active ? '啟用' : ATTRACTIONS_LIST_LABELS.停用}
          </span>
        ),
      },
    ],
    [countries, cities]
  )

  return (
    <>
      <div className="h-full flex flex-col">
        <div className="flex-1 overflow-auto">
          <EnhancedTable
            columns={columns as unknown as Parameters<typeof EnhancedTable>[0]['columns']}
            data={filteredExperiences}
            loading={loading}
            initialPageSize={20}
            onRowClick={handleEdit as (row: unknown) => void}
            actions={(row: unknown) => {
              const experience = row as PremiumExperience
              return (
                <div className="flex items-center gap-1">
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={e => {
                      e.stopPropagation()
                      handleEdit(experience)
                    }}
                    className="h-8 px-2 text-morandi-blue hover:bg-morandi-blue/10"
                    title={ATTRACTIONS_LIST_LABELS.編輯}
                  >
                    <Edit2 size={14} />
                  </Button>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={e => {
                      e.stopPropagation()
                      handleToggleStatus(experience)
                    }}
                    className="h-8 px-2"
                    title={experience.is_active ? '停用' : ATTRACTIONS_LIST_LABELS.啟用}
                  >
                    <Power
                      size={14}
                      className={
                        experience.is_active ? 'text-morandi-green' : 'text-morandi-secondary'
                      }
                    />
                  </Button>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={e => {
                      e.stopPropagation()
                      handleDelete(experience.id)
                    }}
                    className="h-8 px-2 hover:text-morandi-red hover:bg-morandi-red/10"
                    title={ATTRACTIONS_LIST_LABELS.刪除}
                  >
                    <Trash2 size={14} />
                  </Button>
                </div>
              )
            }}
          />
        </div>
      </div>

      {/* 編輯對話框 */}
      <Dialog open={isEditDialogOpen} onOpenChange={setIsEditDialogOpen}>
        <DialogContent level={1} className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{PREMIUM_EXPERIENCES_TAB_LABELS.EDIT_1717}</DialogTitle>
          </DialogHeader>
          {editingExperience && (
            <div className="space-y-4 py-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="text-sm font-medium">
                    {PREMIUM_EXPERIENCES_TAB_LABELS.NAME}
                  </label>
                  <Input
                    value={editingExperience.name}
                    onChange={e =>
                      setEditingExperience({ ...editingExperience, name: e.target.value })
                    }
                  />
                </div>
                <div>
                  <label className="text-sm font-medium">
                    {PREMIUM_EXPERIENCES_TAB_LABELS.LABEL_3778}
                  </label>
                  <Input
                    value={editingExperience.english_name || ''}
                    onChange={e =>
                      setEditingExperience({ ...editingExperience, english_name: e.target.value })
                    }
                  />
                </div>
              </div>
              <div>
                <label className="text-sm font-medium">
                  {PREMIUM_EXPERIENCES_TAB_LABELS.LABEL_3951}
                </label>
                <textarea
                  value={editingExperience.description || ''}
                  onChange={e =>
                    setEditingExperience({ ...editingExperience, description: e.target.value })
                  }
                  className="w-full px-3 py-2 border border-border rounded-md bg-card text-sm min-h-[100px]"
                />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="text-sm font-medium">
                    {PREMIUM_EXPERIENCES_TAB_LABELS.LABEL_1913}
                  </label>
                  <Input
                    value={editingExperience.expert_name || ''}
                    onChange={e =>
                      setEditingExperience({ ...editingExperience, expert_name: e.target.value })
                    }
                  />
                </div>
                <div>
                  <label className="text-sm font-medium">
                    {PREMIUM_EXPERIENCES_TAB_LABELS.LABEL_4473}
                  </label>
                  <Input
                    value={editingExperience.expert_credentials || ''}
                    onChange={e =>
                      setEditingExperience({
                        ...editingExperience,
                        expert_credentials: e.target.value,
                      })
                    }
                  />
                </div>
              </div>
            </div>
          )}
          <DialogFooter>
            <Button variant="outline" onClick={handleCloseEdit} className="gap-2">
              <X size={16} />
              {PREMIUM_EXPERIENCES_TAB_LABELS.CANCEL}
            </Button>
            <Button
              onClick={() => editingExperience && handleUpdate(editingExperience)}
              className="gap-2"
            >
              <Save size={16} />
              {PREMIUM_EXPERIENCES_TAB_LABELS.SAVE}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  )
}
