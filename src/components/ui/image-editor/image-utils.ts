/**
 * ImageEditor 輔助函數
 */

import { logger } from '@/lib/utils/logger'
import type { ImageAdjustments, ImageEditorSettings } from './types'

/**
 * 應用旋轉和翻轉到圖片（用於預覽）
 */
export async function applyTransformToImage(
  src: string,
  rotation: number,
  flipH: boolean
): Promise<string> {
  // 如果沒有變換，直接返回原圖
  if (rotation === 0 && !flipH) return src

  return new Promise(resolve => {
    const img = new Image()
    img.crossOrigin = 'anonymous'
    img.onload = () => {
      const canvas = document.createElement('canvas')
      const ctx = canvas.getContext('2d')
      if (!ctx) {
        resolve(src)
        return
      }

      // 計算旋轉後的畫布尺寸
      const isRotated90 = rotation === 90 || rotation === 270
      canvas.width = isRotated90 ? img.height : img.width
      canvas.height = isRotated90 ? img.width : img.height

      // 移動到中心，應用變換
      ctx.translate(canvas.width / 2, canvas.height / 2)
      ctx.rotate((rotation * Math.PI) / 180)
      if (flipH) {
        ctx.scale(-1, 1)
      }
      ctx.drawImage(img, -img.width / 2, -img.height / 2)

      resolve(canvas.toDataURL('image/jpeg', 0.85))
    }
    img.onerror = () => resolve(src)
    img.src = src
  })
}

/**
 * 應用色彩調整到圖片
 */
export async function applyAdjustmentsToImage(
  src: string,
  adjustments: ImageAdjustments
): Promise<string> {
  // 如果沒有調整，直接返回原圖
  const hasChanges = Object.values(adjustments).some(v => v !== 0)
  if (!hasChanges) return src

  return new Promise(resolve => {
    const img = new Image()
    img.crossOrigin = 'anonymous'
    img.onload = () => {
      const canvas = document.createElement('canvas')
      const ctx = canvas.getContext('2d')
      if (!ctx) {
        resolve(src)
        return
      }

      canvas.width = img.width
      canvas.height = img.height

      // 基本繪製
      ctx.drawImage(img, 0, 0)

      // 獲取像素數據
      const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height)
      const data = imageData.data

      // 先處理銳利度（需要鄰近像素，所以要先處理）
      if (adjustments.clarity && adjustments.clarity !== 0) {
        const originalData = new Uint8ClampedArray(data)
        const width = canvas.width
        const height = canvas.height
        const amount = adjustments.clarity / 100 // -1 到 1

        for (let y = 1; y < height - 1; y++) {
          for (let x = 1; x < width - 1; x++) {
            const idx = (y * width + x) * 4

            for (let c = 0; c < 3; c++) {
              // 取鄰近像素
              const top = originalData[((y - 1) * width + x) * 4 + c]
              const bottom = originalData[((y + 1) * width + x) * 4 + c]
              const left = originalData[(y * width + (x - 1)) * 4 + c]
              const right = originalData[(y * width + (x + 1)) * 4 + c]
              const center = originalData[idx + c]

              // Unsharp mask: center + amount * (center - blur)
              const blur = (top + bottom + left + right) / 4
              const sharpened = center + amount * (center - blur) * 2

              data[idx + c] = Math.max(0, Math.min(255, sharpened))
            }
          }
        }
      }

      // 應用其他調整
      for (let i = 0; i < data.length; i += 4) {
        let r = data[i]
        let g = data[i + 1]
        let b = data[i + 2]

        // 曝光度
        if (adjustments.exposure !== 0) {
          const factor = 1 + adjustments.exposure / 100
          r = Math.min(255, r * factor)
          g = Math.min(255, g * factor)
          b = Math.min(255, b * factor)
        }

        // 對比度
        if (adjustments.contrast !== 0) {
          const factor = (259 * (adjustments.contrast + 255)) / (255 * (259 - adjustments.contrast))
          r = factor * (r - 128) + 128
          g = factor * (g - 128) + 128
          b = factor * (b - 128) + 128
        }

        // 飽和度
        if (adjustments.saturation !== 0) {
          const gray = 0.2989 * r + 0.587 * g + 0.114 * b
          const factor = 1 + adjustments.saturation / 100
          r = gray + factor * (r - gray)
          g = gray + factor * (g - gray)
          b = gray + factor * (b - gray)
        }

        // 色溫
        if (adjustments.temperature !== 0) {
          const temp = adjustments.temperature / 100
          r = r + temp * 30
          b = b - temp * 30
        }

        // 限制範圍
        data[i] = Math.max(0, Math.min(255, r))
        data[i + 1] = Math.max(0, Math.min(255, g))
        data[i + 2] = Math.max(0, Math.min(255, b))
      }

      ctx.putImageData(imageData, 0, 0)
      resolve(canvas.toDataURL('image/jpeg', 0.9))
    }
    img.onerror = () => resolve(src)
    img.src = src
  })
}

/**
 * 裁切圖片
 */
export async function cropImage(
  src: string,
  settings: ImageEditorSettings,
  aspectRatio: number
): Promise<Blob> {
  return new Promise((resolve, reject) => {
    const img = new Image()
    img.crossOrigin = 'anonymous'
    img.onload = () => {
      // 先處理旋轉/翻轉
      const isRotated90 = settings.rotation === 90 || settings.rotation === 270
      const srcWidth = isRotated90 ? img.height : img.width
      const srcHeight = isRotated90 ? img.width : img.height

      // 建立臨時 canvas 來應用旋轉/翻轉
      const tempCanvas = document.createElement('canvas')
      const tempCtx = tempCanvas.getContext('2d')
      if (!tempCtx) {
        reject(new Error('Canvas context not available'))
        return
      }

      tempCanvas.width = srcWidth
      tempCanvas.height = srcHeight

      // 應用變換
      tempCtx.translate(srcWidth / 2, srcHeight / 2)
      tempCtx.rotate((settings.rotation * Math.PI) / 180)
      if (settings.flipH) {
        tempCtx.scale(-1, 1)
      }
      tempCtx.drawImage(img, -img.width / 2, -img.height / 2)

      // 現在從變換後的圖片裁切
      const canvas = document.createElement('canvas')
      const ctx = canvas.getContext('2d')
      if (!ctx) {
        reject(new Error('Canvas context not available'))
        return
      }

      // 計算裁切區域
      const imgRatio = srcWidth / srcHeight
      let cropWidth: number, cropHeight: number, cropX: number, cropY: number

      if (imgRatio > aspectRatio) {
        // 圖片較寬，以高度為基準
        cropHeight = srcHeight / settings.scale
        cropWidth = cropHeight * aspectRatio
      } else {
        // 圖片較高，以寬度為基準
        cropWidth = srcWidth / settings.scale
        cropHeight = cropWidth / aspectRatio
      }

      // 根據位置計算偏移
      const maxOffsetX = srcWidth - cropWidth
      const maxOffsetY = srcHeight - cropHeight
      cropX = (settings.x / 100) * maxOffsetX
      cropY = (settings.y / 100) * maxOffsetY

      // 設定輸出尺寸
      canvas.width = cropWidth
      canvas.height = cropHeight

      ctx.drawImage(tempCanvas, cropX, cropY, cropWidth, cropHeight, 0, 0, cropWidth, cropHeight)

      canvas.toBlob(
        blob => {
          if (blob) {
            resolve(blob)
          } else {
            reject(new Error('Canvas to Blob failed'))
          }
        },
        'image/jpeg',
        0.9
      )
    }
    img.onerror = () => reject(new Error('Image load failed'))
    img.src = src
  })
}

