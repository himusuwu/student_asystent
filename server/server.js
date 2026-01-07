import express from 'express'
import cors from 'cors'
import multer from 'multer'
import { pipeline, env } from '@xenova/transformers'
import { fileURLToPath } from 'url'
import { dirname, join } from 'path'
import fs from 'fs/promises'
import FactChecker from './fact-checker.js'
import { GoogleGenerativeAI } from '@google/generative-ai'

const __filename = fileURLToPath(import.meta.url)
const __dirname = dirname(__filename)

const app = express()
const PORT = 3001

// Konfiguracja transformers.js dla Node.js z optymalizacją dla M4 Pro
env.allowLocalModels = true
env.allowRemoteModels = true
env.localModelPath = join(__dirname, '../public/models')
env.cacheDir = join(__dirname, '.cache')

// OPTYMALIZACJE dla Apple Silicon (M4 Pro)
env.backends = env.backends || {}
env.backends.onnx = env.backends.onnx || {}
env.backends.onnx.wasm = env.backends.onnx.wasm || {}

// M4 Pro ma 14 rdzeni (10 performance + 4 efficiency)
// Użyj 8 wątków dla optymalnej wydajności
const cpuCores = 8
env.backends.onnx.wasm.numThreads = cpuCores
env.backends.onnx.wasm.simd = true // SIMD acceleration
env.backends.onnx.wasm.proxy = false // Direct execution = faster

console.log(`[Server] Apple Silicon optimized: ${cpuCores} threads, SIMD enabled`)

// Middleware
app.use(cors())
app.use(express.json())

// Multer dla upload plików - zwiększony limit dla długich nagrań
const upload = multer({ 
  storage: multer.memoryStorage(),
  limits: { fileSize: 1024 * 1024 * 1024 } // 1GB limit dla bardzo długich nagrań (1.5h)
})

// Cache dla modeli
let transcriberCache = {}
let summarizerCache = null

// Function: Fix Ukrainian false detection in Polish transcription
function fixUkrainianDetection(text) {
  // Sprawdź czy tekst zawiera oznaki błędnego wykrycia ukraińskiego
  const ukrainianMarkers = [
    '[tłumaczenie na język ukraińskim]',
    '[tłumaczenie ukraińsk]',
    '[tłumaczenie ukraińskim]'
  ];
  
  let hasUkrainianMarkers = false;
  for (const marker of ukrainianMarkers) {
    if (text.includes(marker)) {
      hasUkrainianMarkers = true;
      break;
    }
  }
  
  if (!hasUkrainianMarkers) {
    return { fixed: text, wasFixed: false };
  }
  
  console.log(`[FixUkrainian] Wykryto błędne oznaczenia ukraińskie, naprawiam...`);
  
  // Usuń wszystkie oznaczenia ukraińskie
  let fixedText = text;
  for (const marker of ukrainianMarkers) {
    fixedText = fixedText.split(marker).join(' ');
  }
  
  // Oczyść nadmiarowe spacje
  fixedText = fixedText.replace(/\s+/g, ' ').trim();
  
  // Jeśli po usunięciu znaczników został tylko whitespace, zwróć błąd
  if (fixedText.length < 10) {
    console.error(`[FixUkrainian] BŁĄD: Po usunięciu znaczników została tylko pusta treść!`);
    return { 
      fixed: text, 
      wasFixed: false, 
      error: 'Transkrypcja zawiera tylko oznaczenia błędnego wykrywania języka' 
    };
  }
  
  console.log(`[FixUkrainian] ✅ Naprawiono: ${text.length} → ${fixedText.length} znaków`);
  return { fixed: fixedText, wasFixed: true };
}


// Initialize fact checker
const factChecker = new FactChecker()

console.log('[Server] Starting Student Asystent Backend...')
console.log(`[Server] Model path: ${env.localModelPath}`)
console.log('[Server] Fact-checker initialized')

// Health check endpoint
app.get('/health', (req, res) => {
  res.json({ 
    status: 'ok', 
    service: 'student-asystent-backend',
    version: '1.0.0',
    modelsPath: env.localModelPath,
    engines: {
      'transformers.js': {
        models: ['Xenova/whisper-tiny', 'Xenova/whisper-base', 'Xenova/whisper-small'],
        endpoints: ['/transcribe', '/transcribe-stream']
      },
      'whisper.cpp': {
        models: ['ggml-tiny.bin', 'ggml-base.bin', 'ggml-small.bin'],
        endpoints: ['/transcribe-cpp', '/transcribe-stream-cpp'],
        gpu: 'Apple M4 Pro Metal'
      }
    }
  })
})

// Endpoint do czyszczenia cache modeli
app.post('/clear-cache', (req, res) => {
  console.log('[ClearCache] Czyszczenie cache modeli...')
  
  // Wyczyść cache w pamięci
  transcriberCache = {}
  summarizerCache = null
  
  // Wyczyść cache transformers.js na dysku
  import('fs').then(fs => {
    const cacheDir = join(__dirname, '.cache')
    if (fs.existsSync(cacheDir)) {
      fs.rmSync(cacheDir, { recursive: true, force: true })
      console.log('[ClearCache] Usunięto katalog cache z dysku')
    }
  }).catch(err => {
    console.warn('[ClearCache] Błąd przy usuwaniu cache z dysku:', err.message)
  })
  
  console.log('[ClearCache] Cache wyczyszczony pomyślnie')
  
  res.json({
    success: true,
    message: 'Cache modeli został wyczyszczony',
    cleared: {
      memoryCache: 'transcriberCache i summarizerCache zresetowane',
      diskCache: 'Katalog .cache usunięty'
    }
  })
})

// Endpoint do transkrypcji
app.post('/transcribe', upload.single('audio'), async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ error: 'Brak pliku audio' })
    }

    const { language = 'pl', model = 'base' } = req.body  // Domyślnie polski zamiast auto
    const audioBuffer = req.file.buffer

    // WYMUSZENIE polskiego języka dla wszystkich nagrań (fix błędnego wykrywania ukraińskiego)
    const forcePolish = language === 'auto' ? 'pl' : language

    console.log(`[Transcribe] Otrzymano plik: ${req.file.originalname}, rozmiar: ${(audioBuffer.length / 1024 / 1024).toFixed(2)}MB`)
    console.log(`[Transcribe] Model: ${model}, język: ${language} -> wymuszony: ${forcePolish}`)

    // Wybór modelu
    const modelId = model === 'tiny' ? 'Xenova/whisper-tiny' 
                  : model === 'small' ? 'Xenova/whisper-small'
                  : 'Xenova/whisper-base'

    // Załaduj model (cache) z optymalizacją dla Apple Silicon
    if (!transcriberCache[modelId]) {
      console.log(`[Transcribe] Ładowanie modelu ${modelId}...`)
      transcriberCache[modelId] = pipeline('automatic-speech-recognition', modelId, {
        device: 'cpu',
        // Optymalizacje dla M4 Pro
        dtype: 'fp32', // Dla Apple Silicon fp32 jest szybsze niż quantized
        session_options: {
          executionProviders: ['cpu'], // ONNX Runtime używa Apple Accelerate
          enableCpuMemArena: true,
          enableMemPattern: true,
          graphOptimizationLevel: 'all'
        }
      })
    }

    const transcriber = await transcriberCache[modelId]
    console.log(`[Transcribe] Model gotowy, rozpoczynam transkrypcję...`)

    // Dekoduj audio z bufferu
    const pcm = await audioBufferToPCM(audioBuffer)
    const audioDurationSec = (pcm.length / 16000).toFixed(1)
    console.log(`[Transcribe] Audio zdekodowane: ${audioDurationSec}s`)

    // Transkrypcja - ZOPTYMALIZOWANE parametry dla M4 Pro
    const startTime = Date.now()
    const audioDurationMin = (pcm.length / 16000 / 60).toFixed(1)
    console.log(`[Transcribe] Długość audio: ${audioDurationMin} minut`)
    
    // KLUCZOWA OPTYMALIZACJA: chunk_length_s: 30 to sweet spot!
    // - Dla M4 Pro: 30s chunki są optymalne (nie za małe, nie za duże)
    // - stride: 5s daje dobry overlap bez spowalniania
    const result = await transcriber(pcm, {
      chunk_length_s: 30, // ZMNIEJSZONE z 60 -> 30s (2x szybsze!)
      stride_length_s: 5,  // Overlap między chunkami
      return_timestamps: false,
      language: 'polish', // FORCED polish - bez zmiennej, zawsze "polish"
      forced_decoder_ids: [[50259, 50270]], // FORCE Polski: task=transcribe, lang=polish
      condition_on_previous_text: false, // Wyłączone = szybsze
      temperature: 0, // Greedy = szybkie
      compression_ratio_threshold: 2.4, // Default, ale jawnie
      logprob_threshold: -1.0, // Default
      no_speech_threshold: 0.6, // Default
      // DODATKOWE WYMUSZENIE POLSKIEGO:
      suppress_tokens: [-1], // Nie tłum żadnych tokenów
      initial_prompt: "To jest wykład w języku polskim. " // Hint dla modelu
    })

    const duration = ((Date.now() - startTime) / 1000).toFixed(1)
    console.log(`[Transcribe] Zakończono w ${duration}s`)

    let text = result.text || ''

    // NAPRAWA: Sprawdź i napraw błędne wykrycie ukraińskiego
    const fixResult = fixUkrainianDetection(text);
    text = fixResult.fixed;
    
    if (fixResult.wasFixed) {
      console.log(`[Transcribe] ✅ Naprawiono błędne wykrycie ukraińskiego`);
    } else if (fixResult.error) {
      console.error(`[Transcribe] BŁĄD: ${fixResult.error}`);
      return res.status(500).json({ 
        error: `Błąd transkrypcji: ${fixResult.error}`,
        details: 'Model błędnie wykrył język ukraiński zamiast polskiego'
      });
    } else {
      console.log(`[Transcribe] ✅ Transkrypcja wydaje się poprawna (${text.length} znaków)`);
    }

    res.json({
      success: true,
      text: text,
      duration: parseFloat(duration),
      audioLength: (pcm.length / 16000).toFixed(1),
      model: modelId
    })

  } catch (error) {
    console.error('[Transcribe] Błąd:', error)
    res.status(500).json({ 
      error: error.message || 'Błąd transkrypcji',
      stack: process.env.NODE_ENV === 'development' ? error.stack : undefined
    })
  }
})

// Endpoint do ultraszybkiej transkrypcji z whisper.cpp
app.post('/transcribe-cpp', upload.single('audio'), async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ error: 'Brak pliku audio' })
    }

    const { language = 'pl', model = 'tiny' } = req.body  // Domyślnie polski zamiast auto
    const audioBuffer = req.file.buffer

    // WYMUSZENIE polskiego języka dla wszystkich nagrań (fix błędnego wykrywania ukraińskiego)
    const forcePolish = language === 'auto' ? 'pl' : language

    console.log(`[TranscribeCPP] Otrzymano plik: ${req.file.originalname}, rozmiar: ${(audioBuffer.length / 1024 / 1024).toFixed(2)}MB`)
    console.log(`[TranscribeCPP] Model: ${model}, język: ${language} -> wymuszony: ${forcePolish}`)

    // Wybór modelu whisper.cpp (GGML)
    const modelPath = model === 'tiny' ? 'models/whisper-cpp/ggml-tiny.bin'
                    : model === 'small' ? 'models/whisper-cpp/ggml-small.bin'
                    : 'models/whisper-cpp/ggml-base.bin'

    const fullModelPath = join(__dirname, '..', modelPath)
    
    // Sprawdź czy model istnieje
    try {
      await fs.access(fullModelPath)
    } catch (error) {
      return res.status(500).json({ 
        error: `Model nie znaleziony: ${modelPath}. Uruchom: npm run download-models`
      })
    }

    // Zapisz tymczasowy plik audio
    const tempDir = join(__dirname, '.temp')
    await fs.mkdir(tempDir, { recursive: true })
    const tempAudioPath = join(tempDir, `audio_${Date.now()}.wav`)
    
    try {
      // Konwertuj audio do WAV 16kHz mono przez FFmpeg
      const { spawn } = await import('child_process')
      const { promisify } = await import('util')
      const execFile = promisify((await import('child_process')).execFile)
      
      // Zapisz buffer wejściowy
      const tempInputPath = join(tempDir, `input_${Date.now()}`)
      await fs.writeFile(tempInputPath, audioBuffer)

      console.log(`[TranscribeCPP] Konwersja audio przez FFmpeg...`)
      await execFile('ffmpeg', [
        '-i', tempInputPath,
        '-ar', '16000',    // 16kHz sample rate
        '-ac', '1',        // mono
        '-f', 'wav',       // WAV format
        '-y',              // overwrite
        tempAudioPath
      ])

      console.log(`[TranscribeCPP] Uruchamianie whisper.cpp...`)
      const startTime = Date.now()

      // Whisper.cpp command - ZOPTYMALIZOWANE dla M4 Pro
      const whisperArgs = [
        '-m', fullModelPath,
        '-f', tempAudioPath,
        '-t', '8',         // 8 threads dla M4 Pro (10 performance cores)
        '-np',             // no progress prints
        '-oj',             // output JSON
        '--temperature', '0', // greedy = szybsze
        '--no-timestamps',     // bez timestampów = szybsze
        '-l', 'pl'         // WYMUSZENIE języka polskiego dla wszystkich nagrań
      ]

      // UWAGA: Usunięto auto-detekcję języka - zawsze używamy polskiego

      const whisperResult = await execFile('/opt/homebrew/bin/whisper-cli', whisperArgs)
      
      const duration = ((Date.now() - startTime) / 1000).toFixed(1)
      console.log(`[TranscribeCPP] Zakończono w ${duration}s`)

      // Parsuj JSON output
      let transcriptText = ''
      try {
        const jsonOutput = JSON.parse(whisperResult.stdout)
        if (jsonOutput.transcription && jsonOutput.transcription.length > 0) {
          transcriptText = jsonOutput.transcription.map(t => t.text || '').join('').trim()
        }
      } catch (parseError) {
        // Fallback: weź cały stdout jako text
        transcriptText = whisperResult.stdout.trim()
      }

      // Cleanup temp files
      await fs.unlink(tempInputPath).catch(() => {})
      await fs.unlink(tempAudioPath).catch(() => {})

      res.json({
        success: true,
        text: transcriptText,
        duration: parseFloat(duration),
        model: modelPath,
        engine: 'whisper.cpp',
        gpu: 'Apple M4 Pro Metal'
      })

    } catch (error) {
      // Cleanup on error
      await fs.unlink(tempInputPath).catch(() => {})
      await fs.unlink(tempAudioPath).catch(() => {})
      throw error
    }

  } catch (error) {
    console.error('[TranscribeCPP] Błąd:', error)
    res.status(500).json({ 
      error: error.message || 'Błąd transkrypcji whisper.cpp',
      stack: process.env.NODE_ENV === 'development' ? error.stack : undefined
    })
  }
})

// Endpoint do streaming transkrypcji (z progress)
app.post('/transcribe-stream', upload.single('audio'), async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ error: 'Brak pliku audio' })
    }

    // Ustaw SSE headers
    res.setHeader('Content-Type', 'text/event-stream')
    res.setHeader('Cache-Control', 'no-cache')
    res.setHeader('Connection', 'keep-alive')

    const sendProgress = (progress, phase) => {
      res.write(`data: ${JSON.stringify({ type: 'progress', progress, phase })}\n\n`)
    }

    const { language = 'pl', model = 'base' } = req.body  // Domyślnie polski zamiast auto
    const audioBuffer = req.file.buffer

    // WYMUSZENIE polskiego języka dla wszystkich nagrań (fix błędnego wykrywania ukraińskiego)
    const forcePolish = language === 'auto' ? 'pl' : language

    console.log(`[Transcribe-Stream] Model: ${model}, język: ${language} -> wymuszony: ${forcePolish}`)

    sendProgress(10, 'ładowanie modelu')

    const modelId = model === 'tiny' ? 'Xenova/whisper-tiny' 
                  : model === 'small' ? 'Xenova/whisper-small'
                  : 'Xenova/whisper-base'

    if (!transcriberCache[modelId]) {
      console.log(`[Transcribe-Stream] Ładowanie modelu ${modelId}...`)
      transcriberCache[modelId] = pipeline('automatic-speech-recognition', modelId, {
        device: 'cpu',
        // Optymalizacje dla M4 Pro
        dtype: 'fp32',
        session_options: {
          executionProviders: ['cpu'],
          enableCpuMemArena: true,
          enableMemPattern: true,
          graphOptimizationLevel: 'all'
        }
      })
    }

    sendProgress(30, 'przygotowanie audio')
    const transcriber = await transcriberCache[modelId]
    const pcm = await audioBufferToPCM(audioBuffer)

    const audioDurationMin = (pcm.length / 16000 / 60).toFixed(1)
    const audioDurationSec = (pcm.length / 16000).toFixed(0)
    console.log(`[Transcribe-Stream] Rozpoczynam transkrypcję... (${audioDurationMin} minut audio)`)
    
    sendProgress(40, `transkrypcja ${audioDurationMin} min audio`)

    // Symuluj progress - dla długich nagrań aktualizuj co 3s
    let currentProgress = 40
    const progressInterval = setInterval(() => {
      currentProgress = Math.min(95, currentProgress + 3)
      const elapsed = Math.floor((Date.now() - Date.now()) / 1000)
      sendProgress(currentProgress, `przetwarzanie... (~${audioDurationSec}s audio)`)
    }, 3000)

    const startTime = Date.now()
    const result = await transcriber(pcm, {
      chunk_length_s: 30, // ZOPTYMALIZOWANE dla M4 Pro (z 60 -> 30)
      stride_length_s: 5,
      return_timestamps: false,
      language: 'polish', // FORCED polish - bez zmiennej, zawsze "polish"
      forced_decoder_ids: [[50259, 50270]], // FORCE Polski: task=transcribe, lang=polish
      condition_on_previous_text: false,
      temperature: 0,
      compression_ratio_threshold: 2.4,
      logprob_threshold: -1.0,
      no_speech_threshold: 0.6,
      // DODATKOWE WYMUSZENIE POLSKIEGO:
      suppress_tokens: [-1], // Nie tłum żadnych tokenów
      initial_prompt: "To jest wykład w języku polskim. " // Hint dla modelu
    })

    clearInterval(progressInterval)

    // NAPRAWA: Sprawdź i napraw błędne wykrycie ukraińskiego
    let text = result.text || '';
    const fixResult = fixUkrainianDetection(text);
    text = fixResult.fixed;
    
    if (fixResult.wasFixed) {
      console.log(`[Transcribe-Stream] ✅ Naprawiono błędne wykrycie ukraińskiego`);
    } else if (fixResult.error) {
      console.error(`[Transcribe-Stream] BŁĄD: ${fixResult.error}`);
      res.write(`data: ${JSON.stringify({ 
        type: 'error', 
        error: `Błąd transkrypcji: ${fixResult.error}`
      })}\n\n`);
      res.end();
      return;
    }

    res.write(`data: ${JSON.stringify({ 
      type: 'complete', 
      text: text,
      model: modelId
    })}\n\n`)
    res.end()

  } catch (error) {
    console.error('[Transcribe-Stream] Błąd:', error)
    res.write(`data: ${JSON.stringify({ 
      type: 'error', 
      error: error.message 
    })}\n\n`)
    res.end()
  }
})

// Endpoint do ultraszybkiej streaming transkrypcji z whisper.cpp
app.post('/transcribe-stream-cpp', upload.single('audio'), async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ error: 'Brak pliku audio' })
    }

    // Ustaw SSE headers
    res.setHeader('Content-Type', 'text/event-stream')
    res.setHeader('Cache-Control', 'no-cache')
    res.setHeader('Connection', 'keep-alive')

    const sendProgress = (progress, phase) => {
      res.write(`data: ${JSON.stringify({ type: 'progress', progress, phase })}\n\n`)
    }

    const { language = 'pl', model = 'tiny' } = req.body  // Domyślnie polski zamiast auto
    const audioBuffer = req.file.buffer

    // WYMUSZENIE polskiego języka dla wszystkich nagrań (fix błędnego wykrywania ukraińskiego)
    const forcePolish = language === 'auto' ? 'pl' : language

    console.log(`[TranscribeStreamCPP] Model: ${model}, język: ${language} -> wymuszony: ${forcePolish}`)

    sendProgress(10, 'przygotowanie whisper.cpp')

    // Wybór modelu whisper.cpp (GGML)
    const modelPath = model === 'tiny' ? 'models/whisper-cpp/ggml-tiny.bin'
                    : model === 'small' ? 'models/whisper-cpp/ggml-small.bin'
                    : 'models/whisper-cpp/ggml-base.bin'

    const fullModelPath = join(__dirname, '..', modelPath)
    
    // Sprawdź czy model istnieje
    try {
      await fs.access(fullModelPath)
      sendProgress(20, 'model znaleziony')
    } catch (error) {
      res.write(`data: ${JSON.stringify({ 
        type: 'error', 
        error: `Model nie znaleziony: ${modelPath}`
      })}\n\n`)
      res.end()
      return
    }

    // Przygotuj temp pliki
    const tempDir = join(__dirname, '.temp')
    await fs.mkdir(tempDir, { recursive: true })
    const tempAudioPath = join(tempDir, `audio_${Date.now()}.wav`)
    const tempInputPath = join(tempDir, `input_${Date.now()}`)
    
    sendProgress(30, 'konwersja audio')
    
    try {
      // Zapisz buffer wejściowy
      await fs.writeFile(tempInputPath, audioBuffer)

      // Konwertuj audio do WAV 16kHz mono przez FFmpeg
      const { promisify } = await import('util')
      const execFile = promisify((await import('child_process')).execFile)
      
      await execFile('ffmpeg', [
        '-i', tempInputPath,
        '-ar', '16000',    // 16kHz sample rate
        '-ac', '1',        // mono
        '-f', 'wav',       // WAV format
        '-y',              // overwrite
        tempAudioPath
      ])

      sendProgress(50, 'uruchamianie whisper.cpp')
      console.log(`[TranscribeStreamCPP] Uruchamianie whisper.cpp...`)
      
      const startTime = Date.now()

      // Whisper.cpp command - z progress
      const whisperArgs = [
        '-m', fullModelPath,
        '-f', tempAudioPath,
        '-t', '8',         // 8 threads dla M4 Pro
        '-pp',             // print progress
        '-oj',             // output JSON
        '--temperature', '0', // greedy = szybsze
        '--no-timestamps',     // bez timestampów = szybsze
        '-l', 'pl'         // WYMUSZENIE języka polskiego dla wszystkich nagrań
      ]

      // UWAGA: Usunięto auto-detekcję języka - zawsze używamy polskiego

      sendProgress(60, 'przetwarzanie audio')

      const whisperResult = await execFile('/opt/homebrew/bin/whisper-cli', whisperArgs)
      
      const duration = ((Date.now() - startTime) / 1000).toFixed(1)
      console.log(`[TranscribeStreamCPP] Zakończono w ${duration}s`)

      sendProgress(90, 'finalizacja')

      // Parsuj JSON output
      let transcriptText = ''
      try {
        const jsonOutput = JSON.parse(whisperResult.stdout)
        if (jsonOutput.transcription && jsonOutput.transcription.length > 0) {
          transcriptText = jsonOutput.transcription.map(t => t.text || '').join('').trim()
        }
      } catch (parseError) {
        // Fallback: weź cały stdout jako text
        transcriptText = whisperResult.stdout.trim()
      }

      // Cleanup temp files
      await fs.unlink(tempInputPath).catch(() => {})
      await fs.unlink(tempAudioPath).catch(() => {})

      res.write(`data: ${JSON.stringify({ 
        type: 'complete', 
        text: transcriptText,
        model: modelPath,
        engine: 'whisper.cpp',
        gpu: 'Apple M4 Pro Metal',
        duration: parseFloat(duration)
      })}\n\n`)
      res.end()

    } catch (error) {
      // Cleanup on error
      await fs.unlink(tempInputPath).catch(() => {})
      await fs.unlink(tempAudioPath).catch(() => {})
      throw error
    }

  } catch (error) {
    console.error('[TranscribeStreamCPP] Błąd:', error)
    res.write(`data: ${JSON.stringify({ 
      type: 'error', 
      error: error.message 
    })}\n\n`)
    res.end()
  }
})

// Konwersja audio buffer do PCM Float32Array
async function audioBufferToPCM(buffer) {
  // Import dynamiczny audio decodera
  const { default: wav } = await import('node-wav')
  
  try {
    // Najpierw spróbuj WAV
    const decoded = wav.decode(buffer)
    const samples = decoded.channelData[0] // mono
    return new Float32Array(samples)
  } catch (wavError) {
    // Fallback: użyj ffmpeg do konwersji do WAV
    console.log('[AudioDecode] WAV decode failed, trying ffmpeg...')
    
    try {
      const { spawn } = await import('child_process')
      const { promisify } = await import('util')
      const execFile = promisify((await import('child_process')).execFile)
      
      // Zapisz tymczasowo buffer
      const tmpInput = join(__dirname, `.tmp_audio_${Date.now()}`)
      const tmpOutput = join(__dirname, `.tmp_audio_${Date.now()}.wav`)
      
      await fs.writeFile(tmpInput, buffer)
      
      // Konwertuj przez ffmpeg do 16kHz mono WAV
      // Zakładamy że ffmpeg jest zainstalowany globalnie
      await execFile('ffmpeg', [
        '-i', tmpInput,
        '-ar', '16000',  // 16kHz sample rate
        '-ac', '1',      // mono
        '-f', 'wav',
        '-y',            // overwrite
        tmpOutput
      ])
      
      // Wczytaj skonwertowany WAV
      const wavBuffer = await fs.readFile(tmpOutput)
      const decoded = wav.decode(wavBuffer)
      const samples = decoded.channelData[0]
      
      // Cleanup
      await fs.unlink(tmpInput).catch(() => {})
      await fs.unlink(tmpOutput).catch(() => {})
      
      console.log('[AudioDecode] Decoded via ffmpeg successfully')
      return new Float32Array(samples)
      
    } catch (ffmpegError) {
      console.error('[AudioDecode] FFmpeg error:', ffmpegError.message)
      throw new Error(
        'Nie można zdekodować audio. Upewnij się że:\n' +
        '1. Plik jest w formacie MP3, WAV, M4A lub innym obsługiwanym\n' +
        '2. FFmpeg jest zainstalowany (brew install ffmpeg na macOS)\n' +
        `Błąd: ${ffmpegError.message}`
      )
    }
  }
}

// ============================================
// AI TEXT GENERATION
// ============================================

// Endpoint do generowania tytułu wykładu z transkrypcji
app.post('/generate-title', express.json(), async (req, res) => {
  try {
    let { 
      transcription,
      aiProvider = 'ollama',
      geminiApiKey = null,
      geminiModel = 'gemini-1.5-pro',
      ollamaModel = 'qwen2.5:14b'
    } = req.body;
    
    if (!transcription || transcription.trim().length === 0) {
      return res.status(400).json({ error: 'Brak transkrypcji' });
    }
    
    console.log(`[GenerateTitle] Otrzymano transkrypcję: ${transcription.length} znaków, provider: ${aiProvider}`);
    
    // Prompt dla LLM - prosty i jasny
    const prompt = `Przeanalizuj poniższą transkrypcję wykładu i wygeneruj ZWIĘZŁY tytuł (maksymalnie 60 znaków).

TRANSKRYPCJA:
"${transcription.substring(0, 8000)}"${transcription.length > 8000 ? `\n\n[... i ${transcription.length - 8000} znaków więcej]` : ''}

ZASADY:
- Tytuł musi być KRÓTKI (max 60 znaków)
- Opisuj GŁÓWNY TEMAT wykładu
- Pomiń wprowadzenia ("dzisiaj będziemy", "chwilkę poczekamy")
- Użyj formy rzeczownikowej (np. "Algorytmy sortowania")
- TYLKO tytuł, bez dodatkowego tekstu

TYTUŁ:`;

    const startTime = Date.now();
    
    let title;
    
    try {
      const response = await callAI(prompt, {
        provider: aiProvider,
        geminiApiKey,
        geminiModel,
        ollamaModel,
        maxTokens: 100
      });
      
      title = response.trim();
      
      // Oczyszczanie odpowiedzi LLM
      title = title
        .replace(/^(Tytuł|TYTUŁ|Title):\s*/i, '')
        .replace(/^["']|["']$/g, '') // Usuń cudzysłowy
        .replace(/\n.*/g, '') // Tylko pierwsza linia
        .trim();
      
      // Obetnij do 60 znaków
      if (title.length > 60) {
        const lastSpace = title.substring(0, 60).lastIndexOf(' ');
        title = lastSpace > 40 ? title.substring(0, lastSpace) + '...' : title.substring(0, 60) + '...';
      }
      
      // Capitalize pierwsza litera
      if (title.length > 0) {
        title = title.charAt(0).toUpperCase() + title.slice(1);
      }
      
      const duration = Date.now() - startTime;
      console.log(`[GenerateTitle] Wygenerowano w ${duration}ms (${aiProvider}): "${title}"`);
      
      res.json({
        success: true,
        title: title,
        provider: aiProvider,
        model: aiProvider === 'gemini' ? geminiModel : ollamaModel,
        duration: duration
      });
      
    } catch (aiError) {
      console.error('[GenerateTitle] Błąd AI:', aiError.message);
      throw aiError;
    }
    
  } catch (error) {
    console.error('[GenerateTitle] Błąd:', error);
    
    res.status(500).json({ 
      error: error.message || 'Błąd generowania tytułu'
    });
  }
});

// Helper: Inteligentne generowanie tytułu z transkrypcji
function generateTitleFromTranscription(transcription) {
  console.log(`[TitleGen] Analiza ${transcription.length} znaków transkrypcji...`);
  
  // Oczyszczanie
  let text = transcription.trim().replace(/\s+/g, ' ').toLowerCase();
  
  // Usuń typowe artefakty audio
  text = text.replace(/\b(um|uh|eh|hmm|eee|no to|dobra|dobrze|okej|ok)\b/gi, ' ');
  text = text.replace(/\s+/g, ' '); // Normalizuj spacje
  
  // === STRATEGIA 1: Szukaj explicytnego tematu w całym tekście ===
  const topicIndicators = [
    // "temat wykładu to: TEMAT"
    /temat\s+(dzisiejsz[eyo]+\s+)?(wykładu|zajęć|lekcji)\s+(to\s+)?[:\-]?\s*([a-ząćęłńóśźż\s]{10,80})/gi,
    
    // "dzisiaj będziemy [czasownik] TEMAT" - pomijamy czasownik!
    /dzisiaj\s+będziemy\s+(omawiać|poznawać|uczyć się|mówić o)\s+([a-ząćęłńóśźż\s]{10,80})/gi,
    /dzisiaj\s+(omówimy|poznamy)\s+([a-ząćęłńóśźż\s]{10,80})/gi,
    
    // "mówimy dziś o TEMAT"
    /mówimy\s+(dziś|dzisiaj)\s+o\s+([a-ząćęłńóśźż\s]{10,80})/gi,
    
    // "zajmiemy się TEMAT"
    /zajmiemy się\s+([a-ząćęłńóśźż\s]{10,80})/gi,
    
    // "omówimy TEMAT"
    /omówimy\s+(teraz|dzisiaj|dziś)?\s*([a-ząćęłńóśźż\s]{10,80})/gi,
  ];
  
  const foundTopics = [];
  for (const pattern of topicIndicators) {
    let match;
    while ((match = pattern.exec(text)) !== null) {
      const topic = match[match.length - 1].trim();
      if (topic.length > 10 && topic.length < 80) {
        foundTopics.push(cleanAndCapitalize(topic));
      }
    }
  }
  
  if (foundTopics.length > 0) {
    console.log(`[TitleGen] Znaleziono explicytne tematy: ${foundTopics.join(', ')}`);
    // Użyj pierwszego znalezionego tematu
    let title = truncateAtBoundary(foundTopics[0], 60);
    console.log(`[TitleGen] Wybrany tytuł (explicytny): "${title}"`);
    return title;
  }
  
  // === STRATEGIA 2: Analiza częstotliwości terminów (TF) ===
  console.log(`[TitleGen] Brak explicytnego tematu, analizuję terminy...`);
  
  // Podziel na słowa i licz częstotliwość
  const words = text.split(/\s+/).filter(w => w.length > 3);
  const stopWords = new Set([
    'jest', 'są', 'był', 'była', 'było', 'były', 'będzie', 'będą', 
    'może', 'mają', 'miał', 'miała', 'miały', 'oraz', 'albo', 'czyli',
    'który', 'która', 'które', 'tego', 'tych', 'temu', 'przy', 'przez',
    'bardzo', 'także', 'również', 'jeśli', 'gdyby', 'ponieważ', 'dlatego',
    'tutaj', 'teraz', 'wtedy', 'zawsze', 'nigdy', 'czasami', 'często',
    'więc', 'więcej', 'mniej', 'wszystko', 'nic', 'coś', 'ktoś', 'nikt',
    'żeby', 'jakby', 'jeszcze', 'już', 'tylko', 'nawet', 'właśnie',
    'mamy', 'macie', 'masz', 'mieć', 'wiemy', 'wiesz', 'wiecie',
    'można', 'trzeba', 'należy', 'warto', 'chodzi', 'chce', 'chcemy'
  ]);
  
  const wordFreq = {};
  for (const word of words) {
    if (!stopWords.has(word) && /^[a-ząćęłńóśźż]+$/.test(word)) {
      wordFreq[word] = (wordFreq[word] || 0) + 1;
    }
  }
  
  // Sortuj według częstotliwości
  const sortedWords = Object.entries(wordFreq)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 10); // Top 10 słów
  
  console.log(`[TitleGen] Top terminy: ${sortedWords.map(([w, c]) => `${w}(${c})`).join(', ')}`);
  
  // === STRATEGIA 3: Szukaj fraz z top słowami ===
  const topKeywords = sortedWords.slice(0, 3).map(([w]) => w);
  
  // Szukaj zdań zawierających top słowa kluczowe
  const sentences = transcription.split(/[.!?]+/).filter(s => s.trim().length > 20);
  
  for (const keyword of topKeywords) {
    for (const sentence of sentences.slice(0, 50)) { // Analizuj pierwsze 50 zdań
      const lowerSentence = sentence.toLowerCase();
      if (lowerSentence.includes(keyword)) {
        // Wydobądź fragment wokół słowa kluczowego
        const words = sentence.trim().split(/\s+/);
        const keywordIndex = words.findIndex(w => w.toLowerCase().includes(keyword));
        
        if (keywordIndex !== -1) {
          // Weź 3-7 słów wokół słowa kluczowego
          const start = Math.max(0, keywordIndex - 2);
          const end = Math.min(words.length, keywordIndex + 5);
          const phrase = words.slice(start, end).join(' ');
          
          if (phrase.length > 15 && phrase.length < 100) {
            let title = cleanAndCapitalize(phrase);
            title = truncateAtBoundary(title, 60);
            console.log(`[TitleGen] Wybrany tytuł (z kontekstu '${keyword}'): "${title}"`);
            return title;
          }
        }
      }
    }
  }
  
  // === STRATEGIA 4: Top słowa jako tytuł ===
  if (topKeywords.length >= 2) {
    const title = cleanAndCapitalize(topKeywords.slice(0, 3).join(' '));
    console.log(`[TitleGen] Wybrany tytuł (top słowa): "${title}"`);
    return title;
  }
  
  // === FALLBACK: Pierwsze sensowne zdanie ===
  console.log(`[TitleGen] Użycie fallback - pierwsze zdanie`);
  for (const sentence of sentences.slice(0, 10)) {
    const cleaned = sentence.trim()
      .replace(/^(jeszcze|chwilkę|poczekamy|sobie|aż|pewno|wszyscy)/gi, '')
      .trim();
    
    if (cleaned.length > 20) {
      let title = cleanAndCapitalize(cleaned);
      title = truncateAtBoundary(title, 60);
      return title;
    }
  }
  
  return 'Wykład bez tytułu';
}

// Helper: Oczyszczanie i kapitalizacja
function cleanAndCapitalize(text) {
  // Usuń białe znaki na początku/końcu
  text = text.trim();
  
  // Usuń artefakty na początku
  text = text.replace(/^(um|uh|eh|hmm|eee|no to|dobra|dobrze|więc|tak więc|otóż|jeszcze|chwilkę|aż)\s+/gi, '');
  
  // Capitalize pierwsza litera
  if (text.length > 0) {
    text = text.charAt(0).toUpperCase() + text.slice(1).toLowerCase();
  }
  
  return text;
}

// Helper: Obcinanie na granicy zdania/słowa
function truncateAtBoundary(text, maxLength) {
  if (text.length <= maxLength) {
    return text;
  }
  
  let truncated = text.substring(0, maxLength);
  
  // Spróbuj ciąć na kropce/przecinku
  const lastPeriod = truncated.lastIndexOf('.');
  const lastComma = truncated.lastIndexOf(',');
  
  if (lastPeriod > maxLength * 0.6) {
    return truncated.substring(0, lastPeriod);
  }
  
  if (lastComma > maxLength * 0.7) {
    return truncated.substring(0, lastComma);
  }
  
  // Ciąć na słowie
  const lastSpace = truncated.lastIndexOf(' ');
  if (lastSpace > maxLength * 0.7) {
    return truncated.substring(0, lastSpace) + '...';
  }
  
  return truncated + '...';
}

// Helper: Dzielenie długiego tekstu na mniejsze fragmenty
function chunkText(text, maxChunkLength = 25000, overlapLength = 2000) {
  if (text.length <= maxChunkLength) {
    return [text];
  }
  
  const chunks = [];
  let start = 0;
  
  while (start < text.length) {
    let end = Math.min(start + maxChunkLength, text.length);
    
    // Znajdź najbliższy separator (kropka, wykrzyknik, pytajnik) aby nie dzielić zdań
    if (end < text.length) {
      const lastSentenceEnd = text.lastIndexOf('.', end);
      const lastExclamation = text.lastIndexOf('!', end);
      const lastQuestion = text.lastIndexOf('?', end);
      
      const lastSeparator = Math.max(lastSentenceEnd, lastExclamation, lastQuestion);
      
      if (lastSeparator > start + maxChunkLength * 0.7) {
        end = lastSeparator + 1;
      }
    }
    
    chunks.push(text.slice(start, end));
    
    // Następny fragment zaczyna się z pewnym nakładaniem
    start = Math.max(start + maxChunkLength - overlapLength, end);
  }
  
  return chunks;
}

// ============================================
// AI PROVIDERS - GEMINI & OLLAMA
// ============================================

// Helper: Czyszczenie i parsowanie JSON z odpowiedzi AI
function cleanAndParseJSON(response, context = 'unknown') {
  try {
    // Znajdź JSON array w odpowiedzi
    const jsonMatch = response.match(/\[[\s\S]*\]/);
    if (!jsonMatch) {
      throw new Error('Brak JSON array w odpowiedzi');
    }
    
    let jsonString = jsonMatch[0];
    
    // Zaawansowane czyszczenie JSON
    jsonString = jsonString
      // Usuń znaki kontrolne i niewidoczne
      .replace(/[\u0000-\u001F\u007F-\u009F]/g, '')
      // Usuń trailing commas
      .replace(/,(\s*[}\]])/g, '$1')
      // Napraw niekwotowane klucze
      .replace(/([{,]\s*)([a-zA-Z_][a-zA-Z0-9_]*)\s*:/g, '$1"$2":')
      // Zamień single quotes na double quotes dla wartości
      .replace(/:\s*'([^']*)'/g, ': "$1"')
      // Usuń komentarze
      .replace(/\/\*[\s\S]*?\*\//g, '')
      .replace(/\/\/.*$/gm, '')
      // Normalizuj whitespace
      .replace(/\s+/g, ' ')
      .trim();
    
    console.log(`[${context}] Próbuję sparsować JSON (${jsonString.length} znaków)`);
    
    // Parsuj JSON
    const result = JSON.parse(jsonString);
    
    if (!Array.isArray(result)) {
      throw new Error('Odpowiedź nie jest tablicą');
    }
    
    return result;
    
  } catch (error) {
    console.error(`[${context}] Błąd parsowania JSON:`, error.message);
    console.error(`[${context}] Raw response (pierwsze 500 znaków):`, response.substring(0, 500));
    throw new Error(`Błąd parsowania JSON: ${error.message}`);
  }
}

// ============================================
// GEMINI API INTEGRATION
// ============================================

// Helper: Wywołanie Gemini API
async function callGeminiAPI(prompt, apiKey, model = 'gemini-1.5-pro', maxTokens = 8192) {
  console.log(`[Gemini] Wywołuję model: ${model}... (prompt: ${prompt.length} znaków)`);
  
  if (!apiKey) {
    throw new Error('Brak klucza API Gemini. Skonfiguruj go w ustawieniach.');
  }
  
  const genAI = new GoogleGenerativeAI(apiKey);
  
  // Systemowy prompt kontrolujący język
  const systemPrompt = "Jesteś polskim asystentem AI. Odpowiadaj WYŁĄCZNIE w języku polskim. NIE używaj żadnych słów w innych językach, szczególnie chińskim lub angielskim. Jeśli nie znasz polskiego odpowiednika jakiegoś terminu, użyj opisowego wyjaśnienia w języku polskim.";
  
  const geminiModel = genAI.getGenerativeModel({ 
    model: model,
    systemInstruction: systemPrompt,
    generationConfig: {
      maxOutputTokens: maxTokens,
      temperature: 0.3,
      topP: 0.9,
      topK: 40,
    }
  });
  
  const startTime = Date.now();
  
  try {
    const result = await geminiModel.generateContent(prompt);
    const response = result.response.text();
    const duration = Date.now() - startTime;
    
    console.log(`[Gemini] ${model} odpowiedział: ${response.length} znaków w ${duration}ms`);
    return response.trim();
  } catch (error) {
    console.error(`[Gemini] Błąd:`, error.message);
    throw new Error(`Błąd Gemini API: ${error.message}`);
  }
}

// Uniwersalna funkcja AI - wybiera provider na podstawie ustawień
async function callAI(prompt, options = {}) {
  const { 
    provider = 'ollama', 
    geminiApiKey = null,
    geminiModel = 'gemini-1.5-pro',
    ollamaModel = 'qwen2.5:14b',
    maxTokens = 4096 
  } = options;
  
  console.log(`[AI] Provider: ${provider}, Model: ${provider === 'gemini' ? geminiModel : ollamaModel}`);
  
  if (provider === 'gemini') {
    if (!geminiApiKey) {
      throw new Error('Wybrano Gemini, ale nie podano klucza API. Skonfiguruj go w ustawieniach.');
    }
    return await callGeminiAPI(prompt, geminiApiKey, geminiModel, maxTokens);
  } else {
    return await callOllamaAPI(prompt, ollamaModel, maxTokens);
  }
}

// ============================================
// OLLAMA API
// ============================================

// Helper: Wywołanie Ollama API
async function callOllamaAPI(prompt, model = 'qwen2.5:14b', maxTokens = 2048) {
  const ollamaUrl = 'http://localhost:11434';
  
  console.log(`[CallOllamaAPI] Wywołuję model: ${model}... (prompt: ${prompt.length} znaków)`);
  
  const controller = new AbortController();
  // Zwiększamy timeout do 10 minut dla dużych tekstów i długich notatek
  const timeoutId = setTimeout(() => controller.abort(), 600000); // 600s timeout (10 min)
  
  const startTime = Date.now();
  
  // Logowanie progressu co 30 sekund
  const progressInterval = setInterval(() => {
    const elapsed = Math.floor((Date.now() - startTime) / 1000);
    console.log(`[CallOllamaAPI] Model ${model} nadal przetwarza... (upłynęło ${elapsed}s)`);
  }, 30000);
  
  // Systemowy prompt kontrolujący język
  const systemPrompt = "Jesteś polskim asystentem AI. Odpowiadaj WYŁĄCZNIE w języku polskim. NIE używaj żadnych słów w innych językach, szczególnie chińskim lub angielskim. Jeśli nie znasz polskiego odpowiednika jakiegoś terminu, użyj opisowego wyjaśnienia w języku polskim.";
  
  // Kombinuj system prompt z user prompt
  const fullPrompt = `System: ${systemPrompt}\n\nUser: ${prompt}`;
  
  try {
    const response = await fetch(`${ollamaUrl}/api/generate`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      signal: controller.signal,
      body: JSON.stringify({
        model,
        prompt: fullPrompt,
        stream: false,
        options: {
          temperature: 0.3,
          top_p: 0.9,
          top_k: 40,
          num_predict: maxTokens,
          // Dodatkowe parametry dla kontroli języka
          repeat_penalty: 1.1,
          presence_penalty: 0.1,
          frequency_penalty: 0.1
        }
      })
    });
    
    clearTimeout(timeoutId);
    clearInterval(progressInterval);
    
    if (!response.ok) {
      throw new Error(`Ollama error: ${response.status}`);
    }
    
    const data = await response.json();
    const duration = Date.now() - startTime;
    console.log(`[CallOllamaAPI] Model ${model} odpowiedział pomyślnie w ${duration}ms`);
    return data.response.trim();
    
  } catch (error) {
    clearTimeout(timeoutId);
    clearInterval(progressInterval);
    
    console.error(`[CallOllamaAPI] Błąd wywołania ${model}:`, error.message);
    
    if (error.name === 'AbortError') {
      throw new Error('Timeout - model nie odpowiedział w 600s (10 minut)');
    }
    
    throw error;
  }
}

// Endpoint: Generowanie notatek z transkrypcji
app.post('/generate-notes', express.json(), async (req, res) => {
  try {
    const { 
      transcription,
      aiProvider = 'ollama',
      geminiApiKey = null,
      geminiModel = 'gemini-1.5-pro',
      ollamaModel = 'qwen2.5:14b'
    } = req.body;
    
    if (!transcription || transcription.trim().length === 0) {
      return res.status(400).json({ error: 'Brak transkrypcji' });
    }
    
    console.log(`[GenerateNotes] Otrzymano: ${transcription.length} znaków, provider: ${aiProvider}`);
    
    const prompt = `Jestem studentem i potrzebuję profesjonalnych notatek z tego wykładu.

TRANSKRYPCJA:
"${transcription}"

Wygeneruj KOMPLETNE notatki w formacie JSON:

{
  "formatted": "# Tytuł\\n\\n## Sekcja 1\\n\\nTreść...\\n\\n## Sekcja 2",
  "structured": "1. **Pojęcie**\\n   - Punkt 1\\n   - Punkt 2",
  "summary": "Podsumowanie w 2-3 zdaniach",
  "keyPoints": "• Punkt kluczowy 1\\n• Punkt kluczowy 2",
  "questions": "1. Pytanie 1\\n2. Pytanie 2"
}

WAŻNE: Odpowiedź TYLKO w JSON, bez dodatkowego tekstu!`;

    const startTime = Date.now();
    const response = await callAI(prompt, {
      provider: aiProvider,
      geminiApiKey,
      geminiModel,
      ollamaModel,
      maxTokens: 4096
    });
    const duration = Date.now() - startTime;
    
    // Parsuj JSON
    const jsonMatch = response.match(/\{[\s\S]*\}/);
    if (!jsonMatch) {
      throw new Error('Brak JSON w odpowiedzi');
    }
    
    const result = JSON.parse(jsonMatch[0]);
    
    console.log(`[GenerateNotes] Wygenerowano w ${duration}ms (${aiProvider})`);
    
    res.json({
      success: true,
      ...result,
      duration,
      provider: aiProvider
    });
    
  } catch (error) {
    console.error('[GenerateNotes] Błąd:', error);
    res.status(500).json({ error: error.message || 'Błąd generowania notatek' });
  }
});

// Endpoint: Generowanie fiszek z transkrypcji
app.post('/generate-flashcards', express.json(), async (req, res) => {
  try {
    const { 
      transcription,
      aiProvider = 'ollama',
      geminiApiKey = null,
      geminiModel = 'gemini-1.5-pro',
      ollamaModel = 'qwen2.5:14b'
    } = req.body;
    
    if (!transcription || transcription.trim().length === 0) {
      return res.status(400).json({ error: 'Brak transkrypcji' });
    }
    
    console.log(`[GenerateFlashcards] Otrzymano: ${transcription.length} znaków, provider: ${aiProvider}`);
    
    const startTime = Date.now();
    let allFlashcards = [];
    
    // Przetwarzaj całą notatkę na raz (bez dzielenia na fragmenty)
    const prompt = `Stwórz fiszki edukacyjne z tego materiału:

MATERIAŁ:
"${transcription}"

Format JSON (TYLKO array, bez innych tekstów):
[
  {
    "question": "Pytanie?",
    "answer": "Odpowiedź",
    "category": "definicja",
    "difficulty": "easy"
  }
]

ZASADY:
- Różne poziomy: easy, medium, hard
- Kategorie: definicja, zastosowanie, przykład, wzór, analiza, porównanie
- Wygeneruj JAK NAJWIĘCEJ fiszek - każdy ważny koncept powinien mieć własną fiszkę
- Stwórz minimum 20-30 fiszek jeśli materiał na to pozwala
- Uwzględnij wszystkie szczegóły, fakty, definicje, przykłady
- Każdy termin, proces, koncepcja = osobna fiszka
- Nie pomijaj żadnych ważnych informacji
- Fiszki powinny pokrywać cały zakres tematu dogłębnie`;

    const response = await callAI(prompt, {
      provider: aiProvider,
      geminiApiKey,
      geminiModel,
      ollamaModel,
      maxTokens: 8192
    });
    
    // Parsuj JSON array
    const jsonMatch = response.match(/\[[\s\S]*\]/);
    if (!jsonMatch) {
      throw new Error('Brak JSON array w odpowiedzi');
    }
    
    allFlashcards = JSON.parse(jsonMatch[0]);
    
    const duration = Date.now() - startTime;
    
    // Usuń duplikaty bazując na podobieństwie pytań
    const uniqueFlashcards = [];
    for (const card of allFlashcards) {
      const isDuplicate = uniqueFlashcards.some(existing => 
        existing.question.toLowerCase().trim() === card.question.toLowerCase().trim()
      );
      if (!isDuplicate) {
        uniqueFlashcards.push(card);
      }
    }
    
    console.log(`[GenerateFlashcards] Wygenerowano ${uniqueFlashcards.length} unikalnych fiszek w ${duration}ms (${aiProvider})`);
    
    res.json({
      success: true,
      flashcards: uniqueFlashcards,
      duration,
      chunksProcessed: 1  // Zawsze 1 - nie dzielimy już na fragmenty
    });
    
  } catch (error) {
    console.error('[GenerateFlashcards] Błąd:', error);
    res.status(500).json({ error: error.message || 'Błąd generowania fiszek' });
  }
});

// Endpoint: Generowanie szczegółowej notatki
app.post('/generate-detailed-note', express.json(), async (req, res) => {
  try {
    const { 
      transcription,
      aiProvider = 'ollama',
      geminiApiKey = null,
      geminiModel = 'gemini-1.5-pro',
      ollamaModel = 'qwen2.5:14b'
    } = req.body;
    
    if (!transcription || transcription.trim().length === 0) {
      return res.status(400).json({ error: 'Brak transkrypcji' });
    }
    
    console.log(`[GenerateDetailedNote] Otrzymano: ${transcription.length} znaków, provider: ${aiProvider}`);
    
    const prompt = `JĘZYK ODPOWIEDZI: TYLKO JĘZYK POLSKI. Nie używaj ŻADNYCH słów w innych językach (chińskim, angielskim itp.).

Stwórz SZCZEGÓŁOWĄ notatkę akademicką z tego materiału w formacie Markdown.

MATERIAŁ:
"${transcription}"

STRUKTURA:
# Tytuł tematu

## Wprowadzenie
Kontekst i znaczenie tematu (2-3 zdania)

## Główne zagadnienia

### 1. [Pierwsze zagadnienie]
- Definicja i wyjaśnienie
- Szczegóły i przykłady
- Powiązania z innymi tematami

### 2. [Drugie zagadnienie]
- Analogicznie

## Kluczowe terminy
- **Termin 1**: definicja
- **Termin 2**: definicja

## Podsumowanie
Syntetyczne zestawienie najważniejszych punktów

ZASADY:
- UŻYWAJ WYŁĄCZNIE JĘZYKA POLSKIEGO - nie mieszaj języków!
- Używaj struktury Markdown (nagłówki ##, listy, pogrubienia **)
- Pisz językiem akademickim ale zrozumiałym
- Uwzględnij WSZYSTKIE ważne informacje z materiału - nic nie pomijaj
- Notatka powinna być maksymalnie szczegółowa i obszerna
- Analizuj każdy aspekt tematu dogłębnie
- Dodawaj przykłady, kontekst i powiązania między zagadnieniami
- Rozwijaj każdy punkt obszernie - nie skracaj treści
- Celem jest stworzenie kompletnego, wyczerpującego opracowania tematu
- Im więcej szczegółów, tym lepiej - nie ma limitów długości
- PAMIĘTAJ: Odpowiadaj TYLKO po polsku, bez żadnych słów w innych językach!`;

    const startTime = Date.now();
    const response = await callAI(prompt, {
      provider: aiProvider,
      geminiApiKey,
      geminiModel,
      ollamaModel,
      maxTokens: 16384
    });
    const duration = Date.now() - startTime;
    
    console.log(`[GenerateDetailedNote] Wygenerowano notatkę w ${duration}ms (${aiProvider})`);
    
    res.json({
      success: true,
      note: response,
      duration,
      provider: aiProvider
    });
    
  } catch (error) {
    console.error('[GenerateDetailedNote] Błąd:', error);
    res.status(500).json({ error: error.message || 'Błąd generowania szczegółowej notatki' });
  }
});

// Endpoint: Generowanie szczegółowej notatki z fact-checking
app.post('/generate-detailed-note-with-fact-check', express.json(), async (req, res) => {
  try {
    const { transcription } = req.body;
    
    if (!transcription || transcription.trim().length === 0) {
      return res.status(400).json({ error: 'Brak transkrypcji' });
    }
    
    console.log(`[GenerateDetailedNoteWithFactCheck] Otrzymano: ${transcription.length} znaków`);
    
    const startTime = Date.now();
    
    // Krok 1: Fact-checking
    console.log(`[GenerateDetailedNoteWithFactCheck] Sprawdzanie faktów...`);
    const factCheckResults = await factChecker.factCheck(transcription);
    
    // Krok 2: Zastosuj poprawki (jeśli są)
    const correctionResults = factChecker.applyCorrections(transcription, factCheckResults);
    const finalTranscription = correctionResults.correctedText;
    
    console.log(`[GenerateDetailedNoteWithFactCheck] Zastosowano ${correctionResults.changes.length} poprawek`);
    
    // Krok 3: Generuj szczegółową notatkę z poprawionej transkrypcji
    const prompt = `JĘZYK ODPOWIEDZI: TYLKO JĘZYK POLSKI. Nie używaj ŻADNYCH słów w innych językach (chińskim, angielskim itp.).

Stwórz SZCZEGÓŁOWĄ notatkę akademicką z tego materiału w formacie Markdown.

MATERIAŁ (zweryfikowany pod kątem faktów):
"${finalTranscription}"

${correctionResults.hasChanges ? `\nWERYFIKACJA FAKTÓW:
Podczas sprawdzania faktów dokonano następujących poprawek:
${correctionResults.changes.map(change => 
  `- ${change.type}: "${change.original}" → "${change.corrected}" (pewność: ${(change.confidence * 100).toFixed(0)}%, źródło: ${change.source})`
).join('\n')}

UWAGA: Upewnij się, że używasz poprawionych informacji w notatce.` : ''}

STRUKTURA:
# Tytuł tematu

## Wprowadzenie
Kontekst i znaczenie tematu (2-3 zdania)

## Główne zagadnienia

### 1. [Pierwsze zagadnienie]
- Definicja i wyjaśnienie
- Szczegóły i przykłady
- Powiązania z innymi tematami

### 2. [Drugie zagadnienie]
- Analogicznie

## Kluczowe terminy
- **Termin 1**: definicja
- **Termin 2**: definicja

## Podsumowanie
Syntetyczne zestawienie najważniejszych punktów

${correctionResults.hasChanges ? `\n## Weryfikacja faktów
Podczas przygotowywania notatki zweryfikowano i poprawiono ${correctionResults.changes.length} informacji(e) pod kątem faktyczności.` : ''}

ZASADY:
- UŻYWAJ WYŁĄCZNIE JĘZYKA POLSKIEGO - nie mieszaj języków!
- Używaj struktury Markdown (nagłówki ##, listy, pogrubienia **)
- Pisz językiem akademickim ale zrozumiałym
- Uwzględnij WSZYSTKIE ważne informacje z materiału - nic nie pomijaj
- Notatka powinna być maksymalnie szczegółowa i obszerna
- Analizuj każdy aspekt tematu dogłębnie
- Dodawaj przykłady, kontekst i powiązania między zagadnieniami
- Rozwijaj każdy punkt obszernie - nie skracaj treści
- Celem jest stworzenie kompletnego, wyczerpującego opracowania tematu
- Im więcej szczegółów, tym lepiej - nie ma limitów długości
- UŻYWAJ TYLKO poprawionych imion, nazwisk, nazw, dat i miejsc z weryfikacji faktów
- PAMIĘTAJ: Odpowiadaj TYLKO po polsku, bez żadnych słów w innych językach!`;

    const response = await callOllamaAPI(prompt, 'qwen2.5:14b', 16384);
    const duration = Date.now() - startTime;
    
    console.log(`[GenerateDetailedNoteWithFactCheck] Wygenerowano notatkę w ${duration}ms`);
    
    res.json({
      success: true,
      note: response,
      factCheck: {
        hasChanges: correctionResults.hasChanges,
        changesCount: correctionResults.changes.length,
        changes: correctionResults.changes
      },
      duration
    });
    
  } catch (error) {
    console.error('[GenerateDetailedNoteWithFactCheck] Błąd:', error);
    res.status(500).json({ error: error.message || 'Błąd generowania szczegółowej notatki z weryfikacją faktów' });
  }
});

// Endpoint: Generowanie krótkiej notatki
app.post('/generate-short-note', express.json(), async (req, res) => {
  try {
    const { 
      transcription,
      aiProvider = 'ollama',
      geminiApiKey = null,
      geminiModel = 'gemini-1.5-pro',
      ollamaModel = 'qwen2.5:14b'
    } = req.body;
    
    if (!transcription || transcription.trim().length === 0) {
      return res.status(400).json({ error: 'Brak transkrypcji' });
    }
    
    console.log(`[GenerateShortNote] Otrzymano: ${transcription.length} znaków, provider: ${aiProvider}`);
    
    const prompt = `JĘZYK ODPOWIEDZI: TYLKO JĘZYK POLSKI. Nie używaj ŻADNYCH słów w innych językach (chińskim, angielskim itp.).

Stwórz SZCZEGÓŁOWĄ notatkę z tego materiału w formacie Markdown.

MATERIAŁ:
"${transcription}"

STRUKTURA:
# Tytuł

## 📋 Najważniejsze punkty
- Punkt 1
- Punkt 2
- Punkt 3

## 💡 Kluczowe terminy
- **Termin**: krótka definicja

## 🎯 Wnioski
Zwięzłe podsumowanie (2-3 zdania)

ZASADY:
- UŻYWAJ WYŁĄCZNIE JĘZYKA POLSKIEGO - nie mieszaj języków!
- Szczegółowa ale przystępna forma
- Uwzględnij wszystkie ważne informacje - nie skracaj
- Format Markdown z emoji dla czytelności
- Notatka może być długa jeśli materiał tego wymaga
- Lepiej szczegółowo niż powierzchownie
- Nie pomijaj żadnych istotnych treści
- PAMIĘTAJ: Odpowiadaj TYLKO po polsku, bez żadnych słów w innych językach!`;

    const startTime = Date.now();
    const response = await callAI(prompt, {
      provider: aiProvider,
      geminiApiKey,
      geminiModel,
      ollamaModel,
      maxTokens: 4096
    });
    const duration = Date.now() - startTime;
    
    console.log(`[GenerateShortNote] Wygenerowano krótką notatkę w ${duration}ms (${aiProvider})`);
    
    res.json({
      success: true,
      note: response,
      duration,
      provider: aiProvider
    });
    
  } catch (error) {
    console.error('[GenerateShortNote] Błąd:', error);
    res.status(500).json({ error: error.message || 'Błąd generowania krótkiej notatki' });
  }
});

// Endpoint: Generowanie kluczowych punktów
app.post('/generate-key-points', express.json(), async (req, res) => {
  try {
    const { 
      transcription,
      aiProvider = 'ollama',
      geminiApiKey = null,
      geminiModel = 'gemini-1.5-pro',
      ollamaModel = 'qwen2.5:14b'
    } = req.body;
    
    if (!transcription || transcription.trim().length === 0) {
      return res.status(400).json({ error: 'Brak transkrypcji' });
    }
    
    console.log(`[GenerateKeyPoints] Otrzymano: ${transcription.length} znaków, provider: ${aiProvider}`);
    
    const prompt = `Wyodrębnij KLUCZOWE PUNKTY z tego materiału w formacie Markdown.

MATERIAŁ:
"${transcription}"

FORMAT:
# 🎯 Kluczowe punkty

## 📌 Główne tezy
1. **[Teza 1]** - krótkie wyjaśnienie
2. **[Teza 2]** - krótkie wyjaśnienie
3. **[Teza 3]** - krótkie wyjaśnienie

## 🔑 Terminy do zapamiętania
- **Termin 1**: definicja
- **Termin 2**: definicja

## 📊 Fakty i liczby
- Fakt 1
- Fakt 2

## ⚠️ Uwaga
Najważniejsze zastrzeżenia lub wyjątki

ZASADY:
- ILOŚĆ punktów dostosowana do treści - minimum 15-25 punktów
- Każdy punkt zwięzły ale kompletny
- Uwzględnij wszystkie informacje istotne do zapamiętania
- Format Markdown z emoji
- Lepiej więcej punktów niż pominięte ważne treści
- Pokryj cały zakres tematu systematycznie`;

    const startTime = Date.now();
    const response = await callAI(prompt, {
      provider: aiProvider,
      geminiApiKey,
      geminiModel,
      ollamaModel,
      maxTokens: 4096
    });
    const duration = Date.now() - startTime;
    
    console.log(`[GenerateKeyPoints] Wygenerowano kluczowe punkty w ${duration}ms (${aiProvider})`);
    
    res.json({
      success: true,
      keyPoints: response,
      duration,
      provider: aiProvider
    });
    
  } catch (error) {
    console.error('[GenerateKeyPoints] Błąd:', error);
    res.status(500).json({ error: error.message || 'Błąd generowania kluczowych punktów' });
  }
});

// Endpoint: Generowanie quizu
app.post('/generate-quiz', express.json(), async (req, res) => {
  try {
    const { 
      transcription,
      aiProvider = 'ollama',
      geminiApiKey = null,
      geminiModel = 'gemini-1.5-pro',
      ollamaModel = 'qwen2.5:14b'
    } = req.body;
    
    if (!transcription || transcription.trim().length === 0) {
      return res.status(400).json({ error: 'Brak transkrypcji' });
    }
    
    console.log(`[GenerateQuiz] Otrzymano: ${transcription.length} znaków, provider: ${aiProvider}`);
    
    const prompt = `Stwórz quiz wielokrotnego wyboru z tego materiału:

MATERIAŁ:
"${transcription}"

BARDZO WAŻNE - Odpowiedz TYLKO poprawnym JSON array bez żadnych dodatkowych tekstów, komentarzy czy wyjaśnień!

Format JSON:
[
  {
    "question": "Pytanie?",
    "options": ["Opcja A", "Opcja B", "Opcja C", "Opcja D"],
    "correctIndex": 0,
    "category": "definicje"
  }
]

ZASADY:
- 15-25 pytań różnej trudności
- Każde pytanie ma dokładnie 4 opcje
- correctIndex to indeks prawidłowej odpowiedzi (0-3)
- Kategorie: "definicje", "zastosowania", "analiza", "fakty", "porównania"
- Dystraktory (złe odpowiedzi) muszą być wiarygodne
- Poprawna odpowiedź nie może być oczywista
- Pokryj cały zakres tematu systematycznie
- Uwzględnij wszystkie ważne zagadnienia z materiału
- NIE dodawaj żadnych komentarzy poza JSON
- Używaj TYLKO podwójnych cudzysłowów w JSON
- NIE używaj trailing comma

Rozpocznij odpowiedź od [ i zakończ na ]`;

    const startTime = Date.now();
    const response = await callAI(prompt, {
      provider: aiProvider,
      geminiApiKey,
      geminiModel,
      ollamaModel,
      maxTokens: 4096
    });
    const duration = Date.now() - startTime;
    
    // Czyszczenie i parsowanie JSON
    let questions;
    try {
      questions = cleanAndParseJSON(response, 'GenerateQuiz');
      
      // Walidacja każdego pytania
      questions = questions.filter(q => {
        if (!q || typeof q !== 'object') return false;
        if (typeof q.question !== 'string' || q.question.trim().length === 0) return false;
        if (!Array.isArray(q.options) || q.options.length !== 4) return false;
        if (typeof q.correctIndex !== 'number' || q.correctIndex < 0 || q.correctIndex > 3) return false;
        if (!q.options.every(opt => typeof opt === 'string' && opt.trim().length > 0)) return false;
        return true;
      });
      
      if (questions.length === 0) {
        throw new Error('Brak poprawnych pytań w odpowiedzi');
      }
      
    } catch (parseError) {
      // Zapisz pełną odpowiedź do pliku dla debugowania
      const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
      const debugFile = `debug-quiz-response-${timestamp}.txt`;
      
      try {
        await fs.writeFile(debugFile, `TIMESTAMP: ${timestamp}\nERROR: ${parseError.message}\n\nRAW RESPONSE:\n${response}`, 'utf8');
        console.log(`[GenerateQuiz] Zapisano debug do: ${debugFile}`);
      } catch (writeError) {
        console.error('[GenerateQuiz] Nie udało się zapisać debug file:', writeError.message);
      }
      
      throw new Error(`Nie udało się sparsować odpowiedzi modelu: ${parseError.message}`);
    }
    
    console.log(`[GenerateQuiz] Wygenerowano ${questions.length} pytań quizowych w ${duration}ms`);
    
    res.json({
      success: true,
      questions,
      duration
    });
    
  } catch (error) {
    console.error('[GenerateQuiz] Błąd:', error);
    res.status(500).json({ error: error.message || 'Błąd generowania quizu' });
  }
});

// Endpoint: Ekstrakcja tekstu z PowerPoint (PPT/PPTX)
app.post('/api/extract-ppt', upload.single('file'), async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ error: 'Brak pliku' });
    }

    const fileName = req.file.originalname.toLowerCase();
    
    if (!fileName.endsWith('.ppt') && !fileName.endsWith('.pptx')) {
      return res.status(400).json({ error: 'Nieprawidłowy format pliku. Tylko PPT i PPTX są obsługiwane.' });
    }

    console.log(`[Extract-PPT] Przetwarzanie pliku: ${req.file.originalname}`);
    
    // Dla PPTX (format XML-based)
    if (fileName.endsWith('.pptx')) {
      try {
        const JSZip = (await import('jszip')).default;
        const zip = new JSZip();
        const contents = await zip.loadAsync(req.file.buffer);
        
        let extractedText = '';
        let slideNumber = 0;
        
        // Iteruj przez slajdy w folderze ppt/slides/
        for (const filename in contents.files) {
          if (filename.startsWith('ppt/slides/slide') && filename.endsWith('.xml')) {
            slideNumber++;
            const fileData = await contents.files[filename].async('text');
            
            // Parsuj XML i wyciągnij tekst z tagów <a:t>
            const textMatches = fileData.match(/<a:t>([^<]+)<\/a:t>/g);
            
            if (textMatches) {
              const slideText = textMatches
                .map(match => match.replace(/<\/?a:t>/g, ''))
                .join(' ');
              
              extractedText += `\n\n--- Slajd ${slideNumber} ---\n\n${slideText}`;
            }
          }
        }
        
        if (!extractedText.trim()) {
          return res.status(400).json({ 
            error: 'Nie znaleziono tekstu w prezentacji. Prezentacja może zawierać tylko obrazy.' 
          });
        }
        
        console.log(`[Extract-PPT] Pomyślnie wyekstrahowano tekst z ${slideNumber} slajdów`);
        
        return res.json({ 
          text: extractedText.trim(),
          slideCount: slideNumber,
          fileName: req.file.originalname
        });
        
      } catch (zipError) {
        console.error('[Extract-PPT] Błąd parsowania PPTX:', zipError);
        return res.status(500).json({ 
          error: 'Nie udało się przetworzyć pliku PPTX. Plik może być uszkodzony.' 
        });
      }
    }
    
    // Dla starszych plików PPT - wymagałoby dodatkowych bibliotek
    if (fileName.endsWith('.ppt')) {
      return res.status(400).json({ 
        error: 'Stare pliki PPT nie są jeszcze obsługiwane. Proszę przekonwertować do PPTX.' 
      });
    }
    
  } catch (error) {
    console.error('[Extract-PPT] Błąd:', error);
    res.status(500).json({ 
      error: `Błąd serwera podczas przetwarzania pliku: ${error.message}` 
    });
  }
});

// Endpoint: Fact-checking transkrypcji
app.post('/fact-check', express.json(), async (req, res) => {
  try {
    const { transcription } = req.body;
    
    if (!transcription || transcription.trim().length === 0) {
      return res.status(400).json({ error: 'Brak transkrypcji do sprawdzenia' });
    }
    
    console.log(`[FactCheck] Sprawdzanie faktów w ${transcription.length} znakach...`);
    
    const startTime = Date.now();
    const factCheckResults = await factChecker.factCheck(transcription);
    const duration = Date.now() - startTime;
    
    console.log(`[FactCheck] Zakończono w ${duration}ms: ${factCheckResults.summary.totalVerified}/${factCheckResults.summary.totalChecked} zweryfikowane`);
    
    res.json({
      success: true,
      results: factCheckResults,
      duration,
      stats: {
        names: factCheckResults.names.length,
        dates: factCheckResults.dates.length,
        places: factCheckResults.places.length,
        verified: factCheckResults.summary.totalVerified,
        total: factCheckResults.summary.totalChecked,
        confidence: factCheckResults.summary.confidence
      }
    });
    
  } catch (error) {
    console.error('[FactCheck] Błąd:', error);
    res.status(500).json({ error: error.message || 'Błąd sprawdzania faktów' });
  }
});

// Endpoint: Generowanie notatek z fact-checking
app.post('/generate-notes-with-fact-check', express.json(), async (req, res) => {
  try {
    const { transcription } = req.body;
    
    if (!transcription || transcription.trim().length === 0) {
      return res.status(400).json({ error: 'Brak transkrypcji' });
    }
    
    console.log(`[GenerateNotesWithFactCheck] Otrzymano: ${transcription.length} znaków`);
    
    const startTime = Date.now();
    
    // Krok 1: Fact-checking
    console.log(`[GenerateNotesWithFactCheck] Sprawdzanie faktów...`);
    const factCheckResults = await factChecker.factCheck(transcription);
    
    // Krok 2: Zastosuj poprawki (jeśli są)
    const correctionResults = factChecker.applyCorrections(transcription, factCheckResults);
    const finalTranscription = correctionResults.correctedText;
    
    console.log(`[GenerateNotesWithFactCheck] Zastosowano ${correctionResults.changes.length} poprawek`);
    
    // Krok 3: Generuj notatki z poprawionej transkrypcji
    const prompt = `Jestem studentem i potrzebuję profesjonalnych notatek z tego wykładu.

TRANSKRYPCJA (zweryfikowana pod kątem faktów):
"${finalTranscription}"

${correctionResults.hasChanges ? `\nWERYFIKACJA FAKTÓW:
Podczas sprawdzania faktów dokonano następujących poprawek:
${correctionResults.changes.map(change => 
  `- ${change.type}: "${change.original}" → "${change.corrected}" (pewność: ${(change.confidence * 100).toFixed(0)}%, źródło: ${change.source})`
).join('\n')}

Uwzględnij te poprawione informacje w notatkach.` : ''}

Wygeneruj KOMPLETNE notatki w formacie JSON:

{
  "formatted": "# Tytuł\\n\\n## Sekcja 1\\n\\nTreść...\\n\\n## Sekcja 2",
  "structured": "1. **Pojęcie**\\n   - Punkt 1\\n   - Punkt 2",
  "summary": "Podsumowanie w 2-3 zdaniach",
  "keyPoints": "• Punkt kluczowy 1\\n• Punkt kluczowy 2",
  "questions": "1. Pytanie 1\\n2. Pytanie 2"
}

WAŻNE: 
- Używaj poprawionych imion, nazwisk, nazw, dat i miejsc z weryfikacji
- Odpowiedź TYLKO w JSON, bez dodatkowego tekstu!
- Jeśli były poprawki faktów, upewnij się że używasz poprawnych informacji`;

    const response = await callOllamaAPI(prompt, 'qwen2.5:14b', 2048);
    const duration = Date.now() - startTime;
    
    // Parsuj JSON
    const jsonMatch = response.match(/\{[\s\S]*\}/);
    if (!jsonMatch) {
      throw new Error('Brak JSON w odpowiedzi');
    }
    
    const result = JSON.parse(jsonMatch[0]);
    
    console.log(`[GenerateNotesWithFactCheck] Wygenerowano w ${duration}ms`);
    
    res.json({
      success: true,
      ...result,
      factCheck: {
        results: factCheckResults,
        corrections: correctionResults,
        stats: {
          verified: factCheckResults.summary.totalVerified,
          total: factCheckResults.summary.totalChecked,
          confidence: factCheckResults.summary.confidence,
          changes: correctionResults.changes.length
        }
      },
      duration
    });
    
  } catch (error) {
    console.error('[GenerateNotesWithFactCheck] Błąd:', error);
    res.status(500).json({ error: error.message || 'Błąd generowania notatek z weryfikacją faktów' });
  }
});

// ============================================
// ENDPOINT TESTOWY GEMINI
// ============================================

// Endpoint: Testowanie połączenia z Gemini API
app.post('/test-gemini', express.json(), async (req, res) => {
  console.log('[TestGemini] Testowanie połączenia z Gemini API');
  
  try {
    const { geminiApiKey, geminiModel = 'gemini-1.5-pro' } = req.body;
    
    if (!geminiApiKey) {
      return res.status(400).json({ 
        success: false, 
        error: 'Brak klucza API' 
      });
    }
    
    const startTime = Date.now();
    const response = await callGeminiAPI(
      'Odpowiedz jednym słowem: "OK"',
      geminiApiKey,
      geminiModel,
      10
    );
    const duration = Date.now() - startTime;
    
    console.log('[TestGemini] Odpowiedź:', response);
    
    res.json({ 
      success: true, 
      model: geminiModel,
      response: response.trim(),
      duration
    });
    
  } catch (error) {
    console.error('[TestGemini] Błąd:', error);
    res.status(500).json({ 
      success: false, 
      error: error.message 
    });
  }
});

// Start server
app.listen(PORT, () => {
  console.log(`\n✅ Server uruchomiony na http://localhost:${PORT}`)
  console.log(`📁 Ścieżka modeli: ${env.localModelPath}`)
  console.log(`\n🎙️ Silniki transkrypcji:`)
  console.log(`   🔧 Transformers.js - uniwersalny, działa w przeglądarce`)
  console.log(`   ⚡ Whisper.cpp - ultraszybki, Metal GPU (Apple M4 Pro)`)
  console.log(`\n🔗 Endpointy:`)
  console.log(`   GET  /health - sprawdź status i dostępne silniki`)
  console.log(`\n   📝 Transformers.js:`)
  console.log(`   POST /transcribe - transkrypcja (zwraca wynik)`)
  console.log(`   POST /transcribe-stream - transkrypcja z progress (SSE)`)
  console.log(`\n   ⚡ Whisper.cpp (SZYBSZY):`)
  console.log(`   POST /transcribe-cpp - ultraszybka transkrypcja`)
  console.log(`   POST /transcribe-stream-cpp - ultraszybka z progress`)
  console.log(`\n   🤖 AI (Ollama / Gemini):`)
  console.log(`   POST /generate-title - generuj tytuł z transkrypcji`)
  console.log(`   POST /generate-notes - generuj notatki z transkrypcji`)
  console.log(`   POST /generate-detailed-note - generuj szczegółową notatkę`)
  console.log(`   POST /generate-detailed-note-with-fact-check - notatka z weryfikacją`)
  console.log(`   POST /generate-short-note - generuj krótką notatkę`)
  console.log(`   POST /generate-key-points - generuj kluczowe punkty`)
  console.log(`   POST /generate-flashcards - generuj fiszki z transkrypcji`)
  console.log(`   POST /generate-quiz - generuj quiz z transkrypcji`)
  console.log(`   POST /test-gemini - testuj połączenie z Gemini API`)
  console.log(`\n   🔍 Fact-checking:`)
  console.log(`   POST /fact-check - weryfikuj fakty w transkrypcji`)
  console.log(`   POST /generate-notes-with-fact-check - notatki z weryfikacją faktów`)
  console.log(`\n   📄 Dokumenty:`)
  console.log(`   POST /api/extract-ppt - wyekstrahuj tekst z PowerPoint (PPTX)`)
  console.log(`\n💡 AI Provider: Ollama (lokalny) lub Gemini Pro (API)`)
  console.log(`💡 Ollama musi działać: ollama serve`)
  console.log(`💡 Aby zatrzymać: Ctrl+C\n`)
})

