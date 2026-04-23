'use client'

import React from 'react'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Upload, Loader2, X, FileImage } from 'lucide-react'
import type { Visa } from '@/stores/types'
import { useBatchPickup } from '../hooks/useBatchPickup'
import { PickupList } from './PickupList'
import { PickupSummary } from './PickupSummary'
import { BATCH_PICKUP_DIALOG_LABELS as L } from '../constants/labels'
import { PassportConflictDialog } from '@/features/orders/components/PassportConflictDialog'

interface BatchPickupDialogProps {
  open: boolean
  onClose: () => void
  pendingVisas: Visa[] // 「已送件」狀態的簽證
  onComplete: (updatedVisaIds: string[]) => void
  updateVisa: (id: string, data: Partial<Visa>) => void
}

export function BatchPickupDialog({
  open,
  onClose,
  pendingVisas,
  onComplete,
  updateVisa,
}: BatchPickupDialogProps) {
  const {
    step,
    files,
    isDragging,
    isProcessing,
    fileInputRef,
    matchedItems,
    pickupDate,
    selectedVisaIds,
    confirmableCount,
    setStep,
    setPickupDate,
    resetState,
    handleFileChange,
    handleDragOver,
    handleDragLeave,
    handleDrop,
    handleRemoveFile,
    handleStartOCR,
    handleManualSelect,
    handleToggleUpdateCustomer,
    handleConfirmPickup,
    conflictDialogOpen,
    setConflictDialogOpen,
    conflicts,
    conflictPassportData,
  } = useBatchPickup({ pendingVisas, updateVisa, onComplete })

  const handleClose = () => {
    resetState()
    onClose()
  }

  return (
    <>
      <Dialog open={open} onOpenChange={isOpen => !isOpen && handleClose()}>
        <DialogContent level={1} className="max-w-4xl max-h-[90vh] flex flex-col">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <FileImage className="h-5 w-5 text-morandi-gold" />
              {L.title}
              {step === 'matching' && (
                <span className="text-sm font-normal text-morandi-secondary ml-2">
                  {L.subtitle_matching}
                </span>
              )}
            </DialogTitle>
            <DialogDescription>
              {step === 'upload' ? L.desc_upload : L.desc_matching}
            </DialogDescription>
          </DialogHeader>

          <div className="flex-1 overflow-y-auto py-4">
            {step === 'upload' ? (
              /* 上傳步驟 */
              <div className="space-y-4">
                {/* 上傳區域 */}
                <label
                  htmlFor="passport-batch-upload"
                  className={`flex flex-col items-center justify-center w-full h-40 border-2 border-dashed rounded-lg cursor-pointer transition-all ${
                    isDragging
                      ? 'border-morandi-gold bg-morandi-gold/20 scale-[1.02]'
                      : 'border-morandi-secondary/30 bg-morandi-container/20 hover:bg-morandi-container/40'
                  }`}
                  onDragOver={handleDragOver}
                  onDragLeave={handleDragLeave}
                  onDrop={handleDrop}
                >
                  <div className="flex flex-col items-center justify-center py-4">
                    <Upload className="w-10 h-10 mb-3 text-morandi-secondary" />
                    <p className="text-sm text-morandi-primary">
                      <span className="font-semibold">{L.upload_hint}</span> {L.upload_drag}
                    </p>
                    <p className="text-xs text-morandi-secondary mt-1">{L.upload_formats}</p>
                  </div>
                  <input
                    ref={fileInputRef}
                    id="passport-batch-upload"
                    type="file"
                    className="hidden"
                    accept="image/*"
                    multiple
                    onChange={handleFileChange}
                    disabled={isProcessing}
                  />
                </label>

                {/* 已選檔案列表 */}
                {files.length > 0 && (
                  <div className="space-y-2">
                    <div className="text-sm text-morandi-secondary">
                      {L.files_selected(files.length)}
                    </div>
                    <div className="max-h-40 overflow-y-auto space-y-2">
                      {files.map((file, index) => (
                        <div
                          key={index}
                          className="flex items-center justify-between p-2 bg-morandi-container/20 rounded"
                        >
                          <div className="flex items-center gap-2 flex-1 min-w-0">
                            <FileImage size={16} className="text-morandi-gold flex-shrink-0" />
                            <span className="text-sm text-morandi-primary truncate">
                              {file.name}
                            </span>
                            <span className="text-xs text-morandi-secondary flex-shrink-0">
                              ({(file.size / 1024).toFixed(1)} KB)
                            </span>
                          </div>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => handleRemoveFile(index)}
                            className="h-7 w-7 p-0 hover:bg-status-danger-bg"
                            disabled={isProcessing}
                          >
                            <X size={14} className="text-status-danger" />
                          </Button>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* 待取件簽證提示 */}
                <div className="bg-status-info-bg border border-status-info/30 rounded-lg p-3">
                  <p className="text-sm text-morandi-primary">
                    {L.pending_visas(pendingVisas.length)}
                  </p>
                </div>
              </div>
            ) : (
              /* 配對結果步驟 */
              <div className="space-y-4">
                <PickupSummary
                  pickupDate={pickupDate}
                  onPickupDateChange={setPickupDate}
                  pendingVisasCount={pendingVisas.length}
                />

                <PickupList
                  matchedItems={matchedItems}
                  pendingVisas={pendingVisas}
                  selectedVisaIds={selectedVisaIds}
                  onManualSelect={handleManualSelect}
                  onToggleUpdateCustomer={handleToggleUpdateCustomer}
                />
              </div>
            )}
          </div>

          <DialogFooter className="gap-2 pt-4 border-t">
            {step === 'upload' ? (
              <>
                <Button
                  variant="outline"
                  className="gap-1"
                  onClick={handleClose}
                  disabled={isProcessing}
                >
                  <X size={16} />
                  {L.btn_cancel}
                </Button>
                <Button
                  onClick={handleStartOCR}
                  disabled={files.length === 0 || isProcessing}
                  className="bg-gradient-to-br from-morandi-gold/40 to-morandi-container/60 text-morandi-primary ring-1 ring-border/50 hover:from-morandi-gold/60 hover:to-morandi-container/80 shadow-md hover:shadow-lg"
                >
                  {isProcessing ? (
                    <>
                      <Loader2 size={16} className="mr-2 animate-spin" />
                      {L.btn_processing}
                    </>
                  ) : (
                    L.btn_start_ocr(files.length)
                  )}
                </Button>
              </>
            ) : (
              <>
                <Button variant="outline" onClick={() => setStep('upload')} disabled={isProcessing}>
                  {L.btn_back}
                </Button>
                <Button
                  onClick={handleConfirmPickup}
                  disabled={confirmableCount === 0 || isProcessing}
                  className="bg-morandi-green hover:bg-morandi-green/90 text-white"
                >
                  {isProcessing ? (
                    <>
                      <Loader2 size={16} className="mr-2 animate-spin" />
                      {L.btn_confirming}
                    </>
                  ) : (
                    L.btn_confirm_pickup(confirmableCount)
                  )}
                </Button>
              </>
            )}
          </DialogFooter>
        </DialogContent>
      </Dialog>
      <PassportConflictDialog
        open={conflictDialogOpen}
        onOpenChange={setConflictDialogOpen}
        conflicts={conflicts}
        passportData={conflictPassportData || {}}
      />
    </>
  )
}
