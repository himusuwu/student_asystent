import { openDB, type DBSchema, type IDBPDatabase } from 'idb'
import type { Flashcard, NoteFile, Subject, SessionMeta, Lecture, LectureTab, QuizQuestion, ChatMessage } from './types'

interface Schema extends DBSchema {
  subjects: { key: string; value: Subject }
  
  // Nowa struktura
  lectures: { key: string; value: Lecture; indexes: { bySubject: string; byDate: string } }
  lectureTabs: { key: string; value: LectureTab; indexes: { byLecture: string; byKind: string } }
  quizQuestions: { key: string; value: QuizQuestion; indexes: { byLecture: string } }
  chatMessages: { key: string; value: ChatMessage; indexes: { byLecture: string } }
  
  // Stare struktury - kompatybilność wsteczna
  sessions: { key: string; value: SessionMeta; indexes: { bySubject: string } }
  notes: { key: string; value: { id: string; sessionId: string; kind: NoteFile['kind']; content: string }; indexes: { bySession: string } }
  
  flashcards: { key: string; value: Flashcard; indexes: { bySubject: string; byLecture: string; byDueDate: string } }
  tempFiles: { key: string; value: { id: string; kind: 'audio' | 'pdf' | 'pptx'; blob: Blob } }
}

export async function db() {
  return openDB<Schema>('student-asystent', 2, {
    upgrade(database: IDBPDatabase<Schema>, oldVersion) {
      // V1 - stara struktura
      if (oldVersion < 1) {
        database.createObjectStore('subjects')
        const sessions = database.createObjectStore('sessions')
        sessions.createIndex('bySubject', 'subjectId')
        const notes = database.createObjectStore('notes')
        notes.createIndex('bySession', 'sessionId')
        const flash = database.createObjectStore('flashcards')
        flash.createIndex('bySubject', 'subjectId')
        flash.createIndex('byDueDate', 'dueDate')
        database.createObjectStore('tempFiles')
      }
      
      // V2 - nowa struktura z Lectures
      if (oldVersion < 2) {
        // Lectures
        const lectures = database.createObjectStore('lectures')
        lectures.createIndex('bySubject', 'subjectId')
        lectures.createIndex('byDate', 'createdAt')
        
        // Lecture Tabs
        const tabs = database.createObjectStore('lectureTabs')
        tabs.createIndex('byLecture', 'lectureId')
        tabs.createIndex('byKind', 'kind')
        
        // Quiz Questions
        const quiz = database.createObjectStore('quizQuestions')
        quiz.createIndex('byLecture', 'lectureId')
        
        // Chat Messages
        const chat = database.createObjectStore('chatMessages')
        chat.createIndex('byLecture', 'lectureId')
      }
    }
  })
}
