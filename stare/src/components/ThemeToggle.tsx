import { useEffect, useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'

const KEY = 'student-asystent:theme'

type ThemeMode = 'light' | 'dark'

const getPreferredTheme = (): ThemeMode => {
  if (typeof window === 'undefined') {
    return 'light'
  }

  const stored = localStorage.getItem(KEY) as ThemeMode | null
  if (stored === 'light' || stored === 'dark') {
    return stored
  }

  return window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light'
}

const syncRootTheme = (theme: ThemeMode) => {
  const root = document.documentElement
  root.classList.remove('light', 'dark')
  root.classList.add(theme)
  root.dataset.theme = theme
  root.style.colorScheme = theme
}

export function ThemeToggle() {
  const [theme, setTheme] = useState<ThemeMode>(() => getPreferredTheme())

  useEffect(() => {
    syncRootTheme(theme)
    localStorage.setItem(KEY, theme)
  }, [theme])

  useEffect(() => {
    if (typeof window === 'undefined') return

    const media = window.matchMedia('(prefers-color-scheme: dark)')
    const listener = (event: MediaQueryListEvent) => {
      setTheme(event.matches ? 'dark' : 'light')
    }
    media.addEventListener('change', listener)

    return () => media.removeEventListener('change', listener)
  }, [])

  const toggleTheme = () => {
    setTheme(prev => (prev === 'dark' ? 'light' : 'dark'))
  }

  const isDark = theme === 'dark'

  return (
    <motion.button
      type="button"
      onClick={toggleTheme}
      whileHover={{ scale: 1.04 }}
      whileTap={{ scale: 0.96 }}
      title={`Przełącz na motyw ${isDark ? 'jasny' : 'ciemny'}`}
      aria-pressed={isDark}
  className="relative inline-flex items-center gap-2 overflow-hidden rounded-full border border-surface-border bg-surface-panel px-4 py-2.5 text-sm font-semibold text-slate-800 shadow-soft transition-all duration-300 ease-snappy dark:border-slate-700/60 dark:bg-slate-950/70 dark:text-slate-100"
    >
      <motion.div
        layout
        className="absolute inset-0 -z-10 bg-gradient-to-r from-brand-subtle/40 via-brand-glow/20 to-transparent opacity-0 transition-opacity duration-300 ease-snappy dark:from-brand-subtle/10"
        animate={{ opacity: isDark ? 0.3 : 0.18 }}
      />
      <AnimatePresence mode="wait" initial={false}>
        <motion.span
          key={theme}
          initial={{ rotate: -180, opacity: 0, scale: 0.6 }}
          animate={{ rotate: 0, opacity: 1, scale: 1 }}
          exit={{ rotate: 180, opacity: 0, scale: 0.6 }}
          transition={{ duration: 0.4, ease: 'easeOut' }}
          className="text-base"
          aria-hidden
        >
          {isDark ? '🌙' : '☀️'}
        </motion.span>
      </AnimatePresence>
      <span className="hidden sm:inline whitespace-nowrap">
        {isDark ? 'Tryb ciemny' : 'Tryb jasny'}
      </span>
    </motion.button>
  )
}
