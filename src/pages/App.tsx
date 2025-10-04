import { Link, Outlet, NavLink, useLocation } from 'react-router-dom'
import { ThemeToggle } from '@/components/ThemeToggle'
import { StatusBar } from '@/components/ui/StatusBar'
import { useEffect, useState } from 'react'

export default function App() {
  const location = useLocation()
  const [isLoading, setIsLoading] = useState(false)
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false)

  // Smooth transition effect between pages
  useEffect(() => {
    setIsLoading(true)
    const timer = setTimeout(() => setIsLoading(false), 150)
    return () => clearTimeout(timer)
  }, [location.pathname])

  // Close mobile menu when route changes
  useEffect(() => {
    setIsMobileMenuOpen(false)
  }, [location.pathname])

  return (
    <div className="app min-h-screen">
      <header className="topbar">
        <Link to="/" className="brand group">
          <span className="inline-flex items-center gap-2">
            <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-blue-500 to-purple-600 flex items-center justify-center transform group-hover:scale-110 transition-transform duration-300">
              <span className="text-white font-bold text-sm">A</span>
            </div>
            Asystent Studenta
          </span>
        </Link>
        <nav className="hidden md:flex">
          <NavLink to="/" end className="nav-link">
            <span className="flex items-center gap-2">
              <span className="text-lg">🏠</span>
              Dashboard
            </span>
          </NavLink>
          <NavLink to="/subjects" className="nav-link">
            <span className="flex items-center gap-2">
              <span className="text-lg">📚</span>
              Przedmioty
            </span>
          </NavLink>
          <NavLink to="/new-lecture" className="nav-link">
            <span className="flex items-center gap-2">
              <span className="text-lg">✏️</span>
              Nowy wykład
            </span>
          </NavLink>
          <NavLink to="/flashcards" className="nav-link">
            <span className="flex items-center gap-2">
              <span className="text-lg">🃏</span>
              Fiszki
            </span>
          </NavLink>
          <NavLink to="/exams" className="nav-link">
            <span className="flex items-center gap-2">
              <span className="text-lg">📝</span>
              Sprawdziany
            </span>
          </NavLink>
          <NavLink to="/settings" className="nav-link">
            <span className="flex items-center gap-2">
              <span className="text-lg">⚙️</span>
              Ustawienia
            </span>
          </NavLink>
        </nav>
        
        {/* Mobile menu button */}
        <button 
          onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
          className="md:hidden p-2 rounded-lg bg-gradient-to-r from-blue-500 to-purple-600 text-white hover:from-blue-600 hover:to-purple-700 transition-all duration-300 transform hover:scale-105"
          aria-label="Toggle mobile menu"
        >
          <span className={`text-lg transition-transform duration-300 ${isMobileMenuOpen ? 'rotate-90' : ''}`}>
            {isMobileMenuOpen ? '✕' : '☰'}
          </span>
        </button>
        
        <ThemeToggle />
      </header>

      {/* Mobile Navigation Menu */}
      <div className={`
        md:hidden fixed inset-x-0 top-[100px] bg-white/95 dark:bg-gray-900/95 backdrop-blur-xl border-b border-gray-200 dark:border-gray-700 z-40 shadow-lg
        transition-all duration-300 ease-out
        ${isMobileMenuOpen 
          ? 'opacity-100 translate-y-0 pointer-events-auto' 
          : 'opacity-0 -translate-y-full pointer-events-none'
        }
      `}>
        <nav className="px-4 py-6">
          <div className="space-y-2">
            <NavLink to="/" end className="mobile-nav-link">
              <span className="text-2xl">🏠</span>
              <span>Dashboard</span>
            </NavLink>
            <NavLink to="/subjects" className="mobile-nav-link">
              <span className="text-2xl">📚</span>
              <span>Przedmioty</span>
            </NavLink>
            <NavLink to="/new-lecture" className="mobile-nav-link">
              <span className="text-2xl">✏️</span>
              <span>Nowy wykład</span>
            </NavLink>
            <NavLink to="/flashcards" className="mobile-nav-link">
              <span className="text-2xl">🃏</span>
              <span>Fiszki</span>
            </NavLink>
            <NavLink to="/exams" className="mobile-nav-link">
              <span className="text-2xl">📝</span>
              <span>Sprawdziany</span>
            </NavLink>
            <NavLink to="/settings" className="mobile-nav-link">
              <span className="text-2xl">⚙️</span>
              <span>Ustawienia</span>
            </NavLink>
          </div>
        </nav>
      </div>

      {/* Mobile menu overlay */}
      {isMobileMenuOpen && (
        <div 
          className="md:hidden fixed inset-0 bg-black/20 backdrop-blur-sm z-30"
          onClick={() => setIsMobileMenuOpen(false)}
        />
      )}

      <main className={`content transition-all duration-300 ${isLoading ? 'opacity-50 translate-y-2' : 'opacity-100 translate-y-0'}`}>
        <div className="page-container">
          <Outlet />
        </div>
      </main>

      {/* Floating background elements */}
      <div className="fixed inset-0 pointer-events-none overflow-hidden -z-10">
        <div className="absolute top-1/4 left-1/4 w-96 h-96 bg-gradient-to-r from-blue-400/10 to-purple-600/10 rounded-full blur-3xl animate-pulse"></div>
        <div className="absolute bottom-1/4 right-1/4 w-96 h-96 bg-gradient-to-r from-purple-400/10 to-pink-600/10 rounded-full blur-3xl animate-pulse delay-1000"></div>
        <div className="absolute top-3/4 left-1/2 w-64 h-64 bg-gradient-to-r from-cyan-400/10 to-blue-600/10 rounded-full blur-3xl animate-pulse delay-2000"></div>
      </div>

      {/* Global Status Bar */}
      <StatusBar />
    </div>
  )
}
