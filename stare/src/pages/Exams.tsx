import { useEffect, useMemo, useState } from 'react'
import { motion } from 'framer-motion'
import { listSubjects, listSessionsBySubject, getExamBank } from '@/lib/repo'
import { downloadText } from '@/lib/utils'
import { Button } from '@/components/ui/Button'
import { Input } from '@/components/ui/Input'
import {
  Sparkles,
  BookOpen,
  Layers,
  Shuffle,
  Gauge,
  Download,
  KeyRound,
  ClipboardCheck,
  Printer,
  ClipboardList,
  CircleCheck,
} from 'lucide-react'

const fadeIn = (delay = 0) => ({
  initial: { opacity: 0, y: 24 },
  whileInView: { opacity: 1, y: 0 },
  viewport: { once: true, margin: '-20%' },
  transition: { duration: 0.6, ease: 'easeOut' as const, delay },
})

export default function Exams() {
  const [count, setCount] = useState(5)
  const [seed, setSeed] = useState('')
  const [content, setContent] = useState('')
  const [keyContent, setKeyContent] = useState('')
  const [subjects, setSubjects] = useState<{ id: string; name: string }[]>([])
  const [subjectId, setSubjectId] = useState('')
  const [sessions, setSessions] = useState<{ id: string; title: string }[]>([])
  const [sessionId, setSessionId] = useState('')
  const [bank, setBank] = useState<any | null>(null)
  const [isGenerating, setIsGenerating] = useState(false)

  useEffect(() => {
    ;(async () => setSubjects(await listSubjects()))()
  }, [])

  useEffect(() => {
    ;(async () => {
      if (!subjectId) {
        setSessions([])
        setSessionId('')
        return
      }
      const subjectSessions = await listSessionsBySubject(subjectId)
      setSessions(subjectSessions.map(session => ({ id: session.id, title: session.title })))
    })()
  }, [subjectId])

  useEffect(() => {
    ;(async () => {
      if (!sessionId) {
        setBank(null)
        return
      }
      setBank(await getExamBank(sessionId))
    })()
  }, [sessionId])

  const questionStats = useMemo(() => {
    const mc = bank?.multipleChoice?.length ?? 0
    const tf = bank?.trueFalse?.length ?? 0
    const open = bank?.open?.length ?? 0
    return { mc, tf, open, total: mc + tf + open }
  }, [bank])

  const coverage = useMemo(() => {
    if (!questionStats.total) return 0
    return Math.min(100, Math.round((count / questionStats.total) * 100))
  }, [count, questionStats.total])

  function rng(seedStr: string) {
    let s = 0
    for (let i = 0; i < seedStr.length; i++) s = (s * 31 + seedStr.charCodeAt(i)) >>> 0
    return () => (s = (s * 1664525 + 1013904223) >>> 0) / 0xffffffff
  }

  function pick<T>(arr: T[], n: number, rnd: () => number): T[] {
    const a = [...arr]
    for (let i = a.length - 1; i > 0; i--) {
      const j = Math.floor(rnd() * (i + 1))
      ;[a[i], a[j]] = [a[j], a[i]]
    }
    return a.slice(0, Math.min(n, a.length))
  }

  async function generate() {
    if (!bank) {
      setContent('Brak banku pytań dla wybranej sesji.')
      setKeyContent('')
      return
    }
    setIsGenerating(true)

    await new Promise(resolve => setTimeout(resolve, 450))

    const s = seed || Math.random().toString(36).slice(2, 8)
    const rnd = rng(s)
    const mc = pick(bank.multipleChoice ?? [], Math.ceil(count * 0.5), rnd)
    const tf = pick(bank.trueFalse ?? [], Math.ceil(count * 0.3), rnd)
    const op = pick(bank.open ?? [], count - mc.length - tf.length, rnd)
    const lines: string[] = ['# Sprawdzian', '', `Seed: ${s}`, '']
    const keyLines: string[] = ['# Klucz odpowiedzi', '', `Seed: ${s}`, '']
    mc.forEach((q: any, idx: number) => {
      const opts = pick<string>(q.options as string[], (q.options as string[]).length, rnd)
      const correctLetterIdx = opts.indexOf((q.options as string[])[q.answer])
      const qNum = idx + 1
      lines.push(`${qNum}. ${q.q}`)
      opts.forEach((o: string, i: number) => {
        lines.push(`   ${String.fromCharCode(65 + i)}) ${o}`)
      })
      lines.push('')
      keyLines.push(`${qNum}. ${String.fromCharCode(65 + Math.max(0, correctLetterIdx))}`)
    })
    const offset = mc.length
    tf.forEach((q: any, idx: number) => {
      const n = offset + idx + 1
      lines.push(`${n}. [P/F] ${q.q}`)
      keyLines.push(`${n}. ${q.answer ? 'P' : 'F'}`)
    })
    op.forEach((q: any, idx: number) => {
      const n = offset + tf.length + idx + 1
      lines.push(`${n}. ${q.q}`)
      keyLines.push(`${n}. —`)
    })
    setContent(lines.join('\n'))
    setKeyContent(keyLines.join('\n'))
    setIsGenerating(false)
  }

  const canGenerate = Boolean(subjectId && sessionId && bank)

  return (
    <div className="space-y-12">
      <motion.section {...fadeIn(0)} className="grid gap-6 xl:grid-cols-[minmax(0,1.8fr)_minmax(0,1fr)]">
        <div className="relative overflow-hidden rounded-3xl border border-white/10 bg-gradient-to-br from-orange-500/70 via-rose-500/70 to-slate-900/80 p-8 text-white shadow-[0_32px_80px_rgba(249,115,22,0.35)]">
          <div className="absolute -left-20 -top-16 h-48 w-48 rounded-full bg-rose-400/30 blur-3xl" aria-hidden />
          <div className="absolute -right-16 -bottom-20 h-56 w-56 rounded-full bg-amber-400/20 blur-3xl" aria-hidden />

          <div className="relative z-10 flex flex-col gap-8">
            <div className="space-y-4">
              <span className="inline-flex items-center gap-2 rounded-full border border-surface-border bg-surface-muted px-4 py-1 text-xs font-semibold uppercase tracking-[0.35em] text-amber-100">
                StudyFlow Exams
              </span>
              <h1 className="text-4xl font-semibold leading-tight sm:text-5xl">
                Generuj sprawdziany, które rosną razem z Twoją bazą wiedzy.
              </h1>
              <p className="max-w-2xl text-sm text-amber-50/90 sm:text-base">
                Wybieraj wzorce pytań, miksuj pytania otwarte i zamknięte, a następnie eksportuj gotowy arkusz wraz z
                kluczem odpowiedzi.
              </p>
            </div>

            <div className="grid gap-4 sm:grid-cols-3">
              {[
                {
                  label: 'Pytania w banku',
                  value: questionStats.total,
                  icon: Layers,
                  hint: 'Wszystkie typy pytań z wybranej sesji.',
                },
                {
                  label: 'Mix trudności',
                  value: `${Math.round((questionStats.mc / Math.max(1, questionStats.total)) * 100)}%`,
                  icon: Shuffle,
                  hint: 'Udział pytań wielokrotnego wyboru w arkuszu.',
                },
                {
                  label: 'Pokrycie arkusza',
                  value: `${coverage}%`,
                  icon: Gauge,
                  hint: 'Szacowane pokrycie banku przy tej liczbie pytań.',
                },
              ].map(stat => (
                <div key={stat.label} className="rounded-3xl border border-surface-border bg-surface-muted p-4 backdrop-blur-xl">
                  <div className="flex items-center gap-3">
                    <span className="inline-flex h-10 w-10 items-center justify-center rounded-2xl bg-surface-muted text-white">
                      <stat.icon className="h-5 w-5" aria-hidden />
                    </span>
                    <div>
                      <p className="text-xs font-semibold uppercase tracking-wide text-amber-100/80">{stat.label}</p>
                      <p className="mt-1 text-2xl font-semibold">{stat.value}</p>
                    </div>
                  </div>
                  <p className="mt-3 text-xs text-amber-50/80">{stat.hint}</p>
                </div>
              ))}
            </div>

            <div className="flex flex-wrap items-center gap-3 text-xs sm:text-sm">
              <span className="inline-flex items-center gap-2 rounded-full border border-surface-border bg-surface-muted px-4 py-2 text-amber-100">
                <ClipboardList className="h-4 w-4" aria-hidden />
                Szybkie generowanie wariantów
              </span>
              <span className="inline-flex items-center gap-2 rounded-full border border-surface-border bg-surface-muted px-4 py-2 text-orange-100">
                <CircleCheck className="h-4 w-4" aria-hidden />
                Dedykowany klucz odpowiedzi
              </span>
              <span className="inline-flex items-center gap-2 rounded-full border border-surface-border bg-surface-muted px-4 py-2 text-rose-100">
                <Sparkles className="h-4 w-4" aria-hidden />
                Inteligentny dobór pytań
              </span>
            </div>
          </div>
        </div>

  <div className="rounded-3xl border border-surface-border bg-surface-card p-6 shadow-soft dark:border-slate-800/60 dark:bg-slate-900/70">
          <div className="flex items-start gap-3">
            <span className="inline-flex h-12 w-12 items-center justify-center rounded-2xl bg-brand-subtle text-brand-emphasis">
              <BookOpen className="h-5 w-5" aria-hidden />
            </span>
            <div className="space-y-3">
              <h2 className="text-base font-semibold text-slate-900 dark:text-white">Planer sesji</h2>
              <p className="text-sm text-slate-500 dark:text-slate-300">
                StudyFlow sugeruje przygotowanie alternatywnych wariantów przed ważnymi terminami. Wykorzystaj mix pytań,
                aby dopasować arkusz do poziomu grupy.
              </p>
              <ul className="grid gap-2 text-sm text-slate-600 dark:text-slate-300">
                <li className="flex items-center gap-2">
                  <Sparkles className="h-4 w-4 text-brand-emphasis" aria-hidden />
                  Generowanie ziarna (seed) wspiera porównywanie wyników.
                </li>
                <li className="flex items-center gap-2">
                  <Shuffle className="h-4 w-4 text-brand-emphasis" aria-hidden />
                  Rozkład pytań wielokrotnego wyboru i prawda/fałsz jest równoważony automatycznie.
                </li>
                <li className="flex items-center gap-2">
                  <ClipboardCheck className="h-4 w-4 text-brand-emphasis" aria-hidden />
                  Klucz odpowiedzi jest generowany równolegle z arkuszem.
                </li>
              </ul>
            </div>
          </div>
        </div>
      </motion.section>

  <motion.section {...fadeIn(0.05)} className="rounded-3xl border border-surface-border bg-surface-card p-6 shadow-soft dark:border-slate-800/60 dark:bg-slate-900/70">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h2 className="text-xl font-semibold text-slate-900 dark:text-white">Skonfiguruj generator</h2>
            <p className="text-sm text-slate-500 dark:text-slate-300">Dobierz przedmiot, sesję i liczbę pytań dla aktualnego arkusza.</p>
          </div>
          <span className="inline-flex items-center gap-2 rounded-full bg-brand-subtle px-4 py-2 text-xs font-semibold uppercase tracking-[0.25em] text-brand-emphasis">
            {sessions.length} sesje
          </span>
        </div>

        <div className="mt-6 grid gap-6 md:grid-cols-2">
          <div className="space-y-2">
            <label htmlFor="exam-subject" className="text-sm font-semibold text-slate-600 dark:text-slate-200">
              Przedmiot
            </label>
            <div className="relative">
              <select
                id="exam-subject"
                value={subjectId}
                onChange={event => setSubjectId(event.target.value)}
                className="h-12 w-full rounded-2xl border border-surface-border bg-surface-card px-4 text-sm font-medium text-slate-700 shadow-inner focus-visible:ring-brand dark:border-slate-700 dark:bg-slate-900/60 dark:text-slate-100"
              >
                <option value="">-- Wybierz przedmiot --</option>
                {subjects.map(subject => (
                  <option key={subject.id} value={subject.id}>
                    {subject.name}
                  </option>
                ))}
              </select>
            </div>
          </div>

          <div className="space-y-2">
            <label htmlFor="exam-session" className="text-sm font-semibold text-slate-600 dark:text-slate-200">
              Sesja / Temat
            </label>
            <div className="relative">
              <select
                id="exam-session"
                value={sessionId}
                onChange={event => setSessionId(event.target.value)}
                disabled={!subjectId}
                className="h-12 w-full rounded-2xl border border-surface-border bg-surface-card px-4 text-sm font-medium text-slate-700 shadow-inner transition-all focus-visible:ring-brand disabled:cursor-not-allowed disabled:opacity-50 dark:border-slate-700 dark:bg-slate-900/60 dark:text-slate-100"
              >
                <option value="">-- Wybierz sesję --</option>
                {sessions.map(session => (
                  <option key={session.id} value={session.id}>
                    {session.title}
                  </option>
                ))}
              </select>
            </div>
          </div>

          <div className="space-y-2">
            <label htmlFor="exam-count" className="text-sm font-semibold text-slate-600 dark:text-slate-200">
              Liczba pytań
            </label>
            <div className="relative">
              <Input
                id="exam-count"
                type="number"
                min={1}
                max={50}
                value={count}
                onChange={event => setCount(Number(event.target.value))}
                className="h-12 rounded-2xl bg-surface-panel text-sm font-semibold shadow-none focus-visible:ring-brand focus-visible:ring-offset-0 dark:bg-slate-900/70"
              />
            </div>
          </div>

          <div className="space-y-2">
            <label htmlFor="exam-seed" className="text-sm font-semibold text-slate-600 dark:text-slate-200">
              Seed (opcjonalnie)
            </label>
            <div className="relative">
              <Input
                id="exam-seed"
                value={seed}
                onChange={event => setSeed(event.target.value)}
                placeholder="np. abc123"
                className="h-12 rounded-2xl bg-surface-panel text-sm font-semibold shadow-none focus-visible:ring-brand focus-visible:ring-offset-0 dark:bg-slate-900/70"
              />
            </div>
            <p className="text-xs font-medium text-slate-500 dark:text-slate-400">Pozostaw puste, aby wygenerować losowy seed.</p>
          </div>
        </div>

        <div className="mt-6 flex flex-col items-center gap-4 text-center">
          <Button
            onClick={generate}
            disabled={!canGenerate}
            loading={isGenerating}
            size="lg"
            leftIcon={<Sparkles className="h-4 w-4" aria-hidden />}
            className="rounded-full px-8"
          >
            {isGenerating ? 'Generuję arkusz…' : 'Generuj sprawdzian'}
          </Button>

          {!canGenerate && (
            <p className="text-sm font-medium text-slate-500 dark:text-slate-400">
              Wybierz przedmiot i sesję, aby móc wygenerować sprawdzian.
            </p>
          )}
        </div>
      </motion.section>

      {content && (
        <motion.section {...fadeIn(0.1)} className="space-y-6">
          <div className="rounded-3xl border border-surface-border bg-surface-panel p-6 shadow-soft dark:border-slate-800/60 dark:bg-slate-900/70">
            <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
              <div className="flex items-center gap-3">
                <span className="inline-flex h-12 w-12 items-center justify-center rounded-2xl bg-brand-subtle text-brand-emphasis">
                  <ClipboardList className="h-5 w-5" aria-hidden />
                </span>
                <div>
                  <h3 className="text-lg font-semibold text-slate-900 dark:text-white">Gotowy arkusz</h3>
                  <p className="text-sm text-slate-500 dark:text-slate-300">Eksportuj, kopiuj lub wydrukuj swoją wersję sprawdzianu.</p>
                </div>
              </div>
              <div className="flex flex-wrap gap-2">
                <Button
                  onClick={() => downloadText(`exam_${sessionId || 'draft'}.md`, content)}
                  variant="outline"
                  leftIcon={<Download className="h-4 w-4" aria-hidden />}
                >
                  Pobierz .md
                </Button>
                {keyContent && (
                  <Button
                    onClick={() => downloadText(`exam_${sessionId || 'draft'}_key.md`, keyContent)}
                    variant="outline"
                    leftIcon={<KeyRound className="h-4 w-4" aria-hidden />}
                  >
                    Pobierz klucz
                  </Button>
                )}
                {keyContent && (
                  <Button
                    onClick={() => navigator.clipboard.writeText(keyContent)}
                    variant="outline"
                    leftIcon={<ClipboardCheck className="h-4 w-4" aria-hidden />}
                  >
                    Kopiuj klucz
                  </Button>
                )}
                <Button onClick={() => window.print()} variant="secondary" leftIcon={<Printer className="h-4 w-4" aria-hidden />}>
                  Drukuj / PDF
                </Button>
              </div>
            </div>
          </div>

          <div className="rounded-3xl border border-surface-border bg-surface-card p-6 shadow-soft dark:border-slate-800/60 dark:bg-slate-950/40">
            <h3 className="flex items-center gap-2 text-lg font-semibold text-slate-900 dark:text-white">
              <ClipboardList className="h-5 w-5 text-brand-emphasis" aria-hidden />
              Sprawdzian
            </h3>
            <div className="mt-4 rounded-2xl border border-slate-200 bg-slate-50 p-6 dark:border-slate-700 dark:bg-slate-900/60">
              <pre id="exam-content" className="whitespace-pre-wrap font-mono text-sm leading-relaxed text-slate-800 dark:text-slate-200">
                {content}
              </pre>
            </div>
          </div>

          {keyContent && (
            <div className="rounded-3xl border border-emerald-200/70 bg-emerald-50/80 p-6 shadow-soft dark:border-emerald-500/40 dark:bg-emerald-900/30">
              <h3 className="flex items-center gap-2 text-lg font-semibold text-emerald-700 dark:text-emerald-100">
                <KeyRound className="h-5 w-5" aria-hidden />
                Klucz odpowiedzi
              </h3>
              <div className="mt-4 rounded-2xl border border-emerald-200 bg-emerald-50 p-6 dark:border-emerald-700 dark:bg-emerald-900/40">
                <pre id="exam-key" className="whitespace-pre-wrap font-mono text-sm leading-relaxed text-emerald-900 dark:text-emerald-100">
                  {keyContent}
                </pre>
              </div>
            </div>
          )}
        </motion.section>
      )}
    </div>
  )
}
