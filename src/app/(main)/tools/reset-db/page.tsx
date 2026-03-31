'use client'

import { useState } from 'react'
import { logger } from '@/lib/utils/logger'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { AlertCircle, CheckCircle2, Database, Trash2, RefreshCw } from 'lucide-react'
import { RESET_DB_LABELS } from './constants/labels'

export default function ResetDBPage() {
  const [status, setStatus] = useState<'idle' | 'deleting' | 'success' | 'error'>('idle')
  const [message, setMessage] = useState('')

  const deleteSingleDB = (dbName: string): Promise<void> => {
    return new Promise((resolve, reject) => {
      const deleteRequest = indexedDB.deleteDatabase(dbName)

      deleteRequest.onsuccess = () => {
        logger.log(`✅ ${dbName} 刪除成功`)
        resolve()
      }

      deleteRequest.onerror = () => {
        logger.error(`❌ ${dbName} 刪除失敗:`, deleteRequest.error)
        reject(deleteRequest.error)
      }

      deleteRequest.onblocked = () => {
        logger.warn(`⚠️ ${dbName} 被鎖定`)
        reject(new Error(RESET_DB_LABELS.DB_LOCKED(dbName)))
      }
    })
  }

  const handleReset = async () => {
    try {
      setStatus('deleting')

      // Step 1: 關閉所有現有連線
      setMessage(RESET_DB_LABELS.STEP_1)
      const dbNames = ['VenturoOfflineDB', 'venturo-db']

      for (const dbName of dbNames) {
        try {
          const openRequest = indexedDB.open(dbName)
          await new Promise<void>(resolve => {
            openRequest.onsuccess = () => {
              const db = openRequest.result
              logger.log(`🔌 關閉 ${dbName} 連線...`)
              db.close()
              resolve()
            }
            openRequest.onerror = () => {
              logger.log(`⚠️ ${dbName} 沒有連線需要關閉`)
              resolve()
            }
          })
        } catch (e) {
          logger.log(`⚠️ 無法關閉 ${dbName} 連線，繼續執行刪除...`)
        }
      }

      // Step 2: 等待連線完全關閉
      setMessage(RESET_DB_LABELS.STEP_2)
      await new Promise(resolve => setTimeout(resolve, 500))

      // Step 3: 刪除舊資料庫 (venturo-db)
      setMessage(RESET_DB_LABELS.STEP_3)
      try {
        await Promise.race([
          deleteSingleDB('venturo-db'),
          new Promise((_, reject) => setTimeout(() => reject(new Error('timeout')), 5000)),
        ])
        logger.log('✅ 舊資料庫已刪除')
      } catch (e) {
        logger.log('⚠️ 舊資料庫刪除失敗或不存在，繼續...')
      }

      // Step 4: 刪除當前資料庫 (VenturoOfflineDB)
      setMessage(RESET_DB_LABELS.STEP_4)

      await Promise.race([
        deleteSingleDB('VenturoOfflineDB'),
        new Promise((_, reject) => setTimeout(() => reject(new Error('timeout')), 10000)),
      ])

      setStatus('success')
      setMessage(RESET_DB_LABELS.SUCCESS)
    } catch (error) {
      setStatus('error')
      if (error instanceof Error && error.message === 'timeout') {
        setMessage(RESET_DB_LABELS.TIMEOUT)
      } else if (error instanceof Error && error.message.includes(RESET_DB_LABELS.LOCKED_LABEL)) {
        setMessage(RESET_DB_LABELS.LOCKED_MSG)
      } else {
        setMessage(RESET_DB_LABELS.EXEC_FAILED + (error as Error).message)
      }
      logger.error(RESET_DB_LABELS.EXEC_FAILED, error)
    }
  }

  const handleReload = () => {
    window.location.reload()
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-muted p-8">
      <Card className="max-w-2xl w-full">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Database className="w-6 h-6" />
            {RESET_DB_LABELS.TITLE}
          </CardTitle>
          <CardDescription>{RESET_DB_LABELS.LABEL_4817}</CardDescription>
        </CardHeader>

        <CardContent className="space-y-6">
          {/* 說明 */}
          <div className="bg-status-info-bg border border-status-info/30 rounded-lg p-4">
            <div className="flex gap-2">
              <AlertCircle className="h-5 w-5 text-status-info flex-shrink-0 mt-0.5" />
              <div className="text-sm text-morandi-primary">
                <strong>{RESET_DB_LABELS.LABEL_6622}</strong>
                <ol className="list-decimal ml-4 mt-2 space-y-1">
                  <li>{RESET_DB_LABELS.DELETE_8975}</li>
                  <li>{RESET_DB_LABELS.LABEL_6968}</li>
                  <li>{RESET_DB_LABELS.LABEL_2869}</li>
                </ol>
                <p className="mt-3 text-status-warning font-semibold">
                  {RESET_DB_LABELS.WARNING_DATA_LOSS}
                </p>
              </div>
            </div>
          </div>

          {/* 當前狀態 */}
          <div className="bg-muted p-4 rounded-lg border border-border">
            <h3 className="font-semibold mb-2">{RESET_DB_LABELS.LABEL_6918}</h3>
            <div className="space-y-1 text-sm">
              <div>
                1. <code className="bg-card px-2 py-1 rounded border">VenturoOfflineDB</code>
                <span className="text-status-success ml-2">{RESET_DB_LABELS.CURRENT_USE}</span>
              </div>
              <div>
                2. <code className="bg-card px-2 py-1 rounded border">venturo-db</code>
                <span className="text-morandi-secondary ml-2">{RESET_DB_LABELS.OLD_DB}</span>
              </div>
              <div className="mt-2 text-morandi-secondary">
                {RESET_DB_LABELS.REBUILD_VERSION}
                <code className="bg-card px-2 py-1 rounded border">
                  {RESET_DB_LABELS.REBUILD_VERSION_VALUE}
                </code>
              </div>
            </div>
          </div>

          {/* 狀態訊息 */}
          {status !== 'idle' && (
            <div
              className={`p-4 rounded-lg border ${
                status === 'success'
                  ? 'bg-status-success-bg border-status-success/30 text-status-success'
                  : status === 'error'
                    ? 'bg-status-danger-bg border-status-danger/30 text-status-danger'
                    : 'bg-status-info-bg border-status-info/30 text-status-info'
              }`}
            >
              <div className="flex gap-2">
                {status === 'success' ? (
                  <CheckCircle2 className="h-5 w-5 flex-shrink-0 mt-0.5" />
                ) : (
                  <AlertCircle className="h-5 w-5 flex-shrink-0 mt-0.5" />
                )}
                <div className="text-sm font-medium">{message}</div>
              </div>
            </div>
          )}

          {/* 操作按鈕 */}
          <div className="flex gap-3">
            {status === 'success' ? (
              <Button onClick={handleReload} className="w-full gap-2" size="lg">
                <RefreshCw size={16} />
                {RESET_DB_LABELS.LABEL_1215}
              </Button>
            ) : (
              <Button
                onClick={handleReset}
                variant="destructive"
                className="w-full"
                size="lg"
                disabled={status === 'deleting'}
              >
                <Trash2 className="w-4 h-4 mr-2" />
                {status === 'deleting' ? RESET_DB_LABELS.CLEARING : RESET_DB_LABELS.CLEAR_INDEXEDDB}
              </Button>
            )}
          </div>

          {/* 技術說明 */}
          <details className="text-sm text-morandi-secondary border-t border-border pt-4">
            <summary className="cursor-pointer font-semibold hover:text-foreground">
              {RESET_DB_LABELS.LABEL_6860}
            </summary>
            <div className="mt-2 space-y-2 pl-4">
              <p>
                <strong>{RESET_DB_LABELS.LABEL_5751}</strong>
                {RESET_DB_LABELS.LABEL_8168}
                {RESET_DB_LABELS.NOT_FOUND_9170}
              </p>
              <p>
                <strong>{RESET_DB_LABELS.LABEL_7651}</strong>
                {RESET_DB_LABELS.ADD_2547}
                {RESET_DB_LABELS.LABEL_995}
              </p>
              <p>
                <strong>{RESET_DB_LABELS.LABEL_3533}</strong>完全刪除舊資料庫 → 重建全新的 v6 版本 →
                {RESET_DB_LABELS.LABEL_9350}
              </p>
            </div>
          </details>
        </CardContent>
      </Card>
    </div>
  )
}
