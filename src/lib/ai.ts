// Pipeline AI: transkrypcja, ekstrakcja slajdów, różnice, generowanie notatek/fiszek/testów
// Implementacja: transformers.js (Whisper), pdf.js, JSZip + fast-xml-parser (PPTX)

import { pipeline, env } from '@xenova/transformers'
import { log } from '@/lib/logs'
import { getSettings } from '@/stores/settings'
import { updateGlobalStatus, clearGlobalStatus, estimateAITime } from '@/components/ui/StatusBar'
import * as pdfjsLib from 'pdfjs-dist'
import JSZip from 'jszip'
import { XMLParser } from 'fast-xml-parser'
try {
  // HF endpoints and caching
  const s0 = getSettings()
  const useLocal = (s0 as any).modelSource === 'local'
  // transformers.js expected env keys (camelCase)
  // Allow both remote and local models for flexibility (auto-detection)
  ;(env as any).allowRemoteModels = true
  ;(env as any).allowLocalModels = true
  ;(env as any).localModelPath = (s0 as any).localModelBase || '/models'
  ;(env as any).useBrowserCache = false // Disable cache to avoid stale data
  ;(env as any).modelFetchTimeout = 60000
  ;(env as any).HF_HUB_URL = 'https://huggingface.co'
  ;(env as any).HF_HUB_CACHE = undefined
  
  log(`[AI] Environment configured: allowRemote=true, allowLocal=true, localPath=${(env as any).localModelPath}, cache=false`)

  // WASM threading depending on isolation
  const isIsolated = (window as any).crossOriginIsolated === true
  const cores = (navigator as any)?.hardwareConcurrency || 4
  ;(env as any).backends = (env as any).backends || {}
  ;(env as any).backends.onnx = (env as any).backends.onnx || {}
  ;(env as any).backends.onnx.wasm = (env as any).backends.onnx.wasm || {}
  if (isIsolated) {
    ;(env as any).backends.onnx.wasm.numThreads = Math.max(2, Math.min(8, cores))
    ;(env as any).backends.onnx.wasm.proxy = true
  } else {
    ;(env as any).backends.onnx.wasm.numThreads = 1
    ;(env as any).backends.onnx.wasm.proxy = false
  }

  // Provide env.fetch wrapper AND override global fetch to ensure transformers.js uses it
  const g: any = globalThis as any
  const origFetch: typeof fetch = g.fetch.bind(g)
  
  const customFetch = async (input: RequestInfo | URL, init?: RequestInit) => {
    const urlStr = typeof input === 'string' ? input : (input instanceof URL ? input.toString() : String((input as any)?.url || input))
    // Recognize relative paths, localhost, and same-origin URLs as local
    const isLocalDev = urlStr.startsWith('/') || urlStr.includes('localhost') || urlStr.includes('127.0.0.1') || urlStr.startsWith(window.location.origin)
    
    // For local dev URLs, use direct fetch without any validation/mirror logic
    if (isLocalDev) {
      return origFetch(input, init)
    }
    
    log(`[AI] Fetch (remote): ${urlStr}`)
    const isHF = /huggingface\.co/.test(urlStr) || /hf-mirror/.test(urlStr)
    const s = getSettings()
    const useMirror = (s as any).hfMirror === 'mirror'
    const primary = useMirror ? 'https://cdn.hf-mirror.com' : 'https://huggingface.co'
    const secondary = useMirror ? 'https://huggingface.co' : 'https://cdn.hf-mirror.com'

    const rewriteHost = (u: string, host: string) => {
      try {
        const t = new URL(u)
        const h = new URL(host)
        t.host = h.host
        t.protocol = h.protocol
        return t.toString()
      } catch { return u }
    }
    const validate = async (res: Response, url: string) => {
      if (!res.ok) throw new Error(`HTTP ${res.status}`)
      const ct = res.headers.get('content-type') || ''
      if (ct.includes('text/html')) throw new Error('Unexpected HTML response')
      // Skip validation for localhost - we trust our own server
      const isLocalDev = url.includes('localhost') || url.includes('127.0.0.1')
      if (isLocalDev) return res
      
      // If a JSON asset is expected, validate first bytes (remote only)
      if (url.endsWith('.json')) {
        try {
          const text = await res.clone().text()
          const trimmed = text.trim()
          if (!trimmed) throw new Error('Empty JSON response')
          const ch = trimmed.charAt(0)
          if (ch !== '{' && ch !== '[') {
            log(`Invalid JSON response from ${url}: starts with "${ch}" (first 100 chars: ${trimmed.substring(0, 100)})`)
            throw new Error('Unexpected non-JSON response')
          }
        } catch (e: any) {
          // Log and re-throw validation errors
          if (e.message !== 'Empty JSON response' && e.message !== 'Unexpected non-JSON response') {
            log(`JSON validation error for ${url}: ${e?.message ?? e}`)
          }
          throw e
        }
      }
      return res
    }

    const tryFetch = async (u: string) => validate(await origFetch(u, init), u)

    // For non-HF or local URLs (dev server), skip the HF mirror logic entirely
    if (!isHF || isLocalDev) return tryFetch(urlStr)

    try {
      // Try original URL
      return await tryFetch(urlStr)
    } catch (e1: any) {
      log(`HF fetch primary failed for ${urlStr}: ${e1?.message ?? e1}. Trying mirror...`)
      const alt = rewriteHost(urlStr, secondary)
      try {
        const r2 = await tryFetch(alt)
        log(`HF fetch succeeded on mirror: ${alt}`)
        return r2
      } catch (e2: any) {
        log(`HF fetch mirror failed for ${alt}: ${e2?.message ?? e2}`)
        throw e2
      }
    }
  }
  
  // Set env.fetch for transformers.js
  ;(env as any).fetch = customFetch
  
  log('[AI] Custom fetch configured for transformers.js')
  
  // Clear any browser cache for models to avoid stale data
  if (typeof caches !== 'undefined') {
    caches.keys().then(names => {
      names.forEach(name => {
        if (name.includes('transformers') || name.includes('model')) {
          caches.delete(name).catch(() => {})
        }
      })
    }).catch(() => {})
  }
} catch (e) {
  console.error('[AI] Initialization error:', e)
}

const transcriberCache: Record<string, Promise<any>> = {}
function modelIdFromSettings() {
  const s = getSettings()
  const size = (s as any).whisperModel || 'base'
  log(`[AI] modelIdFromSettings: whisperModel=${size}`)
  switch (size) {
    case 'tiny': return 'Xenova/whisper-tiny'
    case 'small': return 'Xenova/whisper-small'
    case 'base': return 'Xenova/whisper-base'
    default: return 'Xenova/whisper-base'
  }
}
async function loadModel(modelId: string, onModelProgress?: (p: number, phase: string) => void) {
  onModelProgress?.(10, 'ładowanie modelu')
  const s = getSettings()
  let useLocal = (s as any).modelSource === 'local'
  const base = ((s as any).localModelBase || '/models').replace(/\/$/, '')
  
  // Auto-detect: if modelSource is 'remote' but local models exist, switch to local
  if (!useLocal) {
    try {
      const repoLeaf = modelId.split('/').pop()!
      const probe = `${base}/${modelId}/config.json`
      log(`[AI] Auto-detecting local models at ${probe}...`)
      const r = await fetch(probe)
      if (r.ok) {
        // Verify it's actually JSON
        const text = await r.text()
        if (text.trim().startsWith('{')) {
          log(`[AI] Local model detected! Switching to local mode.`)
          useLocal = true
        } else {
          log(`[AI] Config file exists but is not valid JSON. Using remote.`)
        }
      }
    } catch (e: any) {
      log(`[AI] No local models found: ${e?.message ?? e}. Using remote.`)
    }
  }
  
  log(`[AI] Loading model ${modelId}, source: ${useLocal ? 'local' : 'remote'}, base: ${base}`)
  
  // If using local models, the finalModelId is already correct
  // No need to probe - we already verified in auto-detect
  let finalModelId = modelId

  log(`Ładowanie modelu Whisper (${finalModelId}${useLocal ? ' • lokalnie' : ''})...`)
  const preferWebGPU = !!(navigator as any).gpu && !(s as any).forceWasm

  const pipelineOptions: any = {
    // @ts-ignore
    progress_callback: (ev: any) => {
      try {
        const total = ev?.total ?? 1
        const loaded = ev?.loaded ?? 0
        // Map download progress to 10-95%
        const pct = total ? Math.min(95, Math.max(10, Math.round((loaded / total) * 85) + 10)) : 15
        onModelProgress?.(pct, 'ładowanie modelu')
      } catch {
        // no-op
      }
    }
  }
  
  // For local models, use just the model name (not full URL)
  // Transformers.js will construct paths using env.localModelPath
  const modelPath = finalModelId
  if (useLocal) {
    log(`[AI] Using local model name: ${modelPath} (will resolve via localModelPath: ${base})`)
  } else {
    log(`[AI] Using remote model: ${modelPath}`)
  }

  const tryLoad = (device: 'webgpu' | 'wasm') => {
    log(`[AI] Attempting to load with device: ${device}, path: ${modelPath}`)
    return pipeline('automatic-speech-recognition', modelPath, {
      ...pipelineOptions,
      // @ts-ignore
      device,
    } as any).catch((err: any) => {
      log(`[AI] Pipeline creation failed: ${err?.message ?? err}`)
      log(`[AI] Error stack: ${err?.stack}`)
      throw err
    })
  }

  // First try WebGPU briefly (if available), then fallback to WASM to avoid getting stuck
  if (preferWebGPU) {
    try {
      const gpuLoad = tryLoad('webgpu')
      const gpuTimeout = new Promise<never>((_, rej) => setTimeout(() => rej(new Error('timeout_webgpu_model_load')), 30_000))
      const trans = await Promise.race([gpuLoad, gpuTimeout])
      onModelProgress?.(98, 'model gotowy')
      log('Model Whisper gotowy (WebGPU)')
      return trans
    } catch (e: any) {
      log(`WebGPU nieosiągalne/zwłoka: ${e?.message ?? e}. Fallback do WASM...`)
    }
  }

  const trans = await tryLoad('wasm')
  onModelProgress?.(98, 'model gotowy')
  log('Model Whisper gotowy (WASM)')
  return trans
}

async function getTranscriber(onModelProgress?: (p: number, phase: string) => void) {
  const modelId = modelIdFromSettings()
  const s = getSettings()
  log(`[AI] getTranscriber called. modelId=${modelId}, whisperModel=${(s as any).whisperModel}, modelSource=${(s as any).modelSource}, localModelBase=${(s as any).localModelBase}`)
  const preferWebGPU = !!(navigator as any).gpu
  const cacheKey = `${modelId}:${preferWebGPU ? 'webgpu' : 'wasm'}`
  
  // If cache exists but settings changed, clear it
  const cachedSettings = (transcriberCache as any)._lastSettings
  const currentSettings = JSON.stringify({ whisperModel: (s as any).whisperModel, modelSource: (s as any).modelSource })
  if (cachedSettings && cachedSettings !== currentSettings) {
    log(`[AI] Settings changed, clearing cache`)
    Object.keys(transcriberCache).forEach(key => delete transcriberCache[key])
  }
  ;(transcriberCache as any)._lastSettings = currentSettings
  
  if (!transcriberCache[cacheKey]) {
    const load = loadModel(modelId, onModelProgress)
    const timeout = new Promise<never>((_, rej) => setTimeout(() => rej(new Error('timeout_loading_model')), 60_000))
    transcriberCache[cacheKey] = Promise.race([load, timeout]).catch(async (e) => {
      const errorMsg = e?.message ?? e
      log(`Model ${modelId} niezaładowany: ${errorMsg}`)
      
      // Jeśli to błąd "Unsupported model type: whisper", to model nie jest w formacie ONNX
      if (errorMsg.includes('Unsupported model type: whisper')) {
        throw new Error(
          `❌ Model ${modelId} nie jest w formacie ONNX!\n\n` +
          `transformers.js wymaga plików .onnx, ale ten model ma tylko PyTorch/TensorFlow.\n\n` +
          `ROZWIĄZANIA:\n` +
          `1. Użyj modelu 'base' (masz go już w ONNX) - zmień w ustawieniach\n` +
          `2. Pobierz whisper-tiny ONNX: uruchom ./download-whisper-tiny-onnx.sh\n` +
          `3. Użyj backendu (cd server && npm start) - backend obsługuje wszystkie formaty`
        )
      }
      
      // Próba fallback na inny model
      const base = ((s as any).localModelBase || '/models').replace(/\/$/, '')
      const fallbackModel = modelId.includes('tiny') ? 'Xenova/whisper-base' : 'Xenova/whisper-tiny'
      const fallbackConfigUrl = `${base}/${fallbackModel}/onnx/config.json`
      
      let hasFallback = false
      try {
        const r = await fetch(fallbackConfigUrl, { method: 'HEAD' })
        hasFallback = r.ok
      } catch {}
      
      if (hasFallback) {
        log(`Przełączam na fallback: ${fallbackModel}`)
        onModelProgress?.(12, `ładowanie fallback`)
        return loadModel(fallbackModel, onModelProgress)
      } else {
        throw new Error(`Nie udało się załadować modelu ${modelId}. Sprawdź czy model jest dostępny w ${base}.`)
      }
    })
  }
  return transcriberCache[cacheKey]
}

async function blobToPCMFloat32(blob: Blob): Promise<Float32Array> {
  const ab = await blob.arrayBuffer()
  const ac = new (window.AudioContext || (window as any).webkitAudioContext)()
  const audio = await ac.decodeAudioData(ab)
  // Resample to 16kHz mono for Whisper efficiency
  const targetRate = 16000
  if (audio.sampleRate === targetRate && audio.numberOfChannels === 1) {
    const data = audio.getChannelData(0)
    const arr = new Float32Array(data.length)
    arr.set(data)
    ac.close()
    return arr
  }
  const lengthSeconds = audio.duration
  const frameCount = Math.ceil(lengthSeconds * targetRate)
  const oac = new (window as any).OfflineAudioContext(1, frameCount, targetRate)
  const src = oac.createBufferSource()
  // Downmix to mono by averaging channels
  const mono = oac.createBuffer(1, audio.length, audio.sampleRate)
  const tmp = new Float32Array(audio.length)
  for (let ch = 0; ch < audio.numberOfChannels; ch++) {
    const chData = audio.getChannelData(ch)
    for (let i = 0; i < chData.length; i++) tmp[i] += chData[i] / audio.numberOfChannels
  }
  mono.copyToChannel(tmp, 0, 0)
  src.buffer = mono
  src.connect(oac.destination)
  src.start(0)
  const rendered = await oac.startRendering()
  const out = rendered.getChannelData(0)
  const arr = new Float32Array(out.length)
  arr.set(out)
  ac.close()
  return arr
}

// Sprawdź czy backend jest dostępny
async function checkBackendAvailable(): Promise<boolean> {
  const s = getSettings()
  const backendUrl = (s as any).backendUrl || 'http://localhost:3001'
  
  try {
    const response = await fetch(`${backendUrl}/health`, { 
      method: 'GET',
      signal: AbortSignal.timeout(2000) // 2s timeout
    })
    return response.ok
  } catch {
    return false
  }
}

// Transkrypcja przez backend
async function transcribeAudioBackend(blob: Blob, lang: string | 'auto' = 'auto', onProgress?: (p: number, phase: string) => void): Promise<{ text: string; segments: any[] }> {
  const s = getSettings()
  const backendUrl = (s as any).backendUrl || 'http://localhost:3001'
  const model = (s as any).whisperModel || 'tiny'
  const engine = (s as any).whisperEngine || 'whisper-cpp'
  
  log(`[Backend] Wysyłam audio do ${backendUrl} (silnik: ${engine}, model: ${model})...`)
  onProgress?.(10, `${engine} - wysyłanie`)
  
  const formData = new FormData()
  formData.append('audio', blob, 'audio.mp3')
  formData.append('language', lang)
  formData.append('model', model)
  
  try {
    // Wybierz endpoint na podstawie silnika
    const endpoint = engine === 'whisper-cpp' 
      ? '/transcribe-stream-cpp'  // whisper.cpp (ultraszybki)
      : '/transcribe-stream'      // transformers.js (uniwersalny)
      
    log(`[Backend] Używam endpointu: ${endpoint}`)
    
    // Użyj SSE endpoint dla progress
    const response = await fetch(`${backendUrl}${endpoint}`, {
      method: 'POST',
      body: formData,
    })
    
    if (!response.ok) {
      throw new Error(`Backend error: ${response.status} ${response.statusText}`)
    }
    
    // Parsuj SSE stream
    const reader = response.body?.getReader()
    const decoder = new TextDecoder()
    let result = { text: '', segments: [] }
    
    if (reader) {
      while (true) {
        const { done, value } = await reader.read()
        if (done) break
        
        const chunk = decoder.decode(value)
        const lines = chunk.split('\n')
        
        for (const line of lines) {
          if (line.startsWith('data: ')) {
            try {
              const data = JSON.parse(line.slice(6))
              
              if (data.type === 'progress') {
                onProgress?.(data.progress, data.phase)
              } else if (data.type === 'complete') {
                result.text = data.text
                const engineInfo = data.engine ? ` (${data.engine})` : ''
                const durationInfo = data.duration ? ` w ${data.duration}s` : ''
                log(`[Backend] Transkrypcja zakończona${engineInfo}${durationInfo}: ${data.text.length} znaków`)
              } else if (data.type === 'error') {
                throw new Error(data.error)
              }
            } catch (e) {
              // Ignoruj błędy parsowania pojedynczych linii
            }
          }
        }
      }
    }
    
    onProgress?.(100, 'zakończono')
    return result
    
  } catch (error: any) {
    log(`[Backend] Błąd: ${error?.message}`)
    throw error
  }
}

// Transkrypcja w przeglądarce (fallback)
async function transcribeAudioBrowser(blob: Blob, lang: string | 'auto' = 'auto', onProgress?: (p: number, phase: string) => void): Promise<{ text: string; segments: any[] }> {
  onProgress?.(8, 'ładowanie modelu')
  log('[Browser] Przygotowywanie audio...')
  const transcriber = await getTranscriber((p, phase) => onProgress?.(p, phase))
  onProgress?.(20, 'przygotowanie audio')
  
  log('[Browser] Konwersja audio do PCM...')
  const pcm = await blobToPCMFloat32(blob)
  
  const durationSec = pcm.length / 16000
  log(`[Browser] Audio: długość ${Math.round(durationSec)}s, ${pcm.length} sampli`)
  
  onProgress?.(30, `transkrypcja ${Math.round(durationSec)}s audio`)
  const s = getSettings()
  const forceLang = lang === 'auto' ? ((s as any).whisperLanguage || 'auto') : lang
  const modelSize = (s as any).whisperModel || 'base'
  
  log(`[Browser] Używam języka: ${forceLang} (z ustawień: ${(s as any).whisperLanguage}, przekazany: ${lang})`)
  
  // Timeout: bazowy 10 minut + 30s na każdą sekundę audio
  // Dla tiny: szybszy (20s/s), dla base/small: wolniejszy (30s/s)
  const timeoutMultiplier = modelSize === 'tiny' ? 20_000 : 30_000
  const timeoutMs = Math.max(600_000, durationSec * timeoutMultiplier)
  log(`[Browser] Model: ${modelSize}, Audio: ${Math.round(durationSec)}s, Timeout: ${Math.round(timeoutMs / 1000)}s`)
  log(`[Browser] Rozpoczynam transkrypcję (język: ${forceLang})...`)
  
  // Symuluj postęp podczas transkrypcji
  let progressInterval: number | undefined
  let currentProgress = 30
  if (onProgress) {
    progressInterval = window.setInterval(() => {
      currentProgress = Math.min(95, currentProgress + 1)
      onProgress(currentProgress, 'przetwarzanie audio...')
    }, Math.max(1000, (timeoutMs / 65)))
  }
  
  const transcribePromise = transcriber(pcm, {
    chunk_length_s: 60, // Większe chunki = szybsza transkrypcja długich nagrań
    stride_length_s: 5,
    return_timestamps: false,
    condition_on_previous_text: false,
    temperature: 0,
    // @ts-ignore: if supported, ensure greedy
    num_beams: 1,
    language: forceLang === 'auto' ? undefined : forceLang,
  }).finally(() => {
    if (progressInterval) clearInterval(progressInterval)
  })
  
  log(`[Browser] Parametry transkrypcji: chunk_length=60s, stride=5s, language=${forceLang}`)
  
  const timeoutPromise = new Promise<never>((_, reject) => {
    setTimeout(() => {
      if (progressInterval) clearInterval(progressInterval)
      reject(new Error(`Transkrypcja przekroczyła limit czasu (${Math.round(timeoutMs / 1000)}s). Spróbuj z krótszym nagraniem lub mniejszym modelem.`))
    }, timeoutMs)
  })
  
  const result = await Promise.race([transcribePromise, timeoutPromise])
  
  if (progressInterval) clearInterval(progressInterval)
  
  log('[Browser] Zakończono transkrypcję')
  onProgress?.(100, 'zakończono')
  const text: string = result.text || ''
  log(`[Browser] Transkrypcja: otrzymano ${text.length} znaków tekstu`)
  
  if (!text || text.length < 10) {
    log('[Browser] OSTRZEŻENIE: Transkrypcja dała bardzo krótki wynik. Sprawdź jakość audio.')
  }
  
  return { text, segments: [] }
}

// Główna funkcja transkrypcji - próbuje backend, fallback do przeglądarki
export async function transcribeAudio(blob: Blob, lang: string | 'auto' = 'auto', onProgress?: (p: number, phase: string) => void) {
  const s = getSettings()
  const preferBackend = (s as any).transcriptionMode !== 'browser' // domyślnie preferuj backend
  
  // Użyj języka z ustawień jeśli nie podano inaczej
  const finalLang = lang === 'auto' ? ((s as any).whisperLanguage || 'auto') : lang
  log(`[Main] Język transkrypcji: ${finalLang} (ustawienia: ${(s as any).whisperLanguage}, przekazany: ${lang})`)
  
  if (preferBackend) {
    log('Sprawdzam dostępność backendu...')
    const backendAvailable = await checkBackendAvailable()
    
    if (backendAvailable) {
      log('✅ Backend dostępny - używam serwera')
      try {
        return await transcribeAudioBackend(blob, finalLang, onProgress)
      } catch (error: any) {
        log(`❌ Backend error: ${error?.message}. Fallback do przeglądarki...`)
        // Fallback do przeglądarki
      }
    } else {
      log('⚠️ Backend niedostępny - używam przeglądarki')
    }
  } else {
    log('Konfiguracja: wymuszona transkrypcja w przeglądarce')
  }
  
  // Fallback lub wymuszona transkrypcja w przeglądarce
  return await transcribeAudioBrowser(blob, finalLang, onProgress)
}

// Preload the current model for diagnostics and to reduce first-run latency
export async function preloadWhisperModel(onProgress?: (p: number, phase: string) => void) {
  try {
    await getTranscriber((p, phase) => onProgress?.(p, phase))
    log('Preload: model gotowy')
    return true
  } catch (e: any) {
    log(`Preload: błąd ładowania modelu: ${e?.message ?? e}`)
    throw e
  }
}

export async function extractSlidesText(file: File): Promise<string[]> {
  const name = file.name.toLowerCase()
  if (file.type === 'application/pdf' || name.endsWith('.pdf')) {
    const data = new Uint8Array(await file.arrayBuffer())
    // Użyj pdf.js bez workera, by uniknąć konfiguracji workerSrc
  log('Parsowanie PDF...')
  const pdf = await (pdfjsLib as any).getDocument({ data, useWorkerFetch: false, isEvalSupported: false, disableFontFace: true }).promise
    const texts: string[] = []
    for (let i = 1; i <= pdf.numPages; i++) {
      const page = await pdf.getPage(i)
      const content = await page.getTextContent()
      const t = content.items.map((it: any) => it.str).join(' ')
      if (t.trim()) texts.push(t.trim())
    }
    return texts
  }
  if (name.endsWith('.pptx') || name.endsWith('.ppt')) {
  log('Rozpakowywanie PPTX...')
  const zip = await JSZip.loadAsync(await file.arrayBuffer())
    const parser = new XMLParser({ ignoreAttributes: false })
    const slideEntries = Object.keys(zip.files).filter(p => p.startsWith('ppt/slides/slide') && p.endsWith('.xml')).sort()
    const result: string[] = []
    for (const path of slideEntries) {
      const xml = await zip.files[path].async('string')
      const obj = parser.parse(xml)
      // Tekst w PPTX jest zwykle pod a:t
      const texts: string[] = []
      function walk(o: any) {
        if (!o || typeof o !== 'object') return
        for (const k of Object.keys(o)) {
          const v = o[k]
          if (k === 'a:t' && typeof v === 'string') texts.push(v)
          if (typeof v === 'object') walk(v)
        }
      }
      walk(obj)
      if (texts.length) result.push(texts.join(' '))
    }
    return result
  }
  return []
}

export function computeOffSlides(speech: string, slides: string[]): string[] {
  // TODO: embeddings i próg podobieństwa; tu prosta atrapa
  if (!slides.length) return speech.split('. ').filter(Boolean)
  const slideCorpus = slides.join(' ').toLowerCase()
  return speech.split('. ').filter(s => s && !slideCorpus.includes(s.toLowerCase()))
}

export async function generateNotes(options: { speech?: string; slides?: string[]; offSlides?: string[] }) {
  const { speech = '', slides = [], offSlides = [] } = options
  const bullets = (speech + '\n' + slides.join('\n')).split(/\n|\.\s+/).filter(s=>s.trim().length>6).slice(0, 12)
  const short = bullets.slice(0, 5).map(s=>`- ${s.trim()}`).join('\n')
  return {
    speechMd: speech ? `# Notatki z mowy\n\n${speech}` : '',
    slidesMd: slides.length ? `# Notatki ze slajdów\n\n- ${slides.join('\n- ')}` : '',
    offSlidesMd: offSlides.length ? `# Poza slajdami\n\n- ${offSlides.join('\n- ')}` : '',
    shortMd: (short ? `# Krótka notatka\n\n${short}` : ''),
  }
}

export async function generateFlashcardsFromText(text: string) {
  // Heurystyki: z punktorów i zdań twórz proste Q/A
  const lines = text.split(/\n|\.\s+/).map(s=>s.trim()).filter(Boolean)
  const cards: { question: string; answer: string; tags?: string[] }[] = []
  for (const l of lines.slice(0, 30)) {
    if (l.length < 10) continue
    const q = l.replace(/^[-•]\s*/, '')
    const question = q.endsWith('?') ? q : `Co oznacza: ${q.split(':')[0]}`
    const answer = q.includes(':') ? q.split(':').slice(1).join(':').trim() : l
    cards.push({ question, answer, tags: ['auto'] })
  }
  return cards.slice(0, 15)
}

export async function generateExamBankFromNotes(notes: string) {
  const sentences = notes.split(/\.|\n/).map(s=>s.trim()).filter(s=>s.length>8).slice(0, 40)
  const mc = sentences.slice(0, 6).map((s, i) => ({ q: s.replace(/[-•]\s*/, ''), options: ['Tak', 'Nie', 'Zależy', 'Nie dotyczy'], answer: 0 }))
  const tf = sentences.slice(6, 12).map((s, i) => ({ q: s.replace(/[-•]\s*/, ''), answer: i % 2 === 0 }))
  const op = sentences.slice(12, 18).map(s => ({ q: `Wyjaśnij: ${s.split(':')[0]}` }))
  return { multipleChoice: mc, trueFalse: tf, open: op }
}

// === ZAAWANSOWANE FUNKCJE AI ===

/** Automatyczne formatowanie i strukturyzowanie tekstu notatki */
export async function formatAndStructureText(rawText: string): Promise<{
  formatted: string;
  structured: string;
  summary: string;
  keywords: string[];
}> {
  const text = rawText.trim()
  if (!text) return { formatted: '', structured: '', summary: '', keywords: [] }

  // Czyść tekst z nadmiarowych spacji i niepotrzebnych znaków
  const cleaned = text
    .replace(/\s+/g, ' ')
    .replace(/([.!?])\s*([A-Z])/g, '$1\n\n$2')
    .replace(/\n{3,}/g, '\n\n')
    .trim()

  // Podziel na sekcje/akapity
  const paragraphs = cleaned.split(/\n\s*\n/).filter(p => p.trim().length > 10)
  
  // Formatowanie markdown z nagłówkami
  const formatted = paragraphs.map((p, i) => {
    const sentences = p.split(/(?<=[.!?])\s+/).filter(s => s.trim().length > 5)
    if (sentences.length === 0) return p
    
    // Pierwszy akapit z nagłówkiem
    if (i === 0 && sentences.length > 2) {
      const title = extractTitleFromText(sentences[0])
      return `## ${title}\n\n${sentences.join(' ')}`
    }
    
    // Pozostałe akapity z podtytułami jeśli są długie
    if (sentences.length > 3) {
      const subtitle = extractKeyPhrase(sentences[0])
      return `### ${subtitle}\n\n${sentences.join(' ')}`
    }
    
    return sentences.join(' ')
  }).join('\n\n')

  // Strukturyzowana wersja z punktami
  const structured = await createStructuredNotes(paragraphs)
  
  // Podsumowanie
  const summary = await createSummary(text)
  
  // Słowa kluczowe
  const keywords = extractKeywords(text)
  
  return { formatted, structured, summary, keywords }
}

/** Tworzenie różnych typów notatek */
export async function generateNoteVariants(text: string): Promise<{
  outline: string;
  mindMap: string;
  timeline: string;
  comparison: string;
  bulletPoints: string;
  questions: string;
}> {
  const outline = await createOutline(text)
  const mindMap = await createMindMap(text)
  const timeline = await createTimeline(text)
  const comparison = await createComparison(text)
  const bulletPoints = await createBulletPoints(text)
  const questions = await createQuestions(text)
  
  return { outline, mindMap, timeline, comparison, bulletPoints, questions }
}

/** Zaawansowane generowanie fiszek z kategoryzacją */
export async function generateAdvancedFlashcards(text: string): Promise<{
  definitions: Array<{ question: string; answer: string; category: string; difficulty: 'easy' | 'medium' | 'hard' }>;
  concepts: Array<{ question: string; answer: string; category: string; difficulty: 'easy' | 'medium' | 'hard' }>;
  applications: Array<{ question: string; answer: string; category: string; difficulty: 'easy' | 'medium' | 'hard' }>;
}> {
  const sentences = text.split(/[.!?]\s+/).filter(s => s.trim().length > 10)
  
  const definitions: any[] = []
  const concepts: any[] = []
  const applications: any[] = []
  
  for (const sentence of sentences.slice(0, 30)) {
    const s = sentence.trim()
    
    // Definicje (zawiera "to", "oznacza", "jest")
    if (/\b(to|oznacza|jest|nazywa się|definiuje)\b/i.test(s)) {
      const parts = s.split(/\b(to|oznacza|jest|nazywa się|definiuje)\b/i)
      if (parts.length >= 3) {
        definitions.push({
          question: `Co ${parts[0].trim()}?`,
          answer: parts.slice(2).join('').trim(),
          category: 'definicja',
          difficulty: 'easy' as const
        })
      }
    }
    
    // Koncepty (zawiera przyczyny, skutki, relacje)
    else if (/\b(dlatego|ponieważ|skutkuje|powoduje|wpływa)\b/i.test(s)) {
      concepts.push({
        question: `Wyjaśnij relację: ${s.split(/\b(dlatego|ponieważ|skutkuje|powoduje|wpływa)\b/i)[0].trim()}`,
        answer: s,
        category: 'koncepcja',
        difficulty: 'medium' as const
      })
    }
    
    // Aplikacje (zawiera "można", "stosuje się", "używa")
    else if (/\b(można|stosuje się|używa|aplikuje|wykorzystuje)\b/i.test(s)) {
      applications.push({
        question: `Jak zastosować: ${extractKeyPhrase(s)}?`,
        answer: s,
        category: 'zastosowanie',
        difficulty: 'hard' as const
      })
    }
  }
  
  return {
    definitions: definitions.slice(0, 10),
    concepts: concepts.slice(0, 8),
    applications: applications.slice(0, 6)
  }
}

/** Zaawansowane generowanie banku pytań */
export async function generateAdvancedExamBank(text: string): Promise<{
  multipleChoice: Array<{ question: string; options: string[]; correct: number; explanation: string; difficulty: string }>;
  trueFalse: Array<{ statement: string; correct: boolean; explanation: string }>;
  shortAnswer: Array<{ question: string; keywords: string[]; points: number }>;
  essay: Array<{ prompt: string; criteria: string[]; timeEstimate: string }>;
}> {
  const sentences = text.split(/[.!?]\s+/).filter(s => s.trim().length > 10)
  const keywords = extractKeywords(text)
  
  const multipleChoice = sentences.slice(0, 8).map((s, i) => {
    const concept = extractKeyPhrase(s)
    const options = generateDistractors(concept, keywords)
    return {
      question: `Które stwierdzenie o "${concept}" jest prawdziwe?`,
      options: [s.trim(), ...options].slice(0, 4),
      correct: 0,
      explanation: `Prawidłowa odpowiedź wynika z: ${s}`,
      difficulty: i < 3 ? 'łatwe' : i < 6 ? 'średnie' : 'trudne'
    }
  })
  
  const trueFalse = sentences.slice(8, 16).map((s, i) => {
    // Czasem odwróć stwierdzenie dla fałszu
    const isReversed = i % 3 === 0
    const statement = isReversed ? reverseStatement(s) : s
    return {
      statement: statement.trim(),
      correct: !isReversed,
      explanation: isReversed ? `Nieprawda. Poprawnie: ${s}` : `Prawda. ${s}`
    }
  })
  
  const shortAnswer = keywords.slice(0, 6).map((keyword, i) => ({
    question: `Wyjaśnij pojęcie: ${keyword}`,
    keywords: [keyword, ...getRelatedTerms(keyword, text)],
    points: i < 2 ? 2 : i < 4 ? 3 : 5
  }))
  
  const essay = [
    {
      prompt: `Omów główne zagadnienia przedstawione w materiale, uwzględniając: ${keywords.slice(0, 3).join(', ')}`,
      criteria: ['Kompletność omówienia', 'Logiczna struktura', 'Użycie właściwej terminologii', 'Przykłady i zastosowania'],
      timeEstimate: '15-20 minut'
    },
    {
      prompt: `Porównaj i skontrastuj kluczowe koncepty z materiału`,
      criteria: ['Identyfikacja podobieństw', 'Wskazanie różnic', 'Krytyczna analiza', 'Wnioski'],
      timeEstimate: '20-25 minut'
    }
  ]
  
  return { multipleChoice, trueFalse, shortAnswer, essay }
}

// === FUNKCJE POMOCNICZE ===

function extractTitleFromText(text: string): string {
  const words = text.split(' ').slice(0, 5)
  return words.join(' ').replace(/[.!?:,]$/g, '')
}

function extractKeyPhrase(text: string): string {
  const words = text.split(' ')
  // Znajdź pierwszą znaczącą frazę (2-4 słowa)
  for (let i = 0; i < words.length - 1; i++) {
    const phrase = words.slice(i, i + 3).join(' ')
    if (phrase.length > 8 && phrase.length < 30) {
      return phrase.replace(/[.!?:,]$/g, '')
    }
  }
  return words.slice(0, 3).join(' ').replace(/[.!?:,]$/g, '')
}

function extractKeywords(text: string): string[] {
  const words = text.toLowerCase()
    .replace(/[^a-ząćęłńóśźż\s]/g, ' ')
    .split(/\s+/)
    .filter(w => w.length > 4)
    .filter(w => !['które', 'można', 'przez', 'oraz', 'także', 'dlatego', 'ponieważ'].includes(w))
  
  const frequency: Record<string, number> = {}
  words.forEach(w => frequency[w] = (frequency[w] || 0) + 1)
  
  return Object.entries(frequency)
    .filter(([, count]) => count > 1)
    .sort(([, a], [, b]) => b - a)
    .slice(0, 10)
    .map(([word]) => word)
}

async function createStructuredNotes(paragraphs: string[]): Promise<string> {
  const structured = paragraphs.map((p, i) => {
    const sentences = p.split(/(?<=[.!?])\s+/).filter(s => s.trim())
    const mainPoint = extractKeyPhrase(sentences[0])
    const details = sentences.slice(1).map(s => `  - ${s.trim()}`).join('\n')
    
    return `${i + 1}. **${mainPoint}**\n${details}`
  }).join('\n\n')
  
  return `# Notatki strukturyzowane\n\n${structured}`
}

async function createSummary(text: string): Promise<string> {
  const sentences = text.split(/[.!?]\s+/).filter(s => s.trim().length > 10)
  const keywords = extractKeywords(text)
  
  // Wybierz 3-5 najważniejszych zdań
  const importantSentences = sentences
    .map(s => ({ text: s, score: keywords.reduce((acc, kw) => acc + (s.toLowerCase().includes(kw) ? 1 : 0), 0) }))
    .sort((a, b) => b.score - a.score)
    .slice(0, Math.min(5, Math.ceil(sentences.length / 4)))
    .map(item => item.text)
  
  return `**Podsumowanie:** ${importantSentences.join(' ')}`
}

async function createOutline(text: string): Promise<string> {
  const paragraphs = text.split(/\n\s*\n/).filter(p => p.trim().length > 10)
  
  const outline = paragraphs.map((p, i) => {
    const title = extractKeyPhrase(p)
    const subPoints = p.split(/[.!?]\s+/)
      .filter(s => s.trim().length > 5)
      .slice(1, 4)
      .map(s => `   - ${extractKeyPhrase(s)}`)
      .join('\n')
    
    return `${i + 1}. ${title}\n${subPoints}`
  }).join('\n\n')
  
  return `# Konspekt\n\n${outline}`
}

async function createMindMap(text: string): Promise<string> {
  const keywords = extractKeywords(text)
  const mainTopic = extractTitleFromText(text)
  
  const branches = keywords.slice(0, 6).map(keyword => {
    const relatedTerms = getRelatedTerms(keyword, text).slice(0, 3)
    const subBranches = relatedTerms.map(term => `    - ${term}`).join('\n')
    return `  - **${keyword}**\n${subBranches}`
  }).join('\n')
  
  return `# Mapa myśli\n\n## ${mainTopic}\n\n${branches}`
}

async function createTimeline(text: string): Promise<string> {
  const sentences = text.split(/[.!?]\s+/).filter(s => s.trim().length > 10)
  
  // Szukaj wskaźników czasowych
  const timeIndicators = sentences.filter(s => 
    /\b(pierwsz|drugi|trzeci|następnie|potem|ostatnie|wcześniej|później|przed|po)\b/i.test(s)
  )
  
  if (timeIndicators.length < 2) {
    return `# Chronologia\n\nBrak wyraźnych wskaźników czasowych w tekście.`
  }
  
  const timeline = timeIndicators.slice(0, 6).map((s, i) => {
    const step = extractKeyPhrase(s)
    return `${i + 1}. **${step}**\n   ${s.trim()}`
  }).join('\n\n')
  
  return `# Chronologia\n\n${timeline}`
}

async function createComparison(text: string): Promise<string> {
  const sentences = text.split(/[.!?]\s+/).filter(s => s.trim().length > 10)
  
  // Szukaj porównań
  const comparisons = sentences.filter(s => 
    /\b(różni się|podobne|w przeciwieństwie|natomiast|jednak|ale|choć)\b/i.test(s)
  )
  
  if (comparisons.length < 2) {
    return `# Porównanie\n\nBrak wyraźnych elementów porównawczych w tekście.`
  }
  
  const comparison = comparisons.slice(0, 4).map((s, i) => {
    return `- ${s.trim()}`
  }).join('\n')
  
  return `# Porównanie\n\n${comparison}`
}

async function createBulletPoints(text: string): Promise<string> {
  const sentences = text.split(/[.!?]\s+/).filter(s => s.trim().length > 8)
  
  const bullets = sentences.slice(0, 12).map(s => {
    const clean = s.trim().replace(/^[^a-zA-ZąćęłńóśźżĄĆĘŁŃÓŚŹŻ]*/, '')
    return `• ${clean}`
  }).join('\n')
  
  return `# Punkty kluczowe\n\n${bullets}`
}

async function createQuestions(text: string): Promise<string> {
  const keywords = extractKeywords(text)
  const sentences = text.split(/[.!?]\s+/).filter(s => s.trim().length > 10)
  
  const questions = [
    ...keywords.slice(0, 3).map(kw => `Co to jest ${kw}?`),
    ...sentences.slice(0, 3).map(s => `Dlaczego ${extractKeyPhrase(s).toLowerCase()}?`),
    `Jakie są główne zagadnienia poruszane w materiale?`,
    `Jak można zastosować przedstawione informacje?`,
    `Jakie są konsekwencje/skutki omawianych zjawisk?`
  ].slice(0, 8)
  
  const questionList = questions.map((q, i) => `${i + 1}. ${q}`).join('\n')
  
  return `# Pytania do przemyślenia\n\n${questionList}`
}

function getRelatedTerms(keyword: string, text: string): string[] {
  const words = text.toLowerCase().split(/\s+/)
  const keywordIndex = words.findIndex(w => w.includes(keyword.toLowerCase()))
  
  if (keywordIndex === -1) return []
  
  // Znajdź słowa w pobliżu keyword
  const nearby = words.slice(Math.max(0, keywordIndex - 3), keywordIndex + 4)
    .filter(w => w.length > 3 && w !== keyword.toLowerCase())
    .filter(w => !['które', 'można', 'przez', 'oraz', 'także'].includes(w))
  
  return [...new Set(nearby)].slice(0, 3)
}

function generateDistractors(concept: string, keywords: string[]): string[] {
  // Generuj niepoprawne odpowiedzi na podstawie innych słów kluczowych
  const distractors = keywords
    .filter(kw => kw !== concept.toLowerCase())
    .slice(0, 3)
    .map(kw => `To nie dotyczy ${kw}`)
  
  return [...distractors, 'Żadne z powyższych', 'Wszystkie powyższe']
}

function reverseStatement(statement: string): string {
  // Prosta negacja poprzez dodanie "nie"
  const negated = statement.replace(/\b(jest|ma|może|zawiera)\b/i, (match) => `nie ${match.toLowerCase()}`)
  return negated !== statement ? negated : `Nieprawdą jest, że ${statement.toLowerCase()}`
}

// === INTEGRACJA Z OLLAMA AI ===

interface OllamaResponse {
  response: string
  done: boolean
  model?: string
  total_duration?: number
}

interface AIModelConfig {
  name: string
  description: string
  size: string
  speed: 'fast' | 'medium' | 'slow'
  capability: 'basic' | 'advanced' | 'expert'
}

/** Dostępne modele AI */
const AI_MODELS: Record<string, AIModelConfig> = {
  'phi3.5:3.8b': {
    name: 'Phi-3.5 Mini',
    description: 'Szybki model do podstawowych zadań',
    size: '2.2 GB',
    speed: 'fast',
    capability: 'basic'
  },
  'llama3.1:8b': {
    name: 'Llama 3.1',
    description: 'Zrównoważony model do zadań średnio zaawansowanych',
    size: '4.9 GB', 
    speed: 'medium',
    capability: 'advanced'
  },
  'qwen2.5:14b': {
    name: 'Qwen2.5',
    description: 'Najlepszy model do zadań studenckich i naukowych',
    size: '9.0 GB',
    speed: 'slow',
    capability: 'expert'
  }
}

/** Automatyczny wybór modelu na podstawie zadania */
function selectModelForTask(taskType: 'cleaning' | 'notes' | 'flashcards' | 'verification' | 'advanced'): string {
  const s = getSettings()
  const preferredModel = (s as any).aiModel || 'auto'
  
  // Normalizuj nazwę modelu - dodaj tag wersji jeśli go brakuje
  function normalizeModelName(model: string): string {
    if (model.includes(':')) return model // Już ma tag wersji
    
    // Dodaj odpowiedni tag wersji
    if (model === 'phi3.5') return 'phi3.5:3.8b'
    if (model === 'llama3.1') return 'llama3.1:8b'
    if (model === 'qwen2.5') return 'qwen2.5:14b'
    
    return model // Zwróć oryginał jeśli nie rozpoznano
  }
  
  if (preferredModel !== 'auto') {
    return normalizeModelName(preferredModel)
  }
  
  // Automatyczny wybór na podstawie zadania
  switch (taskType) {
    case 'cleaning':
      return 'llama3.1:8b' // Wystarczająco dobry i szybki
    case 'notes':
    case 'flashcards':
      return 'qwen2.5:14b' // Najlepszy do generowania treści edukacyjnych
    case 'verification':
    case 'advanced':
      return 'qwen2.5:14b' // Najinteligentniejszy do weryfikacji
    default:
      return 'llama3.1:8b'
  }
}

/** Wywołanie lokalnego modelu AI przez Ollama */
async function callOllamaAPI(prompt: string, taskType: 'cleaning' | 'notes' | 'flashcards' | 'verification' | 'advanced' = 'notes'): Promise<string> {
  const ollamaUrl = 'http://localhost:11434'
  const model = selectModelForTask(taskType)
  
  try {
    log(`[Ollama] Wywołuję model ${model} dla zadania: ${taskType}`)
    const startTime = Date.now()
    
    // Timeout controller - 120 sekund dla dużych modeli
    const controller = new AbortController()
    const timeoutId = setTimeout(() => controller.abort(), 120000)
    
    const response = await fetch(`${ollamaUrl}/api/generate`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      signal: controller.signal,
      body: JSON.stringify({
        model,
        prompt,
        stream: false,
        options: {
          temperature: taskType === 'cleaning' ? 0.1 : 0.3,
          top_p: 0.9,
          top_k: 40,
          // Limit tokenów - dla cleaning pozwól na długie odpowiedzi
          num_predict: taskType === 'cleaning' ? 8192  // 8k tokenów = ~24k znaków
            : taskType === 'notes' ? 2048
            : taskType === 'flashcards' ? 2048 
            : taskType === 'verification' ? 256
            : 1024
        }
      })
    })
    
    clearTimeout(timeoutId)
    
    if (!response.ok) {
      throw new Error(`Ollama API error: ${response.status} ${response.statusText}`)
    }
    
    const data: OllamaResponse = await response.json()
    const elapsedMs = Date.now() - startTime
    log(`[Ollama] ${model} odpowiedział: ${data.response.length} znaków w ${Math.round(elapsedMs)}ms (${(elapsedMs/1000).toFixed(1)}s)`)
    
    return data.response.trim()
    
  } catch (error: any) {
    if (error.name === 'AbortError') {
      log(`[Ollama] Timeout - ${model} nie odpowiedział w 120s`)
      throw new Error(`Model ${model} nie odpowiedział w czasie (timeout 120s). Spróbuj mniejszego modelu.`)
    }
    
    log(`[Ollama] Błąd wywołania ${model}: ${error?.message}`)
    
    // Sprawdź czy Ollama działa
    try {
      const healthCheck = await fetch(`${ollamaUrl}/api/tags`)
      if (!healthCheck.ok) {
        throw new Error('Ollama serwer nie odpowiada. Uruchom: ollama serve')
      }
      const tags = await healthCheck.json()
      log(`[Ollama] Dostępne modele: ${tags.models?.map((m: any) => m.name).join(', ') || 'brak'}`)
    } catch {
      throw new Error('Ollama nie jest dostępna. Zainstaluj i uruchom: ollama serve')
    }
    
    // Fallback na mniejszy model jeśli większy nie działa (tylko raz!)
    if (model !== 'phi3.5:3.8b') {
      log(`[Ollama] Próbuję fallback na phi3.5:3.8b...`)
      const fallbackModel = 'phi3.5:3.8b'
      try {
        const response = await fetch(`${ollamaUrl}/api/generate`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            model: fallbackModel,
            prompt,
            stream: false,
            options: { temperature: 0.1, top_p: 0.9 }
          })
        })
        
        if (response.ok) {
          const data: OllamaResponse = await response.json()
          log(`[Ollama] Fallback ${fallbackModel} sukces: ${data.response.length} znaków`)
          return data.response.trim()
        }
      } catch (fallbackError: any) {
        log(`[Ollama] Fallback także nie powiódł się: ${fallbackError?.message}`)
      }
    }
    
    throw new Error(`Nie można połączyć z modelem ${model}. Sprawdź czy model jest zainstalowany: ollama list`)
  }
}

/** Uniwersalna funkcja generowania z AI dla zakładek wykładów */
export async function generateWithAI(
  prompt: string, 
  taskType: 'notes' | 'cleaning' | 'flashcards' | 'verification' = 'notes'
): Promise<string> {
  return await callOllamaAPI(prompt, taskType)
}

/** Prawdziwy web search przez DuckDuckGo API */
async function performWebSearch(query: string, maxResults: number = 5): Promise<Array<{
  title: string
  url: string
  snippet: string
}>> {
  try {
    log(`[WebSearch] Szukam: "${query}"`)
    
    // Użyj DuckDuckGo Instant Answer API (działa bez CORS)
    const apiUrl = `https://api.duckduckgo.com/?q=${encodeURIComponent(query)}&format=json&no_html=1&skip_disambig=1`
    
    const controller = new AbortController()
    const timeoutId = setTimeout(() => controller.abort(), 10000) // 10s timeout
    
    const response = await fetch(apiUrl, { signal: controller.signal })
    clearTimeout(timeoutId)
    
    if (!response.ok) {
      throw new Error(`HTTP ${response.status}`)
    }
    
    const data = await response.json()
    const results: Array<{ title: string; url: string; snippet: string }> = []
    
    // Zbierz wyniki z Abstract
    if (data.AbstractText && data.AbstractURL) {
      results.push({
        title: data.Heading || 'Wikipedia/Encyclopedia',
        url: data.AbstractURL,
        snippet: data.AbstractText
      })
    }
    
    // Dodaj Related Topics (główne wyniki)
    if (data.RelatedTopics && Array.isArray(data.RelatedTopics)) {
      for (const item of data.RelatedTopics) {
        if (results.length >= maxResults) break
        
        // Sprawdź czy to grupa (Name) czy pojedynczy wynik
        if (item.Topics && Array.isArray(item.Topics)) {
          // To grupa - weź wyniki z podgrupy
          for (const topic of item.Topics) {
            if (results.length >= maxResults) break
            if (topic.Text && topic.FirstURL) {
              results.push({
                title: topic.Text.split(' - ')[0] || topic.Text.substring(0, 100),
                url: topic.FirstURL,
                snippet: topic.Text
              })
            }
          }
        } else if (item.Text && item.FirstURL) {
          // To pojedynczy wynik
          results.push({
            title: item.Text.split(' - ')[0] || item.Text.substring(0, 100),
            url: item.FirstURL,
            snippet: item.Text
          })
        }
      }
    }
    
    // Jeśli nadal brak wyników, użyj Answer/Definition
    if (results.length === 0 && data.Answer) {
      results.push({
        title: 'Direct Answer',
        url: data.AbstractURL || 'https://duckduckgo.com/?q=' + encodeURIComponent(query),
        snippet: data.Answer
      })
    }
    
    if (results.length === 0 && data.Definition) {
      results.push({
        title: data.DefinitionSource || 'Definition',
        url: data.DefinitionURL || 'https://duckduckgo.com/?q=' + encodeURIComponent(query),
        snippet: data.Definition
      })
    }
    
    log(`[WebSearch] Znaleziono ${results.length} wyników`)
    
    // Jeśli nadal brak wyników, zwróć informacyjny komunikat
    if (results.length === 0) {
      log('[WebSearch] Brak wyników dla tego zapytania')
      return [{
        title: 'Brak wyników',
        url: 'https://duckduckgo.com/?q=' + encodeURIComponent(query),
        snippet: `Nie znaleziono informacji o: "${query}". Może to być zbyt specyficzne zapytanie lub temat lokalny.`
      }]
    }
    
    return results
    
  } catch (error: any) {
    log(`[WebSearch] Błąd: ${error?.message}`)
    
    // Fallback - informacyjny komunikat
    return [{
      title: 'Wyszukiwanie niedostępne',
      url: 'https://duckduckgo.com/?q=' + encodeURIComponent(query),
      snippet: `Nie udało się wyszukać informacji. Błąd: ${error?.message || 'Unknown'}. Sprawdź połączenie internetowe.`
    }]
  }
}

/** AI-powered czyszczenie tekstu z zacinania się i poprawek - ZACHOWUJE CAŁĄ TREŚĆ */
export async function cleanTextWithAI(rawText: string): Promise<{ 
  cleanedText: string
  changes: string[]
  summary: string 
}> {
  if (!rawText.trim()) {
    return { cleanedText: '', changes: [], summary: 'Brak tekstu do czyszczenia' }
  }
  
  const s = getSettings()
  const model = selectModelForTask('cleaning')
  
  // Dla długich tekstów (>10k znaków), przetwarzaj w kawałkach
  if (rawText.length > 10000) {
    log(`[Cleaning] Długi tekst (${rawText.length} znaków), przetwarzanie w kawałkach...`)
    
    const chunkSize = 8000 // Kawałki po 8k znaków
    const chunks: string[] = []
    
    for (let i = 0; i < rawText.length; i += chunkSize) {
      chunks.push(rawText.substring(i, i + chunkSize))
    }
    
    log(`[Cleaning] Podzielono na ${chunks.length} kawałków`)
    const cleanedChunks: string[] = []
    
    for (let i = 0; i < chunks.length; i++) {
      const chunk = chunks[i]
      log(`[Cleaning] Przetwarzanie kawałka ${i+1}/${chunks.length} (${chunk.length} znaków)`)
      
      const prompt = `Wyczyść ten fragment transkrypcji wykładu. ZACHOWAJ CAŁĄ TREŚĆ - tylko usuń zacinania i wypełniacze!

FRAGMENT:
"${chunk}"

ZADANIA:
1. Usuń zacinania (p-p-podstawy → podstawy)
2. Usuń wypełniacze (eee, mmm, no więc, znaczy się, jakby)
3. Wybierz poprawną wersję przy poprawkach ("nie nie, to ma być X" → "to ma być X")
4. ZACHOWAJ wszystkie fakty, liczby, definicje, przykłady
5. NIE skracaj treści, NIE parafrazuj, NIE opuszczaj fragmentów

OCZYSZCZONY FRAGMENT:`

      try {
        const cleaned = await callOllamaAPI(prompt, 'cleaning')
        cleanedChunks.push(cleaned.trim())
      } catch (err: any) {
        log(`[Cleaning] Błąd w kawałku ${i+1}: ${err.message}, używam oryginału`)
        cleanedChunks.push(chunk)
      }
    }
    
    const finalText = cleanedChunks.join(' ')
    const changes = [`Przetworzono ${chunks.length} fragmentów`, `Długość: ${rawText.length} → ${finalText.length} znaków`]
    
    return {
      cleanedText: finalText,
      changes,
      summary: `Oczyszczono długi tekst (${chunks.length} fragmentów, ${finalText.length} znaków końcowych)`
    }
  }
  
  // Dla krótszych tekstów - jedno wywołanie
  const estimatedTime = estimateAITime('cleaning', rawText.length, model)
  updateGlobalStatus('Czyszczenie tekstu AI', 'Przygotowanie...', 0, estimatedTime)
  
  const prompt = `Wyczyść tę transkrypcję wykładu. WAŻNE: ZACHOWAJ CAŁĄ TREŚĆ - tylko usuń zacinania i wypełniacze!

TRANSKRYPCJA:
"${rawText}"

ZADANIA:
1. Usuń zacinania się (p-p-podstawy → podstawy, fi-fi-fizyka → fizyka)
2. Usuń wypełniacze mowy (eee, mmm, no więc, znaczy się, jakby, typu)
3. Przy poprawkach wybierz FINALNĄ wersję:
   - "to jest błędne... nie, to jest poprawne" → "to jest poprawne"
4. ZACHOWAJ wszystkie fakty, liczby, definicje, terminy, przykłady
5. NIE skracaj, NIE parafrazuj, NIE opuszczaj żadnych fragmentów
6. Wynik powinien mieć podobną długość jak oryginał

OCZYSZCZONY TEKST:`

  try {
    updateGlobalStatus('Czyszczenie tekstu AI', `Model: ${model}`, 20, estimatedTime)
    const cleanedText = await callOllamaAPI(prompt, 'cleaning')
    updateGlobalStatus('Czyszczenie tekstu AI', 'Analiza zmian...', 90, estimatedTime)
    
    // Analiza zmian
    const changes: string[] = []
    const originalLength = rawText.length
    const cleanedLength = cleanedText.length
    
    if (originalLength > cleanedLength) {
      changes.push(`Skrócono tekst o ${originalLength - cleanedLength} znaków`)
    }
    
    // Sprawdź czy usunięto typowe zacinania
    if (/\w-\w-\w/.test(rawText) && !/\w-\w-\w/.test(cleanedText)) {
      changes.push('Usunięto zacinanie się')
    }
    
    if (/\b(eee|mmm|znaczy|no więc)\b/i.test(rawText) && !/\b(eee|mmm|znaczy|no więc)\b/i.test(cleanedText)) {
      changes.push('Usunięto wypełniacze mowy')
    }
    
    if (/\b(nie nie|znaczy nie|właściwie)\b/i.test(rawText)) {
      changes.push('Skorygowano poprawki profesora')
    }
    
    const summary = `Tekst oczyszczony przez AI: ${changes.length > 0 ? changes.join(', ') : 'Brak znaczących zmian'}`
    
    updateGlobalStatus('Czyszczenie tekstu AI', 'Gotowe!', 100, estimatedTime)
    setTimeout(clearGlobalStatus, 1500)
    
    return { cleanedText, changes, summary }
    
  } catch (error: any) {
    clearGlobalStatus()
    log(`[AI Clean] Błąd: ${error?.message}`)
    // Fallback do oryginalnego tekstu
    return { 
      cleanedText: rawText, 
      changes: ['Błąd AI - użyto tekstu oryginalnego'], 
      summary: `Błąd czyszczenia AI: ${error?.message}` 
    }
  }
}

/** AI-powered generowanie notatek na poziomie studenckim */
export async function generateNotesWithAI(text: string): Promise<{
  formatted: string
  structured: string
  summary: string
  keyPoints: string
  questions: string
}> {
  if (!text.trim()) {
    return { formatted: '', structured: '', summary: '', keyPoints: '', questions: '' }
  }
  
  const model = selectModelForTask('notes')
  const estimatedTime = estimateAITime('notes', text.length, model)
  
  updateGlobalStatus('Generowanie notatek AI', 'Przygotowanie...', 0, estimatedTime)
  log(`[AI Notes] Rozpoczynam generowanie dla ${text.length} znaków, model: ${model}, szacowany czas: ${(estimatedTime/1000).toFixed(1)}s`)
  
  const prompt = `Jestem studentem i potrzebuję profesjonalnych notatek z tego materiału na poziomie uniwersyteckim.

MATERIAŁ:
"${text.substring(0, 3000)}"${text.length > 3000 ? `\n\n[... i ${text.length - 3000} znaków więcej]` : ''}

Wygeneruj ZWIĘZŁE notatki w formacie JSON (maksymalnie 500 słów):

{
  "formatted": "# Tytuł\\n\\n## Główne zagadnienia\\n[zwięzły opis]",
  "structured": "1. **Pojęcie główne**\\n   - Definicja\\n   - Kluczowe cechy",
  "summary": "Podsumowanie w 2-3 zdaniach",
  "keyPoints": "• Punkt 1\\n• Punkt 2\\n• Punkt 3",
  "questions": "1. Pytanie 1\\n2. Pytanie 2\\n3. Pytanie 3"
}

WAŻNE: Odpowiedź MUSI być zwięzła i w poprawnym formacie JSON!`

  try {
    updateGlobalStatus('Generowanie notatek AI', `Model: ${model}`, 20, estimatedTime)
    log(`[AI Notes] Wywołuję ${model}...`)
    const response = await callOllamaAPI(prompt, 'notes')
    log(`[AI Notes] Otrzymano odpowiedź: ${response.length} znaków`)
    updateGlobalStatus('Generowanie notatek AI', 'Parsowanie odpowiedzi...', 90, estimatedTime)
    
    // Parsuj JSON z odpowiedzi
    const jsonMatch = response.match(/\{[\s\S]*\}/)
    if (jsonMatch) {
      log(`[AI Notes] Znaleziono JSON, parsowanie...`)
      const result = JSON.parse(jsonMatch[0])
      updateGlobalStatus('Generowanie notatek AI', 'Gotowe!', 100, estimatedTime)
      setTimeout(clearGlobalStatus, 1500)
      
      return {
        formatted: result.formatted || '',
        structured: result.structured || '',
        summary: result.summary || '',
        keyPoints: result.keyPoints || '',
        questions: result.questions || ''
      }
    } else {
      // Fallback - zwróć surową odpowiedź
      log(`[AI Notes] Brak JSON w odpowiedzi, używam surowej`)
      updateGlobalStatus('Generowanie notatek AI', 'Gotowe (partial)', 100, estimatedTime)
      setTimeout(clearGlobalStatus, 1500)
      
      return {
        formatted: response,
        structured: '',
        summary: '',
        keyPoints: '',
        questions: ''
      }
    }
    
  } catch (error: any) {
    clearGlobalStatus()
    log(`[AI Notes] Błąd: ${error?.message}`)
    log(`[AI Notes] Stack: ${error?.stack}`)
    
    // Fallback do prostych funkcji
    return {
      formatted: `# Notatki\n\n${text}`,
      structured: text.split(/[.!?]\s+/).slice(0, 8).map((s, i) => `${i + 1}. ${s.trim()}`).join('\n'),
      summary: text.split(/[.!?]\s+/).slice(0, 3).join('. '),
      keyPoints: text.split(/[.!?]\s+/).slice(0, 6).map(s => `• ${s.trim()}`).join('\n'),
      questions: `1. O czym mówi ten tekst?\n2. Jakie są główne punkty?\n3. Jak można to zastosować?`
    }
  }
}

/** AI-powered generowanie fiszek na poziomie studenckim */
export async function generateFlashcardsWithAI(text: string): Promise<Array<{
  question: string
  answer: string
  category: string
  difficulty: 'easy' | 'medium' | 'hard'
}>> {
  if (!text.trim()) return []
  
  log(`[AI Flashcards] Generuję fiszki dla ${text.length} znaków`)
  
  const prompt = `Stwórz KOMPLETNY zestaw fiszek pokrywający WSZYSTKIE ważne informacje z tego materiału.

MATERIAŁ:
"${text.substring(0, 5000)}"${text.length > 5000 ? '\n[...]' : ''}

ZASADY:
✅ Stwórz fiszki dla KAŻDEJ definicji, koncepcji, terminu
✅ Uwzględnij przykłady, wzory, daty, fakty
✅ Różne poziomy trudności (easy, medium, hard)
✅ Kategorie: definicja/zastosowanie/analiza/wzór/przykład
❌ ŻADNYCH limitów - pokryj wszystko co ważne

Format JSON (TYLKO array, bez innych tekstów):
[
  {
    "question": "Pytanie?",
    "answer": "Odpowiedź",
    "category": "definicja",
    "difficulty": "easy"
  },
  {
    "question": "Inne pytanie?",
    "answer": "Inna odpowiedź",
    "category": "zastosowanie",
    "difficulty": "medium"
  }
]

Odpowiedź (tylko JSON array):`

  try {
    const response = await callOllamaAPI(prompt, 'flashcards')
    log(`[AI Flashcards] Otrzymano: ${response.length} znaków`)
    
    // Parsuj JSON
    const jsonMatch = response.match(/\[[\s\S]*\]/)
    if (jsonMatch) {
      log(`[AI Flashcards] Znaleziono JSON array, parsowanie...`)
      try {
        const flashcards = JSON.parse(jsonMatch[0])
        log(`[AI Flashcards] Sparsowano ${flashcards.length} fiszek - BEZ LIMITU`)
        return flashcards // Zwracamy wszystkie fiszki bez limitu
      } catch (parseError: any) {
        log(`[AI Flashcards] Błąd parsowania JSON: ${parseError.message}`)
        log(`[AI Flashcards] JSON fragment: ${jsonMatch[0].substring(0, 200)}...`)
      }
    } else {
      log(`[AI Flashcards] Brak JSON array w odpowiedzi`)
      log(`[AI Flashcards] Odpowiedź: ${response.substring(0, 300)}...`)
    }
    
    return []
    
  } catch (error: any) {
    log(`[AI Flashcards] Błąd: ${error?.message}`)
    
    // Fallback do prostej generacji
    const fallbackCards = await generateFlashcardsFromText(text)
    return fallbackCards.map(card => ({
      question: card.question,
      answer: card.answer,
      category: 'ogólne',
      difficulty: 'medium' as const
    }))
  }
}

/** AI-powered weryfikacja faktów przez web search */
export async function verifyFactsWithWebSearch(text: string): Promise<{
  verifiedFacts: Array<{ fact: string; verified: boolean; source?: string; confidence: number }>
  confidence: number
  suggestions: string[]
  searchResults?: any[]
}> {
  if (!text.trim()) {
    return { verifiedFacts: [], confidence: 0, suggestions: [] }
  }
  
  // Wyciągnij kluczowe fakty do weryfikacji
  const factsPrompt = `Wyciągnij 2-3 najważniejsze KONKRETNE fakty do zweryfikowania z tego tekstu:

"${text.substring(0, 1000)}"${text.length > 1000 ? '\n[...]' : ''}

WAŻNE: Wyciągaj TYLKO konkretne, sprawdzalne fakty (daty, nazwiska, liczby, definicje, wydarzenia).
Jeśli tekst nie zawiera faktów, napisz tylko: "BRAK FAKTÓW"

Format:
FAKT 1: [konkretny fakt]
FAKT 2: [konkretny fakt]
FAKT 3: [konkretny fakt]

Odpowiedź:`

  try {
    const factsResponse = await callOllamaAPI(factsPrompt, 'verification')
    
    // Sprawdź czy AI znalazł fakty
    if (factsResponse.includes('BRAK FAKTÓW') || factsResponse.includes('brak faktów')) {
      log('[Verify] Tekst nie zawiera faktów do weryfikacji')
      return {
        verifiedFacts: [],
        confidence: 100,
        suggestions: ['Tekst nie zawiera konkretnych faktów do weryfikacji']
      }
    }
    
    const facts = factsResponse
      .split('\n')
      .filter(line => /^FAKT \d+:/.test(line))
      .map(line => line.replace(/^FAKT \d+:\s*/, '').trim())
      .filter(fact => {
        // Odfiltruj meta-komunikaty i zbyt krótkie fakty
        const isMetaMessage = fact.toLowerCase().includes('brak') || 
                             fact.toLowerCase().includes('nie zawiera') ||
                             fact.toLowerCase().includes('niedostępne')
        return fact.length > 15 && !isMetaMessage
      })
    
    log(`[Verify] Znaleziono ${facts.length} faktów do weryfikacji`)
    
    if (facts.length === 0) {
      log('[Verify] Brak konkretnych faktów po filtracji')
      return {
        verifiedFacts: [],
        confidence: 100,
        suggestions: ['Tekst zawiera mało konkretnych faktów do weryfikacji']
      }
    }
    
    const verifiedFacts = []
    const allSearchResults = []
    let successfulVerifications = 0
    
    for (const fact of facts) {
      try {
        log(`[Verify] Sprawdzam: ${fact}`)
        
        // Prawdziwe wyszukiwanie w internecie
        const searchResults = await performWebSearch(fact, 3)
        allSearchResults.push(...searchResults)
        
        if (searchResults.length > 0 && !searchResults[0].snippet.includes('Wyniki niedostępne')) {
          // AI weryfikuje czy znalezione wyniki potwierdzają fakt
          const verificationPrompt = `Sprawdź czy ten FAKT jest potwierdzony przez wyniki wyszukiwania:

FAKT: "${fact}"

WYNIKI WYSZUKIWANIA:
${searchResults.map((r, i) => `${i+1}. ${r.title}: ${r.snippet}`).join('\n')}

Czy wyniki potwierdzają fakt? Odpowiedz TYLKO:
- TAK [poziom pewności 0-100%] - jeśli wyniki jednoznacznie potwierdzają
- NIE [poziom pewności 0-100%] - jeśli wyniki zaprzeczają lub są sprzeczne  
- BRAK DANYCH [poziom pewności 0-100%] - jeśli wyniki nie dotyczą tematu

Format: [TAK/NIE/BRAK DANYCH] [liczba]%`

          const verificationResult = await callOllamaAPI(verificationPrompt, 'verification')
          const match = verificationResult.match(/(TAK|NIE|BRAK DANYCH)\s+(\d+)%/)
          
          if (match) {
            const isVerified = match[1] === 'TAK'
            const confidence = parseInt(match[2])
            
            verifiedFacts.push({
              fact,
              verified: isVerified,
              source: searchResults[0].url,
              confidence
            })
            
            if (isVerified && confidence > 70) successfulVerifications++
          } else {
            // Fallback
            verifiedFacts.push({
              fact,
              verified: false,
              source: searchResults[0].url,
              confidence: 30
            })
          }
        } else {
          verifiedFacts.push({
            fact,
            verified: false,
            confidence: 0
          })
        }
        
      } catch (error: any) {
        log(`[Verify] Błąd weryfikacji: ${error?.message}`)
        verifiedFacts.push({ 
          fact, 
          verified: false, 
          confidence: 0 
        })
      }
    }
    
    const overallConfidence = facts.length > 0 ? (successfulVerifications / facts.length) * 100 : 0
    
    const suggestions = []
    if (overallConfidence < 50) {
      suggestions.push('Niski poziom weryfikacji - sprawdź dodatkowe źródła')
    }
    if (facts.length < 3) {
      suggestions.push('Tekst zawiera mało konkretnych faktów do weryfikacji')
    }
    if (overallConfidence > 80) {
      suggestions.push('Wysoki poziom weryfikacji - informacje wydają się wiarygodne')
    }
    
    return { 
      verifiedFacts, 
      confidence: overallConfidence, 
      suggestions,
      searchResults: allSearchResults
    }
    
  } catch (error: any) {
    log(`[Verify] Błąd: ${error?.message}`)
    return {
      verifiedFacts: [{ fact: 'Błąd weryfikacji AI', verified: false, confidence: 0 }],
      confidence: 0,
      suggestions: ['Spróbuj ponownie lub sprawdź ręcznie']
    }
  }
}
