'use client'
import React, { useState, useEffect, useRef } from 'react'
import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'
import { Search, Plus, Loader2, Building2 } from 'lucide-react'
import { dynamicFrom } from '@/lib/supabase/typed-client'
import { logger } from '@/lib/utils/logger'

const SUPPLIER_SEARCH_LABELS = {
  placeholder: '輸入供應商名稱',
  notFound: (term: string) => `找不到「${term}」`,
  useAs: (term: string) => `使用「${term}」`,
  contactLabel: '聯絡人: ',
}

export interface Supplier {
  id: string
  code: string
  name: string
  contact_person?: string
  phone?: string
  type?: string
  country?: string
  address?: string
}

interface SupplierSearchInputProps {
  value: string
  onChange: (value: string) => void
  onSupplierSelect?: (supplier: Supplier) => void
  category?: string
  placeholder?: string
  className?: string
}

export function SupplierSearchInput({
  value,
  onChange,
  onSupplierSelect,
  category,
  placeholder = SUPPLIER_SEARCH_LABELS.placeholder,
  className = '',
}: SupplierSearchInputProps) {
  const [isOpen, setIsOpen] = useState(false)
  const [loading, setLoading] = useState(false)
  const [suppliers, setSuppliers] = useState<Supplier[]>([])
  const [searchTerm, setSearchTerm] = useState(value)
  const inputRef = useRef<HTMLInputElement>(null)
  const dropdownRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    const searchSuppliers = async () => {
      if (!searchTerm || searchTerm.length < 2) {
        setSuppliers([])
        return
      }
      setLoading(true)
      try {
        const supplierType = category === 'activity' ? 'attraction' : category
        let query = dynamicFrom('suppliers')
          .select('id, code, name, contact_person, phone, type')
          .ilike('name', `%${searchTerm}%`)
          .eq('is_active', true)
          .limit(15)
        const { data, error } = await query
        if (error) {
          logger.error('搜尋供應商失敗:', error.message || error)
          setSuppliers([])
          return
        }
        let sortedData = (data as Supplier[]) || []
        if (supplierType && sortedData.length > 0) {
          sortedData = sortedData.sort((a, b) => {
            const aMatch = a.type === supplierType ? 0 : 1
            const bMatch = b.type === supplierType ? 0 : 1
            return aMatch - bMatch
          })
        }
        setSuppliers(sortedData.slice(0, 10))
      } catch (error) {
        const err = error as Error
        logger.error('搜尋供應商失敗:', err.message || err)
        setSuppliers([])
      } finally {
        setLoading(false)
      }
    }
    const debounce = setTimeout(searchSuppliers, 300)
    return () => clearTimeout(debounce)
  }, [searchTerm, category])

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (
        dropdownRef.current &&
        !dropdownRef.current.contains(event.target as Node) &&
        inputRef.current &&
        !inputRef.current.contains(event.target as Node)
      ) {
        setIsOpen(false)
      }
    }
    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [])

  const handleSelect = (supplier: Supplier) => {
    setSearchTerm(supplier.name)
    onChange(supplier.name)
    onSupplierSelect?.(supplier)
    setIsOpen(false)
  }

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = e.target.value
    setSearchTerm(val)
    onChange(val)
    setIsOpen(true)
  }

  return (
    <div className={`relative ${className}`}>
      <div className="relative">
        <Search
          size={14}
          className="absolute left-2 top-1/2 -translate-y-1/2 text-morandi-secondary"
        />
        <Input
          ref={inputRef}
          value={searchTerm}
          onChange={handleInputChange}
          onFocus={() => setIsOpen(true)}
          placeholder={placeholder}
          className="h-7 text-sm pl-7"
        />
        {loading && (
          <Loader2
            size={14}
            className="absolute right-2 top-1/2 -translate-y-1/2 animate-spin text-morandi-secondary"
          />
        )}
      </div>
      {isOpen && searchTerm.length >= 2 && (
        <div
          ref={dropdownRef}
          className="absolute z-50 top-full left-0 right-0 mt-1 bg-card border border-border rounded-lg shadow-lg max-h-60 overflow-auto"
        >
          {suppliers.length === 0 && !loading ? (
            <div className="p-3 text-center">
              <p className="text-sm text-morandi-secondary mb-2">
                {SUPPLIER_SEARCH_LABELS.notFound(searchTerm)}
              </p>
              <Button
                variant="outline"
                size="sm"
                className="gap-1 text-xs"
                onClick={() => {
                  onChange(searchTerm)
                  setIsOpen(false)
                }}
              >
                <Plus size={12} />
                {SUPPLIER_SEARCH_LABELS.useAs(searchTerm)}
              </Button>
            </div>
          ) : (
            suppliers.map(supplier => (
              <button
                key={supplier.id}
                onClick={() => handleSelect(supplier)}
                className="w-full px-3 py-2 text-left hover:bg-morandi-container/50 border-b border-border/30 last:border-0"
              >
                <div className="flex items-center gap-2">
                  <Building2 size={14} className="text-morandi-secondary shrink-0" />
                  <div className="flex-1 min-w-0">
                    <div className="font-medium text-sm truncate">{supplier.name}</div>
                    <div className="text-xs text-morandi-secondary flex gap-2">
                      {supplier.contact_person && (
                        <span>
                          {SUPPLIER_SEARCH_LABELS.contactLabel}
                          {supplier.contact_person}
                        </span>
                      )}
                      {supplier.phone && <span>{supplier.phone}</span>}
                    </div>
                  </div>
                </div>
              </button>
            ))
          )}
        </div>
      )}
    </div>
  )
}
