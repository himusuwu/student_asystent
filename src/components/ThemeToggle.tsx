import { useEffect, useState } from 'react'

const KEY = 'student-asystent:theme'

export function ThemeToggle() {
  const [theme, setTheme] = useState<'light'|'dark'>(() => (localStorage.getItem(KEY) as 'light'|'dark') || 'dark')
  const [isAnimating, setIsAnimating] = useState(false)

  useEffect(() => {
    document.documentElement.dataset.theme = theme
    localStorage.setItem(KEY, theme)
  }, [theme])

  const toggleTheme = () => {
    setIsAnimating(true)
    setTimeout(() => {
      setTheme(theme === 'dark' ? 'light' : 'dark')
      setTimeout(() => setIsAnimating(false), 300)
    }, 150)
  }

  return (
    <button 
      onClick={toggleTheme}
      title={`Przełącz na motyw ${theme === 'dark' ? 'jasny' : 'ciemny'}`}
      className={`
        relative overflow-hidden px-4 py-2 rounded-xl 
        bg-gradient-to-r from-yellow-400 to-orange-500 dark:from-blue-600 dark:to-purple-600
        text-white font-medium shadow-lg hover:shadow-xl
        transform hover:scale-105 active:scale-95
        transition-all duration-300 ease-out
        ${isAnimating ? 'animate-pulse' : ''}
      `}
    >
      <div className="relative z-10 flex items-center gap-2">
        <span className={`text-lg transition-transform duration-300 ${isAnimating ? 'rotate-180' : ''}`}>
          {theme === 'dark' ? '🌙' : '☀️'}
        </span>
        <span className="hidden sm:inline text-sm">
          {theme === 'dark' ? 'Ciemny' : 'Jasny'}
        </span>
      </div>
      
      {/* Animated background */}
      <div className={`
        absolute inset-0 bg-gradient-to-r 
        from-blue-600 to-purple-600 dark:from-yellow-400 dark:to-orange-500
        transition-opacity duration-300
        ${isAnimating ? 'opacity-100' : 'opacity-0'}
      `} />
      
      {/* Shimmer effect */}
      <div className="absolute inset-0 -skew-x-12 bg-gradient-to-r from-transparent via-white/20 to-transparent translate-x-[-100%] hover:translate-x-[100%] transition-transform duration-700 ease-out" />
    </button>
  )
}
