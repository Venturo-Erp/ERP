'use client'

import React from 'react'
import Image from 'next/image'
import { Upload, Loader2, ImageIcon } from 'lucide-react'
import { DAY_TEMPLATE_LABELS } from './constants/labels'

interface UploadableImageProps {
  src?: string
  alt: string
  targetKey: { type: 'activity' | 'day'; index?: number }
  triggerUpload: (target: { type: 'activity' | 'day'; index?: number }) => void
  uploading: string | null
  className?: string
  emptySize?: string
}

export function UploadableImage({
  src,
  alt,
  targetKey,
  triggerUpload,
  uploading,
  className = '',
  emptySize = 'h-48',
}: UploadableImageProps) {
  const uploadKey = targetKey.type === 'activity' ? `activity-${targetKey.index}` : 'day'
  const isUploading = uploading === uploadKey

  if (src) {
    return (
      <div
        className={`relative group cursor-pointer overflow-hidden ${className}`}
        onClick={() => triggerUpload(targetKey)}
      >
        <Image src={src} alt={alt} fill className="object-cover" />
        <div className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
          {isUploading ? (
            <Loader2 size={24} className="text-white animate-spin" />
          ) : (
            <div className="text-white text-center">
              <Upload size={20} className="mx-auto mb-1" />
              <span className="text-xs">{DAY_TEMPLATE_LABELS.LABEL_1707}</span>
            </div>
          )}
        </div>
      </div>
    )
  }

  return (
    <div
      className={`${emptySize} bg-muted border-2 border-dashed border-border rounded-lg flex flex-col items-center justify-center cursor-pointer hover:bg-morandi-container hover:border-editor-theme-green transition-colors ${className}`}
      onClick={() => triggerUpload(targetKey)}
    >
      {isUploading ? (
        <Loader2 size={20} className="text-morandi-muted animate-spin" />
      ) : (
        <>
          <ImageIcon size={20} className="text-morandi-muted mb-1" />
          <span className="text-xs text-morandi-muted">{DAY_TEMPLATE_LABELS.UPLOADING_201}</span>
        </>
      )}
    </div>
  )
}
