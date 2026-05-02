'use client'
/**
 * TourLeadersPage - 領隊資料管理頁面
 */

import { logger } from '@/lib/utils/logger'
import React, { useState, useCallback } from 'react'
import { ContentPageLayout } from '@/components/layout/content-page-layout'
import { Users, Plus } from 'lucide-react'
import { TourLeadersList } from './TourLeadersList'
import { TourLeadersDialog } from './TourLeadersDialog'
import { LeaderAvailabilityDialog } from './LeaderAvailabilityDialog'
import { useTourLeaders, createTourLeader, updateTourLeader, deleteTourLeader } from '@/data'
import type { TourLeader, TourLeaderFormData } from '@/types/tour-leader.types'
import { confirm, alert } from '@/lib/ui/alert-dialog'
import { TOUR_LEADERS_LABELS } from '../constants/labels'

const emptyFormData: TourLeaderFormData = {
  name: '',
  english_name: '',
  photo: '',
  phone: '',
  domestic_phone: '',
  overseas_phone: '',
  email: '',
  address: '',
  national_id: '',
  passport_number: '',
  passport_expiry: '',
  languages: '',
  specialties: '',
  license_number: '',
  notes: '',
  status: 'active',
}

export const TourLeadersPage: React.FC = () => {
  const [searchQuery, setSearchQuery] = useState('')
  const [isDialogOpen, setIsDialogOpen] = useState(false)
  const [isEditMode, setIsEditMode] = useState(false)
  const [editingItem, setEditingItem] = useState<TourLeader | null>(null)
  const [formData, setFormData] = useState<TourLeaderFormData>(emptyFormData)
  const [isAvailabilityDialogOpen, setIsAvailabilityDialogOpen] = useState(false)
  const [availabilityLeader, setAvailabilityLeader] = useState<TourLeader | null>(null)

  // SWR 自動載入資料，不需要手動 fetchAll
  const { items: tourLeaders, loading } = useTourLeaders()

  // 過濾資料
  const filteredItems = tourLeaders.filter(item => {
    if (!searchQuery) return true
    const query = searchQuery.toLowerCase()
    return (
      item.name?.toLowerCase().includes(query) ||
      item.english_name?.toLowerCase().includes(query) ||
      item.phone?.toLowerCase().includes(query) ||
      item.code?.toLowerCase().includes(query)
    )
  })

  const handleOpenAddDialog = useCallback(() => {
    setIsEditMode(false)
    setEditingItem(null)
    setFormData(emptyFormData)
    setIsDialogOpen(true)
  }, [])

  const handleEdit = useCallback((item: TourLeader) => {
    setIsEditMode(true)
    setEditingItem(item)
    setFormData({
      name: item.name || '',
      english_name: item.english_name || '',
      photo: item.photo || '',
      phone: item.phone || '',
      domestic_phone: item.domestic_phone || '',
      overseas_phone: item.overseas_phone || '',
      email: item.email || '',
      address: item.address || '',
      national_id: item.national_id || '',
      passport_number: item.passport_number || '',
      passport_expiry: item.passport_expiry || '',
      languages: item.languages?.join(', ') || '',
      specialties: item.specialties?.join(', ') || '',
      license_number: item.license_number || '',
      notes: item.notes || '',
      status: item.status || 'active',
    })
    setIsDialogOpen(true)
  }, [])

  const handleOpenAvailability = useCallback((item: TourLeader) => {
    setAvailabilityLeader(item)
    setIsAvailabilityDialogOpen(true)
  }, [])

  const handleCloseAvailability = useCallback(() => {
    setIsAvailabilityDialogOpen(false)
    setAvailabilityLeader(null)
  }, [])

  const handleDelete = useCallback(async (item: TourLeader) => {
    const confirmed = await confirm(
      `${TOUR_LEADERS_LABELS.CONFIRM_DELETE_LEADER}${item.name}${TOUR_LEADERS_LABELS.CONFIRM_DELETE_SUFFIX}`,
      {
        title: TOUR_LEADERS_LABELS.DELETE_LEADER_TITLE,
        type: 'warning',
      }
    )
    if (!confirmed) return

    try {
      await deleteTourLeader(item.id)
      await alert(TOUR_LEADERS_LABELS.LEADER_DELETED, 'success')
    } catch (error) {
      logger.error('Delete TourLeader Error:', error)
      await alert(TOUR_LEADERS_LABELS.DELETE_FAILED, 'error')
    }
  }, [])

  const handleCloseDialog = useCallback(() => {
    setIsDialogOpen(false)
    setIsEditMode(false)
    setEditingItem(null)
    setFormData(emptyFormData)
  }, [])

  const handleFormFieldChange = useCallback(
    <K extends keyof TourLeaderFormData>(field: K, value: TourLeaderFormData[K]) => {
      setFormData(prev => ({ ...prev, [field]: value }))
    },
    []
  )

  const handleSubmit = useCallback(async () => {
    try {
      const data = {
        name: formData.name,
        english_name: formData.english_name || null,
        photo: formData.photo || null,
        phone: formData.phone || null,
        domestic_phone: formData.domestic_phone || null,
        overseas_phone: formData.overseas_phone || null,
        email: formData.email || null,
        address: formData.address || null,
        national_id: formData.national_id || null,
        passport_number: formData.passport_number || null,
        passport_expiry: formData.passport_expiry || null,
        languages: formData.languages
          ? formData.languages
              .split(',')
              .map(s => s.trim())
              .filter(Boolean)
          : [],
        specialties: formData.specialties
          ? formData.specialties
              .split(',')
              .map(s => s.trim())
              .filter(Boolean)
          : [],
        license_number: formData.license_number || null,
        notes: formData.notes || null,
        status: formData.status,
      }

      if (isEditMode && editingItem) {
        await updateTourLeader(editingItem.id, data)
        await alert(TOUR_LEADERS_LABELS.LEADER_UPDATED, 'success')
      } else {
        await createTourLeader(data)
        await alert(TOUR_LEADERS_LABELS.LEADER_CREATED, 'success')
      }
      handleCloseDialog()
    } catch (error) {
      logger.error('Save TourLeader Error:', error)
      await alert(TOUR_LEADERS_LABELS.SAVE_FAILED, 'error')
    }
  }, [formData, isEditMode, editingItem, handleCloseDialog])

  return (
    <ContentPageLayout
      title={TOUR_LEADERS_LABELS.PAGE_TITLE}
      icon={Users}
      breadcrumb={[
        { label: TOUR_LEADERS_LABELS.BREADCRUMB_HOME, href: '/dashboard' },
        { label: TOUR_LEADERS_LABELS.BREADCRUMB_DATABASE, href: '/database' },
        { label: TOUR_LEADERS_LABELS.BREADCRUMB_TOUR_LEADERS, href: '/database/tour-leaders' },
      ]}
      showSearch
      searchTerm={searchQuery}
      onSearchChange={setSearchQuery}
      searchPlaceholder={TOUR_LEADERS_LABELS.SEARCH_PLACEHOLDER}
      primaryAction={{
        label: TOUR_LEADERS_LABELS.ADD_LEADER,
        icon: Plus,
        onClick: handleOpenAddDialog,
      }}
    >
      <TourLeadersList
        items={filteredItems}
        loading={loading}
        onEdit={handleEdit}
        onDelete={handleDelete}
        onAvailability={handleOpenAvailability}
      />

      <TourLeadersDialog
        isOpen={isDialogOpen}
        isEditMode={isEditMode}
        onClose={handleCloseDialog}
        formData={formData}
        onFormFieldChange={handleFormFieldChange}
        onSubmit={handleSubmit}
      />

      <LeaderAvailabilityDialog
        isOpen={isAvailabilityDialogOpen}
        onClose={handleCloseAvailability}
        leader={availabilityLeader}
      />
    </ContentPageLayout>
  )
}
