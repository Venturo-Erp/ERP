'use client'

import { useState, useCallback, useMemo, useEffect } from 'react'
import { Tour } from '@/stores/types'
import { City } from '@/stores/region-store'
import { NewTourData, TourExtraFields, DeleteConfirmState } from '../types'
import { OrderFormData } from '@/features/orders/components/add-order-form'

// localStorage key for status tab memory
const STATUS_TAB_KEY = 'venturo-tours-status-tab'

export function useTourPageState() {
  // Selected tour
  const [selectedTour, setSelectedTour] = useState<Tour | null>(null)

  // Pagination and filtering state
  const [currentPage, setCurrentPage] = useState(1)
  const [sortBy, setSortBy] = useState('departure_date')
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('asc')
  const [selectedRows, setSelectedRows] = useState<string[]>([])
  const [expandedRows, setExpandedRows] = useState<string[]>([])

  // 先用預設值，避免 hydration mismatch
  const [activeStatusTab, setActiveStatusTabState] = useState('all')

  // 客戶端 mount 後從 localStorage 讀取上次的狀態 Tab
  useEffect(() => {
    const saved = localStorage.getItem(STATUS_TAB_KEY)
    if (saved) setActiveStatusTabState(saved)
  }, [])

  // 包裝 setActiveStatusTab，同時保存到 localStorage
  const setActiveStatusTab = useCallback((tab: string) => {
    setActiveStatusTabState(tab)
    if (typeof window !== 'undefined') {
      localStorage.setItem(STATUS_TAB_KEY, tab)
    }
  }, [])
  const [viewMode, setViewMode] = useState<'card' | 'list'>('list')
  const [searchQuery, setSearchQuery] = useState('')
  const [deleteConfirm, setDeleteConfirm] = useState<DeleteConfirmState>({
    isOpen: false,
    tour: null,
  })
  const pageSize = 10

  // UI state
  const [activeTabs, setActiveTabs] = useState<Record<string, string>>({})
  const [submitting, setSubmitting] = useState(false)
  const [formError, setFormError] = useState<string | null>(null)

  // Expanded mode triggers for each tour
  const [triggerAddOnAdd, setTriggerAddOnAdd] = useState<Record<string, boolean>>({})
  const [triggerRefundAdd, setTriggerRefundAdd] = useState<Record<string, boolean>>({})
  const [triggerPaymentAdd, setTriggerPaymentAdd] = useState<Record<string, boolean>>({})
  const [triggerCostAdd, setTriggerCostAdd] = useState<Record<string, boolean>>({})

  // Dynamic field state - tracks enabled extra fields for each tour
  const [tourExtraFields, setTourExtraFields] = useState<Record<string, TourExtraFields>>({})

  // New tour form data
  const [newTour, setNewTour] = useState<NewTourData>({
    name: '',
    countryCode: '',
    cityCode: '',
    departure_date: '',
    return_date: '',
    price: 0,
    status: 'proposed',
    isSpecial: false,
    max_participants: 20,
    description: '',
  })

  // New order form data
  const [newOrder, setNewOrder] = useState<Partial<OrderFormData>>({
    contact_person: '',
    sales_person: '',
    assistant: '',
    member_count: 1,
    total_amount: 0,
  })

  // Available cities for selected country
  const [availableCities, setAvailableCities] = useState<City[]>([])

  // Toggle row expand
  const toggleRowExpand = useCallback((tour_id: string) => {
    setExpandedRows(prev =>
      prev.includes(tour_id) ? prev.filter(id => id !== tour_id) : [...prev, tour_id]
    )
    // Set default tab to overview
    setActiveTabs(prev => {
      if (!prev[tour_id]) {
        return { ...prev, [tour_id]: 'overview' }
      }
      return prev
    })
  }, [])

  // Set active tab
  const setActiveTab = useCallback((tour_id: string, tabId: string) => {
    setActiveTabs(prev => ({ ...prev, [tour_id]: tabId }))
  }, [])

  // Get status color
  const getStatusColor = useCallback((status: string) => {
    const colors: Record<string, string> = {
      提案: 'text-morandi-gold font-medium',
      進行中: 'text-morandi-gold',
      結案: 'text-morandi-green',
      取消: 'text-morandi-red',
    }
    return colors[status] || 'text-morandi-secondary'
  }, [])

  return {
    // State
    selectedTour,
    setSelectedTour,
    currentPage,
    setCurrentPage,
    sortBy,
    setSortBy,
    sortOrder,
    setSortOrder,
    selectedRows,
    setSelectedRows,
    expandedRows,
    setExpandedRows,
    activeStatusTab,
    setActiveStatusTab,
    viewMode,
    setViewMode,
    searchQuery,
    setSearchQuery,
    deleteConfirm,
    setDeleteConfirm,
    pageSize,
    activeTabs,
    setActiveTabs,
    submitting,
    setSubmitting,
    formError,
    setFormError,
    triggerAddOnAdd,
    setTriggerAddOnAdd,
    triggerRefundAdd,
    setTriggerRefundAdd,
    triggerPaymentAdd,
    setTriggerPaymentAdd,
    triggerCostAdd,
    setTriggerCostAdd,
    tourExtraFields,
    setTourExtraFields,
    newTour,
    setNewTour,
    newOrder,
    setNewOrder,
    availableCities,
    setAvailableCities,

    // Methods
    toggleRowExpand,
    setActiveTab,
    getStatusColor,
  }
}
