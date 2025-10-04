import { db } from './db'
import type { Subject, SessionMeta, NoteFile, Flashcard, Lecture, LectureTab, QuizQuestion, ChatMessage, LectureTabKind } from './types'
import { uid } from './utils'

export async function createSubject(name: string, color?: string): Promise<Subject> {
  const d = await db()
  const s: Subject = { id: uid('sub_'), name, color, createdAt: new Date().toISOString() }
  await d.put('subjects', s, s.id)
  return s
}

export async function listSubjects(): Promise<Subject[]> {
  const d = await db()
  const tx = d.transaction('subjects')
  const store = tx.objectStore('subjects')
  const all: Subject[] = []
  let cursor = await store.openCursor()
  while (cursor) {
    all.push(cursor.value as Subject)
    cursor = await cursor.continue()
  }
  return all.sort((a,b)=>a.name.localeCompare(b.name))
}

export async function getSubject(id: string): Promise<Subject | undefined> {
  const d = await db()
  return d.get('subjects', id)
}

export async function createSession(subjectId: string, title: string, language?: string): Promise<SessionMeta> {
  const d = await db()
  const sess: SessionMeta = { id: uid('ses_'), subjectId, title, createdAt: new Date().toISOString(), language }
  await d.put('sessions', sess, sess.id)
  return sess
}

export async function listSessionsBySubject(subjectId: string): Promise<SessionMeta[]> {
  const d = await db()
  const idx = (await d).transaction('sessions').store.index('bySubject')
  const res: SessionMeta[] = []
  let cursor = await idx.openCursor(subjectId)
  while (cursor) {
    res.push(cursor.value as SessionMeta)
    cursor = await cursor.continue()
  }
  return res.sort((a,b)=> (a.createdAt < b.createdAt ? 1 : -1))
}

export async function updateSessionSubject(sessionId: string, newSubjectId: string) {
  const d = await db()
  const sess = await d.get('sessions', sessionId) as SessionMeta | undefined
  if (!sess) return
  const updated = { ...sess, subjectId: newSubjectId }
  await d.put('sessions', updated, sessionId)
}

export async function saveNote(sessionId: string, kind: NoteFile['kind'], content: string) {
  const d = await db()
  const id = uid('note_')
  await d.put('notes', { id, sessionId, kind, content }, id)
  return id
}

export async function getNotesBySession(sessionId: string) {
  const d = await db()
  const idx = d.transaction('notes').store.index('bySession')
  const res: Array<{ id: string; sessionId: string; kind: NoteFile['kind']; content: string }> = []
  let cursor = await idx.openCursor(sessionId)
  while (cursor) {
    res.push(cursor.value)
    cursor = await cursor.continue()
  }
  return res
}

export async function getNoteByKind(sessionId: string, kind: NoteFile['kind']) {
  const notes = await getNotesBySession(sessionId)
  return notes.find(n => n.kind === kind)
}

export async function getExamBank(sessionId: string): Promise<any | null> {
  const bankNote = await getNoteByKind(sessionId, 'exam_bank')
  if (!bankNote) return null
  const m = bankNote.content.match(/```json\n([\s\S]*?)```/)
  if (!m) return null
  try { return JSON.parse(m[1]) } catch { return null }
}

export async function updateNoteContent(id: string, content: string) {
  const d = await db()
  const note = await d.get('notes', id)
  if (!note) return
  await d.put('notes', { ...note, content }, id)
}

export async function saveUserNote(sessionId: string, content: string) {
  const existing = await getNoteByKind(sessionId, 'user')
  if (existing) {
    await updateNoteContent(existing.id, content)
    return existing.id
  } else {
    return saveNote(sessionId, 'user', content)
  }
}

export async function addFlashcards(cards: Omit<Flashcard, 'id' | 'easiness' | 'interval' | 'repetition' | 'dueDate'>[]) {
  console.log(`[addFlashcards] Dodawanie ${cards.length} fiszek...`)
  
  // Walidacja
  cards.forEach((c, i) => {
    console.log(`  [${i}] subjectId="${c.subjectId}" (type: ${typeof c.subjectId}), question="${c.question.substring(0, 50)}..."`)
    
    if (!c.subjectId || typeof c.subjectId !== 'string') {
      throw new Error(`Fiszka ${i}: brak subjectId lub nieprawidłowy typ (${typeof c.subjectId})`)
    }
    if (!c.question || typeof c.question !== 'string') {
      throw new Error(`Fiszka ${i}: brak question lub nieprawidłowy typ`)
    }
    if (!c.answer || typeof c.answer !== 'string') {
      throw new Error(`Fiszka ${i}: brak answer lub nieprawidłowy typ`)
    }
  })
  
  const d = await db()
  const tx = d.transaction('flashcards', 'readwrite')
  
  for (const c of cards) {
    const id = uid('fc_')
    const flashcard: Flashcard = {
      id,
      subjectId: c.subjectId,
      lectureId: (c as any).lectureId || (c as any).sessionId, // Kompatybilność wsteczna
      question: c.question,
      answer: c.answer,
      tags: c.tags,
      easiness: 2.5,
      interval: 0,
      repetition: 0,
      dueDate: new Date().toISOString(),
      history: (c as any).history
    }
    console.log(`  Zapisuję fiszkę ${id}:`, JSON.stringify(flashcard))
    
    try {
      await tx.store.put(flashcard, id)  // Klucz jako drugi argument!
      console.log(`  ✓ Zapisano fiszkę ${id}`)
    } catch (err: any) {
      console.error(`  ✗ BŁĄD przy zapisie fiszki ${id}:`, err)
      console.error(`  Flashcard:`, flashcard)
      throw new Error(`Nie udało się zapisać fiszki ${id}: ${err.message}`)
    }
  }
  
  await tx.done
  console.log(`[addFlashcards] Zapisano ${cards.length} fiszek do IndexedDB`)
  
  // Sprawdź co jest w bazie
  const all = await listAllFlashcards()
  console.log(`[addFlashcards] Weryfikacja: w bazie jest teraz ${all.length} fiszek`)
}

export async function listDueFlashcards(subjectId?: string, now = new Date()) {
  const d = await db()
  const idx = d.transaction('flashcards').store.index('byDueDate')
  const res: Flashcard[] = []
  let cursor = await idx.openCursor()
  while (cursor) {
    const val = cursor.value as Flashcard
    if (new Date(val.dueDate) <= now && (!subjectId || val.subjectId === subjectId)) res.push(val)
    cursor = await cursor.continue()
  }
  return res
}

export async function listAllFlashcards(): Promise<Flashcard[]> {
  const d = await db()
  const tx = d.transaction('flashcards')
  const store = tx.objectStore('flashcards')
  const res: Flashcard[] = []
  let cursor = await store.openCursor()
  while (cursor) {
    res.push(cursor.value as Flashcard)
    cursor = await cursor.continue()
  }
  return res
}

export async function listFlashcardsBySubject(subjectId: string): Promise<Flashcard[]> {
  const all = await listAllFlashcards()
  return all.filter(c => c.subjectId === subjectId)
}

export async function getFlashcard(id: string): Promise<Flashcard | undefined> {
  const d = await db()
  return d.get('flashcards', id) as Promise<Flashcard | undefined>
}

export async function saveFlashcard(card: Flashcard) {
  const d = await db()
  await d.put('flashcards', card, card.id)
}

// temp files (audio/pdf/pptx) lifecycle
export async function putTempFile(kind: 'audio' | 'pdf' | 'pptx', blob: Blob, id = uid('tmp_')) {
  const d = await db()
  await d.put('tempFiles', { id, kind, blob }, id)
  return id
}

export async function getTempFile(id: string) {
  const d = await db()
  return d.get('tempFiles', id) as Promise<{ id: string; kind: 'audio' | 'pdf' | 'pptx'; blob: Blob } | undefined>
}

export async function deleteTempFile(id: string) {
  const d = await db()
  await d.delete('tempFiles', id)
}

// ============================================
// NOWE FUNKCJE DLA LECTURES
// ============================================

/** Utwórz nowy wykład */
export async function createLecture(subjectId: string, title: string): Promise<Lecture> {
  const d = await db()
  const now = new Date().toISOString()
  const lecture: Lecture = {
    id: uid('lec_'),
    subjectId,
    title,
    createdAt: now,
    updatedAt: now
  }
  await d.put('lectures', lecture, lecture.id)
  return lecture
}

/** Pobierz wykład */
export async function getLecture(id: string): Promise<Lecture | undefined> {
  const d = await db()
  return d.get('lectures', id)
}

/** Lista wykładów dla przedmiotu */
export async function listLecturesBySubject(subjectId: string): Promise<Lecture[]> {
  const d = await db()
  const idx = d.transaction('lectures').store.index('bySubject')
  const all: Lecture[] = []
  let cursor = await idx.openCursor(IDBKeyRange.only(subjectId))
  while (cursor) {
    all.push(cursor.value as Lecture)
    cursor = await cursor.continue()
  }
  return all.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
}

/** Aktualizuj wykład */
export async function updateLecture(id: string, updates: Partial<Omit<Lecture, 'id' | 'createdAt'>>): Promise<void> {
  const d = await db()
  const existing = await d.get('lectures', id)
  if (!existing) throw new Error('Lecture not found')
  
  const updated: Lecture = {
    ...existing,
    ...updates,
    updatedAt: new Date().toISOString()
  }
  await d.put('lectures', updated, id)
}

/** Usuń wykład i wszystkie powiązane dane */
export async function deleteLecture(id: string): Promise<void> {
  const d = await db()
  
  // Usuń wykład
  await d.delete('lectures', id)
  
  // Usuń wszystkie zakładki
  const tabs = await listLectureTabs(id)
  for (const tab of tabs) {
    await d.delete('lectureTabs', tab.id)
  }
  
  // Usuń pytania quizowe
  const questions = await listQuizQuestions(id)
  for (const q of questions) {
    await d.delete('quizQuestions', q.id)
  }
  
  // Usuń wiadomości czatu
  const messages = await listChatMessages(id)
  for (const msg of messages) {
    await d.delete('chatMessages', msg.id)
  }
  
  // Usuń fiszki powiązane z wykładem
  const flashcards = await listFlashcardsByLecture(id)
  for (const fc of flashcards) {
    await d.delete('flashcards', fc.id)
  }
}

// ============================================
// LECTURE TABS (ZAKŁADKI)
// ============================================

/** Zapisz lub zaktualizuj zakładkę wykładu */
export async function saveLectureTab(lectureId: string, kind: LectureTabKind, content: string): Promise<LectureTab> {
  const d = await db()
  
  // Sprawdź czy już istnieje
  const existing = await getLectureTab(lectureId, kind)
  
  if (existing) {
    // Aktualizuj istniejącą
    const updated: LectureTab = {
      ...existing,
      content,
      generatedAt: new Date().toISOString(),
      isGenerating: false,
      generationError: undefined
    }
    await d.put('lectureTabs', updated, updated.id)
    return updated
  } else {
    // Utwórz nową
    const tab: LectureTab = {
      id: uid('tab_'),
      lectureId,
      kind,
      content,
      generatedAt: new Date().toISOString()
    }
    await d.put('lectureTabs', tab, tab.id)
    return tab
  }
}

/** Pobierz konkretną zakładkę */
export async function getLectureTab(lectureId: string, kind: LectureTabKind): Promise<LectureTab | undefined> {
  const d = await db()
  const tabs = await listLectureTabs(lectureId)
  return tabs.find(t => t.kind === kind)
}

/** Lista wszystkich zakładek wykładu */
export async function listLectureTabs(lectureId: string): Promise<LectureTab[]> {
  const d = await db()
  const idx = d.transaction('lectureTabs').store.index('byLecture')
  const all: LectureTab[] = []
  let cursor = await idx.openCursor(IDBKeyRange.only(lectureId))
  while (cursor) {
    all.push(cursor.value as LectureTab)
    cursor = await cursor.continue()
  }
  return all
}

/** Usuń zakładkę */
export async function deleteLectureTab(id: string): Promise<void> {
  const d = await db()
  await d.delete('lectureTabs', id)
}

/** Oznacz zakładkę jako generującą się */
export async function markTabGenerating(lectureId: string, kind: LectureTabKind): Promise<void> {
  const d = await db()
  const tab = await getLectureTab(lectureId, kind)
  
  if (tab) {
    const updated: LectureTab = { ...tab, isGenerating: true, generationError: undefined }
    await d.put('lectureTabs', updated, tab.id)
  } else {
    const newTab: LectureTab = {
      id: uid('tab_'),
      lectureId,
      kind,
      content: '',
      generatedAt: new Date().toISOString(),
      isGenerating: true
    }
    await d.put('lectureTabs', newTab, newTab.id)
  }
}

/** Oznacz zakładkę jako błędną */
export async function markTabError(lectureId: string, kind: LectureTabKind, error: string): Promise<void> {
  const d = await db()
  const tab = await getLectureTab(lectureId, kind)
  
  if (tab) {
    const updated: LectureTab = { ...tab, isGenerating: false, generationError: error }
    await d.put('lectureTabs', updated, tab.id)
  }
}

// ============================================
// QUIZ QUESTIONS
// ============================================

/** Dodaj pytania quizowe */
export async function addQuizQuestions(questions: Omit<QuizQuestion, 'id' | 'createdAt'>[]): Promise<void> {
  const d = await db()
  const tx = d.transaction('quizQuestions', 'readwrite')
  
  for (const q of questions) {
    const question: QuizQuestion = {
      ...q,
      id: uid('quiz_'),
      createdAt: new Date().toISOString()
    }
    await tx.store.put(question, question.id)
  }
  
  await tx.done
}

/** Pobierz pytania quizowe dla wykładu */
export async function listQuizQuestions(lectureId: string): Promise<QuizQuestion[]> {
  const d = await db()
  const idx = d.transaction('quizQuestions').store.index('byLecture')
  const all: QuizQuestion[] = []
  let cursor = await idx.openCursor(IDBKeyRange.only(lectureId))
  while (cursor) {
    all.push(cursor.value as QuizQuestion)
    cursor = await cursor.continue()
  }
  return all
}

/** Usuń pytanie quizowe */
export async function deleteQuizQuestion(id: string): Promise<void> {
  const d = await db()
  await d.delete('quizQuestions', id)
}

// ============================================
// CHAT MESSAGES
// ============================================

/** Dodaj wiadomość do czatu */
export async function addChatMessage(lectureId: string, role: 'user' | 'assistant', content: string): Promise<ChatMessage> {
  const d = await db()
  const msg: ChatMessage = {
    id: uid('msg_'),
    lectureId,
    role,
    content,
    timestamp: new Date().toISOString()
  }
  await d.put('chatMessages', msg, msg.id)
  return msg
}

/** Pobierz historię czatu */
export async function listChatMessages(lectureId: string): Promise<ChatMessage[]> {
  const d = await db()
  const idx = d.transaction('chatMessages').store.index('byLecture')
  const all: ChatMessage[] = []
  let cursor = await idx.openCursor(IDBKeyRange.only(lectureId))
  while (cursor) {
    all.push(cursor.value as ChatMessage)
    cursor = await cursor.continue()
  }
  return all.sort((a, b) => new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime())
}

/** Wyczyść historię czatu */
export async function clearChatHistory(lectureId: string): Promise<void> {
  const d = await db()
  const messages = await listChatMessages(lectureId)
  
  for (const msg of messages) {
    await d.delete('chatMessages', msg.id)
  }
}

// ============================================
// FLASHCARDS - zaktualizowane dla Lectures
// ============================================

/** Pobierz fiszki dla wykładu */
export async function listFlashcardsByLecture(lectureId: string): Promise<Flashcard[]> {
  const d = await db()
  const all = await listAllFlashcards()
  return all.filter(fc => fc.lectureId === lectureId)
}

// ============================================
// DATABASE MANAGEMENT
// ============================================

/** Resetuj całą bazę danych (usuwa WSZYSTKIE dane) */
export async function resetDatabase(): Promise<void> {
  const d = await db()
  
  // Usuń wszystkie dane ze wszystkich stores
  const storeNames: Array<'subjects' | 'sessions' | 'notes' | 'flashcards' | 'lectures' | 'lectureTabs' | 'quizQuestions' | 'chatMessages'> = [
    'subjects', 'sessions', 'notes', 'flashcards', 'lectures', 'lectureTabs', 'quizQuestions', 'chatMessages'
  ]
  
  for (const storeName of storeNames) {
    try {
      const tx = d.transaction(storeName, 'readwrite')
      const store = tx.objectStore(storeName)
      await store.clear()
      await tx.done
    } catch (err) {
      console.warn(`[resetDatabase] Nie można wyczyścić ${storeName}:`, err)
    }
  }
  
  console.log('[resetDatabase] Baza danych została zresetowana')
}
