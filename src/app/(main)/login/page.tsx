'use client'

import { LABELS } from './constants/labels'

import { useState, useEffect } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { useAuthStore } from '@/stores/auth-store'
import { AlertCircle, Eye, EyeOff } from 'lucide-react'
import { logger } from '@/lib/utils/logger'

// localStorage keys
const LAST_CODE_KEY = 'venturo-last-code'
const LAST_USERNAME_KEY = 'venturo-last-username'

export default function LoginPage() {
  const [code, setCode] = useState('')
  const [username, setUsername] = useState('')
  const [password, setPassword] = useState('')
  const [showPassword, setShowPassword] = useState(false)
  const [rememberMe, setRememberMe] = useState(true)
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState('')
  const router = useRouter()
  const searchParams = useSearchParams()
  const { validateLogin } = useAuthStore()

  useEffect(() => {
    const lastCode = localStorage.getItem(LAST_CODE_KEY)
    const lastUsername = localStorage.getItem(LAST_USERNAME_KEY)
    if (lastCode) setCode(lastCode)
    if (lastUsername) setUsername(lastUsername)
  }, [])

  useEffect(() => {
    if (searchParams.get('reason') === 'session_expired') {
      setError(LABELS.SESSION_EXPIRED)
    }
  }, [searchParams])

  const getRedirectPath = (): string => {
    const redirectParam = searchParams.get('redirect')
    if (redirectParam && redirectParam !== '/login') return redirectParam
    const lastPath = localStorage.getItem('last-visited-path')
    if (lastPath && lastPath !== '/login') return lastPath
    return '/dashboard'
  }

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault()
    setError('')

    const trimmedCode = code.trim().toUpperCase()
    if (!trimmedCode) {
      setError(LABELS.ERROR_ENTER_CODE)
      return
    }
    if (!username.trim()) {
      setError(LABELS.ERROR_ENTER_USERNAME)
      return
    }

    setIsLoading(true)
    try {
      localStorage.setItem(LAST_CODE_KEY, trimmedCode)
      localStorage.setItem(LAST_USERNAME_KEY, username.trim())

      const result = await validateLogin(username.trim(), password, trimmedCode, rememberMe)
      if (result.success) {
        window.location.href = getRedirectPath()
      } else {
        setError(result.message || '帳號或密碼錯誤')
      }
    } catch (error) {
      logger.error('Login error:', error)
      setError('系統錯誤，請稍後再試')
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <div className="flex items-center justify-center min-h-screen bg-gradient-to-br from-[#f0ebe3] via-[#f8f5f0] to-[#e8e0d6]">
      <div
        className="w-full max-w-[380px] mx-4"
        style={{
          background: 'linear-gradient(0deg, rgb(255, 255, 255) 0%, rgb(250, 247, 243) 100%)',
          borderRadius: '40px',
          padding: '32px 40px',
          border: '5px solid rgb(255, 255, 255)',
          boxShadow: 'rgba(180, 160, 120, 0.45) 0px 30px 30px -20px',
        }}
      >
        {/* 標題 */}
        <h1
          className="text-center font-black text-[28px] tracking-tight"
          style={{ color: 'var(--morandi-gold)' }}
        >
          Venturo
        </h1>
        <p className="text-center text-xs text-[#aaa] mt-1">旅遊資源管理系統</p>

        {/* 錯誤訊息 */}
        {error && (
          <div className="mt-4 p-3 bg-morandi-red/10 border border-morandi-red/30 rounded-2xl flex items-start gap-2">
            <AlertCircle size={16} className="text-morandi-red mt-0.5 shrink-0" />
            <span className="text-xs text-morandi-red">{error}</span>
          </div>
        )}

        {/* 表單 */}
        <form onSubmit={handleLogin} className="mt-5">
          <input
            type="text"
            value={code}
            onChange={e => setCode(e.target.value.toUpperCase())}
            placeholder="公司代號"
            required
            autoComplete="organization"
            autoFocus
            className="login-input uppercase"
          />
          <input
            type="text"
            value={username}
            onChange={e => setUsername(e.target.value)}
            placeholder="帳號（例：E001）"
            required
            autoComplete="username"
            className="login-input"
          />
          <div className="relative">
            <input
              type={showPassword ? 'text' : 'password'}
              value={password}
              onChange={e => setPassword(e.target.value)}
              placeholder="密碼"
              required
              autoComplete="current-password"
              className="login-input pr-10"
            />
            <button
              type="button"
              onClick={() => setShowPassword(!showPassword)}
              className="absolute right-4 top-1/2 -translate-y-1/2 text-[#aaa] hover:text-[#666] mt-[7px]"
            >
              {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
            </button>
          </div>

          {/* 記住我 */}
          <div className="flex items-center gap-2 mt-3 ml-2">
            <input
              type="checkbox"
              id="rememberMe"
              checked={rememberMe}
              onChange={e => setRememberMe(e.target.checked)}
              className="w-3.5 h-3.5 rounded accent-[var(--morandi-gold)] cursor-pointer"
            />
            <label
              htmlFor="rememberMe"
              className="text-[11px] text-[#aaa] cursor-pointer select-none"
            >
              記住我（30 天內免重新登入）
            </label>
          </div>

          {/* 登入按鈕 */}
          <button type="submit" disabled={isLoading || !code.trim()} className="login-button">
            {isLoading ? '登入中...' : '登入'}
          </button>
        </form>
      </div>

      <style>{`
        .login-input {
          width: 100%;
          background: white;
          border: none;
          padding: 14px 20px;
          border-radius: 20px;
          margin-top: 14px;
          box-shadow: rgba(180, 160, 120, 0.2) 0px 10px 10px -5px;
          border: 2px solid transparent;
          font-size: 14px;
          color: #333;
          outline: none;
          transition: border-color 0.2s;
        }
        .login-input::placeholder {
          color: #aaa;
        }
        .login-input:focus {
          border-color: var(--morandi-gold);
        }
        .login-button {
          display: block;
          width: 100%;
          font-weight: bold;
          background: linear-gradient(45deg, var(--morandi-gold) 0%, hsl(38, 35%, 65%) 100%);
          color: white;
          padding: 14px;
          margin-top: 20px;
          border-radius: 20px;
          box-shadow: rgba(180, 160, 120, 0.5) 0px 20px 10px -15px;
          border: none;
          font-size: 15px;
          cursor: pointer;
          transition: all 0.2s ease-in-out;
        }
        .login-button:hover {
          transform: scale(1.03);
          box-shadow: rgba(180, 160, 120, 0.5) 0px 23px 10px -20px;
        }
        .login-button:active {
          transform: scale(0.95);
          box-shadow: rgba(180, 160, 120, 0.5) 0px 15px 10px -10px;
        }
        .login-button:disabled {
          opacity: 0.6;
          cursor: not-allowed;
          transform: none;
        }
        .login-social-btn {
          background: linear-gradient(45deg, rgb(60, 60, 60) 0%, rgb(120, 120, 120) 100%);
          border: 4px solid white;
          padding: 8px;
          border-radius: 50%;
          width: 40px;
          height: 40px;
          display: grid;
          place-content: center;
          box-shadow: rgba(180, 160, 120, 0.3) 0px 12px 10px -8px;
          transition: all 0.2s ease-in-out;
          cursor: pointer;
        }
        .login-social-btn:hover {
          transform: scale(1.15);
        }
        .login-social-btn:active {
          transform: scale(0.9);
        }
      `}</style>
    </div>
  )
}
