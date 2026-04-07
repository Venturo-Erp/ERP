import { useState, useCallback, useMemo } from 'react'
import { useToursSlim, useOrders, useSuppliersSlim, useEmployeesSlim } from '@/data'
import { useAuthStore } from '@/stores'
import { RequestFormData, RequestItem } from '../types'
import type { PaymentItemCategory } from '@/stores/types'
import { REQUEST_FORM_HOOK_LABELS } from '../../constants/labels'

// 計算下一個週四（如果今天是週四，跳到下週四）
function getNextThursdayDate(): string {
  const today = new Date()
  const dayOfWeek = today.getDay()
  let daysUntilThursday = 4 - dayOfWeek
  if (daysUntilThursday <= 0) daysUntilThursday += 7
  const nextThursday = new Date(today)
  nextThursday.setDate(today.getDate() + daysUntilThursday)
  const year = nextThursday.getFullYear()
  const month = String(nextThursday.getMonth() + 1).padStart(2, '0')
  const day = String(nextThursday.getDate()).padStart(2, '0')
  return `${year}-${month}-${day}`
}

export function useRequestForm() {
  // 使用 @/data 的 SWR hooks（和 usePaymentForm 一致）
  const { items: tours } = useToursSlim()
  const { items: orders } = useOrders()
  const { items: suppliers } = useSuppliersSlim()
  const { items: employees } = useEmployeesSlim()

  // 獲取當前登入用戶
  const currentUser = useAuthStore(state => state.user)

  const [formData, setFormData] = useState<RequestFormData>({
    request_category: 'tour', // 預設團體請款
    tour_id: '',
    order_id: '',
    expense_type: '', // 公司請款時使用
    request_date: '',
    notes: '',
    is_special_billing: false,
    created_by: currentUser?.id || '',
    payment_method_id: '', // 付款方式
  })

  const [requestItems, setRequestItems] = useState<RequestItem[]>(() => [
    {
      id: Math.random().toString(36).substr(2, 9),
      request_date: getNextThursdayDate(),
      payment_method_id: undefined,
      category: '' as PaymentItemCategory, // 不預設類別，由用戶選擇
      supplier_id: '',
      supplierName: '',
      description: '',
      unit_price: 0,
      quantity: 1,
    },
  ])

  // Search states
  const [tourSearchValue, setTourSearchValue] = useState('')
  const [orderSearchValue, setOrderSearchValue] = useState('')
  const [showTourDropdown, setShowTourDropdown] = useState(false)
  const [showOrderDropdown, setShowOrderDropdown] = useState(false)

  // Filter tours by search
  const filteredTours = useMemo(
    () =>
      tours.filter(tour => {
        const searchTerm = tourSearchValue.toLowerCase()
        if (!searchTerm) return true

        const tourCode = tour.code?.toLowerCase() || ''
        const tour_name = tour.name?.toLowerCase() || ''
        const departure_date = tour.departure_date || ''
        const dateNumbers = departure_date.replace(/\D/g, '').slice(-4)

        return (
          tourCode.includes(searchTerm) ||
          tour_name.includes(searchTerm) ||
          dateNumbers.includes(searchTerm.replace(/\D/g, ''))
        )
      }),
    [tours, tourSearchValue]
  )

  // Filter orders by search and selected tour
  const filteredOrders = useMemo(
    () =>
      orders.filter(order => {
        if (!formData.tour_id) return false
        if (order.tour_id !== formData.tour_id) return false

        const searchTerm = orderSearchValue.toLowerCase()
        if (!searchTerm) return true

        const order_number = order.order_number?.toLowerCase() || ''
        const contact_person = order.contact_person?.toLowerCase() || ''

        return order_number.includes(searchTerm) || contact_person.includes(searchTerm)
      }),
    [orders, formData.tour_id, orderSearchValue]
  )

  // Calculate total amount
  const total_amount = useMemo(
    () => requestItems.reduce((sum, item) => sum + item.unit_price * item.quantity, 0),
    [requestItems]
  )

  // Combine suppliers and employees into one list
  const combinedSuppliers = useMemo(() => {
    const supplierList = suppliers.map(s => ({
      id: s.id,
      name: s.name,
      type: 'supplier' as const,
      group: REQUEST_FORM_HOOK_LABELS.SUPPLIER,
    }))

    // 過濾掉機器人（BOT001）
    const employeeList = employees
      .filter(
        e => e.employee_number !== 'BOT001' && e.id !== '00000000-0000-0000-0000-000000000001'
      )
      .map(e => ({
        id: e.id,
        name: e.display_name,
        type: 'employee' as const,
        group: REQUEST_FORM_HOOK_LABELS.EMPLOYEE,
      }))

    return [...supplierList, ...employeeList]
  }, [suppliers, employees])

  // Add a new empty item to the list
  const addNewEmptyItem = useCallback(() => {
    const newItem: RequestItem = {
      id: Math.random().toString(36).substr(2, 9),
      request_date: getNextThursdayDate(),
      payment_method_id: undefined,
      category: '' as PaymentItemCategory, // 不預設類別，由用戶選擇
      supplier_id: '',
      supplierName: '',
      description: '',
      unit_price: 0,
      quantity: 1,
    }
    setRequestItems(prev => [...prev, newItem])
  }, [])

  // Update an item in the list
  const updateItem = useCallback((itemId: string, updatedFields: Partial<RequestItem>) => {
    setRequestItems(prev =>
      prev.map(item => (item.id === itemId ? { ...item, ...updatedFields } : item))
    )
  }, [])

  // Remove item from list
  const removeItem = useCallback((itemId: string) => {
    setRequestItems(prev => prev.filter(item => item.id !== itemId))
  }, [])

  // Reset form
  const resetForm = useCallback(() => {
    setFormData({
      request_category: 'tour',
      tour_id: '',
      order_id: '',
      expense_type: '',
      request_date: getNextThursdayDate(), // ✅ 預設下週四
      notes: '',
      is_special_billing: false,
      created_by: currentUser?.id || '',
    })
    setRequestItems([
      {
        id: Math.random().toString(36).substr(2, 9),
        request_date: getNextThursdayDate(),
        payment_method_id: undefined,
        category: '' as PaymentItemCategory, // 不預設類別，由用戶選擇
        supplier_id: '',
        supplierName: '',
        description: '',
        unit_price: 0,
        quantity: 1,
      },
    ])
    setTourSearchValue('')
    setOrderSearchValue('')
    setShowTourDropdown(false)
    setShowOrderDropdown(false)
  }, [currentUser?.id])

  return {
    formData,
    setFormData,
    requestItems,
    setRequestItems,
    tourSearchValue,
    setTourSearchValue,
    orderSearchValue,
    setOrderSearchValue,
    showTourDropdown,
    setShowTourDropdown,
    showOrderDropdown,
    setShowOrderDropdown,
    filteredTours,
    filteredOrders,
    total_amount,
    addNewEmptyItem,
    updateItem,
    removeItem,
    resetForm,
    suppliers: combinedSuppliers,
    tours,
    orders,
    currentUser, // 當前登入用戶
  }
}
