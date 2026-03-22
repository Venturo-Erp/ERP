'use client'
import { GAME_OFFICE_LABELS } from './constants/labels'

export default function Error({ error, reset }: { error: Error; reset: () => void }) {
  return (
    <div className="flex flex-col items-center justify-center h-screen bg-[#0f0f1a] gap-4">
      <div className="text-red-400 text-lg">{GAME_OFFICE_LABELS.LOADING_2590}</div>
      <div className="text-morandi-secondary text-sm">{error.message}</div>
      <button
        onClick={reset}
        className="px-4 py-2 bg-emerald-600 text-white rounded hover:bg-emerald-500"
      >
        {GAME_OFFICE_LABELS.LABEL_2235}
      </button>
    </div>
  )
}
