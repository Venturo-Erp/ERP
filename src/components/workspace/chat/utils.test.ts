import { describe, it, expect, vi } from 'vitest'

// Mock dependencies
vi.mock('date-fns', () => ({
  format: (date: Date, fmt: string) => {
    const pad = (n: number) => n.toString().padStart(2, '0')
    if (fmt === 'HH:mm') return `${pad(date.getHours())}:${pad(date.getMinutes())}`
    if (fmt === 'MM/dd HH:mm')
      return `${pad(date.getMonth() + 1)}/${pad(date.getDate())} ${pad(date.getHours())}:${pad(date.getMinutes())}`
    return ''
  },
  isToday: (date: Date) => {
    const now = new Date()
    return (
      date.getFullYear() === now.getFullYear() &&
      date.getMonth() === now.getMonth() &&
      date.getDate() === now.getDate()
    )
  },
  isYesterday: (date: Date) => {
    const yesterday = new Date()
    yesterday.setDate(yesterday.getDate() - 1)
    return (
      date.getFullYear() === yesterday.getFullYear() &&
      date.getMonth() === yesterday.getMonth() &&
      date.getDate() === yesterday.getDate()
    )
  },
}))

vi.mock('@/services/storage', () => ({
  getPublicUrlFromStorage: (path: string, bucket: string) =>
    `https://storage.example.com/${bucket}/${path}`,
}))

vi.mock('./constants', () => ({
  STORAGE_BUCKET: 'chat-files',
  MAX_FILE_SIZE: 10 * 1024 * 1024,
  ALLOWED_FILE_TYPES: {
    'image/*': ['.jpg', '.jpeg', '.png', '.gif', '.webp'],
    'application/pdf': ['.pdf'],
    'text/plain': ['.txt'],
  },
}))

import { formatMessageTime, formatFileSize, validateFile, resolveAttachmentUrl } from './utils'

describe('formatMessageTime', () => {
  it('returns empty for empty string', () => {
    expect(formatMessageTime('')).toBe('')
  })

  it('returns empty for invalid date', () => {
    expect(formatMessageTime('not-a-date')).toBe('')
  })

  it('formats today time as HH:mm', () => {
    const now = new Date()
    now.setHours(14, 30, 0)
    expect(formatMessageTime(now.toISOString())).toBe('14:30')
  })

  it('formats yesterday with prefix', () => {
    const yesterday = new Date()
    yesterday.setDate(yesterday.getDate() - 1)
    yesterday.setHours(9, 15, 0)
    const result = formatMessageTime(yesterday.toISOString())
    expect(result).toContain('昨天')
    expect(result).toContain('09:15')
  })

  it('formats older dates as MM/dd HH:mm', () => {
    const old = new Date('2024-01-15T10:30:00Z')
    const result = formatMessageTime(old.toISOString())
    expect(result).toMatch(/\d{2}\/\d{2} \d{2}:\d{2}/)
  })
})

describe('formatFileSize', () => {
  it('formats bytes', () => {
    expect(formatFileSize(500)).toBe('500 B')
  })

  it('formats KB', () => {
    expect(formatFileSize(2048)).toBe('2.0 KB')
  })

  it('formats MB', () => {
    expect(formatFileSize(5 * 1024 * 1024)).toBe('5.0 MB')
  })

  it('formats fractional KB', () => {
    expect(formatFileSize(1536)).toBe('1.5 KB')
  })

  it('formats 0 bytes', () => {
    expect(formatFileSize(0)).toBe('0 B')
  })

  it('formats 1023 bytes as B', () => {
    expect(formatFileSize(1023)).toBe('1023 B')
  })

  it('formats 1024 as 1.0 KB', () => {
    expect(formatFileSize(1024)).toBe('1.0 KB')
  })
})

describe('validateFile', () => {
  const makeFile = (name: string, size: number, type: string) => ({ name, size, type }) as File

  it('accepts valid image', () => {
    const result = validateFile(makeFile('photo.jpg', 1000, 'image/jpeg'))
    expect(result.valid).toBe(true)
  })

  it('rejects oversized file', () => {
    const result = validateFile(makeFile('big.jpg', 20 * 1024 * 1024, 'image/jpeg'))
    expect(result.valid).toBe(false)
    expect(result.error).toContain('10 MB')
  })

  it('accepts PDF', () => {
    const result = validateFile(makeFile('doc.pdf', 1000, 'application/pdf'))
    expect(result.valid).toBe(true)
  })

  it('accepts text file', () => {
    const result = validateFile(makeFile('note.txt', 100, 'text/plain'))
    expect(result.valid).toBe(true)
  })

  it('rejects unknown type without valid extension', () => {
    const result = validateFile(makeFile('virus.exe', 100, 'application/x-msdownload'))
    expect(result.valid).toBe(false)
    expect(result.error).toContain('不支援')
  })

  it('accepts by extension fallback', () => {
    const result = validateFile(makeFile('image.png', 100, 'unknown/type'))
    expect(result.valid).toBe(true)
  })
})

describe('resolveAttachmentUrl', () => {
  it('uses publicUrl first', () => {
    const att = { publicUrl: 'https://pub.com/img.jpg', url: 'other', path: 'p' } as never
    expect(resolveAttachmentUrl(att)).toBe('https://pub.com/img.jpg')
  })

  it('falls back to url', () => {
    const att = { url: 'https://cdn.com/img.jpg', path: 'p' } as never
    expect(resolveAttachmentUrl(att)).toBe('https://cdn.com/img.jpg')
  })

  it('falls back to storage path', () => {
    const att = { path: 'uploads/img.jpg' } as never
    expect(resolveAttachmentUrl(att)).toBe('https://storage.example.com/chat-files/uploads/img.jpg')
  })

  it('returns empty for no urls', () => {
    const att = {} as never
    expect(resolveAttachmentUrl(att)).toBe('')
  })
})
