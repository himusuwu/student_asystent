// Typy zakładek w wykładzie
export type LectureTabKind = 
  | 'transcript'        // Surowa transkrypcja
  | 'cleaned'          // Oczyszczona transkrypcja
  | 'detailed_note'    // Szczegółowa notatka (AI)
  | 'short_note'       // Krótka notatka (AI)
  | 'key_points'       // Najważniejsze punkty (AI)
  | 'question_bank'    // Bank pytań (AI)
  | 'mindmap'          // Mapa myśli (AI)

export interface Subject {
  id: string
  name: string
  color?: string
  createdAt: string
}

// Nowa struktura: Lecture zamiast Session
export interface Lecture {
  id: string
  subjectId: string
  title: string
  createdAt: string
  updatedAt: string
  // Metadane
  duration?: number      // Długość w sekundach
  audioFileName?: string
  slidesFileName?: string
}

// Zakładka w wykładzie
export interface LectureTab {
  id: string
  lectureId: string
  kind: LectureTabKind
  content: string
  generatedAt: string
  // Status generowania
  isGenerating?: boolean
  generationError?: string
}

// Pytanie w quizie
export interface QuizQuestion {
  id: string
  lectureId: string
  question: string
  options: string[]      // 4 opcje odpowiedzi
  correctIndex: number   // Index poprawnej odpowiedzi (0-3)
  explanation?: string
  difficulty: 'easy' | 'medium' | 'hard'
  category?: string
  createdAt: string
}

// Fiszka powiązana z wykładem
export interface Flashcard {
  id: string
  subjectId: string
  lectureId?: string     // Powiązanie z wykładem
  question: string
  answer: string
  tags?: string[]
  easiness: number
  interval: number
  repetition: number
  dueDate: string
  history?: Array<{ date: string; quality: 0 | 1 | 2 | 3 | 4 | 5 }>
}

// Wiadomość w chacie z notatką
export interface ChatMessage {
  id: string
  lectureId: string
  role: 'user' | 'assistant'
  content: string
  timestamp: string
}

// Stare typy - do usunięcia po migracji
export type NoteKind = 
  | 'speech' | 'slides' | 'off_slides' | 'short' | 'user' | 'exam_bank'
  | 'formatted' | 'structured' | 'summary' | 'keywords'
  | 'outline' | 'mindmap' | 'timeline' | 'comparison' | 'bullets' | 'questions'
  | 'exam_bank_advanced' | 'cleaned'
  | 'ai_formatted' | 'ai_structured' | 'ai_summary' | 'ai_keypoints' | 'ai_questions' | 'ai_verification'

export interface SessionMeta {
  id: string
  subjectId: string
  title: string
  createdAt: string
  language?: string
}

export interface NoteFile {
  kind: NoteKind
  content: string
}
