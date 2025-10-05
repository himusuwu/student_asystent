import { Link } from 'react-router-dom'
import { motion } from 'framer-motion'

interface QuickAction {
  title: string
  description: string
  icon: string
  to: string
  gradient: string
}

export default function Dashboard() {

  const quickActions: QuickAction[] = [
    {
      title: 'Przedmioty',
      description: 'Zarządzaj swoimi przedmiotami',
      icon: '📚',
      to: '/subjects',
      gradient: 'from-blue-500 to-cyan-500'
    },
    {
      title: 'Nowy wykład',
      description: 'Dodaj wykład z audio',
      icon: '🎓',
      to: '/new-lecture',
      gradient: 'from-green-500 to-emerald-500'
    },
    {
      title: 'Fiszki',
      description: 'Ucz się z fiszkami',
      icon: '🃏',
      to: '/flashcards',
      gradient: 'from-purple-500 to-pink-500'
    },
    {
      title: 'Ustawienia',
      description: 'Konfiguracja i preferencje',
      icon: '⚙️',
      to: '/settings',
      gradient: 'from-slate-500 to-slate-700'
    }
  ]

  const stats = [
    { label: 'Notatki', value: '24', icon: '📄', change: '+3 w tym tygodniu', gradient: 'from-blue-500 to-cyan-500' },
    { label: 'Fiszki', value: '156', icon: '🃏', change: '+12 nowych', gradient: 'from-purple-500 to-pink-500' },
    { label: 'Sprawdziany', value: '8', icon: '📝', change: '2 do zrobienia', gradient: 'from-orange-500 to-red-500' },
    { label: 'Przedmioty', value: '6', icon: '📚', change: 'Aktywne', gradient: 'from-green-500 to-emerald-500' }
  ]

  const weeklyFocus = [
    {
      subject: 'Analiza matematyczna',
      icon: '∑',
      gradient: 'from-indigo-500 to-blue-500',
      progress: 72,
      tasks: ['Powtórz definicje z wykładu 4', 'Rozwiąż 10 zadań z całek', 'Przygotuj pytania do konsultacji']
    },
    {
      subject: 'Historia najnowsza',
      icon: '🕰️',
      gradient: 'from-amber-500 to-orange-500',
      progress: 48,
      tasks: ['Przeczytaj notatki AI', 'Uzupełnij fiszki z rozdziału II']
    }
  ]

  const upcomingEvents = [
    { icon: '🧪', title: 'Laboratorium z fizyki', date: '7 października • 10:15', detail: 'Przygotuj sprawozdanie z doświadczenia 3.' },
    { icon: '📝', title: 'Kolokwium z algebry', date: '9 października • 08:00', detail: 'Zakres: macierze, przestrzenie liniowe, przekształcenia.' },
    { icon: '🎤', title: 'Prezentacja na seminarium', date: '11 października • 14:00', detail: 'Temat: Zastosowania AI w edukacji.' }
  ]

  const aiInsights = [
    { icon: '🧠', title: 'Optymalny czas nauki', description: 'Najlepsze wyniki osiągasz między 9:00 a 11:30 – zaplanuj wtedy kluczowe powtórki.' },
    { icon: '⚡', title: 'Priorytetowe fiszki', description: 'Masz 18 fiszek zaległych w przedmiocie „Historia najnowsza". Zaplanuj krótką sesję dziś wieczorem.' },
    { icon: '🤖', title: 'Propozycja AI', description: 'Dodaj zakładkę „Mapa myśli" do wykładu „Systemy dynamiczne" – pomoże uporządkować kluczowe pojęcia.' }
  ]

  const containerVariants = {
    hidden: { opacity: 0 },
    visible: {
      opacity: 1,
      transition: {
        staggerChildren: 0.08,
        delayChildren: 0.1
      }
    }
  }

  const itemVariants = {
    hidden: { y: 20, opacity: 0 },
    visible: { y: 0, opacity: 1 }
  }

  return (
    <motion.section 
      initial="hidden"
      animate="visible"
      variants={containerVariants}
      className="space-y-8 lg:space-y-12"
    >
      {/* Welcome Section */}
      <motion.div variants={itemVariants} className="text-center py-8 lg:py-12">
        <h1 className="text-4xl md:text-5xl lg:text-6xl font-display font-extrabold mb-5 bg-gradient-to-r from-blue-600 via-purple-600 to-pink-600 bg-clip-text text-transparent leading-tight">
          Witaj w Asystencie Studenta! 🎓
        </h1>
        <p className="text-lg md:text-xl text-slate-600 dark:text-slate-300 max-w-2xl mx-auto font-medium leading-relaxed">
          Zarządzaj swoją nauką efektywnie. Twórz notatki, ucz się z fiszkami i śledź postępy.
        </p>
      </motion.div>

      {/* Stats Cards */}
      <motion.div variants={itemVariants} className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 lg:gap-6">
        {stats.map((stat, index) => (
          <motion.div
            key={stat.label}
            whileHover={{ scale: 1.03, y: -4 }}
            transition={{ type: "spring", stiffness: 300, damping: 20 }}
            className="group relative overflow-hidden rounded-3xl bg-white/80 dark:bg-slate-800/80 backdrop-blur-sm border border-slate-200/60 dark:border-slate-700/60 p-6 shadow-soft hover:shadow-soft-lg transition-all duration-300"
          >
            {/* Gradient overlay on hover */}
            <div className={`absolute inset-0 bg-gradient-to-br ${stat.gradient} opacity-0 group-hover:opacity-5 transition-opacity duration-300`} />
            
            <div className="relative">
              <div className={`inline-flex items-center justify-center w-14 h-14 rounded-2xl bg-gradient-to-br ${stat.gradient} text-white text-2xl mb-4 shadow-lg group-hover:scale-110 transition-transform duration-300`}>
                {stat.icon}
              </div>
              <div className="text-4xl font-display font-bold text-slate-900 dark:text-white mb-2">
                {stat.value}
              </div>
              <div className="text-sm font-semibold text-slate-700 dark:text-slate-200 mb-1">
                {stat.label}
              </div>
              <div className="text-xs font-medium text-slate-500 dark:text-slate-400">
                {stat.change}
              </div>
            </div>
          </motion.div>
        ))}
      </motion.div>

      {/* Quick Actions */}
      <motion.div variants={itemVariants}>
        <h2 className="text-2xl lg:text-3xl font-display font-bold mb-6 text-slate-900 dark:text-white">
          Szybkie akcje
        </h2>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 lg:gap-6">
          {quickActions.map((action) => (
            <motion.div
              key={action.title}
              whileHover={{ scale: 1.03, y: -6 }}
              transition={{ type: "spring", stiffness: 300, damping: 20 }}
            >
              <Link
                to={action.to}
                className="group block relative overflow-hidden rounded-3xl bg-white/80 dark:bg-slate-800/80 backdrop-blur-sm border border-slate-200/60 dark:border-slate-700/60 p-6 shadow-soft hover:shadow-soft-lg transition-all duration-300"
              >
                {/* Gradient overlay on hover */}
                <div className={`absolute inset-0 bg-gradient-to-br ${action.gradient} opacity-0 group-hover:opacity-[0.07] transition-opacity duration-300`} />
                
                <div className="relative">
                  <div className={`inline-flex items-center justify-center w-16 h-16 rounded-2xl bg-gradient-to-br ${action.gradient} text-white text-3xl mb-5 shadow-glow group-hover:shadow-glow-lg group-hover:scale-110 transition-all duration-300`}>
                    {action.icon}
                  </div>
                  <h3 className="text-lg font-bold mb-2 text-slate-900 dark:text-white group-hover:text-transparent group-hover:bg-clip-text group-hover:bg-gradient-to-r group-hover:from-blue-600 group-hover:to-purple-600 transition-all duration-300">
                    {action.title}
                  </h3>
                  <p className="text-sm text-slate-600 dark:text-slate-300 mb-4 leading-relaxed">
                    {action.description}
                  </p>
                  <div className="inline-flex items-center text-sm font-semibold text-blue-600 dark:text-blue-400 group-hover:translate-x-1 transition-transform duration-300">
                    Przejdź <span className="ml-2 group-hover:translate-x-1 transition-transform duration-300">→</span>
                  </div>
                </div>
              </Link>
            </motion.div>
          ))}
        </div>
      </motion.div>

      {/* Weekly Focus & Insights */}
      <motion.div variants={itemVariants} className="grid grid-cols-1 xl:grid-cols-[2fr_1fr] gap-6 lg:gap-8">
        <div className="rounded-4xl bg-white/80 dark:bg-slate-800/80 backdrop-blur-sm border border-slate-200/60 dark:border-slate-700/60 p-6 lg:p-8 shadow-soft">
          <div className="flex items-center justify-between mb-6 lg:mb-8">
            <h2 className="text-2xl lg:text-3xl font-display font-bold text-slate-900 dark:text-white flex items-center gap-3">
              <span className="text-3xl">🎯</span>
              Plan tygodniowy
            </h2>
            <span className="text-sm font-semibold px-4 py-2 rounded-full bg-gradient-to-r from-blue-500/10 to-purple-500/10 text-blue-700 dark:text-blue-300 border border-blue-200/40 dark:border-blue-700/40">
              3 dni do kolejnego egzaminu
            </span>
          </div>
          <div className="space-y-5">
            {weeklyFocus.map((focus) => (
              <motion.div
                key={focus.subject}
                whileHover={{ scale: 1.01 }}
                className="rounded-3xl border border-slate-200/60 dark:border-slate-700/60 bg-gradient-to-br from-white/90 to-slate-50/70 dark:from-slate-900/60 dark:to-slate-800/30 p-6 shadow-soft hover:shadow-soft-lg transition-all duration-300"
              >
                <div className="flex items-start gap-4">
                  <div className={`flex h-14 w-14 items-center justify-center rounded-2xl bg-gradient-to-br ${focus.gradient} text-white text-2xl font-bold shadow-glow`}>
                    {focus.icon}
                  </div>
                  <div className="flex-1">
                    <div className="flex items-center justify-between mb-3">
                      <h3 className="text-lg font-bold text-slate-900 dark:text-white">{focus.subject}</h3>
                      <span className="text-sm font-bold text-blue-600 dark:text-blue-400">{focus.progress}% ukończone</span>
                    </div>
                    <div className="mb-4 h-2.5 w-full overflow-hidden rounded-full bg-slate-200 dark:bg-slate-700">
                      <motion.div
                        initial={{ width: 0 }}
                        animate={{ width: `${focus.progress}%` }}
                        transition={{ duration: 1, delay: 0.5, ease: "easeOut" }}
                        className={`h-full rounded-full bg-gradient-to-r ${focus.gradient}`}
                      />
                    </div>
                    <ul className="space-y-2.5 text-sm text-slate-700 dark:text-slate-300">
                      {focus.tasks.map((task, i) => (
                        <li key={i} className="flex items-start gap-2.5">
                          <span className="text-blue-500 dark:text-blue-400 font-bold mt-0.5">•</span>
                          <span className="leading-relaxed">{task}</span>
                        </li>
                      ))}
                    </ul>
                  </div>
                </div>
              </motion.div>
            ))}
          </div>
        </div>

        <div className="space-y-6">
          <div className="rounded-4xl bg-white/80 dark:bg-slate-800/80 backdrop-blur-sm border border-slate-200/60 dark:border-slate-700/60 p-6 shadow-soft">
            <h2 className="text-xl font-display font-bold text-slate-900 dark:text-white flex items-center gap-2 mb-5">
              <span className="text-2xl">📅</span>
              Nadchodzące terminy
            </h2>
            <div className="space-y-4">
              {upcomingEvents.map((event, index) => (
                <motion.div
                  key={index}
                  whileHover={{ x: 4 }}
                  className="rounded-2xl border border-slate-200/60 dark:border-slate-700/60 bg-slate-50/50 dark:bg-slate-900/30 p-4 hover:bg-slate-100/50 dark:hover:bg-slate-800/50 transition-all duration-300 cursor-pointer"
                >
                  <div className="flex items-start gap-3">
                    <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-gradient-to-br from-blue-500 to-purple-500 text-white text-lg shadow-glow">
                      {event.icon}
                    </div>
                    <div className="flex-1 min-w-0">
                      <h3 className="font-semibold text-slate-900 dark:text-white mb-1 leading-snug">
                        {event.title}
                      </h3>
                      <p className="text-xs font-medium text-blue-600 dark:text-blue-400 mb-2">
                        {event.date}
                      </p>
                      <p className="text-xs text-slate-600 dark:text-slate-400 leading-relaxed">
                        {event.detail}
                      </p>
                    </div>
                  </div>
                </motion.div>
              ))}
            </div>
          </div>

          <div className="rounded-4xl bg-gradient-to-br from-blue-500/10 via-purple-500/10 to-pink-500/10 dark:from-blue-500/5 dark:via-purple-500/5 dark:to-pink-500/5 border border-blue-200/40 dark:border-purple-700/30 p-6 shadow-soft backdrop-blur-sm">
            <h2 className="text-xl font-display font-bold text-slate-900 dark:text-white flex items-center gap-2 mb-5">
              <span className="text-2xl">✨</span>
              Wskazówki AI
            </h2>
            <div className="space-y-4">
              {aiInsights.map((insight, index) => (
                <motion.div
                  key={index}
                  initial={{ opacity: 0, x: -10 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: 0.6 + index * 0.1 }}
                  className="flex items-start gap-3"
                >
                  <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-gradient-to-br from-blue-500 to-purple-500 text-white text-base shadow-glow flex-shrink-0">
                    {insight.icon}
                  </div>
                  <div>
                    <h3 className="font-bold text-sm text-slate-900 dark:text-white mb-1">
                      {insight.title}
                    </h3>
                    <p className="text-xs text-slate-700 dark:text-slate-300 leading-relaxed">
                      {insight.description}
                    </p>
                  </div>
                </motion.div>
              ))}
            </div>
          </div>
        </div>
      </motion.div>
    </motion.section>
  )
}
