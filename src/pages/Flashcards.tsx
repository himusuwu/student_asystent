import { useEffect, useMemo, useState } from 'react'
import { getFlashcard, listSubjects, saveFlashcard, listAllFlashcards } from '@/lib/repo'
import { gradeFromBool, review } from '@/lib/srs'
import { useToast } from '@/components/ui/Toast'
import { Button } from '@/components/ui/Button'
import { Card } from '@/components/ui/Card'

export default function Flashcards() {
  const [queue, setQueue] = useState<string[]>([])
  const [currentId, setCurrentId] = useState<string | null>(null)
  const [showAnswer, setShowAnswer] = useState(false)
  const [cardsMap, setCardsMap] = useState<Record<string, {question:string;answer:string}>>({})
  const [subjects, setSubjects] = useState<{id:string;name:string}[]>([])
  const [subjectFilter, setSubjectFilter] = useState('')
  const [page, setPage] = useState(1)
  const pageSize = 10
  const [scope, setScope] = useState<'overdue'|'all'|'new'>('overdue')
  const [dailyLimit, setDailyLimit] = useState(30)
  const [stats, setStats] = useState<{ new: number; overdue: number; done: number }>({ new: 0, overdue: 0, done: 0 })
  const [mounted, setMounted] = useState(false)
  const { push } = useToast()

  useEffect(() => { 
    setMounted(true)
    ;(async () => setSubjects(await listSubjects()))() 
  }, [])
  
  useEffect(() => { (async () => {
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
    const map: Record<string, {question:string;answer:string}> = {}
    for (const c of limited) map[c.id] = { question: c.question, answer: c.answer }
    setCardsMap(map)
    setCurrentId(ids[0] ?? null)
    setPage(1)
  })() }, [subjectFilter, scope, dailyLimit])

  const current = useMemo(() => currentId ? { id: currentId, ...cardsMap[currentId] } : null, [currentId, cardsMap])

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
    <section className={`space-y-8 ${mounted ? 'animate-fade-in' : ''}`}>
      {/* Header */}
      <div className="text-center pb-8">
        <h1 className="text-4xl font-bold mb-4 bg-gradient-to-r from-purple-600 to-pink-600 bg-clip-text text-transparent">
          🃏 Nauka z Fiszkami
        </h1>
        <p className="text-gray-600 dark:text-gray-300 max-w-2xl mx-auto">
          Używaj systemu powtarzania przestrzegiego, aby efektywnie zapamiętać materiał.
        </p>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {[
          { key: 'new', label: 'Nowe', value: stats.new, icon: '🆕', color: 'from-blue-500 to-blue-700', bgColor: 'from-blue-50 to-blue-100' },
          { key: 'overdue', label: 'Zaległe', value: stats.overdue, icon: '⏰', color: 'from-red-500 to-red-700', bgColor: 'from-red-50 to-red-100' },
          { key: 'done', label: 'Zaliczone', value: stats.done, icon: '✅', color: 'from-green-500 to-green-700', bgColor: 'from-green-50 to-green-100' }
        ].map((stat, index) => (
          <Card 
            key={stat.key} 
            variant="glass" 
            className={`text-center transform hover:scale-105 transition-all duration-300 ${mounted ? 'animate-slide-up' : ''}`}
            style={{ animationDelay: `${index * 100}ms` }}
          >
            <div className="text-4xl mb-3">{stat.icon}</div>
            <div className={`text-3xl font-bold bg-gradient-to-r ${stat.color} bg-clip-text text-transparent mb-2`}>
              {stat.value}
            </div>
            <div className="text-sm font-medium text-gray-600 dark:text-gray-300">
              {stat.label}
            </div>
          </Card>
        ))}
      </div>

      {/* Controls */}
      <Card variant="glass">
        <h2 className="text-xl font-bold mb-4 text-gray-800 dark:text-white flex items-center gap-2">
          <span className="text-2xl">⚙️</span>
          Ustawienia nauki
        </h2>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div>
            <label className="block text-sm font-semibold text-gray-700 dark:text-gray-300 mb-2">
              Przedmiot
            </label>
            <select 
              value={subjectFilter} 
              onChange={e => setSubjectFilter(e.target.value)}
              className="w-full px-4 py-2 rounded-lg border-2 border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 focus:border-purple-500 dark:focus:border-purple-400 transition-colors duration-300"
            >
              <option value="">Wszystkie przedmioty</option>
              {subjects.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
            </select>
          </div>
          
          <div>
            <label className="block text-sm font-semibold text-gray-700 dark:text-gray-300 mb-2">
              Zakres
            </label>
            <select 
              value={scope} 
              onChange={e => setScope(e.target.value as any)}
              className="w-full px-4 py-2 rounded-lg border-2 border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 focus:border-purple-500 dark:focus:border-purple-400 transition-colors duration-300"
            >
              <option value="overdue">Tylko zaległe</option>
              <option value="new">Tylko nowe</option>
              <option value="all">Wszystkie</option>
            </select>
          </div>
          
          <div>
            <label className="block text-sm font-semibold text-gray-700 dark:text-gray-300 mb-2">
              Dzienny limit ({dailyLimit})
            </label>
            <input 
              type="range" 
              min={1} 
              max={200} 
              value={dailyLimit} 
              onChange={e => setDailyLimit(Number(e.target.value))}
              className="w-full h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer dark:bg-gray-700 slider"
            />
          </div>
        </div>
        
        <div className="mt-4 text-center">
          <span className="inline-flex items-center gap-2 px-4 py-2 bg-gradient-to-r from-purple-100 to-pink-100 dark:from-purple-900/30 dark:to-pink-900/30 rounded-lg text-purple-700 dark:text-purple-300 font-medium">
            <span className="text-lg">📚</span>
            W kolejce: {total} fiszek
          </span>
        </div>
      </Card>

      {/* Current Flashcard */}
      {!current ? (
        <Card variant="glass" className="text-center py-12">
          <div className="text-6xl mb-4">🎉</div>
          <h3 className="text-2xl font-bold text-gray-800 dark:text-white mb-2">
            Brawo! Skończyłeś na dziś!
          </h3>
          <p className="text-gray-600 dark:text-gray-300 mb-6">
            Nie ma więcej fiszek do powtórki w wybranym zakresie.
          </p>
          <div className="flex flex-wrap justify-center gap-3">
            <Button onClick={() => setScope('all')} leftIcon="🔄">
              Sprawdź wszystkie
            </Button>
            <Button variant="outline" onClick={() => setDailyLimit(dl => dl + 20)} leftIcon="⬆️">
              Zwiększ limit
            </Button>
          </div>
        </Card>
      ) : (
        <Card variant="glass" className="max-w-3xl mx-auto">
          {/* Progress Bar */}
          <div className="mb-6">
            <div className="flex justify-between items-center mb-2">
              <span className="text-sm font-medium text-gray-600 dark:text-gray-400">
                Postęp: {currentIndex >= 0 ? currentIndex + 1 : 0} / {total}
              </span>
              <span className="text-sm font-medium text-gray-600 dark:text-gray-400">
                Strona: {page} / {totalPages}
              </span>
            </div>
            <div className="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-2">
              <div 
                className="bg-gradient-to-r from-purple-500 to-pink-500 h-2 rounded-full transition-all duration-500"
                style={{ width: `${total > 0 ? ((currentIndex + 1) / total) * 100 : 0}%` }}
              />
            </div>
          </div>

          {/* Question */}
          <div className="mb-8">
            <h3 className="text-lg font-semibold text-gray-700 dark:text-gray-300 mb-4 flex items-center gap-2">
              <span className="text-2xl">❓</span>
              Pytanie:
            </h3>
            <div className="p-6 bg-gradient-to-r from-blue-50 to-purple-50 dark:from-blue-900/20 dark:to-purple-900/20 rounded-xl border-l-4 border-blue-500">
              <p className="text-lg text-gray-800 dark:text-gray-200 leading-relaxed">
                {current.question}
              </p>
            </div>
          </div>

          {/* Answer Section */}
          {showAnswer ? (
            <div className="mb-8 animate-slide-down">
              <h3 className="text-lg font-semibold text-gray-700 dark:text-gray-300 mb-4 flex items-center gap-2">
                <span className="text-2xl">💡</span>
                Odpowiedź:
              </h3>
              <div className="p-6 bg-gradient-to-r from-green-50 to-teal-50 dark:from-green-900/20 dark:to-teal-900/20 rounded-xl border-l-4 border-green-500">
                <p className="text-lg text-gray-800 dark:text-gray-200 leading-relaxed">
                  {current.answer}
                </p>
              </div>
            </div>
          ) : (
            <div className="mb-8 text-center">
              <Button 
                onClick={() => setShowAnswer(true)}
                size="lg"
                leftIcon="👁️"
                className="transform hover:scale-105"
              >
                Pokaż odpowiedź
              </Button>
            </div>
          )}

          {/* Grading Buttons */}
          {showAnswer && (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6 animate-slide-up">
              <Button
                onClick={() => { grade(false); push('Do powtórki 📌') }}
                variant="outline"
                size="lg"
                leftIcon="❌"
                className="border-red-300 text-red-600 hover:bg-red-50 dark:border-red-700 dark:text-red-400 dark:hover:bg-red-900/20"
              >
                Nie umiem
              </Button>
              <Button
                onClick={() => { grade(true); push('Zaliczone ✅') }}
                size="lg"
                leftIcon="✅"
                className="bg-gradient-to-r from-green-500 to-emerald-600 hover:from-green-600 hover:to-emerald-700"
              >
                Umiem!
              </Button>
            </div>
          )}

          {/* Navigation */}
          <div className="flex justify-between items-center pt-4 border-t border-gray-200 dark:border-gray-700">
            <Button
              disabled={page <= 1}
              onClick={() => setPage(p => Math.max(1, p - 1))}
              variant="ghost"
              leftIcon="⬅️"
            >
              Poprzednia
            </Button>
            <Button
              disabled={page >= totalPages}
              onClick={() => setPage(p => Math.min(totalPages, p + 1))}
              variant="ghost"
              rightIcon="➡️"
            >
              Następna
            </Button>
          </div>
        </Card>
      )}
    </section>
  )
}
