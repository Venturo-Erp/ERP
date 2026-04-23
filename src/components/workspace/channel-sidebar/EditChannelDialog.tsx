/**
 * 編輯頻道 Dialog
 */

import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Save, X } from 'lucide-react'
import { COMP_WORKSPACE_LABELS } from '../constants/labels'

interface EditChannelDialogProps {
  isOpen: boolean
  channelName: string
  channelDescription: string
  onChannelNameChange: (name: string) => void
  onChannelDescriptionChange: (desc: string) => void
  onClose: () => void
  onSave: () => void
}

export function EditChannelDialog({
  isOpen,
  channelName,
  channelDescription,
  onChannelNameChange,
  onChannelDescriptionChange,
  onClose,
  onSave,
}: EditChannelDialogProps) {
  return (
    <Dialog open={isOpen} onOpenChange={open => !open && onClose()}>
      <DialogContent level={1} className="w-[400px]">
        <DialogHeader>
          <DialogTitle className="text-morandi-primary">
            {COMP_WORKSPACE_LABELS.編輯頻道}
          </DialogTitle>
        </DialogHeader>
        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-morandi-primary mb-1">
              {COMP_WORKSPACE_LABELS.頻道名稱}
            </label>
            <input
              type="text"
              value={channelName}
              onChange={e => onChannelNameChange(e.target.value)}
              className="w-full px-3 py-2 border border-morandi-gold/30 rounded-lg focus:outline-none focus:ring-2 focus:ring-morandi-gold/50"
              placeholder={COMP_WORKSPACE_LABELS.輸入頻道名稱}
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-morandi-primary mb-1">
              {COMP_WORKSPACE_LABELS.LABEL_728}
            </label>
            <textarea
              value={channelDescription}
              onChange={e => onChannelDescriptionChange(e.target.value)}
              className="w-full px-3 py-2 border border-morandi-gold/30 rounded-lg focus:outline-none focus:ring-2 focus:ring-morandi-gold/50"
              placeholder={COMP_WORKSPACE_LABELS.輸入頻道描述}
              rows={3}
            />
          </div>
        </div>
        <div className="flex gap-2 mt-6">
          <Button variant="outline" onClick={onClose} className="flex-1 gap-2">
            <X size={16} />
            {COMP_WORKSPACE_LABELS.CANCEL}
          </Button>
          <Button
            onClick={onSave}
            disabled={!channelName.trim()}
            className="flex-1 bg-gradient-to-br from-morandi-gold/40 to-morandi-container/60 text-morandi-primary ring-1 ring-border/50 hover:from-morandi-gold/60 hover:to-morandi-container/80 shadow-md hover:shadow-lg gap-2"
          >
            <Save size={16} />
            {COMP_WORKSPACE_LABELS.SAVE}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  )
}
