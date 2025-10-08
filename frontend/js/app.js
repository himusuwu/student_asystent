// Student Assistant - Main Application
// Version 2.0 - Modular Architecture
// CACHE BUSTER: 2025-10-06-20:00 - Fixed currentLectureId issue

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

// Initialize currentLectureId on window object explicitly
if (typeof window !== 'undefined') {
    window.currentLectureId = null;
    console.log('Initialized window.currentLectureId');
} else {
    console.error('window object not available!');
}

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
    
    // Lectures
    document.getElementById('lecture-search').addEventListener('input', filterLectures);
    document.getElementById('btn-collapse-all-lectures').addEventListener('click', collapseAllLectures);
    document.getElementById('btn-expand-all-lectures').addEventListener('click', expandAllLectures);
    
    // Study Mode
    document.getElementById('btn-study-flashcards').addEventListener('click', openStudyMode);
    document.getElementById('btn-back-to-flashcards').addEventListener('click', () => switchTab('flashcards'));
    
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
            const subjectCollapseId = `subject-lectures-${subject.id}`;
            const isCollapsed = localStorage.getItem(`lecture-section-${subjectCollapseId}`) === 'collapsed';
            
            html += `
                <div style="margin-bottom: 30px;">
                    <div class="collapsible-header" onclick="toggleLectureSection('${subjectCollapseId}')" 
                         style="display: flex; align-items: center; gap: 12px; margin-bottom: 15px; padding: 15px; 
                                background: var(--bg-card); border: 1px solid var(--border); border-radius: 12px; 
                                cursor: pointer; transition: all 0.3s;"
                         onmouseover="this.style.borderColor='${subject.color}'" 
                         onmouseout="this.style.borderColor='var(--border)'">
                        <div style="width: 40px; height: 40px; border-radius: 12px; background: ${subject.color}; display: flex; align-items: center; justify-content: center; font-size: 20px;">
                            📚
                        </div>
                        <div style="flex: 1;">
                            <h3 style="font-size: 20px; font-weight: 700; margin: 0; color: ${subject.color};">
                                ${subject.name}
                            </h3>
                            <p style="font-size: 13px; color: var(--text-secondary); margin: 2px 0 0 0;">
                                ${subjectLectures.length} ${subjectLectures.length === 1 ? 'wykład' : 'wykładów'}
                            </p>
                        </div>
                        <div class="collapse-icon" style="font-size: 18px; color: ${subject.color}; transition: transform 0.3s; transform: rotate(${isCollapsed ? '-90deg' : '0deg'});">
                            ▼
                        </div>
                    </div>
                    <div id="${subjectCollapseId}" class="collapsible-content" style="overflow: hidden; transition: max-height 0.3s ease, opacity 0.3s ease; ${isCollapsed ? 'max-height: 0px; opacity: 0; margin-bottom: 0;' : ''}">
                        <div style="display: flex; flex-direction: column; gap: 10px; padding-left: 20px;">
                            ${subjectLectures.map(lecture => `
                                <div class="lecture-item" data-lecture-id="${lecture.id}">
                                    <div class="lecture-icon" style="background: ${subject.color}22; color: ${subject.color};">📖</div>
                                    <div class="lecture-info">
                                        <div class="lecture-title">${lecture.title}</div>
                                        <div class="lecture-date">${new Date(lecture.createdAt).toLocaleString('pl-PL')}</div>
                                    </div>
                                    <div class="lecture-actions" style="display: flex; gap: 8px; align-items: center;">
                                        <button class="btn btn-secondary btn-edit-lecture" data-lecture-id="${lecture.id}" 
                                                style="padding: 6px 12px; font-size: 12px; background: rgba(59, 130, 246, 0.1); 
                                                       border: 1px solid rgba(59, 130, 246, 0.3); color: #3b82f6;" 
                                                title="Edytuj wykład">
                                            ✏️
                                        </button>
                                        <button class="btn btn-secondary btn-delete-lecture" data-lecture-id="${lecture.id}" 
                                                style="padding: 6px 12px; font-size: 12px; background: rgba(239, 68, 68, 0.1); 
                                                       border: 1px solid rgba(239, 68, 68, 0.3); color: #ef4444;" 
                                                title="Usuń wykład">
                                            🗑️
                                        </button>
                                        <button class="btn btn-primary btn-open-lecture" data-lecture-id="${lecture.id}" style="padding: 8px 16px; background: ${subject.color};">
                                            Otwórz
                                        </button>
                                    </div>
                                </div>
                            `).join('')}
                        </div>
                    </div>
                </div>
            `;
        }
    });
    
    // Wykłady bez przedmiotu
    if (lecturesWithoutSubject.length > 0) {
        const noSubjectCollapseId = 'no-subject-lectures';
        const isCollapsed = localStorage.getItem(`lecture-section-${noSubjectCollapseId}`) === 'collapsed';
        
        html += `
            <div style="margin-bottom: 30px;">
                <div class="collapsible-header" onclick="toggleLectureSection('${noSubjectCollapseId}')" 
                     style="display: flex; align-items: center; gap: 12px; margin-bottom: 15px; padding: 15px; 
                            background: var(--bg-card); border: 1px solid var(--border); border-radius: 12px; 
                            cursor: pointer; transition: all 0.3s;"
                     onmouseover="this.style.borderColor='var(--text-secondary)'" 
                     onmouseout="this.style.borderColor='var(--border)'">
                    <div style="width: 40px; height: 40px; border-radius: 12px; background: var(--bg-card); border: 1px solid var(--border); display: flex; align-items: center; justify-content: center; font-size: 20px;">
                        📝
                    </div>
                    <div style="flex: 1;">
                        <h3 style="font-size: 20px; font-weight: 700; margin: 0; color: var(--text-secondary);">
                            Bez przypisania
                        </h3>
                        <p style="font-size: 13px; color: var(--text-secondary); margin: 2px 0 0 0;">
                            ${lecturesWithoutSubject.length} ${lecturesWithoutSubject.length === 1 ? 'wykład' : 'wykładów'}
                        </p>
                    </div>
                    <div class="collapse-icon" style="font-size: 18px; color: var(--text-secondary); transition: transform 0.3s; transform: rotate(${isCollapsed ? '-90deg' : '0deg'});">
                        ▼
                    </div>
                </div>
                <div id="${noSubjectCollapseId}" class="collapsible-content" style="overflow: hidden; transition: max-height 0.3s ease, opacity 0.3s ease; ${isCollapsed ? 'max-height: 0px; opacity: 0; margin-bottom: 0;' : ''}">
                    <div style="display: flex; flex-direction: column; gap: 10px; padding-left: 20px;">${lecturesWithoutSubject.map(lecture => `
                        <div class="lecture-item" data-lecture-id="${lecture.id}">
                            <div class="lecture-icon">📖</div>
                            <div class="lecture-info">
                                <div class="lecture-title">${lecture.title}</div>
                                <div class="lecture-date">${new Date(lecture.createdAt).toLocaleString('pl-PL')}</div>
                            </div>
                            <div class="lecture-actions" style="display: flex; gap: 8px; align-items: center;">
                                <button class="btn btn-secondary btn-edit-lecture" data-lecture-id="${lecture.id}" 
                                        style="padding: 6px 12px; font-size: 12px; background: rgba(59, 130, 246, 0.1); 
                                               border: 1px solid rgba(59, 130, 246, 0.3); color: #3b82f6;" 
                                        title="Edytuj wykład">
                                    ✏️
                                </button>
                                <button class="btn btn-secondary btn-delete-lecture" data-lecture-id="${lecture.id}" 
                                        style="padding: 6px 12px; font-size: 12px; background: rgba(239, 68, 68, 0.1); 
                                               border: 1px solid rgba(239, 68, 68, 0.3); color: #ef4444;" 
                                        title="Usuń wykład">
                                    🗑️
                                </button>
                                <button class="btn btn-primary btn-open-lecture" data-lecture-id="${lecture.id}" style="padding: 8px 16px;">
                                    Otwórz
                                </button>
                            </div>
                        </div>
                    `).join('')}
                    </div>
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

    // Add event listeners to edit buttons
    document.querySelectorAll('.btn-edit-lecture').forEach(btn => {
        btn.addEventListener('click', (e) => {
            e.stopPropagation();
            const lectureId = btn.dataset.lectureId;
            console.log('Editing lecture:', lectureId);
            openEditLectureModal(lectureId);
        });
    });

    // Add event listeners to delete buttons
    document.querySelectorAll('.btn-delete-lecture').forEach(btn => {
        btn.addEventListener('click', (e) => {
            e.stopPropagation();
            const lectureId = btn.dataset.lectureId;
            console.log('Deleting lecture:', lectureId);
            openDeleteLectureModal(lectureId);
        });
    });

    // Initialize collapsible sections
    const allCollapsible = document.querySelectorAll('#lectures-list .collapsible-content');
    allCollapsible.forEach(section => {
        const sectionId = section.id;
        const isCollapsed = localStorage.getItem(`lecture-section-${sectionId}`) === 'collapsed';
        
        if (!isCollapsed) {
            // Set initial max-height for expanded sections
            setTimeout(() => {
                section.style.maxHeight = 'none';
            }, 100);
        }
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

// Toggle lecture section collapse/expand
window.toggleLectureSection = function(sectionId) {
    const section = document.getElementById(sectionId);
    const header = section.previousElementSibling;
    const icon = header.querySelector('.collapse-icon');
    
    if (section.style.maxHeight && section.style.maxHeight !== '0px') {
        // Collapse
        section.style.maxHeight = '0px';
        section.style.opacity = '0';
        section.style.marginBottom = '0';
        icon.style.transform = 'rotate(-90deg)';
        localStorage.setItem(`lecture-section-${sectionId}`, 'collapsed');
    } else {
        // Expand
        section.style.maxHeight = section.scrollHeight + 'px';
        section.style.opacity = '1';
        section.style.marginBottom = '';
        icon.style.transform = 'rotate(0deg)';
        localStorage.setItem(`lecture-section-${sectionId}`, 'expanded');
        
        // Auto-adjust after animations complete
        setTimeout(() => {
            if (section.style.maxHeight !== '0px') {
                section.style.maxHeight = 'none';
            }
        }, 300);
    }
};

// Collapse all lecture sections
function collapseAllLectures() {
    const container = document.getElementById('lectures-list');
    const allSections = container.querySelectorAll('.collapsible-content');
    
    allSections.forEach(section => {
        const header = section.previousElementSibling;
        const icon = header.querySelector('.collapse-icon');
        
        section.style.maxHeight = '0px';
        section.style.opacity = '0';
        section.style.marginBottom = '0';
        icon.style.transform = 'rotate(-90deg)';
        localStorage.setItem(`lecture-section-${section.id}`, 'collapsed');
    });
}

// Expand all lecture sections
function expandAllLectures() {
    const container = document.getElementById('lectures-list');
    const allSections = container.querySelectorAll('.collapsible-content');
    
    allSections.forEach(section => {
        const header = section.previousElementSibling;
        const icon = header.querySelector('.collapse-icon');
        
        section.style.maxHeight = section.scrollHeight + 'px';
        section.style.opacity = '1';
        section.style.marginBottom = '';
        icon.style.transform = 'rotate(0deg)';
        localStorage.setItem(`lecture-section-${section.id}`, 'expanded');
        
        // Auto-adjust after animations complete
        setTimeout(() => {
            if (section.style.maxHeight !== '0px') {
                section.style.maxHeight = 'none';
            }
        }, 300);
    });
}

// ============================================
// LECTURE MANAGEMENT
// ============================================

let currentEditingLectureId = null;

async function openEditLectureModal(lectureId) {
    try {
        const lecture = await db.getLecture(lectureId);
        if (!lecture) {
            console.error('Lecture not found:', lectureId);
            return;
        }

        currentEditingLectureId = lectureId;
        document.getElementById('input-edit-lecture-title').value = lecture.title;
        openModal('modal-edit-lecture');
    } catch (error) {
        console.error('Error opening edit modal:', error);
    }
}

async function handleEditLectureSubmit(e) {
    e.preventDefault();
    
    if (!currentEditingLectureId) {
        console.error('No lecture selected for editing');
        return;
    }

    try {
        const newTitle = document.getElementById('input-edit-lecture-title').value.trim();
        
        if (!newTitle) {
            alert('Tytuł wykładu nie może być pusty');
            return;
        }

        await db.updateLecture(currentEditingLectureId, { title: newTitle });
        
        // Close modal and refresh lectures list
        window.closeModal('modal-edit-lecture');
        currentEditingLectureId = null;
        
        // Refresh the lectures list
        if (currentTab === 'lectures') {
            await loadLectures();
        }
        
        console.log('Lecture updated successfully');
    } catch (error) {
        console.error('Error updating lecture:', error);
        alert('Wystąpił błąd podczas zapisywania zmian');
    }
}

let currentDeletingLectureId = null;

async function openDeleteLectureModal(lectureId) {
    try {
        const lecture = await db.getLecture(lectureId);
        if (!lecture) {
            console.error('Lecture not found:', lectureId);
            return;
        }

        currentDeletingLectureId = lectureId;
        document.getElementById('delete-lecture-title').textContent = lecture.title;
        openModal('modal-delete-lecture');
    } catch (error) {
        console.error('Error opening delete modal:', error);
    }
}

async function handleDeleteLecture() {
    if (!currentDeletingLectureId) {
        console.error('No lecture selected for deletion');
        return;
    }

    try {
        await db.deleteLecture(currentDeletingLectureId);
        
        // Close modal
        window.closeModal('modal-delete-lecture');
        currentDeletingLectureId = null;
        
        // Refresh the lectures list
        if (currentTab === 'lectures') {
            await loadLectures();
        }
        
        console.log('Lecture deleted successfully');
    } catch (error) {
        console.error('Error deleting lecture:', error);
        alert('Wystąpił błąd podczas usuwania wykładu');
    }
}

// Make functions available globally for debugging
window.openEditLectureModal = openEditLectureModal;
window.openDeleteLectureModal = openDeleteLectureModal;
window.handleEditLectureSubmit = handleEditLectureSubmit;
window.handleDeleteLecture = handleDeleteLecture;

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

    // Edit lecture form
    const editLectureForm = document.getElementById('form-edit-lecture');
    if (editLectureForm) {
        editLectureForm.addEventListener('submit', handleEditLectureSubmit);
    }

    // Delete lecture confirmation
    const confirmDeleteBtn = document.getElementById('btn-confirm-delete-lecture');
    if (confirmDeleteBtn) {
        confirmDeleteBtn.addEventListener('click', handleDeleteLecture);
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
    console.log('Type of lectureId:', typeof lectureId);
    console.log('window object exists:', typeof window !== 'undefined');
    
    // Set the current lecture ID directly to avoid any scope issues
    try {
        window.currentLectureId = lectureId;
        console.log('Current lecture ID set to:', lectureId);
        console.log('Verification - window.currentLectureId:', window.currentLectureId);
    } catch (error) {
        console.error('Error setting currentLectureId:', error);
        alert('❌ Błąd ustawiania ID wykładu: ' + error.message);
        return;
    }
    
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

// Make function available globally for event handlers
window.openLectureView = openLectureView;

function setupLectureViewListeners() {
    // Back button
    document.getElementById('btn-back-to-lectures').addEventListener('click', () => {
        window.currentLectureId = null;
        console.log('Current lecture ID reset to null');
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
        if (!window.currentLectureId) return;
        
        const lecture = await db.getLecture(window.currentLectureId);
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
            await db.updateLecture(window.currentLectureId, {
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
    
    // Generate notes with fact-checking
    document.getElementById('btn-generate-notes-with-fact-check').addEventListener('click', async () => {
        if (!window.currentLectureId) return;
        
        const lecture = await db.getLecture(window.currentLectureId);
        if (!lecture.transcription) {
            alert('❌ Brak transkrypcji do przetworzenia');
            return;
        }
        
        const btn = document.getElementById('btn-generate-notes-with-fact-check');
        btn.disabled = true;
        btn.textContent = '🔍 Sprawdzanie faktów...';
        
        try {
            const result = await ai.generateNotesWithFactCheck(lecture.transcription, (percent, message) => {
                btn.textContent = `🔍 ${message}`;
            });
            
            // Save to database with fact-check info
            await db.updateLecture(window.currentLectureId, {
                notes: result.formatted,
                aiNotes: {
                    formatted: result.formatted,
                    structured: result.structured,
                    summary: result.summary,
                    keyPoints: result.keyPoints,
                    questions: result.questions
                },
                factCheck: result.factCheck
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
            
            document.getElementById('lecture-notes-content').innerHTML = renderMarkdown(result.formatted);
            
            btn.textContent = '🔍✨ Z weryfikacją faktów';
            btn.disabled = false;
            
            // Show fact-check results
            showFactCheckResults(result.factCheck);
            
        } catch (error) {
            console.error('Error generating notes with fact-check:', error);
            alert(`❌ Błąd: ${error.message}`);
            btn.textContent = '🔍✨ Z weryfikacją faktów';
            btn.disabled = false;
        }
    });
    
    // Generate detailed note
    document.getElementById('btn-generate-detailed').addEventListener('click', async () => {
        if (!window.currentLectureId) return;
        
        const lecture = await db.getLecture(window.currentLectureId);
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
            
            await db.updateLecture(window.currentLectureId, { detailedNote });
            
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
        if (!window.currentLectureId) return;
        
        const lecture = await db.getLecture(window.currentLectureId);
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
            
            await db.updateLecture(window.currentLectureId, { shortNote });
            
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
        if (!window.currentLectureId) return;
        
        const lecture = await db.getLecture(window.currentLectureId);
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
            
            await db.updateLecture(window.currentLectureId, { keyPoints });
            
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
        if (!window.currentLectureId) return;
        
        const lecture = await db.getLecture(window.currentLectureId);
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
                    lectureId: window.currentLectureId
                });
            }
            
            // Reload flashcards
            const allFlashcards = await db.getFlashcardsByLecture(window.currentLectureId);
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
        if (!window.currentLectureId) return;
        
        const lecture = await db.getLecture(window.currentLectureId);
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
            await db.updateLecture(window.currentLectureId, { quiz });
            
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
        const lecture = await db.getLecture(window.currentLectureId);
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
    
    // Update current time display
    updateCurrentTimeDisplay();
    
    if (events.length === 0) {
        container.innerHTML = `
            <div class="card" style="width: 100%; text-align: center; padding: 60px; margin: 0;">
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
    
    // Sort events within each day by start time
    Object.keys(eventsByDay).forEach(day => {
        eventsByDay[day].sort((a, b) => a.startTime.localeCompare(b.startTime));
    });
    
    // Get current day of week (0 = Sunday, 1 = Monday, etc.)
    const currentDay = new Date().getDay();
    
    // Generate HTML for each day in one row (Mon-Fri only)
    let html = '';
    for (let day = 1; day <= 5; day++) { // Mon-Fri only
        const dayEvents = eventsByDay[day] || [];
        const isToday = day === currentDay;
        
        html += `
            <div class="card schedule-day ${isToday ? 'today' : ''}" style="
                width: calc(20% - 16px); 
                min-width: 180px;
                max-width: 240px;
                padding: 0; 
                overflow: hidden;
                flex-shrink: 0;
                ${isToday ? 'box-shadow: 0 0 20px rgba(99, 102, 241, 0.3); border: 2px solid var(--primary);' : ''}
            ">
                <div style="
                    background: ${isToday ? 'var(--primary)' : 'var(--text-secondary)'}; 
                    color: white; 
                    padding: 12px 15px; 
                    font-weight: 700; 
                    font-size: 16px;
                    position: relative;
                ">
                    ${dayNames[day]}
                    ${isToday ? '<span style="position: absolute; right: 12px; top: 50%; transform: translateY(-50%);">●</span>' : ''}
                </div>
                <div style="padding: 12px; position: relative; min-height: 180px;">
                    ${dayEvents.length === 0 ? 
                        '<div style="color: var(--text-secondary); text-align: center; padding: 30px 0; font-size: 13px;">Brak zajęć</div>' :
                        generateDayScheduleWithBreaks(dayEvents, subjects, isToday)
                    }
                </div>
            </div>
        `;
    }
    
    container.innerHTML = html;
}

function generateDayScheduleWithBreaks(dayEvents, subjects, isToday) {
    let html = '';
    const now = new Date();
    const currentMinutes = now.getHours() * 60 + now.getMinutes();
    
    for (let i = 0; i < dayEvents.length; i++) {
        const event = dayEvents[i];
        const subject = subjects.find(s => s.id === event.subjectId);
        const typeEmoji = {
            'lecture': '📖',
            'exercise': '✏️',
            'lab': '🔬',
            'seminar': '💬',
            'exam': '📝',
            'other': '📌'
        };
        
        // Calculate time positions for timeline
        const startMinutes = parseTimeToMinutes(event.startTime);
        const endMinutes = parseTimeToMinutes(event.endTime);
        const duration = endMinutes - startMinutes;
        
        // Add break time if there's a gap between events
        if (i > 0) {
            const prevEvent = dayEvents[i - 1];
            const prevEndMinutes = parseTimeToMinutes(prevEvent.endTime);
            const breakDuration = startMinutes - prevEndMinutes;
            
            if (breakDuration > 0) {
                html += `
                    <div style="
                        margin: 8px 0; 
                        padding: 8px 12px; 
                        background: rgba(255, 193, 7, 0.1); 
                        border-radius: 6px; 
                        text-align: center;
                        font-size: 13px;
                        color: var(--text-secondary);
                        border-left: 3px solid #ffc107;
                    ">
                        ⏰ Przerwa ${formatMinutesToTime(breakDuration)}
                    </div>
                `;
            }
        }
        
        // Check if event is currently active
        const isActive = isToday && currentMinutes >= startMinutes && currentMinutes <= endMinutes;
        
        html += `
            <div style="
                margin-bottom: 12px; 
                padding: 12px; 
                background: ${isActive ? 'rgba(34, 197, 94, 0.1)' : 'var(--bg-dark)'}; 
                border-radius: 8px; 
                border-left: 4px solid ${subject?.color || 'var(--primary)'};
                position: relative;
                ${isActive ? 'border: 2px solid #22c55e;' : ''}
            ">
                <div style="display: flex; justify-content: space-between; align-items: start; margin-bottom: 8px;">
                    <div style="flex: 1;">
                        <div style="display: flex; align-items: center; gap: 8px; margin-bottom: 4px;">
                            <span style="font-size: 18px;">${typeEmoji[event.type] || '📌'}</span>
                            <span style="font-weight: 600; font-size: 16px; color: ${subject?.color || 'var(--primary)'};">
                                ${event.title || subject?.name || 'Zajęcia'}
                            </span>
                            ${isActive ? '<span style="color: #22c55e; font-weight: bold; font-size: 12px;">● NA ŻYWO</span>' : ''}
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
                ${isToday ? generateTimelineBar(startMinutes, endMinutes, currentMinutes) : ''}
            </div>
        `;
    }
    
    return html;
}

function generateTimelineBar(startMinutes, endMinutes, currentMinutes) {
    const duration = endMinutes - startMinutes;
    const elapsed = Math.max(0, Math.min(duration, currentMinutes - startMinutes));
    const progress = duration > 0 ? (elapsed / duration) * 100 : 0;
    
    return `
        <div style="
            margin-top: 12px; 
            height: 4px; 
            background: rgba(99, 102, 241, 0.2); 
            border-radius: 2px; 
            position: relative;
            overflow: hidden;
        ">
            <div style="
                height: 100%; 
                background: var(--primary); 
                width: ${progress}%; 
                transition: width 0.3s ease;
                border-radius: 2px;
            "></div>
            <div style="
                position: absolute; 
                top: -2px; 
                left: ${progress}%; 
                width: 8px; 
                height: 8px; 
                background: var(--primary); 
                border-radius: 50%; 
                transform: translateX(-50%);
                box-shadow: 0 0 6px rgba(99, 102, 241, 0.5);
            "></div>
        </div>
    `;
}

function parseTimeToMinutes(timeString) {
    const [hours, minutes] = timeString.split(':').map(Number);
    return hours * 60 + minutes;
}

function formatMinutesToTime(minutes) {
    const hours = Math.floor(minutes / 60);
    const mins = minutes % 60;
    if (hours > 0) {
        return `${hours}h ${mins}min`;
    }
    return `${mins}min`;
}

function updateCurrentTimeDisplay() {
    const now = new Date();
    const options = { 
        weekday: 'long', 
        year: 'numeric', 
        month: 'long', 
        day: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
        second: '2-digit'
    };
    
    const timeString = now.toLocaleDateString('pl-PL', options);
    const display = document.getElementById('current-date-time');
    if (display) {
        display.textContent = timeString;
    }
    
    // Update every second
    setTimeout(updateCurrentTimeDisplay, 1000);
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
// STUDY MODE FUNCTIONALITY
// ============================================

let currentStudySession = {
    cards: [],
    currentIndex: 0,
    mode: '',
    correct: 0,
    incorrect: 0,
    incorrectCards: [], // Fiszki które były błędne i wymagają powtórki
    totalCards: 0, // Całkowita liczba fiszek w sesji (dla statystyk)
    round: 1, // Numer rundy (1, 2, 3...)
    subjectId: '',
    lectureId: '',
    startTime: null
};

// Open study mode and initialize selection
async function openStudyMode() {
    switchTab('study-mode');
    
    // Reset study session for a fresh start
    currentStudySession = {
        cards: [],
        currentIndex: 0,
        correct: 0,
        incorrect: 0,
        incorrectCards: [],
        totalCards: 0,
        round: 1,
        startTime: null,
        mode: '',
        subjectId: '',
        lectureId: ''
    };
    
    // Wait a bit for tab to load, then initialize study selection
    setTimeout(async () => {
        await initializeStudySelection();
    }, 100);
}

// Initialize study selection interface
async function initializeStudySelection() {
    const subjects = await db.listSubjects();
    const subjectSelect = document.getElementById('study-subject-select');
    const lectureSelect = document.getElementById('study-lecture-select');
    const startBtn = document.getElementById('btn-start-study');
    
    // Check if all required elements exist
    if (!subjectSelect || !lectureSelect || !startBtn) {
        console.error('Study mode elements not found:', {
            subjectSelect: !!subjectSelect,
            lectureSelect: !!lectureSelect, 
            startBtn: !!startBtn
        });
        return;
    }
    
    // Reset interface
    showStudyStep('study-selection');
    
    // Populate subjects
    subjectSelect.innerHTML = '<option value="">Wybierz przedmiot...</option>';
    subjects.forEach(subject => {
        const option = document.createElement('option');
        option.value = subject.id;
        option.textContent = subject.name;
        subjectSelect.appendChild(option);
    });
    
    // Handle subject change
    subjectSelect.onchange = async () => {
        const subjectId = subjectSelect.value;
        lectureSelect.innerHTML = '<option value="">Wybierz wykład...</option>';
        lectureSelect.disabled = !subjectId;
        
        if (subjectId) {
            const lectures = await db.listLectures();
            const subjectLectures = lectures.filter(l => l.subjectId === subjectId);
            
            // Add "All lectures" option
            const allOption = document.createElement('option');
            allOption.value = 'all';
            allOption.textContent = 'Wszystkie wykłady z tego przedmiotu';
            lectureSelect.appendChild(allOption);
            
            subjectLectures.forEach(lecture => {
                const option = document.createElement('option');
                option.value = lecture.id;
                option.textContent = lecture.title;
                lectureSelect.appendChild(option);
            });
            
            lectureSelect.disabled = false;
        }
        
        checkStartButton();
    };
    
    // Handle lecture change
    lectureSelect.onchange = checkStartButton;
    
    // Handle study mode selection
    document.querySelectorAll('.study-mode-btn').forEach(btn => {
        btn.onclick = () => {
            document.querySelectorAll('.study-mode-btn').forEach(b => b.classList.remove('selected'));
            btn.classList.add('selected');
            checkStartButton();
        };
    });
    
    // Handle start study
    if (startBtn) {
        startBtn.onclick = startStudySession;
    }
    
    function checkStartButton() {
        const hasSubject = subjectSelect.value;
        const hasLecture = lectureSelect.value;
        const hasMode = document.querySelector('.study-mode-btn.selected');
        
        startBtn.disabled = !(hasSubject && hasLecture && hasMode);
    }
}

// Start study session
async function startStudySession() {
    const subjectId = document.getElementById('study-subject-select').value;
    const lectureId = document.getElementById('study-lecture-select').value;
    const mode = document.querySelector('.study-mode-btn.selected').dataset.mode;
    
    // Get flashcards for selected subject/lecture
    const allFlashcards = await db.listFlashcards();
    let studyCards = [];
    
    if (lectureId === 'all') {
        studyCards = allFlashcards.filter(card => card.subjectId === subjectId);
    } else {
        studyCards = allFlashcards.filter(card => 
            card.subjectId === subjectId && card.lectureId === lectureId
        );
    }
    
    if (studyCards.length === 0) {
        alert('Brak fiszek do nauki dla wybranego materiału!');
        return;
    }
    
    console.log('Starting study session with', studyCards.length, 'cards');
    console.log('First card structure:', studyCards[0]);
    
    // Shuffle cards
    studyCards = shuffleArray(studyCards);
    
    // Initialize session
    currentStudySession = {
        cards: studyCards,
        currentIndex: 0,
        mode: mode,
        correct: 0,
        incorrect: 0,
        incorrectCards: [],
        totalCards: studyCards.length, // Zapisz oryginalną liczbę fiszek
        round: 1,
        subjectId: subjectId,
        lectureId: lectureId,
        startTime: Date.now()
    };
    
    // Start study session based on mode
    showStudyStep('study-session');
    
    switch (mode) {
        case 'flashcards':
            startFlashcardMode();
            break;
        case 'quiz':
            startQuizMode();
            break;
        case 'memory':
            startMemoryMode();
            break;
        case 'typing':
            startTypingMode();
            break;
    }
}

// Show specific study step
function showStudyStep(stepId) {
    document.querySelectorAll('.study-step').forEach(step => {
        step.classList.remove('active');
    });
    
    const targetStep = document.getElementById(stepId);
    if (targetStep) {
        targetStep.classList.add('active');
    } else {
        console.error('Study step not found:', stepId);
    }
}

// Flashcard mode implementation
function startFlashcardMode() {
    const sessionContainer = document.getElementById('study-session');
    const session = currentStudySession;
    const currentCard = session.cards[session.currentIndex];
    
    console.log('startFlashcardMode - sessionContainer:', sessionContainer);
    console.log('startFlashcardMode - cards:', session.cards.length, 'index:', session.currentIndex, 'currentCard:', currentCard);
    
    // Sprawdź czy kontener istnieje
    if (!sessionContainer) {
        console.error('study-session container not found');
        return;
    }
    
    // Sprawdź czy karta istnieje
    if (!currentCard) {
        console.error('No current card available at index', session.currentIndex);
        showStudyResults();
        return;
    }
    
    sessionContainer.innerHTML = `
        <div class="study-progress">
            <div class="study-progress-bar">
                <div class="study-progress-fill" style="width: ${(session.currentIndex / session.cards.length) * 100}%"></div>
            </div>
            <div class="study-stats">
                <span>Fiszka ${session.currentIndex + 1} z ${session.cards.length}</span>
                <span>Poprawne: ${session.correct} | Błędne: ${session.incorrect}</span>
            </div>
        </div>
        
        <div class="study-flashcard" id="study-card" onclick="flipStudyCard()">
            <div class="study-flashcard-inner">
                <div class="study-flashcard-front">
                    <div class="study-flashcard-content">
                        ${currentCard.front || currentCard.question || 'Brak pytania'}
                    </div>
                </div>
                <div class="study-flashcard-back">
                    <div class="study-flashcard-content">
                        ${currentCard.back || currentCard.answer || 'Brak odpowiedzi'}
                    </div>
                </div>
            </div>
        </div>
        
        <div class="study-controls">
            <button class="study-btn incorrect" onclick="markCard(false)">
                ❌ Nie umiem
            </button>
            <button class="study-btn" onclick="flipStudyCard()">
                🔄 Przewróć
            </button>
            <button class="study-btn correct" onclick="markCard(true)">
                ✅ Umiem
            </button>
        </div>
        
        <div style="text-align: center; margin-top: 20px;">
            <button class="study-btn" onclick="endStudySession()">
                🏁 Zakończ sesję
            </button>
        </div>
    `;
}

// Quiz mode implementation
function startQuizMode() {
    const sessionContainer = document.getElementById('study-session');
    const session = currentStudySession;
    const currentCard = session.cards[session.currentIndex];
    
    // Sprawdź czy karta istnieje
    if (!currentCard) {
        console.error('No current card available for quiz at index', session.currentIndex);
        showStudyResults();
        return;
    }
    
    // Generate wrong answers from other cards
    const otherCards = session.cards.filter((_, index) => index !== session.currentIndex);
    const wrongAnswers = shuffleArray(otherCards).slice(0, 3).map(card => card.back || card.answer);
    const correctAnswer = currentCard.back || currentCard.answer;
    
    // Mix answers
    const allAnswers = shuffleArray([correctAnswer, ...wrongAnswers]);
    
    sessionContainer.innerHTML = `
        <div class="study-progress">
            <div class="study-progress-bar">
                <div class="study-progress-fill" style="width: ${(session.currentIndex / session.cards.length) * 100}%"></div>
            </div>
            <div class="study-stats">
                <span>Pytanie ${session.currentIndex + 1} z ${session.cards.length}</span>
                <span>Poprawne: ${session.correct} | Błędne: ${session.incorrect}</span>
            </div>
        </div>
        
        <div class="study-quiz-question">
            <h3>${currentCard.front || currentCard.question || 'Brak pytania'}</h3>
            <div class="study-quiz-answers">
                ${allAnswers.map((answer, index) => `
                    <button class="study-quiz-answer" onclick="selectQuizAnswer(this, '${answer}', '${correctAnswer}')">
                        ${answer}
                    </button>
                `).join('')}
            </div>
        </div>
        
        <div class="study-controls">
            <button class="study-btn" onclick="endStudySession()">
                🏁 Zakończ sesję
            </button>
        </div>
    `;
}

// Memory mode implementation
function startMemoryMode() {
    const sessionContainer = document.getElementById('study-session');
    const session = currentStudySession;
    const currentCard = session.cards[session.currentIndex];
    
    // Sprawdź czy karta istnieje
    if (!currentCard) {
        console.error('No current card available for memory mode at index', session.currentIndex);
        showStudyResults();
        return;
    }
    
    sessionContainer.innerHTML = `
        <div class="study-progress">
            <div class="study-progress-bar">
                <div class="study-progress-fill" style="width: ${(session.currentIndex / session.cards.length) * 100}%"></div>
            </div>
            <div class="study-stats">
                <span>Fiszka ${session.currentIndex + 1} z ${session.cards.length}</span>
                <span>Poprawne: ${session.correct} | Błędne: ${session.incorrect}</span>
            </div>
        </div>
        
        <div class="study-quiz-question">
            <h3>${currentCard.front || currentCard.question || 'Brak pytania'}</h3>
            <input type="text" class="study-memory-input" id="memory-input" placeholder="Wpisz swoją odpowiedź...">
        </div>
        
        <div class="study-controls">
            <button class="study-btn primary" onclick="checkMemoryAnswer()">
                ✓ Sprawdź odpowiedź
            </button>
            <button class="study-btn" onclick="endStudySession()">
                🏁 Zakończ sesję
            </button>
        </div>
    `;
    
    // Focus on input
    setTimeout(() => {
        document.getElementById('memory-input').focus();
    }, 100);
}

// Typing mode (similar to memory but stricter checking)
function startTypingMode() {
    startMemoryMode(); // Same interface, different checking logic
}

// Global functions for study interactions
window.flipStudyCard = function() {
    const card = document.getElementById('study-card');
    card.classList.toggle('flipped');
};

window.markCard = function(isCorrect) {
    const session = currentStudySession;
    const currentCard = session.cards[session.currentIndex];
    
    console.log('markCard called:', isCorrect ? 'correct' : 'incorrect', 'card:', currentCard);
    
    if (isCorrect) {
        session.correct++;
    } else {
        session.incorrect++;
        // Dodaj fiszkę do listy błędnych (sprawdzaj po content zamiast ID)
        const cardExists = session.incorrectCards.find(card => 
            (card.front === currentCard.front && card.back === currentCard.back) ||
            (card.question === currentCard.question && card.answer === currentCard.answer)
        );
        
        if (!cardExists) {
            session.incorrectCards.push(currentCard);
            console.log('Added card to incorrect list. Total incorrect cards:', session.incorrectCards.length);
            console.log('Current incorrect cards:', session.incorrectCards);
        } else {
            console.log('Card already in incorrect list');
        }
    }
    
    nextCard();
};

window.selectQuizAnswer = function(button, selectedAnswer, correctAnswer) {
    // Disable all buttons
    document.querySelectorAll('.study-quiz-answer').forEach(btn => {
        btn.disabled = true;
        if (btn.textContent.trim() === correctAnswer) {
            btn.classList.add('correct');
        } else if (btn === button && selectedAnswer !== correctAnswer) {
            btn.classList.add('incorrect');
        }
    });
    
    // Mark as correct or incorrect
    const isCorrect = selectedAnswer === correctAnswer;
    const currentCard = currentStudySession.cards[currentStudySession.currentIndex];
    
    if (isCorrect) {
        currentStudySession.correct++;
    } else {
        currentStudySession.incorrect++;
        // Dodaj fiszkę do listy błędnych
        if (!currentStudySession.incorrectCards.find(card => card.id === currentCard.id)) {
            currentStudySession.incorrectCards.push(currentCard);
        }
    }
    
    // Show next card after delay
    setTimeout(nextCard, 1500);
};

window.checkMemoryAnswer = function() {
    const input = document.getElementById('memory-input');
    const userAnswer = input.value.trim().toLowerCase();
    const correctAnswer = (currentStudySession.cards[currentStudySession.currentIndex].back || 
                          currentStudySession.cards[currentStudySession.currentIndex].answer || '').toLowerCase();
    
    // Simple similarity check (you can make this more sophisticated)
    const isCorrect = currentStudySession.mode === 'typing' ? 
        userAnswer === correctAnswer : 
        correctAnswer.includes(userAnswer) || userAnswer.includes(correctAnswer);
    
    const currentCard = currentStudySession.cards[currentStudySession.currentIndex];
    
    if (isCorrect) {
        currentStudySession.correct++;
        input.style.borderColor = '#10b981';
        input.style.background = 'rgba(16, 185, 129, 0.1)';
    } else {
        currentStudySession.incorrect++;
        input.style.borderColor = '#ef4444';
        input.style.background = 'rgba(239, 68, 68, 0.1)';
        // Dodaj fiszkę do listy błędnych
        if (!currentStudySession.incorrectCards.find(card => card.id === currentCard.id)) {
            currentStudySession.incorrectCards.push(currentCard);
        }
    }
    
    // Show correct answer
    input.value = currentStudySession.cards[currentStudySession.currentIndex].back || 
                  currentStudySession.cards[currentStudySession.currentIndex].answer;
    input.disabled = true;
    
    setTimeout(nextCard, 2000);
};

window.endStudySession = function() {
    showStudyResults();
};

// Move to next card
function nextCard() {
    const session = currentStudySession;
    session.currentIndex++;
    
    if (session.currentIndex >= session.cards.length) {
        // Sprawdź czy są błędne fiszki do powtórki
        if (session.incorrectCards.length > 0) {
            showRetryResults();
        } else {
            showStudyResults();
        }
    } else {
        // Continue with current mode
        switch (session.mode) {
            case 'flashcards':
                startFlashcardMode();
                break;
            case 'quiz':
                startQuizMode();
                break;
            case 'memory':
            case 'typing':
                startMemoryMode();
                break;
        }
    }
}

// Show retry results when there are incorrect cards
function showRetryResults() {
    const session = currentStudySession;
    const accuracy = Math.round((session.correct / (session.correct + session.incorrect)) * 100) || 0;
    const incorrectCount = session.incorrectCards.length;
    
    showStudyStep('study-results');
    
    const resultsContainer = document.getElementById('study-results');
    resultsContainer.innerHTML = `
        <div class="study-results-summary">
            <h2 style="margin-bottom: 20px;">🔄 Runda ${session.round} zakończona</h2>
            <div class="study-results-score">${accuracy}%</div>
            <p style="font-size: 18px; color: var(--text-secondary);">
                Ukończyłeś rundę ${session.round}! Masz ${incorrectCount} ${incorrectCount === 1 ? 'fiszkę' : incorrectCount < 5 ? 'fiszki' : 'fiszek'} do powtórki.
            </p>
            
            <div class="study-results-details">
                <div class="study-result-stat">
                    <div class="study-result-stat-value" style="color: var(--success);">${session.correct}</div>
                    <div class="study-result-stat-label">Poprawne</div>
                </div>
                <div class="study-result-stat">
                    <div class="study-result-stat-value" style="color: #ef4444;">${session.incorrect}</div>
                    <div class="study-result-stat-label">Błędne</div>
                </div>
                <div class="study-result-stat">
                    <div class="study-result-stat-value" style="color: var(--accent);">${incorrectCount}</div>
                    <div class="study-result-stat-label">Do powtórki</div>
                </div>
                <div class="study-result-stat">
                    <div class="study-result-stat-value" style="color: var(--primary);">${session.round}</div>
                    <div class="study-result-stat-label">Runda</div>
                </div>
            </div>
        </div>
        
        <div class="study-controls">
            <button class="study-btn primary" id="btn-retry-incorrect">
                🎯 Powtórz błędne fiszki
            </button>
            <button class="study-btn" id="btn-finish-session">
                ✅ Zakończ sesję
            </button>
            <button class="study-btn" id="btn-back-to-flashcards-retry">
                📚 Powrót do fiszek
            </button>
        </div>
    `;
    
    // Add event listeners for the buttons
    document.getElementById('btn-retry-incorrect').addEventListener('click', function() {
        // Dezaktywuj przycisk żeby zapobiec wielokrotnemu klikaniu
        this.disabled = true;
        this.textContent = '🔄 Przygotowuję...';
        startRetryRound();
    });
    document.getElementById('btn-finish-session').addEventListener('click', showStudyResults);
    document.getElementById('btn-back-to-flashcards-retry').addEventListener('click', () => switchTab('flashcards'));
}

// Start a new round with only incorrect cards
function startRetryRound() {
    const session = currentStudySession;
    
    console.log('Starting retry round with', session.incorrectCards.length, 'cards');
    
    // Sprawdź czy są fiszki do powtórki
    if (session.incorrectCards.length === 0) {
        console.error('No incorrect cards to retry');
        showStudyResults();
        return;
    }
    
    // Przygotuj nową rundę z błędnymi fiszkami
    session.cards = [...session.incorrectCards]; // Kopiuj błędne fiszki
    
    // Dodatkowe sprawdzenie czy kopia się udała
    if (session.cards.length === 0) {
        console.error('Failed to copy incorrect cards');
        showStudyResults();
        return;
    }
    
    session.currentIndex = 0;
    session.correct = 0; // Reset statystyk dla nowej rundy
    session.incorrect = 0;
    session.round++;
    
    // Pomieszaj fiszki
    session.cards = shuffleArray(session.cards);
    
    console.log('Retry round prepared with', session.cards.length, 'cards, current index:', session.currentIndex);
    
    // Wyczyść listę błędnych DOPIERO po przygotowaniu nowej rundy
    session.incorrectCards = [];
    
    console.log('About to start retry round with mode:', session.mode);
    
    // Przełącz na study-session step
    showStudyStep('study-session');
    
    // Rozpocznij nową rundę w tym samym trybie
    switch (session.mode) {
        case 'flashcards':
            console.log('Starting flashcard mode for retry');
            startFlashcardMode();
            break;
        case 'quiz':
            console.log('Starting quiz mode for retry');
            startQuizMode();
            break;
        case 'memory':
        case 'typing':
            console.log('Starting memory mode for retry');
            startMemoryMode();
            break;
        default:
            console.error('Unknown study mode:', session.mode);
            showStudyResults();
            break;
    }
    
    console.log('startRetryRound completed successfully');
}

// Show study results
function showStudyResults() {
    const session = currentStudySession;
    const totalCorrect = session.correct;
    const totalIncorrect = session.incorrect;
    const accuracy = Math.round((totalCorrect / (totalCorrect + totalIncorrect)) * 100) || 0;
    const duration = Math.round((Date.now() - session.startTime) / 1000);
    const masteredCards = session.totalCards - session.incorrectCards.length;
    const roundsCompleted = session.round;
    
    showStudyStep('study-results');
    
    const resultsContainer = document.getElementById('study-results');
    resultsContainer.innerHTML = `
        <div class="study-results-summary">
            <h2 style="margin-bottom: 20px;">🎉 Sesja nauki zakończona!</h2>
            <div class="study-results-score">${accuracy}%</div>
            <p style="font-size: 18px; color: var(--text-secondary);">
                Gratulacje! Opanowałeś ${masteredCards} z ${session.totalCards} fiszek${roundsCompleted > 1 ? ` w ${roundsCompleted} rundach` : ''}!
            </p>
            
            <div class="study-results-details">
                <div class="study-result-stat">
                    <div class="study-result-stat-value" style="color: var(--success);">${masteredCards}</div>
                    <div class="study-result-stat-label">Opanowane</div>
                </div>
                <div class="study-result-stat">
                    <div class="study-result-stat-value" style="color: var(--primary);">${session.totalCards}</div>
                    <div class="study-result-stat-label">Łącznie</div>
                </div>
                <div class="study-result-stat">
                    <div class="study-result-stat-value" style="color: var(--accent);">${roundsCompleted}</div>
                    <div class="study-result-stat-label">${roundsCompleted === 1 ? 'Runda' : 'Rundy'}</div>
                </div>
                <div class="study-result-stat">
                    <div class="study-result-stat-value" style="color: var(--primary);">${session.cards.length}</div>
                    <div class="study-result-stat-label">Łącznie</div>
                </div>
                <div class="study-result-stat">
                    <div class="study-result-stat-value" style="color: var(--secondary);">${Math.floor(duration / 60)}:${(duration % 60).toString().padStart(2, '0')}</div>
                    <div class="study-result-stat-label">Czas</div>
                </div>
            </div>
        </div>
        
        <div class="study-controls">
            <button class="study-btn primary" id="btn-study-again">
                🔄 Ucz się ponownie
            </button>
            <button class="study-btn" id="btn-back-to-flashcards-results">
                📚 Powrót do fiszek
            </button>
        </div>
    `;
    
    // Add event listeners for the buttons
    document.getElementById('btn-study-again').addEventListener('click', openStudyMode);
    document.getElementById('btn-back-to-flashcards-results').addEventListener('click', () => switchTab('flashcards'));
}

// Utility function to shuffle array
function shuffleArray(array) {
    const shuffled = [...array];
    for (let i = shuffled.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
    }
    return shuffled;
}

// Show fact-check results modal
function showFactCheckResults(factCheck) {
    const stats = factCheck.stats;
    const results = factCheck.results;
    const corrections = factCheck.corrections;
    
    let modalHtml = `
        <div class="modal" id="fact-check-modal" style="display: flex;">
            <div class="modal-content" style="max-width: 800px; max-height: 80vh; overflow-y: auto;">
                <div class="modal-header">
                    <h2>🔍 Wyniki weryfikacji faktów</h2>
                    <button onclick="closeModal('fact-check-modal')" class="modal-close">&times;</button>
                </div>
                <div class="modal-body">
                    <div class="fact-check-summary" style="background: var(--bg-secondary); padding: 20px; border-radius: 10px; margin-bottom: 20px;">
                        <h3>📊 Podsumowanie</h3>
                        <div style="display: grid; grid-template-columns: repeat(auto-fit, minmax(200px, 1fr)); gap: 15px; margin-top: 15px;">
                            <div class="stat-item">
                                <div class="stat-value">${stats.verified}/${stats.total}</div>
                                <div class="stat-label">Zweryfikowane fakty</div>
                            </div>
                            <div class="stat-item">
                                <div class="stat-value">${(stats.confidence * 100).toFixed(1)}%</div>
                                <div class="stat-label">Pewność weryfikacji</div>
                            </div>
                            <div class="stat-item">
                                <div class="stat-value">${stats.changes}</div>
                                <div class="stat-label">Dokonane poprawki</div>
                            </div>
                        </div>
                    </div>`;
    
    // Show corrections if any
    if (corrections.hasChanges && corrections.changes.length > 0) {
        modalHtml += `
                    <div class="fact-check-corrections" style="margin-bottom: 20px;">
                        <h3>✏️ Dokonane poprawki</h3>
                        <div style="background: #fff3cd; color: #856404; border: 1px solid #ffeaa7; border-radius: 8px; padding: 15px;">
                            ${corrections.changes.map(change => `
                                <div style="margin-bottom: 10px; padding: 10px; background: #f8f9fa; color: #2d3748; border-radius: 5px;">
                                    <strong>${change.type === 'name' ? 'Nazwa' : change.type === 'date' ? 'Data' : 'Miejsce'}:</strong><br>
                                    <span style="color: #d63031; text-decoration: line-through;">"${change.original}"</span> → 
                                    <span style="color: #00b894; font-weight: bold;">"${change.corrected}"</span><br>
                                    <small style="color: #636e72;">Pewność: ${(change.confidence * 100).toFixed(0)}% | Źródło: ${change.source}</small>
                                </div>
                            `).join('')}
                        </div>
                    </div>`;
    }
    
    // Show verified names
    if (results.names && results.names.length > 0) {
        modalHtml += `
                    <div class="fact-check-names" style="margin-bottom: 20px;">
                        <h3>👤 Weryfikowane imiona i nazwiska</h3>
                        <div style="display: grid; gap: 10px;">
                            ${results.names.map(name => `
                                <div class="fact-item ${name.verified ? 'verified' : 'unverified'}" style="
                                    display: flex; justify-content: space-between; align-items: center;
                                    padding: 10px; border-radius: 5px; border: 1px solid;
                                    ${name.verified ? 'background: #d4edda; border-color: #c3e6cb;' : 'background: #f8d7da; border-color: #f5c6cb;'}
                                ">
                                    <span><strong>${name.name}</strong></span>
                                    <div style="display: flex; align-items: center; gap: 10px;">
                                        <span style="font-size: 12px; color: #6c757d;">
                                            ${(name.confidence * 100).toFixed(0)}% pewności
                                        </span>
                                        <span style="font-size: 18px;">
                                            ${name.verified ? '✅' : '❓'}
                                        </span>
                                    </div>
                                </div>
                                ${name.info && name.info.definition ? `
                                    <div style="padding: 10px; background: #f8f9fa; border-radius: 5px; margin-bottom: 10px; font-size: 14px;">
                                        ${name.info.definition}
                                    </div>
                                ` : ''}
                            `).join('')}
                        </div>
                    </div>`;
    }
    
    // Show verified dates
    if (results.dates && results.dates.length > 0) {
        modalHtml += `
                    <div class="fact-check-dates" style="margin-bottom: 20px;">
                        <h3>📅 Weryfikowane daty</h3>
                        <div style="display: grid; gap: 10px;">
                            ${results.dates.map(date => `
                                <div class="fact-item ${date.verified ? 'verified' : 'unverified'}" style="
                                    display: flex; justify-content: space-between; align-items: center;
                                    padding: 10px; border-radius: 5px; border: 1px solid;
                                    ${date.verified ? 'background: #d4edda; border-color: #c3e6cb;' : 'background: #f8d7da; border-color: #f5c6cb;'}
                                ">
                                    <span><strong>${date.date}</strong></span>
                                    <div style="display: flex; align-items: center; gap: 10px;">
                                        <span style="font-size: 12px; color: #6c757d;">
                                            ${(date.confidence * 100).toFixed(0)}% pewności
                                        </span>
                                        <span style="font-size: 18px;">
                                            ${date.verified ? '✅' : '❓'}
                                        </span>
                                    </div>
                                </div>
                            `).join('')}
                        </div>
                    </div>`;
    }
    
    // Show verified places
    if (results.places && results.places.length > 0) {
        modalHtml += `
                    <div class="fact-check-places" style="margin-bottom: 20px;">
                        <h3>🏙️ Weryfikowane miejsca</h3>
                        <div style="display: grid; gap: 10px;">
                            ${results.places.map(place => `
                                <div class="fact-item ${place.verified ? 'verified' : 'unverified'}" style="
                                    display: flex; justify-content: space-between; align-items: center;
                                    padding: 10px; border-radius: 5px; border: 1px solid;
                                    ${place.verified ? 'background: #d4edda; border-color: #c3e6cb;' : 'background: #f8d7da; border-color: #f5c6cb;'}
                                ">
                                    <span><strong>${place.place}</strong></span>
                                    <div style="display: flex; align-items: center; gap: 10px;">
                                        <span style="font-size: 12px; color: #6c757d;">
                                            ${(place.confidence * 100).toFixed(0)}% pewności
                                        </span>
                                        <span style="font-size: 18px;">
                                            ${place.verified ? '✅' : '❓'}
                                        </span>
                                    </div>
                                </div>
                                ${place.info && place.info.abstract ? `
                                    <div style="padding: 10px; background: #f8f9fa; border-radius: 5px; margin-bottom: 10px; font-size: 14px;">
                                        ${place.info.abstract.substring(0, 200)}${place.info.abstract.length > 200 ? '...' : ''}
                                    </div>
                                ` : ''}
                            `).join('')}
                        </div>
                    </div>`;
    }
    
    modalHtml += `
                    <div style="text-align: center; margin-top: 20px;">
                        <button class="btn btn-primary" onclick="closeModal('fact-check-modal')">
                            Zamknij
                        </button>
                    </div>
                </div>
            </div>
        </div>`;
    
    // Remove existing modal if any
    const existingModal = document.getElementById('fact-check-modal');
    if (existingModal) {
        existingModal.remove();
    }
    
    // Add modal to body
    document.body.insertAdjacentHTML('beforeend', modalHtml);
    
    // Add CSS for stat items
    const style = document.createElement('style');
    style.textContent = `
        .stat-item {
            text-align: center;
        }
        .stat-value {
            font-size: 24px;
            font-weight: bold;
            color: var(--primary-color);
        }
        .stat-label {
            font-size: 14px;
            color: var(--text-secondary);
            margin-top: 5px;
        }
    `;
    document.head.appendChild(style);
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

// Make functions globally accessible for inline onclick handlers
window.openStudyMode = openStudyMode;
window.switchTab = switchTab;
window.startRetryRound = startRetryRound;
// Note: Other functions (deleteSubject, toggleFlashcardSection, etc.) are already defined as window.function above

console.log('✅ App.js loaded');
