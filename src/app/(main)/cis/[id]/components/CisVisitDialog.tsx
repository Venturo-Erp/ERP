'use client'

/**
 * 拜訪紀錄 Dialog — 五階段引導對話 + 錄音上傳 + AI 分析。
 *
 * 設計取自 vault A 第六章「品牌資料卡」schema：
 *   travel_types, brand_keywords, emotional_keywords, value_proposition,
 *   touchpoints, differentiation, priority_needs, visual_hints
 */

import { useEffect, useRef, useState } from 'react'
import { toast } from 'sonner'
import { Loader2, Lightbulb, Upload, X, Sparkles, FileAudio, Mic } from 'lucide-react'

import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { Label } from '@/components/ui/label'
import { useAuthStore } from '@/stores/auth-store'

import type {
  BrandCard,
  CisVisit,
  CisVisitStage,
  CreateCisVisitData,
} from '@/types/cis.types'
import { CIS_VISIT_STAGE_OPTIONS } from '@/types/cis.types'
import {
  CIS_VISIT_LABELS as L,
  CIS_PAGE_LABELS as P,
  CIS_GUIDANCE_QUESTIONS,
  CIS_AUDIO_LABELS as A,
  CIS_AI_LABELS as AI,
} from '../../constants/labels'
import { uploadVisitAudio } from '@/lib/cis/audio-upload'

interface Props {
  open: boolean
  onOpenChange: (open: boolean) => void
  mode: 'create' | 'edit'
  clientId: string
  initialVisit: CisVisit | null
  onSubmit: (data: CreateCisVisitData) => Promise<void>
}

interface FormState {
  visited_at: string
  stage: CisVisitStage
  summary: string
  audio_url: string
  brand_keywords_text: string
  emotional_keywords_text: string
  value_proposition: string
  differentiation: string
  touchpoints_text: string
  must_do_text: string
  suggested_text: string
  optional_text: string
  color_tone: string
  visual_style: string
}

function nowLocalIsoMinutes(): string {
  const d = new Date()
  d.setMinutes(d.getMinutes() - d.getTimezoneOffset())
  return d.toISOString().slice(0, 16)
}

function arrToText(arr?: string[] | null) {
  return arr?.length ? arr.join('、') : ''
}

function textToArr(text: string): string[] {
  return text
    .split(/[,，、\s]+/)
    .map(s => s.trim())
    .filter(Boolean)
}

function buildEmpty(clientHasVisits: boolean): FormState {
  return {
    visited_at: nowLocalIsoMinutes(),
    stage: clientHasVisits ? 'positioning' : 'discovery',
    summary: '',
    audio_url: '',
    brand_keywords_text: '',
    emotional_keywords_text: '',
    value_proposition: '',
    differentiation: '',
    touchpoints_text: '',
    must_do_text: '',
    suggested_text: '',
    optional_text: '',
    color_tone: '',
    visual_style: '',
  }
}

function fromVisit(v: CisVisit | null): FormState {
  if (!v) return buildEmpty(false)
  const c: BrandCard = v.brand_card || {}
  const dt = v.visited_at ? v.visited_at.slice(0, 16) : nowLocalIsoMinutes()
  return {
    visited_at: dt,
    stage: v.stage,
    summary: v.summary || '',
    audio_url: v.audio_url || '',
    brand_keywords_text: arrToText(c.brand_keywords),
    emotional_keywords_text: arrToText(c.emotional_keywords),
    value_proposition: c.value_proposition || '',
    differentiation: c.differentiation || '',
    touchpoints_text: arrToText(c.touchpoints),
    must_do_text: arrToText(c.priority_needs?.must_do),
    suggested_text: arrToText(c.priority_needs?.suggested),
    optional_text: arrToText(c.priority_needs?.optional),
    color_tone: c.visual_hints?.color_tone || '',
    visual_style: c.visual_hints?.style || '',
  }
}

export function CisVisitDialog({
  open,
  onOpenChange,
  mode,
  clientId,
  initialVisit,
  onSubmit,
}: Props) {
  const user = useAuthStore(s => s.user)
  const [form, setForm] = useState<FormState>(buildEmpty(false))
  const [submitting, setSubmitting] = useState(false)
  const [uploading, setUploading] = useState(false)
  const [analyzing, setAnalyzing] = useState(false)
  const fileInputRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    if (open) setForm(fromVisit(initialVisit))
  }, [open, initialVisit])

  const update = <K extends keyof FormState>(k: K, v: FormState[K]) => {
    setForm(prev => ({ ...prev, [k]: v }))
  }

  const handleFilePick = () => fileInputRef.current?.click()

  const handleUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    e.target.value = ''
    if (!file) return

    if (!file.type.startsWith('audio/')) {
      toast.error(A.invalid_type)
      return
    }
    if (!user?.workspace_id) {
      toast.error('找不到 workspace context、請重新登入')
      return
    }

    setUploading(true)
    try {
      const result = await uploadVisitAudio({
        workspaceId: user.workspace_id,
        clientId,
        visitId: initialVisit?.id ?? null,
        file,
      })
      if (!result.ok) {
        toast.error(`${A.toast_upload_failed}：${result.error}`)
        return
      }
      update('audio_url', result.publicUrl)
      toast.success(A.toast_upload_success)
    } finally {
      setUploading(false)
    }
  }

  const handleRemoveAudio = () => {
    update('audio_url', '')
  }

  const handleTranscribe = () => {
    toast(A.toast_transcribe_pending, { duration: 5000 })
  }

  const handleAnalyze = async () => {
    if (!form.summary.trim()) {
      toast.error(AI.toast_no_summary)
      return
    }
    setAnalyzing(true)
    try {
      const res = await fetch('/api/cis/analyze', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ summary: form.summary }),
      })
      if (!res.ok) {
        const body = (await res.json().catch(() => ({}))) as { error?: string }
        toast.error(`${AI.toast_failed}：${body.error || res.statusText}`)
        return
      }
      const { brand_card, mode: aiMode } = (await res.json()) as {
        brand_card: BrandCard
        mode: string
      }
      // Merge into form (only fill fields that are currently empty, keep user input)
      setForm(prev => ({
        ...prev,
        brand_keywords_text:
          prev.brand_keywords_text || arrToText(brand_card.brand_keywords),
        emotional_keywords_text:
          prev.emotional_keywords_text || arrToText(brand_card.emotional_keywords),
        value_proposition: prev.value_proposition || brand_card.value_proposition || '',
        touchpoints_text: prev.touchpoints_text || arrToText(brand_card.touchpoints),
        must_do_text: prev.must_do_text || arrToText(brand_card.priority_needs?.must_do),
        suggested_text: prev.suggested_text || arrToText(brand_card.priority_needs?.suggested),
        optional_text: prev.optional_text || arrToText(brand_card.priority_needs?.optional),
      }))
      toast.success(AI.toast_filled)
      if (aiMode !== 'llm') {
        toast(AI.toast_heuristic_mode, { duration: 5000 })
      }
    } catch (e) {
      toast.error(`${AI.toast_failed}：${(e as Error).message}`)
    } finally {
      setAnalyzing(false)
    }
  }

  const handleSubmit = async () => {
    setSubmitting(true)
    try {
      const brand_card: BrandCard = {
        brand_keywords: textToArr(form.brand_keywords_text),
        emotional_keywords: textToArr(form.emotional_keywords_text),
        value_proposition: form.value_proposition.trim() || undefined,
        differentiation: form.differentiation.trim() || undefined,
        touchpoints: textToArr(form.touchpoints_text),
        priority_needs: {
          must_do: textToArr(form.must_do_text),
          suggested: textToArr(form.suggested_text),
          optional: textToArr(form.optional_text),
        },
        visual_hints: {
          color_tone: form.color_tone.trim() || undefined,
          style: form.visual_style.trim() || undefined,
        },
      }

      const payload: CreateCisVisitData = {
        client_id: clientId,
        visited_at: new Date(form.visited_at).toISOString(),
        stage: form.stage,
        summary: form.summary.trim() || null,
        brand_card,
        audio_url: form.audio_url.trim() || null,
      }

      await onSubmit(payload)
      toast.success(mode === 'create' ? L.toast_create_success : L.toast_update_success)
      onOpenChange(false)
    } catch (e) {
      toast.error(`${L.toast_save_failed}：${(e as Error).message}`)
    } finally {
      setSubmitting(false)
    }
  }

  const stageIdx = CIS_VISIT_STAGE_OPTIONS.findIndex(o => o.value === form.stage)
  const guidance = CIS_GUIDANCE_QUESTIONS[stageIdx]
  const isBusy = submitting || uploading || analyzing

  return (
    <Dialog open={open} onOpenChange={v => (!isBusy ? onOpenChange(v) : undefined)}>
      <DialogContent level={1} className="max-w-3xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{mode === 'create' ? L.add_title : L.edit_title}</DialogTitle>
        </DialogHeader>

        <div className="grid gap-5 py-2">
          {/* 拜訪資訊 */}
          <section className="grid gap-3">
            <h3 className="text-xs font-semibold text-morandi-secondary uppercase tracking-wide">
              {L.section_meta}
            </h3>
            <div className="grid grid-cols-2 gap-3">
              <Field label={L.label_visited_at}>
                <Input
                  type="datetime-local"
                  value={form.visited_at}
                  onChange={e => update('visited_at', e.target.value)}
                  disabled={isBusy}
                />
              </Field>
              <Field label={L.label_stage}>
                <select
                  value={form.stage}
                  onChange={e => update('stage', e.target.value as CisVisitStage)}
                  disabled={isBusy}
                  className="h-9 px-2 rounded-md border border-morandi-muted/40 bg-background text-sm text-morandi-primary focus:outline-none focus:ring-1 focus:ring-morandi-gold/40"
                >
                  {CIS_VISIT_STAGE_OPTIONS.map(o => (
                    <option key={o.value} value={o.value}>
                      {o.label}
                    </option>
                  ))}
                </select>
              </Field>
            </div>
          </section>

          {/* 錄音上傳 */}
          <section className="rounded-md border border-morandi-muted/20 bg-morandi-muted/5 p-3 grid gap-2">
            <div className="flex items-center justify-between gap-3 flex-wrap">
              <div className="flex items-center gap-2 text-xs font-semibold text-morandi-primary">
                <Mic size={14} />
                拜訪錄音
              </div>
              <div className="flex items-center gap-1 flex-wrap">
                {!form.audio_url && (
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={handleFilePick}
                    disabled={isBusy}
                  >
                    {uploading ? (
                      <Loader2 className="w-3.5 h-3.5 mr-1 animate-spin" />
                    ) : (
                      <Upload size={14} className="mr-1" />
                    )}
                    {uploading ? A.btn_uploading : A.btn_upload}
                  </Button>
                )}
                {form.audio_url && (
                  <>
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      onClick={handleTranscribe}
                      disabled={isBusy}
                    >
                      <Sparkles size={14} className="mr-1" />
                      {A.btn_transcribe}
                    </Button>
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      onClick={handleRemoveAudio}
                      disabled={isBusy}
                    >
                      <X size={14} className="mr-1" />
                      {A.btn_remove}
                    </Button>
                  </>
                )}
              </div>
            </div>

            <input
              ref={fileInputRef}
              type="file"
              accept="audio/*"
              className="hidden"
              onChange={handleUpload}
            />

            {form.audio_url && (
              <div className="flex items-center gap-2 text-xs text-morandi-secondary">
                <FileAudio size={14} className="shrink-0" />
                <audio src={form.audio_url} controls className="flex-1 max-w-md" preload="none" />
              </div>
            )}
          </section>

          {/* 引導對話 */}
          {guidance && (
            <section className="rounded-md bg-morandi-gold/8 border border-morandi-gold/20 p-3">
              <div className="flex items-center gap-2 text-xs font-semibold text-morandi-gold mb-2">
                <Lightbulb size={14} />
                {guidance.stage} — 建議問題
              </div>
              <ul className="space-y-1 text-xs text-morandi-primary">
                {guidance.questions.map((q, i) => (
                  <li key={i} className="leading-relaxed">
                    · {q}
                  </li>
                ))}
              </ul>
            </section>
          )}

          {/* 拜訪總結 + AI 分析 */}
          <section className="grid gap-2">
            <div className="flex items-center justify-between gap-2">
              <h3 className="text-xs font-semibold text-morandi-secondary uppercase tracking-wide">
                {L.section_summary}
              </h3>
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={handleAnalyze}
                disabled={isBusy || !form.summary.trim()}
              >
                {analyzing ? (
                  <Loader2 className="w-3.5 h-3.5 mr-1 animate-spin" />
                ) : (
                  <Sparkles size={14} className="mr-1" />
                )}
                {analyzing ? AI.btn_analyzing : AI.btn_analyze}
              </Button>
            </div>
            <Textarea
              value={form.summary}
              onChange={e => update('summary', e.target.value)}
              placeholder={L.placeholder_summary}
              disabled={isBusy}
              rows={4}
            />
          </section>

          {/* 品牌資料卡 */}
          <section className="grid gap-3">
            <h3 className="text-xs font-semibold text-morandi-secondary uppercase tracking-wide">
              {L.section_brand_card}
            </h3>
            <div className="grid grid-cols-2 gap-3">
              <Field label={L.label_brand_keywords}>
                <Input
                  value={form.brand_keywords_text}
                  onChange={e => update('brand_keywords_text', e.target.value)}
                  placeholder={L.placeholder_keywords}
                  disabled={isBusy}
                />
              </Field>
              <Field label={L.label_emotional_keywords}>
                <Input
                  value={form.emotional_keywords_text}
                  onChange={e => update('emotional_keywords_text', e.target.value)}
                  placeholder={L.placeholder_keywords}
                  disabled={isBusy}
                />
              </Field>
              <Field label={L.label_value_proposition} className="col-span-2">
                <Input
                  value={form.value_proposition}
                  onChange={e => update('value_proposition', e.target.value)}
                  placeholder={L.placeholder_value_proposition}
                  disabled={isBusy}
                />
              </Field>
              <Field label={L.label_differentiation} className="col-span-2">
                <Textarea
                  value={form.differentiation}
                  onChange={e => update('differentiation', e.target.value)}
                  placeholder={L.placeholder_differentiation}
                  disabled={isBusy}
                  rows={2}
                />
              </Field>
              <Field label={L.label_touchpoints} className="col-span-2">
                <Input
                  value={form.touchpoints_text}
                  onChange={e => update('touchpoints_text', e.target.value)}
                  placeholder={L.placeholder_touchpoints}
                  disabled={isBusy}
                />
              </Field>
              <Field label={L.label_color_tone}>
                <Input
                  value={form.color_tone}
                  onChange={e => update('color_tone', e.target.value)}
                  placeholder={L.placeholder_color_tone}
                  disabled={isBusy}
                />
              </Field>
              <Field label={L.label_visual_style}>
                <Input
                  value={form.visual_style}
                  onChange={e => update('visual_style', e.target.value)}
                  placeholder={L.placeholder_visual_style}
                  disabled={isBusy}
                />
              </Field>
            </div>

            <div className="grid grid-cols-3 gap-3">
              <Field label={L.label_must_do}>
                <Input
                  value={form.must_do_text}
                  onChange={e => update('must_do_text', e.target.value)}
                  placeholder={L.placeholder_items}
                  disabled={isBusy}
                />
              </Field>
              <Field label={L.label_suggested}>
                <Input
                  value={form.suggested_text}
                  onChange={e => update('suggested_text', e.target.value)}
                  placeholder={L.placeholder_items}
                  disabled={isBusy}
                />
              </Field>
              <Field label={L.label_optional}>
                <Input
                  value={form.optional_text}
                  onChange={e => update('optional_text', e.target.value)}
                  placeholder={L.placeholder_items}
                  disabled={isBusy}
                />
              </Field>
            </div>
          </section>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)} disabled={isBusy}>
            {P.btn_cancel}
          </Button>
          <Button onClick={handleSubmit} disabled={isBusy}>
            {submitting && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
            {submitting ? P.btn_saving : P.btn_save}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}

function Field({
  label,
  className,
  children,
}: {
  label: string
  className?: string
  children: React.ReactNode
}) {
  return (
    <div className={`grid gap-1.5 ${className || ''}`}>
      <Label className="text-xs text-morandi-primary">{label}</Label>
      {children}
    </div>
  )
}
