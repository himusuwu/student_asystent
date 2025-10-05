import { useEffect, useMemo, useState } from 'react'
import { motion } from 'framer-motion'
import { getFlashcard, listSubjects, saveFlashcard, listAllFlashcards } from '@/lib/repo'
import { gradeFromBool, review } from '@/lib/srs'
import { Button } from '@/components/ui/Button'
import { useToast } from '@/hooks/use-toast'
import {
  Sparkles,
  LayoutGrid,
  TimerReset,
  BookOpen,
  Brain,
  ArrowRight,
  ArrowLeft,
  RotateCcw,
  Trophy,
} from 'lucide-react'

const fadeIn = (delay = 0) => ({
  initial: { opacity: 0, y: 24 },
  whileInView: { opacity: 1, y: 0 },
  viewport: { once: true, margin: '-20%' },
  transition: { duration: 0.6, ease: 'easeOut' as const, delay },
})

export default function Flashcards() {
  const [queue, setQueue] = useState<string[]>([])
  const [currentId, setCurrentId] = useState<string | null>(null)
  const [showAnswer, setShowAnswer] = useState(false)
  const [cardsMap, setCardsMap] = useState<Record<string, { question: string; answer: string }>>({})
  const [subjects, setSubjects] = useState<{ id: string; name: string }[]>([])
  const [subjectFilter, setSubjectFilter] = useState('')
  const [page, setPage] = useState(1)
  const pageSize = 10
  const [scope, setScope] = useState<'overdue' | 'all' | 'new'>('overdue')
  const [dailyLimit, setDailyLimit] = useState(30)
  const [stats, setStats] = useState<{ new: number; overdue: number; done: number }>({ new: 0, overdue: 0, done: 0 })
  const { toast } = useToast()

  useEffect(() => {
    ;(async () => setSubjects(await listSubjects()))()
  }, [])

  useEffect(() => {
    ;(async () => {
      const all = await listAllFlashcards()
      const bySubj = subjectFilter ? all.filter(c => c.subjectId === subjectFilter) : all
      const now = new Date()
      const overdue = bySubj.filter(c => new Date(c.dueDate) <= now)
      const newly = bySubj.filter(c => c.repetition === 0)
      const done = bySubj.filter(c => c.repetition > 0 && new Date(c.dueDate) > now)
      setStats({ new: newly.length, overdue: overdue.length, done: done.length })
      let pool = overdue
      if (scope === 'new') pool = newly
      if (scope === 'all') pool = bySubj
      const limited = pool.slice(0, dailyLimit)
      const ids = limited.map(c => c.id)
      setQueue(ids)
      const map: Record<string, { question: string; answer: string }> = {}
      for (const c of limited) map[c.id] = { question: c.question, answer: c.answer }
      setCardsMap(map)
      setCurrentId(ids[0] ?? null)
      setPage(1)
    })()
  }, [subjectFilter, scope, dailyLimit])

  const current = useMemo(() => (currentId ? { id: currentId, ...cardsMap[currentId] } : null), [currentId, cardsMap])

  async function grade(known: boolean) {
    if (!currentId) return
    const fc = await getFlashcard(currentId)
    if (!fc) return
    const graded = review(fc, gradeFromBool(known))
    await saveFlashcard(graded)
    setShowAnswer(false)
    const nq = queue.slice(1)
    setQueue(nq)
    setCurrentId(nq[0] ?? null)
  }

  const total = queue.length
  const totalPages = Math.max(1, Math.ceil(total / pageSize))
  const currentIndex = currentId ? queue.indexOf(currentId) : -1

  return (
    <div className="space-y-12">
      <motion.section {...fadeIn(0)} className="grid gap-6 xl:grid-cols-[minmax(0,2fr)_minmax(0,1fr)]">
        <div className="relative overflow-hidden rounded-3xl border border-white/10 bg-gradient-to-br from-purple-600/60 via-indigo-500/60 to-slate-900/80 p-8 text-white shadow-[0_32px_80px_rgba(79,70,229,0.45)]">
          <div className="absolute -left-16 -top-14 h-44 w-44 rounded-full bg-pink-400/30 blur-3xl" aria-hidden />
          <div className="absolute -right-12 -bottom-16 h-52 w-52 rounded-full bg-indigo-400/20 blur-3xl" aria-hidden />

          <div className="relative z-10 flex flex-col gap-8">
            <div className="space-y-4">
              <span className="inline-flex items-center gap-2 rounded-full border border-surface-border bg-surface-muted px-4 py-1 text-xs font-semibold uppercase tracking-[0.35em] text-indigo-100">
                Tryb nauki SRS
              </span>
              <h1 className="text-4xl font-semibold leading-tight sm:text-5xl">
                Szybsze powtórki z inteligencją AI.
              </h1>
              <p className="max-w-2xl text-sm text-indigo-50/90 sm:text-base">
                System powtórek o zmiennym odstępie dopasowuje rytm nauki do Twojego kalendarza. StudyFlow łączy fiszki z
                wykładami, analizuje wyniki i proponuje kolejne kroki.
              </p>
            </div>

            <div className="grid gap-4 sm:grid-cols-3">
              {[
                {
                  label: 'Nowe fiszki',
                  value: stats.new,
                  icon: Sparkles,
                  description: 'Przygotowane na dzisiejszą sesję.',
                },
                {
                  label: 'Zaległe powtórki',
                  value: stats.overdue,
                  icon: TimerReset,
                  description: 'Priorytet wg algorytmu SRS.',
                },
                {
                  label: 'Zakończone dzisiaj',
                  value: stats.done,
                  icon: Trophy,
                  description: 'Wynik bieżącej sesji nauki.',
                },
              ].map(stat => (
                <div key={stat.label} className="rounded-3xl border border-surface-border bg-surface-muted p-4 backdrop-blur-xl">
                  <div className="flex items-center gap-3">
                    <span className="inline-flex h-10 w-10 items-center justify-center rounded-2xl bg-surface-muted text-white">
                      <stat.icon className="h-5 w-5" aria-hidden />
                    </span>
                    <div>
                      <p className="text-xs font-semibold uppercase tracking-wide text-indigo-100/80">{stat.label}</p>
                      <p className="mt-1 text-2xl font-semibold">{stat.value}</p>
                    </div>
                  </div>
                  <p className="mt-3 text-xs text-indigo-50/80">{stat.description}</p>
                </div>
              ))}
            </div>

            <div className="flex flex-wrap items-center gap-3 text-xs sm:text-sm">
              <span className="inline-flex items-center gap-2 rounded-full border border-surface-border bg-surface-muted px-4 py-2 text-indigo-100">
                <LayoutGrid className="h-4 w-4" aria-hidden />
                Szybka mapa tematów
              </span>
              <span className="inline-flex items-center gap-2 rounded-full border border-surface-border bg-surface-muted px-4 py-2 text-purple-100">
                <Brain className="h-4 w-4" aria-hidden />
                Analiza trudności AI
              </span>
              <span className="inline-flex items-center gap-2 rounded-full border border-surface-border bg-surface-muted px-4 py-2 text-rose-100">
                <TimerReset className="h-4 w-4" aria-hidden />
                Przypomnienia o porze nauki
              </span>
            </div>
          </div>
        </div>

        <div className="grid gap-4 sm:grid-cols-2">
          <div className="rounded-3xl border border-surface-border bg-surface-card p-6 shadow-soft dark:border-slate-800/60 dark:bg-slate-900/70">
            <div className="flex items-start gap-3">
              <span className="inline-flex h-12 w-12 items-center justify-center rounded-2xl bg-brand-subtle text-brand-emphasis">
                <Sparkles className="h-5 w-5" aria-hidden />
              </span>
              <div>
                <h2 className="text-base font-semibold text-slate-900 dark:text-white">Rekomendacje AI</h2>
                <p className="mt-2 text-sm text-slate-500 dark:text-slate-300">
                  Koncentruj się na fiszkach z najbliższymi terminami kolokwiów i projektów.
                </p>
              </div>
            </div>
          </div>
          <div className="rounded-3xl border border-surface-border bg-surface-card p-6 shadow-soft dark:border-slate-800/60 dark:bg-slate-900/70">
            <div className="flex items-start gap-3">
              <span className="inline-flex h-12 w-12 items-center justify-center rounded-2xl bg-brand-subtle text-brand-emphasis">
                <BookOpen className="h-5 w-5" aria-hidden />
              </span>
              <div>
                <h2 className="text-base font-semibold text-slate-900 dark:text-white">Powiązane notatki</h2>
                <p className="mt-2 text-sm text-slate-500 dark:text-slate-300">
                  Łącz fiszki z notatkami audio i mapami myśli, aby przyspieszyć powtórki.
                </p>
              </div>
            </div>
          </div>
        </div>
      </motion.section>

  <motion.section {...fadeIn(0.05)} className="rounded-3xl border border-surface-border bg-surface-card p-6 shadow-soft dark:border-slate-800/60 dark:bg-slate-900/70">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h2 className="text-xl font-semibold text-slate-900 dark:text-white">Dostosuj sesję nauki</h2>
            <p className="text-sm text-slate-500 dark:text-slate-300">Filtruj fiszki według przedmiotu, zakresu i dziennego limitu.</p>
          </div>
          <span className="inline-flex items-center gap-2 rounded-full bg-brand-subtle px-4 py-2 text-xs font-semibold uppercase tracking-[0.25em] text-brand-emphasis">
            Kolejka: {total}
          </span>
        </div>

        <div className="mt-6 grid gap-4 md:grid-cols-3">
          <div className="space-y-2">
            <label htmlFor="flashcards-subject" className="text-sm font-semibold text-slate-600 dark:text-slate-200">
              Przedmiot
            </label>
            <div className="relative">
              <select
                id="flashcards-subject"
                value={subjectFilter}
                onChange={event => setSubjectFilter(event.target.value)}
                className="h-12 w-full rounded-2xl border border-surface-border bg-surface-card px-4 text-sm font-medium text-slate-700 shadow-inner focus-visible:ring-brand dark:border-slate-700 dark:bg-slate-900/60 dark:text-slate-100"
              >
                <option value="">Wszystkie przedmioty</option>
                {subjects.map(subject => (
                  <option key={subject.id} value={subject.id}>
                    {subject.name}
                  </option>
                ))}
              </select>
            </div>
          </div>

          <div className="space-y-2">
            <label htmlFor="flashcards-scope" className="text-sm font-semibold text-slate-600 dark:text-slate-200">
              Zakres fiszek
            </label>
            <div className="relative">
              <select
                id="flashcards-scope"
                value={scope}
                onChange={event => setScope(event.target.value as any)}
                className="h-12 w-full rounded-2xl border border-surface-border bg-surface-card px-4 text-sm font-medium text-slate-700 shadow-inner focus-visible:ring-brand dark:border-slate-700 dark:bg-slate-900/60 dark:text-slate-100"
              >
                <option value="overdue">Tylko zaległe</option>
                <option value="new">Tylko nowe</option>
                <option value="all">Wszystkie</option>
              </select>
            </div>
          </div>

          <div className="space-y-2">
            <label htmlFor="flashcards-limit" className="text-sm font-semibold text-slate-600 dark:text-slate-200">
              Dzienny limit ({dailyLimit})
            </label>
            <input
              id="flashcards-limit"
              type="range"
              min={1}
              max={200}
              value={dailyLimit}
              onChange={event => setDailyLimit(Number(event.target.value))}
              className="slider h-2 w-full cursor-pointer rounded-lg bg-slate-200 dark:bg-slate-700"
            />
          </div>
        </div>

        <div className="mt-6 flex flex-wrap items-center gap-3 text-xs text-slate-500 dark:text-slate-300">
          <span className="inline-flex items-center gap-2 rounded-full border border-surface-border bg-surface-panel px-3 py-1 font-semibold dark:border-slate-700 dark:bg-slate-900/60">
            <RotateCcw className="h-4 w-4 text-brand-emphasis" aria-hidden />
            Kolejka resetuje się o północy
          </span>
          <span className="inline-flex items-center gap-2 rounded-full border border-surface-border bg-surface-panel px-3 py-1 font-semibold dark:border-slate-700 dark:bg-slate-900/60">
            <Brain className="h-4 w-4 text-brand-emphasis" aria-hidden />
            Algorytm priorytetyzuje trudniejsze pytania
          </span>
        </div>
      </motion.section>

      <motion.section {...fadeIn(0.1)}>
        {!current ? (
          <div className="flex flex-col items-center justify-center gap-6 rounded-3xl border border-dashed border-surface-border bg-surface-card p-12 text-center shadow-soft dark:border-slate-800/60 dark:bg-slate-900/70">
            <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-brand-subtle text-brand-emphasis shadow-soft">
              <Trophy className="h-7 w-7" aria-hidden />
            </div>
            <div className="space-y-3">
              <h3 className="text-2xl font-semibold text-slate-900 dark:text-white">Świetnie! Zrealizowałeś wszystkie fiszki na dziś</h3>
              <p className="text-sm text-slate-500 dark:text-slate-300">
                Możesz zwiększyć limit dzienny, przejrzeć wszystkie fiszki lub rozpocząć nową talię z innego przedmiotu.
              </p>
            </div>
            <div className="flex flex-wrap justify-center gap-3">
              <Button onClick={() => setScope('all')} leftIcon={<LayoutGrid className="h-4 w-4" aria-hidden />}>Przeglądaj wszystkie</Button>
              <Button variant="outline" onClick={() => setDailyLimit(limit => Math.min(200, limit + 20))} leftIcon={<ArrowRight className="h-4 w-4" aria-hidden />}>
                Zwiększ limit
              </Button>
            </div>
          </div>
        ) : (
          <div className="mx-auto max-w-3xl rounded-3xl border border-surface-border bg-surface-card p-8 shadow-soft dark:border-slate-800/60 dark:bg-slate-900/70">
            <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
              <div className="flex items-center gap-3 text-sm text-slate-500 dark:text-slate-300">
                <span className="inline-flex h-10 w-10 items-center justify-center rounded-2xl bg-brand-subtle text-brand-emphasis">
                  <LayoutGrid className="h-4 w-4" aria-hidden />
                </span>
                <div>
                  <p className="font-semibold text-slate-700 dark:text-slate-200">Postęp sesji</p>
                  <p>Pozycja {currentIndex >= 0 ? currentIndex + 1 : 0} z {total}</p>
                </div>
              </div>
              <div className="flex items-center gap-2">
                <span className="rounded-full bg-brand-subtle px-3 py-1 text-xs font-semibold text-brand-emphasis">
                  Strona {page} / {totalPages}
                </span>
              </div>
            </div>

            <div className="mt-4 h-2 w-full overflow-hidden rounded-full bg-slate-200/80 dark:bg-slate-800">
              <div
                className="h-full rounded-full bg-gradient-to-r from-indigo-500 via-purple-500 to-pink-500 transition-all duration-500"
                style={{ width: `${total > 0 ? ((currentIndex + 1) / total) * 100 : 0}%` }}
              />
            </div>

            <div className="mt-8 space-y-6">
              <div>
                <h3 className="flex items-center gap-2 text-sm font-semibold uppercase tracking-wide text-slate-500 dark:text-slate-300">
                  <span className="inline-flex h-8 w-8 items-center justify-center rounded-2xl bg-indigo-500/10 text-indigo-500">
                    ❓
                  </span>
                  Pytanie
                </h3>
                <div className="mt-3 rounded-2xl border border-indigo-200/60 bg-indigo-50/70 p-6 dark:border-indigo-500/30 dark:bg-indigo-900/20">
                  <p className="text-lg leading-relaxed text-slate-900 dark:text-slate-100">{current.question}</p>
                </div>
              </div>

              {showAnswer ? (
                <div>
                  <h3 className="flex items-center gap-2 text-sm font-semibold uppercase tracking-wide text-slate-500 dark:text-slate-300">
                    <span className="inline-flex h-8 w-8 items-center justify-center rounded-2xl bg-emerald-500/10 text-emerald-500">
                      💡
                    </span>
                    Odpowiedź
                  </h3>
                  <div className="mt-3 rounded-2xl border border-emerald-200/60 bg-emerald-50/70 p-6 dark:border-emerald-500/30 dark:bg-emerald-900/20">
                    <p className="text-lg leading-relaxed text-slate-900 dark:text-slate-100">{current.answer}</p>
                  </div>
                </div>
              ) : (
                <div className="text-center">
                  <Button onClick={() => setShowAnswer(true)} size="lg" className="mt-4 inline-flex items-center gap-3 rounded-full bg-gradient-to-br from-indigo-500 via-violet-500 to-pink-500 px-6 py-3 text-base font-semibold text-white shadow-soft-lg">
                    <Sparkles className="h-4 w-4" aria-hidden />
                    Pokaż odpowiedź
                  </Button>
                </div>
              )}

              {showAnswer && (
                <div className="grid gap-4 md:grid-cols-2">
                  <Button
                    onClick={() => {
                      grade(false)
                      toast({ description: 'Fiszkę dodano do powtórki 📌' })
                    }}
                    variant="outline"
                    size="lg"
                    className="h-14 rounded-2xl border-rose-300/60 text-rose-600 transition-colors hover:bg-rose-50 dark:border-rose-500/40 dark:text-rose-300 dark:hover:bg-rose-900/20"
                    leftIcon={<ArrowLeft className="h-4 w-4" aria-hidden />}
                  >
                    Potrzebuję powtórki
                  </Button>
                  <Button
                    onClick={() => {
                      grade(true)
                      toast({ description: 'Świetna robota! ✅' })
                    }}
                    size="lg"
                    className="h-14 rounded-2xl bg-gradient-to-r from-emerald-500 to-emerald-600 text-white shadow-soft hover:from-emerald-500 hover:to-emerald-500"
                    leftIcon={<Trophy className="h-4 w-4" aria-hidden />}
                  >
                    Zapamiętane!
                  </Button>
                </div>
              )}
            </div>

            <div className="mt-8 flex items-center justify-between border-t border-surface-border pt-6 dark:border-slate-800/60">
              <Button
                variant="ghost"
                disabled={page <= 1}
                onClick={() => setPage(p => Math.max(1, p - 1))}
                leftIcon={<ArrowLeft className="h-4 w-4" aria-hidden />}
              >
                Poprzednia karta
              </Button>
              <Button
                variant="ghost"
                disabled={page >= totalPages}
                onClick={() => setPage(p => Math.min(totalPages, p + 1))}
                rightIcon={<ArrowRight className="h-4 w-4" aria-hidden />}
              >
                Następna karta
              </Button>
            </div>
          </div>
        )}
      </motion.section>
    </div>
  )
}
