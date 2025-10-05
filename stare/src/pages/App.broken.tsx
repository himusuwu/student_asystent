import { Link, Outlet, NavLink, useLocation } from 'react-router-dom'
import { ThemeToggle } from '@/components/ThemeToggle'
import { StatusBar } from '@/components/ui/StatusBar'
import { useEffect, useMemo, useState } from 'react'

export default function App() {
  const location = useLocation()
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false)

  const navigation = useMemo(() => ([
    { to: '/', label: 'Dashboard', icon: '🏠', end: true },
    { to: '/subjects', label: 'Przedmioty', icon: '📚' },
    { to: '/new-lecture', label: 'Nowy wykład', icon: '✏️' },
    { to: '/flashcards', label: 'Fiszki', icon: '🃏' },
    { to: '/exams', label: 'Sprawdziany', icon: '📝' },
    { to: '/settings', label: 'Ustawienia', icon: '⚙️' },
  ]), [])

  // Close mobile menu when route changes
  useEffect(() => {
    setIsMobileMenuOpen(false)
  }, [location.pathname])

  return (
    <div className="flex min-h-screen bg-slate-50 dark:bg-slate-950">
      {/* Desktop sidebar */}
      <aside className="hidden lg:flex lg:w-72 flex-col gap-6 px-6 py-8 border-r border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 sticky top-0 max-h-screen overflow-y-auto">
        {/* Logo */}
        <Link to="/" className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-blue-500 to-purple-600 text-white font-bold flex items-center justify-center">
            A
          </div>
          <div>
            <span className="block text-lg font-bold text-slate-900 dark:text-white">
              Asystent Studenta
            </span>
            <span className="text-xs text-slate-500 dark:text-slate-400">
              Twój cyfrowy partner
            </span>
          </div>
        </Link>

        {/* Navigation */}
        <nav className="flex-1 space-y-1">
          {navigation.map(item => (
            <NavLink
              key={item.to}
              to={item.to}
              end={item.end}
              className={({ isActive }) => `
                flex items-center gap-3 px-4 py-3 rounded-xl
                transition-all duration-200
                ${isActive 
                  ? 'bg-gradient-to-r from-blue-500 to-purple-600 text-white shadow-lg' 
                  : 'text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800'
                }
              `}
            >
              <span className="text-xl">{item.icon}</span>
              <span className="font-medium">{item.label}</span>
            </NavLink>
          ))}
        </nav>

        {/* Theme Toggle */}
        <div>
          <ThemeToggle />
        </div>
      </aside>

      {/* Main area */}
      <div className="flex-1 flex flex-col min-h-screen">
        {/* Mobile header */}
        <header className="lg:hidden sticky top-0 z-40 flex items-center justify-between gap-3 px-4 py-4 bg-white dark:bg-slate-900 border-b border-slate-200 dark:border-slate-800">
          <Link to="/" className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-blue-500 to-purple-600 text-white font-bold flex items-center justify-center text-sm">
              A
            </div>
            <span className="font-bold text-slate-900 dark:text-white">Asystent Studenta</span>
          </Link>
          <div className="flex items-center gap-2">
            <ThemeToggle />
            <button
              onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
              className="p-2 rounded-lg bg-slate-100 dark:bg-slate-800 text-slate-900 dark:text-white"
              aria-label="Menu"
            >
              {isMobileMenuOpen ? '✕' : '☰'}
            </button>
          </div>
        </header>

        {/* Mobile navigation */}
        {isMobileMenuOpen && (
          <div
            className="lg:hidden fixed inset-0 z-30 bg-black/50"
            onClick={() => setIsMobileMenuOpen(false)}
          >
            <div
              className="absolute top-0 left-0 bottom-0 w-[280px] bg-white dark:bg-slate-900 p-6 space-y-4 overflow-y-auto"
              onClick={e => e.stopPropagation()}
            >
              <nav className="space-y-1">
                {navigation.map(item => (
                  <NavLink
                    key={item.to}
                    to={item.to}
                    end={item.end}
                    className={({ isActive }) => `
                      flex items-center gap-3 px-4 py-3 rounded-xl
                      transition-all duration-200
                      ${isActive 
                        ? 'bg-gradient-to-r from-blue-500 to-purple-600 text-white' 
                        : 'text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800'
                      }
                    `}
                  >
                    <span className="text-xl">{item.icon}</span>
                    <span className="font-medium">{item.label}</span>
                  </NavLink>
                ))}
              </nav>
            </div>
          </div>
        )}

        {/* Main content */}
        <main className="flex-1 p-4 md:p-6 lg:p-8">
          <div className="max-w-7xl mx-auto">
            <Outlet />
          </div>
        </main>
      </div>

      {/* Status Bar */}
      <StatusBar />
    </div>
  )
}
