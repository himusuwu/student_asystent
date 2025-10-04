import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { createLecture, saveLectureTab, listSubjects, putTempFile, deleteTempFile } from '@/lib/repo'
import { log } from '@/lib/logs'

// Lazy load AI module
type AiModule = typeof import('@/lib/ai')
let aiModPromise: Promise<AiModule> | null = null
async function ai() { return (aiModPromise ??= import('@/lib/ai')) }

export default function NewLecture() {
  const navigate = useNavigate()
  const [subjectId, setSubjectId] = useState('')
  const [audio, setAudio] = useState<File | null>(null)
  const [status, setStatus] = useState<string>('Gotowe')
  const [error, setError] = useState<string | null>(null)
  const [subjects, setSubjects] = useState<{id:string;name:string}[]>([])
  const [dragOver, setDragOver] = useState(false)
  const [progress, setProgress] = useState<{ value: number; phase: string } | null>(null)
  const [audioWarning, setAudioWarning] = useState<string | null>(null)

  useEffect(() => { (async () => setSubjects(await listSubjects()))() }, [])

  useEffect(() => {
    if (!audio) {
      setAudioWarning(null)
      return
    }
    
    const sizeMB = audio.size / 1024 / 1024
    const estimatedMinutes = sizeMB / 0.7
    
    if (sizeMB > 100) {
      setAudioWarning(
        `⚠️ DUŻY PLIK (${sizeMB.toFixed(0)}MB, ~${estimatedMinutes.toFixed(0)} minut)\n` +
        `\nTranskrypcja w przeglądarce zajęłaby ${(estimatedMinutes * 0.7).toFixed(0)}-${(estimatedMinutes * 1.2).toFixed(0)} minut!\n` +
        `\n🚀 ZALECENIE: Użyj backendu (cd server && npm start)`
      )
    } else if (sizeMB > 20) {
      setAudioWarning(
        `ℹ️ Plik ${sizeMB.toFixed(0)}MB (~${estimatedMinutes.toFixed(0)} min)\n` +
        `Szacowany czas:\n` +
        `• Backend: ~${(estimatedMinutes * 0.1).toFixed(0)} min\n` +
        `• Przeglądarka: ~${(estimatedMinutes * 0.7).toFixed(0)} min`
      )
    }
  }, [audio])

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!subjectId) return setStatus('Wybierz przedmiot')
    if (!audio) return setStatus('Dodaj plik audio')
    
    setError(null)
    
    try {
      setStatus('Tworzenie wykładu...')
      log('[NewLecture] Start procesu')
      
      let speechText = ''
      let tempAudioId: string | null = null

      // === TRANSKRYPCJA ===
      setStatus('Zapisywanie audio...')
      log('[NewLecture] Zapis audio do cache')
      const ab = await audio.arrayBuffer()
      const blob = new Blob([ab], { type: audio.type || 'audio/mpeg' })
      tempAudioId = await putTempFile('audio', blob)
      
      setStatus('Transkrypcja audio...')
      log('[NewLecture] Start transkrypcji')
      
      try {
        const { transcribeAudio } = await ai()
        const t = await transcribeAudio(blob, 'auto', (p, phase) => setProgress({ value: p, phase }))
        speechText = t.text
        log(`[NewLecture] Transkrypcja zakończona: ${speechText.length} znaków`)
      } catch (err: any) {
        const errorMsg = `Błąd transkrypcji: ${err?.message || err}`
        log(errorMsg)
        setStatus(errorMsg)
        throw err
      } finally {
        if (tempAudioId) {
          await deleteTempFile(tempAudioId)
          log('[NewLecture] Usunięto audio z cache')
        }
      }

      // === GENEROWANIE TYTUŁU ===
      setStatus('Generowanie tytułu (AI)...')
      log('[NewLecture] Generowanie tytułu z transkrypcji')
      
      const { generateWithAI } = await ai()
      const titlePrompt = `Na podstawie transkrypcji wykładu wygeneruj krótki, zwięzły tytuł wykładu (maksymalnie 5-6 słów).

TRANSKRYPCJA:
"${speechText.substring(0, 2000)}"${speechText.length > 2000 ? '...' : ''}

Format: "Wprowadzenie do...", "Podstawy...", "Wykład o...", itp.

TYLKO TYTUŁ (bez cudzysłowów, bez dodatkowego tekstu):`

      const generatedTitle = await generateWithAI(titlePrompt, 'notes')
      const cleanTitle = generatedTitle.trim().replace(/^["']|["']$/g, '') // Usuń cudzysłowy
      
      log(`[NewLecture] Wygenerowany tytuł: "${cleanTitle}"`)
      setStatus(`Tytuł: "${cleanTitle}"`)

      // === TWORZENIE WYKŁADU ===
      setStatus('Tworzenie wykładu...')
      const lecture = await createLecture(subjectId, cleanTitle)
      log(`[NewLecture] Wykład utworzony: ${lecture.id}`)

      // Zapisz surową transkrypcję
      await saveLectureTab(lecture.id, 'transcript', speechText)
      log('[NewLecture] Zapisano transkrypcję')
      setStatus('Transkrypcja zapisana ✅')

      // === CZYSZCZENIE ===
      setStatus('Czyszczenie transkrypcji (AI)...')
      log('[NewLecture] Start cleaning')
      
      const { cleanTextWithAI } = await ai()
      const cleaned = await cleanTextWithAI(speechText)
      
      await saveLectureTab(lecture.id, 'cleaned', cleaned.cleanedText)
      log(`[NewLecture] Zapisano oczyszczoną transkrypcję: ${cleaned.cleanedText.length} znaków`)
      setStatus('Oczyszczona transkrypcja zapisana ✅')

      setStatus('✅ Gotowe! Przekierowanie...')
      log(`[NewLecture] Zakończono - przekierowanie do /lecture/${lecture.id}`)

      // Przekieruj do widoku wykładu
      setTimeout(() => {
        log(`[NewLecture] Wykonuję navigate do /lecture/${lecture.id}`)
        navigate(`/lecture/${lecture.id}`)
      }, 1000)
      
    } catch (err: any) {
      const errorMsg = `Błąd: ${err?.message || 'Nieznany błąd'}`
      log(`[NewLecture] BŁĄD: ${errorMsg}`)
      setStatus(errorMsg)
      setError(errorMsg)
    }
  }

  function handleDrop(e: React.DragEvent) {
    e.preventDefault()
    setDragOver(false)
    const file = e.dataTransfer.files[0]
    if (file && file.type.startsWith('audio/')) {
      setAudio(file)
    }
  }

  return (
    <section className="space-y-8">
      <div className="text-center pb-8">
        <h1 className="text-4xl font-bold mb-4 bg-gradient-to-r from-blue-600 to-cyan-600 bg-clip-text text-transparent">
          🎓 Nowy Wykład
        </h1>
        <p className="text-gray-600 dark:text-gray-300">
          Nagraj lub wgraj audio wykładu - AI stworzy transkrypcję i oczyszczoną wersję
        </p>
      </div>

      {error && (
        <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg p-4 text-red-800 dark:text-red-200">
          {error}
        </div>
      )}

      <form onSubmit={handleSubmit} className="space-y-6 max-w-2xl mx-auto">
        {/* Przedmiot */}
        <div>
          <label className="block text-sm font-medium mb-2">Przedmiot</label>
          <select 
            value={subjectId}
            onChange={e => setSubjectId(e.target.value)}
            className="w-full px-4 py-2 rounded-lg border dark:bg-gray-800"
            required
          >
            <option value="">Wybierz przedmiot</option>
            {subjects.map(s => (
              <option key={s.id} value={s.id}>{s.name}</option>
            ))}
          </select>
          <p className="text-xs text-gray-500 dark:text-gray-400 mt-2">
            💡 Tytuł wykładu zostanie automatycznie wygenerowany z treści
          </p>
        </div>

        {/* Audio Upload */}
        <div>
          <label className="block text-sm font-medium mb-2">Plik audio</label>
          <div
            className={`border-2 border-dashed rounded-lg p-8 text-center transition-colors ${
              dragOver ? 'border-blue-500 bg-blue-50 dark:bg-blue-900/20' : 'border-gray-300 dark:border-gray-700'
            }`}
            onDragOver={e => { e.preventDefault(); setDragOver(true) }}
            onDragLeave={() => setDragOver(false)}
            onDrop={handleDrop}
          >
            {audio ? (
              <div className="space-y-2">
                <p className="font-medium">{audio.name}</p>
                <p className="text-sm text-gray-500">
                  {(audio.size / 1024 / 1024).toFixed(2)} MB
                </p>
                <button
                  type="button"
                  onClick={() => setAudio(null)}
                  className="text-sm text-red-600 hover:underline"
                >
                  Usuń
                </button>
              </div>
            ) : (
              <div>
                <p className="mb-2">Przeciągnij plik audio tutaj lub</p>
                <input
                  type="file"
                  accept="audio/*"
                  onChange={e => setAudio(e.target.files?.[0] || null)}
                  className="hidden"
                  id="audio-input"
                />
                <label
                  htmlFor="audio-input"
                  className="inline-block px-4 py-2 bg-blue-600 text-white rounded-lg cursor-pointer hover:bg-blue-700"
                >
                  Wybierz plik
                </label>
              </div>
            )}
          </div>

          {audioWarning && (
            <div className="mt-2 p-3 bg-yellow-50 dark:bg-yellow-900/20 border border-yellow-200 dark:border-yellow-800 rounded text-sm whitespace-pre-line">
              {audioWarning}
            </div>
          )}
        </div>

        {/* Progress */}
        {progress && (
          <div className="space-y-2">
            <div className="flex justify-between text-sm">
              <span>{progress.phase}</span>
              <span>{progress.value}%</span>
            </div>
            <div className="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-2">
              <div
                className="bg-blue-600 h-2 rounded-full transition-all"
                style={{ width: `${progress.value}%` }}
              />
            </div>
          </div>
        )}

        {/* Status */}
        {status !== 'Gotowe' && (
          <div className="p-4 bg-blue-50 dark:bg-blue-900/20 rounded-lg text-center">
            {status}
          </div>
        )}

        {/* Submit */}
        <button
          type="submit"
          disabled={!subjectId || !audio || (status !== 'Gotowe' && !error)}
          className="w-full px-6 py-3 bg-gradient-to-r from-blue-600 to-cyan-600 text-white rounded-lg font-medium hover:opacity-90 disabled:opacity-50 disabled:cursor-not-allowed"
        >
          Utwórz wykład i transkrybuj
        </button>

        <div className="text-sm text-gray-500 dark:text-gray-400 space-y-1">
          <p>💡 Po transkrypcji będziesz mógł wygenerować:</p>
          <ul className="list-disc list-inside ml-4 space-y-1">
            <li>Szczegółową notatkę</li>
            <li>Krótką notatkę i kluczowe punkty</li>
            <li>Bank pytań i quiz</li>
            <li>Fiszki do nauki</li>
            <li>Mapę myśli</li>
            <li>Chat z wykładem (pytaj AI o treść)</li>
          </ul>
        </div>
      </form>
    </section>
  )
}
