'use client'

import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover'
import { Link2, Check, Copy, ExternalLink } from 'lucide-react'
import { PUBLISH_LABELS } from './constants/labels'

interface PublishPreviewProps {
  shareUrl: string | null
  copied: boolean
  onCopy: () => void
}

export function PublishPreview({ shareUrl, copied, onCopy }: PublishPreviewProps) {
  if (!shareUrl) return null

  return (
    <Popover>
      <PopoverTrigger asChild>
        <Button
          size="sm"
          variant="outline"
          className="h-8 px-3 border-morandi-green/30 bg-morandi-green/10 hover:bg-morandi-green/10 text-morandi-green"
        >
          <Link2 size={14} className="mr-1.5" />
          {PUBLISH_LABELS.LABEL_9893}
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-80 p-3" align="end">
        <div className="space-y-2">
          <div className="text-sm font-medium text-morandi-primary">
            {PUBLISH_LABELS.LABEL_1245}
          </div>
          <div className="flex items-center gap-2">
            <Input value={shareUrl} readOnly className="text-xs h-8 bg-muted" />
            <Button size="sm" variant="outline" className="h-8 px-2 flex-shrink-0" onClick={onCopy}>
              {copied ? <Check size={14} /> : <Copy size={14} />}
            </Button>
            <Button size="sm" variant="outline" className="h-8 px-2 flex-shrink-0" asChild>
              <a href={shareUrl} target="_blank" rel="noopener noreferrer">
                <ExternalLink size={14} />
              </a>
            </Button>
          </div>
          <p className="text-xs text-morandi-secondary">{PUBLISH_LABELS.LABEL_7099}</p>
        </div>
      </PopoverContent>
    </Popover>
  )
}
