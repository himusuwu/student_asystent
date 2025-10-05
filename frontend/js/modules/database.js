// Database Module - IndexedDB Operations
// Student Assistant v2.0

let dbPromise = null;

export function openDatabase() {
    if (dbPromise) return dbPromise;
    
    dbPromise = idb.openDB('student-asystent', 2, {
        upgrade(database, oldVersion) {
            // V1 - podstawowa struktura
            if (oldVersion < 1) {
                database.createObjectStore('subjects');
                const sessions = database.createObjectStore('sessions');
                sessions.createIndex('bySubject', 'subjectId');
                const notes = database.createObjectStore('notes');
                notes.createIndex('bySession', 'sessionId');
                const flash = database.createObjectStore('flashcards');
                flash.createIndex('bySubject', 'subjectId');
                flash.createIndex('byDueDate', 'dueDate');
                database.createObjectStore('tempFiles');
            }
            
            // V2 - nowa struktura z Lectures
            if (oldVersion < 2) {
                const lectures = database.createObjectStore('lectures');
                lectures.createIndex('bySubject', 'subjectId');
                lectures.createIndex('byDate', 'createdAt');
                
                const tabs = database.createObjectStore('lectureTabs');
                tabs.createIndex('byLecture', 'lectureId');
                tabs.createIndex('byKind', 'kind');
                
                const quiz = database.createObjectStore('quizQuestions');
                quiz.createIndex('byLecture', 'lectureId');
                
                const chat = database.createObjectStore('chatMessages');
                chat.createIndex('byLecture', 'lectureId');
            }
        }
    });
    
    return dbPromise;
}

// Utility function
export function uid(prefix = 'id_') {
    return prefix + Date.now() + '_' + Math.random().toString(36).substr(2, 9);
}

// Subject Operations
export async function createSubject(name, color) {
    const db = await openDatabase();
    const subject = {
        id: uid('sub_'),
        name,
        color: color || '#6366f1',
        createdAt: new Date().toISOString()
    };
    await db.put('subjects', subject, subject.id);
    return subject;
}

export async function listSubjects() {
    const db = await openDatabase();
    const tx = db.transaction('subjects');
    const store = tx.objectStore('subjects');
    const subjects = [];
    let cursor = await store.openCursor();
    while (cursor) {
        // Only add actual subjects (not schedule events)
        // Schedule events have dayOfWeek property
        if (cursor.value.dayOfWeek === undefined) {
            subjects.push(cursor.value);
        }
        cursor = await cursor.continue();
    }
    return subjects.sort((a, b) => {
        if (!a.name || !b.name) return 0;
        return a.name.localeCompare(b.name);
    });
}

export async function getSubject(id) {
    const db = await openDatabase();
    return await db.get('subjects', id);
}

export async function deleteSubject(id) {
    const db = await openDatabase();
    await db.delete('subjects', id);
}

// Lecture Operations
export async function createLecture(subjectId, title) {
    const db = await openDatabase();
    const lecture = {
        id: uid('lec_'),
        subjectId,
        title,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString()
    };
    await db.put('lectures', lecture, lecture.id);
    return lecture;
}

export async function listLectures() {
    const db = await openDatabase();
    const tx = db.transaction('lectures');
    const store = tx.objectStore('lectures');
    const lectures = [];
    let cursor = await store.openCursor();
    while (cursor) {
        lectures.push(cursor.value);
        cursor = await cursor.continue();
    }
    return lectures.sort((a, b) => b.createdAt.localeCompare(a.createdAt));
}

export async function listLecturesBySubject(subjectId) {
    const db = await openDatabase();
    const idx = db.transaction('lectures').store.index('bySubject');
    const lectures = [];
    let cursor = await idx.openCursor(subjectId);
    while (cursor) {
        lectures.push(cursor.value);
        cursor = await cursor.continue();
    }
    return lectures.sort((a, b) => b.createdAt.localeCompare(a.createdAt));
}

export async function updateLecture(id, updates) {
    const db = await openDatabase();
    const lecture = await db.get('lectures', id);
    if (!lecture) throw new Error('Lecture not found');
    
    const updated = {
        ...lecture,
        ...updates,
        updatedAt: new Date().toISOString()
    };
    await db.put('lectures', updated, id);
    return updated;
}

export async function deleteLecture(id) {
    const db = await openDatabase();
    await db.delete('lectures', id);
}

export async function getLecture(id) {
    const db = await openDatabase();
    return await db.get('lectures', id);
}

// Flashcard Operations
export async function createFlashcard(subjectId, front, back) {
    const db = await openDatabase();
    const flashcard = {
        id: uid('flash_'),
        subjectId,
        front,
        back,
        easeFactor: 2.5,
        interval: 0,
        repetition: 0,
        dueDate: new Date().toISOString(),
        createdAt: new Date().toISOString()
    };
    await db.put('flashcards', flashcard, flashcard.id);
    return flashcard;
}

export async function listFlashcards() {
    const db = await openDatabase();
    const tx = db.transaction('flashcards');
    const store = tx.objectStore('flashcards');
    const flashcards = [];
    let cursor = await store.openCursor();
    while (cursor) {
        flashcards.push(cursor.value);
        cursor = await cursor.continue();
    }
    return flashcards;
}

export async function updateFlashcard(id, updates) {
    const db = await openDatabase();
    const flashcard = await db.get('flashcards', id);
    if (!flashcard) throw new Error('Flashcard not found');
    
    const updated = {
        ...flashcard,
        ...updates
    };
    await db.put('flashcards', updated, id);
    return updated;
}

export async function deleteFlashcard(id) {
    const db = await openDatabase();
    await db.delete('flashcards', id);
}

export async function addFlashcard(flashcard) {
    const db = await openDatabase();
    // Normalize format: support both front/back and question/answer
    const front = flashcard.front || flashcard.question;
    const back = flashcard.back || flashcard.answer;
    
    const card = {
        id: uid('flash_'),
        ...flashcard,
        front, // Always save as front
        back,  // Always save as back
        easeFactor: flashcard.easeFactor || 2.5,
        interval: flashcard.interval || 0,
        repetition: flashcard.repetition || 0,
        dueDate: flashcard.dueDate || new Date().toISOString(),
        createdAt: new Date().toISOString()
    };
    await db.put('flashcards', card, card.id);
    return card;
}

export async function getFlashcardsByLecture(lectureId) {
    const db = await openDatabase();
    const allFlashcards = await listFlashcards();
    return allFlashcards.filter(card => card.lectureId === lectureId);
}

// Schedule Operations
export async function createScheduleEvent(event) {
    const db = await openDatabase();
    const scheduleEvent = {
        id: uid('sched_'),
        subjectId: event.subjectId,
        title: event.title,
        dayOfWeek: event.dayOfWeek, // 0-6 (niedziela-sobota)
        startTime: event.startTime, // Format: "HH:MM"
        endTime: event.endTime, // Format: "HH:MM"
        location: event.location || '',
        type: event.type || 'lecture', // lecture, lab, exercise, exam
        notes: event.notes || '',
        createdAt: new Date().toISOString()
    };
    await db.put('subjects', scheduleEvent, scheduleEvent.id); // Store w subjects jako workaround
    return scheduleEvent;
}

export async function listScheduleEvents() {
    const db = await openDatabase();
    const tx = db.transaction('subjects');
    const store = tx.objectStore('subjects');
    const events = [];
    let cursor = await store.openCursor();
    while (cursor) {
        // Filter only schedule events (mają dayOfWeek)
        if (cursor.value.dayOfWeek !== undefined) {
            events.push(cursor.value);
        }
        cursor = await cursor.continue();
    }
    return events.sort((a, b) => {
        if (a.dayOfWeek !== b.dayOfWeek) return a.dayOfWeek - b.dayOfWeek;
        return a.startTime.localeCompare(b.startTime);
    });
}

export async function getScheduleEvent(id) {
    const db = await openDatabase();
    return await db.get('subjects', id);
}

export async function updateScheduleEvent(id, updates) {
    const db = await openDatabase();
    const event = await db.get('subjects', id);
    if (!event || event.dayOfWeek === undefined) throw new Error('Schedule event not found');
    
    const updated = {
        ...event,
        ...updates,
        updatedAt: new Date().toISOString()
    };
    await db.put('subjects', updated, id);
    return updated;
}

export async function deleteScheduleEvent(id) {
    const db = await openDatabase();
    await db.delete('subjects', id);
}

// Clear/Delete All Operations
export async function clearAllLectures() {
    const db = await openDatabase();
    const tx = db.transaction('lectures', 'readwrite');
    await tx.objectStore('lectures').clear();
    await tx.done;
}

export async function clearAllFlashcards() {
    const db = await openDatabase();
    const tx = db.transaction('flashcards', 'readwrite');
    await tx.objectStore('flashcards').clear();
    await tx.done;
}

export async function clearAllScheduleEvents() {
    const db = await openDatabase();
    const events = await listScheduleEvents();
    const tx = db.transaction('subjects', 'readwrite');
    for (const event of events) {
        await tx.objectStore('subjects').delete(event.id);
    }
    await tx.done;
}

export async function clearAllSubjects() {
    const db = await openDatabase();
    const tx = db.transaction('subjects', 'readwrite');
    const store = tx.objectStore('subjects');
    
    // Get all keys
    const allKeys = await store.getAllKeys();
    
    // Delete only subjects (not schedule events)
    for (const key of allKeys) {
        const item = await store.get(key);
        // Delete if it's a subject (doesn't have dayOfWeek)
        if (item.dayOfWeek === undefined) {
            await store.delete(key);
        }
    }
    await tx.done;
}

export async function clearAllData() {
    const db = await openDatabase();
    
    // Clear all stores
    const stores = ['subjects', 'lectures', 'flashcards', 'lectureTabs', 'quizQuestions', 'chatMessages'];
    
    for (const storeName of stores) {
        try {
            const tx = db.transaction(storeName, 'readwrite');
            await tx.objectStore(storeName).clear();
            await tx.done;
        } catch (error) {
            console.warn(`Could not clear ${storeName}:`, error);
        }
    }
}
