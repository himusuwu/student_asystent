import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { createLecture, saveLectureTab, listSubjects, putTempFile, deleteTempFile } from '@/lib/repo'
import { log } from '@/lib/logs'
import { Button } from '@/components/ui/Button'
import { Input } from '@/components/ui/Input'
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/Card"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/Select"
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/Alert"
import { Upload, FileAudio, X, Loader2, Info, AlertTriangle, Wand2 } from 'lucide-react'

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
  const [audioWarning, setAudioWarning] = useState<{ title: string; message: string; level: 'info' | 'warn' } | null>(null)
  const [isProcessing, setIsProcessing] = useState(false)

  useEffect(() => { (async () => setSubjects(await listSubjects()))() }, [])

  useEffect(() => {
    if (!audio) {
      setAudioWarning(null)
      return
    }
    
    const sizeMB = audio.size / 1024 / 1024
    const estimatedMinutes = sizeMB / 0.7
    
    if (sizeMB > 100) {
      setAudioWarning({
        level: 'warn',
        title: `Duży plik (${sizeMB.toFixed(0)}MB)`,
        message: `Transkrypcja w przeglądarce może zająć ${(estimatedMinutes * 0.7).toFixed(0)}-${(estimatedMinutes * 1.2).toFixed(0)} minut. Zalecane jest użycie backendu.`
      })
    } else if (sizeMB > 20) {
      setAudioWarning({
        level: 'info',
        title: `Plik ${sizeMB.toFixed(0)}MB (~${estimatedMinutes.toFixed(0)} min)`,
        message: `Szacowany czas transkrypcji w przeglądarce: ~${(estimatedMinutes * 0.7).toFixed(0)} min.`
      })
    }
  }, [audio])

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!subjectId) return setStatus('Wybierz przedmiot')
    if (!audio) return setStatus('Dodaj plik audio')
    
    setError(null)
    setIsProcessing(true)
    
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
    } finally {
      setIsProcessing(false)
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
    <div className="space-y-8">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Nowy wykład</h1>
          <p className="text-muted-foreground">
            Prześlij nagranie, a AI zajmie się resztą.
          </p>
        </div>
      </div>

      {error && (
        <Alert variant="destructive">
          <AlertTriangle className="h-4 w-4" />
          <AlertTitle>Błąd</AlertTitle>
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      )}

      <form onSubmit={handleSubmit}>
        <Card>
          <CardHeader>
            <CardTitle>Krok 1: Wybierz przedmiot i plik audio</CardTitle>
            <CardDescription>
              Tytuł wykładu zostanie wygenerowany automatycznie.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            {/* Przedmiot */}
            <div className="space-y-2">
              <label className="text-sm font-medium">Przedmiot</label>
              <Select value={subjectId} onValueChange={setSubjectId} required>
                <SelectTrigger>
                  <SelectValue placeholder="Wybierz przedmiot z listy" />
                </SelectTrigger>
                <SelectContent>
                  {subjects.map(s => (
                    <SelectItem key={s.id} value={s.id}>{s.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* Audio Upload */}
            <div className="space-y-2">
              <label className="text-sm font-medium">Plik audio</label>
              <div
                className={`relative flex flex-col items-center justify-center w-full h-64 border-2 border-dashed rounded-lg cursor-pointer transition-colors ${
                  dragOver ? 'border-primary bg-accent' : 'border-input hover:border-primary/50'
                }`}
                onDragOver={e => { e.preventDefault(); setDragOver(true) }}
                onDragLeave={() => setDragOver(false)}
                onDrop={handleDrop}
              >
                {audio ? (
                  <div className="text-center">
                    <FileAudio className="mx-auto h-12 w-12 text-muted-foreground" />
                    <p className="font-medium mt-2">{audio.name}</p>
                    <p className="text-sm text-muted-foreground">
                      {(audio.size / 1024 / 1024).toFixed(2)} MB
                    </p>
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      onClick={() => setAudio(null)}
                      className="mt-2 text-destructive hover:text-destructive"
                    >
                      <X className="mr-2 h-4 w-4" /> Usuń plik
                    </Button>
                  </div>
                ) : (
                  <div className="text-center">
                    <Upload className="mx-auto h-12 w-12 text-muted-foreground" />
                    <p className="mt-2 text-sm text-muted-foreground">
                      <span className="font-semibold text-primary">Kliknij, aby przesłać</span> lub przeciągnij i upuść
                    </p>
                    <p className="text-xs text-muted-foreground">Obsługiwane formaty: MP3, WAV, M4A, itp.</p>
                    <input
                      type="file"
                      accept="audio/*"
                      onChange={e => setAudio(e.target.files?.[0] || null)}
                      className="sr-only"
                      id="audio-input"
                    />
                    <label htmlFor="audio-input" className="absolute inset-0 w-full h-full cursor-pointer" />
                  </div>
                )}
              </div>

              {audioWarning && (
                <Alert variant={audioWarning.level === 'warn' ? 'destructive' : 'default'}>
                  {audioWarning.level === 'warn' ? <AlertTriangle className="h-4 w-4" /> : <Info className="h-4 w-4" />}
                  <AlertTitle>{audioWarning.title}</AlertTitle>
                  <AlertDescription>{audioWarning.message}</AlertDescription>
                </Alert>
              )}
            </div>
          </CardContent>
          <CardFooter className="flex-col items-start gap-4">
            {isProcessing && progress && (
              <div className="w-full space-y-2">
                <div className="flex justify-between text-sm font-medium">
                  <span>{progress.phase}</span>
                  <span>{progress.value}%</span>
                </div>
                <div className="w-full bg-secondary rounded-full h-2.5">
                  <div
                    className="bg-primary h-2.5 rounded-full transition-all"
                    style={{ width: `${progress.value}%` }}
                  />
                </div>
              </div>
            )}

            {isProcessing && (
              <Alert>
                <Loader2 className="h-4 w-4 animate-spin" />
                <AlertTitle>Przetwarzanie w toku</AlertTitle>
                <AlertDescription>{status}</AlertDescription>
              </Alert>
            )}

            <Button
              type="submit"
              disabled={!subjectId || !audio || isProcessing}
              className="w-full sm:w-auto"
              size="lg"
            >
              <Wand2 className="mr-2 h-5 w-5" />
              Utwórz wykład i transkrybuj
            </Button>
            
            <Card className="w-full bg-secondary/50">
              <CardHeader>
                <CardTitle className="text-base">Co się stanie dalej?</CardTitle>
              </CardHeader>
              <CardContent className="text-sm text-muted-foreground">
                <ul className="list-decimal list-inside space-y-1">
                  <li>Twoje nagranie zostanie przetworzone na tekst.</li>
                  <li>AI automatycznie wygeneruje tytuł dla wykładu.</li>
                  <li>Tekst zostanie oczyszczony i sformatowany.</li>
                  <li>Zostaniesz przekierowany na stronę gotowego wykładu.</li>
                </ul>
              </CardContent>
            </Card>
          </CardFooter>
        </Card>
      </form>
    </div>
  )
}
