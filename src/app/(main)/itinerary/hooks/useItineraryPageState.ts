'use client'

import { useState, useCallback, useRef, useMemo } from 'react'
import type { Itinerary } from '@/stores/types'
import { ITINERARY_ACTIONS_LABELS } from '../constants/labels'

/**
 * Hook for managing itinerary page state
 *
 * 🔧 重要：使用 useMemo + 穩定的 ref pattern 來避免無限迴圈
 * - 所有 setter 函數都是穩定的（來自 useState）
 * - 所有 getter 函數都是穩定的（使用 useCallback + ref）
 * - 返回的物件只在首次創建，之後保持穩定引用
 */
export function useItineraryPageState() {
  // Filter states
  const [statusFilter, setStatusFilter] = useState<string>('全部')
  const [authorFilter, setAuthorFilter] = useState<string>('__mine__')
  const [searchTerm, setSearchTerm] = useState('')
  const [viewMode, setViewMode] = useState<'my' | 'all' | 'templates' | 'proposals'>('all')

  // Dialog states
  const [isTypeSelectOpen, setIsTypeSelectOpen] = useState(false)
  const [isPasswordDialogOpen, setIsPasswordDialogOpen] = useState(false)
  const [isDuplicateDialogOpen, setIsDuplicateDialogOpen] = useState(false)

  // Password dialog state
  const [passwordInput, setPasswordInput] = useState('')
  const [pendingEditId, setPendingEditId] = useState<string | null>(null)

  // Duplicate dialog state
  const [duplicateSource, setDuplicateSource] = useState<Itinerary | null>(null)
  const [duplicateTourCode, setDuplicateTourCode] = useState('')
  const [duplicateTitle, setDuplicateTitle] = useState('')
  const [isDuplicating, setIsDuplicating] = useState(false)

  // ===== Refs for stable getters =====
  const statusFilterRef = useRef(statusFilter)
  statusFilterRef.current = statusFilter

  const authorFilterRef = useRef(authorFilter)
  authorFilterRef.current = authorFilter

  const searchTermRef = useRef(searchTerm)
  searchTermRef.current = searchTerm

  const viewModeRef = useRef(viewMode)
  viewModeRef.current = viewMode

  const isTypeSelectOpenRef = useRef(isTypeSelectOpen)
  isTypeSelectOpenRef.current = isTypeSelectOpen

  const isPasswordDialogOpenRef = useRef(isPasswordDialogOpen)
  isPasswordDialogOpenRef.current = isPasswordDialogOpen

  const isDuplicateDialogOpenRef = useRef(isDuplicateDialogOpen)
  isDuplicateDialogOpenRef.current = isDuplicateDialogOpen

  const passwordInputRef = useRef(passwordInput)
  passwordInputRef.current = passwordInput

  const pendingEditIdRef = useRef(pendingEditId)
  pendingEditIdRef.current = pendingEditId

  const duplicateSourceRef = useRef(duplicateSource)
  duplicateSourceRef.current = duplicateSource

  const duplicateTourCodeRef = useRef(duplicateTourCode)
  duplicateTourCodeRef.current = duplicateTourCode

  const duplicateTitleRef = useRef(duplicateTitle)
  duplicateTitleRef.current = duplicateTitle

  const isDuplicatingRef = useRef(isDuplicating)
  isDuplicatingRef.current = isDuplicating

  // ===== Stable getter functions =====
  const getStatusFilter = useCallback(() => statusFilterRef.current, [])
  const getAuthorFilter = useCallback(() => authorFilterRef.current, [])
  const getSearchTerm = useCallback(() => searchTermRef.current, [])
  const getViewMode = useCallback(() => viewModeRef.current, [])
  const getIsTypeSelectOpen = useCallback(() => isTypeSelectOpenRef.current, [])
  const getIsPasswordDialogOpen = useCallback(() => isPasswordDialogOpenRef.current, [])
  const getIsDuplicateDialogOpen = useCallback(() => isDuplicateDialogOpenRef.current, [])
  const getPasswordInput = useCallback(() => passwordInputRef.current, [])
  const getPendingEditId = useCallback(() => pendingEditIdRef.current, [])
  const getDuplicateSource = useCallback(() => duplicateSourceRef.current, [])
  const getDuplicateTourCode = useCallback(() => duplicateTourCodeRef.current, [])
  const getDuplicateTitle = useCallback(() => duplicateTitleRef.current, [])
  const getIsDuplicating = useCallback(() => isDuplicatingRef.current, [])

  // ===== 返回穩定的物件（只在首次創建）=====
  // 使用空依賴陣列的 useMemo，物件引用永遠穩定
  // 內部的 setter 來自 useState 本身就是穩定的
  // 內部的 getter 使用 ref 所以永遠能取得最新值
  const stableApi = useMemo(
    () => ({
      // Setters (stable from useState)
      setStatusFilter,
      setAuthorFilter,
      setSearchTerm,
      setViewMode,
      setIsTypeSelectOpen,
      setIsPasswordDialogOpen,
      setIsDuplicateDialogOpen,
      setPasswordInput,
      setPendingEditId,
      setDuplicateSource,
      setDuplicateTourCode,
      setDuplicateTitle,
      setIsDuplicating,

      // Getters (stable via refs)
      getStatusFilter,
      getAuthorFilter,
      getSearchTerm,
      getViewMode,
      getIsTypeSelectOpen,
      getIsPasswordDialogOpen,
      getIsDuplicateDialogOpen,
      getPasswordInput,
      getPendingEditId,
      getDuplicateSource,
      getDuplicateTourCode,
      getDuplicateTitle,
      getIsDuplicating,
    }),
    []
  ) // 空依賴 - 物件只創建一次

  // 返回穩定 API + 當前狀態值（用於渲染）
  return {
    // 穩定的 API（setters 和 getters）
    ...stableApi,

    // 當前狀態值（用於渲染，會觸發 re-render）
    statusFilter,
    authorFilter,
    searchTerm,
    viewMode,
    isTypeSelectOpen,
    isPasswordDialogOpen,
    isDuplicateDialogOpen,
    passwordInput,
    pendingEditId,
    duplicateSource,
    duplicateTourCode,
    duplicateTitle,
    isDuplicating,
  }
}

// 導出類型，方便其他 hook 使用
export type PageStateApi = ReturnType<typeof useItineraryPageState>
