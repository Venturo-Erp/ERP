import { COMP_WORKSPACE_LABELS } from '../constants/labels'
import { Button } from '@/components/ui/button'
/**
 * 新增群組 Dialog
 */

interface CreateGroupDialogProps {
  isOpen: boolean
  groupName: string
  onGroupNameChange: (name: string) => void
  onClose: () => void
  onCreate: () => void
}

export function CreateGroupDialog({
  isOpen,
  groupName,
  onGroupNameChange,
  onClose,
  onCreate,
}: CreateGroupDialogProps) {
  if (!isOpen) return null

  return (
    <div className="absolute inset-0 bg-black/20 flex items-center justify-center z-50">
      <div className="card-morandi-elevated w-80">
        <h3 className="font-semibold mb-3 text-morandi-primary">
          {COMP_WORKSPACE_LABELS.ADD_2009}
        </h3>
        <input
          type="text"
          placeholder={COMP_WORKSPACE_LABELS.群組名稱}
          value={groupName}
          onChange={e => onGroupNameChange(e.target.value)}
          onKeyDown={e => e.key === 'Enter' && onCreate()}
          autoFocus
          className="input-morandi"
        />
        <div className="flex gap-2 mt-3 justify-end">
          <Button variant="outline" size="sm" onClick={onClose}>
            {COMP_WORKSPACE_LABELS.CANCEL}
          </Button>
          <Button size="sm" onClick={onCreate}>
            {COMP_WORKSPACE_LABELS.建立}
          </Button>
        </div>
      </div>
    </div>
  )
}
