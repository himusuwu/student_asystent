import { useEffect, useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import { motion } from 'framer-motion'
import { createSubject, listSubjects } from '@/lib/repo'
import { Button } from '@/components/ui/Button'
import { Input } from '@/components/ui/Input'
import {
  Plus,
  BookOpen,
  Palette,
  Loader2,
  Sparkles,
  CalendarCheck,
  ListChecks,
  FolderKanban,
  ArrowRight,
} from 'lucide-react'

type Subject = { id: string; name: string; color?: string }

const fadeIn = (delay = 0) => ({
  initial: { opacity: 0, y: 24 },
  whileInView: { opacity: 1, y: 0 },
  viewport: { once: true, margin: '-20%' },
  transition: { duration: 0.6, ease: 'easeOut' as const, delay },
})

const highlightActions = [
  {
    title: 'Zaplanuj tydzień',
    description: 'Połącz przedmioty z harmonogramem, aby wiedzieć, co jest priorytetem.',
    icon: CalendarCheck,
  },
  {
    title: 'Synchronizacja AI',
    description: 'Analiza notatek wykrywa luki i podpowiada fiszki.',
    icon: Sparkles,
  },
]

export default function Subjects() {
  const [items, setItems] = useState<Subject[]>([])
  const [name, setName] = useState('')
  const [color, setColor] = useState('#3b82f6')
  const [isLoading, setIsLoading] = useState(false)
  const [isSubmitting, setIsSubmitting] = useState(false)

  useEffect(() => {
    const loadSubjects = async () => {
      setIsLoading(true)
      try {
        setItems(await listSubjects())
      } finally {
        setIsLoading(false)
      }
    }
    loadSubjects()
  }, [])

  const uniqueColors = useMemo(() => new Set(items.map(item => item.color ?? '#3b82f6')).size, [items])
  const estimatedFlashcards = useMemo(() => (items.length > 0 ? items.length * 18 : 0), [items])

  async function onAdd(e: React.FormEvent) {
    e.preventDefault()
    if (!name.trim()) return
    setIsSubmitting(true)
    try {
      await createSubject(name.trim(), color)
      setName('')
      setItems(await listSubjects())
    } finally {
      setIsSubmitting(false)
    }
  }

  const predefinedColors = ['#3b82f6', '#8b5cf6', '#ef4444', '#10b981', '#f59e0b', '#ec4899', '#06b6d4', '#84cc16']

  return (
    <div className="space-y-12">
      <motion.section {...fadeIn(0)} className="grid gap-6 xl:grid-cols-[minmax(0,2fr)_minmax(0,1fr)]">
        <div className="relative overflow-hidden rounded-3xl border border-white/10 bg-gradient-to-br from-slate-900/80 via-slate-900/60 to-slate-800/70 p-8 text-white shadow-[0_32px_80px_rgba(15,23,42,0.55)]">
          <div className="absolute -left-20 -top-16 h-48 w-48 rounded-full bg-indigo-500/30 blur-3xl" aria-hidden />
          <div className="absolute -right-12 -bottom-16 h-56 w-56 rounded-full bg-purple-500/20 blur-3xl" aria-hidden />

          <div className="relative z-10 flex flex-col gap-8">
            <div className="space-y-4">
              <span className="inline-flex items-center gap-2 rounded-full border border-surface-border bg-surface-muted px-4 py-1 text-xs font-semibold uppercase tracking-[0.35em] text-indigo-200">
                Portfolio przedmiotów
              </span>
              <h1 className="text-4xl font-semibold leading-tight sm:text-5xl">
                Twoje studia w jednym miejscu.
              </h1>
              <p className="max-w-2xl text-sm text-slate-200 sm:text-base">
                Organizuj przedmioty, powiąż je z fiszkami i automatyzuj powtórki. StudyFlow pilnuje terminów,
                przypomnień i integruje notatki AI bez dodatkowego wysiłku.
              </p>
            </div>

            <div className="grid gap-4 sm:grid-cols-3">
              <div className="rounded-3xl border border-surface-border bg-surface-muted p-4 backdrop-blur-xl">
                <p className="text-xs font-semibold uppercase tracking-wide text-indigo-200">Aktywne przedmioty</p>
                <p className="mt-3 text-3xl font-semibold">{items.length}</p>
                <p className="mt-2 text-xs text-slate-200/80">Synchronizowane między pulpitem i aplikacją mobilną.</p>
              </div>
              <div className="rounded-3xl border border-surface-border bg-surface-muted p-4 backdrop-blur-xl">
                <p className="text-xs font-semibold uppercase tracking-wide text-indigo-200">Paleta kolorów</p>
                <p className="mt-3 text-3xl font-semibold">{uniqueColors}</p>
                <p className="mt-2 text-xs text-slate-200/80">Szybka identyfikacja bloków materiału i planu zajęć.</p>
              </div>
              <div className="rounded-3xl border border-surface-border bg-surface-muted p-4 backdrop-blur-xl">
                <p className="text-xs font-semibold uppercase tracking-wide text-indigo-200">Powiązane fiszki</p>
                <p className="mt-3 text-3xl font-semibold">{estimatedFlashcards}</p>
                <p className="mt-2 text-xs text-slate-200/80">Szacowane na podstawie aktywnych przedmiotów.</p>
              </div>
            </div>

            <div className="flex flex-wrap items-center gap-3 text-xs sm:text-sm">
              <span className="inline-flex items-center gap-2 rounded-full border border-surface-border bg-surface-muted px-4 py-2 text-indigo-200">
                <Sparkles className="h-4 w-4" aria-hidden />
                AI proponuje priorytety na dziś
              </span>
              <span className="inline-flex items-center gap-2 rounded-full border border-surface-border bg-surface-muted px-4 py-2 text-purple-200">
                <ListChecks className="h-4 w-4" aria-hidden />
                Automatyczne listy zadań dla zajęć
              </span>
              <span className="inline-flex items-center gap-2 rounded-full border border-surface-border bg-surface-muted px-4 py-2 text-cyan-200">
                <FolderKanban className="h-4 w-4" aria-hidden />
                Mapy myśli z wykładów
              </span>
            </div>
          </div>
        </div>

        <div className="grid gap-4 sm:grid-cols-2">
          {highlightActions.map(action => (
            <div
              key={action.title}
              className="rounded-3xl border border-surface-border bg-surface-panel p-6 shadow-soft backdrop-blur-xl transition-all duration-300 hover:-translate-y-1 hover:shadow-soft-lg dark:border-slate-800/60 dark:bg-slate-900/70"
            >
              <div className="flex items-center gap-3">
                <span className="inline-flex h-11 w-11 items-center justify-center rounded-2xl bg-brand-subtle text-brand-emphasis">
                  <action.icon className="h-5 w-5" aria-hidden />
                </span>
                <div>
                  <h3 className="text-base font-semibold text-slate-900 dark:text-white">{action.title}</h3>
                  <p className="mt-1 text-sm text-slate-500 dark:text-slate-300">{action.description}</p>
                </div>
              </div>
            </div>
          ))}
        </div>
      </motion.section>

      <motion.section {...fadeIn(0.05)} className="grid gap-6 lg:grid-cols-[minmax(0,1.6fr)_minmax(0,1fr)]">
        <form
          onSubmit={onAdd}
          className="rounded-3xl border border-surface-border bg-surface-card p-6 shadow-soft transition-all duration-300 hover:-translate-y-1 hover:shadow-soft-lg dark:border-slate-800/60 dark:bg-slate-900/70"
        >
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <h2 className="text-xl font-semibold text-slate-900 dark:text-white">Dodaj nowy przedmiot</h2>
              <p className="text-sm text-slate-500 dark:text-slate-300">
                Nazwij przedmiot, wybierz kolor i przejdź do tworzenia notatek oraz fiszek.
              </p>
            </div>
            <span className="inline-flex items-center gap-2 rounded-full bg-brand-subtle px-4 py-2 text-xs font-semibold uppercase tracking-[0.25em] text-brand-emphasis">
              Nowy wpis
            </span>
          </div>

          <div className="mt-6 grid gap-5 md:grid-cols-2">
            <div className="space-y-2">
              <label htmlFor="subject-name" className="text-sm font-semibold text-slate-600 dark:text-slate-200">
                Nazwa przedmiotu
              </label>
              <Input
                id="subject-name"
                value={name}
                onChange={event => setName(event.target.value)}
                placeholder="np. Analiza matematyczna"
                required
                className="h-12 rounded-2xl border border-surface-border bg-surface-card px-4 text-slate-900 shadow-inner focus-visible:ring-brand dark:border-slate-700 dark:bg-slate-900/60 dark:text-white"
              />
            </div>

            <div className="space-y-3">
              <label className="flex items-center gap-2 text-sm font-semibold text-slate-600 dark:text-slate-200">
                <Palette className="h-4 w-4" aria-hidden />
                Wybierz kolor
              </label>
              <div className="flex flex-wrap items-center gap-3">
                {predefinedColors.map(preColor => (
                  <button
                    key={preColor}
                    type="button"
                    onClick={() => setColor(preColor)}
                    className={`flex h-10 w-10 items-center justify-center rounded-full border border-surface-border shadow-sm transition-transform duration-300 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand ${
                      color === preColor ? 'scale-110 ring-2 ring-indigo-400 shadow-soft' : 'hover:scale-105'
                    }`}
                    style={{ backgroundColor: preColor }}
                    aria-label={`Wybierz kolor ${preColor}`}
                  />
                ))}
                <label className="flex h-10 w-10 cursor-pointer items-center justify-center rounded-full border border-dashed border-slate-300/60 bg-surface-panel text-xs font-semibold text-slate-500 transition-all duration-300 hover:-translate-y-0.5 hover:border-indigo-400 hover:text-indigo-500 dark:border-slate-700 dark:bg-slate-900/60 dark:text-slate-300">
                  <input
                    type="color"
                    value={color}
                    onChange={event => setColor(event.target.value)}
                    className="sr-only"
                    aria-label="Wybierz własny kolor"
                  />
                  +
                </label>
              </div>
            </div>
          </div>

          <div className="mt-6 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
            <div className="flex items-center gap-3 rounded-2xl border border-surface-border bg-surface-panel px-4 py-3 text-sm text-slate-600 dark:border-slate-800/60 dark:bg-slate-900/60 dark:text-slate-300">
              <BookOpen className="h-5 w-5 text-brand-emphasis" aria-hidden />
              Połącz przedmiot z notatkami audio, fiszkami i harmonogramem powtórek.
            </div>
            <Button
              type="submit"
              size="lg"
              disabled={isSubmitting || !name.trim()}
              className="inline-flex items-center justify-center rounded-full bg-gradient-to-br from-indigo-500 via-violet-500 to-pink-500 px-6 py-3 text-base font-semibold text-white shadow-soft-lg transition-transform duration-300 hover:-translate-y-0.5 hover:shadow-2xl"
            >
              {isSubmitting && <Loader2 className="mr-2 h-5 w-5 animate-spin" aria-hidden />}
              {isSubmitting ? 'Dodaję...' : 'Dodaj przedmiot'}
            </Button>
          </div>
        </form>

  <div className="rounded-3xl border border-surface-border bg-surface-card p-6 shadow-soft dark:border-slate-800/60 dark:bg-slate-900/70">
          <h2 className="text-lg font-semibold text-slate-900 dark:text-white">Inteligentne podpowiedzi</h2>
          <p className="mt-2 text-sm text-slate-500 dark:text-slate-300">
            StudyFlow analizuje Twoje materiały i sugeruje, które przedmioty wymagają dodatkowej uwagi.
          </p>
          <ul className="mt-4 space-y-3 text-sm text-slate-600 dark:text-slate-300">
            <li className="flex items-start gap-3 rounded-2xl border border-surface-border bg-surface-card px-4 py-3 dark:border-slate-800/60 dark:bg-slate-900/70">
              <Sparkles className="mt-1 h-4 w-4 text-brand-emphasis" aria-hidden />
              Przedmioty z największą liczbą zaległych fiszek zostaną oznaczone w harmonogramie.
            </li>
            <li className="flex items-start gap-3 rounded-2xl border border-surface-border bg-surface-card px-4 py-3 dark:border-slate-800/60 dark:bg-slate-900/70">
              <ListChecks className="mt-1 h-4 w-4 text-brand-emphasis" aria-hidden />
              Automatyczne checklisty przypominają o projektach i kolokwiach.
            </li>
            <li className="flex items-start gap-3 rounded-2xl border border-surface-border bg-surface-card px-4 py-3 dark:border-slate-800/60 dark:bg-slate-900/70">
              <FolderKanban className="mt-1 h-4 w-4 text-brand-emphasis" aria-hidden />
              Mapy myśli pomagają szybko przygotować prezentacje lub notatki na zajęcia.
            </li>
          </ul>
        </div>
      </motion.section>

      <motion.section {...fadeIn(0.1)} className="space-y-6">
        <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h2 className="text-2xl font-semibold text-slate-900 dark:text-white">Twoje przedmioty</h2>
            <p className="text-sm text-slate-500 dark:text-slate-300">Zarządzaj materiałami, fiszkami i terminami dla każdego kursu.</p>
          </div>
          <Button asChild variant="ghost" className="text-sm text-brand-emphasis">
            <Link to="/new-lecture" className="flex items-center gap-2">
              Dodaj notatki z wykładu
              <ArrowRight className="h-4 w-4" aria-hidden />
            </Link>
          </Button>
        </div>

        {isLoading ? (
          <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
            {[...Array(6)].map((_, index) => (
              <div
                key={index}
                className="h-40 rounded-3xl border border-surface-border bg-surface-panel shadow-soft backdrop-blur-xl dark:border-slate-800/60 dark:bg-slate-900/70"
              >
                <div className="h-full w-full animate-pulse rounded-3xl bg-gradient-to-br from-slate-200/40 to-slate-100/20 dark:from-slate-800/40 dark:to-slate-900/20" />
              </div>
            ))}
          </div>
        ) : items.length > 0 ? (
          <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
            {items.map(subject => (
              <Link
                key={subject.id}
                to={`/subjects/${subject.id}`}
                className="group relative overflow-hidden rounded-3xl border border-surface-border bg-surface-card p-6 shadow-soft transition-all duration-300 hover:-translate-y-1 hover:shadow-soft-lg dark:border-slate-800/60 dark:bg-slate-900/70"
              >
                <div className="absolute -right-10 -top-12 h-32 w-32 rounded-full opacity-60 blur-3xl" style={{ backgroundColor: `${subject.color ?? '#818cf8'}33` }} aria-hidden />
                <div className="relative z-10 flex flex-col gap-5">
                  <div className="flex items-start justify-between">
                    <div className="flex items-center gap-3">
                      <span
                        className="flex h-10 w-10 items-center justify-center rounded-2xl text-white shadow-md"
                        style={{ backgroundColor: subject.color ?? '#6366f1' }}
                      >
                        <BookOpen className="h-5 w-5" aria-hidden />
                      </span>
                      <div>
                        <h3 className="text-lg font-semibold text-slate-900 transition-colors duration-300 group-hover:text-indigo-600 dark:text-white">
                          {subject.name}
                        </h3>
                        <p className="text-xs uppercase tracking-[0.25em] text-slate-400">Przedmiot indywidualny</p>
                      </div>
                    </div>
                    <span className="rounded-full bg-brand-subtle px-3 py-1 text-xs font-semibold text-brand-emphasis opacity-0 transition-opacity duration-300 group-hover:opacity-100">
                      Otwórz
                    </span>
                  </div>

                  <div className="grid grid-cols-2 gap-4 text-sm text-slate-600 dark:text-slate-300">
                    <div>
                      <p className="text-xs font-semibold uppercase tracking-wide text-slate-400">Notatki</p>
                      <p className="mt-1 text-base font-semibold text-slate-900 dark:text-white">12</p>
                    </div>
                    <div>
                      <p className="text-xs font-semibold uppercase tracking-wide text-slate-400">Fiszki</p>
                      <p className="mt-1 text-base font-semibold text-slate-900 dark:text-white">24</p>
                    </div>
                    <div>
                      <p className="text-xs font-semibold uppercase tracking-wide text-slate-400">Kolor</p>
                      <p className="mt-1 flex items-center gap-2 text-base font-semibold text-slate-900 dark:text-white">
                        <span className="h-2 w-2 rounded-full" style={{ backgroundColor: subject.color ?? '#6366f1' }} />
                        {subject.color?.toUpperCase() ?? '#6366F1'}
                      </p>
                    </div>
                    <div>
                      <p className="text-xs font-semibold uppercase tracking-wide text-slate-400">Harmonogram</p>
                      <p className="mt-1 text-base font-semibold text-slate-900 dark:text-white">W przygotowaniu</p>
                    </div>
                  </div>
                </div>
              </Link>
            ))}
          </div>
        ) : (
          <div className="flex flex-col items-center justify-center gap-6 rounded-3xl border border-dashed border-surface-border bg-surface-panel p-12 text-center shadow-soft dark:border-slate-800/60 dark:bg-slate-900/70">
            <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-brand-subtle text-brand-emphasis shadow-soft">
              <BookOpen className="h-7 w-7" aria-hidden />
            </div>
            <div className="space-y-3">
              <h3 className="text-2xl font-semibold text-slate-900 dark:text-white">Zacznij od dodania przedmiotu</h3>
              <p className="text-sm text-slate-500 dark:text-slate-300">
                StudyFlow poprowadzi Cię przez tworzenie notatek, fiszek oraz automatyczne powtórki.
              </p>
            </div>
            <Button onClick={() => document.getElementById('subject-name')?.focus()} size="lg" className="rounded-full bg-gradient-to-br from-indigo-500 via-violet-500 to-pink-500 px-6 py-3 text-base font-semibold text-white shadow-soft-lg">
              <Plus className="mr-2 h-5 w-5" aria-hidden />
              Dodaj pierwszy przedmiot
            </Button>
          </div>
        )}
      </motion.section>
    </div>
  )
}
