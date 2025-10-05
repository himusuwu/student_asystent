import { useEffect, useMemo, useState } from 'react'
import { motion } from 'framer-motion'
import { getSettings, setSettings, type AiMode, type AiModel } from '@/stores/settings'
import { buildExportFiles } from '@/lib/export'
import { githubUpsertFiles } from '@/lib/github'
import { githubDeviceCode, githubPollToken } from '@/lib/githubAuth'
import { useToast } from '@/hooks/use-toast'
import { subscribe, getLogs, clearLogs, log } from '@/lib/logs'
import { resetDatabase } from '@/lib/repo'
import type * as AiMod from '@/lib/ai'
import { Button } from '@/components/ui/Button'
import { Input } from '@/components/ui/Input'
import {
  Bot,
  Cloud,
  Rocket,
  Brain,
  Waves,
  Settings as SettingsIcon,
  Server,
  Activity,
  Github,
  KeyRound,
  Download,
  ShieldCheck,
  Trash2,
  ClipboardList,
  Copy,
  RefreshCw,
  Sparkles,
  BookOpen,
  HardDrive,
} from 'lucide-react'

export default function Settings() {
  const [aiMode, setAiMode] = useState<AiMode>('local')
  const [aiModel, setAiModel] = useState<AiModel>('auto')
  const [githubRepo, setGithubRepo] = useState('')
  const [githubToken, setGithubToken] = useState('')
  const [githubBranch, setGithubBranch] = useState('main')
  const [githubClientId, setGithubClientId] = useState('')
  const [storeTokenInSession, setStoreTokenInSession] = useState(false)
  const { toast } = useToast()
  const [whisperModel, setWhisperModel] = useState<'tiny'|'base'|'small'>('tiny')
  const [whisperLanguage, setWhisperLanguage] = useState<string>('pl')
  const [whisperEngine, setWhisperEngine] = useState<'transformers'|'whisper-cpp'>('whisper-cpp')
  const [forceWasm, setForceWasm] = useState<boolean>(false)
  const [hfMirror, setHfMirror] = useState<'official'|'mirror'>('official')
  const [modelSource, setModelSource] = useState<'remote'|'local'>('remote')
  const [localModelBase, setLocalModelBase] = useState<string>('/models')
  const [transcriptionMode, setTranscriptionMode] = useState<'auto'|'backend'|'browser'>('auto')
  const [backendUrl, setBackendUrl] = useState<string>('http://localhost:3001')
  const [backendStatus, setBackendStatus] = useState<'checking'|'online'|'offline'>('checking')
  const [logs, setLogs] = useState<string[]>([])

  const fadeIn = (delay = 0) => ({
    initial: { opacity: 0, y: 24 },
    whileInView: { opacity: 1, y: 0 },
    viewport: { once: true, margin: '-20%' },
    transition: { duration: 0.6, ease: 'easeOut' as const, delay },
  })

  useEffect(() => {
    const s = getSettings()
    setAiMode(s.aiMode)
    setAiModel(s.aiModel ?? 'auto')
    setGithubRepo(s.githubRepo ?? '')
    setGithubToken(s.githubToken ?? '')
    setGithubBranch(s.githubBranch ?? 'main')
    setWhisperModel((s as any).whisperModel ?? 'tiny')
    setWhisperLanguage((s as any).whisperLanguage ?? 'pl')
    setWhisperEngine(((s as any).whisperEngine ?? 'whisper-cpp') as any)
    setForceWasm(!!(s as any).forceWasm)
    setHfMirror(((s as any).hfMirror ?? 'official') as any)
    setModelSource(((s as any).modelSource ?? 'remote') as any)
    setLocalModelBase((s as any).localModelBase ?? '/models')
    setTranscriptionMode(((s as any).transcriptionMode ?? 'auto') as any)
    setBackendUrl((s as any).backendUrl ?? 'http://localhost:3001')
    
    // Sprawdź status backendu
    checkBackend((s as any).backendUrl ?? 'http://localhost:3001')
    
    try {
      const envClient = localStorage.getItem('student-asystent:gh-client-id') || ''
      setGithubClientId(envClient)
    } catch {}
    // logs subscribe
    setLogs(getLogs())
    const unsub = subscribe((line) => setLogs(l => [...l, line]))
    return () => { unsub() }
  }, [])

  function save() {
    setSettings({ 
      aiMode, 
      aiModel,
      githubRepo, 
      githubToken: storeTokenInSession ? undefined : githubToken, 
      githubBranch, 
      whisperModel, 
      whisperLanguage, 
      whisperEngine,
      forceWasm, 
      hfMirror, 
      modelSource, 
      localModelBase,
      transcriptionMode,
      backendUrl
    })
    if (storeTokenInSession) sessionStorage.setItem('student-asystent:gh-token', githubToken)
    localStorage.setItem('student-asystent:gh-client-id', githubClientId)
    toast({ description: 'Zapisano ustawienia' })
    log(`Ustawienia zapisane (AI: ${aiMode}/${aiModel}, Whisper: ${whisperEngine}/${whisperModel}, Transkrypcja: ${transcriptionMode})`)
  }

  async function checkBackend(url: string) {
    setBackendStatus('checking')
    try {
      const response = await fetch(`${url}/health`, { 
        method: 'GET',
        signal: AbortSignal.timeout(2000)
      })
      if (response.ok) {
        setBackendStatus('online')
        log(`Backend dostępny: ${url}`)
      } else {
        setBackendStatus('offline')
      }
    } catch {
      setBackendStatus('offline')
    }
  }

  async function syncGithub() {
    try {
      const files = await buildExportFiles()
      await githubUpsertFiles(files)
      toast({ description: `Zsynchronizowano ${files.length} plików do GitHub` })
      log(`GitHub sync: ${files.length} plików`) 
    } catch (e: any) {
      toast({ variant: 'destructive', description: `Błąd synchronizacji: ${e?.message ?? e}` })
      log(`GitHub sync błąd: ${e?.message ?? e}`)
    }
  }

  async function testGithub() {
    try {
      // Dry-run: list files that would be sent
      const files = await buildExportFiles()
      const preview = files.slice(0, 5).map(f => `- ${f.path} (${f.content.length} bajtów)`).join('\n')
      toast({ description: `Połączenie OK. Plików: ${files.length}` })
      log(`Test GitHub OK: ${files.length} plików`)
    } catch (e: any) {
      toast({ variant: 'destructive', description: `Błąd testu: ${e?.message ?? e}` })
      log(`Test GitHub błąd: ${e?.message ?? e}`)
    }
  }

  async function loginGithub() {
    try {
      if (!githubClientId) return alert('Podaj GitHub OAuth Client ID')
      const dc = await githubDeviceCode(githubClientId)
  toast({ description: `Autoryzuj w przeglądarce: ${dc.user_code}` })
  log(`OAuth: wysłano user_code ${dc.user_code}`)
      const token = await githubPollToken(githubClientId, dc.device_code, dc.interval)
      setGithubToken(token)
      if (storeTokenInSession) sessionStorage.setItem('student-asystent:gh-token', token)
      log('OAuth: otrzymano token')
    } catch (e: any) {
  toast({ variant: 'destructive', description: `Błąd logowania OAuth: ${e?.message ?? e}` })
      log(`OAuth błąd: ${e?.message ?? e}`)
    }
  }

  async function handleResetDatabase() {
    const confirmed = window.confirm(
      '⚠️ UWAGA: To usunie WSZYSTKIE dane!\n\n' +
      '• Wszystkie przedmioty\n' +
      '• Wszystkie wykłady\n' +
      '• Wszystkie notatki\n' +
      '• Wszystkie fiszki\n' +
      '• Wszystkie quizy\n' +
      '• Historie czatu\n\n' +
      'Czy na pewno chcesz kontynuować?'
    )
    
    if (!confirmed) return
    
    try {
      await resetDatabase()
      toast({ description: '✅ Baza danych została zresetowana' })
      log('[Settings] Baza danych zresetowana')
      
      // Odśwież stronę po 1 sekundzie
      setTimeout(() => {
        window.location.reload()
      }, 1000)
    } catch (err: any) {
      toast({ variant: 'destructive', description: `❌ Błąd resetowania: ${err?.message || err}` })
      log(`[Settings] Błąd resetowania: ${err}`)
    }
  }

  const aiModeOptions: Array<{
    value: AiMode
    title: string
    description: string
    icon: typeof Bot
  }> = [
    {
      value: 'local',
      title: 'Tryb lokalny',
      description: 'Dane pozostają na urządzeniu. Idealne dla prywatnych notatek.',
      icon: Bot,
    },
    {
      value: 'cloud',
      title: 'Tryb chmurowy',
      description: 'Wykorzystaj darmowe limity Cloudflare do cięższych zadań.',
      icon: Cloud,
    },
  ]

  const aiModelLabels: Record<AiModel, string> = {
    auto: 'Auto (inteligentny wybór)',
    'phi3.5:3.8b': 'Phi-3.5 (3.8B – najszybszy)',
    'llama3.1:8b': 'Llama 3.1 (8B – balans)',
    'qwen2.5:14b': 'Qwen2.5 (14B – najlepszy)',
  }

  const aiModelHints: Record<AiModel, { tone: string; message: string }> = {
    auto: { tone: 'text-emerald-500', message: '🎯 Automatyczny dobór modelu na podstawie kontekstu.' },
    'phi3.5:3.8b': { tone: 'text-amber-500', message: '⚡ Ekspresowe odpowiedzi – idealne do szybkich zadań.' },
    'llama3.1:8b': { tone: 'text-indigo-500', message: '🚀 Zbalansowana jakość i czas odpowiedzi.' },
    'qwen2.5:14b': { tone: 'text-violet-500', message: '🎓 Najwyższa jakość dla ambitnych projektów.' },
  }

  const backendStatusMeta = useMemo(() => {
    if (backendStatus === 'online') return { label: 'Backend online', tone: 'text-emerald-400', chip: 'bg-emerald-500/15 border border-emerald-400/60 text-emerald-300' }
    if (backendStatus === 'offline') return { label: 'Backend offline', tone: 'text-rose-400', chip: 'bg-rose-500/15 border border-rose-400/60 text-rose-300' }
  return { label: 'Sprawdzam…', tone: 'text-slate-300', chip: 'bg-surface-muted border border-surface-border text-white/80' }
  }, [backendStatus])

  return (
    <div className="space-y-12">
      <motion.section {...fadeIn(0)} className="relative overflow-hidden rounded-3xl border border-white/10 bg-gradient-to-br from-brand-primary/80 via-violet-500/70 to-slate-900/85 p-8 text-white shadow-[0_32px_80px_rgba(79,70,229,0.35)]">
        <div className="absolute -left-24 -top-24 h-56 w-56 rounded-full bg-brand-glow/30 blur-3xl" aria-hidden />
        <div className="absolute -right-16 -bottom-28 h-64 w-64 rounded-full bg-brand-primary/25 blur-3xl" aria-hidden />

        <div className="relative z-10 grid gap-8 lg:grid-cols-[minmax(0,1.6fr)_minmax(0,1fr)]">
          <div className="space-y-6">
            <div className="space-y-4">
              <span className="inline-flex items-center gap-2 rounded-full border border-surface-border bg-surface-muted px-4 py-2 text-xs font-semibold uppercase tracking-[0.35em] text-white/80">
                Panel konfiguracji StudyFlow
              </span>
              <h1 className="text-4xl font-semibold leading-tight sm:text-5xl">
                Dostosuj silniki AI, transkrypcję i integracje zgodnie ze swoim przepływem pracy.
              </h1>
              <p className="max-w-2xl text-sm text-white/80 sm:text-base">
                Ustaw preferowany tryb działania, zarządzaj modelem Whisper, połącz konto GitHub i monitoruj logi systemowe. Wszystko w jednym miejscu.
              </p>
            </div>

            <div className="grid gap-4 sm:grid-cols-3">
              {[
                {
                  label: 'Tryb AI',
                  value: aiMode === 'local' ? 'Lokalny (Ollama)' : 'Chmura (Cloudflare)',
                  icon: Bot,
                },
                {
                  label: 'Silnik modelu',
                  value: aiModelLabels[aiModel],
                  icon: Brain,
                },
                {
                  label: 'Status backendu',
                  value: backendStatusMeta.label,
                  icon: Server,
                },
              ].map(card => (
                <div key={card.label} className="rounded-3xl border border-surface-border bg-surface-muted px-5 py-4 backdrop-blur-xl">
                  <div className="flex items-center gap-3">
                    <span className="inline-flex h-10 w-10 items-center justify-center rounded-2xl bg-surface-muted text-white">
                      <card.icon className="h-5 w-5" aria-hidden />
                    </span>
                    <div className="text-left">
                      <p className="text-xs font-semibold uppercase tracking-wide text-white/70">{card.label}</p>
                      <p className="mt-1 text-sm font-medium leading-tight text-white">{card.value}</p>
                    </div>
                  </div>
                </div>
              ))}
            </div>

            <div className="flex flex-wrap items-center gap-3 text-xs sm:text-sm">
              <span className="inline-flex items-center gap-2 rounded-full border border-surface-border bg-surface-muted px-4 py-2 text-white/80">
                <SettingsIcon className="h-4 w-4" aria-hidden />
                Profile StudyFlow zapisują się automatycznie na tym urządzeniu
              </span>
              <span className="inline-flex items-center gap-2 rounded-full border border-surface-border bg-surface-muted px-4 py-2 text-white/80">
                <ShieldCheck className="h-4 w-4" aria-hidden />
                Tokeny GitHub możesz przechowywać tymczasowo lub lokalnie
              </span>
            </div>
          </div>

          <div className="rounded-3xl border border-surface-border bg-surface-muted p-6 backdrop-blur-xl">
            <div className="space-y-4 text-sm text-white/80">
              <div className="flex items-center gap-3">
                <span className={`inline-flex items-center gap-2 rounded-full px-3 py-1 text-xs font-semibold uppercase tracking-[0.25em] ${backendStatusMeta.chip}`}>
                  <Activity className="h-4 w-4" aria-hidden />
                  {backendStatusMeta.label}
                </span>
              </div>
              <p>
                Sprawdź, czy serwer backendu działa, aby przyspieszyć transkrypcję i pobieranie modeli. Lokalny backend pozwala przenieść obciążenie z przeglądarki.
              </p>
              <div className="grid gap-3 text-sm">
                <div className="flex items-center gap-3">
                  <Sparkles className="h-4 w-4" aria-hidden />
                  <span>Adaptive AI automatycznie dopasowuje model do polecenia.</span>
                </div>
                <div className="flex items-center gap-3">
                  <BookOpen className="h-4 w-4" aria-hidden />
                  <span>Zapisuj notatki, fiszki i logi pracy – zawsze masz do nich wgląd.</span>
                </div>
                <div className="flex items-center gap-3">
                  <HardDrive className="h-4 w-4" aria-hidden />
                  <span>Modele możesz ładować z CDN lub własnego dysku /public.</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </motion.section>

      <motion.section {...fadeIn(0.05)} className="grid gap-6 2xl:grid-cols-[minmax(0,1.3fr)_minmax(0,1fr)]">
  <div className="rounded-3xl border border-surface-border bg-surface-card p-6 shadow-soft dark:border-slate-800/60 dark:bg-slate-900/70">
          <header className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <h2 className="text-xl font-semibold text-slate-900 dark:text-white">Tryb asystenta AI</h2>
              <p className="text-sm text-slate-500 dark:text-slate-300">Wybierz źródło modeli i sposób działania StudyFlow AI.</p>
            </div>
            <span className="inline-flex items-center gap-2 rounded-full bg-brand-subtle px-4 py-2 text-xs font-semibold uppercase tracking-[0.25em] text-brand-emphasis">
              Inteligentny routing
            </span>
          </header>

          <div className="mt-6 grid gap-4 sm:grid-cols-2">
            {aiModeOptions.map(option => (
              <label
                key={option.value}
                className={`group relative flex cursor-pointer flex-col gap-3 rounded-2xl border px-4 py-4 transition-all duration-300 ${
                  aiMode === option.value
                    ? 'border-brand-emphasis/70 bg-brand-subtle text-brand-emphasis shadow-soft'
                    : 'border-surface-border bg-surface-panel text-slate-600 hover:border-brand-emphasis/40 hover:bg-surface-card dark:border-slate-700 dark:bg-slate-900/60'
                }`}
              >
                <input
                  type="radio"
                  name="ai-mode"
                  value={option.value}
                  checked={aiMode === option.value}
                  onChange={() => setAiMode(option.value)}
                  className="sr-only"
                />
                <div className="flex items-center gap-3">
                  <span className="inline-flex h-11 w-11 items-center justify-center rounded-2xl bg-surface-card text-brand-emphasis shadow-soft dark:bg-slate-900/80">
                    <option.icon className="h-5 w-5" aria-hidden />
                  </span>
                  <div>
                    <p className="text-base font-semibold leading-tight">{option.title}</p>
                    <p className="mt-1 text-xs text-slate-500 dark:text-slate-300">{option.description}</p>
                  </div>
                </div>
              </label>
            ))}
          </div>

          {aiMode === 'local' && (
            <div className="mt-6 space-y-3 rounded-2xl border border-brand-emphasis/20 bg-brand-subtle/40 p-5 text-sm text-slate-700 dark:text-slate-200">
              <label className="block text-sm font-semibold text-brand-emphasis">
                Model AI (Ollama)
                <select
                  value={aiModel}
                  onChange={event => setAiModel(event.target.value as AiModel)}
                  className="mt-2 h-12 w-full rounded-xl border border-brand-emphasis/20 bg-surface-card px-4 text-sm font-medium shadow-inner focus-visible:ring-brand dark:bg-slate-900/60"
                >
                  {Object.entries(aiModelLabels).map(([value, label]) => (
                    <option key={value} value={value}>
                      {label}
                    </option>
                  ))}
                </select>
              </label>
              <p className={`text-sm font-medium ${aiModelHints[aiModel].tone}`}>{aiModelHints[aiModel].message}</p>
            </div>
          )}

          <div className="mt-6 grid gap-4 sm:grid-cols-2">
            <label className="space-y-2 text-sm font-semibold text-slate-600 dark:text-slate-200">
              Źródło modeli
              <select
                value={modelSource}
                onChange={event => setModelSource(event.target.value as any)}
                className="h-12 w-full rounded-xl border border-surface-border bg-surface-card px-4 text-sm font-medium shadow-inner focus-visible:ring-brand dark:border-slate-700 dark:bg-slate-900/60 dark:text-slate-100"
              >
                <option value="remote">Zdalne (HF lub Mirror CDN)</option>
                <option value="local">Lokalne (folder /public)</option>
              </select>
            </label>

            <label className="space-y-2 text-sm font-semibold text-slate-600 dark:text-slate-200">
              Repozytorium modeli
              <select
                value={hfMirror}
                onChange={event => setHfMirror(event.target.value as any)}
                className="h-12 w-full rounded-xl border border-surface-border bg-surface-card px-4 text-sm font-medium shadow-inner focus-visible:ring-brand dark:border-slate-700 dark:bg-slate-900/60 dark:text-slate-100"
              >
                <option value="official">Hugging Face (domyślne)</option>
                <option value="mirror">Mirror CDN</option>
              </select>
            </label>
          </div>

          {modelSource === 'local' && (
            <div className="mt-4 space-y-2 rounded-2xl border border-surface-border bg-surface-panel p-4 text-sm shadow-inner dark:border-slate-700 dark:bg-slate-900/60">
              <label className="flex flex-col gap-2 font-semibold text-slate-600 dark:text-slate-200">
                Ścieżka bazowa modeli
                <Input value={localModelBase} onChange={event => setLocalModelBase(event.target.value)} placeholder="/models" className="h-11 rounded-xl" />
              </label>
              <p className="text-xs text-slate-500 dark:text-slate-300">
                Umieść pliki (np. <code className="rounded bg-slate-800/80 px-2 py-1 text-xs text-white">Xenova/whisper-base</code>) w tej ścieżce i serwuj statycznie, aby ominąć CDN.
              </p>
            </div>
          )}

          <div className="mt-4 flex flex-wrap items-center gap-4 text-sm text-slate-600 dark:text-slate-300">
            <label className="inline-flex items-center gap-2">
              <input
                type="checkbox"
                checked={forceWasm}
                onChange={event => setForceWasm(event.target.checked)}
                className="h-4 w-4 rounded border border-slate-300 text-brand-emphasis focus:ring-brand"
              />
              Wymuś WebAssembly (bez GPU)
            </label>
            <label className="inline-flex items-center gap-2">
              <span>Język transkrypcji:</span>
              <select
                value={whisperLanguage}
                onChange={event => setWhisperLanguage(event.target.value)}
                className="h-9 rounded-lg border border-surface-border bg-surface-card px-3 text-sm font-medium shadow-inner focus-visible:ring-brand dark:border-slate-700 dark:bg-slate-900/60 dark:text-slate-100"
              >
                <option value="pl">Polski</option>
                <option value="en">English</option>
                <option value="auto">Auto-detect</option>
              </select>
            </label>
          </div>
        </div>

        <div className="flex flex-col gap-6">
          <div className="rounded-3xl border border-surface-border bg-surface-card p-6 shadow-soft dark:border-slate-800/60 dark:bg-slate-900/70">
            <h2 className="text-xl font-semibold text-slate-900 dark:text-white">Silnik transkrypcji</h2>
            <p className="mt-1 text-sm text-slate-500 dark:text-slate-300">Zarządzaj ustawieniami Whisper oraz przełączaj między wersją Metal GPU i ONNX.</p>

            <div className="mt-6 space-y-4">
              <label className="flex flex-col gap-2 text-sm font-semibold text-slate-600 dark:text-slate-200">
                Silnik transkrypcji
                <select
                  value={whisperEngine}
                  onChange={event => setWhisperEngine(event.target.value as any)}
                  className="h-12 rounded-xl border border-surface-border bg-surface-card px-4 text-sm font-medium shadow-inner focus-visible:ring-brand dark:border-slate-700 dark:bg-slate-900/60 dark:text-slate-100"
                >
                  <option value="whisper-cpp">whisper.cpp (Metal GPU)</option>
                  <option value="transformers">transformers.js (uniwersalny)</option>
                </select>
              </label>

              <p className="text-xs text-slate-500 dark:text-slate-300">
                {whisperEngine === 'whisper-cpp'
                  ? '⚡ Najszybszy silnik na Apple Silicon – korzysta z GPU i modeli GGML.'
                  : '🔧 Uniwersalny silnik działający w przeglądarce i Node.js z użyciem modeli ONNX.'}
              </p>

              <label className="flex flex-col gap-2 text-sm font-semibold text-slate-600 dark:text-slate-200">
                Model Whisper
                <select
                  value={whisperModel}
                  onChange={event => setWhisperModel(event.target.value as any)}
                  className="h-12 rounded-xl border border-surface-border bg-surface-card px-4 text-sm font-medium shadow-inner focus-visible:ring-brand dark:border-slate-700 dark:bg-slate-900/60 dark:text-slate-100"
                >
                  <option value="tiny">Tiny (najszybszy)</option>
                  <option value="base">Base (balans)</option>
                  <option value="small">Small (najdokładniejszy)</option>
                </select>
              </label>

              <div className="rounded-2xl border border-surface-border bg-surface-panel p-4 text-xs text-slate-500 shadow-inner dark:border-slate-700 dark:bg-slate-900/60 dark:text-slate-300">
                {whisperEngine === 'whisper-cpp' ? (
                  <span>ℹ️ Modele GGML są pobrane lokalnie: tiny ✓, base ✓, small ✓</span>
                ) : (
                  <span>
                    ℹ️ Przeglądarka wymaga modeli ONNX.{' '}
                    {whisperModel === 'tiny' && <span className="text-amber-500">Upewnij się, że katalog <code className="rounded bg-slate-800/80 px-2 py-0.5 text-amber-100">whisper-tiny/onnx</code> jest dostępny.</span>}
                    {whisperModel === 'base' && <span className="text-emerald-500"> Model base jest gotowy w pakiecie.</span>}
                    {whisperModel === 'small' && <span className="text-emerald-500"> Model small dostępny w ONNX.</span>}
                  </span>
                )}
              </div>
            </div>
          </div>

          <div className="rounded-3xl border border-surface-border bg-surface-card p-6 shadow-soft dark:border-slate-800/60 dark:bg-slate-900/70">
            <h3 className="text-lg font-semibold text-slate-900 dark:text-white">Szybkie akcje</h3>
            <p className="mt-1 text-sm text-slate-500 dark:text-slate-300">Wykonaj diagnostykę i załaduj modele z wyprzedzeniem.</p>

            <div className="mt-6 flex flex-col gap-3">
              <Button
                variant="surface"
                className="justify-start gap-3"
                leftIcon={<RefreshCw className="h-4 w-4" aria-hidden />}
                onClick={() => checkBackend(backendUrl)}
              >
                Sprawdź ponownie status backendu
              </Button>
              <Button
                variant="surface"
                className="justify-start gap-3"
                leftIcon={<Rocket className="h-4 w-4" aria-hidden />}
                onClick={async () => {
                  try {
                    const mod = (await import('@/lib/ai')) as typeof AiMod
                    await mod.preloadWhisperModel?.(() => undefined)
                    toast({ description: 'Model Whisper został załadowany (preload).' })
                  } catch (error: any) {
                    toast({ variant: 'destructive', description: `Preload nieudany: ${error?.message ?? error}` })
                  }
                }}
              >
                Wykonaj preload modelu (test)
              </Button>
              <div className="rounded-2xl border border-dashed border-surface-border bg-surface-panel p-4 text-xs text-slate-500 dark:border-slate-700 dark:bg-slate-900/60 dark:text-slate-300">
                <p>💡 Preload skraca pierwsze zapytanie transkrypcji i usprawnia działanie w trybie offline.</p>
              </div>
            </div>
          </div>
        </div>
      </motion.section>

  <motion.section {...fadeIn(0.08)} className="rounded-3xl border border-surface-border bg-surface-card p-6 shadow-soft dark:border-slate-800/60 dark:bg-slate-900/70">
        <header className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h2 className="text-xl font-semibold text-slate-900 dark:text-white">Tryb transkrypcji i backend</h2>
            <p className="text-sm text-slate-500 dark:text-slate-300">Wybierz, gdzie mają być przetwarzane nagrania audio oraz skonfiguruj połączenie z serwerem.</p>
          </div>
          <span className="inline-flex items-center gap-2 rounded-full bg-brand-subtle px-4 py-2 text-xs font-semibold uppercase tracking-[0.25em] text-brand-emphasis">
            Adaptacyjny fallback
          </span>
        </header>

        <div className="mt-6 grid gap-4 sm:grid-cols-3">
          {[
            {
              value: 'auto',
              title: 'Auto',
              description: 'Najpierw backend, gdy niedostępny przełącz na przeglądarkę.',
            },
            {
              value: 'backend',
              title: 'Tylko backend',
              description: 'Wymaga działającego serwera Node.js.',
            },
            {
              value: 'browser',
              title: 'Tylko przeglądarka',
              description: 'Bez zależności – wszystko lokalnie.',
            },
          ].map(option => (
            <label
              key={option.value}
              className={`group relative flex cursor-pointer flex-col gap-3 rounded-2xl border px-4 py-4 transition-all duration-300 ${
                transcriptionMode === option.value
                  ? 'border-brand-emphasis/70 bg-brand-subtle text-brand-emphasis shadow-soft'
                  : 'border-surface-border bg-surface-panel text-slate-600 hover:border-brand-emphasis/40 hover:bg-surface-card dark:border-slate-700 dark:bg-slate-900/60'
              }`}
            >
              <input
                type="radio"
                name="transcription-mode"
                value={option.value}
                checked={transcriptionMode === option.value}
                onChange={() => setTranscriptionMode(option.value as any)}
                className="sr-only"
              />
              <div className="flex items-center justify-between gap-3">
                <div>
                  <p className="text-base font-semibold leading-tight">{option.title}</p>
                  <p className="mt-1 text-xs text-slate-500 dark:text-slate-300">{option.description}</p>
                </div>
                <Waves className={`h-5 w-5 ${transcriptionMode === option.value ? 'text-brand-emphasis' : 'text-slate-400'} transition-colors`} aria-hidden />
              </div>
            </label>
          ))}
        </div>

        <div className="mt-6 grid gap-4 lg:grid-cols-[minmax(0,2fr)_minmax(0,1fr)]">
          <div className="rounded-2xl border border-surface-border bg-surface-card p-5 dark:border-slate-700 dark:bg-slate-900/60">
            <label className="flex flex-col gap-2 text-sm font-semibold text-slate-600 dark:text-slate-200">
              URL backendu
              <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
                <Input
                  value={backendUrl}
                  onChange={event => setBackendUrl(event.target.value)}
                  placeholder="http://localhost:3001"
                  className="h-11 flex-1 rounded-xl"
                />
                <Button variant="surface" className="gap-2" onClick={() => checkBackend(backendUrl)} leftIcon={<Server className="h-4 w-4" aria-hidden />}>
                  Testuj połączenie
                </Button>
              </div>
            </label>
            <p className="mt-3 text-xs text-slate-500 dark:text-slate-300">
              Backend przyspiesza transkrypcję i umożliwia zapisywanie modeli lokalnie. Czas oczekiwania na odpowiedź: 2 s.
            </p>
            <div className="mt-4 flex items-center gap-2 text-sm">
              <span>Status:</span>
              {backendStatus === 'checking' && <span className="text-slate-500">Sprawdzam…</span>}
              {backendStatus === 'online' && <span className="text-emerald-500">✅ Dostępny</span>}
              {backendStatus === 'offline' && <span className="text-rose-500">❌ Niedostępny</span>}
            </div>
          </div>

          <div className="rounded-2xl border border-dashed border-surface-border bg-surface-panel p-5 text-sm text-slate-600 shadow-inner dark:border-slate-700 dark:bg-slate-900/60 dark:text-slate-300">
            <p className="font-semibold text-slate-700 dark:text-slate-200">Jak uruchomić backend?</p>
            <ol className="mt-3 list-decimal space-y-2 pl-5 text-xs">
              <li>Otwórz terminal i przejdź do folderu <code className="rounded bg-slate-800/80 px-1.5 py-0.5 text-white">server</code>.</li>
              <li>Zainstaluj zależności: <code className="rounded bg-slate-800/80 px-1.5 py-0.5 text-white">npm install</code>.</li>
              <li>Uruchom: <code className="rounded bg-slate-800/80 px-1.5 py-0.5 text-white">npm start</code>.</li>
              <li>Serwer dostępny pod adresem <code className="rounded bg-slate-800/80 px-1.5 py-0.5 text-white">http://localhost:3001</code>.</li>
            </ol>
            <div className="mt-3 rounded-xl bg-emerald-500/10 px-4 py-3 text-xs text-emerald-600 dark:text-emerald-300">
              💡 Z backendem interfejs pozostaje responsywny podczas długich transkrypcji.
            </div>
          </div>
        </div>
      </motion.section>

  <motion.section {...fadeIn(0.12)} className="rounded-3xl border border-surface-border bg-surface-card p-6 shadow-soft dark:border-slate-800/60 dark:bg-slate-900/70">
        <header className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h2 className="text-xl font-semibold text-slate-900 dark:text-white">Synchronizacja z GitHub</h2>
            <p className="text-sm text-slate-500 dark:text-slate-300">Eksportuj notatki i fiszki jako pliki Markdown do prywatnego repozytorium.</p>
          </div>
          <span className="inline-flex items-center gap-2 rounded-full bg-brand-subtle px-4 py-2 text-xs font-semibold uppercase tracking-[0.25em] text-brand-emphasis">
            Bezpieczny backup
          </span>
        </header>

        <div className="mt-6 grid gap-4 md:grid-cols-2">
          <label className="flex flex-col gap-2 text-sm font-semibold text-slate-600 dark:text-slate-200">
            Repozytorium (owner/repo)
            <Input value={githubRepo} onChange={event => setGithubRepo(event.target.value)} placeholder="user/private-notes" className="h-11 rounded-xl" />
          </label>
          <label className="flex flex-col gap-2 text-sm font-semibold text-slate-600 dark:text-slate-200">
            Gałąź
            <Input value={githubBranch} onChange={event => setGithubBranch(event.target.value)} placeholder="main" className="h-11 rounded-xl" />
          </label>
          <label className="flex flex-col gap-2 text-sm font-semibold text-slate-600 dark:text-slate-200">
            Token personal access
            <Input value={githubToken} onChange={event => setGithubToken(event.target.value)} placeholder="ghp_..." className="h-11 rounded-xl" />
          </label>
          <label className="flex flex-col gap-2 text-sm font-semibold text-slate-600 dark:text-slate-200">
            GitHub OAuth Client ID
            <Input value={githubClientId} onChange={event => setGithubClientId(event.target.value)} placeholder="Iv1_..." className="h-11 rounded-xl" />
          </label>
        </div>

        <div className="mt-4 flex flex-wrap items-center gap-4 text-sm text-slate-600 dark:text-slate-300">
          <label className="inline-flex items-center gap-2">
            <input
              type="checkbox"
              checked={storeTokenInSession}
              onChange={event => setStoreTokenInSession(event.target.checked)}
              className="h-4 w-4 rounded border border-slate-300 text-brand-emphasis focus:ring-brand"
            />
            Przechowuj token tylko w sessionStorage (bez trwałego zapisu)
          </label>
        </div>

        <div className="mt-6 flex flex-wrap gap-3">
          <Button className="gap-2" leftIcon={<KeyRound className="h-4 w-4" aria-hidden />} onClick={loginGithub}>
            Zaloguj przez GitHub (Device Flow)
          </Button>
          <Button variant="surface" className="gap-2" leftIcon={<Download className="h-4 w-4" aria-hidden />} onClick={testGithub}>
            Test połączenia
          </Button>
          <Button variant="surface" className="gap-2" leftIcon={<Github className="h-4 w-4" aria-hidden />} onClick={syncGithub}>
            Synchronizuj (Markdown)
          </Button>
        </div>

        <p className="mt-4 text-xs text-slate-500 dark:text-slate-300">
          Audio i prezentacje nie są synchronizowane – StudyFlow usuwa pliki binarne po transkrypcji, zachowując tylko tekst.
        </p>
      </motion.section>

      <motion.section {...fadeIn(0.16)} className="grid gap-6 lg:grid-cols-[minmax(0,1.2fr)_minmax(0,1fr)]">
        <div className="rounded-3xl border border-amber-400/60 bg-amber-50/80 p-6 shadow-soft dark:border-amber-500/50 dark:bg-amber-500/10">
          <h2 className="text-xl font-semibold text-amber-700 dark:text-amber-200">Zapisz ustawienia</h2>
          <p className="mt-1 text-sm text-amber-700/80 dark:text-amber-100/80">
            Po zmianach kliknij „Zapisz”, aby utrwalić konfigurację. Tokeny przechowywane w sessionStorage zostają zachowane do zamknięcia przeglądarki.
          </p>
          <div className="mt-4 flex flex-wrap gap-3">
            <Button onClick={save} size="lg" leftIcon={<ShieldCheck className="h-4 w-4" aria-hidden />}
              className="rounded-full px-8">
              💾 Zapisz ustawienia
            </Button>
            <Button
              variant="surface"
              className="gap-2"
              leftIcon={<Copy className="h-4 w-4" aria-hidden />} onClick={async () => {
                try {
                  await navigator.clipboard.writeText(
                    JSON.stringify(
                      {
                        aiMode,
                        aiModel,
                        whisperEngine,
                        whisperModel,
                        whisperLanguage,
                        backendUrl,
                      },
                      null,
                      2,
                    ),
                  )
                  toast({ description: 'Skopiowano zrzut konfiguracji.' })
                } catch (error: any) {
                  toast({ variant: 'destructive', description: `Nie udało się skopiować: ${error?.message ?? error}` })
                }
              }}
            >
              Kopiuj konfigurację
            </Button>
          </div>
        </div>

        <div className="rounded-3xl border border-rose-400/60 bg-rose-500/10 p-6 shadow-soft">
          <h3 className="text-lg font-semibold text-rose-600 dark:text-rose-200">⚠️ Strefa niebezpieczna</h3>
          <p className="mt-2 text-sm text-rose-600/80 dark:text-rose-100/80">
            Reset bazy danych usunie wszystkie przedmioty, wykłady, notatki, fiszki, quizy i historię czatów. Operacja jest nieodwracalna.
          </p>
          <Button
            variant="destructive"
            className="mt-4 gap-2"
            leftIcon={<Trash2 className="h-4 w-4" aria-hidden />}
            onClick={handleResetDatabase}
          >
            Resetuj bazę danych
          </Button>
        </div>
      </motion.section>

  <motion.section {...fadeIn(0.18)} className="rounded-3xl border border-surface-border bg-surface-card p-6 shadow-soft dark:border-slate-800/60 dark:bg-slate-900/70">
        <header className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h2 className="text-xl font-semibold text-slate-900 dark:text-white">Logi systemowe</h2>
            <p className="text-sm text-slate-500 dark:text-slate-300">Monitoruj ostatnie działania i kopiuj raporty w przypadku zgłaszania problemów.</p>
          </div>
          <span className="inline-flex items-center gap-2 rounded-full bg-brand-subtle px-4 py-2 text-xs font-semibold uppercase tracking-[0.25em] text-brand-emphasis">
            Audyt działań
          </span>
        </header>

        <div className="mt-6 space-y-4">
          <div className="max-h-64 overflow-auto rounded-2xl border border-surface-border bg-surface-card p-4 font-mono text-xs text-slate-700 shadow-inner dark:border-slate-700 dark:bg-slate-900/70 dark:text-slate-200">
            {logs.length ? logs.map((line, index) => <div key={index}>{line}</div>) : <div>Brak logów</div>}
          </div>
          <div className="flex flex-wrap gap-3">
            <Button
              variant="surface"
              className="gap-2"
              leftIcon={<Trash2 className="h-4 w-4" aria-hidden />}
              onClick={() => {
                clearLogs()
                setLogs([])
              }}
            >
              Wyczyść logi
            </Button>
            <Button
              variant="surface"
              className="gap-2"
              leftIcon={<ClipboardList className="h-4 w-4" aria-hidden />}
              onClick={() => {
                try {
                  navigator.clipboard.writeText(logs.join('\n'))
                  toast({ description: 'Skopiowano logi do schowka.' })
                } catch {
                  toast({ variant: 'destructive', description: 'Nie udało się skopiować logów.' })
                }
              }}
            >
              Kopiuj logi
            </Button>
          </div>
        </div>
      </motion.section>
    </div>
  )
}
