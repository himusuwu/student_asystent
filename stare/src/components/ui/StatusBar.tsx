import { useEffect, useState } from 'react'
import { ProgressBar } from './ProgressBar'

export interface StatusUpdate {
  operation: string
  phase: string
  progress: number // 0-100
  estimatedTimeMs?: number
  startTime: number
}

// Globalny singleton dla statusu
class StatusManager {
  private listeners: Set<(status: StatusUpdate | null) => void> = new Set()
  private currentStatus: StatusUpdate | null = null

  subscribe(listener: (status: StatusUpdate | null) => void) {
    this.listeners.add(listener)
    return () => this.listeners.delete(listener)
  }

  updateStatus(status: StatusUpdate | null) {
    this.currentStatus = status
    this.listeners.forEach(listener => listener(status))
  }

  getStatus() {
    return this.currentStatus
  }
}

export const statusManager = new StatusManager()

/** Pomocnicza funkcja do aktualizacji statusu */
export function updateGlobalStatus(
  operation: string,
  phase: string,
  progress: number,
  estimatedTimeMs?: number
) {
  statusManager.updateStatus({
    operation,
    phase,
    progress,
    estimatedTimeMs,
    startTime: Date.now()
  })
}

/** Pomocnicza funkcja do czyszczenia statusu */
export function clearGlobalStatus() {
  statusManager.updateStatus(null)
}

/** Szacowanie czasu dla różnych operacji AI */
export function estimateAITime(
  operation: 'cleaning' | 'notes' | 'flashcards' | 'verification' | 'transcription',
  textLength: number,
  model: string = 'llama3.1:8b'
): number {
  // Normalizuj nazwę modelu do obsługiwanych typów
  const normalizedModel = model.includes('phi3') ? 'phi3.5:3.8b' 
    : model.includes('llama') ? 'llama3.1:8b'
    : model.includes('qwen') ? 'qwen2.5:14b'
    : 'llama3.1:8b' // domyślny fallback
  
  // Bazowe czasy w ms na 1000 znaków
  const baseTimes: Record<string, Record<string, number>> = {
    'phi3.5:3.8b': {
      cleaning: 1500,
      notes: 2000,
      flashcards: 2500,
      verification: 3000,
      transcription: 5000
    },
    'llama3.1:8b': {
      cleaning: 2000,
      notes: 2500,
      flashcards: 3000,
      verification: 3500,
      transcription: 6000
    },
    'qwen2.5:14b': {
      cleaning: 3000,
      notes: 4000,
      flashcards: 5000,
      verification: 6000,
      transcription: 8000
    }
  }

  const modelTimes = baseTimes[normalizedModel] || baseTimes['llama3.1:8b']
  const baseTime = modelTimes[operation] || 2000
  const chunkCount = Math.max(1, Math.ceil(textLength / 1000))
  
  return baseTime * chunkCount
}

/** Komponent StatusBar - pokazuje globalny status operacji */
export function StatusBar() {
  const [status, setStatus] = useState<StatusUpdate | null>(null)
  const [elapsedTime, setElapsedTime] = useState(0)

  useEffect(() => {
    const unsubscribe = statusManager.subscribe(setStatus)
    return () => { unsubscribe() }
  }, [])

  // Ticker dla elapsed time
  useEffect(() => {
    if (!status) {
      setElapsedTime(0)
      return
    }

    const interval = setInterval(() => {
      setElapsedTime(Date.now() - status.startTime)
    }, 100)

    return () => clearInterval(interval)
  }, [status])

  if (!status) return null

  const estimatedTotal = status.estimatedTimeMs || 0
  const remainingTime = Math.max(0, estimatedTotal - elapsedTime)
  const isOvertime = elapsedTime > estimatedTotal && estimatedTotal > 0

  return (
    <div
      style={{
        position: 'fixed',
        bottom: 0,
        left: 0,
        right: 0,
        background: 'linear-gradient(to top, rgba(0,0,0,0.95), rgba(0,0,0,0.85))',
        borderTop: '1px solid rgba(59, 130, 246, 0.3)',
        padding: '12px 20px',
        zIndex: 9999,
        backdropFilter: 'blur(10px)'
      }}
    >
      <div style={{ maxWidth: 1200, margin: '0 auto' }}>
        {/* Nagłówek */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
          <div>
            <span style={{ fontSize: 14, fontWeight: 600, color: '#3b82f6' }}>
              🤖 {status.operation}
            </span>
            <span style={{ fontSize: 13, marginLeft: 12, color: '#9ca3af' }}>
              {status.phase}
            </span>
          </div>
          <div style={{ display: 'flex', gap: 16, alignItems: 'center', fontSize: 12 }}>
            <span style={{ color: '#9ca3af' }}>
              ⏱️ Upłynęło: <span style={{ color: '#fff' }}>{formatTime(elapsedTime)}</span>
            </span>
            {estimatedTotal > 0 && (
              <span style={{ color: isOvertime ? '#f59e0b' : '#9ca3af' }}>
                {isOvertime ? '⚠️ Trwa dłużej niż' : '⏳ Pozostało:'} 
                <span style={{ color: isOvertime ? '#fbbf24' : '#fff', marginLeft: 4 }}>
                  {isOvertime ? `+${formatTime(elapsedTime - estimatedTotal)}` : formatTime(remainingTime)}
                </span>
              </span>
            )}
            <span style={{ color: '#9ca3af' }}>
              {status.progress.toFixed(0)}%
            </span>
          </div>
        </div>

        {/* Progress bar */}
        <ProgressBar
          value={status.progress}
          max={100}
          color={isOvertime ? 'warning' : 'primary'}
          size="md"
          animated={status.progress < 100}
        />

        {/* Mały tekst z informacją */}
        <div style={{ marginTop: 6, fontSize: 11, color: '#6b7280', textAlign: 'center' }}>
          {estimatedTotal > 0 
            ? `Szacowany całkowity czas: ${formatTime(estimatedTotal)}`
            : 'Przetwarzanie w toku...'}
        </div>
      </div>
    </div>
  )
}

function formatTime(ms: number): string {
  const seconds = Math.floor(ms / 1000)
  const minutes = Math.floor(seconds / 60)
  const remainingSeconds = seconds % 60

  if (minutes > 0) {
    return `${minutes}m ${remainingSeconds}s`
  }
  return `${seconds}s`
}
