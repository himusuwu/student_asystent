import express from 'express'
import cors from 'cors'
import multer from 'multer'
import { pipeline, env } from '@xenova/transformers'
import { fileURLToPath } from 'url'
import { dirname, join } from 'path'
import fs from 'fs/promises'

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

// Cache dla modelu
let transcriberCache = {}

console.log('[Server] Starting Student Asystent Backend...')
console.log(`[Server] Model path: ${env.localModelPath}`)

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

// Endpoint do transkrypcji
app.post('/transcribe', upload.single('audio'), async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ error: 'Brak pliku audio' })
    }

    const { language = 'auto', model = 'base' } = req.body
    const audioBuffer = req.file.buffer

    console.log(`[Transcribe] Otrzymano plik: ${req.file.originalname}, rozmiar: ${(audioBuffer.length / 1024 / 1024).toFixed(2)}MB`)
    console.log(`[Transcribe] Model: ${model}, język: ${language}`)

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
      language: language === 'auto' ? undefined : language,
      condition_on_previous_text: false, // Wyłączone = szybsze
      temperature: 0, // Greedy = szybkie
      compression_ratio_threshold: 2.4, // Default, ale jawnie
      logprob_threshold: -1.0, // Default
      no_speech_threshold: 0.6 // Default
    })

    const duration = ((Date.now() - startTime) / 1000).toFixed(1)
    console.log(`[Transcribe] Zakończono w ${duration}s`)

    res.json({
      success: true,
      text: result.text || '',
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

    const { language = 'auto', model = 'tiny' } = req.body
    const audioBuffer = req.file.buffer

    console.log(`[TranscribeCPP] Otrzymano plik: ${req.file.originalname}, rozmiar: ${(audioBuffer.length / 1024 / 1024).toFixed(2)}MB`)
    console.log(`[TranscribeCPP] Model: ${model}, język: ${language}`)

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
        '--no-timestamps'      // bez timestampów = szybsze
      ]

      // Dodaj język jeśli nie auto
      if (language !== 'auto') {
        whisperArgs.push('-l', language)
      }

      const whisperResult = await execFile('/opt/homebrew/opt/whisper-cpp/bin/whisper-cli', whisperArgs)
      
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

    const { language = 'auto', model = 'base' } = req.body
    const audioBuffer = req.file.buffer

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
      language: language === 'auto' ? undefined : language,
      condition_on_previous_text: false,
      temperature: 0,
      compression_ratio_threshold: 2.4,
      logprob_threshold: -1.0,
      no_speech_threshold: 0.6
    })

    clearInterval(progressInterval)

    res.write(`data: ${JSON.stringify({ 
      type: 'complete', 
      text: result.text || '',
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

    const { language = 'auto', model = 'tiny' } = req.body
    const audioBuffer = req.file.buffer

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
        '--no-timestamps'      // bez timestampów = szybsze
      ]

      // Dodaj język jeśli nie auto
      if (language !== 'auto') {
        whisperArgs.push('-l', language)
      }

      sendProgress(60, 'przetwarzanie audio')

      const whisperResult = await execFile('/opt/homebrew/opt/whisper-cpp/bin/whisper-cli', whisperArgs)
      
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

// Start server
app.listen(PORT, () => {
  console.log(`\n✅ Server uruchomiony na http://localhost:${PORT}`)
  console.log(`📁 Ścieżka modeli: ${env.localModelPath}`)
  console.log(`\n� Silniki transkrypcji:`)
  console.log(`   🔧 Transformers.js - uniwersalny, działa w przeglądarce`)
  console.log(`   ⚡ Whisper.cpp - ultraszybki, Metal GPU (Apple M4 Pro)`)
  console.log(`\n�🔗 Endpointy:`)
  console.log(`   GET  /health - sprawdź status i dostępne silniki`)
  console.log(`\n   📝 Transformers.js:`)
  console.log(`   POST /transcribe - transkrypcja (zwraca wynik)`)
  console.log(`   POST /transcribe-stream - transkrypcja z progress (SSE)`)
  console.log(`\n   ⚡ Whisper.cpp (SZYBSZY):`)
  console.log(`   POST /transcribe-cpp - ultraszybka transkrypcja`)
  console.log(`   POST /transcribe-stream-cpp - ultraszybka z progress`)
  console.log(`\n💡 Aby zatrzymać: Ctrl+C\n`)
})
