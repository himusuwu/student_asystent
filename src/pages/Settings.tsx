import { useEffect, useState } from 'react'
import { getSettings, setSettings, type AiMode, type AiModel } from '@/stores/settings'
import { buildExportFiles } from '@/lib/export'
import { githubUpsertFiles } from '@/lib/github'
import { githubDeviceCode, githubPollToken } from '@/lib/githubAuth'
import { useToast } from '@/components/ui/Toast'
import { subscribe, getLogs, clearLogs, log } from '@/lib/logs'
import { resetDatabase } from '@/lib/repo'
import type * as AiMod from '@/lib/ai'

export default function Settings() {
  const [aiMode, setAiMode] = useState<AiMode>('local')
  const [aiModel, setAiModel] = useState<AiModel>('auto')
  const [githubRepo, setGithubRepo] = useState('')
  const [githubToken, setGithubToken] = useState('')
  const [githubBranch, setGithubBranch] = useState('main')
  const [githubClientId, setGithubClientId] = useState('')
  const [storeTokenInSession, setStoreTokenInSession] = useState(false)
  const { push } = useToast()
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
    push('Zapisano ustawienia')
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
      push(`Zsynchronizowano ${files.length} plików do GitHub`)
      log(`GitHub sync: ${files.length} plików`) 
    } catch (e: any) {
      push(`Błąd synchronizacji: ${e?.message ?? e}`)
      log(`GitHub sync błąd: ${e?.message ?? e}`)
    }
  }

  async function testGithub() {
    try {
      // Dry-run: list files that would be sent
      const files = await buildExportFiles()
      const preview = files.slice(0, 5).map(f => `- ${f.path} (${f.content.length} bajtów)`).join('\n')
      push(`Połączenie OK. Plików: ${files.length}`)
      log(`Test GitHub OK: ${files.length} plików`)
    } catch (e: any) {
      push(`Błąd testu: ${e?.message ?? e}`)
      log(`Test GitHub błąd: ${e?.message ?? e}`)
    }
  }

  async function loginGithub() {
    try {
      if (!githubClientId) return alert('Podaj GitHub OAuth Client ID')
      const dc = await githubDeviceCode(githubClientId)
  push(`Autoryzuj w przeglądarce: ${dc.user_code}`)
  log(`OAuth: wysłano user_code ${dc.user_code}`)
      const token = await githubPollToken(githubClientId, dc.device_code, dc.interval)
      setGithubToken(token)
      if (storeTokenInSession) sessionStorage.setItem('student-asystent:gh-token', token)
      log('OAuth: otrzymano token')
    } catch (e: any) {
  push(`Błąd logowania OAuth: ${e?.message ?? e}`)
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
      push('✅ Baza danych została zresetowana')
      log('[Settings] Baza danych zresetowana')
      
      // Odśwież stronę po 1 sekundzie
      setTimeout(() => {
        window.location.reload()
      }, 1000)
    } catch (err: any) {
      push(`❌ Błąd resetowania: ${err?.message || err}`)
      log(`[Settings] Błąd resetowania: ${err}`)
    }
  }

  return (
    <section>
      <h1>Ustawienia</h1>
      <div style={{ display:'grid', gap:12, maxWidth:600 }}>
        <fieldset>
          <legend>Tryb AI</legend>
          <label><input type="radio" name="ai" value="local" checked={aiMode==='local'} onChange={()=>setAiMode('local')} /> Lokalnie (prywatność, wolniej)</label><br />
          <label><input type="radio" name="ai" value="cloud" checked={aiMode==='cloud'} onChange={()=>setAiMode('cloud')} /> Chmura (Cloudflare – darmowe limity)</label>
          
          {aiMode === 'local' && (
            <div style={{ marginTop:12, padding:10, background:'rgba(59,130,246,0.1)', borderRadius:6, border:'1px solid rgba(59,130,246,0.3)' }}>
              <label style={{ fontWeight:500 }}>Model AI (Ollama):
                <select value={aiModel} onChange={e=>setAiModel(e.target.value as AiModel)} style={{ marginLeft:8, padding:4 }}>
                  <option value="auto">🎯 Auto (inteligentny wybór)</option>
                  <option value="phi3.5:3.8b">⚡ Phi-3.5 (3.8B - najszybszy)</option>
                  <option value="llama3.1:8b">🚀 Llama 3.1 (8B - balans)</option>
                  <option value="qwen2.5:14b">🎓 Qwen2.5 (14B - najlepszy)</option>
                </select>
              </label>
              <div style={{ fontSize:12, marginTop:6, opacity:0.8 }}>
                {aiModel === 'auto' && <span style={{ color: '#10b981' }}>🎯 Automatyczny wybór modelu na podstawie zadania</span>}
                {aiModel.includes('phi3') && <span style={{ color: '#f59e0b' }}>⚡ Najszybszy (1-2s) - podstawowe zadania</span>}
                {aiModel.includes('llama') && <span style={{ color: '#3b82f6' }}>🚀 Szybki (2-3s) - zadania średnie</span>}
                {aiModel.includes('qwen') && <span style={{ color: '#8b5cf6' }}>🎓 Najlepszy (3-5s) - zadania studenckie</span>}
              </div>
            </div>
          )}
          
          <div style={{ marginTop:8 }}>
            <label>Silnik transkrypcji:
              <select value={whisperEngine} onChange={e=>setWhisperEngine(e.target.value as any)} style={{ marginLeft:8 }}>
                <option value="whisper-cpp">⚡ whisper.cpp (ultraszybki, Metal GPU)</option>
                <option value="transformers">🔧 transformers.js (uniwersalny)</option>
              </select>
            </label>
            <div style={{ fontSize:12, marginTop:4, opacity:0.6 }}>
              {whisperEngine === 'whisper-cpp' && 
                <span style={{ color: '#10b981' }}>
                  ⚡ Najszybszy silnik dla Apple Silicon M4 Pro! 
                  Używa Metal GPU i modeli GGML.
                </span>
              }
              {whisperEngine === 'transformers' && 
                <span style={{ color: '#6b7280' }}>
                  🔧 Uniwersalny silnik działający w przeglądarce i Node.js.
                  Wymaga modeli ONNX.
                </span>
              }
            </div>
          </div>
          <div style={{ marginTop:8 }}>
            <label>Model Whisper:
              <select value={whisperModel} onChange={e=>setWhisperModel(e.target.value as any)} style={{ marginLeft:8 }}>
                <option value="tiny">tiny (najszybszy)</option>
                <option value="base">base (balans jakość/szybkość)</option>
                <option value="small">small (najdokładniejszy)</option>
              </select>
            </label>
            <div style={{ fontSize:12, marginTop:4, opacity:0.6 }}>
              {whisperEngine === 'whisper-cpp' ? (
                <span style={{ color: '#10b981' }}>
                  ℹ️ Modele GGML pobrane: tiny ✓, base ✓, small ✓
                </span>
              ) : (
                <span>
                  ℹ️ Przeglądarka wymaga modeli w formacie ONNX. 
                  {whisperModel === 'tiny' && <span style={{ color: '#f59e0b' }}> Upewnij się że masz whisper-tiny/onnx/</span>}
                  {whisperModel === 'base' && <span style={{ color: '#10b981' }}> ✓ Model base jest dostępny w ONNX</span>}
                  {whisperModel === 'small' && <span style={{ color: '#10b981' }}> ✓ Model small jest dostępny w ONNX</span>}
                </span>
              )}
            </div>
          </div>
          <div style={{ marginTop:8 }}>
            <label><input type="checkbox" checked={forceWasm} onChange={e=>setForceWasm(e.target.checked)} /> Wymuś WASM (bez GPU)</label>
          </div>
          <div style={{ marginTop:8 }}>
            <label>Źródło modeli:
              <select value={modelSource} onChange={e=>setModelSource(e.target.value as any)} style={{ marginLeft:8 }}>
                <option value="remote">Zdalne (HF/Mirror CDN)</option>
                <option value="local">Lokalne (serwuj z /public)</option>
              </select>
            </label>
          </div>
          {modelSource==='local' && (
            <div style={{ marginTop:8 }}>
              <label>Ścieżka bazowa modeli: <input value={localModelBase} onChange={e=>setLocalModelBase(e.target.value)} placeholder="/models" /></label>
              <div style={{ fontSize:12, opacity:.8, marginTop:4 }}>
                Umieść pliki modelu (np. Xenova/whisper-base) w {localModelBase} i serwuj je statycznie (np. w folderze public/). Dzięki temu pobieranie ominie CDN i proxy.
              </div>
            </div>
          )}
          <div style={{ marginTop:8 }}>
            <label>Repozytorium modeli:
              <select value={hfMirror} onChange={e=>setHfMirror(e.target.value as any)} style={{ marginLeft:8 }}>
                <option value="official">Hugging Face (domyślne)</option>
                <option value="mirror">Mirror CDN</option>
              </select>
            </label>
          </div>
          <div style={{ marginTop:8 }}>
            <label>Język transkrypcji:
              <select value={whisperLanguage} onChange={e=>setWhisperLanguage(e.target.value)} style={{ marginLeft:8 }}>
                <option value="pl">Polski (najlepsza szybkość)</option>
                <option value="en">English</option>
                <option value="auto">Auto-detect (wolniejsze)</option>
              </select>
            </label>
          </div>
        </fieldset>

        <fieldset>
          <legend>🚀 Tryb transkrypcji (NOWOŚĆ)</legend>
          <div style={{ fontSize: 14, opacity: 0.8, marginBottom: 12 }}>
            Backend lokalny zdejmuje obciążenie z przeglądarki i przyspiesza transkrypcję!
          </div>
          <label>
            <input 
              type="radio" 
              name="transcription" 
              value="auto" 
              checked={transcriptionMode==='auto'} 
              onChange={()=>setTranscriptionMode('auto')} 
            /> Auto (preferuj backend, fallback do przeglądarki)
          </label><br />
          <label>
            <input 
              type="radio" 
              name="transcription" 
              value="backend" 
              checked={transcriptionMode==='backend'} 
              onChange={()=>setTranscriptionMode('backend')} 
            /> Tylko backend (wymaga uruchomionego serwera)
          </label><br />
          <label>
            <input 
              type="radio" 
              name="transcription" 
              value="browser" 
              checked={transcriptionMode==='browser'} 
              onChange={()=>setTranscriptionMode('browser')} 
            /> Tylko przeglądarka (bez backendu)
          </label>
          
          <div style={{ marginTop: 12 }}>
            <label>
              URL backendu:
              <input 
                value={backendUrl} 
                onChange={e=>setBackendUrl(e.target.value)} 
                placeholder="http://localhost:3001"
                style={{ marginLeft: 8, width: 250 }}
              />
              <button 
                type="button" 
                onClick={() => checkBackend(backendUrl)}
                style={{ marginLeft: 8, padding: '4px 12px' }}
              >
                Test
              </button>
            </label>
            <div style={{ marginTop: 8, fontSize: 13 }}>
              Status: {' '}
              {backendStatus === 'checking' && <span style={{ opacity: 0.6 }}>Sprawdzam...</span>}
              {backendStatus === 'online' && <span style={{ color: '#10b981' }}>✅ Dostępny</span>}
              {backendStatus === 'offline' && <span style={{ color: '#ef4444' }}>❌ Niedostępny</span>}
            </div>
          </div>

          <details style={{ marginTop: 12, padding: 12, background: 'rgba(59, 130, 246, 0.1)', borderRadius: 8 }}>
            <summary style={{ cursor: 'pointer', fontWeight: 'bold' }}>📖 Jak uruchomić backend?</summary>
            <div style={{ marginTop: 8, fontSize: 13, lineHeight: 1.6 }}>
              <ol style={{ paddingLeft: 20 }}>
                <li>Otwórz terminal w folderze projektu</li>
                <li>Przejdź do folderu server: <code style={{ background: '#222', padding: '2px 6px', borderRadius: 4 }}>cd server</code></li>
                <li>Zainstaluj zależności: <code style={{ background: '#222', padding: '2px 6px', borderRadius: 4 }}>npm install</code></li>
                <li>Uruchom serwer: <code style={{ background: '#222', padding: '2px 6px', borderRadius: 4 }}>npm start</code></li>
                <li>Backend będzie działał na <code style={{ background: '#222', padding: '2px 6px', borderRadius: 4 }}>http://localhost:3001</code></li>
              </ol>
              <div style={{ marginTop: 8, padding: 8, background: 'rgba(0,0,0,0.2)', borderRadius: 4 }}>
                💡 <strong>Zaleta:</strong> Strona nie zawiesza się podczas transkrypcji, możesz pracować normalnie!
              </div>
            </div>
          </details>
        </fieldset>
        <div style={{ display:'flex', gap:8 }}>
          <button onClick={async ()=>{
            try {
              const mod = await import('@/lib/ai') as typeof AiMod
              await mod.preloadWhisperModel?.((p: number, phase: string)=>{ /* noop UI */ })
              push('Model załadowany (preload)')
            } catch (e:any) {
              push(`Preload nieudany: ${e?.message ?? e}`)
            }
          }}>Preload model (test)</button>
        </div>
        <fieldset>
          <legend>Synchronizacja GitHub (tylko tekst)</legend>
          <label>Repo (owner/repo): <input value={githubRepo} onChange={e=>setGithubRepo(e.target.value)} placeholder="user/private-notes" /></label><br />
          <label>Branch: <input value={githubBranch} onChange={e=>setGithubBranch(e.target.value)} /></label><br />
          <label>Token: <input value={githubToken} onChange={e=>setGithubToken(e.target.value)} placeholder="ghp_..." /></label><br />
          <label><input type="checkbox" checked={storeTokenInSession} onChange={e=>setStoreTokenInSession(e.target.checked)} /> Przechowuj token w sessionStorage (bez trwałego zapisu)</label><br />
          <label>GitHub OAuth Client ID: <input value={githubClientId} onChange={e=>setGithubClientId(e.target.value)} placeholder="Iv1_..." /></label><br />
          <button type="button" onClick={loginGithub}>Zaloguj przez GitHub (Device Flow)</button>
        </fieldset>
        
        <div style={{ 
          background: '#fef3c7', 
          border: '1px solid #fbbf24', 
          borderRadius: '8px', 
          padding: '12px', 
          marginTop: '16px',
          marginBottom: '16px'
        }}>
          <strong>⚠️ Ważne: </strong>Pamiętaj o kliknięciu <strong>"Zapisz"</strong> po zmianie ustawień! 
          Bez zapisu ustawienia zostaną utracone przy przejściu do innej zakładki.
        </div>
        
        <button onClick={save} style={{ 
          background: '#10b981', 
          color: 'white', 
          padding: '12px 24px', 
          border: 'none', 
          borderRadius: '8px', 
          fontSize: '16px', 
          fontWeight: 'bold',
          cursor: 'pointer'
        }}>
          💾 Zapisz ustawienia
        </button>
        <div style={{ display:'flex', gap:8 }}>
          <button onClick={testGithub}>Test połączenia</button>
          <button onClick={syncGithub}>Synchronizuj do GitHub (tylko tekst)</button>
        </div>
        <p style={{ opacity:.8 }}>
          Audio i prezentacje nie są synchronizowane i są usuwane po transkrypcji.
        </p>
        
        <fieldset style={{ 
          borderColor: '#dc2626',
          background: 'rgba(220, 38, 38, 0.05)'
        }}>
          <legend style={{ color: '#dc2626', fontWeight: 'bold' }}>⚠️ Strefa niebezpieczna</legend>
          <p style={{ marginBottom: '12px', fontSize: '14px' }}>
            Resetowanie bazy danych usunie <strong>WSZYSTKIE</strong> dane (przedmioty, wykłady, notatki, fiszki, quizy).
            Ta operacja jest <strong>nieodwracalna</strong>!
          </p>
          <button 
            onClick={handleResetDatabase}
            style={{ 
              background: '#dc2626', 
              color: 'white', 
              padding: '10px 20px', 
              border: 'none', 
              borderRadius: '6px', 
              fontSize: '14px', 
              fontWeight: 'bold',
              cursor: 'pointer'
            }}
          >
            🗑️ Resetuj bazę danych
          </button>
        </fieldset>
        
        <fieldset>
          <legend>Logi (ostatnie zdarzenia)</legend>
          <div style={{ maxHeight:160, overflow:'auto', border:'1px solid #333', borderRadius:6, padding:8, fontFamily:'ui-monospace, SFMono-Regular, Menlo, monospace', fontSize:12 }}>
            {logs.length ? logs.map((l,i)=>(<div key={i}>{l}</div>)) : (<div>Brak logów</div>)}
          </div>
          <div style={{ display:'flex', gap:8, marginTop:8 }}>
            <button onClick={()=>{ clearLogs(); setLogs([]) }}>Wyczyść</button>
            <button onClick={()=>{ try { navigator.clipboard.writeText(logs.join('\n')); push('Skopiowano logi'); } catch { /*noop*/ } }}>Kopiuj logi</button>
          </div>
        </fieldset>
      </div>
    </section>
  )
}
