import { motion } from 'framer-motion'
import { Link } from 'react-router-dom'
import {
  ArrowRight,
  BookOpen,
  ClipboardList,
  Flame,
  GraduationCap,
  LayoutGrid,
  Lightbulb,
  ListChecks,
  NotebookText,
  Sparkles,
  Target,
  TimerReset,
} from 'lucide-react'

import { Button } from '@/components/ui/Button'
import { cn } from '@/lib/utils'

const activityCards = [
  {
    subject: 'Algorytmy i struktury danych',
    status: 'progress' as const,
    note: '25 fiszek do powtórzenia dzisiaj',
    progress: 68,
  },
  {
    subject: 'Bazy danych',
    status: 'complete' as const,
    note: 'Wszystkie notatki zsynchronizowane',
    progress: 100,
  },
  {
    subject: 'Inżynieria oprogramowania',
    status: 'upcoming' as const,
    note: 'Projekt za 3 dni – dokumentacja do przygotowania',
    progress: 45,
  },
]

const flashcardPeek = [
  {
    question: 'Co to jest algorytm sortowania przez scalanie?',
    answer: 'Dziel i zwyciężaj – złożoność O(n log n).',
  },
  {
    question: 'Czym jest normalizacja bazy danych?',
    answer: 'Redukcja redundancji i poprawa integralności danych.',
  },
  {
    question: 'Co to jest SOLID?',
    answer: 'Pięć zasad programowania obiektowego.',
  },
  {
    question: 'Różnica między procesem a wątkiem?',
    answer: 'Proces ma własną pamięć, wątek ją współdzieli.',
  },
]

const lectureSchedule = [
  {
    icon: '💻',
    title: 'Drzewa BST',
    detail: 'Algorytmy i Struktury Danych',
    date: 'Poniedziałek 10:15 · Sala 204',
    badge: 'Za 2 dni',
  },
  {
    icon: '🗄️',
    title: 'Transakcje i blokady',
    detail: 'Bazy Danych',
    date: 'Wtorek 14:00 · Sala 108',
    badge: 'Za 3 dni',
  },
  {
    icon: '🏗️',
    title: 'Wzorce projektowe',
    detail: 'Inżynieria Oprogramowania',
    date: 'Środa 12:15 · Sala 315',
    badge: 'Za 4 dni',
  },
]

const subjectsOverview = [
  {
    title: 'Algorytmy i Struktury Danych',
    emoji: '💻',
    ects: '6 ECTS',
    stats: '42 fiszek · 12 wykładów · 8 laboratoriów',
    progress: 75,
  },
  {
    title: 'Bazy Danych',
    emoji: '🗄️',
    ects: '5 ECTS',
    stats: '35 fiszek · 10 wykładów · 10 laboratoriów',
    progress: 92,
  },
  {
    title: 'Inżynieria Oprogramowania',
    emoji: '🏗️',
    ects: '6 ECTS',
    stats: '28 fiszek · Projekt zespołowy',
    progress: 55,
  },
  {
    title: 'Sieci Komputerowe',
    emoji: '🌐',
    ects: '5 ECTS',
    stats: '22 fiszek · 11 wykładów · 6 laboratoriów',
    progress: 68,
  },
]

const weeklyPlan = [
  {
    day: 'Poniedziałek',
    badge: '4 zajęcia',
    sessions: [
      { hour: '08:00 - 09:45', title: 'Matematyka dyskretna', room: 'S-105' },
      { hour: '10:15 - 12:00', title: 'Algorytmy i SD (wykład)', room: 'S-204' },
      { hour: '12:15 - 14:00', title: 'Algorytmy i SD (lab)', room: 'L-301' },
    ],
  },
  {
    day: 'Wtorek',
    badge: '3 zajęcia',
    sessions: [
      { hour: '10:00 - 11:45', title: 'Sieci komputerowe', room: 'S-108' },
      { hour: '14:00 - 15:45', title: 'Bazy danych (wykład)', room: 'S-201' },
      { hour: '16:00 - 17:45', title: 'Bazy danych (lab)', room: 'L-205' },
    ],
  },
  {
    day: 'Środa',
    badge: '2 zajęcia',
    sessions: [
      { hour: '12:15 - 14:00', title: 'Inżynieria oprogramowania', room: 'S-315' },
      { hour: '14:15 - 16:00', title: 'Projekt zespołowy', room: 'L-401' },
    ],
  },
]

const quickLinks = [
  {
    title: 'Plan semestru',
    description: 'Zarządzaj przedmiotami, zadaniami i harmonogramem egzaminów.',
    icon: BookOpen,
    to: '/subjects',
    accent: 'from-indigo-500/20 via-violet-500/20 to-transparent',
  },
  {
    title: 'Nowy wykład AI',
    description: 'Przetwarzaj audio na notatki i generuj streszczenia jednym kliknięciem.',
    icon: Sparkles,
    to: '/new-lecture',
    accent: 'from-purple-500/20 via-pink-500/20 to-transparent',
  },
  {
    title: 'Tryb nauki SRS',
    description: 'Priorytetyzuj fiszki z inteligentnym planem powtórek.',
    icon: LayoutGrid,
    to: '/flashcards',
    accent: 'from-emerald-500/20 via-cyan-500/20 to-transparent',
  },
  {
    title: 'Automatyzacje i ustawienia',
    description: 'Połącz repozytoria, kalendarze i powiadomienia w jednym miejscu.',
    icon: ListChecks,
    to: '/settings',
    accent: 'from-amber-500/20 via-pink-500/20 to-transparent',
  },
]

const performanceStats = [
  { label: 'Fiszek opanowanych', value: '127', icon: LayoutGrid, tone: 'from-indigo-500 via-purple-500 to-pink-500', change: '+18 w tym tygodniu' },
  { label: 'Aktywnych przedmiotów', value: '8', icon: BookOpen, tone: 'from-teal-400 via-cyan-400 to-blue-500', change: 'Stabilnie' },
  { label: 'Średnia skuteczność', value: '94%', icon: Target, tone: 'from-rose-500 via-purple-500 to-indigo-500', change: '+4% od zeszłego tygodnia' },
  { label: 'Dni streak', value: '12', icon: Flame, tone: 'from-amber-500 via-orange-500 to-rose-500', change: '+1 dzień' },
]

const aiHighlights = [
  {
    icon: Flame,
    title: 'Świetna passa!',
    description: 'Powtórzyłeś 45 fiszek dzisiaj – to Twój rekord tygodnia.',
  },
  {
    icon: TimerReset,
    title: 'Czas na powtórkę',
    description: 'Masz 12 fiszek gotowych do przypomnienia. Najlepszy czas: 19:00.',
  },
  {
    icon: Lightbulb,
    title: 'Sugestia AI',
    description: 'Skup się dziś na projekcie z inżynierii – termin zbliża się w czwartek.',
  },
]

const analyticsHighlights = [
  {
    icon: NotebookText,
    title: 'Notatki AI',
    description: '12 nowych transkrypcji zamienionych w podsumowania i mapy myśli.',
  },
  {
    icon: ClipboardList,
    title: 'Zadania do wykonania',
    description: '5 priorytetowych zadań rozplanowanych na najbliższe dni.',
  },
  {
    icon: GraduationCap,
    title: 'Postęp semestru',
    description: '67% wymagań semestralnych ukończonych przed terminem.',
  },
]

const fadeIn = (delay = 0) => ({
  initial: { opacity: 0, y: 24 },
  whileInView: { opacity: 1, y: 0 },
  viewport: { once: true, margin: '-20%' },
  transition: { duration: 0.6, ease: 'easeOut' as const, delay },
})

const statusTone = {
  progress: {
    label: 'W toku',
    badge: 'from-indigo-500/20 via-purple-500/20 to-transparent text-indigo-400',
    bar: 'from-indigo-500 via-purple-500 to-pink-500',
  },
  complete: {
    label: 'Zakończone',
    badge: 'from-emerald-500/20 via-teal-500/20 to-transparent text-emerald-400',
    bar: 'from-emerald-500 via-teal-500 to-cyan-500',
  },
  upcoming: {
    label: 'Wkrótce',
    badge: 'from-amber-500/20 via-rose-500/20 to-transparent text-amber-400',
    bar: 'from-amber-500 via-orange-500 to-rose-500',
  },
}

type StatusKey = keyof typeof statusTone

export default function Dashboard() {
  return (
    <div className="space-y-10">
      <motion.section {...fadeIn(0)} className="grid gap-6 xl:grid-cols-[minmax(0,2fr)_minmax(0,1fr)]">
        <div className="relative overflow-hidden rounded-3xl border border-white/10 bg-gradient-to-br from-slate-900/80 via-slate-900/60 to-slate-800/70 p-8 text-white shadow-[0_32px_80px_rgba(15,23,42,0.55)]">
          <div className="absolute -left-16 -top-20 h-56 w-56 rounded-full bg-indigo-500/30 blur-3xl" aria-hidden />
          <div className="absolute -right-10 -bottom-12 h-64 w-64 rounded-full bg-purple-500/20 blur-3xl" aria-hidden />

          <div className="relative z-10 flex flex-col gap-8">
            <div>
              <span className="inline-flex items-center gap-2 rounded-full border border-surface-border bg-surface-muted px-4 py-1 text-xs font-semibold uppercase tracking-[0.35em] text-indigo-200">
                StudyFlow Focus
              </span>
              <h1 className="mt-5 text-4xl font-semibold leading-tight sm:text-5xl">
                Hej, Jan! Twoja nauka jest na dobrym kursie.
              </h1>
              <p className="mt-4 max-w-2xl text-sm text-slate-200 sm:text-base">
                Kontynuuj serię i wykorzystaj analitykę AI, aby zakończyć najważniejsze zadania przed terminami.
                Wszystkie sekcje są zsynchronizowane z Twoim planem semestralnym.
              </p>
            </div>

            <div className="flex flex-wrap gap-3 text-xs sm:text-sm">
              <span className="inline-flex items-center gap-2 rounded-full border border-surface-border bg-surface-muted px-4 py-2 text-indigo-200">
                <Sparkles className="h-4 w-4" aria-hidden />
                12 nowych notatek z AI
              </span>
              <span className="inline-flex items-center gap-2 rounded-full border border-surface-border bg-surface-muted px-4 py-2 text-purple-200">
                <LayoutGrid className="h-4 w-4" aria-hidden />
                48 fiszek do powtórki dziś
              </span>
              <span className="inline-flex items-center gap-2 rounded-full border border-surface-border bg-surface-muted px-4 py-2 text-cyan-200">
                <TimerReset className="h-4 w-4" aria-hidden />
                Serie streak: 12 dni
              </span>
            </div>

            <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
              <Button
                asChild
                size="xl"
                className="rounded-full bg-gradient-to-br from-indigo-500 via-violet-500 to-pink-500 px-8 text-base shadow-soft-lg"
              >
                <Link to="/new-lecture" className="flex items-center">
                  Rozpocznij nowy wykład
                  <ArrowRight className="ml-2 h-4 w-4" aria-hidden />
                </Link>
              </Button>
              <Button
                asChild
                variant="surface"
                size="lg"
                className="rounded-full border border-surface-border bg-surface-muted px-6 text-white hover:text-white"
              >
                <Link to="/flashcards">Wskocz w tryb fiszek</Link>
              </Button>
            </div>
          </div>
        </div>

        <div className="grid gap-4 sm:grid-cols-2">
          {performanceStats.map(stat => (
            <motion.div
              key={stat.label}
              {...fadeIn(0.1)}
              className="relative overflow-hidden rounded-3xl border border-surface-border bg-surface-panel p-6 text-slate-900 shadow-soft backdrop-blur-xl dark:border-slate-800/60 dark:bg-slate-900/70 dark:text-white"
            >
              <div className={cn('absolute -right-10 -top-10 h-32 w-32 rounded-full blur-3xl', `bg-gradient-to-br ${stat.tone}`)} aria-hidden />
              <div className="relative z-10 flex flex-col gap-3">
                <div className="flex items-center justify-between text-sm font-semibold uppercase tracking-wide text-slate-500 dark:text-slate-300">
                  {stat.label}
                  <stat.icon className="h-4 w-4 text-brand-emphasis" aria-hidden />
                </div>
                <div className="text-4xl font-semibold">{stat.value}</div>
                <p className="text-xs font-semibold text-brand-emphasis">{stat.change}</p>
              </div>
            </motion.div>
          ))}
        </div>
      </motion.section>

      <motion.section {...fadeIn(0.05)} className="space-y-4">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <h2 className="text-2xl font-semibold text-slate-900 dark:text-white">Szybkie przejścia</h2>
            <p className="text-sm text-slate-500 dark:text-slate-300">
              Wszystkie moduły w jednej siatce. Wybierz sekcję i kontynuuj pracę.
            </p>
          </div>
          <Button asChild variant="ghost" className="text-slate-500 hover:text-brand-emphasis dark:text-slate-300">
            <Link to="/subjects" className="flex items-center gap-2 text-sm">
              Zobacz plan semestru
              <ArrowRight className="h-4 w-4" aria-hidden />
            </Link>
          </Button>
        </div>

        <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
          {quickLinks.map(link => (
            <Link
              key={link.title}
              to={link.to}
              className="group relative overflow-hidden rounded-3xl border border-surface-border bg-surface-card p-6 shadow-soft transition-all duration-300 hover:-translate-y-1 hover:shadow-soft-lg dark:border-slate-800/60 dark:bg-slate-900/70"
            >
              <div className={cn('absolute inset-0 opacity-70 transition-opacity duration-300 group-hover:opacity-100', `bg-gradient-to-br ${link.accent}`)} aria-hidden />
              <div className="relative z-10 flex flex-col gap-3">
                <span className="inline-flex h-11 w-11 items-center justify-center rounded-2xl bg-surface-card text-indigo-500 shadow-soft">
                  <link.icon className="h-5 w-5" aria-hidden />
                </span>
                <div>
                  <h3 className="text-lg font-semibold text-slate-900 transition-colors duration-300 group-hover:text-indigo-600 dark:text-white">
                    {link.title}
                  </h3>
                  <p className="mt-2 text-sm text-slate-600 dark:text-slate-300">{link.description}</p>
                </div>
                <span className="mt-3 inline-flex items-center gap-2 text-sm font-semibold text-brand-emphasis">
                  Przejdź dalej
                  <ArrowRight className="h-4 w-4 transition-transform duration-300 group-hover:translate-x-1" aria-hidden />
                </span>
              </div>
            </Link>
          ))}
        </div>
      </motion.section>

      <motion.section {...fadeIn(0.1)} className="grid gap-6 xl:grid-cols-[minmax(0,1.8fr)_minmax(0,1fr)]">
        <div className="grid gap-6">
          <div className="rounded-3xl border border-surface-border bg-surface-card p-6 shadow-soft dark:border-slate-800/60 dark:bg-slate-900/70">
            <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
              <div>
                <h2 className="text-xl font-semibold text-slate-900 dark:text-white">Aktywność przedmiotów</h2>
                <p className="text-sm text-slate-500 dark:text-slate-300">Status działań i priorytetów z ostatnich dni.</p>
              </div>
              <Button asChild variant="ghost" className="text-sm text-brand-emphasis">
                <Link to="/subjects">Zarządzaj przedmiotami</Link>
              </Button>
            </div>

            <div className="mt-5 space-y-4">
              {activityCards.map(card => {
                const tone = statusTone[card.status as StatusKey]
                return (
                  <div
                    key={card.subject}
                    className="flex flex-col gap-4 rounded-3xl border border-surface-border bg-surface-card p-5 shadow-soft transition-all duration-300 hover:-translate-y-1 hover:shadow-soft-lg dark:border-slate-800/60 dark:bg-slate-900/70"
                  >
                    <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                      <div>
                        <h3 className="text-lg font-semibold text-slate-900 dark:text-white">{card.subject}</h3>
                        <p className="text-sm text-slate-500 dark:text-slate-300">{card.note}</p>
                      </div>
                      <span
                        className={cn(
                          'inline-flex items-center gap-2 rounded-full border border-transparent px-4 py-1 text-xs font-semibold uppercase tracking-[0.25em]',
                          `bg-gradient-to-r ${tone.badge}`
                        )}
                      >
                        {tone.label}
                      </span>
                    </div>
                    <div className="h-2 overflow-hidden rounded-full bg-slate-200/70 dark:bg-slate-800">
                      <div className={cn('h-full rounded-full bg-gradient-to-r', tone.bar)} style={{ width: `${card.progress}%` }} />
                    </div>
                  </div>
                )
              })}
            </div>
          </div>

          <div className="grid gap-6 lg:grid-cols-[minmax(0,1.2fr)_minmax(0,1fr)]">
            <div className="rounded-3xl border border-surface-border bg-surface-card p-6 shadow-soft dark:border-slate-800/60 dark:bg-slate-900/70">
              <h2 className="text-lg font-semibold text-slate-900 dark:text-white">Podgląd fiszek</h2>
              <p className="text-sm text-slate-500 dark:text-slate-300">Szybkie przypomnienie kluczowych pytań przed dzisiejszą sesją.</p>
              <div className="mt-4 space-y-4">
                {flashcardPeek.map(card => (
                  <div key={card.question} className="rounded-3xl border border-surface-border bg-surface-card p-4 shadow-inner dark:border-slate-800/60 dark:bg-slate-900/70">
                    <p className="text-sm font-semibold text-slate-900 dark:text-white">{card.question}</p>
                    <p className="mt-2 text-sm text-slate-600 dark:text-slate-300">{card.answer}</p>
                  </div>
                ))}
              </div>
              <Button asChild variant="ghost" className="mt-5 w-full justify-center text-brand-emphasis">
                <Link to="/flashcards" className="flex items-center justify-center gap-2 text-sm">
                  Przejdź do pełnej talii
                  <ArrowRight className="h-4 w-4" aria-hidden />
                </Link>
              </Button>
            </div>

            <div className="rounded-3xl border border-surface-border bg-surface-card p-6 shadow-soft dark:border-slate-800/60 dark:bg-slate-900/70">
              <h2 className="text-lg font-semibold text-slate-900 dark:text-white">Harmonogram</h2>
              <div className="mt-4 space-y-4">
                {lectureSchedule.map(event => (
                  <div key={event.title} className="flex items-start gap-3 rounded-3xl border border-surface-border bg-surface-card p-4 dark:border-slate-800/60 dark:bg-slate-900/70">
                    <span className="flex h-10 w-10 items-center justify-center rounded-2xl bg-slate-100 text-lg dark:bg-slate-800">
                      {event.icon}
                    </span>
                    <div className="flex-1">
                      <div className="flex items-center justify-between">
                        <p className="text-sm font-semibold text-slate-900 dark:text-white">{event.title}</p>
                        <span className="rounded-full bg-indigo-500/10 px-3 py-1 text-xs font-semibold text-indigo-500 dark:text-indigo-300">
                          {event.badge}
                        </span>
                      </div>
                      <p className="text-xs text-slate-500 dark:text-slate-300">{event.detail}</p>
                      <p className="text-xs text-slate-400 dark:text-slate-500">{event.date}</p>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>

        <div className="space-y-6">
          <div className="rounded-3xl border border-surface-border bg-surface-card p-6 shadow-soft dark:border-slate-800/60 dark:bg-slate-900/70">
            <h2 className="text-lg font-semibold text-slate-900 dark:text-white">Podpowiedzi AI</h2>
            <p className="text-sm text-slate-500 dark:text-slate-300">Zsynchronizowaliśmy Twoje postępy z rekomendacjami AI.</p>
            <div className="mt-4 space-y-4">
              {aiHighlights.map(insight => (
                <div
                  key={insight.title}
                  className="flex items-start gap-4 rounded-3xl border border-surface-border bg-surface-card p-4 dark:border-slate-800/60 dark:bg-slate-900/70"
                >
                  <span className="flex h-10 w-10 items-center justify-center rounded-2xl bg-brand-subtle text-brand-emphasis">
                    <insight.icon className="h-5 w-5" aria-hidden />
                  </span>
                  <div>
                    <p className="text-sm font-semibold text-slate-900 dark:text-white">{insight.title}</p>
                    <p className="text-xs text-slate-500 dark:text-slate-300">{insight.description}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>

          <div className="rounded-3xl border border-surface-border bg-surface-card p-6 shadow-soft dark:border-slate-800/60 dark:bg-slate-900/70">
            <h2 className="text-lg font-semibold text-slate-900 dark:text-white">Szybki przegląd semestru</h2>
            <div className="mt-4 grid gap-4">
              {analyticsHighlights.map(highlight => (
                <div key={highlight.title} className="flex items-start gap-4 rounded-3xl border border-surface-border bg-surface-card p-4 dark:border-slate-800/60 dark:bg-slate-900/70">
                  <span className="flex h-10 w-10 items-center justify-center rounded-2xl bg-gradient-to-br from-indigo-500/10 via-purple-500/10 to-pink-500/10 text-brand-emphasis">
                    <highlight.icon className="h-5 w-5" aria-hidden />
                  </span>
                  <div>
                    <p className="text-sm font-semibold text-slate-900 dark:text-white">{highlight.title}</p>
                    <p className="text-xs text-slate-500 dark:text-slate-300">{highlight.description}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </motion.section>

      <motion.section {...fadeIn(0.15)} className="space-y-6">
        <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h2 className="text-2xl font-semibold text-slate-900 dark:text-white">Twoje przedmioty</h2>
            <p className="text-sm text-slate-500 dark:text-slate-300">Postęp w semestrze, fiszkach i materiałach.</p>
          </div>
          <Button asChild variant="ghost" className="text-sm text-brand-emphasis">
            <Link to="/subjects" className="flex items-center gap-2">
              Zarządzaj przedmiotami
              <ArrowRight className="h-4 w-4" aria-hidden />
            </Link>
          </Button>
        </div>

        <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
          {subjectsOverview.map(subject => (
            <div
              key={subject.title}
              className="flex flex-col gap-5 rounded-3xl border border-surface-border bg-surface-card p-6 shadow-soft transition-all duration-300 hover:-translate-y-1 hover:shadow-soft-lg dark:border-slate-800/60 dark:bg-slate-900/70"
            >
              <div className="flex items-center justify-between">
                <span className="text-2xl">{subject.emoji}</span>
                <span className="rounded-full bg-indigo-500/10 px-3 py-1 text-xs font-semibold text-indigo-500 dark:text-indigo-300">
                  {subject.ects}
                </span>
              </div>
              <div>
                <h3 className="text-lg font-semibold text-slate-900 dark:text-white">{subject.title}</h3>
                <p className="mt-2 text-sm text-slate-500 dark:text-slate-300">{subject.stats}</p>
              </div>
              <div>
                <div className="flex items-center justify-between text-xs font-semibold text-slate-400">
                  <span>Postęp</span>
                  <span>{subject.progress}%</span>
                </div>
                <div className="mt-2 h-2 overflow-hidden rounded-full bg-slate-200/70 dark:bg-slate-800">
                  <div className="h-full rounded-full bg-gradient-to-r from-indigo-500 via-purple-500 to-pink-500" style={{ width: `${subject.progress}%` }} />
                </div>
              </div>
            </div>
          ))}
        </div>
      </motion.section>

      <motion.section {...fadeIn(0.2)} className="space-y-6">
        <h2 className="text-2xl font-semibold text-slate-900 dark:text-white">Plan tygodnia</h2>
        <div className="grid gap-4 lg:grid-cols-3">
          {weeklyPlan.map(day => (
            <div
              key={day.day}
              className="flex flex-col gap-4 rounded-3xl border border-surface-border bg-surface-card p-6 shadow-soft dark:border-slate-800/60 dark:bg-slate-900/70"
            >
              <div className="flex items-center justify-between">
                <p className="text-lg font-semibold text-slate-900 dark:text-white">{day.day}</p>
                <span className="rounded-full bg-brand-subtle px-3 py-1 text-xs font-semibold text-brand-emphasis">
                  {day.badge}
                </span>
              </div>
              <div className="space-y-3">
                {day.sessions.map(session => (
                  <div key={session.title} className="rounded-2xl border border-surface-border bg-surface-card p-4 dark:border-slate-800/60 dark:bg-slate-900/70">
                    <p className="text-xs font-semibold uppercase tracking-wide text-brand-emphasis">{session.hour}</p>
                    <p className="text-sm font-semibold text-slate-900 dark:text-white">{session.title}</p>
                    <p className="text-xs text-slate-500 dark:text-slate-300">{session.room}</p>
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>
      </motion.section>
    </div>
  )
}
