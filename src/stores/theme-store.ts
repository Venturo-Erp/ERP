import { create } from 'zustand'

export type ThemeType = 'morandi'

interface ThemeState {
  currentTheme: ThemeType
  initTheme: () => void
  setTheme: (theme: ThemeType) => void
}

export const useThemeStore = create<ThemeState>((set) => ({
  currentTheme: 'morandi',

  initTheme: () => {
    if (typeof window !== 'undefined') {
      document.documentElement.setAttribute('data-theme', 'morandi')
      localStorage.setItem('venturo-theme', 'morandi')
    }
  },

  setTheme: (theme) => {
    set({ currentTheme: theme })
    document.documentElement.setAttribute('data-theme', theme)
    if (typeof window !== 'undefined') {
      localStorage.setItem('venturo-theme', theme)
    }
  },
}))
