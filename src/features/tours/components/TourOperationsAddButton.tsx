'use client'

import React, { useState, useCallback } from 'react'
import { Tour } from '@/stores/types'
import { useOrdersSlim, useMembersSlim } from '@/data'
import { Plus, FileText, Package, RefreshCw, X } from 'lucide-react'
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { cn } from '@/lib/utils'
import { TourExtraFields } from '../types'
import { prompt } from '@/lib/ui/alert-dialog'
import { TOUR_OPS_ADD } from '../constants'

interface TourOperationsAddButtonProps {
  tour: Tour
  tourExtraFields: Record<string, TourExtraFields>
  setTourExtraFields: React.Dispatch<React.SetStateAction<Record<string, TourExtraFields>>>
}

export function TourOperationsAddButton({
  tour,
  tourExtraFields,
  setTourExtraFields,
}: TourOperationsAddButtonProps) {
  const { items: orders } = useOrdersSlim()
  const { items: members } = useMembersSlim()
  const [isDialogOpen, setIsDialogOpen] = useState(false)

  // Get all orders for this tour
  const tourOrders = orders.filter(order => order.tour_id === tour.id)

  // Get member data
  const allTourMembers = members.filter(member =>
    tourOrders.some(order => order.id === member.order_id)
  )

  // Calculate assigned members
  const assignedMembers = allTourMembers.filter(member => member.assigned_room).length

  return (
    <>
      {/* Room assignment statistics */}
      <span className="px-2 py-1 bg-morandi-green/20 text-morandi-green rounded text-xs">
        {TOUR_OPS_ADD.room_assigned(assignedMembers)}
      </span>

      {/* Add button */}
      <button
        onClick={() => setIsDialogOpen(true)}
        className="bg-gradient-to-br from-morandi-gold/40 to-morandi-container/60 text-morandi-primary ring-1 ring-border/50 hover:from-morandi-gold/60 hover:to-morandi-container/80 shadow-md hover:shadow-lg px-3 py-1.5 rounded text-sm font-medium flex items-center transition-colors"
        title={TOUR_OPS_ADD.add_item_title}
      >
        <Plus size={14} className="mr-1" />
        {TOUR_OPS_ADD.add_field}
      </button>

      {/* Dialog */}
      <TourOperationsAddDialog
        isOpen={isDialogOpen}
        onClose={() => setIsDialogOpen(false)}
        tour={tour}
        tourExtraFields={tourExtraFields}
        setTourExtraFields={setTourExtraFields}
      />
    </>
  )
}

interface TourOperationsAddDialogProps {
  isOpen: boolean
  onClose: () => void
  tour: Tour
  tourExtraFields: Record<string, TourExtraFields>
  setTourExtraFields: React.Dispatch<React.SetStateAction<Record<string, TourExtraFields>>>
}

function TourOperationsAddDialog({
  isOpen,
  onClose,
  tour,
  tourExtraFields,
  setTourExtraFields,
}: TourOperationsAddDialogProps) {
  const handleOptionSelect = useCallback(
    async (option: string) => {
      const tour_id = tour.id

      // Initialize field state for this tour if not exists
      if (!tourExtraFields[tour_id]) {
        setTourExtraFields(prev => ({
          ...prev,
          [tour_id]: {
            addOns: false,
            refunds: false,
            customFields: [],
          },
        }))
      }

      switch (option) {
        case 'addon':
          setTourExtraFields(prev => ({
            ...prev,
            [tour_id]: {
              ...prev[tour_id],
              addOns: true,
            },
          }))
          break

        case 'refund':
          setTourExtraFields(prev => ({
            ...prev,
            [tour_id]: {
              ...prev[tour_id],
              refunds: true,
            },
          }))
          break

        case 'blank':
          const fieldName = await prompt(TOUR_OPS_ADD.custom_field_prompt, {
            title: TOUR_OPS_ADD.custom_field_title,
            placeholder: TOUR_OPS_ADD.custom_field_placeholder,
          })
          if (fieldName && fieldName.trim()) {
            const fieldId = Date.now().toString()
            setTourExtraFields(prev => ({
              ...prev,
              [tour_id]: {
                ...prev[tour_id],
                customFields: [
                  ...(prev[tour_id]?.customFields || []),
                  { id: fieldId, name: fieldName.trim() },
                ],
              },
            }))
          }
          break
      }

      onClose()
    },
    [tour.id, tourExtraFields, setTourExtraFields, onClose]
  )

  const options = [
    {
      id: 'blank',
      label: TOUR_OPS_ADD.blank_field,
      description: TOUR_OPS_ADD.blank_field_desc,
      icon: FileText,
      color: 'text-morandi-secondary',
      bgColor: 'hover:bg-morandi-container/30',
    },
    {
      id: 'addon',
      label: TOUR_OPS_ADD.addon_field,
      description: TOUR_OPS_ADD.addon_field_desc,
      icon: Package,
      color: 'text-morandi-blue',
      bgColor: 'hover:bg-morandi-blue/10',
    },
    {
      id: 'refund',
      label: TOUR_OPS_ADD.refund_field,
      description: TOUR_OPS_ADD.refund_field_desc,
      icon: RefreshCw,
      color: 'text-morandi-red',
      bgColor: 'hover:bg-morandi-red/10',
    },
  ]

  return (
    <Dialog open={isOpen} onOpenChange={open => !open && onClose()}>
      <DialogContent level={1} className="max-w-md" aria-describedby={undefined}>
        <DialogHeader>
          <DialogTitle>{TOUR_OPS_ADD.dialog_title}</DialogTitle>
        </DialogHeader>

        <div className="space-y-3">
          <div className="text-sm text-morandi-secondary mb-4">
            {TOUR_OPS_ADD.dialog_desc(tour.name)}
          </div>

          {options.map(option => {
            const Icon = option.icon
            return (
              <button
                key={option.id}
                onClick={() => handleOptionSelect(option.id)}
                className={cn(
                  'w-full flex items-center space-x-4 p-4 rounded-lg border border-border transition-colors text-left',
                  option.bgColor
                )}
              >
                <div
                  className={cn(
                    'w-10 h-10 rounded-full bg-morandi-container/20 flex items-center justify-center',
                    option.color
                  )}
                >
                  <Icon size={18} />
                </div>
                <div className="flex-1">
                  <div className="font-medium text-morandi-primary">{option.label}</div>
                  <div className="text-sm text-morandi-secondary">{option.description}</div>
                </div>
                <div className="text-morandi-secondary">
                  <FileText size={16} />
                </div>
              </button>
            )
          })}
        </div>

        <div className="flex justify-end pt-4">
          <Button variant="outline" onClick={onClose} className="gap-2">
            <X size={16} />
            {TOUR_OPS_ADD.cancel}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  )
}
