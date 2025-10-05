import { useEffect, useMemo, useState } from 'react'
import { Link, NavLink, Outlet, useLocation } from 'react-router-dom'
import { AnimatePresence, motion } from 'framer-motion'
import {
  BarChart3,
  BookOpen,
  ClipboardList,
  LayoutGrid,
  Menu,
  Settings,
  Sparkles,
  User,
  X,
} from 'lucide-react'
import type { LucideIcon } from 'lucide-react'

import { ThemeToggle } from '@/components/ThemeToggle'
import { StatusBar } from '@/components/ui/StatusBar'
import { Button } from '@/components/ui/Button'
import { cn } from '@/lib/utils'
import { Toaster } from '@/components/ui/Toaster'

const backgroundVariants = {
  initial: { opacity: 0, y: 30 },
  animate: { opacity: 1, y: 0 },
}

type NavItem = {
  to: string
  label: string
  icon: LucideIcon
  description: string
}

const navigation: NavItem[] = [
  {
    to: '/',
    label: 'Dashboard',
    icon: BarChart3,
    description: 'Twój pulpit, postępy i aktywność',
  },
  {
    to: '/subjects',
    label: 'Przedmioty',
    icon: BookOpen,
    description: 'Plan zarządzania przedmiotami i materiałami',
  },
  {
    to: '/new-lecture',
    label: 'Nowy wykład',
    icon: Sparkles,
    description: 'Przekształcaj audio w notatki z pomocą AI',
  },
  {
    to: '/flashcards',
    label: 'Fiszki',
    icon: LayoutGrid,
    description: 'Ucz się szybciej dzięki inteligentnym powtórkom',
  },
  {
    to: '/exams',
    label: 'Sprawdziany',
    icon: ClipboardList,
    description: 'Kontroluj terminy i generuj zestawy pytań',
  },
  {
    to: '/settings',
    label: 'Ustawienia',
    icon: Settings,
    description: 'Dopasuj doświadczenie i automatyzacje do swoich potrzeb',
  },
]

export default function App() {
  const [isMobileNavOpen, setMobileNavOpen] = useState(false)
  const location = useLocation()
  const [timeOfDay, greeting] = useMemo(() => {
    const hour = new Date().getHours()
    if (hour < 12) return ['morning', 'Dzień dobry']
    if (hour < 18) return ['afternoon', 'Miłego popołudnia']
    return ['evening', 'Dobry wieczór']
  }, [])

  useEffect(() => {
    setMobileNavOpen(false)
  }, [location.pathname])

  useEffect(() => {
    if (!isMobileNavOpen) {
      document.body.style.removeProperty('overflow')
      return
    }

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        setMobileNavOpen(false)
      }
    }

    document.body.style.overflow = 'hidden'
    window.addEventListener('keydown', handleKeyDown)

    return () => {
      document.body.style.removeProperty('overflow')
      window.removeEventListener('keydown', handleKeyDown)
    }
  }, [isMobileNavOpen])

  return (
    <div className="relative w-full min-h-screen overflow-hidden bg-transparent text-slate-100">
      <BackgroundCanvas />

      <header className="sticky top-0 z-40 px-4 py-4 sm:px-6 lg:px-10">
        <div className="mx-auto flex w-full max-w-[1400px] items-center justify-between gap-4 rounded-3xl border border-surface-border bg-surface-panel px-5 py-4 shadow-[0_24px_60px_rgba(15,23,42,0.45)] backdrop-blur-2xl">
          <Link to="/" className="flex items-center gap-3 group" aria-label="StudyFlow - przejdź do dashboardu">
            <div className="relative flex items-center justify-center w-12 h-12 overflow-hidden text-white shadow-lg rounded-2xl bg-gradient-to-br from-indigo-500 via-violet-500 to-pink-500">
              <span className="text-lg font-semibold">SF</span>
              <span className="absolute inset-0 border rounded-2xl border-white/20" aria-hidden />
            </div>
            <div className="flex flex-col">
              <span className="text-xs font-semibold uppercase tracking-[0.45em] text-slate-400 transition-colors duration-300 group-hover:text-slate-200">
                StudyFlow
              </span>
              <span className="text-lg font-semibold text-white transition-colors duration-300 group-hover:text-indigo-300">
                Inteligentny Asystent
              </span>
            </div>
          </Link>

          <nav className="items-center hidden gap-1 px-1 py-1 text-sm font-medium border rounded-full shadow-inner border-surface-border bg-surface-muted text-slate-400 backdrop-blur-xl lg:flex">
            {navigation.map(item => (
              <DesktopNavLink key={item.to} item={item} />
            ))}
          </nav>

          <div className="flex items-center gap-2">
            <div className="items-center hidden gap-3 px-4 py-2 text-xs border rounded-full xl:flex border-surface-border bg-surface-panel text-slate-300 shadow-soft">
              <span className="inline-flex items-center justify-center text-sm font-semibold text-white rounded-full shadow-md h-9 w-9 bg-gradient-to-br from-indigo-500 to-purple-500">
                <User className="w-4 h-4" aria-hidden />
              </span>
              <div className="flex flex-col leading-tight">
                <span className="font-semibold text-white">Jan Kowalski</span>
                <span className="text-[10px] uppercase tracking-[0.3em] text-slate-400">{greeting}</span>
              </div>
            </div>
            <div className="hidden lg:block">
              <ThemeToggle />
            </div>
            <Button
              asChild
              className="hidden rounded-full bg-gradient-to-br from-indigo-500 via-violet-500 to-pink-500 px-5 py-2 text-sm font-semibold text-white shadow-lg transition-transform duration-300 hover:-translate-y-0.5 hover:shadow-2xl focus-visible:ring-indigo-200 lg:inline-flex"
            >
              <Link to="/new-lecture">Nowy wykład</Link>
            </Button>
            <button
              type="button"
              onClick={() => setMobileNavOpen(prev => !prev)}
              className="inline-flex items-center justify-center transition-all duration-300 border h-11 w-11 rounded-2xl border-surface-border bg-surface-panel text-slate-200 hover:scale-105 hover:text-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-400 lg:hidden"
              aria-label={isMobileNavOpen ? 'Zamknij menu' : 'Otwórz menu'}
              aria-expanded={isMobileNavOpen}
              aria-controls="mobile-navigation"
            >
              {isMobileNavOpen ? <X className="w-5 h-5" aria-hidden /> : <Menu className="w-5 h-5" aria-hidden />}
            </button>
          </div>
        </div>
      </header>

      <AnimatePresence>
        {isMobileNavOpen && (
          <motion.div
            className="fixed inset-0 z-50 bg-slate-950/80 backdrop-blur-md lg:hidden"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={() => setMobileNavOpen(false)}
          >
            <motion.aside
              className="absolute inset-y-0 right-0 flex h-full w-full max-w-sm flex-col gap-6 overflow-y-auto border-l border-surface-border bg-surface-panel/95 px-6 pb-16 pt-20 shadow-[0_24px_80px_rgba(15,23,42,0.7)]"
              initial={{ x: '100%' }}
              animate={{ x: 0 }}
              exit={{ x: '100%' }}
              transition={{ type: 'spring', stiffness: 220, damping: 26 }}
              id="mobile-navigation"
              onClick={event => event.stopPropagation()}
            >
              <div className="p-5 border rounded-3xl border-surface-border bg-surface-panel text-slate-200 shadow-soft">
                <h2 className="text-lg font-semibold">StudyFlow</h2>
                <p className="mt-2 text-sm text-slate-400">Wybierz sekcję, aby kontynuować pracę. Wszystkie funkcje są dostępne również mobilnie.</p>
              </div>

              <div className="grid gap-3">
                {navigation.map(item => (
                  <MobileNavLink key={item.to} item={item} onNavigate={() => setMobileNavOpen(false)} />
                ))}
              </div>

              <div className="p-5 border rounded-3xl border-surface-border bg-surface-panel text-slate-200 shadow-soft">
                <div className="flex items-center gap-3">
                  <span className="inline-flex items-center justify-center w-10 h-10 text-white shadow-lg rounded-2xl bg-gradient-to-br from-indigo-500 to-purple-500">
                    <User className="w-4 h-4" aria-hidden />
                  </span>
                  <div>
                    <p className="text-sm font-semibold">Jan Kowalski</p>
                    <p className="text-xs text-slate-400 uppercase tracking-[0.3em]">{greeting}</p>
                  </div>
                </div>
                <div className="mt-4">
                  <ThemeToggle />
                </div>
                <Button
                  asChild
                  className="mt-6 inline-flex w-full items-center justify-center rounded-full bg-gradient-to-br from-indigo-500 via-violet-500 to-pink-500 px-6 py-3 text-base font-semibold text-white shadow-lg hover:-translate-y-0.5 hover:shadow-2xl"
                >
                  <Link to="/new-lecture">Rozpocznij teraz</Link>
                </Button>
              </div>
            </motion.aside>
          </motion.div>
        )}
      </AnimatePresence>

      <main className="relative z-10 flex-1">
        <motion.div
          className="mx-auto w-full max-w-[1400px] px-4 pb-24 pt-6 sm:px-6 lg:px-10"
          initial="initial"
          animate="animate"
          variants={backgroundVariants}
        >
          <Outlet />
        </motion.div>
      </main>

      <FooterBar />

      <StatusBar />
      <Toaster />
    </div>
  )
}

function DesktopNavLink({ item }: { item: NavItem }) {
  return (
    <NavLink
      to={item.to}
      className={({ isActive }) =>
        cn(
          'group relative inline-flex items-center gap-2 rounded-full px-4 py-2 text-sm font-semibold transition-all duration-300 ease-snappy',
          isActive
            ? 'text-slate-900 dark:text-white'
            : 'text-slate-500 hover:text-slate-900 dark:text-slate-300 dark:hover:text-white'
        )
      }
    >
      {({ isActive }) => (
        <>
          <span
            className={cn(
              'absolute inset-0 rounded-full bg-slate-900/80 shadow-[0_20px_40px_rgba(15,23,42,0.6)] opacity-0 transition-all duration-300',
              isActive ? 'opacity-100 scale-100' : 'scale-95 group-hover:opacity-60'
            )}
            aria-hidden
          />
          <item.icon className="relative z-10 hidden w-4 h-4 text-indigo-300 lg:inline" aria-hidden />
          <span className="relative z-10">{item.label}</span>
        </>
      )}
    </NavLink>
  )
}

function MobileNavLink({ item, onNavigate }: { item: NavItem; onNavigate: () => void }) {
  return (
    <NavLink
      to={item.to}
      onClick={onNavigate}
      className={({ isActive }) =>
        cn(
          'group flex flex-col gap-2 rounded-3xl border border-surface-border bg-surface-card p-4 shadow-soft transition-all duration-300',
          isActive && 'border-indigo-400/40 bg-surface-panel'
        )
      }
    >
      {({ isActive }) => (
        <>
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <span className="flex items-center justify-center w-10 h-10 text-indigo-200 shadow-inner rounded-2xl bg-gradient-to-br from-indigo-500/30 to-purple-500/30">
                <item.icon className="w-5 h-5" aria-hidden />
              </span>
              <span className="text-base font-semibold text-white">{item.label}</span>
            </div>
            <motion.span
              aria-hidden
              animate={{ scale: isActive ? 1 : 0.85, opacity: isActive ? 1 : 0.4 }}
              className="px-3 py-1 text-xs font-medium text-indigo-200 rounded-full bg-indigo-500/10"
            >
              {isActive ? 'Aktywne' : 'Otwórz'}
            </motion.span>
          </div>
          <p className="text-sm transition-colors duration-300 text-slate-400">
            {item.description}
          </p>
        </>
      )}
    </NavLink>
  )
}

function FooterBar() {
  return (
    <footer className="relative z-20 mt-12 border-t border-surface-border bg-surface-panel backdrop-blur-2xl">
      <div className="mx-auto flex w-full max-w-[1400px] flex-col gap-6 px-4 py-10 text-sm text-slate-400 sm:px-6 lg:flex-row lg:items-center lg:justify-between lg:px-10">
        <div className="flex items-center gap-3">
          <div className="flex items-center justify-center text-white shadow-lg h-11 w-11 rounded-2xl bg-gradient-to-br from-indigo-500 via-violet-500 to-pink-500">
            <span className="text-lg font-semibold">SF</span>
          </div>
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.35em] text-slate-400">StudyFlow</p>
            <p className="text-sm text-slate-200">Twój inteligentny asystent</p>
          </div>
        </div>
        <div className="flex flex-wrap gap-5 text-xs uppercase tracking-[0.2em] text-slate-500">
          <NavLink to="/settings" className="hover:text-indigo-300">
            Polityka prywatności
          </NavLink>
          <NavLink to="/settings" className="hover:text-indigo-300">
            Regulamin
          </NavLink>
          <NavLink to="/settings" className="hover:text-indigo-300">
            Kontakt
          </NavLink>
        </div>
        <span className="text-xs text-slate-500">© {new Date().getFullYear()} StudyFlow. Wszystkie prawa zastrzeżone.</span>
      </div>
    </footer>
  )
}

function BackgroundCanvas() {
  return (
    <div aria-hidden className="pointer-events-none">
      <motion.div
        className="absolute inset-0 -z-20 bg-gradient-to-br from-slate-950 via-slate-900 to-slate-950"
        initial="initial"
        animate="animate"
        variants={backgroundVariants}
      />

      <motion.div
        className="absolute inset-x-0 top-[-120px] -z-10 h-[520px] bg-gradient-to-br from-indigo-500/30 via-purple-500/25 to-pink-500/20 blur-3xl"
        initial={{ opacity: 0, scale: 0.9 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ duration: 1.2, ease: 'easeOut' }}
      />

      <div className="absolute inset-0 overflow-hidden -z-10">
        <div className="absolute w-64 h-64 rounded-full left-1/4 top-1/3 bg-indigo-500/20 blur-3xl" />
        <div className="absolute rounded-full right-1/5 top-1/2 h-72 w-72 bg-purple-500/20 blur-3xl" />
        <div className="absolute w-56 h-56 rounded-full bottom-10 right-24 bg-pink-500/20 blur-3xl" />
      </div>

      <div className="absolute inset-0 -z-20 bg-[radial-gradient(circle_at_top,_rgba(99,102,241,0.08),_transparent_60%)]" />
      <div className="absolute inset-0 -z-30 bg-[linear-gradient(120deg,_rgba(30,41,59,0.45)_1px,_transparent_1px)] bg-[length:120px_120px] opacity-30" />
    </div>
  )
}
