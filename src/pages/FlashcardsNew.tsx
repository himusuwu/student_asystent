import { useEffect, useState } from 'react'
import { listAllFlashcards, listSubjects } from '@/lib/repo'
import type { Flashcard, Subject } from '@/lib/types'
import { Card } from '@/components/ui/Card'
import { Button } from '@/components/ui/Button'

export default function FlashcardsNew() {
  const [flashcards, setFlashcards] = useState<Flashcard[]>([])
  const [subjects, setSubjects] = useState<Subject[]>([])
  const [selectedSubject, setSelectedSubject] = useState<string>('all')
  const [currentIndex, setCurrentIndex] = useState(0)
  const [isFlipped, setIsFlipped] = useState(false)
  const [studyMode, setStudyMode] = useState<'browse' | 'study'>('browse')
  const [difficultCards, setDifficultCards] = useState<number[]>([]) // Indeksy trudnych kart
  const [studiedCards, setStudiedCards] = useState<Set<number>>(new Set()) // Przejrzane karty
  const [isReviewMode, setIsReviewMode] = useState(false) // Tryb powtórki trudnych

  useEffect(() => {
    loadData()
  }, [])

  async function loadData() {
    const [cards, subs] = await Promise.all([
      listAllFlashcards(),
      listSubjects()
    ])
    setFlashcards(cards)
    setSubjects(subs)
  }

  const filteredCards = selectedSubject === 'all' 
    ? flashcards 
    : flashcards.filter(fc => fc.subjectId === selectedSubject)

  // W trybie powtórki używamy tylko trudnych kart
  const activeCards = isReviewMode 
    ? difficultCards.map(idx => filteredCards[idx]).filter(Boolean)
    : filteredCards

  const currentCard = activeCards[currentIndex]

  function markAsKnown() {
    studiedCards.add(currentIndex)
    setStudiedCards(new Set(studiedCards))
    nextCard()
  }

  function markAsUnknown() {
    if (!difficultCards.includes(currentIndex)) {
      setDifficultCards([...difficultCards, currentIndex])
    }
    studiedCards.add(currentIndex)
    setStudiedCards(new Set(studiedCards))
    nextCard()
  }

  function nextCard() {
    setIsFlipped(false)
    setTimeout(() => {
      const nextIdx = currentIndex + 1
      
      // Jeśli to ostatnia karta z setu
      if (nextIdx >= activeCards.length) {
        // Jeśli jesteśmy w powtórce, kończymy
        if (isReviewMode) {
          alert(`🎉 Ukończono powtórkę! Przejrzano ${difficultCards.length} trudnych fiszek.`)
          setIsReviewMode(false)
          setCurrentIndex(0)
          setDifficultCards([])
          setStudiedCards(new Set())
          setStudyMode('browse')
          return
        }
        
        // Jeśli są trudne karty, zaproponuj powtórkę
        if (difficultCards.length > 0) {
          const doReview = confirm(`✅ Ukończono wszystkie fiszki!\n\n❌ Masz ${difficultCards.length} fiszek oznaczonych jako "Nie umiem".\n\nChcesz je teraz powtórzyć?`)
          if (doReview) {
            setIsReviewMode(true)
            setCurrentIndex(0)
            setIsFlipped(false)
          } else {
            setStudyMode('browse')
            setCurrentIndex(0)
            setDifficultCards([])
            setStudiedCards(new Set())
          }
        } else {
          alert('🎉 Gratulacje! Znasz wszystkie fiszki!')
          setStudyMode('browse')
          setCurrentIndex(0)
          setStudiedCards(new Set())
        }
      } else {
        setCurrentIndex(nextIdx)
      }
    }, 150)
  }

  function prevCard() {
    setIsFlipped(false)
    setTimeout(() => {
      setCurrentIndex((prev) => (prev - 1 + filteredCards.length) % filteredCards.length)
    }, 150)
  }

  function handleKeyPress(e: KeyboardEvent) {
    if (e.key === 'ArrowRight') {
      e.preventDefault()
      nextCard()
    } else if (e.key === 'ArrowLeft') {
      e.preventDefault()
      if (currentIndex > 0) prevCard()
    } else if (e.key === 'Enter' || e.key === ' ') {
      e.preventDefault()
      setIsFlipped(!isFlipped)
    } else if (e.key === '1' && isFlipped) {
      e.preventDefault()
      markAsUnknown()
    } else if (e.key === '2' && isFlipped) {
      e.preventDefault()
      markAsKnown()
    }
  }

  useEffect(() => {
    if (studyMode === 'study') {
      window.addEventListener('keydown', handleKeyPress)
      return () => window.removeEventListener('keydown', handleKeyPress)
    }
  }, [isFlipped, currentIndex, activeCards.length, studyMode])

  if (studyMode === 'browse') {
    return (
      <section className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-purple-50 dark:from-gray-900 dark:via-gray-800 dark:to-gray-900 py-12 px-4">
        <div className="max-w-6xl mx-auto">
          {/* Header */}
          <div className="text-center mb-12">
            <h1 className="text-5xl font-bold mb-4 bg-gradient-to-r from-blue-600 to-purple-600 bg-clip-text text-transparent">
              🃏 Fiszki
            </h1>
            <p className="text-gray-600 dark:text-gray-300 text-lg">
              {filteredCards.length} {filteredCards.length === 1 ? 'fiszka' : 'fiszek'} do nauki
            </p>
          </div>

          {/* Filters */}
          <div className="flex justify-center gap-4 mb-8 flex-wrap">
            <button
              onClick={() => setSelectedSubject('all')}
              className={`px-6 py-3 rounded-xl font-semibold transition-all ${
                selectedSubject === 'all'
                  ? 'bg-blue-600 text-white shadow-lg scale-105'
                  : 'bg-white dark:bg-gray-800 text-gray-700 dark:text-gray-300 hover:shadow-md'
              }`}
            >
              Wszystkie ({flashcards.length})
            </button>
            {subjects.map(sub => (
              <button
                key={sub.id}
                onClick={() => setSelectedSubject(sub.id)}
                className={`px-6 py-3 rounded-xl font-semibold transition-all ${
                  selectedSubject === sub.id
                    ? 'bg-purple-600 text-white shadow-lg scale-105'
                    : 'bg-white dark:bg-gray-800 text-gray-700 dark:text-gray-300 hover:shadow-md'
                }`}
              >
                {sub.name} ({flashcards.filter(fc => fc.subjectId === sub.id).length})
              </button>
            ))}
          </div>

          {/* Cards Grid */}
          {filteredCards.length === 0 ? (
            <Card className="text-center py-24">
              <div className="text-6xl mb-4">📚</div>
              <h3 className="text-2xl font-bold text-gray-800 dark:text-white mb-4">
                Brak fiszek
              </h3>
              <p className="text-gray-600 dark:text-gray-300">
                Stwórz wykład i wygeneruj fiszki w zakładce "🃏 Fiszki"
              </p>
            </Card>
          ) : (
            <>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 mb-8">
                {filteredCards.map((card, idx) => (
                  <Card 
                    key={card.id || idx} 
                    className="p-6 hover:shadow-2xl transition-all duration-300 cursor-pointer hover:scale-105"
                    onClick={() => {
                      setCurrentIndex(idx)
                      setStudyMode('study')
                    }}
                  >
                    <div className="flex items-start justify-between mb-3">
                      <span className="text-xs font-bold text-blue-600 dark:text-blue-400 bg-blue-100 dark:bg-blue-900/30 px-3 py-1 rounded-full">
                        #{idx + 1}
                      </span>
                      {card.tags && card.tags.length > 0 && (
                        <span className="text-xs text-gray-500 dark:text-gray-400">
                          {card.tags[0]}
                        </span>
                      )}
                    </div>
                    <div className="font-semibold text-gray-800 dark:text-white mb-3 line-clamp-3">
                      {card.question}
                    </div>
                    <div className="text-sm text-gray-500 dark:text-gray-400 line-clamp-2">
                      {card.answer}
                    </div>
                  </Card>
                ))}
              </div>

              {/* Study Mode Button */}
              <div className="text-center">
                <Button
                  onClick={() => {
                    setCurrentIndex(0)
                    setIsFlipped(false)
                    setDifficultCards([])
                    setStudiedCards(new Set())
                    setIsReviewMode(false)
                    setStudyMode('study')
                  }}
                  className="px-8 py-4 text-lg font-bold bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700 shadow-xl"
                >
                  🎯 Rozpocznij naukę
                </Button>
              </div>
            </>
          )}
        </div>
      </section>
    )
  }

  // Study Mode
  return (
    <section className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-purple-50 dark:from-gray-900 dark:via-gray-800 dark:to-gray-900 py-12 px-4">
      <div className="max-w-4xl mx-auto">
        {/* Header */}
        <div className="flex items-center justify-between mb-8">
          <button
            onClick={() => {
              setStudyMode('browse')
              setCurrentIndex(0)
              setDifficultCards([])
              setStudiedCards(new Set())
              setIsReviewMode(false)
            }}
            className="flex items-center gap-2 text-gray-600 dark:text-gray-300 hover:text-blue-600 dark:hover:text-blue-400 font-semibold transition-colors"
          >
            ← Powrót do listy
          </button>
          <div className="text-center">
            <div className="text-sm text-gray-500 dark:text-gray-400 mb-1">
              {isReviewMode ? '🔁 POWTÓRKA' : '📚 NAUKA'} - Fiszka {currentIndex + 1} / {activeCards.length}
              {difficultCards.length > 0 && !isReviewMode && (
                <span className="ml-2 text-red-600 dark:text-red-400">
                  (❌ {difficultCards.length} trudnych)
                </span>
              )}
            </div>
            <div className="w-64 h-2 bg-gray-200 dark:bg-gray-700 rounded-full overflow-hidden">
              <div 
                className="h-full bg-gradient-to-r from-blue-600 to-purple-600 transition-all duration-300"
                style={{ width: `${((currentIndex + 1) / activeCards.length) * 100}%` }}
              />
            </div>
          </div>
          <div className="w-24" />
        </div>

        {/* Flashcard */}
        {currentCard && (
          <div className="mb-8">
            <div 
              className="relative w-full h-96 cursor-pointer perspective-1000"
              onClick={() => setIsFlipped(!isFlipped)}
            >
              <div 
                className={`absolute w-full h-full transition-all duration-500 transform-style-3d ${
                  isFlipped ? 'rotate-y-180' : ''
                }`}
              >
                {/* Front */}
                <div className={`absolute w-full h-full backface-hidden ${isFlipped ? 'pointer-events-none' : ''}`}>
                  <Card className="w-full h-full p-12 flex flex-col items-center justify-center bg-gradient-to-br from-blue-500 to-purple-600 text-white shadow-2xl">
                    <div className="text-sm font-semibold mb-4 opacity-90">PYTANIE</div>
                    <div className="text-3xl font-bold text-center leading-relaxed">
                      {currentCard.question}
                    </div>
                    <div className="absolute bottom-6 text-sm opacity-75">
                      👆 Kliknij aby obrócić
                    </div>
                  </Card>
                </div>

                {/* Back */}
                <div className={`absolute w-full h-full backface-hidden rotate-y-180 ${!isFlipped ? 'pointer-events-none' : ''}`}>
                  <Card className="w-full h-full p-12 flex flex-col items-center justify-center bg-gradient-to-br from-green-500 to-teal-600 text-white shadow-2xl">
                    <div className="text-sm font-semibold mb-4 opacity-90">ODPOWIEDŹ</div>
                    <div className="text-2xl font-bold text-center leading-relaxed max-h-80 overflow-y-auto">
                      {currentCard.answer}
                    </div>
                    {currentCard.tags && currentCard.tags.length > 0 && (
                      <div className="absolute bottom-6 flex gap-2">
                        {currentCard.tags.map((tag, i) => (
                          <span key={i} className="text-xs bg-white/20 px-3 py-1 rounded-full">
                            {tag}
                          </span>
                        ))}
                      </div>
                    )}
                  </Card>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Controls */}
        <div className="flex flex-col items-center gap-6">
          {/* Główne przyciski - pokazuj tylko jeśli karta obrócona */}
          {isFlipped && (
            <div className="flex items-center justify-center gap-6">
              <Button
                onClick={markAsUnknown}
                className="px-12 py-6 text-xl font-bold bg-gradient-to-r from-red-500 to-pink-600 hover:from-red-600 hover:to-pink-700 text-white shadow-2xl transform hover:scale-105 transition-all"
              >
                ❌ Nie umiem
              </Button>
              
              <Button
                onClick={markAsKnown}
                className="px-12 py-6 text-xl font-bold bg-gradient-to-r from-green-500 to-emerald-600 hover:from-green-600 hover:to-emerald-700 text-white shadow-2xl transform hover:scale-105 transition-all"
              >
                ✅ Umiem
              </Button>
            </div>
          )}
          
          {/* Przyciski nawigacji i obracania */}
          <div className="flex items-center justify-center gap-4">
            <Button
              onClick={prevCard}
              className="px-6 py-3 text-sm font-semibold bg-gray-200 dark:bg-gray-700 text-gray-800 dark:text-white hover:bg-gray-300 dark:hover:bg-gray-600"
              disabled={currentIndex === 0}
            >
              ← Poprzednia
            </Button>
            
            <Button
              onClick={() => setIsFlipped(!isFlipped)}
              className="px-8 py-3 text-sm font-semibold bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700"
            >
              🔄 Obróć
            </Button>
            
            <Button
              onClick={nextCard}
              className="px-6 py-3 text-sm font-semibold bg-gray-200 dark:bg-gray-700 text-gray-800 dark:text-white hover:bg-gray-300 dark:hover:bg-gray-600"
            >
              Pomiń →
            </Button>
          </div>
        </div>

        {/* Keyboard Hints */}
        <div className="mt-8 text-center text-sm text-gray-500 dark:text-gray-400">
          <div className="font-semibold mb-2">💡 Wskazówka:</div>
          <p className="mb-2">Obróć fiszkę, przeczytaj odpowiedź, następnie oceń czy ją znasz</p>
          <div className="flex justify-center gap-6 text-xs">
            <span>Enter/Spacja - Obróć</span>
            <span>1 - Nie umiem</span>
            <span>2 - Umiem</span>
            <span>← → - Nawigacja</span>
          </div>
        </div>
      </div>
    </section>
  )
}
