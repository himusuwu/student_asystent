// Student Assistant - Main Application
// Version 2.0 - Modular Architecture

import * as db from './modules/database.js';
import * as settings from './modules/settings.js';
import * as transcription from './modules/transcription.js';
import * as ai from './modules/ai.js';
import * as documentProcessor from './modules/document-processor.js';
import { generateLectureTitle } from './modules/ai.js';

// ============================================
// GLOBAL STATE
// ============================================

let currentTab = 'dashboard';
let currentAudioFile = null;
let currentDocumentFile = null;
let currentContentSource = 'audio'; // 'audio' or 'document'
let quizState = {
    selectedAnswers: new Map(),
    isChecked: false
};

// ============================================
// MODAL HELPERS
// ============================================

function openModal(modalId) {
    const modal = document.getElementById(modalId);
    if (modal) {
        modal.classList.add('active');
        modal.style.display = 'flex';
        // Focus first input
        const firstInput = modal.querySelector('input[type="text"], textarea');
        if (firstInput) setTimeout(() => firstInput.focus(), 100);
    }
}

window.closeModal = function(modalId) {
    const modal = document.getElementById(modalId);
    if (modal) {
        modal.classList.remove('active');
        modal.style.display = 'none';
        // Reset form
        const form = modal.querySelector('form');
        if (form) form.reset();
    }
};

// Close modal on outside click
window.addEventListener('click', (e) => {
    if (e.target.classList.contains('modal')) {
        e.target.classList.remove('active');
        e.target.style.display = 'none';
    }
});

// ============================================
// INITIALIZATION
// ============================================

document.addEventListener('DOMContentLoaded', async () => {
    console.log('🚀 ========================================');
    console.log('🚀 Student Assistant starting...');
    console.log('🚀 Browser:', navigator.userAgent);
    console.log('🚀 ========================================');
    
    // Initialize database
    await db.openDatabase();
    console.log('✅ Database initialized');
    
    // Load settings
    const appSettings = settings.getSettings();
    console.log('✅ Settings loaded');
    
    // Set username
    document.getElementById('username').textContent = appSettings.username || 'Student';
    
    // Setup navigation
    setupNavigation();
    console.log('✅ Navigation setup complete');
    
    // Setup event listeners
    console.log('🔧 Setting up event listeners...');
    setupEventListeners();
    console.log('✅ Event listeners setup complete');
    
    // Setup lecture view
    setupLectureViewListeners();
    console.log('✅ Lecture view listeners setup complete');
    
    // Setup modal forms
    setupModalForms();
    console.log('✅ Modal forms setup complete');
    
    // Load initial data
    await loadDashboard();
    await loadSubjects();
    await loadLectures();
    await loadFlashcards();
    await loadSchedule();
    await loadSettings();
    
    console.log('🚀 ========================================');
    console.log('✅ Application ready!');
    console.log('🚀 ========================================');
});

// ============================================
// NAVIGATION
// ============================================

function setupNavigation() {
    const navButtons = document.querySelectorAll('.nav-btn');
    const contents = document.querySelectorAll('.content');
    
    navButtons.forEach(btn => {
        btn.addEventListener('click', () => {
            const tab = btn.dataset.tab;
            switchTab(tab);
        });
    });
}

// Helper function to switch tabs programmatically
function switchTab(tabName) {
    const navButtons = document.querySelectorAll('.nav-btn');
    const contents = document.querySelectorAll('.content');
    
    // Update active nav button
    navButtons.forEach(b => {
        if (b.dataset.tab === tabName) {
            b.classList.add('active');
        } else {
            b.classList.remove('active');
        }
    });
    
    // Update active content
    contents.forEach(c => {
        if (c.id === tabName) {
            c.classList.add('active');
        } else {
            c.classList.remove('active');
        }
    });
    
    currentTab = tabName;
    
    // Refresh data if needed
    if (tabName === 'dashboard') loadDashboard();
    if (tabName === 'subjects') loadSubjects();
    if (tabName === 'lectures') loadLectures();
    if (tabName === 'flashcards') loadFlashcards();
    if (tabName === 'schedule') loadSchedule();
}

// ============================================
// EVENT LISTENERS
// ============================================

function setupEventListeners() {
    // Subjects
    document.getElementById('btn-add-subject').addEventListener('click', addSubject);
    document.getElementById('subject-search').addEventListener('input', filterSubjects);
    
    // Lectures
    document.getElementById('btn-add-lecture').addEventListener('click', () => {
        // Navigate to new lecture tab
        document.querySelector('[data-tab="new-lecture"]').click();
    });
    document.getElementById('lecture-search').addEventListener('input', filterLectures);
    
    // New Lecture Form
    document.getElementById('new-lecture-form').addEventListener('submit', handleNewLectureSubmit);
    document.getElementById('btn-cancel-lecture').addEventListener('click', () => {
        document.getElementById('new-lecture-form').reset();
        document.querySelector('[data-tab="lectures"]').click();
    });
    
    // Recording
    document.getElementById('btn-start-recording').addEventListener('click', handleStartRecording);
    document.getElementById('btn-stop-recording').addEventListener('click', handleStopRecording);
    document.getElementById('btn-upload-audio').addEventListener('click', () => {
        document.getElementById('audio-file-input').click();
    });
    document.getElementById('audio-file-input').addEventListener('change', handleAudioFileUpload);
    
    // Document upload (PDF/PPT) - Firefox-compatible with <label> approach
    console.log('🔍 Starting document upload setup...');
    console.log('🔍 Browser:', navigator.userAgent);
    
    const pdfFileInput = document.getElementById('pdf-file-input');
    const pptFileInput = document.getElementById('ppt-file-input');
    const documentFileInput = document.getElementById('document-file-input');
    const pdfLabel = document.getElementById('btn-upload-pdf-label');
    const pptLabel = document.getElementById('btn-upload-ppt-label');
    
    console.log('🔍 Elements found:');
    console.log('  - pdf-file-input:', pdfFileInput ? '✅' : '❌');
    console.log('  - ppt-file-input:', pptFileInput ? '✅' : '❌');
    console.log('  - document-file-input:', documentFileInput ? '✅' : '❌');
    console.log('  - btn-upload-pdf-label:', pdfLabel ? '✅' : '❌');
    console.log('  - btn-upload-ppt-label:', pptLabel ? '✅' : '❌');
    
    // New label-based approach (Firefox-compatible)
    if (pdfFileInput) {
        pdfFileInput.addEventListener('change', (e) => {
            console.log('📕 PDF file selected via label (Firefox-compatible)');
            console.log('📕 Event:', e);
            console.log('📕 Files:', e.target.files);
            if (e.target.files && e.target.files.length > 0) {
                console.log('📕 File name:', e.target.files[0].name);
                console.log('📕 File type:', e.target.files[0].type);
                console.log('📕 File size:', e.target.files[0].size);
            }
            handleDocumentFileUpload(e);
        });
        console.log('✅ PDF file input listener added (label-based)');
    } else {
        console.error('❌ pdf-file-input element NOT FOUND!');
    }
    
    if (pptFileInput) {
        pptFileInput.addEventListener('change', (e) => {
            console.log('📊 PPT file selected via label (Firefox-compatible)');
            console.log('📊 Event:', e);
            console.log('📊 Files:', e.target.files);
            if (e.target.files && e.target.files.length > 0) {
                console.log('📊 File name:', e.target.files[0].name);
                console.log('📊 File type:', e.target.files[0].type);
                console.log('📊 File size:', e.target.files[0].size);
            }
            handleDocumentFileUpload(e);
        });
        console.log('✅ PPT file input listener added (label-based)');
    } else {
        console.error('❌ ppt-file-input element NOT FOUND!');
    }
    
    // Add click logging for labels
    if (pdfLabel) {
        pdfLabel.addEventListener('click', (e) => {
            console.log('🖱️ PDF LABEL CLICKED!');
            console.log('🖱️ Event:', e);
            console.log('🖱️ Target:', e.target);
            console.log('🖱️ Current target:', e.currentTarget);
        });
        console.log('✅ PDF label click logger added');
    } else {
        console.warn('⚠️ PDF label not found for click logging');
    }
    
    if (pptLabel) {
        pptLabel.addEventListener('click', (e) => {
            console.log('🖱️ PPT LABEL CLICKED!');
            console.log('🖱️ Event:', e);
            console.log('🖱️ Target:', e.target);
            console.log('🖱️ Current target:', e.currentTarget);
        });
        console.log('✅ PPT label click logger added');
    } else {
        console.warn('⚠️ PPT label not found for click logging');
    }
    
    // Legacy button approach (kept for compatibility)
    const btnUploadPdf = document.getElementById('btn-upload-pdf');
    const btnUploadPpt = document.getElementById('btn-upload-ppt');
    
    if (btnUploadPdf) {
        btnUploadPdf.addEventListener('click', (e) => {
            console.log('📕 PDF upload button clicked (legacy mode)');
            e.preventDefault();
            e.stopPropagation();
            
            // Visual feedback
            btnUploadPdf.style.transform = 'scale(0.95)';
            setTimeout(() => {
                btnUploadPdf.style.transform = 'scale(1)';
            }, 100);
            
            const input = document.getElementById('document-file-input');
            if (input) {
                input.accept = '.pdf';
                
                // Firefox fix: dispatch native click event instead of calling click()
                try {
                    // Try modern approach first
                    input.dispatchEvent(new MouseEvent('click', {
                        bubbles: true,
                        cancelable: true,
                        view: window
                    }));
                    console.log('✅ File input clicked for PDF (MouseEvent)');
                } catch (err) {
                    // Fallback to direct click for older browsers
                    console.log('⚠️ MouseEvent failed, using direct click()');
                    input.click();
                }
            } else {
                console.error('❌ Document file input not found');
                alert('Błąd: Nie znaleziono pola wyboru pliku');
            }
        }, true); // Use capture phase for Firefox
        console.log('✅ PDF upload button listener added (legacy)');
    }
    
    if (btnUploadPpt) {
        btnUploadPpt.addEventListener('click', (e) => {
            console.log('📊 PPT upload button clicked (legacy mode)');
            e.preventDefault();
            e.stopPropagation();
            
            // Visual feedback
            btnUploadPpt.style.transform = 'scale(0.95)';
            setTimeout(() => {
                btnUploadPpt.style.transform = 'scale(1)';
            }, 100);
            
            const input = document.getElementById('document-file-input');
            if (input) {
                input.accept = '.ppt,.pptx';
                
                // Firefox fix: dispatch native click event instead of calling click()
                try {
                    // Try modern approach first
                    input.dispatchEvent(new MouseEvent('click', {
                        bubbles: true,
                        cancelable: true,
                        view: window
                    }));
                    console.log('✅ File input clicked for PPT (MouseEvent)');
                } catch (err) {
                    // Fallback to direct click for older browsers
                    console.log('⚠️ MouseEvent failed, using direct click()');
                    input.click();
                }
            } else {
                console.error('❌ Document file input not found');
                alert('Błąd: Nie znaleziono pola wyboru pliku');
            }
        }, true); // Use capture phase for Firefox
        console.log('✅ PPT upload button listener added (legacy)');
    }
    
    if (documentFileInput) {
        documentFileInput.addEventListener('change', handleDocumentFileUpload);
        console.log('✅ Document file input listener added (legacy)');
    }
    
    // Source selector (audio vs document) - with safety check
    const sourceSelectors = document.querySelectorAll('.source-selector');
    console.log(`Found ${sourceSelectors.length} source selector buttons`);
    if (sourceSelectors.length > 0) {
        sourceSelectors.forEach((btn, index) => {
            const source = btn.dataset.source;
            console.log(`Setting up source selector ${index}: ${source}`);
            btn.addEventListener('click', () => {
                console.log(`Source selector clicked: ${source}`);
                switchContentSource(source);
            });
        });
        console.log('✅ Source selector listeners added');
    } else {
        console.error('❌ No source selector buttons found!');
    }
    
    // Flashcards
    document.getElementById('btn-add-flashcard').addEventListener('click', addFlashcard);
    document.getElementById('flashcard-search').addEventListener('input', filterFlashcards);
    document.getElementById('btn-collapse-all').addEventListener('click', collapseAllFlashcards);
    document.getElementById('btn-expand-all').addEventListener('click', expandAllFlashcards);
    
    // Schedule
    const btnAddSchedule = document.getElementById('btn-add-schedule');
    if (btnAddSchedule) {
        btnAddSchedule.addEventListener('click', addScheduleEvent);
        console.log('✅ Schedule button listener added');
    } else {
        console.error('❌ btn-add-schedule not found!');
    }
    
    // Settings
    document.getElementById('btn-save-settings').addEventListener('click', saveSettings);
    
    // Clear data buttons
    document.getElementById('btn-clear-lectures').addEventListener('click', clearAllLectures);
    document.getElementById('btn-clear-flashcards').addEventListener('click', clearAllFlashcards);
    document.getElementById('btn-clear-schedule').addEventListener('click', clearAllSchedule);
    document.getElementById('btn-clear-subjects').addEventListener('click', clearAllSubjects);
    document.getElementById('btn-clear-all-data').addEventListener('click', clearAllData);
}

// ============================================
// DASHBOARD
// ============================================

async function loadDashboard() {
    const subjects = await db.listSubjects();
    const lectures = await db.listLectures();
    const flashcards = await db.listFlashcards();
    
    // Update stats
    document.getElementById('stat-subjects').textContent = subjects.length;
    document.getElementById('stat-flashcards').textContent = flashcards.length;
    
    // TODO: Calculate accuracy and streak
    document.getElementById('stat-accuracy').textContent = '0%';
    document.getElementById('stat-streak').textContent = '0';
    
    // Show recent activity
    const recentLectures = lectures.slice(0, 3);
    const activityHTML = recentLectures.map(lecture => {
        const subject = subjects.find(s => s.id === lecture.subjectId);
        return `
            <div class="card">
                <div class="card-header">
                    <div class="card-title">${lecture.title}</div>
                    <span class="badge badge-primary">Wykład</span>
                </div>
                <div class="card-meta">${subject?.name || 'Brak przedmiotu'}</div>
                <div class="card-meta">${new Date(lecture.createdAt).toLocaleString('pl-PL')}</div>
                <div class="progress-bar">
                    <div class="progress-fill" style="width: 100%"></div>
                </div>
            </div>
        `;
    }).join('');
    
    document.getElementById('recent-activity').innerHTML = activityHTML || '<p style="text-align: center; color: var(--text-secondary);">Brak ostatniej aktywności</p>';
}

// ============================================
// SUBJECTS
// ============================================

async function loadSubjects() {
    const subjects = await db.listSubjects();
    
    // Populate subject selector in new lecture form
    const selector = document.getElementById('lecture-subject');
    selector.innerHTML = '<option value="">Wybierz przedmiot...</option>' + 
        subjects.map(s => `<option value="${s.id}">${s.name}</option>`).join('');
    
    // Display subjects grid
    const grid = document.getElementById('subjects-grid');
    
    if (subjects.length === 0) {
        grid.innerHTML = '<p style="text-align: center; color: var(--text-secondary);">Brak przedmiotów. Dodaj pierwszy!</p>';
        return;
    }
    
    grid.innerHTML = subjects.map(subject => `
        <div class="card" data-subject-id="${subject.id}">
            <div class="card-header">
                <div class="card-title">${subject.name}</div>
                <button class="btn" style="background: var(--accent); color: white; padding: 8px 16px;" 
                        onclick="window.deleteSubject('${subject.id}')">
                    🗑️
                </button>
            </div>
            <div class="card-meta">Utworzono: ${new Date(subject.createdAt).toLocaleDateString('pl-PL')}</div>
            <div style="margin-top: 10px; padding: 8px; background: ${subject.color}22; border-radius: 8px; text-align: center;">
                <span style="color: ${subject.color};">● ${subject.color}</span>
            </div>
        </div>
    `).join('');
}

async function addSubject() {
    openModal('modal-add-subject');
}

window.deleteSubject = async (id) => {
    if (!confirm('Czy na pewno chcesz usunąć ten przedmiot?')) return;
    
    await db.deleteSubject(id);
    await loadSubjects();
    await loadDashboard();
};

function filterSubjects() {
    const query = document.getElementById('subject-search').value.toLowerCase();
    const cards = document.querySelectorAll('#subjects-grid .card');
    
    cards.forEach(card => {
        const title = card.querySelector('.card-title').textContent.toLowerCase();
        card.style.display = title.includes(query) ? '' : 'none';
    });
}

// ============================================
// LECTURES
// ============================================

async function loadLectures() {
    const lectures = await db.listLectures();
    const subjects = await db.listSubjects();
    
    const list = document.getElementById('lectures-list');
    
    if (lectures.length === 0) {
        list.innerHTML = '<p style="text-align: center; color: var(--text-secondary);">Brak wykładów. Dodaj pierwszy!</p>';
        return;
    }
    
    // Grupuj wykłady według przedmiotów
    const lecturesBySubject = {};
    const lecturesWithoutSubject = [];
    
    lectures.forEach(lecture => {
        if (lecture.subjectId) {
            if (!lecturesBySubject[lecture.subjectId]) {
                lecturesBySubject[lecture.subjectId] = [];
            }
            lecturesBySubject[lecture.subjectId].push(lecture);
        } else {
            lecturesWithoutSubject.push(lecture);
        }
    });
    
    // Generuj HTML z podziałem na przedmioty
    let html = '';
    
    // Wykłady z przypisanym przedmiotem
    subjects.forEach(subject => {
        const subjectLectures = lecturesBySubject[subject.id];
        if (subjectLectures && subjectLectures.length > 0) {
            html += `
                <div style="margin-bottom: 30px;">
                    <div style="display: flex; align-items: center; gap: 12px; margin-bottom: 15px; padding-bottom: 10px; border-bottom: 2px solid ${subject.color}22;">
                        <div style="width: 40px; height: 40px; border-radius: 12px; background: ${subject.color}; display: flex; align-items: center; justify-content: center; font-size: 20px;">
                            📚
                        </div>
                        <div>
                            <h3 style="font-size: 20px; font-weight: 700; margin: 0; color: ${subject.color};">
                                ${subject.name}
                            </h3>
                            <p style="font-size: 13px; color: var(--text-secondary); margin: 2px 0 0 0;">
                                ${subjectLectures.length} ${subjectLectures.length === 1 ? 'wykład' : 'wykładów'}
                            </p>
                        </div>
                    </div>
                    <div style="display: flex; flex-direction: column; gap: 10px;">
                        ${subjectLectures.map(lecture => `
                            <div class="lecture-item" data-lecture-id="${lecture.id}">
                                <div class="lecture-icon" style="background: ${subject.color}22; color: ${subject.color};">📖</div>
                                <div class="lecture-info">
                                    <div class="lecture-title">${lecture.title}</div>
                                    <div class="lecture-date">${new Date(lecture.createdAt).toLocaleString('pl-PL')}</div>
                                </div>
                                <button class="btn btn-primary btn-open-lecture" data-lecture-id="${lecture.id}" style="padding: 8px 16px; background: ${subject.color};">
                                    Otwórz
                                </button>
                            </div>
                        `).join('')}
                    </div>
                </div>
            `;
        }
    });
    
    // Wykłady bez przedmiotu
    if (lecturesWithoutSubject.length > 0) {
        html += `
            <div style="margin-bottom: 30px;">
                <div style="display: flex; align-items: center; gap: 12px; margin-bottom: 15px; padding-bottom: 10px; border-bottom: 2px solid var(--text-secondary)22;">
                    <div style="width: 40px; height: 40px; border-radius: 12px; background: var(--bg-card); display: flex; align-items: center; justify-content: center; font-size: 20px;">
                        📝
                    </div>
                    <div>
                        <h3 style="font-size: 20px; font-weight: 700; margin: 0; color: var(--text-secondary);">
                            Bez przypisania
                        </h3>
                        <p style="font-size: 13px; color: var(--text-secondary); margin: 2px 0 0 0;">
                            ${lecturesWithoutSubject.length} ${lecturesWithoutSubject.length === 1 ? 'wykład' : 'wykładów'}
                        </p>
                    </div>
                </div>
                <div style="display: flex; flex-direction: column; gap: 10px;">
                    ${lecturesWithoutSubject.map(lecture => `
                        <div class="lecture-item" data-lecture-id="${lecture.id}">
                            <div class="lecture-icon">📖</div>
                            <div class="lecture-info">
                                <div class="lecture-title">${lecture.title}</div>
                                <div class="lecture-date">${new Date(lecture.createdAt).toLocaleString('pl-PL')}</div>
                            </div>
                            <button class="btn btn-primary btn-open-lecture" data-lecture-id="${lecture.id}" style="padding: 8px 16px;">
                                Otwórz
                            </button>
                        </div>
                    `).join('')}
                </div>
            </div>
        `;
    }
    
    list.innerHTML = html;
    
    // Add event listeners to open buttons
    document.querySelectorAll('.btn-open-lecture').forEach(btn => {
        btn.addEventListener('click', (e) => {
            e.stopPropagation();
            const lectureId = btn.dataset.lectureId;
            console.log('Opening lecture:', lectureId);
            openLectureView(lectureId);
        });
    });
}

function filterLectures() {
    const query = document.getElementById('lecture-search').value.toLowerCase();
    const items = document.querySelectorAll('.lecture-item');
    
    items.forEach(item => {
        const title = item.querySelector('.lecture-title').textContent.toLowerCase();
        item.style.display = title.includes(query) ? '' : 'none';
    });
}

// ============================================
// NEW LECTURE
// ============================================

async function handleNewLectureSubmit(e) {
    e.preventDefault();
    
    const subjectId = document.getElementById('lecture-subject').value;
    const titleInput = document.getElementById('lecture-title');
    const transcriptionText = document.getElementById('lecture-transcription').value;
    const notes = document.getElementById('lecture-notes').value;
    
    if (!subjectId) {
        alert('❌ Wybierz przedmiot!');
        return;
    }
    
    // Generate title if not exists - ASYNC AI GENERATION
    let title = titleInput.value;
    if (!title || title.trim() === '') {
        if (transcriptionText) {
            console.log('🤖 Generuję tytuł przez AI z transkrypcji...');
            title = await generateLectureTitle(transcriptionText);
        } else if (notes) {
            console.log('🤖 Generuję tytuł przez AI z notatek...');
            title = await generateLectureTitle(notes);
        } else {
            title = `Wykład ${new Date().toLocaleDateString('pl-PL')}`;
        }
    }
    
    try {
        // Create lecture
        const lecture = await db.createLecture(subjectId, title);
        
        // Save transcription if exists
        if (transcriptionText) {
            await db.updateLecture(lecture.id, {
                transcription: transcriptionText
            });
        }
        
        // Save notes if exists
        if (notes) {
            await db.updateLecture(lecture.id, {
                notes: notes
            });
        }
        
        showToast('✅ Wykład zapisany!');
        
        // Reset form
        document.getElementById('new-lecture-form').reset();
        document.getElementById('lecture-title-section').style.display = 'none';
        document.getElementById('transcription-section').style.display = 'none';
        currentAudioFile = null;
        
        // Refresh lectures
        await loadLectures();
        await loadDashboard();
        
        // Navigate to lectures
        document.querySelector('[data-tab="lectures"]').click();
        
    } catch (error) {
        console.error('Error saving lecture:', error);
        alert('❌ Błąd podczas zapisywania wykładu');
    }
}

// ============================================
// RECORDING
// ============================================

async function handleStartRecording() {
    try {
        await transcription.startRecording();
        
        // Update UI
        document.getElementById('btn-start-recording').style.display = 'none';
        document.getElementById('recording-status').style.display = 'flex';
        
    } catch (error) {
        console.error('Recording error:', error);
        alert('❌ Nie udało się rozpocząć nagrywania. Sprawdź uprawnienia mikrofonu.');
    }
}

async function handleStopRecording() {
    try {
        const audioFile = await transcription.stopRecording();
        
        // Update UI
        document.getElementById('btn-start-recording').style.display = '';
        document.getElementById('recording-status').style.display = 'none';
        
        // Store audio file
        currentAudioFile = audioFile;
        
        // Ask if user wants to transcribe
        if (confirm('Nagranie zakończone! Czy chcesz transkrybować audio?')) {
            await handleTranscription(audioFile);
        }
        
    } catch (error) {
        console.error('Stop recording error:', error);
        alert('❌ Błąd podczas zatrzymywania nagrywania');
    }
}

async function handleAudioFileUpload(e) {
    const file = e.target.files[0];
    if (!file) return;
    
    currentAudioFile = file;
    
    if (confirm('Plik załadowany! Czy chcesz transkrybować audio?')) {
        await handleTranscription(file);
    }
}

async function handleTranscription(audioFile) {
    const section = document.getElementById('transcription-section');
    const progress = document.getElementById('transcription-progress');
    const progressBar = document.getElementById('transcription-progress-bar');
    const textarea = document.getElementById('lecture-transcription');
    const titleSection = document.getElementById('lecture-title-section');
    const titleInput = document.getElementById('lecture-title');
    
    try {
        // Show section
        section.style.display = 'block';
        progress.style.display = 'block';
        
        // Show loading message
        const loadingMsg = document.createElement('p');
        loadingMsg.id = 'transcription-loading-msg';
        loadingMsg.style.cssText = 'text-align: center; color: var(--primary); margin-top: 8px; font-weight: 600;';
        loadingMsg.innerHTML = '🔍 Sprawdzanie backendu...';
        progress.appendChild(loadingMsg);
        
        // Transcribe
        const text = await transcription.transcribeAudio(audioFile, (percent) => {
            progressBar.style.width = `${percent}%`;
            if (percent > 20) {
                loadingMsg.innerHTML = '📤 Wysyłanie audio do backendu...';
            }
            if (percent > 50) {
                loadingMsg.innerHTML = '🤖 AI transkrybuje audio...';
            }
        });
        
        // Remove loading message
        loadingMsg.remove();
        
        // Update textarea
        textarea.value = text;
        
        // Generate title from transcription - ASYNC AI GENERATION
        loadingMsg.innerHTML = '🤖 AI generuje tytuł...';
        loadingMsg.style.display = 'block';
        progress.appendChild(loadingMsg);
        
        const generatedTitle = await generateLectureTitle(text);
        titleInput.value = generatedTitle;
        titleSection.style.display = 'block';
        
        loadingMsg.remove();
        
        // Hide progress
        progress.style.display = 'none';
        
        showToast('✅ Transkrypcja i tytuł wygenerowane!');
        
    } catch (error) {
        console.error('Transcription error:', error);
        progress.style.display = 'none';
        
        // User-friendly error with instructions
        const errorLines = error.message.split('\n');
        const errorHtml = errorLines.join('<br>');
        
        // Create styled error dialog
        const errorDialog = document.createElement('div');
        errorDialog.style.cssText = `
            position: fixed;
            top: 50%;
            left: 50%;
            transform: translate(-50%, -50%);
            background: var(--bg-card);
            border: 2px solid var(--accent);
            border-radius: 16px;
            padding: 30px;
            max-width: 500px;
            z-index: 10000;
            box-shadow: 0 20px 60px rgba(0, 0, 0, 0.5);
        `;
        
        errorDialog.innerHTML = `
            <h3 style="color: var(--accent); margin-bottom: 20px; font-size: 22px;">
                ❌ Błąd transkrypcji
            </h3>
            <div style="margin-bottom: 20px; line-height: 1.8; white-space: pre-wrap;">
                ${errorHtml}
            </div>
            <button onclick="this.parentElement.remove()" 
                    class="btn btn-primary" style="width: 100%;">
                OK, rozumiem
            </button>
        `;
        
        document.body.appendChild(errorDialog);
    }
}

// ============================================
// DOCUMENT PROCESSING (PDF/PPT)
// ============================================

/**
 * Switch between audio and document content sources
 */
function switchContentSource(source) {
    console.log(`🔄 ========================================`);
    console.log(`🔄 Switching content source to: ${source}`);
    console.log(`🔄 ========================================`);
    currentContentSource = source;
    
    // Update button styles
    const selectors = document.querySelectorAll('.source-selector');
    console.log(`🔄 Found ${selectors.length} source selector buttons`);
    
    selectors.forEach((btn, index) => {
        console.log(`🔄 Button ${index}: dataset.source = ${btn.dataset.source}`);
        if (btn.dataset.source === source) {
            btn.classList.add('active');
            btn.style.background = 'linear-gradient(135deg, rgba(99, 102, 241, 0.2), rgba(168, 85, 247, 0.2))';
            btn.style.border = '2px solid var(--primary)';
            console.log(`🔄 Button ${index} is now ACTIVE`);
        } else {
            btn.classList.remove('active');
            btn.style.background = 'linear-gradient(135deg, rgba(99, 102, 241, 0.1), rgba(168, 85, 247, 0.1))';
            btn.style.border = '1px solid rgba(99, 102, 241, 0.3)';
            console.log(`🔄 Button ${index} is now INACTIVE`);
        }
    });
    
    // Show/hide appropriate section
    const audioSection = document.getElementById('audio-source-section');
    const documentSection = document.getElementById('document-source-section');
    
    console.log('🔍 Section elements:');
    console.log('  - audioSection:', audioSection ? '✅ Found' : '❌ NOT FOUND');
    console.log('  - documentSection:', documentSection ? '✅ Found' : '❌ NOT FOUND');
    
    if (audioSection) {
        console.log('  - audioSection current display:', audioSection.style.display);
    }
    if (documentSection) {
        console.log('  - documentSection current display:', documentSection.style.display);
    }
    
    if (source === 'audio') {
        if (audioSection) audioSection.style.display = 'block';
        if (documentSection) documentSection.style.display = 'none';
        console.log('✅ Showing audio section, hiding document section');
    } else {
        if (audioSection) audioSection.style.display = 'none';
        if (documentSection) documentSection.style.display = 'block';
        console.log('✅ Hiding audio section, SHOWING DOCUMENT SECTION');
        
        // Extra logging for document section
        if (documentSection) {
            console.log('📄 Document section details:');
            console.log('  - display after change:', documentSection.style.display);
            console.log('  - visibility:', documentSection.style.visibility);
            console.log('  - offsetHeight:', documentSection.offsetHeight);
            console.log('  - offsetWidth:', documentSection.offsetWidth);
            
            // Check if labels are visible and clickable
            const pdfLabel = document.getElementById('btn-upload-pdf-label');
            const pptLabel = document.getElementById('btn-upload-ppt-label');
            const pdfInput = document.getElementById('pdf-file-input');
            const pptInput = document.getElementById('ppt-file-input');
            
            console.log('📄 Label visibility:');
            console.log('  - PDF label:', pdfLabel ? 'exists' : 'NOT FOUND');
            console.log('  - PPT label:', pptLabel ? 'exists' : 'NOT FOUND');
            console.log('  - PDF input:', pdfInput ? 'exists' : 'NOT FOUND');
            console.log('  - PPT input:', pptInput ? 'exists' : 'NOT FOUND');
            
            if (pdfLabel) {
                const pdfStyles = window.getComputedStyle(pdfLabel);
                console.log('  - PDF label display:', pdfStyles.display);
                console.log('  - PDF label visibility:', pdfStyles.visibility);
                console.log('  - PDF label pointerEvents:', pdfStyles.pointerEvents);
                console.log('  - PDF label cursor:', pdfStyles.cursor);
                console.log('  - PDF label for attribute:', pdfLabel.getAttribute('for'));
                console.log('  - PDF label offsetHeight:', pdfLabel.offsetHeight);
                console.log('  - PDF label offsetWidth:', pdfLabel.offsetWidth);
            }
            if (pptLabel) {
                const pptStyles = window.getComputedStyle(pptLabel);
                console.log('  - PPT label display:', pptStyles.display);
                console.log('  - PPT label visibility:', pptStyles.visibility);
                console.log('  - PPT label pointerEvents:', pptStyles.pointerEvents);
                console.log('  - PPT label cursor:', pptStyles.cursor);
                console.log('  - PPT label for attribute:', pptLabel.getAttribute('for'));
                console.log('  - PPT label offsetHeight:', pptLabel.offsetHeight);
                console.log('  - PPT label offsetWidth:', pptLabel.offsetWidth);
            }
            
            // Test if labels are actually clickable
            if (pdfLabel) {
                console.log('🧪 Testing PDF label clickability...');
                const rect = pdfLabel.getBoundingClientRect();
                console.log('  - PDF label position:', {
                    top: rect.top,
                    left: rect.left,
                    width: rect.width,
                    height: rect.height
                });
            }
            if (pptLabel) {
                console.log('🧪 Testing PPT label clickability...');
                const rect = pptLabel.getBoundingClientRect();
                console.log('  - PPT label position:', {
                    top: rect.top,
                    left: rect.left,
                    width: rect.width,
                    height: rect.height
                });
            }
        }
    }
    
    // Update label
    const contentLabel = document.getElementById('content-label');
    if (contentLabel) {
        if (source === 'audio') {
            contentLabel.textContent = 'Transkrypcja';
        } else {
            contentLabel.textContent = 'Wyekstrahowana treść';
        }
        console.log('✅ Content label updated');
    }
    
    console.log(`🔄 ========================================`);
    console.log(`🔄 switchContentSource COMPLETE`);
    console.log(`🔄 ========================================`);
}

/**
 * Handle document file upload (PDF or PowerPoint)
 */
async function handleDocumentFileUpload(e) {
    const file = e.target.files[0];
    if (!file) return;
    
    // Validate file
    const validation = documentProcessor.validateDocumentFile(file);
    if (!validation.valid) {
        alert(`❌ ${validation.error}`);
        return;
    }
    
    currentDocumentFile = file;
    
    // Show document status
    const statusDiv = document.getElementById('document-status');
    const fileNameSpan = document.getElementById('document-file-name');
    
    let fileIcon = '📄';
    if (file.name.toLowerCase().endsWith('.pdf')) fileIcon = '📕';
    else if (file.name.toLowerCase().endsWith('.ppt') || file.name.toLowerCase().endsWith('.pptx')) fileIcon = '📊';
    
    fileNameSpan.textContent = `${fileIcon} ${file.name}`;
    statusDiv.style.display = 'block';
    
    // Ask if user wants to extract content
    if (confirm('Dokument załadowany! Czy chcesz wyekstrahować treść?')) {
        await handleDocumentExtraction(file);
    } else {
        statusDiv.style.display = 'none';
    }
}

/**
 * Extract content from document and display it
 */
async function handleDocumentExtraction(file) {
    const section = document.getElementById('transcription-section');
    const progress = document.getElementById('transcription-progress');
    const progressBar = document.getElementById('transcription-progress-bar');
    const progressText = document.getElementById('progress-text');
    const textarea = document.getElementById('lecture-transcription');
    const titleSection = document.getElementById('lecture-title-section');
    const titleInput = document.getElementById('lecture-title');
    const statusDiv = document.getElementById('document-status');
    
    try {
        // Show section
        section.style.display = 'block';
        progress.style.display = 'block';
        progressText.textContent = 'Przetwarzanie dokumentu...';
        
        // Get backend URL from settings
        const appSettings = settings.getSettings();
        const backendUrl = appSettings.backendUrl || 'http://localhost:3001';
        
        // Determine file type
        const isPdf = file.name.toLowerCase().endsWith('.pdf');
        const docType = isPdf ? 'PDF' : 'PowerPoint';
        
        // Extract text from document
        const result = await documentProcessor.processDocument(file, backendUrl, (percent) => {
            progressBar.style.width = `${percent}%`;
            progressText.textContent = `Przetwarzanie ${docType}... ${percent}%`;
        });
        
        // Format and display extracted text
        const formattedText = documentProcessor.formatExtractedText(result.text);
        textarea.value = formattedText;
        
        // Update progress text
        progressText.textContent = 'Generowanie tytułu z AI...';
        progressBar.style.width = '90%';
        
        // Generate title from extracted content
        const generatedTitle = await generateLectureTitle(formattedText);
        titleInput.value = generatedTitle;
        titleSection.style.display = 'block';
        
        // Hide progress
        progress.style.display = 'none';
        statusDiv.style.display = 'none';
        
        showToast('✅ Treść dokumentu wyekstrahowana i tytuł wygenerowany!');
        
    } catch (error) {
        console.error('Document extraction error:', error);
        progress.style.display = 'none';
        statusDiv.style.display = 'none';
        
        // Show error dialog
        const errorDialog = document.createElement('div');
        errorDialog.style.cssText = `
            position: fixed;
            top: 50%;
            left: 50%;
            transform: translate(-50%, -50%);
            background: var(--bg-card);
            border: 2px solid var(--accent);
            border-radius: 16px;
            padding: 30px;
            max-width: 500px;
            z-index: 10000;
            box-shadow: 0 20px 60px rgba(0, 0, 0, 0.5);
        `;
        
        errorDialog.innerHTML = `
            <h3 style="color: var(--accent); margin-bottom: 20px; font-size: 22px;">
                ❌ Błąd przetwarzania dokumentu
            </h3>
            <div style="margin-bottom: 20px; line-height: 1.8;">
                ${error.message}
            </div>
            <button onclick="this.parentElement.remove()" 
                    class="btn btn-primary" style="width: 100%;">
                OK, rozumiem
            </button>
        `;
        
        document.body.appendChild(errorDialog);
    }
}

// ============================================
// FLASHCARDS
// ============================================

async function loadFlashcards() {
    const flashcards = await db.listFlashcards();
    const subjects = await db.listSubjects();
    const lectures = await db.listLectures();
    
    const container = document.getElementById('flashcards-grid');
    
    if (flashcards.length === 0) {
        container.innerHTML = '<p style="text-align: center; color: var(--text-secondary);">Brak fiszek. Dodaj pierwszą!</p>';
        return;
    }
    
    // Grupuj fiszki według przedmiotów, a potem według wykładów
    const flashcardsBySubject = {};
    const flashcardsWithoutSubject = [];
    
    flashcards.forEach(card => {
        if (card.subjectId) {
            if (!flashcardsBySubject[card.subjectId]) {
                flashcardsBySubject[card.subjectId] = {};
            }
            
            if (card.lectureId) {
                if (!flashcardsBySubject[card.subjectId][card.lectureId]) {
                    flashcardsBySubject[card.subjectId][card.lectureId] = [];
                }
                flashcardsBySubject[card.subjectId][card.lectureId].push(card);
            } else {
                if (!flashcardsBySubject[card.subjectId]['no-lecture']) {
                    flashcardsBySubject[card.subjectId]['no-lecture'] = [];
                }
                flashcardsBySubject[card.subjectId]['no-lecture'].push(card);
            }
        } else {
            flashcardsWithoutSubject.push(card);
        }
    });
    
    // Generuj HTML z podziałem na przedmioty i wykłady
    let html = '';
    
    // Fiszki z przypisanym przedmiotem
    subjects.forEach(subject => {
        const subjectFlashcards = flashcardsBySubject[subject.id];
        if (subjectFlashcards && Object.keys(subjectFlashcards).length > 0) {
            const totalCards = Object.values(subjectFlashcards).flat().length;
            const subjectCollapseId = `subject-${subject.id}`;
            
            html += `
                <div style="margin-bottom: 40px;" class="flashcard-subject-section" data-subject-id="${subject.id}">
                    <div class="collapsible-header" onclick="toggleFlashcardSection('${subjectCollapseId}')" 
                         style="display: flex; align-items: center; gap: 12px; margin-bottom: 20px; padding: 12px; 
                                border-bottom: 2px solid ${subject.color}22; cursor: pointer; user-select: none;
                                border-radius: 12px; transition: background 0.2s ease;"
                         onmouseover="this.style.background='${subject.color}11'" 
                         onmouseout="this.style.background='transparent'">
                        <span class="collapse-icon" style="font-size: 16px; transition: transform 0.3s ease; display: inline-block;">▼</span>
                        <div style="width: 40px; height: 40px; border-radius: 12px; background: ${subject.color}; display: flex; align-items: center; justify-content: center; font-size: 20px;">
                            🎴
                        </div>
                        <div style="flex: 1;">
                            <h3 style="font-size: 20px; font-weight: 700; margin: 0; color: ${subject.color};">
                                ${subject.name}
                            </h3>
                            <p style="font-size: 13px; color: var(--text-secondary); margin: 2px 0 0 0;">
                                ${totalCards} ${totalCards === 1 ? 'fiszka' : totalCards < 5 ? 'fiszki' : 'fiszek'}
                            </p>
                        </div>
                    </div>
                    <div id="${subjectCollapseId}" class="collapsible-content" style="overflow: hidden; transition: max-height 0.3s ease, opacity 0.3s ease;">
            `;
            
            // Sortuj wykłady według daty utworzenia
            const lectureIds = Object.keys(subjectFlashcards);
            lectureIds.sort((a, b) => {
                if (a === 'no-lecture') return 1;
                if (b === 'no-lecture') return -1;
                const lectureA = lectures.find(l => l.id === a);
                const lectureB = lectures.find(l => l.id === b);
                if (!lectureA || !lectureB) return 0;
                return new Date(lectureB.createdAt) - new Date(lectureA.createdAt);
            });
            
            // Dla każdego wykładu w tym przedmiocie
            lectureIds.forEach(lectureId => {
                const cards = subjectFlashcards[lectureId];
                if (!cards || cards.length === 0) return;
                
                const lectureCollapseId = `lecture-${lectureId}`;
                
                if (lectureId === 'no-lecture') {
                    html += `
                        <div style="margin-bottom: 25px;" class="flashcard-lecture-section">
                            <div class="collapsible-header-small" onclick="toggleFlashcardSection('${lectureCollapseId}')"
                                 style="font-size: 15px; color: var(--text-secondary); margin-bottom: 12px; padding: 8px 10px;
                                        cursor: pointer; user-select: none; display: flex; align-items: center; gap: 8px;
                                        border-radius: 8px; transition: background 0.2s ease;"
                                 onmouseover="this.style.background='var(--bg-card)'" 
                                 onmouseout="this.style.background='transparent'">
                                <span class="collapse-icon" style="font-size: 12px; transition: transform 0.3s ease; display: inline-block;">▼</span>
                                📝 Bez przypisania do wykładu (${cards.length})
                            </div>
                            <div id="${lectureCollapseId}" class="collapsible-content" style="overflow: hidden; transition: max-height 0.3s ease, opacity 0.3s ease;">
                                <div class="grid" style="gap: 15px;">
                    `;
                } else {
                    const lecture = lectures.find(l => l.id === lectureId);
                    if (lecture) {
                        html += `
                            <div style="margin-bottom: 25px;" class="flashcard-lecture-section">
                                <div class="collapsible-header-small" onclick="toggleFlashcardSection('${lectureCollapseId}')"
                                     style="font-size: 15px; color: var(--text-primary); margin-bottom: 12px; padding: 8px 10px;
                                            cursor: pointer; user-select: none; display: flex; align-items: center; gap: 8px;
                                            border-radius: 8px; transition: background 0.2s ease;"
                                     onmouseover="this.style.background='var(--bg-card)'" 
                                     onmouseout="this.style.background='transparent'">
                                    <span class="collapse-icon" style="font-size: 12px; transition: transform 0.3s ease; display: inline-block;">▼</span>
                                    <span style="color: ${subject.color};">📖</span>
                                    ${lecture.title}
                                    <span style="font-size: 12px; color: var(--text-secondary); font-weight: 400;">
                                        (${cards.length} ${cards.length === 1 ? 'fiszka' : cards.length < 5 ? 'fiszki' : 'fiszek'})
                                    </span>
                                </div>
                                <div id="${lectureCollapseId}" class="collapsible-content" style="overflow: hidden; transition: max-height 0.3s ease, opacity 0.3s ease;">
                                    <div class="grid" style="gap: 15px;">
                        `;
                    }
                }
                
                // Renderuj fiszki
                cards.forEach(card => {
                    const frontText = card.front || card.question || 'Brak pytania';
                    const backText = card.back || card.answer || 'Brak odpowiedzi';
                    
                    html += `
                        <div class="card flashcard" onclick="this.classList.toggle('flipped')" data-flashcard-id="${card.id}">
                            <div class="flashcard-inner">
                                <div class="flashcard-front">
                                    <div>${frontText}</div>
                                </div>
                                <div class="flashcard-back">
                                    <div>${backText}</div>
                                </div>
                            </div>
                        </div>
                    `;
                });
                
                html += `
                                    </div>
                                </div>
                            </div>
                `;
            });
            
            html += `
                    </div>
                </div>
            `;
        }
    });
    
    // Fiszki bez przedmiotu
    if (flashcardsWithoutSubject.length > 0) {
        const noSubjectCollapseId = 'no-subject-flashcards';
        html += `
            <div style="margin-bottom: 40px;" class="flashcard-subject-section">
                <div class="collapsible-header" onclick="toggleFlashcardSection('${noSubjectCollapseId}')"
                     style="display: flex; align-items: center; gap: 12px; margin-bottom: 20px; padding: 12px;
                            border-bottom: 2px solid var(--text-secondary)22; cursor: pointer; user-select: none;
                            border-radius: 12px; transition: background 0.2s ease;"
                     onmouseover="this.style.background='var(--bg-card)'" 
                     onmouseout="this.style.background='transparent'">
                    <span class="collapse-icon" style="font-size: 16px; transition: transform 0.3s ease; display: inline-block;">▼</span>
                    <div style="width: 40px; height: 40px; border-radius: 12px; background: var(--bg-card); display: flex; align-items: center; justify-content: center; font-size: 20px;">
                        📝
                    </div>
                    <div style="flex: 1;">
                        <h3 style="font-size: 20px; font-weight: 700; margin: 0; color: var(--text-secondary);">
                            Bez przypisania
                        </h3>
                        <p style="font-size: 13px; color: var(--text-secondary); margin: 2px 0 0 0;">
                            ${flashcardsWithoutSubject.length} ${flashcardsWithoutSubject.length === 1 ? 'fiszka' : flashcardsWithoutSubject.length < 5 ? 'fiszki' : 'fiszek'}
                        </p>
                    </div>
                </div>
                <div id="${noSubjectCollapseId}" class="collapsible-content" style="overflow: hidden; transition: max-height 0.3s ease, opacity 0.3s ease;">
                    <div class="grid" style="gap: 15px;">
        `;
        
        flashcardsWithoutSubject.forEach(card => {
            const frontText = card.front || card.question || 'Brak pytania';
            const backText = card.back || card.answer || 'Brak odpowiedzi';
            
            html += `
                <div class="card flashcard" onclick="this.classList.toggle('flipped')" data-flashcard-id="${card.id}">
                    <div class="flashcard-inner">
                        <div class="flashcard-front">
                            <div>${frontText}</div>
                        </div>
                        <div class="flashcard-back">
                            <div>${backText}</div>
                        </div>
                    </div>
                </div>
            `;
        });
        
        html += `
                    </div>
                </div>
            </div>
        `;
    }
    
    container.innerHTML = html;
    
    // Initialize sections based on saved state or default to expanded
    setTimeout(() => {
        const allCollapsible = container.querySelectorAll('.collapsible-content');
        allCollapsible.forEach(section => {
            const sectionId = section.id;
            const savedState = localStorage.getItem(`flashcard-section-${sectionId}`);
            const icon = section.previousElementSibling?.querySelector('.collapse-icon');
            
            if (savedState === 'collapsed') {
                // Collapsed state
                section.style.maxHeight = '0px';
                section.style.opacity = '0';
                section.style.marginBottom = '0';
                if (icon) icon.style.transform = 'rotate(-90deg)';
            } else {
                // Expanded state (default)
                section.style.maxHeight = 'none';
                section.style.opacity = '1';
                if (icon) icon.style.transform = 'rotate(0deg)';
            }
        });
    }, 50);
}

// Toggle flashcard section collapse/expand
window.toggleFlashcardSection = function(sectionId) {
    const section = document.getElementById(sectionId);
    const header = section.previousElementSibling;
    const icon = header.querySelector('.collapse-icon');
    
    if (section.style.maxHeight && section.style.maxHeight !== '0px') {
        // Collapse
        section.style.maxHeight = '0px';
        section.style.opacity = '0';
        section.style.marginBottom = '0';
        icon.style.transform = 'rotate(-90deg)';
        localStorage.setItem(`flashcard-section-${sectionId}`, 'collapsed');
    } else {
        // Expand
        section.style.maxHeight = section.scrollHeight + 'px';
        section.style.opacity = '1';
        section.style.marginBottom = '';
        icon.style.transform = 'rotate(0deg)';
        localStorage.setItem(`flashcard-section-${sectionId}`, 'expanded');
        
        // Auto-adjust after animations complete
        setTimeout(() => {
            if (section.style.maxHeight !== '0px') {
                section.style.maxHeight = 'none';
            }
        }, 300);
    }
};

// Collapse all flashcard sections
function collapseAllFlashcards() {
    const container = document.getElementById('flashcards-grid');
    const allSections = container.querySelectorAll('.collapsible-content');
    const allIcons = container.querySelectorAll('.collapse-icon');
    
    allSections.forEach(section => {
        section.style.maxHeight = '0px';
        section.style.opacity = '0';
        section.style.marginBottom = '0';
        localStorage.setItem(`flashcard-section-${section.id}`, 'collapsed');
    });
    
    allIcons.forEach(icon => {
        icon.style.transform = 'rotate(-90deg)';
    });
}

// Expand all flashcard sections
function expandAllFlashcards() {
    const container = document.getElementById('flashcards-grid');
    const allSections = container.querySelectorAll('.collapsible-content');
    const allIcons = container.querySelectorAll('.collapse-icon');
    
    allSections.forEach(section => {
        section.style.maxHeight = 'none';
        section.style.opacity = '1';
        section.style.marginBottom = '';
        localStorage.setItem(`flashcard-section-${section.id}`, 'expanded');
    });
    
    allIcons.forEach(icon => {
        icon.style.transform = 'rotate(0deg)';
    });
}

async function addFlashcard() {
    // Populate subject selector in modal
    const subjects = await db.listSubjects();
    const selector = document.getElementById('input-flashcard-subject');
    
    if (subjects.length === 0) {
        alert('❌ Najpierw dodaj przedmiot!');
        return;
    }
    
    selector.innerHTML = '<option value="">Wybierz przedmiot...</option>' + 
        subjects.map(s => `<option value="${s.id}">${s.name}</option>`).join('');
    
    openModal('modal-add-flashcard');
}

function filterFlashcards() {
    const query = document.getElementById('flashcard-search').value.toLowerCase();
    const container = document.getElementById('flashcards-grid');
    const cards = container.querySelectorAll('.flashcard');
    
    let visibleCount = 0;
    
    cards.forEach(card => {
        const front = card.querySelector('.flashcard-front div').textContent.toLowerCase();
        const back = card.querySelector('.flashcard-back div').textContent.toLowerCase();
        const isVisible = front.includes(query) || back.includes(query);
        
        card.style.display = isVisible ? '' : 'none';
        if (isVisible) visibleCount++;
    });
    
    // Ukryj puste sekcje wykładów
    const lectureGroups = container.querySelectorAll('div[style*="margin-bottom: 25px"]');
    lectureGroups.forEach(group => {
        const visibleCards = Array.from(group.querySelectorAll('.flashcard')).filter(
            card => card.style.display !== 'none'
        );
        group.style.display = visibleCards.length > 0 ? '' : 'none';
    });
    
    // Ukryj puste sekcje przedmiotów
    const subjectGroups = container.querySelectorAll('div[style*="margin-bottom: 40px"]');
    subjectGroups.forEach(group => {
        const visibleCards = Array.from(group.querySelectorAll('.flashcard')).filter(
            card => card.style.display !== 'none'
        );
        group.style.display = visibleCards.length > 0 ? '' : 'none';
    });
}

// ============================================
// MODAL FORMS
// ============================================

function setupModalForms() {
    // Subject form
    const subjectForm = document.getElementById('form-add-subject');
    if (subjectForm) {
        subjectForm.addEventListener('submit', async (e) => {
            e.preventDefault();
            
            const name = document.getElementById('input-subject-name').value;
            const color = document.getElementById('input-subject-color').value;
            
            await db.createSubject(name, color);
            await loadSubjects();
            await loadDashboard();
            
            closeModal('modal-add-subject');
            
            // Show success message
            showToast('✅ Przedmiot dodany!');
        });
    }
    
    // Color button selection
    document.querySelectorAll('.color-btn').forEach(btn => {
        btn.addEventListener('click', () => {
            document.querySelectorAll('.color-btn').forEach(b => b.classList.remove('active'));
            btn.classList.add('active');
            document.getElementById('input-subject-color').value = btn.dataset.color;
        });
    });
    
    // Flashcard form
    const flashcardForm = document.getElementById('form-add-flashcard');
    if (flashcardForm) {
        flashcardForm.addEventListener('submit', async (e) => {
            e.preventDefault();
            
            const front = document.getElementById('input-flashcard-front').value;
            const back = document.getElementById('input-flashcard-back').value;
            const subjectId = document.getElementById('input-flashcard-subject').value;
            
            await db.createFlashcard(subjectId, front, back);
            await loadFlashcards();
            await loadDashboard();
            
            closeModal('modal-add-flashcard');
            
            // Show success message
            showToast('✅ Fiszka dodana!');
        });
    }
    
    // Schedule form
    const scheduleForm = document.getElementById('form-add-schedule');
    if (scheduleForm) {
        scheduleForm.addEventListener('submit', async (e) => {
            e.preventDefault();
            
            const subjectId = document.getElementById('input-schedule-subject').value;
            const title = document.getElementById('input-schedule-title').value;
            const dayOfWeek = parseInt(document.getElementById('input-schedule-day').value);
            const startTime = document.getElementById('input-schedule-start').value;
            const endTime = document.getElementById('input-schedule-end').value;
            const location = document.getElementById('input-schedule-location').value;
            const type = document.getElementById('input-schedule-type').value;
            const notes = document.getElementById('input-schedule-notes').value;
            
            // Walidacja godzin
            if (startTime >= endTime) {
                alert('❌ Godzina rozpoczęcia musi być wcześniejsza niż godzina zakończenia!');
                return;
            }
            
            await db.createScheduleEvent({
                subjectId,
                title,
                dayOfWeek,
                startTime,
                endTime,
                location,
                type,
                notes
            });
            
            await loadSchedule();
            
            closeModal('modal-add-schedule');
            
            // Show success message
            showToast('✅ Zajęcia dodane do planu!');
        });
    }
}

function showToast(message) {
    // Simple toast notification
    const toast = document.createElement('div');
    toast.textContent = message;
    toast.style.cssText = `
        position: fixed;
        bottom: 30px;
        right: 30px;
        background: var(--success);
        color: white;
        padding: 16px 24px;
        border-radius: 12px;
        font-weight: 600;
        box-shadow: 0 10px 40px rgba(0, 0, 0, 0.3);
        z-index: 9999;
        animation: slideInRight 0.3s ease-out;
    `;
    
    document.body.appendChild(toast);
    
    setTimeout(() => {
        toast.style.animation = 'fadeOut 0.3s ease-out';
        setTimeout(() => toast.remove(), 300);
    }, 3000);
}

// ============================================
// SETTINGS
// ============================================

async function loadSettings() {
    const appSettings = settings.getSettings();
    
    document.getElementById('setting-whisper-model').value = appSettings.whisperModel;
    document.getElementById('setting-whisper-language').value = appSettings.whisperLanguage;
    document.getElementById('setting-backend-url').value = appSettings.backendUrl;
    document.getElementById('setting-github-repo').value = appSettings.githubRepo;
    document.getElementById('setting-github-token').value = appSettings.githubToken;
    document.getElementById('setting-github-branch').value = appSettings.githubBranch;
    document.getElementById('setting-username').value = appSettings.username;
    
    // Add backend check button listener
    const checkBtn = document.getElementById('btn-check-backend');
    if (checkBtn) {
        checkBtn.addEventListener('click', async () => {
            const statusSpan = document.getElementById('backend-status');
            statusSpan.textContent = '⏳ Sprawdzanie...';
            statusSpan.style.color = 'var(--text-secondary)';
            
            const isAvailable = await transcription.checkBackend();
            
            if (isAvailable) {
                statusSpan.textContent = '✅ Backend działa!';
                statusSpan.style.color = 'var(--success)';
            } else {
                statusSpan.textContent = '❌ Backend niedostępny';
                statusSpan.style.color = 'var(--accent)';
            }
        });
    }
}

async function saveSettings() {
    const newSettings = {
        whisperModel: document.getElementById('setting-whisper-model').value,
        whisperLanguage: document.getElementById('setting-whisper-language').value,
        transcriptionMode: 'backend', // Always backend
        backendUrl: document.getElementById('setting-backend-url').value,
        githubRepo: document.getElementById('setting-github-repo').value,
        githubToken: document.getElementById('setting-github-token').value,
        githubBranch: document.getElementById('setting-github-branch').value,
        username: document.getElementById('setting-username').value
    };
    
    settings.setSettings(newSettings);
    
    // Update username in header
    document.getElementById('username').textContent = newSettings.username || 'Student';
    
    alert('✅ Ustawienia zapisane!');
}

// ============================================
// LECTURE VIEW
// ============================================

async function openLectureView(lectureId) {
    console.log('openLectureView called with ID:', lectureId);
    currentLectureId = lectureId;
    
    try {
        // Get lecture data
        const lecture = await db.getLecture(lectureId);
        console.log('Lecture data:', lecture);
        
        if (!lecture) {
            alert('❌ Nie znaleziono wykładu');
            return;
        }
        
        const subject = await db.getSubject(lecture.subjectId);
        
        // Update UI
        document.getElementById('lecture-view-title').textContent = lecture.title;
        document.getElementById('lecture-view-meta').textContent = 
            `${subject?.name || 'Brak przedmiotu'} • ${new Date(lecture.createdAt).toLocaleString('pl-PL')}`;
        
        // Helper function to render markdown
        const renderMarkdown = (text) => {
            if (!text) return '<p style="color: var(--text-secondary); text-align: center; padding: 40px;">Brak treści</p>';
            try {
                const rawHtml = marked.parse(text);
                return DOMPurify.sanitize(rawHtml);
            } catch (e) {
                console.error('Markdown parse error:', e);
                return `<div style="white-space: pre-wrap;">${text}</div>`;
            }
        };
        
        // Load basic notes content
        document.getElementById('lecture-notes-content').innerHTML = lecture.notes 
            ? renderMarkdown(lecture.notes)
            : '<p style="color: var(--text-secondary); text-align: center; padding: 40px;">Brak notatek. Użyj przycisku "Generuj z AI" aby stworzyć notatki automatycznie.</p>';
        
        // Load detailed note
        document.getElementById('lecture-detailed-content').innerHTML = lecture.detailedNote 
            ? renderMarkdown(lecture.detailedNote)
            : '<p style="color: var(--text-secondary); text-align: center; padding: 40px;">Brak szczegółowej notatki. Użyj przycisku "Generuj z AI".</p>';
        
        // Load short note
        document.getElementById('lecture-short-content').innerHTML = lecture.shortNote 
            ? renderMarkdown(lecture.shortNote)
            : '<p style="color: var(--text-secondary); text-align: center; padding: 40px;">Brak krótkiej notatki. Użyj przycisku "Generuj z AI".</p>';
        
        // Load key points
        document.getElementById('lecture-keypoints-content').innerHTML = lecture.keyPoints 
            ? renderMarkdown(lecture.keyPoints)
            : '<p style="color: var(--text-secondary); text-align: center; padding: 40px;">Brak kluczowych punktów. Użyj przycisku "Generuj z AI".</p>';
        
        // Load transcription
        document.getElementById('lecture-transcription-content').innerHTML = lecture.transcription
            ? `<div style="white-space: pre-wrap;">${lecture.transcription}</div>`
            : '<p style="color: var(--text-secondary);">Brak transkrypcji</p>';
        
        // Load flashcards
        const flashcards = await db.getFlashcardsByLecture(lectureId);
        if (flashcards.length > 0) {
            document.getElementById('lecture-flashcards-content').innerHTML = `
                <div class="grid">
                    ${flashcards.map(card => `
                        <div class="card">
                            <div style="margin-bottom: 10px; font-weight: 600;">❓ ${card.question}</div>
                            <div style="color: var(--text-secondary);">💡 ${card.answer}</div>
                            ${card.category ? `<div style="margin-top: 10px; font-size: 12px; color: var(--primary);">📁 ${card.category}</div>` : ''}
                        </div>
                    `).join('')}
                </div>
            `;
        } else {
            document.getElementById('lecture-flashcards-content').innerHTML = 
                '<p style="color: var(--text-secondary); text-align: center; padding: 40px;">Brak fiszek. Użyj przycisku "Generuj z AI" aby stworzyć fiszki automatycznie.</p>';
        }
        
        // Load quiz
        if (lecture.quiz && lecture.quiz.length > 0) {
            renderQuiz(lecture.quiz);
        } else {
            document.getElementById('lecture-quiz-content').innerHTML = 
                '<p style="color: var(--text-secondary); text-align: center; padding: 40px;">Brak quizu. Użyj przycisku "Generuj z AI" aby stworzyć quiz automatycznie.</p>';
        }
        
        console.log('Switching to lecture-view tab...');
        // Switch to lecture view
        switchTab('lecture-view');
        console.log('Lecture view opened successfully');
        
    } catch (error) {
        console.error('Error opening lecture view:', error);
        alert(`❌ Błąd podczas otwierania wykładu: ${error.message}`);
    }
}

function setupLectureViewListeners() {
    // Back button
    document.getElementById('btn-back-to-lectures').addEventListener('click', () => {
        currentLectureId = null;
        switchTab('lectures');
    });
    
    // Tab switching
    document.querySelectorAll('.tab-btn').forEach(btn => {
        btn.addEventListener('click', () => {
            const targetTab = btn.dataset.lectureTab;
            
            // Update active states
            document.querySelectorAll('.tab-btn').forEach(b => b.classList.remove('active'));
            btn.classList.add('active');
            
            document.querySelectorAll('.lecture-tab-content').forEach(content => {
                content.classList.remove('active');
            });
            document.getElementById(`lecture-tab-${targetTab}`).classList.add('active');
        });
    });
    
    // Generate notes
    document.getElementById('btn-generate-notes').addEventListener('click', async () => {
        if (!currentLectureId) return;
        
        const lecture = await db.getLecture(currentLectureId);
        if (!lecture.transcription) {
            alert('❌ Brak transkrypcji do przetworzenia');
            return;
        }
        
        const btn = document.getElementById('btn-generate-notes');
        btn.disabled = true;
        btn.textContent = '⏳ Generowanie...';
        
        try {
            const notes = await ai.generateNotes(lecture.transcription, (percent, message) => {
                btn.textContent = `⏳ ${message}`;
            });
            
            // Save to database
            await db.updateLecture(currentLectureId, {
                notes: notes.formatted,
                aiNotes: notes
            });
            
            // Update UI
            const renderMarkdown = (text) => {
                try {
                    const rawHtml = marked.parse(text);
                    return DOMPurify.sanitize(rawHtml);
                } catch (e) {
                    return `<div style="white-space: pre-wrap;">${text}</div>`;
                }
            };
            
            document.getElementById('lecture-notes-content').innerHTML = renderMarkdown(notes.formatted);
            
            btn.textContent = '✨ Generuj z AI';
            btn.disabled = false;
            
            alert('✅ Notatki wygenerowane!');
            
        } catch (error) {
            console.error('Error generating notes:', error);
            alert(`❌ Błąd: ${error.message}`);
            btn.textContent = '✨ Generuj z AI';
            btn.disabled = false;
        }
    });
    
    // Generate detailed note
    document.getElementById('btn-generate-detailed').addEventListener('click', async () => {
        if (!currentLectureId) return;
        
        const lecture = await db.getLecture(currentLectureId);
        if (!lecture.transcription) {
            alert('❌ Brak transkrypcji do przetworzenia');
            return;
        }
        
        const btn = document.getElementById('btn-generate-detailed');
        btn.disabled = true;
        btn.textContent = '⏳ Generowanie...';
        
        try {
            const detailedNote = await ai.generateDetailedNote(lecture.transcription, (percent, message) => {
                btn.textContent = `⏳ ${message}`;
            });
            
            await db.updateLecture(currentLectureId, { detailedNote });
            
            const renderMarkdown = (text) => {
                try {
                    const rawHtml = marked.parse(text);
                    return DOMPurify.sanitize(rawHtml);
                } catch (e) {
                    return `<div style="white-space: pre-wrap;">${text}</div>`;
                }
            };
            
            document.getElementById('lecture-detailed-content').innerHTML = renderMarkdown(detailedNote);
            
            btn.textContent = '✨ Generuj z AI';
            btn.disabled = false;
            alert('✅ Szczegółowa notatka wygenerowana!');
            
        } catch (error) {
            console.error('Error:', error);
            alert(`❌ Błąd: ${error.message}`);
            btn.textContent = '✨ Generuj z AI';
            btn.disabled = false;
        }
    });
    
    // Generate short note
    document.getElementById('btn-generate-short').addEventListener('click', async () => {
        if (!currentLectureId) return;
        
        const lecture = await db.getLecture(currentLectureId);
        if (!lecture.transcription) {
            alert('❌ Brak transkrypcji do przetworzenia');
            return;
        }
        
        const btn = document.getElementById('btn-generate-short');
        btn.disabled = true;
        btn.textContent = '⏳ Generowanie...';
        
        try {
            const shortNote = await ai.generateShortNote(lecture.transcription, (percent, message) => {
                btn.textContent = `⏳ ${message}`;
            });
            
            await db.updateLecture(currentLectureId, { shortNote });
            
            const renderMarkdown = (text) => {
                try {
                    const rawHtml = marked.parse(text);
                    return DOMPurify.sanitize(rawHtml);
                } catch (e) {
                    return `<div style="white-space: pre-wrap;">${text}</div>`;
                }
            };
            
            document.getElementById('lecture-short-content').innerHTML = renderMarkdown(shortNote);
            
            btn.textContent = '✨ Generuj z AI';
            btn.disabled = false;
            alert('✅ Krótka notatka wygenerowana!');
            
        } catch (error) {
            console.error('Error:', error);
            alert(`❌ Błąd: ${error.message}`);
            btn.textContent = '✨ Generuj z AI';
            btn.disabled = false;
        }
    });
    
    // Generate key points
    document.getElementById('btn-generate-keypoints').addEventListener('click', async () => {
        if (!currentLectureId) return;
        
        const lecture = await db.getLecture(currentLectureId);
        if (!lecture.transcription) {
            alert('❌ Brak transkrypcji do przetworzenia');
            return;
        }
        
        const btn = document.getElementById('btn-generate-keypoints');
        btn.disabled = true;
        btn.textContent = '⏳ Generowanie...';
        
        try {
            const keyPoints = await ai.generateKeyPoints(lecture.transcription, (percent, message) => {
                btn.textContent = `⏳ ${message}`;
            });
            
            await db.updateLecture(currentLectureId, { keyPoints });
            
            const renderMarkdown = (text) => {
                try {
                    const rawHtml = marked.parse(text);
                    return DOMPurify.sanitize(rawHtml);
                } catch (e) {
                    return `<div style="white-space: pre-wrap;">${text}</div>`;
                }
            };
            
            document.getElementById('lecture-keypoints-content').innerHTML = renderMarkdown(keyPoints);
            
            btn.textContent = '✨ Generuj z AI';
            btn.disabled = false;
            alert('✅ Kluczowe punkty wygenerowane!');
            
        } catch (error) {
            console.error('Error:', error);
            alert(`❌ Błąd: ${error.message}`);
            btn.textContent = '✨ Generuj z AI';
            btn.disabled = false;
        }
    });
    
    // Generate flashcards
    document.getElementById('btn-generate-flashcards').addEventListener('click', async () => {
        if (!currentLectureId) return;
        
        const lecture = await db.getLecture(currentLectureId);
        if (!lecture.transcription) {
            alert('❌ Brak transkrypcji do przetworzenia');
            return;
        }
        
        const btn = document.getElementById('btn-generate-flashcards');
        btn.disabled = true;
        btn.textContent = '⏳ Generowanie...';
        
        try {
            const flashcards = await ai.generateFlashcards(lecture.transcription, (percent, message) => {
                btn.textContent = `⏳ ${message}`;
            });
            
            // Save to database
            for (const card of flashcards) {
                await db.addFlashcard({
                    ...card,
                    subjectId: lecture.subjectId,
                    lectureId: currentLectureId
                });
            }
            
            // Reload flashcards
            const allFlashcards = await db.getFlashcardsByLecture(currentLectureId);
            document.getElementById('lecture-flashcards-content').innerHTML = `
                <div class="grid">
                    ${allFlashcards.map(card => `
                        <div class="card">
                            <div style="margin-bottom: 10px; font-weight: 600;">❓ ${card.question}</div>
                            <div style="color: var(--text-secondary);">💡 ${card.answer}</div>
                            ${card.category ? `<div style="margin-top: 10px; font-size: 12px; color: var(--primary);">📁 ${card.category}</div>` : ''}
                        </div>
                    `).join('')}
                </div>
            `;
            
            btn.textContent = '✨ Generuj z AI';
            btn.disabled = false;
            
            alert(`✅ Wygenerowano ${flashcards.length} fiszek!`);
            
        } catch (error) {
            console.error('Error generating flashcards:', error);
            alert(`❌ Błąd: ${error.message}`);
            btn.textContent = '✨ Generuj z AI';
            btn.disabled = false;
        }
    });
    
    // Generate quiz
    document.getElementById('btn-generate-quiz').addEventListener('click', async () => {
        if (!currentLectureId) return;
        
        const lecture = await db.getLecture(currentLectureId);
        if (!lecture.transcription) {
            alert('❌ Brak transkrypcji do przetworzenia');
            return;
        }
        
        const btn = document.getElementById('btn-generate-quiz');
        btn.disabled = true;
        btn.textContent = '⏳ Generowanie...';
        
        try {
            const quiz = await ai.generateQuiz(lecture.transcription, (percent, message) => {
                btn.textContent = `⏳ ${message}`;
            });
            
            // Save to database
            await db.updateLecture(currentLectureId, { quiz });
            
            // Render quiz
            renderQuiz(quiz);
            
            btn.textContent = '✨ Generuj z AI';
            btn.disabled = false;
            
            alert(`✅ Wygenerowano ${quiz.length} pytań quizowych!`);
            
        } catch (error) {
            console.error('Error generating quiz:', error);
            alert(`❌ Błąd: ${error.message}`);
            btn.textContent = '✨ Generuj z AI';
            btn.disabled = false;
        }
    });
}

// ============================================
// QUIZ HELPERS
// ============================================

function renderQuiz(questions) {
    if (!questions || questions.length === 0) {
        document.getElementById('lecture-quiz-content').innerHTML = 
            '<p style="color: var(--text-secondary); text-align: center; padding: 40px;">Brak pytań</p>';
        return;
    }
    
    // Reset quiz state
    quizState.selectedAnswers = new Map();
    quizState.isChecked = false;
    
    const container = document.getElementById('lecture-quiz-content');
    
    container.innerHTML = `
        <div style="margin-bottom: 30px;">
            <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 20px;">
                <h3>📝 Quiz - ${questions.length} pytań</h3>
                <div id="quiz-controls">
                    <button class="btn btn-primary" id="btn-check-quiz" style="padding: 12px 24px; font-weight: 600;">
                        ✅ Sprawdź wyniki
                    </button>
                </div>
            </div>
            <div id="quiz-questions"></div>
        </div>
    `;
    
    // Render questions
    const questionsContainer = container.querySelector('#quiz-questions');
    questionsContainer.innerHTML = questions.map((q, idx) => {
        const questionId = `q-${idx}`;
        return `
            <div class="card" style="margin-bottom: 20px;" data-question-id="${questionId}">
                <div style="display: flex; align-items-start; gap: 15px; margin-bottom: 15px;">
                    <span style="flex-shrink: 0; width: 35px; height: 35px; border-radius: 50%; background: var(--primary); color: white; font-weight: 600; display: flex; align-items: center; justify-content: center;">
                        ${idx + 1}
                    </span>
                    <div style="flex: 1;">
                        <div style="font-weight: 600; font-size: 16px; margin-bottom: 5px;">${q.question}</div>
                        ${q.category ? `<span style="display: inline-block; background: var(--bg-card); padding: 4px 10px; border-radius: 6px; font-size: 12px; color: var(--text-secondary);">📁 ${q.category}</span>` : ''}
                    </div>
                    <span class="quiz-result-icon" style="font-size: 24px; display: none;"></span>
                </div>
                
                <div style="margin-left: 50px;">
                    ${q.options.map((opt, optIdx) => `
                        <button class="quiz-option" data-question-id="${questionId}" data-option-idx="${optIdx}"
                                style="display: block; width: 100%; text-align: left; padding: 12px; margin-bottom: 8px; border: 2px solid var(--bg-card); background: var(--bg-dark); border-radius: 8px; cursor: pointer; transition: all 0.2s;">
                            <div style="display: flex; align-items: center; gap: 10px;">
                                <span style="flex-shrink: 0; width: 28px; height: 28px; border-radius: 50%; border: 2px solid var(--text-secondary); display: flex; align-items: center; justify-center; font-weight: 600; font-size: 12px;">
                                    ${String.fromCharCode(65 + optIdx)}
                                </span>
                                <span style="flex: 1;">${opt}</span>
                            </div>
                        </button>
                    `).join('')}
                </div>
            </div>
        `;
    }).join('');
    
    // Add event listeners for options
    container.querySelectorAll('.quiz-option').forEach(btn => {
        btn.addEventListener('click', () => {
            if (quizState.isChecked) return; // Disabled after checking
            
            const questionId = btn.dataset.questionId;
            const optionIdx = parseInt(btn.dataset.optionIdx);
            
            // Clear previous selection
            container.querySelectorAll(`.quiz-option[data-question-id="${questionId}"]`).forEach(opt => {
                opt.style.borderColor = 'var(--bg-card)';
                opt.style.background = 'var(--bg-dark)';
            });
            
            // Highlight selected
            btn.style.borderColor = 'var(--primary)';
            btn.style.background = 'var(--primary)22';
            
            // Store answer
            quizState.selectedAnswers.set(questionId, optionIdx);
        });
    });
    
    // Check quiz button
    document.getElementById('btn-check-quiz').addEventListener('click', () => {
        if (quizState.selectedAnswers.size === 0) {
            alert('⚠️ Zaznacz przynajmniej jedną odpowiedź!');
            return;
        }
        
        quizState.isChecked = true;
        checkQuizAnswers(questions);
    });
}

function checkQuizAnswers(questions) {
    const container = document.getElementById('lecture-quiz-content');
    let correctCount = 0;
    
    questions.forEach((q, idx) => {
        const questionId = `q-${idx}`;
        const selectedAnswer = quizState.selectedAnswers.get(questionId);
        const isAnswered = selectedAnswer !== undefined;
        const isCorrect = isAnswered && selectedAnswer === q.correctIndex;
        
        if (isCorrect) correctCount++;
        
        const questionCard = container.querySelector(`[data-question-id="${questionId}"]`);
        const resultIcon = questionCard.querySelector('.quiz-result-icon');
        
        // Show result icon
        resultIcon.style.display = 'block';
        resultIcon.textContent = isCorrect ? '✅' : '❌';
        
        // Highlight options
        q.options.forEach((opt, optIdx) => {
            const optBtn = questionCard.querySelector(`.quiz-option[data-option-idx="${optIdx}"]`);
            const isSelected = selectedAnswer === optIdx;
            const isCorrectOption = optIdx === q.correctIndex;
            
            if (isCorrectOption) {
                optBtn.style.borderColor = '#10b981';
                optBtn.style.background = '#10b98133';
                optBtn.style.color = '#10b981';
            } else if (isSelected) {
                optBtn.style.borderColor = '#ef4444';
                optBtn.style.background = '#ef444433';
                optBtn.style.color = '#ef4444';
            }
            
            optBtn.style.cursor = 'default';
        });
    });
    
    // Show results
    const controls = document.getElementById('quiz-controls');
    controls.innerHTML = `
        <div style="text-align: right;">
            <div style="font-size: 32px; font-weight: 700; color: #10b981; margin-bottom: 5px;">
                ${correctCount} / ${quizState.selectedAnswers.size}
            </div>
            <div style="font-size: 14px; color: var(--text-secondary); margin-bottom: 10px;">
                poprawnych odpowiedzi
            </div>
            <button class="btn" id="btn-reset-quiz" style="background: var(--bg-card); padding: 8px 16px;">
                🔄 Spróbuj ponownie
            </button>
        </div>
    `;
    
    // Reset button
    document.getElementById('btn-reset-quiz').addEventListener('click', async () => {
        const lecture = await db.getLecture(currentLectureId);
        if (lecture.quiz) {
            renderQuiz(lecture.quiz);
        }
    });
}

// ============================================
// SCHEDULE (PLAN ZAJĘĆ)
// ============================================

async function loadSchedule() {
    const events = await db.listScheduleEvents();
    const subjects = await db.listSubjects();
    
    const container = document.getElementById('schedule-view');
    
    if (events.length === 0) {
        container.innerHTML = `
            <div class="card" style="grid-column: 1 / -1; text-align: center; padding: 60px;">
                <p style="color: var(--text-secondary); font-size: 18px; margin-bottom: 20px;">
                    📅 Brak zajęć w planie
                </p>
                <p style="color: var(--text-secondary); margin-bottom: 20px;">
                    Dodaj swoje pierwsze zajęcia aby stworzyć harmonogram tygodnia
                </p>
                <button class="btn btn-primary" onclick="document.getElementById('btn-add-schedule').click()">
                    + Dodaj zajęcia
                </button>
            </div>
        `;
        return;
    }
    
    // Grupuj według dni tygodnia
    const dayNames = ['Niedziela', 'Poniedziałek', 'Wtorek', 'Środa', 'Czwartek', 'Piątek', 'Sobota'];
    const eventsByDay = {};
    
    events.forEach(event => {
        if (!eventsByDay[event.dayOfWeek]) {
            eventsByDay[event.dayOfWeek] = [];
        }
        eventsByDay[event.dayOfWeek].push(event);
    });
    
    // Generuj HTML dla każdego dnia
    let html = '';
    for (let day = 1; day <= 6; day++) { // Pon-Sob
        const dayEvents = eventsByDay[day] || [];
        if (dayEvents.length > 0) {
            html += `
                <div class="card" style="padding: 0; overflow: hidden;">
                    <div style="background: var(--primary); color: white; padding: 15px 20px; font-weight: 700; font-size: 18px;">
                        ${dayNames[day]}
                    </div>
                    <div style="padding: 15px;">
                        ${dayEvents.map(event => {
                            const subject = subjects.find(s => s.id === event.subjectId);
                            const typeEmoji = {
                                'lecture': '📖',
                                'exercise': '✏️',
                                'lab': '🔬',
                                'seminar': '💬',
                                'exam': '📝',
                                'other': '📌'
                            };
                            
                            return `
                                <div style="margin-bottom: 12px; padding: 12px; background: var(--bg-dark); border-radius: 8px; border-left: 4px solid ${subject?.color || 'var(--primary)'};">
                                    <div style="display: flex; justify-content: space-between; align-items: start; margin-bottom: 8px;">
                                        <div style="flex: 1;">
                                            <div style="display: flex; align-items: center; gap: 8px; margin-bottom: 4px;">
                                                <span style="font-size: 18px;">${typeEmoji[event.type] || '📌'}</span>
                                                <span style="font-weight: 600; font-size: 16px; color: ${subject?.color || 'var(--primary)'};">
                                                    ${event.title || subject?.name || 'Zajęcia'}
                                                </span>
                                            </div>
                                            <div style="display: flex; align-items: center; gap: 12px; font-size: 14px; color: var(--text-secondary);">
                                                <span>🕐 ${event.startTime} - ${event.endTime}</span>
                                                ${event.location ? `<span>📍 ${event.location}</span>` : ''}
                                            </div>
                                            ${event.notes ? `<div style="margin-top: 8px; font-size: 13px; color: var(--text-secondary); font-style: italic;">${event.notes}</div>` : ''}
                                        </div>
                                        <button class="btn" onclick="deleteScheduleEvent('${event.id}')" 
                                                style="background: var(--accent)22; color: var(--accent); padding: 6px 12px; font-size: 12px;">
                                            🗑️
                                        </button>
                                    </div>
                                </div>
                            `;
                        }).join('')}
                    </div>
                </div>
            `;
        }
    }
    
    // Niedziela na końcu (jeśli są zajęcia)
    if (eventsByDay[0] && eventsByDay[0].length > 0) {
        const dayEvents = eventsByDay[0];
        html += `
            <div class="card" style="padding: 0; overflow: hidden;">
                <div style="background: var(--text-secondary); color: white; padding: 15px 20px; font-weight: 700; font-size: 18px;">
                    ${dayNames[0]}
                </div>
                <div style="padding: 15px;">
                    ${dayEvents.map(event => {
                        const subject = subjects.find(s => s.id === event.subjectId);
                        const typeEmoji = {
                            'lecture': '📖',
                            'exercise': '✏️',
                            'lab': '🔬',
                            'seminar': '💬',
                            'exam': '📝',
                            'other': '📌'
                        };
                        
                        return `
                            <div style="margin-bottom: 12px; padding: 12px; background: var(--bg-dark); border-radius: 8px; border-left: 4px solid ${subject?.color || 'var(--primary)'};">
                                <div style="display: flex; justify-content: space-between; align-items: start; margin-bottom: 8px;">
                                    <div style="flex: 1;">
                                        <div style="display: flex; align-items: center; gap: 8px; margin-bottom: 4px;">
                                            <span style="font-size: 18px;">${typeEmoji[event.type] || '📌'}</span>
                                            <span style="font-weight: 600; font-size: 16px; color: ${subject?.color || 'var(--primary)'};">
                                                ${event.title || subject?.name || 'Zajęcia'}
                                            </span>
                                        </div>
                                        <div style="display: flex; align-items: center; gap: 12px; font-size: 14px; color: var(--text-secondary);">
                                            <span>🕐 ${event.startTime} - ${event.endTime}</span>
                                            ${event.location ? `<span>📍 ${event.location}</span>` : ''}
                                        </div>
                                        ${event.notes ? `<div style="margin-top: 8px; font-size: 13px; color: var(--text-secondary); font-style: italic;">${event.notes}</div>` : ''}
                                    </div>
                                    <button class="btn" onclick="deleteScheduleEvent('${event.id}')" 
                                            style="background: var(--accent)22; color: var(--accent); padding: 6px 12px; font-size: 12px;">
                                        🗑️
                                    </button>
                                </div>
                            </div>
                        `;
                    }).join('')}
                </div>
            </div>
        `;
    }
    
    container.innerHTML = html;
}

async function addScheduleEvent() {
    console.log('🔵 addScheduleEvent called');
    
    // Populate subject selector in modal
    const subjects = await db.listSubjects();
    const selector = document.getElementById('input-schedule-subject');
    
    console.log('🔵 Found subjects:', subjects.length);
    
    if (subjects.length === 0) {
        alert('❌ Najpierw dodaj przedmiot!');
        return;
    }
    
    selector.innerHTML = '<option value="">Wybierz przedmiot...</option>' + 
        subjects.map(s => `<option value="${s.id}">${s.name}</option>`).join('');
    
    console.log('🔵 Opening modal...');
    openModal('modal-add-schedule');
}

window.deleteScheduleEvent = async (id) => {
    if (!confirm('Czy na pewno chcesz usunąć te zajęcia z planu?')) return;
    await db.deleteScheduleEvent(id);
    await loadSchedule();
    showToast('✅ Zajęcia usunięte z planu');
};

// ============================================
// CLEAR DATA FUNCTIONS
// ============================================

async function clearAllLectures() {
    if (!confirm('⚠️ Czy na pewno chcesz usunąć WSZYSTKIE wykłady?\n\nTa operacja jest nieodwracalna!')) {
        return;
    }
    
    if (!confirm('⚠️ OSTATNIE OSTRZEŻENIE!\n\nSpowoduje to usunięcie wszystkich wykładów, notatek, transkrypcji i quizów.\n\nKontynuować?')) {
        return;
    }
    
    try {
        await db.clearAllLectures();
        await loadLectures();
        await loadDashboard();
        showToast('✅ Wszystkie wykłady zostały usunięte');
    } catch (error) {
        console.error('Error clearing lectures:', error);
        alert('❌ Błąd podczas usuwania wykładów: ' + error.message);
    }
}

async function clearAllFlashcards() {
    if (!confirm('⚠️ Czy na pewno chcesz usunąć WSZYSTKIE fiszki?\n\nTa operacja jest nieodwracalna!')) {
        return;
    }
    
    try {
        await db.clearAllFlashcards();
        await loadFlashcards();
        await loadDashboard();
        showToast('✅ Wszystkie fiszki zostały usunięte');
    } catch (error) {
        console.error('Error clearing flashcards:', error);
        alert('❌ Błąd podczas usuwania fiszek: ' + error.message);
    }
}

async function clearAllSchedule() {
    if (!confirm('⚠️ Czy na pewno chcesz usunąć CAŁY plan zajęć?\n\nTa operacja jest nieodwracalna!')) {
        return;
    }
    
    try {
        await db.clearAllScheduleEvents();
        await loadSchedule();
        showToast('✅ Plan zajęć został wyczyszczony');
    } catch (error) {
        console.error('Error clearing schedule:', error);
        alert('❌ Błąd podczas usuwania planu: ' + error.message);
    }
}

async function clearAllSubjects() {
    if (!confirm('⚠️ Czy na pewno chcesz usunąć WSZYSTKIE przedmioty?\n\nUWAGA: Spowoduje to także usunięcie powiązanych wykładów i fiszek!\n\nTa operacja jest nieodwracalna!')) {
        return;
    }
    
    if (!confirm('⚠️ OSTATNIE OSTRZEŻENIE!\n\nUsunięcie przedmiotów spowoduje:\n- Utratę wszystkich wykładów z tych przedmiotów\n- Utratę wszystkich fiszek z tych przedmiotów\n- Utratę planu zajęć\n\nKontynuować?')) {
        return;
    }
    
    try {
        await db.clearAllSubjects();
        await loadSubjects();
        await loadLectures();
        await loadFlashcards();
        await loadSchedule();
        await loadDashboard();
        showToast('✅ Wszystkie przedmioty zostały usunięte');
    } catch (error) {
        console.error('Error clearing subjects:', error);
        alert('❌ Błąd podczas usuwania przedmiotów: ' + error.message);
    }
}

async function clearAllData() {
    if (!confirm('🚨 UWAGA! 🚨\n\nCzy na pewno chcesz usunąć WSZYSTKIE DANE z aplikacji?\n\nSpowoduje to usunięcie:\n- Wszystkich przedmiotów\n- Wszystkich wykładów\n- Wszystkich fiszek\n- Całego planu zajęć\n- Wszystkich notatek\n\nTa operacja jest CAŁKOWICIE NIEODWRACALNA!')) {
        return;
    }
    
    if (!confirm('🚨 OSTATECZNE OSTRZEŻENIE! 🚨\n\nTego NIE DA SIĘ cofnąć!\n\nNapisz "USUŃ" w następnym oknie aby potwierdzić.')) {
        return;
    }
    
    const confirmation = prompt('Wpisz "USUŃ" aby potwierdzić usunięcie wszystkich danych:');
    
    if (confirmation !== 'USUŃ') {
        alert('❌ Operacja anulowana - nieprawidłowe potwierdzenie');
        return;
    }
    
    try {
        await db.clearAllData();
        
        // Reload all views
        await loadDashboard();
        await loadSubjects();
        await loadLectures();
        await loadFlashcards();
        await loadSchedule();
        
        showToast('✅ Wszystkie dane zostały usunięte');
        
        // Redirect to dashboard
        switchTab('dashboard');
    } catch (error) {
        console.error('Error clearing all data:', error);
        alert('❌ Błąd podczas usuwania danych: ' + error.message);
    }
}

// ============================================
// EXPORT TO WINDOW (for inline event handlers)
// ============================================

window.deleteSubject = async (id) => {
    if (!confirm('Czy na pewno chcesz usunąć ten przedmiot?')) return;
    await db.deleteSubject(id);
    await loadSubjects();
    await loadDashboard();
};

console.log('✅ App.js loaded');
