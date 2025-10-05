import { useCallback, useEffect, useMemo, useState } from 'react'
import { listAllFlashcards, listSubjects } from '@/lib/repo'
import type { Flashcard, Subject } from '@/lib/types'
import { Button } from '@/components/ui/Button'
import { Card } from '@/components/ui/Card'
import { LoadingSpinner } from '@/components/ui/LoadingSpinner'
import { useToast } from '@/hooks/use-toast'

export default function FlashcardsNew() {
  const [flashcards, setFlashcards] = useState<Flashcard[]>([])
  const [subjects, setSubjects] = useState<Subject[]>([])
  const [selectedSubject, setSelectedSubject] = useState<string>('all')
  const [mode, setMode] = useState<'browse' | 'study'>('browse')
  const [currentIndex, setCurrentIndex] = useState(0)
  const [showAnswer, setShowAnswer] = useState(false)
  const [difficultIds, setDifficultIds] = useState<string[]>([])
  const [reviewMode, setReviewMode] = useState(false)
  const [studiedIds, setStudiedIds] = useState<Set<string>>(new Set())
  const [loading, setLoading] = useState(true)
  const { toast } = useToast()

  useEffect(() => {
    const initialize = async () => {
      try {
        setLoading(true)
        const [cards, subs] = await Promise.all([
          listAllFlashcards(),
          listSubjects()
        ])
        const sortedCards = cards
          .slice()
          .sort((a, b) => new Date(a.dueDate).getTime() - new Date(b.dueDate).getTime())

        setFlashcards(sortedCards)
        setSubjects(subs)
      } catch (error) {
        console.error('[Flashcards] Nie udało się pobrać danych', error)
        toast({
          variant: 'destructive',
          title: 'Nie udało się wczytać fiszek',
          description: 'Spróbuj ponownie później.',
        })
      } finally {
        setLoading(false)
      }
    }

    void initialize()
  }, [toast])

  useEffect(() => {
    setMode('browse')
    setCurrentIndex(0)
    setShowAnswer(false)
    setDifficultIds([])
    setReviewMode(false)
    setStudiedIds(new Set())
  }, [selectedSubject])

  const filteredCards = useMemo(() => {
    if (selectedSubject === 'all') return flashcards
    return flashcards.filter(card => card.subjectId === selectedSubject)
  }, [flashcards, selectedSubject])

  const subjectMap = useMemo(() => {
    return new Map(subjects.map(sub => [sub.id, sub.name]))
  }, [subjects])

  const cardStats = useMemo(() => {
    const now = Date.now()
    const due = filteredCards.filter(card => new Date(card.dueDate).getTime() <= now).length
    const newly = filteredCards.filter(card => card.repetition === 0).length
    const mastered = filteredCards.filter(card => card.repetition >= 5).length

    return {
      total: filteredCards.length,
      due,
      newly,
      mastered
    }
  }, [filteredCards])

  const difficultCards = useMemo(() => {
    if (difficultIds.length === 0) return []
    const map = new Map(filteredCards.map(card => [card.id, card]))
    return difficultIds
      .map(id => map.get(id))
      .filter((card): card is Flashcard => Boolean(card))
  }, [filteredCards, difficultIds])

  const activeCards = useMemo(() => {
    if (mode !== 'study') return []
    return reviewMode ? difficultCards : filteredCards
  }, [mode, reviewMode, difficultCards, filteredCards])

  const currentCard = mode === 'study' ? activeCards[currentIndex] : undefined
  const studiedCount = studiedIds.size
  const studyProgress = activeCards.length > 0
    ? Math.round(((currentIndex + (showAnswer ? 0.5 : 0)) / activeCards.length) * 100)
    : 0
  const difficultRemaining = reviewMode ? activeCards.length : difficultIds.length

  const startStudyAt = useCallback((index: number) => {
    if (filteredCards.length === 0) {
  toast({ description: 'Brak fiszek w wybranym zakresie.' })
      return
    }

    setMode('study')
    setReviewMode(false)
    setCurrentIndex(index)
    setShowAnswer(false)
    setDifficultIds([])
    setStudiedIds(new Set())
    toast({ description: index === 0 ? 'Rozpoczynamy sesję nauki! 🚀' : `Skupmy się na fiszce #${index + 1}` })
  }, [filteredCards.length, toast])

  const beginStudy = useCallback(() => startStudyAt(0), [startStudyAt])

  const goBackToBrowse = useCallback(() => {
    setMode('browse')
    setCurrentIndex(0)
    setShowAnswer(false)
    setReviewMode(false)
    setStudiedIds(new Set())
  }, [])

  const finishSession = useCallback((message: string = '🎉 Gratulacje! Opanowałeś wszystkie fiszki w tym zestawie.') => {
    setMode('browse')
    setCurrentIndex(0)
    setShowAnswer(false)
    setReviewMode(false)
    setStudiedIds(new Set())
    setDifficultIds([])
    toast({ description: message })
  }, [toast])

  const startReview = useCallback(() => {
    setReviewMode(true)
    setCurrentIndex(0)
    setShowAnswer(false)
    toast({ description: `🔁 Czas na powtórkę najtrudniejszych fiszek (x${difficultIds.length}).` })
  }, [difficultIds.length, toast])

  const goToNextCard = useCallback(() => {
    if (activeCards.length === 0) {
      finishSession()
      return
    }

    if (currentIndex < activeCards.length - 1) {
      setCurrentIndex(index => index + 1)
      setShowAnswer(false)
      return
    }

    if (!reviewMode && difficultIds.length > 0) {
      startReview()
      return
    }

    finishSession(reviewMode ? '🔥 Świetnie! Powtórka trudnych fiszek zakończona sukcesem.' : undefined)
  }, [activeCards.length, currentIndex, reviewMode, difficultIds.length, startReview, finishSession])

  const goToPreviousCard = useCallback(() => {
    if (currentIndex === 0) return
    setCurrentIndex(index => Math.max(0, index - 1))
    setShowAnswer(false)
  }, [currentIndex])

  const markAsKnown = useCallback(() => {
    if (!currentCard) return

    setStudiedIds(prev => {
      const next = new Set(prev)
      next.add(currentCard.id)
      return next
    })

    if (reviewMode) {
      setDifficultIds(prev => prev.filter(id => id !== currentCard.id))
    }

    toast({ description: 'Zaliczone ✅' })
    goToNextCard()
  }, [currentCard, reviewMode, goToNextCard, toast])

  const markAsUnknown = useCallback(() => {
    if (!currentCard) return

    setStudiedIds(prev => {
      const next = new Set(prev)
      next.add(currentCard.id)
      return next
    })

    setDifficultIds(prev => (prev.includes(currentCard.id) ? prev : [...prev, currentCard.id]))

    toast({ description: 'Dodano do powtórki 📌' })
    goToNextCard()
  }, [currentCard, goToNextCard, toast])

  useEffect(() => {
    if (mode !== 'study' || !currentCard) return

    const handleKeyPress = (e: KeyboardEvent) => {
      if (e.key === 'ArrowRight') {
        e.preventDefault()
        if (showAnswer) {
          markAsKnown()
        } else {
          setShowAnswer(true)
        }
      } else if (e.key === 'ArrowLeft') {
        e.preventDefault()
        if (showAnswer) {
          markAsUnknown()
        } else {
          goToPreviousCard()
        }
      } else if (e.key === 'Enter' || e.key === ' ') {
        e.preventDefault()
        setShowAnswer(prev => !prev)
      } else if (e.key === '1' && showAnswer) {
        e.preventDefault()
        markAsUnknown()
      } else if (e.key === '2' && showAnswer) {
        e.preventDefault()
        markAsKnown()
      }
    }

    window.addEventListener('keydown', handleKeyPress)
    return () => window.removeEventListener('keydown', handleKeyPress)
  }, [mode, currentCard?.id, showAnswer, markAsKnown, markAsUnknown, goToPreviousCard])

  if (mode === 'browse') {
    const summary = [
      {
        label: 'Wszystkie fiszki',
        value: cardStats.total,
        icon: '📚',
        description: `${cardStats.due} do powtórki` || '—'
      },
      {
        label: 'Nowe',
        value: cardStats.newly,
        icon: '🆕',
        description: 'Jeszcze nie powtarzane'
      },
      {
        label: 'Do powtórki dziś',
        value: cardStats.due,
        icon: '⏰',
        description: 'Termin upłynął lub dziś'
      },
      {
        label: 'Utrwalone',
        value: cardStats.mastered,
        icon: '🏆',
        description: 'Powtórzone ≥ 5 razy'
      }
    ]

    return (
      <section className="relative py-12 px-4">
        <div className="pointer-events-none absolute inset-0 bg-gradient-to-br from-blue-200/20 via-purple-200/10 to-transparent dark:from-slate-900/60 dark:via-slate-900/40" />
        <div className="relative z-10 mx-auto max-w-6xl space-y-12">
          <div className="text-center space-y-4">
            <h1 className="text-4xl sm:text-5xl font-bold bg-gradient-to-r from-blue-600 via-purple-600 to-pink-500 bg-clip-text text-transparent">
              🃏 Centrum Fiszek
            </h1>
            <p className="text-gray-600 dark:text-gray-300 max-w-3xl mx-auto text-lg">
              Zarządzaj wszystkimi fiszkami w jednym miejscu. Filtruj po przedmiotach, planuj powtórki i wchodź do trybu nauki jednym kliknięciem.
            </p>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            {summary.map((item, index) => (
              <Card
                key={item.label}
                className="glass-surface glass-hover relative overflow-hidden rounded-3xl border border-surface-border p-6 shadow-soft dark:border-slate-800/60 dark:bg-slate-900/70"
                style={{ animationDelay: `${index * 80}ms` }}
              >
                <div className="flex items-center gap-4">
                  <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-gradient-to-br from-blue-500 to-purple-600 text-white text-xl shadow-lg">
                    {item.icon}
                  </div>
                  <div>
                    <p className="text-sm font-medium text-gray-500 dark:text-gray-400">{item.label}</p>
                    <div className="text-2xl font-bold text-gray-800 dark:text-white">{item.value}</div>
                    <p className="text-xs text-gray-500 dark:text-gray-400">{item.description}</p>
                  </div>
                </div>
              </Card>
            ))}
          </div>

          <div className="flex flex-wrap items-center justify-between gap-4 rounded-3xl border border-blue-100/60 bg-surface-panel p-4 dark:border-blue-900/40 dark:bg-slate-900/70">
            <div className="space-y-1">
              <p className="text-xs font-semibold uppercase tracking-wide text-blue-600 dark:text-blue-300">
                Filtruj przedmiot
              </p>
              <select
                value={selectedSubject}
                onChange={e => setSelectedSubject(e.target.value)}
                className="w-64 max-w-full rounded-xl border border-blue-200/60 bg-surface-card px-4 py-2 text-sm font-medium text-gray-700 shadow-sm transition focus:border-blue-500 focus:outline-none dark:border-blue-900/40 dark:bg-slate-950/60 dark:text-gray-200"
              >
                <option value="all">Wszystkie ({flashcards.length})</option>
                {subjects.map(subject => (
                  <option key={subject.id} value={subject.id}>
                    {subject.name} ({flashcards.filter(card => card.subjectId === subject.id).length})
                  </option>
                ))}
              </select>
            </div>
            <div className="flex items-center gap-3">
              <div className="hidden text-sm text-gray-600 sm:block dark:text-gray-300">
                {cardStats.due > 0 ? `${cardStats.due} fiszek czeka na dzisiejszą powtórkę.` : 'Brak zaległych fiszek – brawo!'}
              </div>
              <Button onClick={beginStudy} size="lg" className="px-6 py-3 text-base font-semibold">
                🎯 Rozpocznij naukę
              </Button>
            </div>
          </div>

          {loading ? (
            <Card className="glass-surface flex items-center justify-center rounded-3xl border border-surface-border py-20 shadow-soft dark:border-slate-800/60 dark:bg-slate-900/70">
              <div className="flex flex-col items-center gap-3 text-gray-500 dark:text-gray-300">
                <LoadingSpinner />
                <span className="text-sm">Ładuję fiszki…</span>
              </div>
            </Card>
          ) : filteredCards.length === 0 ? (
            <Card className="glass-surface text-center rounded-3xl border border-surface-border py-24 space-y-4 shadow-soft dark:border-slate-800/60 dark:bg-slate-900/70">
              <div className="text-6xl">📚</div>
              <h3 className="text-2xl font-semibold text-gray-800 dark:text-white">Brak fiszek w tym zakresie</h3>
              <p className="text-gray-600 dark:text-gray-300 max-w-xl mx-auto">
                Dodaj nowy wykład i wygeneruj fiszki w zakładce „Nowy wykład”, aby zacząć naukę.
              </p>
            </Card>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
              {filteredCards.map((card, index) => {
                const dueDate = new Date(card.dueDate)
                const isNew = card.repetition === 0
                const isOverdue = dueDate.getTime() <= Date.now()
                const statusLabel = isNew ? 'Nowa fiszka' : isOverdue ? 'Do powtórki' : 'Zaplanowana'
                const statusClass = isNew
                  ? 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/40 dark:text-emerald-300'
                  : isOverdue
                    ? 'bg-rose-100 text-rose-700 dark:bg-rose-900/40 dark:text-rose-300'
                    : 'bg-blue-100 text-blue-700 dark:bg-blue-900/40 dark:text-blue-200'
                const subjectName = subjectMap.get(card.subjectId) || 'Brak przypisania'

                return (
                  <Card
                    key={card.id || index}
                    className="glass-surface glass-hover flex h-full cursor-pointer flex-col gap-4 rounded-3xl border border-surface-border p-6 shadow-soft transition-all duration-300 hover:-translate-y-1 dark:border-slate-800/60 dark:bg-slate-900/70"
                    onClick={() => startStudyAt(index)}
                  >
                    <div className="flex items-start justify-between gap-3">
                      <span className="rounded-xl bg-gradient-to-br from-blue-500/15 to-purple-500/15 px-3 py-1 text-xs font-semibold text-blue-600 dark:text-blue-300">
                        #{index + 1}
                      </span>
                      <span className={`rounded-full px-3 py-1 text-xs font-semibold ${statusClass}`}>
                        {statusLabel}
                      </span>
                    </div>

                    <h3 className="text-lg font-semibold text-gray-800 dark:text-white leading-snug line-clamp-3">
                      {card.question}
                    </h3>

                    <p className="text-sm text-gray-600 dark:text-gray-300 max-h-24 overflow-hidden leading-relaxed">
                      {card.answer}
                    </p>

                    <div className="mt-auto flex flex-wrap items-center justify-between gap-3 text-xs text-gray-500 dark:text-gray-400">
                      <span className="inline-flex items-center gap-1">
                        <span>📘</span>
                        {subjectName}
                      </span>
                      <span className="inline-flex items-center gap-1">
                        <span>🗓️</span>
                        {dueDate.toLocaleDateString('pl-PL', { day: '2-digit', month: 'short' })}
                      </span>
                      {card.tags && card.tags.length > 0 && (
                        <span className="inline-flex items-center gap-1">
                          <span>🏷️</span>
                          {card.tags[0]}
                        </span>
                      )}
                    </div>
                  </Card>
                )
              })}
            </div>
          )}
        </div>
      </section>
    )
  }

  return (
    <section className="relative py-12 px-4">
      <div className="pointer-events-none absolute inset-0 bg-gradient-to-br from-purple-200/20 via-blue-200/10 to-transparent dark:from-slate-900/70 dark:via-slate-900/40" />
      <div className="relative z-10 mx-auto max-w-5xl space-y-8">
        <div className="flex flex-wrap items-center justify-between gap-4">
          <button
            onClick={goBackToBrowse}
            className="inline-flex items-center gap-2 text-sm font-semibold text-blue-600 transition hover:text-blue-700 dark:text-blue-300 dark:hover:text-blue-200"
          >
            ← Powrót do listy
          </button>
          <div className="flex items-center gap-3 rounded-2xl border border-blue-200/60 bg-surface-card px-4 py-2 text-sm font-medium text-gray-600 shadow-sm dark:border-blue-900/50 dark:bg-slate-900/80 dark:text-gray-300">
            {reviewMode ? '🔁 Powtórka trudnych fiszek' : '📚 Tryb nauki'}
            <span className="rounded-xl bg-gradient-to-r from-blue-500 to-purple-600 px-3 py-1 text-xs font-semibold text-white">
              {activeCards.length > 0 ? `${currentIndex + 1}/${activeCards.length}` : '0/0'}
            </span>
          </div>
        </div>

  <Card className="glass-surface glass-hover rounded-3xl border border-surface-border p-8 shadow-soft dark:border-slate-800/60 dark:bg-slate-900/70 space-y-8">
          <div className="flex flex-wrap items-center justify-between gap-4">
            <div>
              <h2 className="text-xl font-semibold text-gray-800 dark:text-white">
                {reviewMode ? 'Powtórka najtrudniejszych zagadnień' : 'Skup się na jednej fiszce naraz'}
              </h2>
              <p className="text-sm text-gray-500 dark:text-gray-400">
                Odsłoń odpowiedź, oceń ją i przejdź dalej. Wykorzystaj skróty klawiaturowe (Enter, 1, 2, ←, →).
              </p>
            </div>
            <div className="flex items-center gap-3">
              <div className="text-right">
                <span className="block text-xs font-semibold uppercase text-gray-500 dark:text-gray-400">Postęp</span>
                <span className="text-lg font-bold text-gray-800 dark:text-white">{Math.min(100, studyProgress)}%</span>
              </div>
              <div className="h-2 w-32 overflow-hidden rounded-full bg-gray-200 dark:bg-slate-800">
                <div
                  className="h-full rounded-full bg-gradient-to-r from-blue-500 to-purple-600 transition-all duration-500"
                  style={{ width: `${Math.min(100, studyProgress)}%` }}
                />
              </div>
            </div>
          </div>

          {currentCard ? (
            <div className="space-y-6">
              <div className="rounded-3xl border border-blue-100/70 bg-gradient-to-br from-white to-blue-50/60 p-6 shadow-inner dark:border-blue-900/40 dark:from-slate-950/40 dark:to-slate-900/40">
                <div className="flex items-center gap-3 text-sm font-semibold text-blue-600 dark:text-blue-300">
                  <span className="text-xl">❓</span>
                  Pytanie
                </div>
                <p className="mt-3 text-2xl font-semibold leading-relaxed text-gray-900 dark:text-gray-100">
                  {currentCard.question}
                </p>
              </div>

              <div className="rounded-3xl border border-emerald-100/70 bg-surface-card p-6 shadow-inner dark:border-emerald-900/40 dark:bg-slate-950/40">
                <div className="flex items-center justify-between gap-3">
                  <div className="flex items-center gap-3 text-sm font-semibold text-emerald-600 dark:text-emerald-300">
                    <span className="text-xl">💡</span>
                    Odpowiedź
                  </div>
                  {!showAnswer && (
                    <Button onClick={() => setShowAnswer(true)} variant="secondary" className="text-sm font-semibold">
                      Pokaż odpowiedź
                    </Button>
                  )}
                </div>
                {showAnswer ? (
                  <p className="mt-4 text-lg leading-relaxed text-gray-800 dark:text-gray-200 whitespace-pre-line">
                    {currentCard.answer}
                  </p>
                ) : (
                  <div className="mt-6 flex items-center justify-center text-sm text-gray-500 dark:text-gray-400">
                    👆 Kliknij „Pokaż odpowiedź” lub naciśnij Enter
                  </div>
                )}
              </div>

              {currentCard.tags && currentCard.tags.length > 0 && (
                <div className="flex flex-wrap gap-2">
                  {currentCard.tags.map((tag, index) => (
                    <span
                      key={`${currentCard.id}-tag-${index}`}
                      className="rounded-full bg-purple-100 px-3 py-1 text-xs font-semibold text-purple-700 dark:bg-purple-900/40 dark:text-purple-200"
                    >
                      #{tag}
                    </span>
                  ))}
                </div>
              )}

              <div className="flex flex-wrap items-center justify-between gap-4 rounded-3xl border border-gray-100/70 bg-surface-card px-5 py-4 text-sm text-gray-600 dark:border-gray-800/60 dark:bg-slate-900/60 dark:text-gray-300">
                <div className="flex flex-wrap items-center gap-4">
                  <span className="inline-flex items-center gap-2">
                    <span>📊</span>
                    Powtórzono: {studiedCount}/{activeCards.length}
                  </span>
                  <span className="inline-flex items-center gap-2">
                    <span>🔥</span>
                    Trudne fiszki: {difficultRemaining}
                  </span>
                  <span className="inline-flex items-center gap-2">
                    <span>🗓️</span>
                    Termin: {new Date(currentCard.dueDate).toLocaleDateString('pl-PL', { day: '2-digit', month: 'long' })}
                  </span>
                </div>
                <div className="flex flex-wrap items-center gap-3">
                  <Button
                    variant="ghost"
                    onClick={goToPreviousCard}
                    disabled={currentIndex === 0}
                    className="text-sm font-semibold"
                  >
                    ← Poprzednia
                  </Button>
                  {showAnswer ? (
                    <>
                      <Button
                        variant="outline"
                        onClick={markAsUnknown}
                        className="border-red-300 text-red-600 hover:bg-red-50 dark:border-red-700 dark:text-red-300 dark:hover:bg-red-900/30"
                      >
                        ❌ Nie pamiętam
                      </Button>
                      <Button onClick={markAsKnown} className="bg-gradient-to-r from-emerald-500 to-emerald-600">
                        ✅ Znam!
                      </Button>
                    </>
                  ) : (
                    <Button onClick={() => setShowAnswer(true)} leftIcon="👁️" className="bg-gradient-to-r from-blue-500 to-purple-600">
                      Odsłoń odpowiedź
                    </Button>
                  )}
                  <Button
                    variant="ghost"
                    onClick={goToNextCard}
                    disabled={activeCards.length === 0}
                    className="text-sm font-semibold"
                  >
                    Następna →
                  </Button>
                </div>
              </div>
            </div>
          ) : (
            <div className="py-24 text-center text-gray-600 dark:text-gray-300">
              Brak fiszek do nauki w tym zestawie.
            </div>
          )}

          <div className="rounded-3xl border border-gray-100/60 bg-surface-panel px-6 py-5 text-xs text-gray-500 dark:border-gray-800/60 dark:bg-slate-900/60 dark:text-gray-400">
            <div className="font-semibold uppercase tracking-wide mb-2">Skróty klawiaturowe</div>
            <div className="flex flex-wrap gap-4">
              <span>Enter / Spacja – pokaż lub schowaj odpowiedź</span>
              <span>1 – oznacz jako „Nie pamiętam”</span>
              <span>2 – oznacz jako „Znam”</span>
              <span>← → – poprzednia / następna fiszka</span>
            </div>
          </div>
        </Card>
      </div>
    </section>
  )
}
