import { useEffect, useState } from 'react'
import { createSession, saveNote, addFlashcards, listSubjects, putTempFile, deleteTempFile } from '@/lib/repo'
// Lazy load AI module for smaller initial bundle
type AiModule = typeof import('@/lib/ai')
let aiModPromise: Promise<AiModule> | null = null
async function ai() { return (aiModPromise ??= import('@/lib/ai')) }
import { log } from '@/lib/logs'

export default function NewNote() {
  const [subjectId, setSubjectId] = useState('')
  const [title, setTitle] = useState('Nowa sesja')
  const [audio, setAudio] = useState<File | null>(null)
  const [slides, setSlides] = useState<File | null>(null)
  const [onlyText, setOnlyText] = useState('')
  const [status, setStatus] = useState<string>('Gotowe')
  const [error, setError] = useState<string | null>(null)
  const [subjects, setSubjects] = useState<{id:string;name:string}[]>([])
  const [dragOver, setDragOver] = useState(false)
  const [progress, setProgress] = useState<{ value: number; phase: string } | null>(null)
  const [audioWarning, setAudioWarning] = useState<string | null>(null)

  // Load subjects for select
  useEffect(() => { (async () => setSubjects(await listSubjects()))() }, [])

  // Sprawdź rozmiar pliku audio i ostrzegaj
  useEffect(() => {
    if (!audio) {
      setAudioWarning(null)
      return
    }
    
    const sizeMB = audio.size / 1024 / 1024
    const estimatedMinutes = sizeMB / 0.7 // ~0.7MB na minutę dla dobrego MP3
    
    if (sizeMB > 100) {
      setAudioWarning(
        `⚠️ DUŻY PLIK (${sizeMB.toFixed(0)}MB, ~${estimatedMinutes.toFixed(0)} minut)\n` +
        `\nTranskrypcja w przeglądarce zajęłaby ${(estimatedMinutes * 0.7).toFixed(0)}-${(estimatedMinutes * 1.2).toFixed(0)} minut!\n` +
        `\n🚀 ZALECENIE: Użyj backendu:\n` +
        `1. Uruchom serwer: cd server && npm start\n` +
        `2. Upewnij się że w Ustawieniach: "Transkrypcja: Auto (backend first)"\n` +
        `3. Backend przetworzy to w ~${(estimatedMinutes * 0.05).toFixed(0)}-${(estimatedMinutes * 0.2).toFixed(0)} minut (10-20x szybciej!)`
      )
    } else if (sizeMB > 20) {
      setAudioWarning(
        `ℹ️ Plik ${sizeMB.toFixed(0)}MB (~${estimatedMinutes.toFixed(0)} min)\n` +
        `Szacowany czas transkrypcji:\n` +
        `• Backend: ~${(estimatedMinutes * 0.1).toFixed(0)} min\n` +
        `• Przeglądarka: ~${(estimatedMinutes * 0.7).toFixed(0)} min`
      )
    }
  }, [audio])

  async function onProcess(e: React.FormEvent) {
    e.preventDefault()
    if (!subjectId) return setStatus('Wybierz przedmiot')
    
    // Reset error state
    setError(null)
    
    try {
      setStatus('Tworzenie sesji...')
      log('Nowa sesja: start')
      const session = await createSession(subjectId, title)
      let speechText = ''
      let slidesText: string[] = []
      let tempAudioId: string | null = null

      if (audio) {
        setStatus('Zapisywanie audio tymczasowo...')
        log('Audio: zapis do cache')
        const ab = await audio.arrayBuffer()
        const blob = new Blob([ab], { type: audio.type || 'audio/mpeg' })
        tempAudioId = await putTempFile('audio', blob)
        setStatus('Transkrypcja audio (lokalnie)...')
        log('Audio: transkrypcja start')
        
        try {
          const { transcribeAudio } = await ai()
          const t = await transcribeAudio(blob, 'auto', (p, phase) => setProgress({ value: p, phase }))
          speechText = t.text
          log(`Audio: transkrypcja zakończona, długość tekstu: ${speechText.length} znaków`)
        } catch (err: any) {
          const errorMsg = `Błąd transkrypcji: ${err?.message || err}`
          log(errorMsg)
          setStatus(errorMsg)
          throw err
        } finally {
          if (tempAudioId) {
            await deleteTempFile(tempAudioId)
            log('Audio: usunięte z cache po transkrypcji')
          }
        }
      }

    if (slides) {
      setStatus('Ekstrakcja treści slajdów...')
      log('Slajdy: ekstrakcja start')
      const { extractSlidesText } = await ai()
      slidesText = await extractSlidesText(slides)
      log(`Slajdy: znaleziono ${slidesText.length} stron/sekcji`)
    }

    if (onlyText.trim()) {
      speechText += (speechText ? '\n' : '') + onlyText.trim()
    }

    setStatus('Wykrywanie treści „poza slajdami"...')
    log('Obliczanie off-slides')
    const { computeOffSlides } = await ai()
    const offSlides = computeOffSlides(speechText, slidesText)

    // === ZAAWANSOWANE PRZETWARZANIE AI ===
    
    setStatus('Generowanie podstawowych notatek...')
    log('Generowanie podstawowych notatek')
    const { generateNotes } = await ai()
    const basicNotes = await generateNotes({ speech: speechText, slides: slidesText, offSlides })
    if (basicNotes.speechMd) await saveNote(session.id, 'speech', basicNotes.speechMd)
    if (basicNotes.slidesMd) await saveNote(session.id, 'slides', basicNotes.slidesMd)
    if (basicNotes.offSlidesMd) await saveNote(session.id, 'off_slides', basicNotes.offSlidesMd)
    if (basicNotes.shortMd) await saveNote(session.id, 'short', basicNotes.shortMd)

    if (speechText || slidesText.length) {
      const fullText = [speechText, ...slidesText, ...offSlides].join('\n')
      
      // === AI-POWERED CZYSZCZENIE TEKSTU ===
      setStatus('AI czyszczenie tekstu z zacinania się i poprawek...')
      log('AI: czyszczenie tekstu')
      const { cleanTextWithAI } = await ai()
      const cleaned = await cleanTextWithAI(fullText)
      
      if (cleaned.cleanedText !== fullText) {
        const cleaningReport = `# Tekst po czyszczeniu przez AI

## Zmiany wprowadzone przez AI:
${cleaned.changes.map(change => `- ${change}`).join('\n')}

## Tekst oryginalny (pierwszych 500 znaków):
${fullText.substring(0, 500)}${fullText.length > 500 ? '...' : ''}

## Tekst po czyszczeniu:
${cleaned.cleanedText}

---
*${cleaned.summary}*`
        
        await saveNote(session.id, 'cleaned', cleaningReport)
        log(`AI czyszczenie: ${cleaned.changes.length} zmian`)
      }
      
      // Używaj oczyszczonego tekstu do dalszego przetwarzania
      const textForProcessing = cleaned.cleanedText || fullText
      
      // === AI-POWERED GENEROWANIE NOTATEK ===
      setStatus('AI generowanie zaawansowanych notatek...')
      log('AI: generowanie notatek')
      const { generateNotesWithAI } = await ai()
      const aiNotes = await generateNotesWithAI(textForProcessing)
      
      // Zapisz wersje AI
      if (aiNotes.formatted) await saveNote(session.id, 'ai_formatted', aiNotes.formatted)
      if (aiNotes.structured) await saveNote(session.id, 'ai_structured', aiNotes.structured) 
      if (aiNotes.summary) await saveNote(session.id, 'ai_summary', aiNotes.summary)
      if (aiNotes.keyPoints) await saveNote(session.id, 'ai_keypoints', aiNotes.keyPoints)
      if (aiNotes.questions) await saveNote(session.id, 'ai_questions', aiNotes.questions)

      // === AI-POWERED FISZKI ===
      setStatus('AI generowanie zaawansowanych fiszek...')
      log('AI: generowanie fiszek')
      const { generateFlashcardsWithAI } = await ai()
      const aiCards = await generateFlashcardsWithAI(textForProcessing)
      
      if (aiCards.length) {
        log(`[NewNote] Mapowanie ${aiCards.length} fiszek...`)
        log(`[NewNote] subjectId="${subjectId}", sessionId="${session.id}"`)
        
        const flashcards = aiCards.map((card, idx) => {
          const flashcard = {
            subjectId,
            question: card.question,
            answer: card.answer,
            tags: [card.category, card.difficulty],
            sessionId: session.id
          }
          log(`[NewNote] Fiszka ${idx}: ${JSON.stringify(flashcard)}`)
          return flashcard
        })
        
        try {
          await addFlashcards(flashcards)
          log(`AI fiszki: dodano ${aiCards.length} (${aiCards.filter(c => c.difficulty === 'easy').length} łatwych, ${aiCards.filter(c => c.difficulty === 'medium').length} średnich, ${aiCards.filter(c => c.difficulty === 'hard').length} trudnych)`)
        } catch (err: any) {
          log(`[NewNote] BŁĄD addFlashcards: ${err.message}`)
          console.error('[NewNote] Pełny błąd:', err)
          throw err
        }
      }

      // === WERYFIKACJA FAKTÓW ===
      setStatus('AI weryfikacja faktów...')
      log('AI: weryfikacja faktów')
      const { verifyFactsWithWebSearch } = await ai()
      const verification = await verifyFactsWithWebSearch(textForProcessing)
      
      if (verification.verifiedFacts.length) {
        const verificationReport = `# Weryfikacja faktów przez AI

## Poziom pewności: ${Math.round(verification.confidence)}%

## Sprawdzone fakty:
${verification.verifiedFacts.map(fact => `
### ${fact.verified ? '✅' : '❌'} ${fact.fact}
${fact.source ? `**Źródło:** ${fact.source}` : ''}
`).join('\n')}

## Sugestie:
${verification.suggestions.map(s => `- ${s}`).join('\n')}

---
*Weryfikacja automatyczna - zawsze sprawdź dodatkowo w wiarygodnych źródłach*`

        await saveNote(session.id, 'ai_verification', verificationReport)
        log(`AI weryfikacja: ${verification.verifiedFacts.length} faktów, ${Math.round(verification.confidence)}% pewności`)
      }
    }

    setStatus('✅ Zakończono! AI wygenerował: oczyszczony tekst, zaawansowane notatki, fiszki i weryfikację faktów. Przejdź do widoku sesji, aby zobaczyć wszystkie materiały.')
    setProgress(null)
    log('Nowa sesja: zakończono z zaawansowanym przetwarzaniem AI')
    } catch (error: any) {
      const errorMessage = error?.message || String(error)
      log(`Błąd podczas przetwarzania: ${errorMessage}`)
      setStatus(`Błąd - sprawdź poniżej`)
      setError(errorMessage)
      setProgress(null)
    }
  }

  return (
    <section>
      <h1>Nowa notatka</h1>
      <form onSubmit={onProcess} style={{ display:'grid', gap:8, maxWidth:600 }}
        onDragOver={(e)=>{ e.preventDefault(); setDragOver(true) }}
        onDragLeave={()=>setDragOver(false)}
        onDrop={(e)=>{
          e.preventDefault(); setDragOver(false)
          if (!e.dataTransfer?.files?.length) return
          const files = Array.from(e.dataTransfer.files)
          const audioFile = files.find(f=>f.type.startsWith('audio/'))
          const slideFile = files.find(f=> f.type==='application/pdf' || f.name.endsWith('.ppt') || f.name.endsWith('.pptx'))
          if (audioFile) setAudio(audioFile)
          if (slideFile) setSlides(slideFile)
        }}>
        <label>
          Przedmiot:
          <select value={subjectId} onChange={e=>setSubjectId(e.target.value)}>
            <option value="">-- wybierz przedmiot --</option>
            {subjects.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
          </select>
        </label>
        <label>
          Tytuł sesji:
          <input value={title} onChange={e=>setTitle(e.target.value)} />
        </label>
        <div style={{ padding:12, border:'2px dashed #555', borderRadius:8, background: dragOver? 'rgba(125,125,125,0.2)':'transparent' }}>
          Przeciągnij i upuść plik audio oraz/lub prezentację tutaj
        </div>
        <label style={{ marginTop: 4 }}>
          Plik audio (opcjonalnie):
          <input type="file" accept="audio/*" onChange={e=>setAudio(e.target.files?.[0] ?? null)} />
          {audio && <div style={{ fontSize: 12, marginTop: 4, opacity: 0.7 }}>Wybrany: {audio.name} ({(audio.size / 1024 / 1024).toFixed(1)}MB)</div>}
        </label>
        {audioWarning && (
          <div style={{ 
            padding: 12, 
            background: audioWarning.includes('⚠️') ? 'rgba(245, 158, 11, 0.1)' : 'rgba(59, 130, 246, 0.1)', 
            border: audioWarning.includes('⚠️') ? '1px solid rgba(245, 158, 11, 0.3)' : '1px solid rgba(59, 130, 246, 0.3)', 
            borderRadius: 8,
            fontSize: 13,
            whiteSpace: 'pre-line'
          }}>
            {audioWarning}
          </div>
        )}
        <label>
          Prezentacja PDF/PPTX (opcjonalnie):
          <input type="file" accept="application/pdf,.ppt,.pptx" onChange={e=>setSlides(e.target.files?.[0] ?? null)} />
        </label>
        <label>
          Tylko tekst (gdy masz samo nagranie lub swoje notatki, opcjonalnie):
          <textarea rows={6} value={onlyText} onChange={e=>setOnlyText(e.target.value)} placeholder="Wklej surowy tekst..." />
        </label>
        
        <div style={{ 
          padding: 12, 
          background: 'rgba(59, 130, 246, 0.1)', 
          border: '1px solid rgba(59, 130, 246, 0.3)', 
          borderRadius: 8,
          fontSize: 13
        }}>
          <strong>🤖 AI na poziomie studenckim wygeneruje:</strong>
          <div style={{ marginTop: 8, display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8 }}>
            <div>
              <strong>� Inteligentne modele AI:</strong>
              <br />• Qwen2.5 14B - najlepszy do zadań studenckich
              <br />• Llama 3.1 8B - szybka alternatywa
              <br />• Automatyczny wybór na podstawie zadania
              <br /><br />
              <strong>🧹 Zaawansowane czyszczenie:</strong>
              <br />• Usuwa zacinanie i poprawki profesora
              <br />• Rozpoznaje kontekst akademicki
              <br />• Zachowuje terminologię naukową
            </div>
            <div>
              <strong>📚 Materiały studenckie:</strong>
              <br />• Notatki na poziomie uniwersyteckim
              <br />• Fiszki na różnych poziomach Bloom'a
              <br />• Pytania analityczne i syntetyzujące
              <br /><br />
              <strong>🔍 Weryfikacja faktów:</strong>
              <br />• Prawdziwy web search (DuckDuckGo)
              <br />• AI sprawdza wiarygodność źródeł
              <br />• Ocena poziomu pewności informacji
            </div>
          </div>
          <div style={{ marginTop: 8, fontSize: 12, opacity: 0.8 }}>
            ⚡ <strong>Szybkość:</strong> Qwen2.5 ~3-5s, Llama3.1 ~2-3s (zależnie od długości tekstu)
          </div>
        </div>        <button type="submit">🚀 Przetwórz i wygeneruj materiały AI</button>
      </form>
      <p style={{ marginTop: 8, opacity: .8 }}>Status: {status}</p>
      {error && (
        <div style={{ marginTop: 8, padding: 12, background: 'rgba(239, 68, 68, 0.1)', border: '1px solid rgba(239, 68, 68, 0.3)', borderRadius: 8, maxWidth: 600 }}>
          <strong style={{ color: '#ef4444' }}>Błąd:</strong>
          <p style={{ marginTop: 4, fontSize: 14, whiteSpace: 'pre-wrap' }}>{error}</p>
          <p style={{ marginTop: 8, fontSize: 12, opacity: 0.7 }}>
            Sprawdź konsolę (F12) dla szczegółów. Jeśli problem dotyczy transkrypcji, spróbuj:
            <br />• Użyć krótszego nagrania
            <br />• Zmienić model Whisper w ustawieniach (tiny = najszybszy)
            <br />• Sprawdzić jakość pliku audio
          </p>
        </div>
      )}
      {progress && (
        <div style={{ marginTop:8, maxWidth:600 }}>
          <div style={{ display:'flex', justifyContent:'space-between', fontSize:12, opacity:.8 }}>
            <span>Etap: {progress.phase}</span>
            <span>{Math.round(progress.value)}%</span>
          </div>
          <div style={{ height:8, background:'#222', border:'1px solid #333', borderRadius:6, overflow:'hidden' }}>
            <div style={{ width: `${Math.max(0, Math.min(100, progress.value))}%`, height:'100%', background:'#3b82f6' }} />
          </div>
        </div>
      )}
    </section>
  )
}
