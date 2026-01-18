// Database Module - IndexedDB Operations
// Student Assistant v2.0

let dbPromise = null;

export function openDatabase() {
    if (dbPromise) return dbPromise;
    
    dbPromise = idb.openDB('student-asystent', 3, {
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
            
            // V3 - Kolokwia/Egzaminy
            if (oldVersion < 3) {
                const exams = database.createObjectStore('exams');
                exams.createIndex('bySubject', 'subjectId');
                exams.createIndex('byDate', 'createdAt');
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
    
    // Najpierw usuń wszystkie wykłady tego przedmiotu (co automatycznie usuwa fiszki)
    const lectures = await listLecturesBySubject(id);
    for (const lecture of lectures) {
        await deleteLecture(lecture.id);
    }
    
    // Usuń również fiszki bezpośrednio przypisane do przedmiotu (bez wykładu)
    const allFlashcards = await listFlashcards();
    const subjectFlashcards = allFlashcards.filter(card => card.subjectId === id && !card.lectureId);
    for (const flashcard of subjectFlashcards) {
        await db.delete('flashcards', flashcard.id);
    }
    
    // Na końcu usuń sam przedmiot
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
    
    // Najpierw usuń wszystkie fiszki powiązane z tym wykładem
    const flashcards = await getFlashcardsByLecture(id);
    for (const flashcard of flashcards) {
        await db.delete('flashcards', flashcard.id);
    }
    
    // Usuń wszystkie inne powiązane dane
    // Usuń zakładki wykładu
    const tabs = await db.getAll('lectureTabs');
    for (const tab of tabs) {
        if (tab.lectureId === id) {
            await db.delete('lectureTabs', tab.id);
        }
    }
    
    // Usuń pytania quizu
    const quizQuestions = await db.getAll('quizQuestions');
    for (const question of quizQuestions) {
        if (question.lectureId === id) {
            await db.delete('quizQuestions', question.id);
        }
    }
    
    // Usuń wiadomości czatu
    const chatMessages = await db.getAll('chatMessages');
    for (const message of chatMessages) {
        if (message.lectureId === id) {
            await db.delete('chatMessages', message.id);
        }
    }
    
    // Na końcu usuń sam wykład
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

// Cleanup Functions
export async function findOrphanedFlashcards() {
    const db = await openDatabase();
    const allFlashcards = await listFlashcards();
    const allLectures = await listLectures();
    const lectureIds = new Set(allLectures.map(lecture => lecture.id));
    
    // Znajdź fiszki które mają lectureId ale wykład już nie istnieje
    const orphanedFlashcards = allFlashcards.filter(card => 
        card.lectureId && !lectureIds.has(card.lectureId)
    );
    
    return orphanedFlashcards;
}

export async function cleanupOrphanedFlashcards() {
    const db = await openDatabase();
    const orphanedFlashcards = await findOrphanedFlashcards();
    
    console.log(`Znaleziono ${orphanedFlashcards.length} osieroconych fiszek do usunięcia...`);
    
    for (const flashcard of orphanedFlashcards) {
        await db.delete('flashcards', flashcard.id);
        console.log(`Usunięto fiszkę: "${flashcard.front}"`);
    }
    
    return orphanedFlashcards.length;
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

// ============================================
// DATA EXPORT/IMPORT
// ============================================

/**
 * Export all data from IndexedDB to a JSON object
 * Includes: subjects, lectures, lectureTabs, quizQuestions, chatMessages, 
 * flashcards, notes, sessions, and localStorage settings
 */
export async function exportAllData() {
    const db = await openDatabase();
    const exportData = {
        version: 1,
        exportDate: new Date().toISOString(),
        appVersion: '2.0',
        data: {}
    };
    
    // Define all stores to export
    const stores = [
        'subjects',
        'lectures', 
        'lectureTabs',
        'quizQuestions',
        'chatMessages',
        'flashcards',
        'notes',
        'sessions',
        'tempFiles'
    ];
    
    // Export each store
    for (const storeName of stores) {
        try {
            const tx = db.transaction(storeName, 'readonly');
            const store = tx.objectStore(storeName);
            const items = [];
            let cursor = await store.openCursor();
            
            while (cursor) {
                items.push({
                    key: cursor.key,
                    value: cursor.value
                });
                cursor = await cursor.continue();
            }
            
            exportData.data[storeName] = items;
            console.log(`✅ Exported ${items.length} items from ${storeName}`);
        } catch (error) {
            console.warn(`⚠️ Could not export ${storeName}:`, error);
            exportData.data[storeName] = [];
        }
    }
    
    // Export localStorage settings
    try {
        const settings = localStorage.getItem('student-asystent-settings');
        if (settings) {
            exportData.localStorage = {
                'student-asystent-settings': settings
            };
        }
        
        // Export collapsed sections state
        const collapsedSections = {};
        for (let i = 0; i < localStorage.length; i++) {
            const key = localStorage.key(i);
            if (key && (key.startsWith('lecture-section-') || key.startsWith('flashcard-section-'))) {
                collapsedSections[key] = localStorage.getItem(key);
            }
        }
        if (Object.keys(collapsedSections).length > 0) {
            exportData.localStorage = {
                ...exportData.localStorage,
                ...collapsedSections
            };
        }
    } catch (error) {
        console.warn('⚠️ Could not export localStorage:', error);
    }
    
    // Calculate statistics
    exportData.statistics = {
        totalSubjects: exportData.data.subjects?.length || 0,
        totalLectures: exportData.data.lectures?.length || 0,
        totalTabs: exportData.data.lectureTabs?.length || 0,
        totalQuizQuestions: exportData.data.quizQuestions?.length || 0,
        totalChatMessages: exportData.data.chatMessages?.length || 0,
        totalFlashcards: exportData.data.flashcards?.length || 0,
        totalNotes: exportData.data.notes?.length || 0,
        totalSessions: exportData.data.sessions?.length || 0
    };
    
    console.log('📊 Export statistics:', exportData.statistics);
    
    return exportData;
}

/**
 * Import data from a JSON export file
 * @param {Object} importData - The exported data object
 * @param {Object} options - Import options
 * @param {boolean} options.clearExisting - Whether to clear existing data before import (default: false)
 * @param {boolean} options.skipDuplicates - Whether to skip items with existing IDs (default: true)
 */
export async function importAllData(importData, options = {}) {
    const {
        clearExisting = false,
        skipDuplicates = true
    } = options;
    
    // Validate import data
    if (!importData || !importData.data) {
        throw new Error('Invalid import data format');
    }
    
    console.log('📥 Starting data import...');
    console.log('Import date:', importData.exportDate);
    console.log('Import statistics:', importData.statistics);
    
    const db = await openDatabase();
    const results = {
        imported: {},
        skipped: {},
        errors: []
    };
    
    // Clear existing data if requested
    if (clearExisting) {
        console.log('🗑️ Clearing existing data...');
        await clearAllData();
    }
    
    // Import each store
    const stores = [
        'subjects',
        'lectures',
        'lectureTabs',
        'quizQuestions',
        'chatMessages',
        'flashcards',
        'notes',
        'sessions',
        'tempFiles'
    ];
    
    for (const storeName of stores) {
        if (!importData.data[storeName]) {
            console.log(`⏭️ Skipping ${storeName} (no data)`);
            continue;
        }
        
        results.imported[storeName] = 0;
        results.skipped[storeName] = 0;
        
        try {
            const items = importData.data[storeName];
            
            for (const item of items) {
                try {
                    // Check if item already exists
                    if (skipDuplicates) {
                        const existing = await db.get(storeName, item.key);
                        if (existing) {
                            results.skipped[storeName]++;
                            continue;
                        }
                    }
                    
                    // Import the item
                    await db.put(storeName, item.value, item.key);
                    results.imported[storeName]++;
                } catch (error) {
                    console.warn(`⚠️ Error importing item to ${storeName}:`, error);
                    results.errors.push({
                        store: storeName,
                        key: item.key,
                        error: error.message
                    });
                }
            }
            
            console.log(`✅ ${storeName}: imported ${results.imported[storeName]}, skipped ${results.skipped[storeName]}`);
        } catch (error) {
            console.error(`❌ Error importing ${storeName}:`, error);
            results.errors.push({
                store: storeName,
                error: error.message
            });
        }
    }
    
    // Import localStorage
    if (importData.localStorage) {
        try {
            for (const [key, value] of Object.entries(importData.localStorage)) {
                // Only import if doesn't exist or clearExisting is true
                if (clearExisting || !localStorage.getItem(key)) {
                    localStorage.setItem(key, value);
                }
            }
            console.log('✅ localStorage settings imported');
        } catch (error) {
            console.warn('⚠️ Could not import localStorage:', error);
            results.errors.push({
                store: 'localStorage',
                error: error.message
            });
        }
    }
    
    console.log('📊 Import completed!');
    console.log('Results:', results);
    
    return results;
}

/**
 * Get statistics about current data in the database
 */
export async function getDataStatistics() {
    const db = await openDatabase();
    const stats = {};
    
    const stores = [
        'subjects',
        'lectures',
        'lectureTabs',
        'quizQuestions',
        'chatMessages',
        'flashcards',
        'notes',
        'sessions'
    ];
    
    for (const storeName of stores) {
        try {
            const tx = db.transaction(storeName, 'readonly');
            const store = tx.objectStore(storeName);
            const count = await store.count();
            stats[storeName] = count;
        } catch (error) {
            stats[storeName] = 0;
        }
    }
    
    return stats;
}

// ============================================
// SPACED REPETITION SYSTEM (SM-2 Algorithm)
// ============================================

/**
 * SM-2 Algorithm Constants
 */
const SM2_CONFIG = {
    MIN_EASE_FACTOR: 1.3,
    DEFAULT_EASE_FACTOR: 2.5,
    EASY_BONUS: 1.3,
    INTERVAL_MODIFIER: 1.0
};

/**
 * Calculate next review date based on SM-2 algorithm
 * @param {number} quality - Rating from 0-5 (0=Again, 1-2=Hard, 3=Good, 4-5=Easy)
 * @param {number} repetition - Current repetition count
 * @param {number} easeFactor - Current ease factor
 * @param {number} interval - Current interval in days
 * @returns {Object} { interval, easeFactor, repetition, dueDate }
 */
export function calculateSM2(quality, repetition, easeFactor, interval) {
    let newInterval;
    let newEaseFactor = easeFactor;
    let newRepetition = repetition;

    // Quality mapping: 0=Again, 1=Hard, 2=Good, 3=Easy
    // SM-2 uses 0-5, we map: 0→0, 1→2, 2→4, 3→5
    const sm2Quality = quality === 0 ? 0 : quality === 1 ? 2 : quality === 2 ? 4 : 5;

    if (sm2Quality < 3) {
        // Failed - reset repetition
        newRepetition = 0;
        newInterval = 1; // Review tomorrow
    } else {
        // Passed
        if (newRepetition === 0) {
            newInterval = 1;
        } else if (newRepetition === 1) {
            newInterval = 6;
        } else {
            newInterval = Math.round(interval * newEaseFactor * SM2_CONFIG.INTERVAL_MODIFIER);
        }
        newRepetition++;
    }

    // Update ease factor
    newEaseFactor = easeFactor + (0.1 - (5 - sm2Quality) * (0.08 + (5 - sm2Quality) * 0.02));
    newEaseFactor = Math.max(SM2_CONFIG.MIN_EASE_FACTOR, newEaseFactor);

    // Apply easy bonus
    if (quality === 3) {
        newInterval = Math.round(newInterval * SM2_CONFIG.EASY_BONUS);
    }

    // Calculate due date
    const dueDate = new Date();
    dueDate.setDate(dueDate.getDate() + newInterval);

    return {
        interval: newInterval,
        easeFactor: newEaseFactor,
        repetition: newRepetition,
        dueDate: dueDate.toISOString()
    };
}

/**
 * Rate a flashcard and update its SRS data
 * @param {string} id - Flashcard ID
 * @param {number} quality - Rating: 0=Again, 1=Hard, 2=Good, 3=Easy
 */
export async function rateFlashcard(id, quality) {
    const db = await openDatabase();
    const flashcard = await db.get('flashcards', id);
    if (!flashcard) throw new Error('Flashcard not found');

    const currentEase = flashcard.easeFactor || SM2_CONFIG.DEFAULT_EASE_FACTOR;
    const currentInterval = flashcard.interval || 0;
    const currentRep = flashcard.repetition || 0;

    const { interval, easeFactor, repetition, dueDate } = calculateSM2(
        quality, currentRep, currentEase, currentInterval
    );

    const updated = {
        ...flashcard,
        interval,
        easeFactor,
        repetition,
        dueDate,
        lastReviewed: new Date().toISOString(),
        reviewCount: (flashcard.reviewCount || 0) + 1
    };

    await db.put('flashcards', updated, id);
    
    // Record study session
    await recordStudySession({
        flashcardId: id,
        quality,
        interval,
        timestamp: new Date().toISOString()
    });

    return updated;
}

/**
 * Get flashcards due for review today
 */
export async function getDueFlashcards() {
    const allFlashcards = await listFlashcards();
    const now = new Date();
    now.setHours(23, 59, 59, 999); // End of today

    return allFlashcards.filter(card => {
        if (!card.dueDate) return true; // New cards are always due
        return new Date(card.dueDate) <= now;
    });
}

/**
 * Get flashcards due for review, optionally filtered
 */
export async function getDueFlashcardsBySubject(subjectId) {
    const dueCards = await getDueFlashcards();
    if (!subjectId) return dueCards;
    return dueCards.filter(card => card.subjectId === subjectId);
}

/**
 * Get count of cards due today
 */
export async function getDueCount() {
    const dueCards = await getDueFlashcards();
    return dueCards.length;
}

/**
 * Get mastered flashcards (interval > 21 days)
 */
export async function getMasteredFlashcards() {
    const allFlashcards = await listFlashcards();
    return allFlashcards.filter(card => (card.interval || 0) >= 21);
}

// ============================================
// STUDY STATISTICS & TRACKING
// ============================================

/**
 * Record a study session
 */
export async function recordStudySession(sessionData) {
    const db = await openDatabase();
    const session = {
        id: uid('study_'),
        ...sessionData,
        date: new Date().toISOString().split('T')[0], // YYYY-MM-DD
        timestamp: new Date().toISOString()
    };
    
    try {
        await db.put('sessions', session, session.id);
    } catch (e) {
        // Store might not exist in older DB versions, create it in localStorage instead
        const sessions = JSON.parse(localStorage.getItem('studySessions') || '[]');
        sessions.push(session);
        localStorage.setItem('studySessions', JSON.stringify(sessions));
    }
    
    return session;
}

/**
 * Get study activity for the last N days
 */
export async function getStudyActivity(days = 7) {
    const sessions = JSON.parse(localStorage.getItem('studySessions') || '[]');
    const activity = {};
    
    // Initialize last N days
    for (let i = days - 1; i >= 0; i--) {
        const date = new Date();
        date.setDate(date.getDate() - i);
        const dateStr = date.toISOString().split('T')[0];
        activity[dateStr] = { reviewed: 0, correct: 0, incorrect: 0 };
    }
    
    // Count sessions
    sessions.forEach(session => {
        if (activity[session.date]) {
            activity[session.date].reviewed++;
            if (session.quality >= 2) {
                activity[session.date].correct++;
            } else {
                activity[session.date].incorrect++;
            }
        }
    });
    
    return activity;
}

/**
 * Get current streak (consecutive days with study activity)
 */
export async function getStudyStreak() {
    const sessions = JSON.parse(localStorage.getItem('studySessions') || '[]');
    if (sessions.length === 0) return 0;
    
    // Get unique dates
    const dates = [...new Set(sessions.map(s => s.date))].sort().reverse();
    
    // Check if studied today
    const today = new Date().toISOString().split('T')[0];
    const yesterday = new Date(Date.now() - 86400000).toISOString().split('T')[0];
    
    if (dates[0] !== today && dates[0] !== yesterday) {
        return 0; // Streak broken
    }
    
    let streak = 0;
    let currentDate = new Date(dates[0]);
    
    for (const dateStr of dates) {
        const date = new Date(dateStr);
        const expectedDate = new Date(currentDate);
        expectedDate.setDate(expectedDate.getDate() - streak);
        
        if (dateStr === expectedDate.toISOString().split('T')[0]) {
            streak++;
        } else {
            break;
        }
    }
    
    return streak;
}

/**
 * Get overall study statistics
 */
export async function getStudyStatistics() {
    const sessions = JSON.parse(localStorage.getItem('studySessions') || '[]');
    const allFlashcards = await listFlashcards();
    const masteredCards = await getMasteredFlashcards();
    const dueCards = await getDueFlashcards();
    const streak = await getStudyStreak();
    
    // Calculate accuracy
    const recentSessions = sessions.slice(-100); // Last 100 reviews
    const correctCount = recentSessions.filter(s => s.quality >= 2).length;
    const accuracy = recentSessions.length > 0 
        ? Math.round((correctCount / recentSessions.length) * 100) 
        : 0;
    
    return {
        totalFlashcards: allFlashcards.length,
        masteredCount: masteredCards.length,
        dueCount: dueCards.length,
        streak,
        accuracy,
        totalReviews: sessions.length
    };
}

/**
 * Format interval for display
 */
export function formatInterval(days) {
    if (days === 0) return 'Teraz';
    if (days === 1) return '1 dzień';
    if (days < 7) return `${days} dni`;
    if (days < 30) return `${Math.round(days / 7)} tyg.`;
    if (days < 365) return `${Math.round(days / 30)} mies.`;
    return `${Math.round(days / 365)} lat`;
}

/**
 * Preview next intervals for a flashcard
 */
export function previewNextIntervals(flashcard) {
    const currentEase = flashcard.easeFactor || SM2_CONFIG.DEFAULT_EASE_FACTOR;
    const currentInterval = flashcard.interval || 0;
    const currentRep = flashcard.repetition || 0;
    
    return {
        again: calculateSM2(0, currentRep, currentEase, currentInterval),
        hard: calculateSM2(1, currentRep, currentEase, currentInterval),
        good: calculateSM2(2, currentRep, currentEase, currentInterval),
        easy: calculateSM2(3, currentRep, currentEase, currentInterval)
    };
}

// ============================================
// EXAM/KOLOKWIUM Operations
// ============================================

/**
 * Create a new exam/kolokwium
 * @param {string} subjectId - Subject ID
 * @param {string} name - Exam name
 * @param {string[]} lectureIds - Array of lecture IDs included in this exam
 * @param {string} requirements - Exam requirements/topics (optional)
 */
export async function createExam(subjectId, name, lectureIds, requirements = '') {
    const db = await openDatabase();
    const exam = {
        id: uid('exam_'),
        subjectId,
        name,
        lectureIds: lectureIds || [],
        requirements,
        materials: {
            summary: null,
            flashcards: null,
            quiz: null,
            cheatsheet: null
        },
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString()
    };
    await db.put('exams', exam, exam.id);
    return exam;
}

/**
 * Get exam by ID
 */
export async function getExam(id) {
    const db = await openDatabase();
    return await db.get('exams', id);
}

/**
 * List all exams
 */
export async function listExams() {
    const db = await openDatabase();
    const tx = db.transaction('exams');
    const store = tx.objectStore('exams');
    const exams = [];
    let cursor = await store.openCursor();
    while (cursor) {
        exams.push(cursor.value);
        cursor = await cursor.continue();
    }
    return exams.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
}

/**
 * List exams by subject
 */
export async function listExamsBySubject(subjectId) {
    const db = await openDatabase();
    const index = db.transaction('exams').store.index('bySubject');
    const exams = [];
    let cursor = await index.openCursor(IDBKeyRange.only(subjectId));
    while (cursor) {
        exams.push(cursor.value);
        cursor = await cursor.continue();
    }
    return exams.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
}

/**
 * Update exam
 */
export async function updateExam(id, updates) {
    const db = await openDatabase();
    const exam = await db.get('exams', id);
    if (!exam) throw new Error('Exam not found');
    
    const updated = {
        ...exam,
        ...updates,
        updatedAt: new Date().toISOString()
    };
    await db.put('exams', updated, id);
    return updated;
}

/**
 * Update exam materials (summary, flashcards, quiz, cheatsheet)
 */
export async function updateExamMaterials(id, materialType, content) {
    const db = await openDatabase();
    const exam = await db.get('exams', id);
    if (!exam) throw new Error('Exam not found');
    
    exam.materials = exam.materials || {};
    exam.materials[materialType] = content;
    exam.updatedAt = new Date().toISOString();
    
    await db.put('exams', exam, id);
    return exam;
}

/**
 * Delete exam
 */
export async function deleteExam(id) {
    const db = await openDatabase();
    await db.delete('exams', id);
}
