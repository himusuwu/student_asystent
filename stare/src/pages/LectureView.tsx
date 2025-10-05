import { useEffect, useState } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { getLecture, listLectureTabs, getLectureTab, saveLectureTab, markTabGenerating, markTabError, addQuizQuestions, listQuizQuestions, addFlashcards, listFlashcardsByLecture } from '@/lib/repo'
import type { Lecture, LectureTab, LectureTabKind, Flashcard, QuizQuestion } from '@/lib/types'
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/Tabs'
import { Button } from '@/components/ui/Button'
import { Card } from '@/components/ui/Card'
import { MindmapViewer } from '@/components/MindmapViewer'
import { ChatTab } from '@/components/ChatTab'
import { MarkdownViewer } from '@/components/MarkdownViewer'
import { log } from '@/lib/logs'

// Lazy load AI
type AiModule = typeof import('@/lib/ai')
let aiModPromise: Promise<AiModule> | null = null
async function ai() { return (aiModPromise ??= import('@/lib/ai')) }

export default function LectureView() {
  const { id } = useParams<{ id: string }>()
  const navigate = useNavigate()
  
  const [lecture, setLecture] = useState<Lecture | null>(null)
  const [tabs, setTabs] = useState<LectureTab[]>([])
  const [flashcards, setFlashcards] = useState<Flashcard[]>([])
  const [quizQuestions, setQuizQuestions] = useState<QuizQuestion[]>([])
  const [activeTab, setActiveTab] = useState<LectureTabKind | 'flashcards' | 'quiz' | 'chat'>('transcript')
  const [generating, setGenerating] = useState<LectureTabKind | 'flashcards' | 'quiz' | 'chat' | null>(null)
  const [error, setError] = useState<string | null>(null)
  
  // Quiz state
  const [selectedAnswers, setSelectedAnswers] = useState<Map<string, number>>(new Map())
  const [isQuizChecked, setIsQuizChecked] = useState(false)

  useEffect(() => {
    if (!id) return
    loadLecture()
  }, [id])

  async function loadLecture() {
    if (!id) return
    
    try {
      const lec = await getLecture(id)
      if (!lec) {
        setError('Wykład nie znaleziony')
        return
      }
      
      setLecture(lec)
      const allTabs = await listLectureTabs(id)
      setTabs(allTabs)
      
      // Załaduj fiszki i quizy
      const cards = await listFlashcardsByLecture(id)
      setFlashcards(cards)
      
      const questions = await listQuizQuestions(id)
      setQuizQuestions(questions)
      
      // Jeśli jest transkrypcja, pokaż ją
      if (allTabs.some(t => t.kind === 'transcript')) {
        setActiveTab('transcript')
      }
    } catch (err: any) {
      setError(err.message)
    }
  }

  async function generateTab(kind: LectureTabKind | 'flashcards' | 'quiz' | 'chat') {
    if (!id || !lecture) return
    
    // Chat nie wymaga generowania - jest zawsze dostępny
    if (kind === 'chat') {
      setActiveTab('chat')
      return
    }
    
    setGenerating(kind)
    setError(null)
    
    try {
      // Dla fiszek i quizów nie używamy LectureTab
      if (kind === 'flashcards' || kind === 'quiz') {
        await generateFlashcardsOrQuiz(kind)
        return
      }
      
      await markTabGenerating(id, kind)
      
      // Pobierz oczyszczoną transkrypcję lub surową
      let sourceText = ''
      const cleaned = await getLectureTab(id, 'cleaned')
      const transcript = await getLectureTab(id, 'transcript')
      
      if (cleaned) {
        sourceText = cleaned.content
      } else if (transcript) {
        sourceText = transcript.content
      } else {
        throw new Error('Brak transkrypcji - najpierw utwórz wykład z audio')
      }

      log(`[LectureView] Generowanie ${kind} z ${sourceText.length} znaków`)

      const aiModule = await ai()
      let content = ''

      switch (kind) {
        case 'detailed_note':
          content = await generateDetailedNote(sourceText, aiModule)
          break
        case 'short_note':
          content = await generateShortNote(sourceText, aiModule)
          break
        case 'key_points':
          content = await generateKeyPoints(sourceText, aiModule)
          break
        case 'question_bank':
          content = await generateQuestionBank(sourceText, aiModule)
          break
        case 'mindmap':
          content = await generateMindmap(sourceText, aiModule)
          break
        default:
          throw new Error(`Nieobsługiwany typ zakładki: ${kind}`)
      }

      await saveLectureTab(id, kind, content)
      log(`[LectureView] Zapisano ${kind}`)
      
      await loadLecture()
      setActiveTab(kind)
      
    } catch (err: any) {
      log(`[LectureView] Błąd: ${err.message}`)
      if (kind !== 'flashcards' && kind !== 'quiz') {
        await markTabError(id, kind, err.message)
      }
      setError(err.message)
    } finally {
      setGenerating(null)
    }
  }

  async function generateFlashcardsOrQuiz(kind: 'flashcards' | 'quiz') {
    if (!id || !lecture) return
    
    try {
      // Pobierz źródłowy tekst
      let sourceText = ''
      const cleaned = await getLectureTab(id, 'cleaned')
      const transcript = await getLectureTab(id, 'transcript')
      
      if (cleaned) {
        sourceText = cleaned.content
      } else if (transcript) {
        sourceText = transcript.content
      } else {
        throw new Error('Brak transkrypcji')
      }

      log(`[LectureView] Generowanie ${kind}`)
      const aiModule = await ai()

      if (kind === 'flashcards') {
        const flashcards = await aiModule.generateFlashcardsWithAI(sourceText)
        
        if (flashcards.length > 0) {
          const cards = flashcards.map(fc => ({
            subjectId: lecture.subjectId,
            lectureId: id,
            question: fc.question,
            answer: fc.answer,
            tags: [fc.category, fc.difficulty]
          }))
          
          await addFlashcards(cards)
          log(`[LectureView] Zapisano ${flashcards.length} fiszek`)
        }
      } else if (kind === 'quiz') {
        // Generuj pytania quizowe
        const questions = await generateQuizQuestions(sourceText, aiModule)
        if (questions.length > 0) {
          await addQuizQuestions(questions.map((q: Omit<QuizQuestion, 'id' | 'createdAt' | 'lectureId'>) => ({
            lectureId: id,
            ...q
          })))
          log(`[LectureView] Zapisano ${questions.length} pytań quizowych`)
        }
      }

      await loadLecture()
      setActiveTab(kind)
      
    } catch (err: any) {
      log(`[LectureView] Błąd: ${err.message}`)
      setError(err.message)
    } finally {
      setGenerating(null)
    }
  }

  const currentTab = tabs.find(t => t.kind === activeTab)
  const hasLectureTabContent = !!currentTab?.content
  const hasFlashcardsContent = activeTab === 'flashcards' && flashcards.length > 0
  const hasQuizContent = activeTab === 'quiz' && quizQuestions.length > 0
  const hasContent = hasLectureTabContent || hasFlashcardsContent || hasQuizContent

  return (
    <section className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <button
            onClick={() => navigate(-1)}
            className="text-sm text-gray-600 dark:text-gray-400 hover:underline mb-2"
          >
            ← Powrót
          </button>
          <h1 className="text-3xl font-bold">{lecture?.title || 'Ładowanie...'}</h1>
          <p className="text-sm text-gray-500 dark:text-gray-400">
            {lecture && new Date(lecture.createdAt).toLocaleString('pl-PL')}
          </p>
        </div>
      </div>

      {error && (
        <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg p-4 text-red-800 dark:text-red-200">
          {error}
        </div>
      )}

      {/* Tabs */}
      <Tabs
        value={activeTab}
        onValueChange={(val) => setActiveTab(val as LectureTabKind | 'flashcards' | 'quiz' | 'chat')}
      >
        <TabsList className="grid w-full grid-cols-5 lg:grid-cols-10">
          <TabsTrigger value="transcript">📝 Transkrypcja</TabsTrigger>
          <TabsTrigger value="cleaned">✨ Oczyszczona</TabsTrigger>
          <TabsTrigger value="detailed_note">📋 Szczegółowa</TabsTrigger>
          <TabsTrigger value="short_note">📄 Krótka</TabsTrigger>
          <TabsTrigger value="key_points">🎯 Kluczowe</TabsTrigger>
          <TabsTrigger value="question_bank">❓ Pytania</TabsTrigger>
          <TabsTrigger value="flashcards">🃏 Fiszki</TabsTrigger>
          <TabsTrigger value="quiz">📝 Quiz</TabsTrigger>
          <TabsTrigger value="mindmap">🗺️ Mapa</TabsTrigger>
          <TabsTrigger value="chat">💬 Czat</TabsTrigger>
        </TabsList>

      {/* Content */}
      <Card className="p-6">
        {generating === activeTab ? (
          <div className="text-center py-12">
            <div className="inline-block animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mb-4"></div>
            <p className="text-gray-600 dark:text-gray-400">
              Generowanie {getTabName(activeTab)}...
            </p>
          </div>
        ) : hasContent ? (
          <>
            {hasLectureTabContent && currentTab && activeTab !== 'mindmap' && (
              <MarkdownViewer content={currentTab.content} />
            )}
            
            {hasLectureTabContent && currentTab && activeTab === 'mindmap' && (
              <MindmapViewer markdown={currentTab.content} lectureId={id!} />
            )}
            
            {hasFlashcardsContent && (
              <div className="space-y-4">
                <h2 className="text-xl font-semibold mb-4">Fiszki ({flashcards.length})</h2>
                {flashcards.map((card, idx) => (
                  <Card key={card.id || idx} className="p-4 hover:shadow-lg transition-shadow">
                    <div className="font-medium text-lg mb-2">{card.question}</div>
                    <div className="text-gray-600 dark:text-gray-400 text-sm border-t pt-2 mt-2">
                      {card.answer}
                    </div>
                    {card.tags && card.tags.length > 0 && (
                      <div className="flex gap-2 mt-2">
                        {card.tags.map((tag, i) => (
                          <span key={i} className="text-xs bg-blue-100 dark:bg-blue-900 text-blue-800 dark:text-blue-200 px-2 py-1 rounded">
                            {tag}
                          </span>
                        ))}
                      </div>
                    )}
                  </Card>
                ))}
              </div>
            )}
            
            {hasQuizContent && (
              <div className="space-y-6">
                {/* Header z przyciskiem sprawdzania */}
                <div className="flex items-center justify-between mb-6">
                  <h2 className="text-2xl font-semibold">
                    📝 Quiz - {quizQuestions.length} pytań
                  </h2>
                  {!isQuizChecked ? (
                    <Button
                      onClick={() => {
                        if (selectedAnswers.size === 0) {
                          alert('⚠️ Zaznacz przynajmniej jedną odpowiedź!')
                          return
                        }
                        setIsQuizChecked(true)
                      }}
                      className="px-8 py-3 text-lg font-bold bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700"
                    >
                      ✅ Sprawdź wyniki
                    </Button>
                  ) : (
                    <div className="text-right">
                      <div className="text-3xl font-bold text-green-600 dark:text-green-400 mb-1">
                        {Array.from(selectedAnswers.entries()).filter(([qId, ans]) => {
                          const q = quizQuestions.find(q => q.id === qId)
                          return q && q.correctIndex === ans
                        }).length} / {selectedAnswers.size}
                      </div>
                      <div className="text-sm text-gray-600 dark:text-gray-400">
                        poprawnych odpowiedzi
                      </div>
                      <Button
                        onClick={() => {
                          setSelectedAnswers(new Map())
                          setIsQuizChecked(false)
                        }}
                        className="mt-2 px-4 py-2 text-sm bg-gray-500 hover:bg-gray-600"
                      >
                        🔄 Spróbuj ponownie
                      </Button>
                    </div>
                  )}
                </div>

                {/* Pytania */}
                {quizQuestions.map((q, idx) => {
                  const questionId = q.id || `q-${idx}`
                  const selectedAnswer = selectedAnswers.get(questionId)
                  const isAnswered = selectedAnswer !== undefined
                  const isCorrect = isAnswered && selectedAnswer === q.correctIndex

                  return (
                    <Card key={questionId} className="p-6">
                      <div className="flex items-start gap-3 mb-4">
                        <span className="flex-shrink-0 w-8 h-8 rounded-full bg-blue-100 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400 font-bold flex items-center justify-center">
                          {idx + 1}
                        </span>
                        <div className="flex-1">
                          <div className="font-semibold text-lg text-gray-800 dark:text-white">
                            {q.question}
                          </div>
                          {q.category && (
                            <span className="inline-block mt-2 text-xs bg-purple-100 dark:bg-purple-900/30 text-purple-600 dark:text-purple-400 px-2 py-1 rounded">
                              {q.category}
                            </span>
                          )}
                        </div>
                        {isQuizChecked && isAnswered && (
                          <div className={`flex-shrink-0 text-2xl ${isCorrect ? 'text-green-500' : 'text-red-500'}`}>
                            {isCorrect ? '✅' : '❌'}
                          </div>
                        )}
                      </div>

                      {/* Opcje odpowiedzi */}
                      <div className="space-y-2 ml-11">
                        {q.options.map((opt, optIdx) => {
                          const isSelected = selectedAnswer === optIdx
                          const isCorrectOption = optIdx === q.correctIndex
                          const showAsCorrect = isQuizChecked && isCorrectOption
                          const showAsWrong = isQuizChecked && isSelected && !isCorrectOption

                          return (
                            <button
                              key={optIdx}
                              onClick={() => {
                                if (!isQuizChecked) {
                                  const newAnswers = new Map(selectedAnswers)
                                  newAnswers.set(questionId, optIdx)
                                  setSelectedAnswers(newAnswers)
                                }
                              }}
                              disabled={isQuizChecked}
                              className={`w-full text-left p-4 rounded-lg border-2 transition-all ${
                                showAsCorrect
                                  ? 'bg-green-100 dark:bg-green-900/30 border-green-500 text-green-900 dark:text-green-100'
                                  : showAsWrong
                                  ? 'bg-red-100 dark:bg-red-900/30 border-red-500 text-red-900 dark:text-red-100'
                                  : isSelected
                                  ? 'bg-blue-100 dark:bg-blue-900/30 border-blue-500 text-blue-900 dark:text-blue-100'
                                  : 'bg-gray-50 dark:bg-gray-800 border-gray-200 dark:border-gray-700 hover:border-blue-400 dark:hover:border-blue-600'
                              } ${!isQuizChecked ? 'cursor-pointer' : 'cursor-default'}`}
                            >
                              <div className="flex items-center gap-3">
                                <span className={`flex-shrink-0 w-8 h-8 rounded-full border-2 flex items-center justify-center font-semibold ${
                                  showAsCorrect
                                    ? 'bg-green-500 border-green-600 text-white'
                                    : showAsWrong
                                    ? 'bg-red-500 border-red-600 text-white'
                                    : isSelected
                                    ? 'bg-blue-500 border-blue-600 text-white'
                                    : 'bg-white dark:bg-gray-700 border-gray-300 dark:border-gray-600'
                                }`}>
                                  {String.fromCharCode(65 + optIdx)}
                                </span>
                                <span className="flex-1">{opt}</span>
                                {showAsCorrect && <span className="text-xl">✓</span>}
                                {showAsWrong && <span className="text-xl">✗</span>}
                              </div>
                            </button>
                          )
                        })}
                      </div>

                      {/* Wyjaśnienie (pokazuj tylko po sprawdzeniu) */}
                      {isQuizChecked && q.explanation && (
                        <div className="mt-4 ml-11 p-4 bg-blue-50 dark:bg-blue-900/20 rounded-lg border border-blue-200 dark:border-blue-800">
                          <div className="flex items-start gap-2">
                            <span className="text-blue-600 dark:text-blue-400 font-semibold">💡</span>
                            <div className="flex-1 text-sm text-gray-700 dark:text-gray-300">
                              <strong className="text-blue-600 dark:text-blue-400">Wyjaśnienie:</strong> {q.explanation}
                            </div>
                          </div>
                        </div>
                      )}
                    </Card>
                  )
                })}

                {/* Podsumowanie na dole */}
                {isQuizChecked && (
                  <Card className="p-6 bg-gradient-to-r from-blue-50 to-purple-50 dark:from-blue-900/20 dark:to-purple-900/20">
                    <div className="text-center">
                      <div className="text-5xl mb-3">
                        {(() => {
                          const correctCount = Array.from(selectedAnswers.entries()).filter(([qId, ans]) => {
                            const q = quizQuestions.find(q => q.id === qId)
                            return q && q.correctIndex === ans
                          }).length
                          const percentage = (correctCount / selectedAnswers.size) * 100
                          return percentage >= 80 ? '🎉' : percentage >= 50 ? '👍' : '📚'
                        })()}
                      </div>
                      <div className="text-2xl font-bold text-gray-800 dark:text-white mb-2">
                        Twój wynik: {Array.from(selectedAnswers.entries()).filter(([qId, ans]) => {
                          const q = quizQuestions.find(q => q.id === qId)
                          return q && q.correctIndex === ans
                        }).length} / {selectedAnswers.size}
                      </div>
                      <div className="text-gray-600 dark:text-gray-400">
                        {(() => {
                          const correctCount = Array.from(selectedAnswers.entries()).filter(([qId, ans]) => {
                            const q = quizQuestions.find(q => q.id === qId)
                            return q && q.correctIndex === ans
                          }).length
                          const percentage = (correctCount / selectedAnswers.size) * 100
                          if (percentage >= 80) return 'Świetna robota! 🌟'
                          if (percentage >= 50) return 'Dobry wynik, ale można jeszcze lepiej!'
                          return 'Wróć do materiału i spróbuj ponownie'
                        })()}
                      </div>
                    </div>
                  </Card>
                )}
              </div>
            )}
          </>
        ) : activeTab === 'chat' ? (
          <ChatTab lectureId={id!} />
        ) : (
          <div className="text-center py-12 space-y-4">
            <p className="text-gray-600 dark:text-gray-400">
              Ta zakładka nie została jeszcze wygenerowana
            </p>
            {canGenerate(activeTab) && (
              <Button
                onClick={() => generateTab(activeTab)}
                disabled={!!generating}
              >
                Generuj {getTabName(activeTab)}
              </Button>
            )}
          </div>
        )}
      </Card>
      </Tabs>
    </section>
  )
}

function getTabName(kind: LectureTabKind | 'flashcards' | 'quiz' | 'chat'): string {
  const names: Record<LectureTabKind | 'flashcards' | 'quiz' | 'chat', string> = {
    transcript: 'Transkrypcję',
    cleaned: 'Oczyszczoną transkrypcję',
    detailed_note: 'Szczegółową notatkę',
    short_note: 'Krótką notatkę',
    key_points: 'Kluczowe punkty',
    question_bank: 'Bank pytań',
    flashcards: 'Fiszki',
    quiz: 'Quiz',
    mindmap: 'Mapę myśli',
    chat: 'Czat',
  }
  return names[kind] || kind
}

function canGenerate(kind: LectureTabKind | 'flashcards' | 'quiz' | 'chat'): boolean {
  // Transcript i cleaned są generowane podczas tworzenia wykładu
  // Chat nie wymaga generowania, jest zawsze dostępny
  return !['transcript', 'cleaned', 'chat'].includes(kind)
}

// ============================================
// FUNKCJE GENEROWANIA ZAKŁADEK
// ============================================

async function generateDetailedNote(text: string, aiModule: AiModule): Promise<string> {
  const prompt = `Stwórz szczegółową, profesjonalną notatkę z tego wykładu w formacie Markdown.

WYKŁAD:
"${text.substring(0, 10000)}"${text.length > 10000 ? '\n[...]' : ''}

WAŻNE - POMIŃ te fragmenty:
❌ Informacje o zaliczeniu/egzaminie
❌ Literatura i materiały do przeczytania
❌ Organizacja zajęć (terminy, sale, godziny)
❌ Pytania o "jak wygląda zaliczenie"

GENERUJ TYLKO merytorykę:
✅ Definicje, koncepcje, teorie
✅ Przykłady i zastosowania
✅ Wzory, liczby, dane
✅ Wyjaśnienia procesów

FORMAT MARKDOWN - użyj:
# Główny nagłówek (tytuł sekcji)
## Podsekcje (kategorie)
### Punkty szczegółowe

- Lista niezamówiona
1. Lista numerowana
**Pogrubienie** dla ważnych terminów
*Kursywa* dla uwag
> Cytaty dla definicji
\`kod\` dla wzorów/kodu

---
Oddziały między sekcjami

Odpowiedź (czysty Markdown, bez dodatkowych komentarzy):`

  const response = await aiModule.generateWithAI(prompt, 'notes')
  return response.trim()
}

async function generateShortNote(text: string, aiModule: AiModule): Promise<string> {
  const prompt = `Stwórz KRÓTKĄ notatkę (max 500 słów) z tego wykładu w formacie Markdown.

WYKŁAD:
"${text.substring(0, 8000)}"${text.length > 8000 ? '\n[...]' : ''}

FORMAT MARKDOWN:
## Nagłówki dla sekcji
- Listy punktowane
**Pogrubienie** dla kluczowych terminów
> Definicje jako cytaty

Koncentruj się na najważniejszych informacjach, pomiń organizacyjne szczegóły.

Odpowiedź (czysty Markdown):`

  const response = await aiModule.generateWithAI(prompt, 'notes')
  return response.trim()
}

async function generateKeyPoints(text: string, aiModule: AiModule): Promise<string> {
  const prompt = `Wypisz 10-15 najważniejszych punktów z tego wykładu w formacie Markdown.

WYKŁAD:
"${text.substring(0, 8000)}"${text.length > 8000 ? '\n[...]' : ''}

FORMAT MARKDOWN - użyj:
- [ ] Punkt 1 z **wyróżnionymi** terminami
- [ ] Punkt 2 z _kontekstem_

Każdy punkt powinien być:
✅ Konkretny i merytoryczny
✅ Samowystarczalny (zrozumiały bez kontekstu)
✅ Zawierać kluczowe terminy w **pogrubieniu**

POMIŃ informacje organizacyjne.

Odpowiedź (czysty Markdown checklist):`

  const response = await aiModule.generateWithAI(prompt, 'notes')
  return response.trim()
}

async function generateQuestionBank(text: string, aiModule: AiModule): Promise<string> {
  const prompt = `Wygeneruj 15-20 pytań sprawdzających wiedzę z wykładu w formacie Markdown.

WYKŁAD:
"${text.substring(0, 8000)}"${text.length > 8000 ? '\n[...]' : ''}

TYLKO pytania merytoryczne o treść:
✅ Definicje i pojęcia
✅ Procesy i mechanizmy
✅ Przykłady zastosowań
✅ Zależności i relacje

POMIŃ pytania o:
❌ Zaliczeniu, egzaminie
❌ Literaturze
❌ Organizacji zajęć

FORMAT MARKDOWN:
### Sekcja tematyczna

1. **Pytanie 1** - szczegółowe pytanie otwarte
2. **Pytanie 2** - pytanie analityczne

Grupuj pytania tematycznie, używaj **pogrubienia** dla kluczowych słów.

Odpowiedź (czysty Markdown):`

  const response = await aiModule.generateWithAI(prompt, 'notes')
  return response.trim()
}

async function generateMindmap(text: string, aiModule: AiModule): Promise<string> {
  const prompt = `Stwórz hierarchiczną mapę myśli dla tego wykładu w formacie Markdown.

WYKŁAD:
"${text.substring(0, 6000)}"${text.length > 6000 ? '\n[...]' : ''}

FORMAT MARKDOWN - hierarchia:
# 📘 Główny temat wykładu

## 📗 Podtemat 1
- **Koncepcja kluczowa 1**
  - Szczegół/przykład 1.1
  - Szczegół/przykład 1.2
- **Koncepcja kluczowa 2**

## 📗 Podtemat 2
- **Inna koncepcja**
  - Wyjaśnienie

Używaj:
- **Pogrubienia** dla głównych konceptów
- Wcięć dla szczegółów
- Emoji dla kategorii (opcjonalnie)

Odpowiedź (czysty Markdown):`

  const response = await aiModule.generateWithAI(prompt, 'notes')
  return response.trim()
}

async function generateQuizQuestions(text: string, aiModule: AiModule): Promise<Omit<QuizQuestion, 'id' | 'createdAt' | 'lectureId'>[]> {
  const prompt = `Wygeneruj KOMPLETNY zestaw pytań quizowych pokrywający CAŁY materiał z wykładu.

WYKŁAD:
"${text.substring(0, 10000)}"${text.length > 10000 ? '\n[...]' : ''}

❌ NIE generuj pytań o:
- Organizacji zajęć (zaliczenie, terminy, konsultacje)
- Literaturze i materiałach dodatkowych
- Osobach (prowadzący, autorzy podręczników)
- Regułach kursu

✅ Generuj pytania o KAŻDY ważny temat:
- Wszystkie kluczowe pojęcia i definicje
- Procesy i mechanizmy wyjaśniane na wykładzie
- Relacje między konceptami
- Przykłady i zastosowania praktyczne
- Wzory, daty, fakty liczbowe

ZASADY:
- ŻADNYCH limitów - pokryj całą merytorykę
- Różne poziomy trudności (easy, medium, hard)
- 4 opcje odpowiedzi na pytanie (A, B, C, D)
- Tylko jedna poprawna odpowiedź

Format JSON array:
[
  {
    "question": "Pytanie...",
    "options": ["Opcja A", "Opcja B", "Opcja C", "Opcja D"],
    "correctIndex": 0,
    "explanation": "Wyjaśnienie dlaczego to jest poprawna odpowiedź",
    "difficulty": "medium",
    "category": "Nazwa kategorii"
  }
]

Odpowiedź (tylko JSON array, bez innych tekstów):`

  const response = await aiModule.generateWithAI(prompt, 'flashcards')
  
  try {
    const parsed = JSON.parse(response.trim())
    log(`[generateQuizQuestions] Wygenerowano ${parsed.length} pytań BEZ LIMITU`)
    return Array.isArray(parsed) ? parsed : []
  } catch (e) {
    log(`[generateQuizQuestions] Błąd parsowania JSON: ${e}`)
    return []
  }
}
