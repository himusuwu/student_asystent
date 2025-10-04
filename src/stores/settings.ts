export type AiMode = 'local' | 'cloud'
export type AiModel = 'phi3.5:3.8b' | 'llama3.1:8b' | 'qwen2.5:14b' | 'auto'

export interface SettingsState {
  aiMode: AiMode
  aiModel?: AiModel
  githubToken?: string
  githubRepo?: string // "owner/repo"
  githubBranch?: string // default main
  whisperModel?: 'tiny' | 'base' | 'small'
  whisperLanguage?: string // e.g., 'pl', 'en', or 'auto'
  whisperEngine?: 'transformers' | 'whisper-cpp' // nowy wybór silnika
  forceWasm?: boolean
  hfMirror?: 'official' | 'mirror'
  modelSource?: 'remote' | 'local'
  localModelBase?: string // e.g., '/models' served from public folder
  transcriptionMode?: 'auto' | 'backend' | 'browser' // auto = try backend, fallback to browser
  backendUrl?: string // default: http://localhost:3001
}

const KEY = 'student-asystent:settings'

export function getSettings(): SettingsState {
  try {
    const raw = localStorage.getItem(KEY)
    if (!raw) return { 
      aiMode: 'local', 
      aiModel: 'auto',
      transcriptionMode: 'auto', 
      whisperModel: 'tiny',
      whisperLanguage: 'pl',
      whisperEngine: 'whisper-cpp',
      modelSource: 'local',
      localModelBase: '/models',
      backendUrl: 'http://localhost:3001'
    }
    const parsed = JSON.parse(raw)
    
    // Migracja starych nazw modeli do nowych z tagami wersji
    let migratedAiModel = parsed.aiModel ?? 'auto'
    if (migratedAiModel === 'phi3.5') migratedAiModel = 'phi3.5:3.8b'
    if (migratedAiModel === 'llama3.1') migratedAiModel = 'llama3.1:8b'
    if (migratedAiModel === 'qwen2.5') migratedAiModel = 'qwen2.5:14b'
    
    return { 
      aiMode: parsed.aiMode ?? 'local', 
      aiModel: migratedAiModel,
      githubToken: parsed.githubToken, 
      githubRepo: parsed.githubRepo, 
      githubBranch: parsed.githubBranch ?? 'main', 
      whisperModel: parsed.whisperModel ?? 'tiny', // Domyślnie tiny dla najszybszego działania
      whisperLanguage: parsed.whisperLanguage ?? 'pl', // Domyślnie polski
      whisperEngine: parsed.whisperEngine ?? 'whisper-cpp', // Domyślnie whisper.cpp (najszybszy!)
      forceWasm: !!parsed.forceWasm, 
      hfMirror: parsed.hfMirror ?? 'official', 
      modelSource: parsed.modelSource ?? 'local', // Domyślnie lokalny model
      localModelBase: parsed.localModelBase ?? '/models',
      transcriptionMode: parsed.transcriptionMode ?? 'auto', // Domyślnie backend first, fallback przeglądarka
      backendUrl: parsed.backendUrl ?? 'http://localhost:3001'
    }
  } catch {
    return { 
      aiMode: 'local', 
      transcriptionMode: 'auto', 
      whisperModel: 'tiny', 
      whisperEngine: 'whisper-cpp',
      whisperLanguage: 'pl',
      modelSource: 'local',
      localModelBase: '/models',
      backendUrl: 'http://localhost:3001'
    }
  }
}

export function setSettings(update: Partial<SettingsState>) {
  const current = getSettings()
  const next = { ...current, ...update }
  localStorage.setItem(KEY, JSON.stringify(next))
  return next
}
