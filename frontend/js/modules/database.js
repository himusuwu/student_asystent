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
