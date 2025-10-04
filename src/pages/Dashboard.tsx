import { Link } from 'react-router-dom'
import { useState, useEffect } from 'react'

interface QuickAction {
  title: string
  description: string
  icon: string
  to: string
  color: string
  bgGradient: string
}

export default function Dashboard() {
  const [mounted, setMounted] = useState(false)

  useEffect(() => {
    setMounted(true)
  }, [])

  const quickActions: QuickAction[] = [
    {
      title: 'Przedmioty',
      description: 'Zarządzaj swoimi przedmiotami',
      icon: '📚',
      to: '/subjects',
      color: 'from-blue-500 to-blue-700',
      bgGradient: 'from-blue-50 to-blue-100'
    },
    {
      title: 'Nowy wykład',
      description: 'Dodaj wykład z audio',
      icon: '🎓',
      to: '/new-lecture',
      color: 'from-green-500 to-green-700',
      bgGradient: 'from-green-50 to-green-100'
    },
    {
      title: 'Fiszki',
      description: 'Ucz się z fiszkami',
      icon: '🃏',
      to: '/flashcards',
      color: 'from-purple-500 to-purple-700',
      bgGradient: 'from-purple-50 to-purple-100'
    },
    {
      title: 'Ustawienia',
      description: 'Konfiguracja i preferencje',
      icon: '⚙️',
      to: '/settings',
      color: 'from-gray-500 to-gray-700',
      bgGradient: 'from-gray-50 to-gray-100'
    }
  ]

  const stats = [
    { label: 'Notatki', value: '24', icon: '📄', change: '+3 w tym tygodniu' },
    { label: 'Fiszki', value: '156', icon: '🃏', change: '+12 nowych' },
    { label: 'Sprawdziany', value: '8', icon: '📝', change: '2 do zrobienia' },
    { label: 'Przedmioty', value: '6', icon: '📚', change: 'Aktywne' }
  ]

  return (
    <section className={`space-y-8 ${mounted ? 'animate-fade-in' : ''}`}>
      {/* Welcome Section */}
      <div className="text-center py-12">
        <h1 className="text-4xl md:text-6xl font-bold mb-4 bg-gradient-to-r from-blue-600 via-purple-600 to-teal-600 bg-clip-text text-transparent animate-slide-up">
          Witaj w Asystencie Studenta! 🎓
        </h1>
        <p className="text-xl text-gray-600 dark:text-gray-300 max-w-2xl mx-auto animate-slide-up delay-100">
          Zarządzaj swoją nauką efektywnie. Twórz notatki, ucz się z fiszkami i śledź postępy.
        </p>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
        {stats.map((stat, index) => (
          <div 
            key={stat.label}
            className={`card-enhanced p-6 text-center transform hover:scale-105 transition-all duration-300 ${mounted ? 'animate-slide-up' : ''}`}
            style={{ animationDelay: `${index * 100}ms` }}
          >
            <div className="text-3xl mb-2">{stat.icon}</div>
            <div className="text-3xl font-bold text-gray-800 dark:text-white mb-1">{stat.value}</div>
            <div className="text-sm font-medium text-gray-600 dark:text-gray-300 mb-1">{stat.label}</div>
            <div className="text-xs text-gray-500 dark:text-gray-400">{stat.change}</div>
          </div>
        ))}
      </div>

      {/* Quick Actions */}
      <div className="mb-8">
        <h2 className="text-2xl font-bold mb-6 text-gray-800 dark:text-white animate-slide-up">
          Szybkie akcje
        </h2>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          {quickActions.map((action, index) => (
            <Link
              key={action.title}
              to={action.to}
              className={`group block card-enhanced p-6 text-center transform hover:scale-105 hover:-translate-y-2 transition-all duration-300 ${mounted ? 'animate-slide-up' : ''}`}
              style={{ animationDelay: `${(index + 4) * 100}ms` }}
            >
              <div className={`w-16 h-16 rounded-full bg-gradient-to-r ${action.color} flex items-center justify-center mx-auto mb-4 group-hover:scale-110 transition-transform duration-300 shadow-lg`}>
                <span className="text-2xl">{action.icon}</span>
              </div>
              <h3 className="text-lg font-semibold mb-2 text-gray-800 dark:text-white group-hover:text-blue-600 dark:group-hover:text-blue-400 transition-colors duration-300">
                {action.title}
              </h3>
              <p className="text-sm text-gray-600 dark:text-gray-300">
                {action.description}
              </p>
              <div className="mt-4 inline-flex items-center text-blue-600 dark:text-blue-400 font-medium group-hover:translate-x-1 transition-transform duration-300">
                Przejdź <span className="ml-1">→</span>
              </div>
            </Link>
          ))}
        </div>
      </div>

      {/* Recent Activity */}
      <div className={`card-enhanced ${mounted ? 'animate-slide-up' : ''}`} style={{ animationDelay: '800ms' }}>
        <h2 className="text-2xl font-bold mb-6 text-gray-800 dark:text-white flex items-center gap-2">
          <span className="text-2xl">📈</span>
          Ostatnia aktywność
        </h2>
        <div className="space-y-4">
          {[
            { action: 'Utworzono notatkę', subject: 'Matematyka', time: '2 godziny temu', icon: '📄' },
            { action: 'Ukończono fiszki', subject: 'Historia', time: '5 godzin temu', icon: '🃏' },
            { action: 'Dodano sprawdzian', subject: 'Fizyka', time: '1 dzień temu', icon: '📝' },
            { action: 'Nowy przedmiot', subject: 'Chemia', time: '2 dni temu', icon: '📚' }
          ].map((activity, index) => (
            <div 
              key={index}
              className="flex items-center gap-4 p-4 rounded-lg bg-gray-50 dark:bg-gray-800/50 hover:bg-gray-100 dark:hover:bg-gray-700/50 transition-colors duration-300"
            >
              <div className="w-10 h-10 rounded-full bg-gradient-to-r from-blue-500 to-purple-600 flex items-center justify-center">
                <span className="text-lg">{activity.icon}</span>
              </div>
              <div className="flex-1">
                <div className="font-medium text-gray-800 dark:text-white">{activity.action}</div>
                <div className="text-sm text-blue-600 dark:text-blue-400">{activity.subject}</div>
              </div>
              <div className="text-sm text-gray-500 dark:text-gray-400">{activity.time}</div>
            </div>
          ))}
        </div>
        <div className="mt-6 text-center">
          <button className="px-6 py-2 bg-gradient-to-r from-blue-500 to-purple-600 text-white rounded-lg hover:from-blue-600 hover:to-purple-700 transition-all duration-300 transform hover:scale-105">
            Zobacz wszystkie
          </button>
        </div>
      </div>

      {/* Motivational Quote */}
      <div className={`text-center py-8 ${mounted ? 'animate-slide-up' : ''}`} style={{ animationDelay: '1000ms' }}>
        <div className="card-enhanced inline-block px-8 py-6 max-w-2xl">
          <blockquote className="text-lg italic text-gray-600 dark:text-gray-300 mb-2">
            "Sukces to suma małych wysiłków powtarzanych dzień po dniu."
          </blockquote>
          <cite className="text-sm font-medium text-blue-600 dark:text-blue-400">— Robert Collier</cite>
        </div>
      </div>
    </section>
  )
}
