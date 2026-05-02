'use client'

import React, { useState, useEffect, useMemo, useCallback } from 'react'
import { Button } from '@/components/ui/button'
import { Checkbox } from '@/components/ui/checkbox'
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { ArrowLeft, ArrowRight, Send } from 'lucide-react'
import { BATCH_VISA_LABELS as L } from '../constants/labels'
import { useBatchVisa } from '../hooks/useBatchVisa'
import { VISA_TYPE_GROUPS } from '@/constants/visa-types'
import type { Order } from '@/stores/types'

interface BatchVisaDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  order: Order | null
}

export function BatchVisaDialog({ open, onOpenChange, order }: BatchVisaDialogProps) {
  const [step, setStep] = useState<1 | 2>(1)
  const [selectedTypes, setSelectedTypes] = useState<Set<string>>(new Set())
  // key: `${memberId}::${visaType}`
  const [checkedCells, setCheckedCells] = useState<Set<string>>(new Set())

  const { members, isLoadingMembers, isSubmitting, loadMembers, submitBatchVisa } = useBatchVisa()

  // Load members when dialog opens
  useEffect(() => {
    if (open && order) {
      setStep(1)
      setSelectedTypes(new Set())
      setCheckedCells(new Set())
      loadMembers(order.id)
    }
  }, [open, order, loadMembers])

  const membersMap = useMemo(() => new Map(members.map(m => [m.id, m])), [members])

  const typesArray = useMemo(() => Array.from(selectedTypes), [selectedTypes])

  const toggleType = useCallback((type: string) => {
    setSelectedTypes(prev => {
      const next = new Set(prev)
      if (next.has(type)) {
        next.delete(type)
      } else {
        next.add(type)
      }
      return next
    })
  }, [])

  const toggleCell = useCallback((memberId: string, visaType: string) => {
    const key = `${memberId}::${visaType}`
    setCheckedCells(prev => {
      const next = new Set(prev)
      if (next.has(key)) {
        next.delete(key)
      } else {
        next.add(key)
      }
      return next
    })
  }, [])

  const handleSelectAll = useCallback(() => {
    const allKeys = members.flatMap(m => typesArray.map(t => `${m.id}::${t}`))
    setCheckedCells(new Set(allKeys))
  }, [members, typesArray])

  const handleDeselectAll = useCallback(() => {
    setCheckedCells(new Set())
  }, [])

  const handleSubmit = useCallback(async () => {
    if (!order) return
    const selections = Array.from(checkedCells).map(key => {
      const [memberId, visaType] = key.split('::')
      return { memberId, visaType }
    })
    const success = await submitBatchVisa(order, selections, membersMap)
    if (success) {
      onOpenChange(false)
    }
  }, [order, checkedCells, membersMap, submitBatchVisa, onOpenChange])

  const goToStep2 = useCallback(() => {
    // Pre-check all cells when entering step 2
    const allKeys = members.flatMap(m => typesArray.map(t => `${m.id}::${t}`))
    setCheckedCells(new Set(allKeys))
    setStep(2)
  }, [members, typesArray])

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent level={2} className="max-w-2xl max-h-[80vh] flex flex-col">
        <DialogHeader>
          <DialogTitle>{L.dialog_title}</DialogTitle>
        </DialogHeader>

        {step === 1 && (
          <div className="flex-1 overflow-y-auto py-4 space-y-4">
            <p className="text-sm text-morandi-secondary">{L.step_select_type}</p>
            {VISA_TYPE_GROUPS.map(group => (
              <div key={group.label} className="space-y-2">
                <p className="text-xs font-semibold text-morandi-secondary">{group.label}</p>
                <div className="flex flex-wrap gap-2">
                  {group.types.map(type => (
                    <label
                      key={type}
                      className="flex items-center gap-2 px-3 py-1.5 rounded-md border border-border cursor-pointer hover:bg-morandi-container/30 transition-colors text-sm"
                    >
                      <Checkbox
                        checked={selectedTypes.has(type)}
                        onCheckedChange={() => toggleType(type)}
                      />
                      <span>{type}</span>
                    </label>
                  ))}
                </div>
              </div>
            ))}
          </div>
        )}

        {step === 2 && (
          <div className="flex-1 overflow-y-auto py-4">
            <div className="flex items-center justify-between mb-3">
              <p className="text-sm text-morandi-secondary">{L.step_select_members}</p>
              <div className="flex gap-2">
                <Button size="sm" variant="ghost" onClick={handleSelectAll}>
                  {L.btn_select_all}
                </Button>
                <Button size="sm" variant="ghost" onClick={handleDeselectAll}>
                  {L.btn_deselect_all}
                </Button>
              </div>
            </div>

            {isLoadingMembers ? (
              <div className="text-center py-8 text-morandi-secondary">...</div>
            ) : members.length === 0 ? (
              <div className="text-center py-8 text-morandi-secondary">{L.no_members}</div>
            ) : (
              <div className="border border-border rounded-lg overflow-hidden">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="bg-morandi-container/40 border-b border-border">
                      <th className="text-left py-2 px-3 font-medium text-morandi-secondary">
                        {L.col_name}
                      </th>
                      {typesArray.map(type => (
                        <th
                          key={type}
                          className="text-center py-2 px-3 font-medium text-morandi-secondary whitespace-nowrap"
                        >
                          {type}
                        </th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {members.map(member => (
                      <tr key={member.id} className="border-b border-border/50">
                        <td className="py-2 px-3 text-morandi-primary">
                          {member.chinese_name || '-'}
                        </td>
                        {typesArray.map(type => {
                          const key = `${member.id}::${type}`
                          return (
                            <td key={type} className="text-center py-2 px-3">
                              <Checkbox
                                checked={checkedCells.has(key)}
                                onCheckedChange={() => toggleCell(member.id, type)}
                              />
                            </td>
                          )
                        })}
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        )}

        {/* Footer actions */}
        <div className="flex justify-between pt-4 border-t border-border">
          {step === 1 ? (
            <>
              <Button variant="ghost" onClick={() => onOpenChange(false)}>
                {L.btn_cancel}
              </Button>
              <Button onClick={goToStep2} disabled={selectedTypes.size === 0}>
                {L.btn_next}
                <ArrowRight className="ml-1" size={16} />
              </Button>
            </>
          ) : (
            <>
              <Button variant="ghost" onClick={() => setStep(1)}>
                <ArrowLeft className="mr-1" size={16} />
                {L.btn_back}
              </Button>
              <Button onClick={handleSubmit} disabled={isSubmitting || checkedCells.size === 0}>
                {isSubmitting ? L.btn_submitting : L.btn_submit}
                {!isSubmitting && <Send className="ml-1" size={16} />}
              </Button>
            </>
          )}
        </div>
      </DialogContent>
    </Dialog>
  )
}
