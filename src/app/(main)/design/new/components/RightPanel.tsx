'use client'
/**
 * 右側面板組件
 * 包含元素屬性和模板數據兩個 Tab
 */

import * as fabric from 'fabric'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { PropertiesPanel } from '@/features/designer/components/PropertiesPanel'
import { TemplateDataPanel } from '@/features/designer/components/TemplateDataPanel'
import type { CanvasElement } from '@/features/designer/components/types'
import type { ImageEditorSettings } from '@/components/ui/image-editor'
import { DESIGNER_LABELS } from '../constants/labels'

interface RightPanelProps {
  canvas: fabric.Canvas | null
  selectedObject: fabric.FabricObject | null
  templateData: Record<string, unknown> | null
  onTemplateDataChange: (data: Record<string, unknown>) => void
  onUploadCoverImage: () => void
  onAdjustCoverPosition: () => void
  onUploadDailyCoverImage: () => void
  onAdjustDailyCoverPosition: () => void
  currentPageType: string | undefined
  currentDayIndex: number | undefined
  pages: Array<{ id: string; name: string; templateKey?: string }>
  onApplyToc: () => void
  onImageFill: (obj: fabric.FabricObject) => void
}

export function RightPanel({
  canvas,
  selectedObject,
  templateData,
  onTemplateDataChange,
  onUploadCoverImage,
  onAdjustCoverPosition,
  onUploadDailyCoverImage,
  onAdjustDailyCoverPosition,
  currentPageType,
  currentDayIndex,
  pages,
  onApplyToc,
  onImageFill,
}: RightPanelProps) {
  return (
    <div className="w-64 h-full bg-card border-l border-border flex flex-col">
      <Tabs
        defaultValue={selectedObject ? 'properties' : 'template'}
        className="flex-1 min-h-0 flex flex-col"
      >
        <TabsList className="grid grid-cols-2 mx-2 mt-2">
          <TabsTrigger value="properties" className="text-xs">
            {DESIGNER_LABELS.TAB_PROPERTIES}
          </TabsTrigger>
          <TabsTrigger value="template" className="text-xs">
            {DESIGNER_LABELS.TAB_TEMPLATE_DATA}
          </TabsTrigger>
        </TabsList>

        <TabsContent value="properties" className="flex-1 min-h-0 overflow-hidden m-0">
          <PropertiesPanel
            canvas={canvas}
            selectedObject={selectedObject}
            onUpdate={() => {}}
            onImageFill={onImageFill}
          />
        </TabsContent>

        <TabsContent value="template" className="flex-1 min-h-0 overflow-hidden m-0">
          <TemplateDataPanel
            templateData={templateData}
            onTemplateDataChange={onTemplateDataChange}
            onUploadCoverImage={onUploadCoverImage}
            onAdjustCoverPosition={onAdjustCoverPosition}
            onUploadDailyCoverImage={onUploadDailyCoverImage}
            onAdjustDailyCoverPosition={onAdjustDailyCoverPosition}
            currentPageType={currentPageType}
            currentDayIndex={currentDayIndex}
            pages={pages}
            onApplyToc={onApplyToc}
          />
        </TabsContent>
      </Tabs>
    </div>
  )
}
