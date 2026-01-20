// Student Assistant - Main Application
// Version 2.0 - Modular Architecture
// CACHE BUSTER: 2025-10-06-20:00 - Fixed currentLectureId issue

import * as db from './modules/database.js';
import * as settings from './modules/settings.js';
import * as transcription from './modules/transcription.js';
import * as ai from './modules/ai.js';
import * as documentProcessor from './modules/document-processor.js';
import { generateLectureTitle } from './modules/ai.js';

// Current exam context
window.currentExamId = null;

// ============================================
// ACTIVITY POINTS SYSTEM HELPERS
// ============================================

/**
 * Record activity and show notification
 */
async function recordActivity(actionType, showNotification = true) {
    const result = await db.recordActivityPoints(actionType);
    if (showNotification && result.points > 0) {
        showActivityNotification(actionType, result.points, result.totalToday);
    }
    await updateActivityDisplay();
    return result;
}

/**
 * Show activity point notification
 */
function showActivityNotification(actionType, points, totalToday) {
    // Create notification element
    const notification = document.createElement('div');
    notification.className = 'activity-notification';
    notification.innerHTML = `
        <span class="activity-points-earned">+${points} pkt</span>
        <span class="activity-total">Dziś: ${totalToday} pkt</span>
    `;
    
    document.body.appendChild(notification);
    
    // Animate in
    setTimeout(() => notification.classList.add('show'), 10);
    
    // Remove after animation
    setTimeout(() => {
        notification.classList.remove('show');
        setTimeout(() => notification.remove(), 300);
    }, 2000);
}

/**
 * Update activity display on dashboard
 */
async function updateActivityDisplay() {
    const todaySummary = await db.getTodayActivitySummary();
    const pointsEl = document.getElementById('stat-today-points');
    const levelEl = document.getElementById('activity-level');
    
    if (pointsEl) {
        pointsEl.textContent = todaySummary.totalPoints;
    }
    
    if (levelEl) {
        const level = db.getActivityLevel(todaySummary.totalPoints);
        levelEl.innerHTML = `${level.emoji} ${level.level}`;
        levelEl.style.color = level.color;
    }
}

/**
 * Mark content as read and award points
 */
window.markContentAsRead = async function(contentType) {
    const lectureId = window.currentLectureId;
    if (!lectureId) return;
    
    // Check if already read today
    const readKey = `read_${contentType}_${lectureId}_${new Date().toISOString().split('T')[0]}`;
    if (localStorage.getItem(readKey)) {
        // Already read today
        const container = document.getElementById(`mark-${contentType}-read`);
        if (container) {
            const status = container.querySelector('.read-status');
            status.textContent = '✓ Już przeczytane dziś!';
            status.style.display = 'inline';
        }
        return;
    }
    
    // Record activity
    await recordActivity('notes_read');
    
    // Mark as read
    localStorage.setItem(readKey, 'true');
    
    // Update UI
    const container = document.getElementById(`mark-${contentType}-read`);
    if (container) {
        const btn = container.querySelector('.mark-read-btn');
        const status = container.querySelector('.read-status');
        btn.style.display = 'none';
        status.style.display = 'inline';
    }
    
    // Check for achievement
    checkAndUnlockAchievement('dedicated_learner');
};

/**
 * Update read buttons visibility based on lecture content
 */
function updateReadButtons(lecture) {
    const today = new Date().toISOString().split('T')[0];
    const lectureId = lecture.id;
    
    const contentTypes = [
        { type: 'notes', hasContent: !!lecture.notes },
        { type: 'detailed', hasContent: !!lecture.detailedNote },
        { type: 'short', hasContent: !!lecture.shortNote },
        { type: 'keypoints', hasContent: !!lecture.keyPoints }
    ];
    
    contentTypes.forEach(({ type, hasContent }) => {
        const container = document.getElementById(`mark-${type}-read`);
        if (!container) return;
        
        if (hasContent) {
            container.style.display = 'block';
            
            // Check if already read today
            const readKey = `read_${type}_${lectureId}_${today}`;
            if (localStorage.getItem(readKey)) {
                const btn = container.querySelector('.mark-read-btn');
                const status = container.querySelector('.read-status');
                if (btn) btn.style.display = 'none';
                if (status) {
                    status.textContent = '✓ Przeczytane dziś';
                    status.style.display = 'inline';
                }
            } else {
                const btn = container.querySelector('.mark-read-btn');
                const status = container.querySelector('.read-status');
                if (btn) btn.style.display = 'inline-block';
                if (status) status.style.display = 'none';
            }
        } else {
            container.style.display = 'none';
        }
    });
}

// ============================================
// LATEX RENDERING HELPERS
// ============================================

/**
 * Render LaTeX formulas in an element using KaTeX
 * Supports both inline ($...$) and display ($$...$$) math
 * @param {HTMLElement|string} element - DOM element or selector
 */
function renderLatex(element) {
    const el = typeof element === 'string' ? document.querySelector(element) : element;
    if (!el) return;
    
    // Wait for KaTeX to load
    if (typeof renderMathInElement === 'undefined') {
        // KaTeX not loaded yet, try again after a short delay
        setTimeout(() => renderLatex(element), 100);
        return;
    }
    
    try {
        renderMathInElement(el, {
            delimiters: [
                { left: '$$', right: '$$', display: true },
                { left: '$', right: '$', display: false },
                { left: '\\[', right: '\\]', display: true },
                { left: '\\(', right: '\\)', display: false }
            ],
            throwOnError: false,
            errorColor: '#ef4444',
            trust: true,
            strict: false
        });
    } catch (e) {
        console.warn('KaTeX rendering error:', e);
    }
}

/**
 * Render Markdown and then LaTeX in content
 * Protects LaTeX formulas from Markdown parsing
 * @param {string} text - Markdown text potentially containing LaTeX
 * @returns {string} Rendered HTML
 */
function renderMarkdownWithLatex(text) {
    if (!text) return '<p style="color: var(--text-secondary); text-align: center; padding: 40px;">Brak treści</p>';
    try {
        // First, try to auto-convert plain-text math to LaTeX format
        let processedText = autoConvertMathToLatex(text);
        
        // Store LaTeX expressions temporarily to protect them from Markdown
        const latexStore = [];
        
        // Protect display math $$...$$ and \[...\]
        processedText = processedText.replace(/\$\$([\s\S]*?)\$\$/g, (match, latex) => {
            const placeholder = `%%LATEX_DISPLAY_${latexStore.length}%%`;
            latexStore.push({ type: 'display', content: latex });
            return placeholder;
        });
        processedText = processedText.replace(/\\\[([\s\S]*?)\\\]/g, (match, latex) => {
            const placeholder = `%%LATEX_DISPLAY_${latexStore.length}%%`;
            latexStore.push({ type: 'display', content: latex });
            return placeholder;
        });
        
        // Protect inline math $...$ and \(...\)
        // Be careful not to match escaped dollars or currency
        processedText = processedText.replace(/(?<![\\$])\$([^$\n]+?)\$(?!\d)/g, (match, latex) => {
            const placeholder = `%%LATEX_INLINE_${latexStore.length}%%`;
            latexStore.push({ type: 'inline', content: latex });
            return placeholder;
        });
        processedText = processedText.replace(/\\\(([\s\S]*?)\\\)/g, (match, latex) => {
            const placeholder = `%%LATEX_INLINE_${latexStore.length}%%`;
            latexStore.push({ type: 'inline', content: latex });
            return placeholder;
        });
        
        // Parse Markdown
        let rawHtml = marked.parse(processedText);
        
        // Restore LaTeX expressions
        latexStore.forEach((item, index) => {
            const displayPlaceholder = `%%LATEX_DISPLAY_${index}%%`;
            const inlinePlaceholder = `%%LATEX_INLINE_${index}%%`;
            
            if (item.type === 'display') {
                rawHtml = rawHtml.replace(displayPlaceholder, `$$${item.content}$$`);
            } else {
                rawHtml = rawHtml.replace(inlinePlaceholder, `$${item.content}$`);
            }
        });
        
        return DOMPurify.sanitize(rawHtml, { 
            ADD_TAGS: ['span'],
            ADD_ATTR: ['class', 'style']
        });
    } catch (e) {
        console.error('Markdown parse error:', e);
        return `<div style="white-space: pre-wrap;">${text}</div>`;
    }
}

/**
 * Auto-convert simple math patterns to LaTeX format
 * For flashcards that were generated without proper LaTeX formatting
 * @param {string} text - Text that may contain plain-text math
 * @returns {string} Text with LaTeX-formatted math
 */
function autoConvertMathToLatex(text) {
    if (!text) return text;
    
    // Skip if already has LaTeX delimiters
    if (text.includes('$') || text.includes('\\(') || text.includes('\\[')) {
        return text;
    }
    
    let result = text;
    
    // Pattern for standalone formulas like: V = (-1)^s * m * 2^e
    // Look for patterns with = and math operators, wrap entire formula
    result = result.replace(
        /([A-Za-z_]\w*)\s*=\s*([^,.\n]+(?:\^[\w{}]+|[+\-*\/]\s*\w+)+)/g,
        (match, variable, formula) => {
            // Clean up and convert to LaTeX
            let latex = match
                .replace(/\*/g, ' \\cdot ')  // * to cdot
                .replace(/\^(\w)/g, '^{$1}')  // single char exponents
                .replace(/\^{(\w+)}/g, '^{$1}')  // multi char exponents
                .replace(/(\d+)\^/g, '$1^')  // numbers with exponents
                .replace(/([a-zA-Z])(\d+)/g, '$1_{$2}')  // subscripts like a1 -> a_1
                .trim();
            return `$${latex}$`;
        }
    );
    
    // Pattern for simple exponents: 2^10, x^2, etc (standalone)
    result = result.replace(/\b(\d+)\^(\d+)\b/g, '$$$1^{$2}$$');
    result = result.replace(/\b([a-zA-Z])\^(\d+)\b/g, '$$$1^{$2}$$');
    result = result.replace(/\b([a-zA-Z])\^([a-zA-Z])\b/g, '$$$1^{$2}$$');
    
    // Pattern for fractions written as a/b
    result = result.replace(/\b(\d+)\/(\d+)\b/g, '$$\\frac{$1}{$2}$$');
    
    // Clean up double dollars that shouldn't be there
    result = result.replace(/\$\$\$/g, '$$');
    
    return result;
}

/**
 * Set innerHTML and then render LaTeX
 * @param {string} elementId - Element ID
 * @param {string} html - HTML content
 */
function setContentWithLatex(elementId, html) {
    const el = document.getElementById(elementId);
    if (el) {
        el.innerHTML = html;
        renderLatex(el);
    }
}

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
// MOTIVATIONAL TIPS (must be before loadDashboard)
// ============================================

const STUDY_TIPS = [
    { text: "Regularność jest ważniejsza niż intensywność. 15 minut dziennie daje lepsze efekty niż 2 godziny raz w tygodniu.", icon: "💡" },
    { text: "Technika Pomodoro: 25 minut skupienia, 5 minut przerwy. Po 4 cyklach zrób dłuższą przerwę.", icon: "🍅" },
    { text: "Aktywne przypominanie (fiszki) jest 2-3x skuteczniejsze niż bierne czytanie notatek.", icon: "🧠" },
    { text: "Sen jest kluczowy dla konsolidacji pamięci. Staraj się spać 7-8 godzin.", icon: "😴" },
    { text: "Ucz innych tego, czego się uczysz. To najlepszy sposób na utrwalenie wiedzy.", icon: "👥" },
    { text: "Rób notatki własnymi słowami, nie kopiuj dosłownie. Przetwarzanie informacji pomaga w zapamiętywaniu.", icon: "✍️" },
    { text: "Łącz nową wiedzę z tym, co już znasz. Tworzenie połączeń wzmacnia pamięć.", icon: "🔗" },
    { text: "Ćwicz w różnych miejscach i o różnych porach. Zróżnicowane konteksty poprawiają przypominanie.", icon: "🌍" },
    { text: "Rozłóż naukę w czasie (spaced repetition). Algorytm SM-2 w fiszkach robi to automatycznie!", icon: "📅" },
    { text: "Zacznij od najtrudniejszych tematów, gdy masz najwięcej energii.", icon: "⚡" }
];

function getRandomTip() {
    return STUDY_TIPS[Math.floor(Math.random() * STUDY_TIPS.length)];
}

// Make tips available globally
window.getRandomTip = getRandomTip;

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
// CUSTOM DIALOG (styled confirm replacement)
// ============================================

/**
 * Show a styled confirmation dialog
 * @param {Object} options - Dialog options
 * @param {string} options.title - Dialog title
 * @param {string} options.message - Dialog message
 * @param {string} options.icon - Emoji icon (default: 🔔)
 * @param {string} options.confirmText - Confirm button text (default: Potwierdź)
 * @param {string} options.cancelText - Cancel button text (default: Anuluj)
 * @param {string} options.type - Dialog type: 'default', 'danger', 'warning', 'success'
 * @param {Object} options.details - Additional details to show (key-value pairs)
 * @returns {Promise<boolean>} - Resolves to true if confirmed, false if cancelled
 */
function showConfirmDialog(options = {}) {
    return new Promise((resolve) => {
        const overlay = document.getElementById('custom-dialog');
        const titleEl = document.getElementById('dialog-title');
        const messageEl = document.getElementById('dialog-message');
        const iconEl = document.getElementById('dialog-icon');
        const detailsEl = document.getElementById('dialog-details');
        const confirmBtn = document.getElementById('dialog-confirm');
        const cancelBtn = document.getElementById('dialog-cancel');
        
        // Set content
        titleEl.textContent = options.title || 'Potwierdzenie';
        messageEl.textContent = options.message || 'Czy na pewno chcesz kontynuować?';
        iconEl.textContent = options.icon || '🔔';
        confirmBtn.textContent = options.confirmText || 'Potwierdź';
        cancelBtn.textContent = options.cancelText || 'Anuluj';
        
        // Set button type
        confirmBtn.className = 'custom-dialog-btn confirm';
        if (options.type) {
            confirmBtn.classList.add(options.type);
        }
        
        // Set details
        if (options.details && Object.keys(options.details).length > 0) {
            detailsEl.innerHTML = Object.entries(options.details)
                .map(([label, value]) => `
                    <div class="detail-row">
                        <span class="detail-label">${label}</span>
                        <span class="detail-value">${value}</span>
                    </div>
                `).join('');
            detailsEl.classList.add('has-content');
        } else {
            detailsEl.innerHTML = '';
            detailsEl.classList.remove('has-content');
        }
        
        // Show dialog
        overlay.classList.add('active');
        
        // Handle responses
        const handleConfirm = () => {
            cleanup();
            resolve(true);
        };
        
        const handleCancel = () => {
            cleanup();
            resolve(false);
        };
        
        const handleKeydown = (e) => {
            if (e.key === 'Enter') {
                e.preventDefault();
                handleConfirm();
            } else if (e.key === 'Escape') {
                e.preventDefault();
                handleCancel();
            }
        };
        
        const handleOverlayClick = (e) => {
            if (e.target === overlay) {
                handleCancel();
            }
        };
        
        const cleanup = () => {
            overlay.classList.remove('active');
            confirmBtn.removeEventListener('click', handleConfirm);
            cancelBtn.removeEventListener('click', handleCancel);
            document.removeEventListener('keydown', handleKeydown);
            overlay.removeEventListener('click', handleOverlayClick);
        };
        
        confirmBtn.addEventListener('click', handleConfirm);
        cancelBtn.addEventListener('click', handleCancel);
        document.addEventListener('keydown', handleKeydown);
        overlay.addEventListener('click', handleOverlayClick);
        
        // Focus confirm button
        setTimeout(() => confirmBtn.focus(), 100);
    });
}

// Make available globally
window.showConfirmDialog = showConfirmDialog;

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
    
    // Check for saved study session
    const resumed = await checkForSavedSession();
    if (resumed) {
        console.log('✅ Resumed saved study session');
    }
    
    // Check for saved Pomodoro state (after study session to show dialogs sequentially)
    await loadPomodoroState();
    
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
    if (tabName === 'settings') loadDataStatistics();
}

// ============================================
// DATABASE MANAGEMENT FUNCTIONS
// ============================================

// Database management functions
window.checkDatabaseHealth = async function() {
    try {
        // Get statistics
        const subjects = await db.listSubjects();
        const lectures = await db.listLectures();
        const flashcards = await db.listFlashcards();
        const orphaned = await db.findOrphanedFlashcards();
        
        // Calculate stats
        const totalFlashcards = flashcards.length;
        const orphanedCount = orphaned.length;
        const validFlashcards = totalFlashcards - orphanedCount;
        
        const stats = `📚 Przedmioty: ${subjects.length}
🎓 Wykłady: ${lectures.length} 
🃏 Fiszki: ${validFlashcards} (poprawne) + ${orphanedCount} (osierocone)
${orphanedCount > 0 ? '⚠️ Zalecane: wyczyść osierocone fiszki' : '✅ Baza danych w dobrym stanie'}`;
        
        // Show in UI
        showDatabaseStatus(stats, orphanedCount > 0 ? 'warning' : 'success');
        
        console.log(stats);
        return { subjects: subjects.length, lectures: lectures.length, validFlashcards, orphanedCount };
        
    } catch (error) {
        console.error('Błąd podczas sprawdzania bazy:', error);
        showDatabaseStatus('❌ Błąd podczas sprawdzania: ' + error.message, 'error');
        throw error;
    }
};

window.cleanupOrphanedFlashcards = async function() {
    try {
        // Check for orphaned flashcards first
        const orphaned = await db.findOrphanedFlashcards();
        
        if (orphaned.length === 0) {
            const message = '✅ Brak osieroconych fiszek do usunięcia!';
            showDatabaseStatus(message, 'success');
            console.log(message);
            return 0;
        }
        
        console.log(`Znaleziono ${orphaned.length} osieroconych fiszek:`);
        orphaned.forEach(card => console.log(`- "${card.front}" (lectureId: ${card.lectureId})`));
        
        // Ask for confirmation
        const confirmed = await showConfirmDialog({
            title: 'Czyszczenie fiszek',
            message: `Znaleziono ${orphaned.length} osieroconych fiszek.\nCzy chcesz je usunąć?`,
            icon: '🧹',
            confirmText: 'Usuń',
            type: 'warning',
            details: {
                'Liczba fiszek': orphaned.length,
                'Przykłady': orphaned.slice(0, 3).map(f => f.front).join(', ') + (orphaned.length > 3 ? '...' : '')
            }
        });
        
        if (!confirmed) {
            const message = 'Anulowano czyszczenie.';
            showDatabaseStatus(message, 'info');
            console.log(message);
            return 0;
        }
        
        // Clean up
        const removedCount = await db.cleanupOrphanedFlashcards();
        const message = `✅ Usunięto ${removedCount} osieroconych fiszek!`;
        showDatabaseStatus(message, 'success');
        console.log(message);
        
        // Refresh current view if needed
        const activeTab = document.querySelector('.tab-content.active')?.id;
        if (activeTab === 'flashcards') {
            await loadFlashcards();
        } else if (activeTab === 'subjects') {
            await loadSubjects();
        }
        
        return removedCount;
        
    } catch (error) {
        console.error('Błąd podczas czyszczenia fiszek:', error);
        showDatabaseStatus('❌ Błąd podczas czyszczenia: ' + error.message, 'error');
        throw error;
    }
};

function showDatabaseStatus(message, type = 'info') {
    const statusDiv = document.getElementById('database-status-display');
    const detailsDiv = document.getElementById('database-status-details');
    
    if (statusDiv && detailsDiv) {
        statusDiv.style.display = 'block';
        detailsDiv.textContent = message;
        
        // Update border color based on type
        switch(type) {
            case 'success':
                statusDiv.style.borderLeftColor = 'var(--success)';
                break;
            case 'warning':
                statusDiv.style.borderLeftColor = '#f59e0b';
                break;
            case 'error':
                statusDiv.style.borderLeftColor = '#ef4444';
                break;
            default:
                statusDiv.style.borderLeftColor = 'var(--primary)';
        }
    }
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
    
    // Link to subjects from new lecture form
    document.getElementById('link-to-subjects')?.addEventListener('click', (e) => {
        e.preventDefault();
        document.querySelector('[data-tab="subjects"]').click();
        // Open add subject modal after a short delay
        setTimeout(() => {
            document.getElementById('btn-add-subject')?.click();
        }, 300);
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
    
    // Data export/import
    document.getElementById('btn-export-data').addEventListener('click', exportAllData);
    document.getElementById('btn-import-data').addEventListener('click', openImportDialog);
    document.getElementById('import-data-file').addEventListener('change', handleImportFile);
    
    // Clear data buttons
    document.getElementById('btn-clear-lectures').addEventListener('click', clearAllLectures);
    document.getElementById('btn-clear-flashcards').addEventListener('click', clearAllFlashcards);
    document.getElementById('btn-clear-schedule').addEventListener('click', clearAllSchedule);
    document.getElementById('btn-clear-subjects').addEventListener('click', clearAllSubjects);
    document.getElementById('btn-clear-all-data').addEventListener('click', clearAllData);
    
    // Database management buttons
    const checkHealthBtn = document.getElementById('btn-check-database-health');
    const cleanupBtn = document.getElementById('btn-cleanup-orphaned-flashcards');
    
    if (checkHealthBtn) {
        checkHealthBtn.addEventListener('click', window.checkDatabaseHealth);
        console.log('✅ Database health button listener attached');
    } else {
        console.warn('⚠️ btn-check-database-health not found in DOM');
    }
    
    if (cleanupBtn) {
        cleanupBtn.addEventListener('click', window.cleanupOrphanedFlashcards);
        console.log('✅ Cleanup orphaned flashcards button listener attached');
    } else {
        console.warn('⚠️ btn-cleanup-orphaned-flashcards not found in DOM');
    }
}

// ============================================
// DASHBOARD
// ============================================

async function loadDashboard() {
    const subjects = await db.listSubjects();
    const lectures = await db.listLectures();
    const flashcards = await db.listFlashcards();
    
    // Get study statistics
    const stats = await db.getStudyStatistics();
    
    // Update stats cards
    document.getElementById('stat-due-today').textContent = stats.dueCount;
    document.getElementById('stat-flashcards').textContent = stats.masteredCount;
    document.getElementById('stat-accuracy').textContent = stats.accuracy + '%';
    document.getElementById('stat-streak').textContent = stats.streak;
    
    // Update activity points display
    await updateActivityDisplay();
    
    // Show/hide due cards alert
    const dueAlert = document.getElementById('due-cards-alert');
    if (stats.dueCount > 0) {
        dueAlert.style.display = 'block';
        document.getElementById('due-cards-count').textContent = stats.dueCount;
    } else {
        dueAlert.style.display = 'none';
    }
    
    // Load motivational tip
    loadRandomTip();
    
    // Load subject progress
    await loadSubjectProgress(subjects);
    
    // Load charts
    await loadDashboardCharts();
    
    // Show recent activity - more informative feed
    const activityHTML = await generateRecentActivityFeed(subjects, lectures, flashcards);  
    document.getElementById('recent-activity').innerHTML = activityHTML || '<p style="text-align: center; color: var(--text-secondary);">Brak ostatniej aktywności</p>';
}

// Load random motivational tip
function loadRandomTip() {
    const tip = getRandomTip();
    const tipIcon = document.getElementById('tip-icon');
    const tipText = document.getElementById('tip-text');
    
    if (tipIcon && tipText && tip) {
        tipIcon.textContent = tip.icon;
        tipText.textContent = tip.text;
    }
}

/**
 * Generate recent activity feed with useful information
 */
async function generateRecentActivityFeed(subjects, lectures, flashcards) {
    const activities = [];
    const sessions = JSON.parse(localStorage.getItem('studySessions') || '[]');
    
    // Group sessions by date and subject
    const todaySessions = sessions.filter(s => {
        const sessionDate = new Date(s.timestamp || s.date);
        const today = new Date();
        return sessionDate.toDateString() === today.toDateString();
    });
    
    const yesterdaySessions = sessions.filter(s => {
        const sessionDate = new Date(s.timestamp || s.date);
        const yesterday = new Date();
        yesterday.setDate(yesterday.getDate() - 1);
        return sessionDate.toDateString() === yesterday.toDateString();
    });
    
    // Calculate today's study stats per subject
    const todayStatsBySubject = {};
    todaySessions.forEach(session => {
        const flashcard = flashcards.find(f => f.id === session.flashcardId);
        if (flashcard && flashcard.subjectId) {
            if (!todayStatsBySubject[flashcard.subjectId]) {
                todayStatsBySubject[flashcard.subjectId] = {
                    total: 0,
                    correct: 0,
                    type: session.type || 'flashcard'
                };
            }
            todayStatsBySubject[flashcard.subjectId].total++;
            if (session.isCorrect || session.quality >= 3) {
                todayStatsBySubject[flashcard.subjectId].correct++;
            }
        }
    });
    
    // Add today's study activities
    for (const [subjectId, stats] of Object.entries(todayStatsBySubject)) {
        const subject = subjects.find(s => s.id === subjectId);
        if (subject && stats.total > 0) {
            const accuracy = Math.round((stats.correct / stats.total) * 100);
            const isCloze = stats.type === 'cloze';
            activities.push({
                icon: isCloze ? '🧩' : '🎯',
                title: `Nauka: ${subject.name}`,
                description: `Przećwiczono ${stats.total} ${isCloze ? 'fiszek cloze' : 'fiszek'} (${stats.correct} poprawnie - ${accuracy}%)`,
                time: 'Dzisiaj',
                color: subject.color || '#6366f1',
                priority: 1
            });
        }
    }
    
    // Add newly created lectures (today/yesterday)
    const recentLectures = lectures.filter(l => {
        const createdDate = new Date(l.createdAt);
        const twoDaysAgo = new Date();
        twoDaysAgo.setDate(twoDaysAgo.getDate() - 2);
        return createdDate > twoDaysAgo;
    }).slice(0, 3);
    
    recentLectures.forEach(lecture => {
        const subject = subjects.find(s => s.id === lecture.subjectId);
        const createdDate = new Date(lecture.createdAt);
        const isToday = createdDate.toDateString() === new Date().toDateString();
        
        activities.push({
            icon: '📚',
            title: `Dodano: ${lecture.title}`,
            description: subject?.name || 'Bez przedmiotu',
            time: isToday ? 'Dzisiaj' : createdDate.toLocaleDateString('pl-PL'),
            color: subject?.color || '#6366f1',
            priority: 2
        });
    });
    
    // Add achievements/milestones
    const masteredIds = new Set(
        sessions.filter(s => s.isCorrect === true || s.quality >= 3).map(s => s.flashcardId).filter(Boolean)
    );
    const totalMastered = flashcards.filter(f => masteredIds.has(f.id)).length;
    
    // Milestones
    const milestones = [10, 25, 50, 100, 200, 500];
    const reachedMilestone = milestones.filter(m => totalMastered >= m).pop();
    if (reachedMilestone && totalMastered <= reachedMilestone + 5) {
        activities.push({
            icon: '🏆',
            title: `Kamień milowy!`,
            description: `Opanowano już ${reachedMilestone}+ fiszek!`,
            time: '',
            color: '#f59e0b',
            priority: 0
        });
    }
    
    // Add streak info if active
    const streak = await db.getStudyStreak();
    if (streak >= 3) {
        activities.push({
            icon: '🔥',
            title: `Seria ${streak} dni!`,
            description: 'Kontynuuj naukę każdego dnia',
            time: '',
            color: '#ef4444',
            priority: 0
        });
    }
    
    // Sort by priority (lower = more important)
    activities.sort((a, b) => a.priority - b.priority);
    
    // Generate HTML
    if (activities.length === 0) {
        // Show encouraging message if no activity
        return `
            <div class="card activity-card">
                <div class="activity-icon" style="background: linear-gradient(135deg, #6366f1, #8b5cf6);">🚀</div>
                <div class="activity-content">
                    <div class="activity-title">Rozpocznij naukę!</div>
                    <div class="activity-description">Dodaj wykład i wygeneruj fiszki aby zacząć</div>
                </div>
            </div>
        `;
    }
    
    return activities.slice(0, 5).map(activity => `
        <div class="card activity-card">
            <div class="activity-icon" style="background: linear-gradient(135deg, ${activity.color}, ${adjustColor(activity.color, -20)});">
                ${activity.icon}
            </div>
            <div class="activity-content">
                <div class="activity-title">${activity.title}</div>
                <div class="activity-description">${activity.description}</div>
            </div>
            ${activity.time ? `<div class="activity-time">${activity.time}</div>` : ''}
        </div>
    `).join('');
}

/**
 * Adjust hex color brightness
 */
function adjustColor(color, amount) {
    const hex = color.replace('#', '');
    const num = parseInt(hex, 16);
    const r = Math.min(255, Math.max(0, (num >> 16) + amount));
    const g = Math.min(255, Math.max(0, ((num >> 8) & 0x00FF) + amount));
    const b = Math.min(255, Math.max(0, (num & 0x0000FF) + amount));
    return `#${(1 << 24 | r << 16 | g << 8 | b).toString(16).slice(1)}`;
}

// Load subject progress bars
async function loadSubjectProgress(subjects) {
    const flashcards = await db.listFlashcards();
    const sessions = JSON.parse(localStorage.getItem('studySessions') || '[]');
    const progressList = document.getElementById('subject-progress-list');
    
    if (!progressList || subjects.length === 0) {
        if (progressList) {
            progressList.innerHTML = '<p style="text-align: center; color: var(--text-secondary); padding: 20px;">Dodaj przedmioty aby śledzić postęp</p>';
        }
        return;
    }
    
    // Get mastered flashcard IDs (answered correctly at least once)
    const masteredIds = new Set(
        sessions
            .filter(s => s.isCorrect === true || s.quality >= 3)
            .map(s => s.flashcardId)
            .filter(Boolean)
    );
    
    const progressHTML = subjects.map(subject => {
        const subjectFlashcards = flashcards.filter(f => f.subjectId === subject.id);
        const total = subjectFlashcards.length;
        // Count mastered cards for this subject
        const mastered = subjectFlashcards.filter(f => masteredIds.has(f.id)).length;
        const percent = total > 0 ? Math.round((mastered / total) * 100) : 0;
        
        // Ensure minimum visible width for small percentages
        const displayWidth = percent > 0 && percent < 3 ? 3 : percent;
        const subjectColor = subject.color || '#6366f1';
        
        return `
            <div class="subject-progress-card">
                <div class="subject-progress-header">
                    <div class="subject-progress-color" style="background: ${subjectColor}"></div>
                    <div class="subject-progress-name">${subject.name}</div>
                    <div class="subject-progress-percent">${percent}%</div>
                </div>
                <div class="subject-progress-bar-container">
                    <div class="subject-progress-bar-fill" style="width: ${displayWidth}%; background: linear-gradient(90deg, ${subjectColor}, ${adjustColor(subjectColor, 30)});"></div>
                </div>
                <div class="subject-progress-stats">
                    <span>✅ ${mastered} opanowanych</span>
                    <span>📚 ${total - mastered} do nauki</span>
                </div>
            </div>
        `;
    }).join('');
    
    progressList.innerHTML = progressHTML;
}

// Dashboard Charts
let activityChart = null;
let accuracyChart = null;

async function loadDashboardCharts() {
    // Use new activity points system instead of old studySessions
    const activityPoints = await db.getActivityPoints(7);
    const dates = Object.keys(activityPoints);
    const pointsData = dates.map(d => activityPoints[d].totalPoints || 0);
    
    // Activity Chart - now shows activity points
    const activityCtx = document.getElementById('activity-chart');
    if (activityCtx) {
        if (activityChart) activityChart.destroy();
        activityChart = new Chart(activityCtx, {
            type: 'bar',
            data: {
                labels: dates.map(d => {
                    const date = new Date(d);
                    return date.toLocaleDateString('pl-PL', { weekday: 'short' });
                }),
                datasets: [{
                    label: 'Punkty aktywności',
                    data: pointsData,
                    backgroundColor: 'rgba(168, 85, 247, 0.6)',
                    borderColor: '#a855f7',
                    borderWidth: 1,
                    borderRadius: 6
                }]
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                plugins: {
                    legend: { display: false },
                    tooltip: {
                        callbacks: {
                            label: function(context) {
                                return `${context.raw} pkt`;
                            }
                        }
                    }
                },
                scales: {
                    y: {
                        beginAtZero: true,
                        ticks: { color: '#94a3b8' },
                        grid: { color: 'rgba(255,255,255,0.05)' }
                    },
                    x: {
                        ticks: { color: '#94a3b8' },
                        grid: { display: false }
                    }
                }
            }
        });
    }
    
    // Accuracy Chart - includes both regular and Cloze flashcards
    const accuracyCtx = document.getElementById('accuracy-chart');
    if (accuracyCtx) {
        const stats = await db.getStudyStatistics();
        
        if (accuracyChart) accuracyChart.destroy();
        accuracyChart = new Chart(accuracyCtx, {
            type: 'doughnut',
            data: {
                labels: [
                    'Fiszki opanowane', 
                    'Fiszki w nauce', 
                    'Cloze opanowane', 
                    'Cloze w nauce'
                ],
                datasets: [{
                    data: [
                        stats.regularFlashcards.mastered,
                        stats.regularFlashcards.inProgress,
                        stats.clozeFlashcards.mastered,
                        stats.clozeFlashcards.inProgress
                    ],
                    backgroundColor: [
                        '#10b981',  // Green - regular mastered
                        '#6366f1',  // Purple - regular in progress
                        '#14b8a6',  // Teal - cloze mastered
                        '#8b5cf6'   // Violet - cloze in progress
                    ],
                    borderWidth: 0
                }]
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                plugins: {
                    legend: {
                        position: 'bottom',
                        labels: { 
                            color: '#94a3b8', 
                            padding: 10,
                            font: { size: 11 }
                        }
                    },
                    tooltip: {
                        callbacks: {
                            label: function(context) {
                                const label = context.label || '';
                                const value = context.raw || 0;
                                const total = context.dataset.data.reduce((a, b) => a + b, 0);
                                const percentage = total > 0 ? Math.round((value / total) * 100) : 0;
                                return `${label}: ${value} (${percentage}%)`;
                            }
                        }
                    }
                },
                cutout: '60%'
            }
        });
    }
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
    const confirmed = await showConfirmDialog({
        title: 'Usuń przedmiot',
        message: 'Czy na pewno chcesz usunąć ten przedmiot?',
        icon: '🗑️',
        confirmText: 'Usuń',
        type: 'danger'
    });
    if (!confirmed) return;
    
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
    const exams = await db.listExams();
    
    const list = document.getElementById('lectures-list');
    
    if (lectures.length === 0 && exams.length === 0) {
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
    
    // Grupuj kolokwia według przedmiotów
    const examsBySubject = {};
    exams.forEach(exam => {
        if (exam.subjectId) {
            if (!examsBySubject[exam.subjectId]) {
                examsBySubject[exam.subjectId] = [];
            }
            examsBySubject[exam.subjectId].push(exam);
        }
    });
    
    // Generuj HTML z podziałem na przedmioty
    let html = '';
    
    // Wykłady z przypisanym przedmiotem
    subjects.forEach(subject => {
        const subjectLectures = lecturesBySubject[subject.id] || [];
        const subjectExams = examsBySubject[subject.id] || [];
        
        // Pokaż przedmiot tylko jeśli ma wykłady lub kolokwia
        if (subjectLectures.length > 0 || subjectExams.length > 0) {
            const subjectCollapseId = `subject-${subject.id}`;
            const isSubjectCollapsed = localStorage.getItem(`lecture-section-${subjectCollapseId}`) === 'collapsed';
            
            html += `
                <div class="subject-container" style="margin-bottom: 30px;">
                    <!-- Nagłówek przedmiotu -->
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
                                ${subjectExams.length > 0 ? `${subjectExams.length} ${subjectExams.length === 1 ? 'kolokwium' : 'kolokwia'} • ` : ''}${subjectLectures.length} ${subjectLectures.length === 1 ? 'wykład' : 'wykładów'}
                            </p>
                        </div>
                        <button class="btn btn-create-exam" data-subject-id="${subject.id}" data-subject-name="${subject.name}" data-subject-color="${subject.color}"
                                style="padding: 8px 14px; background: linear-gradient(135deg, rgba(168, 85, 247, 0.2), rgba(139, 92, 246, 0.2)); 
                                       border: 1px solid rgba(168, 85, 247, 0.5); color: #a855f7; font-size: 13px; border-radius: 8px;"
                                onclick="event.stopPropagation(); openCreateExamModal('${subject.id}', '${subject.name.replace(/'/g, "\\'")}', '${subject.color}');"
                                title="Utwórz kolokwium z wykładów tego przedmiotu">
                            📝 Nowe kolokwium
                        </button>
                        <div class="collapse-icon" style="font-size: 18px; color: ${subject.color}; transition: transform 0.3s; transform: rotate(${isSubjectCollapsed ? '-90deg' : '0deg'});">
                            ▼
                        </div>
                    </div>
                    
                    <!-- Zawartość przedmiotu -->
                    <div id="${subjectCollapseId}" class="collapsible-content" style="overflow: hidden; transition: max-height 0.3s ease, opacity 0.3s ease; ${isSubjectCollapsed ? 'max-height: 0px; opacity: 0; margin-bottom: 0;' : ''}">
                        <div style="padding-left: 20px;">
                            
                            ${subjectExams.length > 0 ? `
                            <!-- Sekcja Kolokwia -->
                            <div style="margin-bottom: 20px;">
                                <div style="display: flex; align-items: center; gap: 10px; margin-bottom: 12px;">
                                    <div style="width: 28px; height: 28px; border-radius: 8px; background: linear-gradient(135deg, rgba(168, 85, 247, 0.2), rgba(139, 92, 246, 0.2)); display: flex; align-items: center; justify-content: center; font-size: 14px;">
                                        📝
                                    </div>
                                    <span style="font-weight: 600; color: #a855f7; font-size: 15px;">Kolokwia</span>
                                </div>
                                <div style="display: flex; flex-direction: column; gap: 10px;">
                                    ${subjectExams.map(exam => `
                                        <div class="exam-item" data-exam-id="${exam.id}" 
                                             style="display: flex; align-items: center; gap: 12px; padding: 12px 15px; 
                                                    background: linear-gradient(135deg, rgba(168, 85, 247, 0.08), rgba(139, 92, 246, 0.08)); 
                                                    border: 1px solid rgba(168, 85, 247, 0.3); border-radius: 10px; cursor: pointer;
                                                    transition: all 0.2s;"
                                             onmouseover="this.style.borderColor='#a855f7'; this.style.transform='translateX(4px)';"
                                             onmouseout="this.style.borderColor='rgba(168, 85, 247, 0.3)'; this.style.transform='none';">
                                            <div style="width: 36px; height: 36px; border-radius: 10px; background: linear-gradient(135deg, #a855f7, #8b5cf6); display: flex; align-items: center; justify-content: center; color: white; font-size: 16px;">
                                                📝
                                            </div>
                                            <div style="flex: 1;">
                                                <div style="font-weight: 600; font-size: 15px; color: var(--text);">${exam.name}</div>
                                                <div style="font-size: 12px; color: var(--text-secondary); margin-top: 2px;">
                                                    ${exam.lectureIds ? exam.lectureIds.length : 0} wykładów • ${new Date(exam.createdAt).toLocaleDateString('pl-PL')}
                                                </div>
                                            </div>
                                            <div style="display: flex; gap: 6px;">
                                                <button class="btn btn-delete-exam" data-exam-id="${exam.id}"
                                                        style="padding: 6px 10px; font-size: 12px; background: rgba(239, 68, 68, 0.1); 
                                                               border: 1px solid rgba(239, 68, 68, 0.3); color: #ef4444; border-radius: 6px;"
                                                        onclick="event.stopPropagation(); deleteExamConfirm('${exam.id}');"
                                                        title="Usuń kolokwium">
                                                    🗑️
                                                </button>
                                                <button class="btn btn-open-exam" data-exam-id="${exam.id}"
                                                        style="padding: 6px 14px; background: linear-gradient(135deg, #a855f7, #8b5cf6); color: white; border-radius: 6px; font-size: 13px;"
                                                        onclick="event.stopPropagation(); openExamView('${exam.id}');">
                                                    Otwórz
                                                </button>
                                            </div>
                                        </div>
                                    `).join('')}
                                </div>
                            </div>
                            ` : ''}
                            
                            ${subjectLectures.length > 0 ? `
                            <!-- Sekcja Wykłady -->
                            <div>
                                <div style="display: flex; align-items: center; gap: 10px; margin-bottom: 12px;">
                                    <div style="width: 28px; height: 28px; border-radius: 8px; background: ${subject.color}22; display: flex; align-items: center; justify-content: center; font-size: 14px;">
                                        📖
                                    </div>
                                    <span style="font-weight: 600; color: ${subject.color}; font-size: 15px;">Wykłady</span>
                                </div>
                                <div style="display: flex; flex-direction: column; gap: 10px;">
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
                            ` : ''}
                            
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
    const saveBtn = document.getElementById('btn-save-lecture');
    const saveStatus = document.getElementById('save-status');
    
    if (!subjectId) {
        alert('❌ Wybierz przedmiot!');
        return;
    }
    
    // Show loading state
    saveBtn.disabled = true;
    saveBtn.innerHTML = '⏳ Zapisywanie...';
    saveStatus.style.display = 'inline';
    saveStatus.textContent = '';
    
    // Generate title if not exists - ASYNC AI GENERATION
    let title = titleInput.value;
    if (!title || title.trim() === '') {
        if (transcriptionText) {
            saveStatus.textContent = '🤖 AI generuje tytuł...';
            console.log('🤖 Generuję tytuł przez AI z transkrypcji...');
            title = await generateLectureTitle(transcriptionText);
        } else if (notes) {
            saveStatus.textContent = '🤖 AI generuje tytuł...';
            console.log('🤖 Generuję tytuł przez AI z notatek...');
            title = await generateLectureTitle(notes);
        } else {
            title = `Wykład ${new Date().toLocaleDateString('pl-PL')}`;
        }
    }
    
    try {
        saveStatus.textContent = '💾 Zapisuję...';
        
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
        
        // Reset form and button
        saveBtn.disabled = false;
        saveBtn.innerHTML = '💾 Zapisz wykład';
        saveStatus.style.display = 'none';
        document.getElementById('new-lecture-form').reset();
        document.getElementById('transcription-section').style.display = 'none';
        currentAudioFile = null;
        
        // Refresh lectures
        await loadLectures();
        await loadDashboard();
        
        // Navigate to lectures
        document.querySelector('[data-tab="lectures"]').click();
        
    } catch (error) {
        console.error('Error saving lecture:', error);
        // Reset button on error
        saveBtn.disabled = false;
        saveBtn.innerHTML = '💾 Zapisz wykład';
        saveStatus.style.display = 'none';
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
        const transcribe = await showConfirmDialog({
            title: 'Nagranie zakończone!',
            message: 'Czy chcesz teraz transkrybować audio?',
            icon: '🎙️',
            confirmText: 'Transkrybuj',
            type: 'success'
        });
        if (transcribe) {
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
    
    const transcribe = await showConfirmDialog({
        title: 'Plik załadowany!',
        message: 'Czy chcesz teraz transkrybować audio?',
        icon: '🎵',
        confirmText: 'Transkrybuj',
        type: 'success'
    });
    if (transcribe) {
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
        // Title section is now always visible
        
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
    const extract = await showConfirmDialog({
        title: 'Dokument załadowany!',
        message: 'Czy chcesz wyekstrahować treść z dokumentu?',
        icon: '📄',
        confirmText: 'Ekstrahuj',
        type: 'success'
    });
    if (extract) {
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
        // Title section is now always visible
        
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
                                    <div class="flashcard-markdown">${renderMarkdownWithLatex(frontText)}</div>
                                </div>
                                <div class="flashcard-back">
                                    <div class="flashcard-markdown">${renderMarkdownWithLatex(backText)}</div>
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
                            <div class="flashcard-markdown">${renderMarkdownWithLatex(frontText)}</div>
                        </div>
                        <div class="flashcard-back">
                            <div class="flashcard-markdown">${renderMarkdownWithLatex(backText)}</div>
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
    
    // Render LaTeX in flashcards
    renderLatex(container);
    
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
    
    // Whisper settings
    document.getElementById('setting-whisper-model').value = appSettings.whisperModel;
    document.getElementById('setting-whisper-language').value = appSettings.whisperLanguage;
    document.getElementById('setting-backend-url').value = appSettings.backendUrl;
    
    // GitHub settings
    document.getElementById('setting-github-repo').value = appSettings.githubRepo;
    document.getElementById('setting-github-token').value = appSettings.githubToken;
    document.getElementById('setting-github-branch').value = appSettings.githubBranch;
    document.getElementById('setting-username').value = appSettings.username;
    
    // AI Provider settings
    const aiProviderSelect = document.getElementById('setting-ai-provider');
    const ollamaSettings = document.getElementById('ollama-settings');
    const geminiSettings = document.getElementById('gemini-settings');
    const ollamaModelSelect = document.getElementById('setting-ollama-model');
    const geminiKeyInput = document.getElementById('setting-gemini-key');
    const geminiModelSelect = document.getElementById('setting-gemini-model');
    
    if (aiProviderSelect) {
        aiProviderSelect.value = appSettings.aiProvider || 'ollama';
        toggleAIProviderSettings(appSettings.aiProvider || 'ollama');
        
        aiProviderSelect.addEventListener('change', (e) => {
            toggleAIProviderSettings(e.target.value);
        });
    }
    
    if (ollamaModelSelect) {
        ollamaModelSelect.value = appSettings.ollamaModel || 'qwen2.5:14b';
    }
    
    if (geminiKeyInput) {
        geminiKeyInput.value = appSettings.geminiApiKey || '';
    }
    
    if (geminiModelSelect) {
        geminiModelSelect.value = appSettings.geminiModel || 'gemini-1.5-pro';
    }
    
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
    
    // Add Gemini test button listener
    const testGeminiBtn = document.getElementById('btn-test-gemini');
    if (testGeminiBtn) {
        testGeminiBtn.addEventListener('click', testGeminiConnection);
    }
    
    function toggleAIProviderSettings(provider) {
        if (ollamaSettings && geminiSettings) {
            if (provider === 'gemini') {
                ollamaSettings.style.display = 'none';
                geminiSettings.style.display = 'block';
            } else {
                ollamaSettings.style.display = 'block';
                geminiSettings.style.display = 'none';
            }
        }
    }
}

async function testGeminiConnection() {
    const geminiKeyInput = document.getElementById('setting-gemini-key');
    const geminiModelSelect = document.getElementById('setting-gemini-model');
    const statusSpan = document.getElementById('gemini-status');
    const btn = document.getElementById('btn-test-gemini');
    
    const apiKey = geminiKeyInput?.value;
    const model = geminiModelSelect?.value || 'gemini-1.5-pro';
    
    if (!apiKey) {
        if (statusSpan) {
            statusSpan.textContent = '❌ Wprowadź klucz API!';
            statusSpan.style.color = 'var(--accent)';
        }
        return;
    }
    
    if (btn) {
        btn.disabled = true;
        btn.textContent = '⏳ Testuję...';
    }
    if (statusSpan) {
        statusSpan.textContent = '';
    }
    
    try {
        const appSettings = settings.getSettings();
        const backendUrl = appSettings.backendUrl || 'http://localhost:3001';
        
        const response = await fetch(`${backendUrl}/test-gemini`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                geminiApiKey: apiKey,
                geminiModel: model
            })
        });
        
        const data = await response.json();
        
        if (data.success) {
            if (statusSpan) {
                statusSpan.textContent = `✅ Działa! (${data.duration}ms)`;
                statusSpan.style.color = 'var(--success)';
            }
        } else {
            if (statusSpan) {
                statusSpan.textContent = '❌ ' + (data.error || 'Błąd');
                statusSpan.style.color = 'var(--accent)';
            }
        }
    } catch (error) {
        if (statusSpan) {
            statusSpan.textContent = '❌ Błąd połączenia z backendem';
            statusSpan.style.color = 'var(--accent)';
        }
    } finally {
        if (btn) {
            btn.disabled = false;
            btn.textContent = '🔌 Testuj połączenie';
        }
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
        username: document.getElementById('setting-username').value,
        // AI Provider settings
        aiProvider: document.getElementById('setting-ai-provider')?.value || 'ollama',
        ollamaModel: document.getElementById('setting-ollama-model')?.value || 'qwen2.5:14b',
        geminiApiKey: document.getElementById('setting-gemini-key')?.value || '',
        geminiModel: document.getElementById('setting-gemini-model')?.value || 'gemini-1.5-pro'
    };
    
    settings.setSettings(newSettings);
    
    // Update username in header
    document.getElementById('username').textContent = newSettings.username || 'Student';
    
    const provider = newSettings.aiProvider === 'gemini' ? 'Gemini Pro' : 'Ollama';
    alert(`✅ Ustawienia zapisane!\n\n🤖 AI Provider: ${provider}`);
}

// ============================================
// DATA EXPORT/IMPORT
// ============================================

async function loadDataStatistics() {
    try {
        const stats = await db.getDataStatistics();
        
        document.getElementById('stat-subjects').textContent = stats.subjects || 0;
        document.getElementById('stat-lectures').textContent = stats.lectures || 0;
        document.getElementById('stat-flashcards').textContent = stats.flashcards || 0;
        document.getElementById('stat-notes').textContent = stats.notes || 0;
    } catch (error) {
        console.error('Error loading statistics:', error);
    }
}

async function exportAllData() {
    try {
        console.log('🔄 Starting data export...');
        const exportBtn = document.getElementById('btn-export-data');
        const originalText = exportBtn.textContent;
        exportBtn.textContent = '⏳ Eksportowanie...';
        exportBtn.disabled = true;
        
        // Export all data
        const exportData = await db.exportAllData();
        
        // Create filename with date
        const date = new Date().toISOString().split('T')[0];
        const filename = `student-asystent-backup-${date}.json`;
        
        // Create blob and download
        const blob = new Blob([JSON.stringify(exportData, null, 2)], { type: 'application/json' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = filename;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);
        
        exportBtn.textContent = '✅ Eksport ukończony!';
        setTimeout(() => {
            exportBtn.textContent = originalText;
            exportBtn.disabled = false;
        }, 2000);
        
        console.log('✅ Export completed:', filename);
        alert(`✅ Dane wyeksportowane!\n\nPlik: ${filename}\n\nPrzedsięczanych rekordów:\n• Przedmioty: ${exportData.statistics.totalSubjects}\n• Wykłady: ${exportData.statistics.totalLectures}\n• Fiszki: ${exportData.statistics.totalFlashcards}\n• Notatki: ${exportData.statistics.totalNotes}`);
        
    } catch (error) {
        console.error('❌ Export error:', error);
        alert('❌ Błąd podczas eksportu danych: ' + error.message);
        
        const exportBtn = document.getElementById('btn-export-data');
        exportBtn.textContent = '📤 Eksportuj wszystkie dane';
        exportBtn.disabled = false;
    }
}

function openImportDialog() {
    const fileInput = document.getElementById('import-data-file');
    fileInput.click();
}

async function handleImportFile(event) {
    const file = event.target.files[0];
    if (!file) return;
    
    // Reset file input
    event.target.value = '';
    
    try {
        console.log('🔄 Starting data import...');
        const importBtn = document.getElementById('btn-import-data');
        const originalText = importBtn.textContent;
        importBtn.textContent = '⏳ Importowanie...';
        importBtn.disabled = true;
        
        // Read file
        const text = await file.text();
        const importData = JSON.parse(text);
        
        // Validate
        if (!importData.data || !importData.version) {
            throw new Error('Nieprawidłowy format pliku');
        }
        
        // Ask user about import options
        const clearExisting = await showConfirmDialog({
            title: 'Opcje importu',
            message: 'Czy usunąć istniejące dane przed importem?',
            icon: '📥',
            confirmText: 'Tak, wyczyść',
            cancelText: 'Nie, dodaj',
            type: 'warning',
            details: {
                'Tak': 'Usuń wszystkie dane i zastąp importowanymi',
                'Nie': 'Dodaj do istniejących (pominie duplikaty)'
            }
        });
        
        // Import data
        const results = await db.importAllData(importData, {
            clearExisting: clearExisting,
            skipDuplicates: true
        });
        
        // Show results
        const totalImported = Object.values(results.imported).reduce((a, b) => a + b, 0);
        const totalSkipped = Object.values(results.skipped).reduce((a, b) => a + b, 0);
        
        let message = `✅ Import ukończony!\n\n`;
        message += `📥 Zaimportowano: ${totalImported} rekordów\n`;
        if (totalSkipped > 0) {
            message += `⏭️ Pominięto (duplikaty): ${totalSkipped} rekordów\n`;
        }
        if (results.errors.length > 0) {
            message += `⚠️ Błędy: ${results.errors.length}\n`;
        }
        
        message += `\nSzczegóły:\n`;
        message += `• Przedmioty: ${results.imported.subjects || 0}\n`;
        message += `• Wykłady: ${results.imported.lectures || 0}\n`;
        message += `• Fiszki: ${results.imported.flashcards || 0}\n`;
        message += `• Notatki: ${results.imported.notes || 0}`;
        
        alert(message);
        
        importBtn.textContent = '✅ Import ukończony!';
        setTimeout(() => {
            importBtn.textContent = originalText;
            importBtn.disabled = false;
        }, 2000);
        
        // Reload current view
        await loadDataStatistics();
        if (currentTab === 'dashboard') await loadDashboard();
        if (currentTab === 'lectures') await loadLectures();
        if (currentTab === 'flashcards') await loadFlashcards();
        
        console.log('✅ Import completed:', results);
        
    } catch (error) {
        console.error('❌ Import error:', error);
        alert('❌ Błąd podczas importu danych: ' + error.message);
        
        const importBtn = document.getElementById('btn-import-data');
        importBtn.textContent = '📥 Importuj dane z pliku';
        importBtn.disabled = false;
    }
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
        
        // Load basic notes content
        setContentWithLatex('lecture-notes-content', lecture.notes 
            ? renderMarkdownWithLatex(lecture.notes)
            : '<p style="color: var(--text-secondary); text-align: center; padding: 40px;">Brak notatek. Użyj przycisku "Generuj z AI" aby stworzyć notatki automatycznie.</p>');
        
        // Load detailed note
        setContentWithLatex('lecture-detailed-content', lecture.detailedNote 
            ? renderMarkdownWithLatex(lecture.detailedNote)
            : '<p style="color: var(--text-secondary); text-align: center; padding: 40px;">Brak szczegółowej notatki. Użyj przycisku "Generuj z AI".</p>');
        
        // Load short note
        setContentWithLatex('lecture-short-content', lecture.shortNote 
            ? renderMarkdownWithLatex(lecture.shortNote)
            : '<p style="color: var(--text-secondary); text-align: center; padding: 40px;">Brak krótkiej notatki. Użyj przycisku "Generuj z AI".</p>');
        
        // Load key points
        setContentWithLatex('lecture-keypoints-content', lecture.keyPoints 
            ? renderMarkdownWithLatex(lecture.keyPoints)
            : '<p style="color: var(--text-secondary); text-align: center; padding: 40px;">Brak kluczowych punktów. Użyj przycisku "Generuj z AI".</p>');
        
        // Show/hide "Mark as read" buttons based on content availability
        updateReadButtons(lecture);
        
        // Load transcription
        document.getElementById('lecture-transcription-content').innerHTML = lecture.transcription
            ? `<div style="white-space: pre-wrap;">${lecture.transcription}</div>`
            : '<p style="color: var(--text-secondary);">Brak transkrypcji</p>';
        
        // Load flashcards
        const flashcards = await db.getFlashcardsByLecture(lectureId);
        const flashcardsContent = document.getElementById('lecture-flashcards-content');
        if (flashcards.length > 0) {
            flashcardsContent.innerHTML = `
                <div class="grid">
                    ${flashcards.map(card => `
                        <div class="card flashcard-content">
                            <div style="margin-bottom: 10px; font-weight: 600;">❓ ${card.question}</div>
                            <div style="color: var(--text-secondary);">💡 ${card.answer}</div>
                            ${card.category ? `<div style="margin-top: 10px; font-size: 12px; color: var(--primary);">📁 ${card.category}</div>` : ''}
                        </div>
                    `).join('')}
                </div>
            `;
            // Render LaTeX in flashcards
            renderLatex(flashcardsContent);
        } else {
            flashcardsContent.innerHTML = 
                '<p style="color: var(--text-secondary); text-align: center; padding: 40px;">Brak fiszek. Użyj przycisku "Generuj z AI" aby stworzyć fiszki automatycznie.</p>';
        }
        
        // Load quiz
        if (lecture.quiz && lecture.quiz.length > 0) {
            renderQuiz(lecture.quiz);
        } else {
            document.getElementById('lecture-quiz-content').innerHTML = 
                '<p style="color: var(--text-secondary); text-align: center; padding: 40px;">Brak quizu. Użyj przycisku "Generuj z AI" aby stworzyć quiz automatycznie.</p>';
        }
        
        // Load Cloze flashcards
        if (lecture.clozeCards && lecture.clozeCards.length > 0) {
            renderClozeCards(lecture.clozeCards);
        } else {
            document.getElementById('lecture-cloze-content').innerHTML = 
                '<p style="color: var(--text-secondary); text-align: center; padding: 40px;">Brak fiszek Cloze. Użyj przycisku "Generuj z AI" aby stworzyć fiszki z lukami.</p>';
        }
        
        // Load exam requirements
        const examRequirementsInput = document.getElementById('exam-requirements-input');
        if (examRequirementsInput) {
            examRequirementsInput.value = lecture.examRequirements || '';
        }
        
        // Hide exam materials container initially
        const examMaterialsContainer = document.getElementById('exam-materials-container');
        if (examMaterialsContainer) {
            examMaterialsContainer.style.display = 'none';
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
            
            // Update UI with LaTeX support
            setContentWithLatex('lecture-notes-content', renderMarkdownWithLatex(notes.formatted));
            
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
            
            // Update UI with LaTeX support
            setContentWithLatex('lecture-notes-content', renderMarkdownWithLatex(result.formatted));
            
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
            
            // Update UI with LaTeX support
            setContentWithLatex('lecture-detailed-content', renderMarkdownWithLatex(detailedNote));
            
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
            
            // Update UI with LaTeX support
            setContentWithLatex('lecture-short-content', renderMarkdownWithLatex(shortNote));
            
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
            
            // Update UI with LaTeX support
            setContentWithLatex('lecture-keypoints-content', renderMarkdownWithLatex(keyPoints));
            
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
            const flashcardsContainer = document.getElementById('lecture-flashcards-content');
            flashcardsContainer.innerHTML = `
                <div class="grid">
                    ${allFlashcards.map(card => `
                        <div class="card flashcard-content">
                            <div style="margin-bottom: 10px; font-weight: 600;">❓ ${card.question}</div>
                            <div style="color: var(--text-secondary);">💡 ${card.answer}</div>
                            ${card.category ? `<div style="margin-top: 10px; font-size: 13px; color: var(--primary);">📁 ${card.category}</div>` : ''}
                        </div>
                    `).join('')}
                </div>
            `;
            // Render LaTeX in flashcards
            renderLatex(flashcardsContainer);
            
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
    
    // Generate Cloze flashcards
    document.getElementById('btn-generate-cloze').addEventListener('click', async () => {
        if (!window.currentLectureId) return;
        
        const lecture = await db.getLecture(window.currentLectureId);
        if (!lecture.transcription) {
            alert('❌ Brak transkrypcji do przetworzenia');
            return;
        }
        
        const btn = document.getElementById('btn-generate-cloze');
        btn.disabled = true;
        btn.textContent = '⏳ Generowanie...';
        
        try {
            const clozeCards = await ai.generateClozeFlashcards(lecture.transcription, (percent, message) => {
                btn.textContent = `⏳ ${message}`;
            });
            
            // Save to database as flashcards with type: 'cloze'
            for (const card of clozeCards) {
                await db.addFlashcard({
                    type: 'cloze',
                    text: card.text,
                    clozes: card.clozes,
                    category: card.category,
                    difficulty: card.difficulty,
                    front: card.text, // For compatibility
                    back: card.clozes.map(c => c.answer).join(', '),
                    subjectId: lecture.subjectId,
                    lectureId: window.currentLectureId
                });
            }
            
            // Save to lecture for persistence
            await db.updateLecture(window.currentLectureId, { clozeCards });
            
            // Render cloze cards
            renderClozeCards(clozeCards);
            
            btn.textContent = '✨ Generuj z AI';
            btn.disabled = false;
            
            alert(`✅ Wygenerowano ${clozeCards.length} fiszek Cloze!`);
            
        } catch (error) {
            console.error('Error generating cloze flashcards:', error);
            alert(`❌ Błąd: ${error.message}`);
            btn.textContent = '✨ Generuj z AI';
            btn.disabled = false;
        }
    });
    
    // ============================================
    // EXAM/KOLOKWIUM HANDLERS
    // ============================================
    
    // Save exam requirements
    document.getElementById('btn-save-exam-requirements')?.addEventListener('click', async () => {
        if (!window.currentLectureId) return;
        
        const requirements = document.getElementById('exam-requirements-input').value;
        
        try {
            await db.updateLecture(window.currentLectureId, { examRequirements: requirements });
            showToast('✅ Wymagania na kolokwium zapisane!');
        } catch (error) {
            console.error('Error saving exam requirements:', error);
            alert('❌ Błąd zapisywania');
        }
    });
    
    // Generate exam summary
    document.getElementById('btn-generate-exam-summary')?.addEventListener('click', async () => {
        await generateExamMaterial('summary', '📋 Podsumowanie na kolokwium');
    });
    
    // Generate exam flashcards
    document.getElementById('btn-generate-exam-flashcards')?.addEventListener('click', async () => {
        await generateExamMaterial('flashcards', '🎴 Fiszki na kolokwium');
    });
    
    // Generate exam quiz
    document.getElementById('btn-generate-exam-quiz')?.addEventListener('click', async () => {
        await generateExamMaterial('quiz', '❓ Quiz egzaminacyjny');
    });
    
    // Generate cheatsheet
    document.getElementById('btn-generate-exam-cheatsheet')?.addEventListener('click', async () => {
        await generateExamMaterial('cheatsheet', '📑 Ściągawka');
    });
    
    // Copy exam materials
    document.getElementById('btn-copy-exam-materials')?.addEventListener('click', () => {
        const content = document.getElementById('exam-materials-content');
        if (content) {
            navigator.clipboard.writeText(content.innerText)
                .then(() => showToast('📋 Skopiowano do schowka!'))
                .catch(() => alert('❌ Błąd kopiowania'));
        }
    });
}

/**
 * Generate exam material of specified type
 */
async function generateExamMaterial(materialType, title) {
    if (!window.currentLectureId) return;
    
    const requirements = document.getElementById('exam-requirements-input')?.value;
    if (!requirements || requirements.trim().length === 0) {
        alert('❌ Najpierw wpisz wymagania na kolokwium!');
        return;
    }
    
    const lecture = await db.getLecture(window.currentLectureId);
    const btn = document.getElementById(`btn-generate-exam-${materialType}`);
    const container = document.getElementById('exam-materials-container');
    const contentDiv = document.getElementById('exam-materials-content');
    const titleEl = document.getElementById('exam-materials-title');
    
    btn.disabled = true;
    btn.style.opacity = '0.6';
    
    try {
        const result = await ai.generateExamMaterials(
            requirements,
            lecture.transcription || '',
            materialType,
            (percent, message) => {
                // Could show progress here
            }
        );
        
        // Show results container
        container.style.display = 'block';
        titleEl.textContent = title;
        
        // Render based on type
        if (materialType === 'flashcards') {
            renderExamFlashcards(result.content, contentDiv);
        } else if (materialType === 'quiz') {
            renderExamQuiz(result.content, contentDiv);
        } else {
            // Summary or cheatsheet - markdown
            setContentWithLatex('exam-materials-content', renderMarkdownWithLatex(result.content));
        }
        
        // Save to lecture
        const examMaterials = lecture.examMaterials || {};
        examMaterials[materialType] = result.content;
        await db.updateLecture(window.currentLectureId, { examMaterials });
        
        showToast(`✅ ${title} wygenerowane!`);
        
        // Scroll to results
        container.scrollIntoView({ behavior: 'smooth', block: 'start' });
        
    } catch (error) {
        console.error('Error generating exam materials:', error);
        alert(`❌ Błąd: ${error.message}`);
    } finally {
        btn.disabled = false;
        btn.style.opacity = '1';
    }
}

/**
 * Render exam flashcards
 */
function renderExamFlashcards(flashcards, container) {
    if (!Array.isArray(flashcards)) {
        container.innerHTML = renderMarkdownWithLatex(flashcards);
        renderLatex(container);
        return;
    }
    
    container.innerHTML = `
        <div style="display: grid; gap: 15px;">
            ${flashcards.map((card, idx) => `
                <div class="card exam-flashcard" style="cursor: pointer;" onclick="this.classList.toggle('flipped')">
                    <div style="display: flex; justify-content: space-between; align-items: start; margin-bottom: 10px;">
                        <span style="background: var(--primary); color: white; padding: 4px 10px; border-radius: 12px; font-size: 12px; font-weight: 600;">
                            #${idx + 1}
                        </span>
                        ${card.category ? `<span style="font-size: 13px; color: var(--text-secondary);">📁 ${card.category}</span>` : ''}
                    </div>
                    <div class="exam-flashcard-question" style="font-weight: 600; font-size: 16px; margin-bottom: 12px;">
                        ❓ ${card.question}
                    </div>
                    <div class="exam-flashcard-answer" style="display: none; padding: 15px; background: linear-gradient(135deg, rgba(16, 185, 129, 0.1), rgba(5, 150, 105, 0.1)); border-radius: 8px; border-left: 3px solid #10b981;">
                        💡 ${card.answer}
                        ${card.examTip ? `<div style="margin-top: 10px; font-size: 13px; color: var(--text-secondary);"><strong>🎓 Wskazówka:</strong> ${card.examTip}</div>` : ''}
                    </div>
                    <div style="text-align: center; margin-top: 10px; font-size: 13px; color: var(--text-secondary);">
                        Kliknij, aby zobaczyć odpowiedź
                    </div>
                </div>
            `).join('')}
        </div>
        <style>
            .exam-flashcard.flipped .exam-flashcard-answer { display: block !important; }
            .exam-flashcard.flipped .exam-flashcard-question { color: var(--text-secondary); }
        </style>
    `;
    
    renderLatex(container);
}

/**
 * Render exam quiz
 */
function renderExamQuiz(questions, container) {
    if (!Array.isArray(questions)) {
        container.innerHTML = renderMarkdownWithLatex(questions);
        renderLatex(container);
        return;
    }
    
    container.innerHTML = `
        <div id="exam-quiz-questions">
            ${questions.map((q, idx) => `
                <div class="card exam-quiz-question" data-correct="${q.correctIndex}" style="margin-bottom: 15px;">
                    <div style="display: flex; gap: 12px; margin-bottom: 15px;">
                        <span style="flex-shrink: 0; width: 32px; height: 32px; border-radius: 50%; background: var(--primary); color: white; display: flex; align-items: center; justify-content: center; font-weight: 600;">
                            ${idx + 1}
                        </span>
                        <div style="flex: 1;">
                            <div style="font-weight: 600; font-size: 16px;">${q.question}</div>
                            ${q.category ? `<span style="font-size: 13px; color: var(--text-secondary);">📁 ${q.category}</span>` : ''}
                        </div>
                    </div>
                    <div style="display: grid; gap: 8px;">
                        ${q.options.map((opt, optIdx) => `
                            <button class="exam-quiz-option" data-idx="${optIdx}" 
                                    style="text-align: left; padding: 12px 15px; background: var(--bg-dark); border: 2px solid transparent; border-radius: 8px; cursor: pointer; transition: all 0.2s;">
                                ${opt}
                            </button>
                        `).join('')}
                    </div>
                    <div class="exam-quiz-explanation" style="display: none; margin-top: 15px; padding: 12px; background: var(--bg-hover); border-radius: 8px;">
                        <strong>📝 Wyjaśnienie:</strong> ${q.explanation || 'Brak wyjaśnienia'}
                    </div>
                </div>
            `).join('')}
        </div>
        <div style="text-align: center; margin-top: 20px;">
            <button class="btn btn-primary" id="btn-check-exam-quiz" style="padding: 12px 30px;">
                ✅ Sprawdź odpowiedzi
            </button>
        </div>
    `;
    
    // Add click handlers for options
    container.querySelectorAll('.exam-quiz-option').forEach(btn => {
        btn.addEventListener('click', function() {
            const question = this.closest('.exam-quiz-question');
            question.querySelectorAll('.exam-quiz-option').forEach(o => {
                o.style.borderColor = 'transparent';
                o.style.background = 'var(--bg-dark)';
            });
            this.style.borderColor = 'var(--primary)';
            this.style.background = 'rgba(99, 102, 241, 0.2)';
            this.dataset.selected = 'true';
        });
    });
    
    // Check answers button
    document.getElementById('btn-check-exam-quiz')?.addEventListener('click', () => {
        let correct = 0;
        let total = 0;
        
        container.querySelectorAll('.exam-quiz-question').forEach(question => {
            const correctIdx = parseInt(question.dataset.correct);
            const selectedBtn = question.querySelector('.exam-quiz-option[data-selected="true"]');
            
            if (selectedBtn) {
                total++;
                const selectedIdx = parseInt(selectedBtn.dataset.idx);
                
                if (selectedIdx === correctIdx) {
                    correct++;
                    selectedBtn.style.background = 'rgba(16, 185, 129, 0.3)';
                    selectedBtn.style.borderColor = '#10b981';
                } else {
                    selectedBtn.style.background = 'rgba(239, 68, 68, 0.3)';
                    selectedBtn.style.borderColor = '#ef4444';
                }
            }
            
            // Show correct answer
            const correctBtn = question.querySelectorAll('.exam-quiz-option')[correctIdx];
            if (correctBtn) {
                correctBtn.style.background = 'rgba(16, 185, 129, 0.3)';
                correctBtn.style.borderColor = '#10b981';
            }
            
            // Show explanation
            question.querySelector('.exam-quiz-explanation').style.display = 'block';
        });
        
        showToast(`📊 Wynik: ${correct}/${total} poprawnych odpowiedzi`);
    });
    
    renderLatex(container);
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
                        ${q.category ? `<span style="display: inline-block; background: var(--bg-card); padding: 4px 10px; border-radius: 6px; font-size: 13px; color: var(--text-secondary);">📁 ${q.category}</span>` : ''}
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
    
    // Render LaTeX in quiz questions and options
    renderLatex(container);
    
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

// ============================================
// CLOZE FLASHCARDS HELPERS
// ============================================

/**
 * Render Cloze flashcards in the lecture view
 * @param {Array} clozeCards - Array of cloze cards with text and clozes
 */
function renderClozeCards(clozeCards) {
    const container = document.getElementById('lecture-cloze-content');
    
    if (!clozeCards || clozeCards.length === 0) {
        container.innerHTML = `
            <p style="color: var(--text-secondary); text-align: center; padding: 40px;">
                Brak fiszek Cloze. Użyj przycisku "Generuj z AI" aby stworzyć fiszki z lukami.
            </p>`;
        return;
    }
    
    container.innerHTML = `
        <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 20px;">
            <span style="color: var(--text-secondary);">
                📊 ${clozeCards.length} fiszek Cloze | Kliknij lukę aby odsłonić odpowiedź
            </span>
            <button class="btn" id="btn-study-cloze" style="background: var(--primary); padding: 10px 20px;">
                🎓 Tryb nauki
            </button>
        </div>
        <div class="cloze-cards-grid">
            ${clozeCards.map((card, idx) => renderSingleClozeCard(card, idx)).join('')}
        </div>
    `;
    
    // Add click handlers for cloze blanks
    container.querySelectorAll('.cloze-blank').forEach(blank => {
        blank.addEventListener('click', () => toggleCloze(blank));
    });
    
    // Add study mode button handler - fetch cards from DB to get IDs for mastery tracking
    document.getElementById('btn-study-cloze')?.addEventListener('click', async () => {
        // Fetch cloze cards from database (they have proper IDs)
        const allFlashcards = await db.listFlashcards();
        const clozeCardsFromDb = allFlashcards.filter(card => 
            card.type === 'cloze' && card.lectureId === window.currentLectureId
        );
        
        if (clozeCardsFromDb.length > 0) {
            startClozeStudyMode(clozeCardsFromDb);
        } else {
            // Fallback to raw cards if no DB entries
            startClozeStudyMode(clozeCards);
        }
    });
    
    // Render LaTeX
    renderLatex(container);
}

/**
 * Render a single Cloze card HTML
 */
function renderSingleClozeCard(card, idx) {
    // Convert {{c1::answer}} format to clickable blanks
    let displayText = card.text;
    
    if (card.clozes && Array.isArray(card.clozes)) {
        card.clozes.forEach(cloze => {
            const pattern = new RegExp(`\\{\\{${cloze.id}::([^}]+)\\}\\}`, 'g');
            displayText = displayText.replace(pattern, 
                `<span class="cloze-blank" data-answer="${cloze.answer}" data-hint="${cloze.hint || ''}" data-revealed="false">
                    <span class="cloze-hidden">[...]</span>
                    <span class="cloze-answer" style="display: none;">${cloze.answer}</span>
                </span>`
            );
        });
    }
    
    // Apply Markdown to the display text (after cloze processing)
    displayText = renderMarkdownWithLatex(displayText);
    
    const difficultyColors = {
        easy: '#10b981',
        medium: '#f59e0b',
        hard: '#ef4444'
    };
    const difficultyLabels = {
        easy: 'Łatwe',
        medium: 'Średnie',
        hard: 'Trudne'
    };
    
    return `
        <div class="card cloze-card" data-card-idx="${idx}">
            <div class="cloze-card-header">
                <span class="cloze-card-number">#${idx + 1}</span>
                ${card.category ? `<span class="cloze-card-category">📁 ${card.category}</span>` : ''}
                ${card.difficulty ? `<span class="cloze-card-difficulty" style="color: ${difficultyColors[card.difficulty] || '#888'};">
                    ${difficultyLabels[card.difficulty] || card.difficulty}
                </span>` : ''}
            </div>
            <div class="cloze-card-content flashcard-markdown">
                ${displayText}
            </div>
            <div class="cloze-card-actions">
                <button class="btn-reveal-all" onclick="revealAllClozes(this.closest('.cloze-card'))">
                    👁 Pokaż wszystkie
                </button>
                <button class="btn-hide-all" onclick="hideAllClozes(this.closest('.cloze-card'))">
                    🙈 Ukryj wszystkie
                </button>
            </div>
        </div>
    `;
}

/**
 * Toggle a single cloze blank visibility
 */
function toggleCloze(blankElement) {
    const isRevealed = blankElement.dataset.revealed === 'true';
    const hiddenSpan = blankElement.querySelector('.cloze-hidden');
    const answerSpan = blankElement.querySelector('.cloze-answer');
    
    if (isRevealed) {
        hiddenSpan.style.display = 'inline';
        answerSpan.style.display = 'none';
        blankElement.dataset.revealed = 'false';
        blankElement.classList.remove('revealed');
    } else {
        hiddenSpan.style.display = 'none';
        answerSpan.style.display = 'inline';
        blankElement.dataset.revealed = 'true';
        blankElement.classList.add('revealed');
    }
}

/**
 * Reveal all clozes in a card
 */
window.revealAllClozes = function(cardElement) {
    cardElement.querySelectorAll('.cloze-blank').forEach(blank => {
        const hiddenSpan = blank.querySelector('.cloze-hidden');
        const answerSpan = blank.querySelector('.cloze-answer');
        hiddenSpan.style.display = 'none';
        answerSpan.style.display = 'inline';
        blank.dataset.revealed = 'true';
        blank.classList.add('revealed');
    });
};

/**
 * Hide all clozes in a card
 */
window.hideAllClozes = function(cardElement) {
    cardElement.querySelectorAll('.cloze-blank').forEach(blank => {
        const hiddenSpan = blank.querySelector('.cloze-hidden');
        const answerSpan = blank.querySelector('.cloze-answer');
        hiddenSpan.style.display = 'inline';
        answerSpan.style.display = 'none';
        blank.dataset.revealed = 'false';
        blank.classList.remove('revealed');
    });
};

/**
 * Start Cloze study mode - interactive flashcard session
 */
function startClozeStudyMode(clozeCards) {
    // Initialize study session for cloze cards
    currentStudySession = {
        type: 'cloze',
        mode: 'cloze',
        cards: clozeCards,
        currentIndex: 0,
        correct: 0,
        incorrect: 0,
        incorrectCards: [],
        totalCards: clozeCards.length,
        round: 1,
        startTime: Date.now()
    };
    
    switchTab('study-mode');
    // Show study session step
    showStudyStep('study-session');
    
    displayClozeStudyCard();
}

/**
 * Display current cloze card in study mode
 */
function displayClozeStudyCard() {
    const session = currentStudySession;
    const sessionContainer = document.getElementById('study-session');
    
    // Check if we've gone through all cards in this round
    if (session.currentIndex >= session.cards.length) {
        // Check if there are incorrect cards to repeat
        if (session.incorrectCards.length > 0) {
            // Start new round with only incorrect cards
            session.round++;
            session.cards = [...session.incorrectCards];
            session.incorrectCards = [];
            session.currentIndex = 0;
            // Shuffle cards for new round
            session.cards = shuffleArray(session.cards);
            
            // Show round transition message
            sessionContainer.innerHTML = `
                <div class="card" style="padding: 40px; text-align: center;">
                    <h2 style="color: var(--primary); margin-bottom: 20px;">🔄 Runda ${session.round}</h2>
                    <p style="font-size: 18px; margin-bottom: 15px;">
                        Pozostało <strong>${session.cards.length}</strong> fiszek do opanowania
                    </p>
                    <p style="color: var(--text-secondary); margin-bottom: 30px;">
                        Powtórzmy te, które sprawiły trudność!
                    </p>
                    <button class="btn btn-primary" onclick="displayClozeStudyCard()">
                        Kontynuuj naukę
                    </button>
                </div>
            `;
            return;
        } else {
            // All cards mastered - show results
            showStudyResults();
            return;
        }
    }
    
    const currentCard = session.cards[session.currentIndex];
    
    // Build display text with hidden clozes
    let displayText = currentCard.text;
    if (currentCard.clozes && Array.isArray(currentCard.clozes)) {
        currentCard.clozes.forEach(cloze => {
            const pattern = new RegExp(`\\{\\{${cloze.id}::([^}]+)\\}\\}`, 'g');
            displayText = displayText.replace(pattern, 
                `<span class="cloze-blank study-cloze" data-answer="${cloze.answer}" data-revealed="false">
                    <span class="cloze-hidden">[...]</span>
                    <span class="cloze-answer" style="display: none;">${cloze.answer}</span>
                </span>`
            );
        });
    }
    
    // Apply Markdown to the display text (after cloze processing)
    displayText = renderMarkdownWithLatex(displayText);
    
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
        
        <div class="card study-cloze-card flashcard-markdown" style="padding: 40px; font-size: 20px; line-height: 1.8; text-align: center; min-height: 200px;">
            ${displayText}
        </div>
        
        <p style="text-align: center; color: var(--text-secondary); margin: 20px 0;">
            Kliknij na lukę [...] aby odsłonić odpowiedź
        </p>
        
        <div class="study-controls" style="display: none;" id="cloze-rating-controls">
            <button class="study-btn incorrect" onclick="rateClozeCard(false)">
                ❌ Nie umiem
            </button>
            <button class="study-btn" onclick="revealAllStudyClozes()">
                👁 Pokaż wszystkie
            </button>
            <button class="study-btn correct" onclick="rateClozeCard(true)">
                ✅ Umiem
            </button>
        </div>
        
        <div style="text-align: center; margin-top: 20px;">
            <button class="study-btn" onclick="endStudySession()">
                🏁 Zakończ sesję
            </button>
        </div>
    `;
    
    // Add click handlers for study cloze blanks
    sessionContainer.querySelectorAll('.study-cloze').forEach(blank => {
        blank.addEventListener('click', () => {
            toggleCloze(blank);
            // Show rating controls after first reveal
            document.getElementById('cloze-rating-controls').style.display = 'flex';
        });
    });
    
    // Render LaTeX
    renderLatex(sessionContainer);
}

/**
 * Reveal all clozes in study mode
 */
window.revealAllStudyClozes = function() {
    document.querySelectorAll('.study-cloze').forEach(blank => {
        const hiddenSpan = blank.querySelector('.cloze-hidden');
        const answerSpan = blank.querySelector('.cloze-answer');
        hiddenSpan.style.display = 'none';
        answerSpan.style.display = 'inline';
        blank.dataset.revealed = 'true';
        blank.classList.add('revealed');
    });
    document.getElementById('cloze-rating-controls').style.display = 'flex';
};

/**
 * Rate cloze card and move to next
 */
window.rateClozeCard = async function(isCorrect) {
    const currentCard = currentStudySession.cards[currentStudySession.currentIndex];
    const quality = isCorrect ? 3 : 1; // SM2 quality: 3=good, 1=bad
    
    // Record study session for accuracy tracking (include round number for difficulty calculation)
    await db.recordStudySession({
        flashcardId: currentCard?.id,
        type: 'cloze',
        quality: quality,
        isCorrect: isCorrect,
        round: currentStudySession.round || 1
    });
    
    if (isCorrect) {
        currentStudySession.correct++;
        // Award points for correct answer
        await recordActivity('cloze_correct');
        
        // Update flashcard progress in database (SM2-like)
        if (currentCard && currentCard.id) {
            const currentRep = (currentCard.repetition || 0) + 1;
            const currentEase = currentCard.easeFactor || 2.5;
            const currentInterval = currentCard.interval || 0;
            
            // Calculate new interval
            let newInterval;
            if (currentRep === 1) {
                newInterval = 1;
            } else if (currentRep === 2) {
                newInterval = 6;
            } else {
                newInterval = Math.round(currentInterval * currentEase);
            }
            
            // Calculate new due date
            const dueDate = new Date();
            dueDate.setDate(dueDate.getDate() + newInterval);
            
            try {
                await db.updateFlashcard(currentCard.id, {
                    repetition: currentRep,
                    interval: newInterval,
                    easeFactor: Math.max(1.3, currentEase + 0.1),
                    dueDate: dueDate.toISOString(),
                    lastReviewed: new Date().toISOString()
                });
            } catch (e) {
                console.warn('Could not update cloze card progress:', e);
            }
        }
    } else {
        currentStudySession.incorrect++;
        // Award points for incorrect (still learning!)
        await recordActivity('cloze_incorrect', false);
        
        // Reset card progress on incorrect
        if (currentCard && currentCard.id) {
            try {
                await db.updateFlashcard(currentCard.id, {
                    repetition: 0,
                    interval: 0,
                    easeFactor: Math.max(1.3, (currentCard.easeFactor || 2.5) - 0.2),
                    dueDate: new Date().toISOString(),
                    lastReviewed: new Date().toISOString()
                });
            } catch (e) {
                console.warn('Could not reset cloze card progress:', e);
            }
        }
        
        // Add card to incorrect list for potential replay
        if (currentCard && !currentStudySession.incorrectCards.find(c => c.text === currentCard.text)) {
            currentStudySession.incorrectCards.push(currentCard);
        }
    }
    
    currentStudySession.currentIndex++;
    saveStudySession(); // Save progress
    displayClozeStudyCard();
};

// Export displayClozeStudyCard for round transition button
window.displayClozeStudyCard = displayClozeStudyCard;

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
// SCHEDULE (PLAN ZAJĘĆ) - Grid View
// ============================================

async function loadSchedule() {
    const events = await db.listScheduleEvents();
    const subjects = await db.listSubjects();
    
    const container = document.getElementById('schedule-view');
    
    // Update current time display
    updateCurrentTimeDisplay();
    
    if (events.length === 0) {
        container.innerHTML = `
            <div style="width: 100%; text-align: center; padding: 60px;">
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
    
    // Find time range for schedule
    let minHour = 24, maxHour = 0;
    events.forEach(event => {
        const startHour = parseInt(event.startTime.split(':')[0]);
        const endHour = parseInt(event.endTime.split(':')[0]);
        minHour = Math.min(minHour, startHour);
        maxHour = Math.max(maxHour, endHour + 1);
    });
    
    // Add padding
    minHour = Math.max(7, minHour - 1);
    maxHour = Math.min(22, maxHour + 1);
    
    const dayNames = ['Niedz.', 'Pon.', 'Wt.', 'Śr.', 'Czw.', 'Pt.', 'Sob.'];
    const dayNamesFull = ['Niedziela', 'Poniedziałek', 'Wtorek', 'Środa', 'Czwartek', 'Piątek', 'Sobota'];
    const currentDay = new Date().getDay();
    const currentHour = new Date().getHours();
    const currentMinutes = new Date().getMinutes();
    
    // Group events by day
    const eventsByDay = {};
    events.forEach(event => {
        if (!eventsByDay[event.dayOfWeek]) {
            eventsByDay[event.dayOfWeek] = [];
        }
        eventsByDay[event.dayOfWeek].push(event);
    });
    
    // Generate time slots
    const timeSlots = [];
    for (let hour = minHour; hour < maxHour; hour++) {
        timeSlots.push(`${hour.toString().padStart(2, '0')}:00`);
    }
    
    const hourHeight = 60; // pixels per hour
    const gridHeight = (maxHour - minHour) * hourHeight;
    
    // Build grid HTML
    let html = `
        <div class="schedule-grid" style="display: grid; grid-template-columns: 60px repeat(5, 1fr); min-width: 700px;">
            <!-- Header Row -->
            <div style="background: var(--bg-dark); padding: 12px 8px; text-align: center; font-weight: 600; border-bottom: 2px solid var(--border);">
                🕐
            </div>
            ${[1, 2, 3, 4, 5].map(day => `
                <div style="
                    background: ${day === currentDay ? 'var(--primary)' : 'var(--bg-dark)'}; 
                    color: ${day === currentDay ? 'white' : 'var(--text)'}; 
                    padding: 12px 8px; 
                    text-align: center; 
                    font-weight: 600;
                    border-bottom: 2px solid var(--border);
                    border-left: 1px solid var(--border);
                ">
                    ${dayNames[day]}
                    ${day === currentDay ? '<span style="margin-left: 5px;">●</span>' : ''}
                </div>
            `).join('')}
            
            <!-- Time Column + Day Columns -->
            <div style="position: relative; height: ${gridHeight}px; background: var(--bg-dark);">
                ${timeSlots.map((time, idx) => `
                    <div style="
                        position: absolute;
                        top: ${idx * hourHeight}px;
                        width: 100%;
                        height: ${hourHeight}px;
                        padding: 4px 8px;
                        font-size: 12px;
                        color: var(--text-secondary);
                        border-bottom: 1px solid var(--border);
                        box-sizing: border-box;
                    ">
                        ${time}
                    </div>
                `).join('')}
            </div>
            
            ${[1, 2, 3, 4, 5].map(day => {
                const dayEvents = eventsByDay[day] || [];
                const isToday = day === currentDay;
                
                return `
                    <div style="
                        position: relative; 
                        height: ${gridHeight}px; 
                        background: ${isToday ? 'rgba(99, 102, 241, 0.03)' : 'var(--bg-card)'};
                        border-left: 1px solid var(--border);
                    ">
                        <!-- Hour lines -->
                        ${timeSlots.map((_, idx) => `
                            <div style="
                                position: absolute;
                                top: ${idx * hourHeight}px;
                                width: 100%;
                                height: ${hourHeight}px;
                                border-bottom: 1px solid var(--border);
                                box-sizing: border-box;
                            "></div>
                        `).join('')}
                        
                        <!-- Current time indicator -->
                        ${isToday && currentHour >= minHour && currentHour < maxHour ? `
                            <div style="
                                position: absolute;
                                top: ${((currentHour - minHour) * 60 + currentMinutes) * (hourHeight / 60)}px;
                                left: 0;
                                right: 0;
                                height: 2px;
                                background: #ef4444;
                                z-index: 10;
                            ">
                                <div style="
                                    position: absolute;
                                    left: -4px;
                                    top: -4px;
                                    width: 10px;
                                    height: 10px;
                                    background: #ef4444;
                                    border-radius: 50%;
                                "></div>
                            </div>
                        ` : ''}
                        
                        <!-- Events -->
                        ${dayEvents.map(event => {
                            const subject = subjects.find(s => s.id === event.subjectId);
                            const startMinutes = parseTimeToMinutes(event.startTime);
                            const endMinutes = parseTimeToMinutes(event.endTime);
                            const topPos = ((startMinutes / 60) - minHour) * hourHeight;
                            const height = ((endMinutes - startMinutes) / 60) * hourHeight;
                            
                            const typeEmoji = {
                                'lecture': '📖',
                                'exercise': '✏️',
                                'lab': '🔬',
                                'seminar': '💬',
                                'exam': '📝',
                                'other': '📌'
                            };
                            
                            // Check if currently active
                            const nowMinutes = currentHour * 60 + currentMinutes;
                            const isActive = isToday && nowMinutes >= startMinutes && nowMinutes <= endMinutes;
                            
                            return `
                                <div class="schedule-event" 
                                     onclick="openEditScheduleModal('${event.id}')"
                                     style="
                                        position: absolute;
                                        top: ${topPos + 2}px;
                                        left: 4px;
                                        right: 4px;
                                        height: ${height - 4}px;
                                        background: ${subject?.color || 'var(--primary)'}22;
                                        border-left: 4px solid ${subject?.color || 'var(--primary)'};
                                        border-radius: 6px;
                                        padding: 6px 8px;
                                        overflow: hidden;
                                        cursor: pointer;
                                        transition: all 0.2s;
                                        z-index: 5;
                                        ${isActive ? 'box-shadow: 0 0 0 2px #22c55e; background: rgba(34, 197, 94, 0.15);' : ''}
                                     "
                                     onmouseover="this.style.transform='scale(1.02)'; this.style.zIndex='20';"
                                     onmouseout="this.style.transform='none'; this.style.zIndex='5';"
                                     title="Kliknij aby edytować">
                                    <div style="font-size: 11px; color: var(--text-secondary); margin-bottom: 2px;">
                                        ${event.startTime} - ${event.endTime}
                                        ${isActive ? '<span style="color: #22c55e; margin-left: 4px;">● TERAZ</span>' : ''}
                                    </div>
                                    <div style="font-weight: 600; font-size: 13px; color: ${subject?.color || 'var(--primary)'}; display: flex; align-items: center; gap: 4px;">
                                        <span>${typeEmoji[event.type] || '📌'}</span>
                                        <span style="overflow: hidden; text-overflow: ellipsis; white-space: nowrap;">
                                            ${event.title || subject?.name || 'Zajęcia'}
                                        </span>
                                    </div>
                                    ${height > 50 && event.location ? `
                                        <div style="font-size: 11px; color: var(--text-secondary); margin-top: 2px;">
                                            📍 ${event.location}
                                        </div>
                                    ` : ''}
                                </div>
                            `;
                        }).join('')}
                    </div>
                `;
            }).join('')}
        </div>
        
        <!-- Legend -->
        <div style="padding: 15px; border-top: 1px solid var(--border); display: flex; flex-wrap: wrap; gap: 15px; align-items: center;">
            <span style="font-size: 13px; color: var(--text-secondary);">Legenda:</span>
            <span style="font-size: 13px;">📖 Wykład</span>
            <span style="font-size: 13px;">✏️ Ćwiczenia</span>
            <span style="font-size: 13px;">🔬 Laboratorium</span>
            <span style="font-size: 13px;">💬 Seminarium</span>
            <span style="font-size: 13px;">📝 Egzamin</span>
            <span style="font-size: 13px; margin-left: auto; color: var(--text-secondary);">💡 Kliknij na zajęcia aby edytować</span>
        </div>
    `;
    
    container.innerHTML = html;
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
    const confirmed = await showConfirmDialog({
        title: 'Usuń zajęcia',
        message: 'Czy na pewno chcesz usunąć te zajęcia z planu?',
        icon: '📅',
        confirmText: 'Usuń',
        type: 'danger'
    });
    if (!confirmed) return;
    await db.deleteScheduleEvent(id);
    await loadSchedule();
    showToast('✅ Zajęcia usunięte z planu');
};

// Otwórz modal edycji zajęć
window.openEditScheduleModal = async (id) => {
    console.log('📝 Opening edit modal for schedule event:', id);
    
    try {
        // Pobierz dane zajęć
        const events = await db.listScheduleEvents();
        const event = events.find(e => e.id === id);
        
        if (!event) {
            showToast('❌ Nie znaleziono zajęć');
            return;
        }
        
        // Wypełnij selektor przedmiotów
        const selector = document.getElementById('edit-schedule-subject');
        const subjects = await db.listSubjects();
        
        selector.innerHTML = '<option value="">Wybierz przedmiot...</option>' + 
            subjects.map(s => `<option value="${s.id}" ${s.id === event.subjectId ? 'selected' : ''}>${s.name}</option>`).join('');
        
        // Wypełnij formularz danymi
        document.getElementById('edit-schedule-id').value = event.id;
        document.getElementById('edit-schedule-title').value = event.title || '';
        document.getElementById('edit-schedule-day').value = event.dayOfWeek;
        document.getElementById('edit-schedule-start').value = event.startTime;
        document.getElementById('edit-schedule-end').value = event.endTime;
        document.getElementById('edit-schedule-location').value = event.location || '';
        document.getElementById('edit-schedule-type').value = event.type || 'lecture';
        document.getElementById('edit-schedule-notes').value = event.notes || '';
        
        openModal('modal-edit-schedule');
    } catch (error) {
        console.error('Error opening edit modal:', error);
        showToast('❌ Błąd podczas otwierania edycji');
    }
};

// Obsługa formularza edycji zajęć
document.getElementById('form-edit-schedule')?.addEventListener('submit', async (e) => {
    e.preventDefault();
    
    const id = document.getElementById('edit-schedule-id').value;
    const subjectId = document.getElementById('edit-schedule-subject').value;
    const title = document.getElementById('edit-schedule-title').value.trim();
    const dayOfWeek = parseInt(document.getElementById('edit-schedule-day').value);
    const startTime = document.getElementById('edit-schedule-start').value;
    const endTime = document.getElementById('edit-schedule-end').value;
    const location = document.getElementById('edit-schedule-location').value.trim();
    const type = document.getElementById('edit-schedule-type').value;
    const notes = document.getElementById('edit-schedule-notes').value.trim();
    
    if (!subjectId || !startTime || !endTime) {
        alert('Wypełnij wszystkie wymagane pola!');
        return;
    }
    
    // Walidacja godzin
    if (startTime >= endTime) {
        alert('❌ Godzina rozpoczęcia musi być wcześniejsza niż godzina zakończenia!');
        return;
    }
    
    try {
        await db.updateScheduleEvent(id, {
            subjectId,
            title,
            dayOfWeek,
            startTime,
            endTime,
            location,
            type,
            notes
        });
        closeModal('modal-edit-schedule');
        await loadSchedule();
        showToast('✅ Zajęcia zaktualizowane');
    } catch (error) {
        console.error('Error updating schedule event:', error);
        alert('❌ Błąd podczas aktualizacji: ' + error.message);
    }
});

// ============================================
// CLEAR DATA FUNCTIONS
// ============================================

async function clearAllLectures() {
    const confirmed = await showConfirmDialog({
        title: 'Usuń wszystkie wykłady',
        message: 'Czy na pewno chcesz usunąć WSZYSTKIE wykłady?\n\nTa operacja jest nieodwracalna!',
        icon: '⚠️',
        confirmText: 'Usuń wszystko',
        type: 'danger'
    });
    if (!confirmed) return;
    
    const confirmed2 = await showConfirmDialog({
        title: 'Ostatnie ostrzeżenie',
        message: 'Spowoduje to usunięcie wszystkich wykładów, notatek, transkrypcji i quizów.\n\nKontynuować?',
        icon: '🚨',
        confirmText: 'Tak, usuń',
        type: 'danger'
    });
    if (!confirmed2) return;
    
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
    const confirmed = await showConfirmDialog({
        title: 'Usuń wszystkie fiszki',
        message: 'Czy na pewno chcesz usunąć WSZYSTKIE fiszki?\n\nTa operacja jest nieodwracalna!',
        icon: '⚠️',
        confirmText: 'Usuń wszystko',
        type: 'danger'
    });
    if (!confirmed) return;
    
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
    const confirmed = await showConfirmDialog({
        title: 'Wyczyść plan zajęć',
        message: 'Czy na pewno chcesz usunąć CAŁY plan zajęć?\n\nTa operacja jest nieodwracalna!',
        icon: '📅',
        confirmText: 'Wyczyść',
        type: 'danger'
    });
    if (!confirmed) return;
    
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
    const confirmed = await showConfirmDialog({
        title: 'Usuń wszystkie przedmioty',
        message: 'Czy na pewno chcesz usunąć WSZYSTKIE przedmioty?\n\nUWAGA: Spowoduje to także usunięcie powiązanych wykładów i fiszek!',
        icon: '⚠️',
        confirmText: 'Usuń wszystko',
        type: 'danger'
    });
    if (!confirmed) return;
    
    const confirmed2 = await showConfirmDialog({
        title: 'Ostatnie ostrzeżenie',
        message: 'Usunięcie przedmiotów spowoduje utratę wszystkich wykładów, fiszek i planu zajęć.\n\nKontynuować?',
        icon: '🚨',
        confirmText: 'Tak, usuń',
        type: 'danger'
    });
    if (!confirmed2) return;
    
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
    const confirmed = await showConfirmDialog({
        title: '🚨 UWAGA!',
        message: 'Czy na pewno chcesz usunąć WSZYSTKIE DANE z aplikacji?\n\nTa operacja jest CAŁKOWICIE NIEODWRACALNA!',
        icon: '🚨',
        confirmText: 'Tak, usuń wszystko',
        type: 'danger',
        details: {
            'Przedmioty': 'Wszystkie',
            'Wykłady': 'Wszystkie',
            'Fiszki': 'Wszystkie',
            'Plan zajęć': 'Cały',
            'Notatki': 'Wszystkie'
        }
    });
    if (!confirmed) return;
    
    const confirmed2 = await showConfirmDialog({
        title: '🚨 OSTATECZNE OSTRZEŻENIE!',
        message: 'Tego NIE DA SIĘ cofnąć!\n\nWpisz "USUŃ" w polu poniżej i kliknij potwierdź.',
        icon: '⛔',
        confirmText: 'ROZUMIEM, USUŃ',
        type: 'danger'
    });
    if (!confirmed2) return;
    
    const confirmation = prompt('Wpisz "USUŃ" aby potwierdzić usunięcie wszystkich danych:');
    
    if (confirmation !== 'USUŃ') {
        showToast('❌ Operacja anulowana - nieprawidłowe potwierdzenie');
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
        showToast('❌ Błąd podczas usuwania danych');
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

// Save session to localStorage for persistence
function saveStudySession() {
    if (currentStudySession.cards.length > 0) {
        localStorage.setItem('activeStudySession', JSON.stringify({
            ...currentStudySession,
            savedAt: new Date().toISOString()
        }));
    }
}

// Clear saved session
function clearSavedStudySession() {
    localStorage.removeItem('activeStudySession');
}

// Check for saved session and offer to resume
async function checkForSavedSession() {
    const savedSession = localStorage.getItem('activeStudySession');
    if (!savedSession) return false;
    
    try {
        const session = JSON.parse(savedSession);
        
        // Check if session is less than 24 hours old
        const savedAt = new Date(session.savedAt);
        const now = new Date();
        const hoursDiff = (now - savedAt) / (1000 * 60 * 60);
        
        if (hoursDiff > 24) {
            clearSavedStudySession();
            return false;
        }
        
        // Show resume dialog
        const remainingCards = session.cards.length - session.currentIndex;
        const modeNames = {
            'flashcards': 'Fiszki',
            'quiz': 'Quiz',
            'memory': 'Pamięć',
            'typing': 'Pisanie',
            'cloze': 'Cloze'
        };
        
        const resume = await showConfirmDialog({
            title: 'Niezakończona sesja nauki',
            message: 'Masz niezakończoną sesję nauki!\nCzy chcesz kontynuować?',
            icon: '🔄',
            confirmText: 'Kontynuuj',
            cancelText: 'Zacznij od nowa',
            type: 'success',
            details: {
                'Tryb': modeNames[session.mode] || session.mode,
                'Runda': session.round,
                'Pozostało': `${remainingCards} fiszek`,
                'Poprawne': session.correct,
                'Błędne': session.incorrect
            }
        });
        
        if (resume) {
            currentStudySession = session;
            switchTab('study-mode');
            showStudyStep('study-session');
            
            // Resume based on mode
            if (session.mode === 'cloze' || session.type === 'cloze') {
                displayClozeStudyCard();
            } else {
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
                    default:
                        displayStudyCard();
                }
            }
            return true;
        } else {
            clearSavedStudySession();
            return false;
        }
    } catch (e) {
        console.error('Error parsing saved session:', e);
        clearSavedStudySession();
        return false;
    }
}

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
        btn.onclick = async () => {
            document.querySelectorAll('.study-mode-btn').forEach(b => b.classList.remove('selected'));
            btn.classList.add('selected');
            
            // Show/hide difficult cards info panel
            const difficultPanel = document.getElementById('difficult-cards-info');
            if (btn.dataset.mode === 'difficult') {
                await showDifficultCardsInfo();
                difficultPanel.style.display = 'block';
            } else {
                difficultPanel.style.display = 'none';
            }
            
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
        const isDifficultMode = hasMode && hasMode.dataset.mode === 'difficult';
        
        // For difficult mode, we don't require lecture selection
        if (isDifficultMode) {
            startBtn.disabled = !hasSubject;
        } else {
            startBtn.disabled = !(hasSubject && hasLecture && hasMode);
        }
    }
}

// Show difficult cards information panel
async function showDifficultCardsInfo() {
    const subjectId = document.getElementById('study-subject-select').value;
    const difficultCards = await db.getDifficultFlashcards(20, subjectId || null);
    
    document.getElementById('difficult-count').textContent = difficultCards.length;
    
    const statsContainer = document.getElementById('difficult-stats');
    
    if (difficultCards.length === 0) {
        statsContainer.innerHTML = `
            <div style="grid-column: 1 / -1; text-align: center; color: var(--text-secondary); padding: 20px;">
                <div style="font-size: 48px; margin-bottom: 10px;">🎉</div>
                <p>Nie masz jeszcze trudnych fiszek!</p>
                <p style="font-size: 13px;">Ucz się więcej, a algorytm zidentyfikuje fiszki wymagające powtórki.</p>
            </div>
        `;
        return;
    }
    
    // Calculate stats
    const hardCount = difficultCards.filter(c => c.difficulty.level === 'hard').length;
    const mediumCount = difficultCards.filter(c => c.difficulty.level === 'medium').length;
    const avgAttempts = difficultCards.length > 0
        ? (difficultCards.reduce((sum, c) => sum + c.difficulty.totalAttempts, 0) / difficultCards.length).toFixed(1)
        : 0;
    
    statsContainer.innerHTML = `
        <div class="difficult-stat">
            <div class="difficult-stat-value hard">${hardCount}</div>
            <div class="difficult-stat-label">Bardzo trudne</div>
        </div>
        <div class="difficult-stat">
            <div class="difficult-stat-value medium">${mediumCount}</div>
            <div class="difficult-stat-label">Trudne</div>
        </div>
        <div class="difficult-stat">
            <div class="difficult-stat-value">${avgAttempts}</div>
            <div class="difficult-stat-label">Śr. prób</div>
        </div>
    `;
}

// Start study session
async function startStudySession() {
    const subjectId = document.getElementById('study-subject-select').value;
    const lectureId = document.getElementById('study-lecture-select').value;
    const mode = document.querySelector('.study-mode-btn.selected').dataset.mode;
    
    // Handle difficult mode specially
    if (mode === 'difficult') {
        const difficultCards = await db.getDifficultFlashcards(20, subjectId || null);
        
        if (difficultCards.length === 0) {
            showToast('🎉 Nie masz trudnych fiszek do powtórki!');
            return;
        }
        
        // Separate by type
        const regularDifficult = difficultCards.filter(c => c.type !== 'cloze');
        const clozeDifficult = difficultCards.filter(c => c.type === 'cloze');
        
        // If there are both types, prefer regular flashcards mode
        let cardsToStudy = regularDifficult.length > 0 ? regularDifficult : clozeDifficult;
        const isCloze = regularDifficult.length === 0 && clozeDifficult.length > 0;
        
        // Shuffle and start
        cardsToStudy = shuffleArray(cardsToStudy);
        
        if (isCloze) {
            startClozeStudyMode(cardsToStudy);
        } else {
            // Initialize study session for difficult cards
            currentStudySession = {
                cards: cardsToStudy,
                currentIndex: 0,
                mode: 'flashcards', // Use flashcard mode for difficult
                correct: 0,
                incorrect: 0,
                incorrectCards: [],
                totalCards: cardsToStudy.length,
                round: 1,
                subjectId: subjectId,
                lectureId: 'difficult', // Special marker
                startTime: Date.now(),
                isDifficultMode: true // Mark as difficult mode
            };
            
            switchTab('study-mode');
            showStudyStep('study-session');
            startFlashcardMode();
        }
        
        showToast(`🔥 Rozpoczęto trening ${cardsToStudy.length} trudnych fiszek!`);
        return;
    }
    
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
    
    // Separate regular flashcards from cloze flashcards
    const regularCards = studyCards.filter(card => card.type !== 'cloze');
    const clozeCards = studyCards.filter(card => card.type === 'cloze');
    
    // For cloze mode, use cloze cards; for other modes, use regular cards
    if (mode === 'cloze') {
        if (clozeCards.length === 0) {
            showToast('❌ Brak fiszek Cloze do nauki! Wygeneruj najpierw fiszki Cloze w widoku wykładu.');
            return;
        }
        // Use the dedicated cloze study mode
        startClozeStudyMode(clozeCards);
        return;
    }
    
    // For regular modes, use only regular flashcards
    studyCards = regularCards;
    
    if (studyCards.length === 0) {
        alert('Brak zwykłych fiszek do nauki dla wybranego materiału! Dostępne są tylko fiszki Cloze.');
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
                    <div class="study-flashcard-content flashcard-markdown">
                        ${renderMarkdownWithLatex(currentCard.front || currentCard.question || 'Brak pytania')}
                    </div>
                </div>
                <div class="study-flashcard-back">
                    <div class="study-flashcard-content flashcard-markdown">
                        ${renderMarkdownWithLatex(currentCard.back || currentCard.answer || 'Brak odpowiedzi')}
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
    
    // Render LaTeX in study flashcard
    renderLatex(sessionContainer);
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
            <h3 class="flashcard-markdown">${renderMarkdownWithLatex(currentCard.front || currentCard.question || 'Brak pytania')}</h3>
            <div class="study-quiz-answers">
                ${allAnswers.map((answer, index) => `
                    <button class="study-quiz-answer flashcard-markdown" onclick="selectQuizAnswer(this, '${answer.replace(/'/g, "\\'")}', '${correctAnswer.replace(/'/g, "\\'")}')">
                        ${renderMarkdownWithLatex(answer)}
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
    
    // Render LaTeX in quiz mode
    renderLatex(sessionContainer);
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
            <h3 class="flashcard-markdown">${renderMarkdownWithLatex(currentCard.front || currentCard.question || 'Brak pytania')}</h3>
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
    
    // Render LaTeX in memory mode
    renderLatex(sessionContainer);
    
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
    if (card) {
        card.classList.toggle('flipped');
    }
};

window.markCard = async function(isCorrect) {
    const session = currentStudySession;
    const currentCard = session.cards[session.currentIndex];
    const quality = isCorrect ? 3 : 1; // SM2 quality: 3=good, 1=bad
    
    console.log('markCard called:', isCorrect ? 'correct' : 'incorrect', 'card:', currentCard);
    
    // Record study session for accuracy tracking (include round number for difficulty calculation)
    await db.recordStudySession({
        flashcardId: currentCard?.id,
        type: 'flashcard',
        quality: quality,
        isCorrect: isCorrect,
        round: session.round || 1
    });
    
    if (isCorrect) {
        session.correct++;
        // Award points for correct flashcard
        await recordActivity('flashcard_correct');
    } else {
        session.incorrect++;
        // Award points for trying (smaller amount)
        await recordActivity('flashcard_incorrect', false);
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
    
    nextCard(); // Move to next card (will also save session)
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
    clearSavedStudySession(); // Clear saved session when manually ending
    showStudyResults();
};

// Move to next card
function nextCard() {
    const session = currentStudySession;
    session.currentIndex++;
    
    // Save session AFTER incrementing index (so we resume at the correct card)
    saveStudySession();
    
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
async function showStudyResults() {
    const session = currentStudySession;
    const totalCorrect = session.correct;
    const totalIncorrect = session.incorrect;
    const accuracy = Math.round((totalCorrect / (totalCorrect + totalIncorrect)) * 100) || 0;
    const duration = Math.round((Date.now() - session.startTime) / 1000);
    const masteredCards = session.totalCards - session.incorrectCards.length;
    const roundsCompleted = session.round;
    
    // Clear saved session - study is complete
    clearSavedStudySession();
    
    // Award points for completing study session
    await recordActivity('study_session_complete');
    
    // Bonus for mastering all cards
    if (session.incorrectCards.length === 0 && session.totalCards > 0) {
        await recordActivity('all_cards_mastered');
        checkAndUnlockAchievement('perfectionist');
    }
    
    // Check for study achievements
    if (roundsCompleted >= 3) {
        checkAndUnlockAchievement('persistent');
    }
    
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
// POMODORO TIMER
// ============================================

const pomodoroState = {
    isRunning: false,
    isWorkMode: true,
    timeRemaining: 25 * 60, // 25 minutes in seconds
    workDuration: 25 * 60,
    shortBreakDuration: 5 * 60,
    longBreakDuration: 15 * 60,
    sessionsCompleted: 0,
    timerInterval: null,
    lastSavedAt: null // For calculating elapsed time during page refresh
};

// Save Pomodoro state to localStorage
function savePomodoroState() {
    const stateToSave = {
        isRunning: pomodoroState.isRunning,
        isWorkMode: pomodoroState.isWorkMode,
        timeRemaining: pomodoroState.timeRemaining,
        sessionsCompleted: pomodoroState.sessionsCompleted,
        savedAt: Date.now()
    };
    localStorage.setItem('pomodoroState', JSON.stringify(stateToSave));
}

// Load Pomodoro state from localStorage
async function loadPomodoroState() {
    const saved = localStorage.getItem('pomodoroState');
    if (!saved) return false;
    
    try {
        const state = JSON.parse(saved);
        
        // Check if state is less than 2 hours old
        const hoursDiff = (Date.now() - state.savedAt) / (1000 * 60 * 60);
        if (hoursDiff > 2) {
            localStorage.removeItem('pomodoroState');
            return false;
        }
        
        pomodoroState.isWorkMode = state.isWorkMode;
        pomodoroState.sessionsCompleted = state.sessionsCompleted;
        
        // If timer was running, calculate elapsed time
        if (state.isRunning) {
            const elapsedSeconds = Math.floor((Date.now() - state.savedAt) / 1000);
            pomodoroState.timeRemaining = Math.max(0, state.timeRemaining - elapsedSeconds);
            
            // If time ran out while away, complete the session
            if (pomodoroState.timeRemaining <= 0) {
                pomodoroComplete();
                return true;
            }
            
            // Resume timer
            pomodoroState.isRunning = false; // Will be set true by startPomodoro
            updatePomodoroDisplay();
            
            // Ask user if they want to resume
            const minutes = Math.floor(pomodoroState.timeRemaining / 60);
            const seconds = pomodoroState.timeRemaining % 60;
            const modeText = pomodoroState.isWorkMode ? 'Praca' : 'Przerwa';
            
            const resume = await showConfirmDialog({
                title: 'Aktywny timer Pomodoro',
                message: 'Masz aktywny timer Pomodoro!\nCzy chcesz kontynuować?',
                icon: '🍅',
                confirmText: 'Kontynuuj',
                cancelText: 'Resetuj',
                type: 'success',
                details: {
                    'Tryb': modeText,
                    'Pozostało': `${minutes}:${seconds.toString().padStart(2, '0')}`,
                    'Ukończone sesje': pomodoroState.sessionsCompleted
                }
            });
            
            if (resume) {
                startPomodoro();
            }
        } else {
            // Timer was paused, just restore state
            pomodoroState.timeRemaining = state.timeRemaining;
        }
        
        return true;
    } catch (e) {
        console.error('Error loading Pomodoro state:', e);
        localStorage.removeItem('pomodoroState');
        return false;
    }
}

// Clear saved Pomodoro state
function clearPomodoroState() {
    localStorage.removeItem('pomodoroState');
}

function initPomodoro() {
    const startBtn = document.getElementById('pomodoro-start');
    const pauseBtn = document.getElementById('pomodoro-pause');
    const resetBtn = document.getElementById('pomodoro-reset');
    const toggleBtn = document.getElementById('pomodoro-toggle');
    const widget = document.getElementById('pomodoro-widget');
    
    if (!startBtn) return;
    
    startBtn.addEventListener('click', startPomodoro);
    pauseBtn.addEventListener('click', pausePomodoro);
    resetBtn.addEventListener('click', resetPomodoro);
    toggleBtn.addEventListener('click', () => {
        widget.classList.toggle('minimized');
        toggleBtn.textContent = widget.classList.contains('minimized') ? '+' : '−';
    });
    
    // Make widget draggable
    makeDraggable(widget, document.getElementById('pomodoro-header'));
    
    // Note: loadPomodoroState() is called from main initialization to coordinate with study session dialogs
    
    updatePomodoroDisplay();
}

function startPomodoro() {
    pomodoroState.isRunning = true;
    document.getElementById('pomodoro-start').style.display = 'none';
    document.getElementById('pomodoro-pause').style.display = 'inline-block';
    
    savePomodoroState(); // Save when starting
    
    pomodoroState.timerInterval = setInterval(() => {
        pomodoroState.timeRemaining--;
        updatePomodoroDisplay();
        
        // Save state every 10 seconds to avoid too many writes
        if (pomodoroState.timeRemaining % 10 === 0) {
            savePomodoroState();
        }
        
        if (pomodoroState.timeRemaining <= 0) {
            pomodoroComplete();
        }
    }, 1000);
}

function pausePomodoro() {
    pomodoroState.isRunning = false;
    clearInterval(pomodoroState.timerInterval);
    document.getElementById('pomodoro-start').style.display = 'inline-block';
    document.getElementById('pomodoro-pause').style.display = 'none';
    
    savePomodoroState(); // Save when pausing
}

function resetPomodoro() {
    pausePomodoro();
    pomodoroState.isWorkMode = true;
    pomodoroState.timeRemaining = pomodoroState.workDuration;
    pomodoroState.sessionsCompleted = 0;
    updatePomodoroDisplay();
    
    clearPomodoroState(); // Clear saved state on reset
}

function pomodoroComplete() {
    pausePomodoro();
    
    if (pomodoroState.isWorkMode) {
        pomodoroState.sessionsCompleted++;
        
        // Play notification sound
        playNotificationSound();
        
        // Show notification
        if (Notification.permission === 'granted') {
            new Notification('🍅 Pomodoro zakończone!', {
                body: `Świetna robota! Czas na przerwę.`,
                icon: '🍅'
            });
        }
        
        // Switch to break
        pomodoroState.isWorkMode = false;
        pomodoroState.timeRemaining = pomodoroState.sessionsCompleted % 4 === 0 
            ? pomodoroState.longBreakDuration 
            : pomodoroState.shortBreakDuration;
    } else {
        // Switch back to work
        pomodoroState.isWorkMode = true;
        pomodoroState.timeRemaining = pomodoroState.workDuration;
        
        if (Notification.permission === 'granted') {
            new Notification('⏰ Przerwa zakończona!', {
                body: 'Czas wracać do nauki!',
                icon: '📚'
            });
        }
    }
    
    updatePomodoroDisplay();
    savePomodoroState(); // Save state after completing a phase
}

function updatePomodoroDisplay() {
    const minutes = Math.floor(pomodoroState.timeRemaining / 60);
    const seconds = pomodoroState.timeRemaining % 60;
    
    document.getElementById('pomodoro-timer').textContent = 
        `${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`;
    
    const statusEl = document.getElementById('pomodoro-status');
    statusEl.textContent = pomodoroState.isWorkMode ? 'Praca' : 'Przerwa';
    statusEl.className = 'pomodoro-status ' + (pomodoroState.isWorkMode ? 'work' : 'break');
    
    document.getElementById('pomodoro-session-count').textContent = pomodoroState.sessionsCompleted;
}

function playNotificationSound() {
    const audioContext = new (window.AudioContext || window.webkitAudioContext)();
    const oscillator = audioContext.createOscillator();
    const gainNode = audioContext.createGain();
    
    oscillator.connect(gainNode);
    gainNode.connect(audioContext.destination);
    
    oscillator.frequency.value = 800;
    oscillator.type = 'sine';
    gainNode.gain.value = 0.3;
    
    oscillator.start();
    oscillator.stop(audioContext.currentTime + 0.3);
}

function makeDraggable(element, handle) {
    let pos1 = 0, pos2 = 0, pos3 = 0, pos4 = 0;
    
    handle.onmousedown = dragMouseDown;
    
    function dragMouseDown(e) {
        e.preventDefault();
        pos3 = e.clientX;
        pos4 = e.clientY;
        document.onmouseup = closeDragElement;
        document.onmousemove = elementDrag;
    }
    
    function elementDrag(e) {
        e.preventDefault();
        pos1 = pos3 - e.clientX;
        pos2 = pos4 - e.clientY;
        pos3 = e.clientX;
        pos4 = e.clientY;
        element.style.top = (element.offsetTop - pos2) + "px";
        element.style.left = (element.offsetLeft - pos1) + "px";
        element.style.right = 'auto';
        element.style.bottom = 'auto';
    }
    
    function closeDragElement() {
        document.onmouseup = null;
        document.onmousemove = null;
    }
}

// Request notification permission
if ('Notification' in window && Notification.permission === 'default') {
    Notification.requestPermission();
}

// ============================================
// KEYBOARD SHORTCUTS
// ============================================

function initKeyboardShortcuts() {
    document.addEventListener('keydown', (e) => {
        // Don't trigger shortcuts when typing in inputs
        if (e.target.tagName === 'INPUT' || e.target.tagName === 'TEXTAREA') return;
        
        // Check if in study mode
        const studySession = document.getElementById('study-session');
        const isInStudyMode = studySession && studySession.classList.contains('active');
        
        switch (e.key) {
            case ' ':
                // Space - flip flashcard
                if (isInStudyMode) {
                    e.preventDefault();
                    flipStudyCard();
                }
                break;
                
            case '1':
                // 1 - Rate Again
                if (isInStudyMode && currentStudySession) {
                    e.preventDefault();
                    handleSRSRating(0);
                }
                break;
                
            case '2':
                // 2 - Rate Hard
                if (isInStudyMode && currentStudySession) {
                    e.preventDefault();
                    handleSRSRating(1);
                }
                break;
                
            case '3':
                // 3 - Rate Good
                if (isInStudyMode && currentStudySession) {
                    e.preventDefault();
                    handleSRSRating(2);
                }
                break;
                
            case '4':
                // 4 - Rate Easy
                if (isInStudyMode && currentStudySession) {
                    e.preventDefault();
                    handleSRSRating(3);
                }
                break;
                
            case '?':
                // ? - Toggle keyboard help
                e.preventDefault();
                const helpModal = document.getElementById('keyboard-help');
                helpModal.style.display = helpModal.style.display === 'none' ? 'flex' : 'none';
                break;
                
            case 'Escape':
                // Escape - Close modals or end study session
                const keyboardHelp = document.getElementById('keyboard-help');
                if (keyboardHelp.style.display !== 'none') {
                    keyboardHelp.style.display = 'none';
                } else if (isInStudyMode) {
                    showConfirmDialog({
                        title: 'Zakończ sesję nauki?',
                        message: 'Twój postęp zostanie zapisany i możesz kontynuować później.',
                        icon: '📚',
                        confirmText: 'Zakończ',
                        type: 'warning'
                    }).then(confirmed => {
                        if (confirmed) endStudySession();
                    });
                }
                break;
        }
    });
}

// Handle SRS rating during study
async function handleSRSRating(quality) {
    if (!currentStudySession) return;
    
    const currentCard = currentStudySession.cards[currentStudySession.currentIndex];
    if (!currentCard) return;
    
    // Rate the flashcard using SM-2
    await db.rateFlashcard(currentCard.id, quality);
    
    // Update session stats
    if (quality >= 2) {
        currentStudySession.correct++;
    } else {
        currentStudySession.incorrect++;
        currentStudySession.incorrectCards.push(currentCard);
    }
    
    // Move to next card
    currentStudySession.currentIndex++;
    
    if (currentStudySession.currentIndex >= currentStudySession.cards.length) {
        // Check if there are incorrect cards to retry
        if (currentStudySession.incorrectCards.length > 0) {
            currentStudySession.cards = shuffleArray([...currentStudySession.incorrectCards]);
            currentStudySession.incorrectCards = [];
            currentStudySession.currentIndex = 0;
            currentStudySession.round++;
        } else {
            showStudyResults();
            return;
        }
    }
    
    // Continue with appropriate mode
    switch (currentStudySession.mode) {
        case 'flashcards':
            startFlashcardModeWithSRS();
            break;
        default:
            startFlashcardMode();
    }
}

// Enhanced flashcard mode with SRS buttons
function startFlashcardModeWithSRS() {
    const sessionContainer = document.getElementById('study-session');
    const session = currentStudySession;
    const currentCard = session.cards[session.currentIndex];
    
    if (!sessionContainer || !currentCard) {
        showStudyResults();
        return;
    }
    
    // Preview next intervals
    const intervals = db.previewNextIntervals(currentCard);
    
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
        
        <p style="text-align: center; color: var(--text-secondary); margin-bottom: 15px;">
            Kliknij kartę lub naciśnij <kbd style="background: var(--bg-dark); padding: 2px 8px; border-radius: 4px;">Spacja</kbd> aby przewrócić
        </p>
        
        <div class="srs-rating-buttons">
            <button class="srs-btn again" onclick="handleSRSRating(0)">
                Znowu
                <span class="interval">${db.formatInterval(intervals.again.interval)}</span>
            </button>
            <button class="srs-btn hard" onclick="handleSRSRating(1)">
                Trudne
                <span class="interval">${db.formatInterval(intervals.hard.interval)}</span>
            </button>
            <button class="srs-btn good" onclick="handleSRSRating(2)">
                Dobre
                <span class="interval">${db.formatInterval(intervals.good.interval)}</span>
            </button>
            <button class="srs-btn easy" onclick="handleSRSRating(3)">
                Łatwe
                <span class="interval">${db.formatInterval(intervals.easy.interval)}</span>
            </button>
        </div>
        
        <div style="text-align: center; margin-top: 20px;">
            <button class="study-btn" onclick="endStudySession()">
                🏁 Zakończ sesję
            </button>
        </div>
    `;
    
    // Render LaTeX
    renderLatex(sessionContainer);
}

// Start due cards review from dashboard
async function startDueReview() {
    const dueCards = await db.getDueFlashcards();
    
    if (dueCards.length === 0) {
        alert('Brak fiszek do powtórki!');
        return;
    }
    
    // Initialize session with due cards
    currentStudySession = {
        cards: shuffleArray(dueCards),
        currentIndex: 0,
        mode: 'flashcards',
        correct: 0,
        incorrect: 0,
        incorrectCards: [],
        totalCards: dueCards.length,
        round: 1,
        startTime: Date.now()
    };
    
    // Switch to study mode
    switchTab('study-mode');
    showStudyStep('study-session');
    startFlashcardModeWithSRS();
}

// ============================================
// EXPORT TO WINDOW (for inline event handlers)
// ============================================

// deleteSubject is already defined above with stylish dialog

// ============================================
// EXAM/KOLOKWIUM FUNCTIONS
// ============================================

/**
 * Open modal to create a new exam/kolokwium
 */
window.openCreateExamModal = async function(subjectId, subjectName, subjectColor) {
    // Get lectures for this subject
    const lectures = await db.listLecturesBySubject(subjectId);
    
    if (lectures.length === 0) {
        alert('Brak wykładów w tym przedmiocie. Najpierw dodaj wykłady.');
        return;
    }
    
    // Create modal HTML
    const modalHtml = `
        <div id="modal-create-exam" class="modal" style="display: flex;">
            <div class="modal-content" style="max-width: 600px;">
                <h3 style="margin-bottom: 20px; display: flex; align-items: center; gap: 10px;">
                    <span style="width: 36px; height: 36px; border-radius: 10px; background: ${subjectColor}; display: flex; align-items: center; justify-content: center; font-size: 18px;">📝</span>
                    Nowe kolokwium: ${subjectName}
                </h3>
                
                <div style="margin-bottom: 20px;">
                    <label style="display: block; margin-bottom: 8px; font-weight: 600;">Nazwa kolokwium</label>
                    <input type="text" id="exam-name" class="search-box" placeholder="np. Kolokwium 1 (wykłady 1-4)" style="width: 100%;">
                </div>
                
                <div style="margin-bottom: 20px;">
                    <label style="display: block; margin-bottom: 8px; font-weight: 600;">Wybierz wykłady do kolokwium</label>
                    <p style="font-size: 13px; color: var(--text-secondary); margin-bottom: 12px;">
                        💡 Zaznacz wykłady, które będą obejmowane na kolokwium
                    </p>
                    <div id="exam-lectures-list" style="max-height: 250px; overflow-y: auto; border: 1px solid var(--border); border-radius: 8px; padding: 10px;">
                        ${lectures.map((lecture, idx) => `
                            <label style="display: flex; align-items: center; gap: 10px; padding: 10px; border-radius: 6px; cursor: pointer; transition: background 0.2s;"
                                   onmouseover="this.style.background='var(--bg-hover)'" 
                                   onmouseout="this.style.background='transparent'">
                                <input type="checkbox" class="exam-lecture-checkbox" value="${lecture.id}" 
                                       style="width: 18px; height: 18px; accent-color: ${subjectColor};">
                                <div style="flex: 1;">
                                    <div style="font-weight: 500;">${idx + 1}. ${lecture.title}</div>
                                    <div style="font-size: 12px; color: var(--text-secondary);">${new Date(lecture.createdAt).toLocaleDateString('pl-PL')}</div>
                                </div>
                            </label>
                        `).join('')}
                    </div>
                    <div style="display: flex; gap: 10px; margin-top: 10px;">
                        <button type="button" class="btn" onclick="selectAllExamLectures(true)" style="flex: 1; padding: 8px; font-size: 13px;">
                            ✅ Zaznacz wszystkie
                        </button>
                        <button type="button" class="btn" onclick="selectAllExamLectures(false)" style="flex: 1; padding: 8px; font-size: 13px;">
                            ❌ Odznacz wszystkie
                        </button>
                    </div>
                </div>
                
                <div style="margin-bottom: 20px;">
                    <label style="display: block; margin-bottom: 8px; font-weight: 600;">Wymagania/tematy na kolokwium (opcjonalne)</label>
                    <textarea id="exam-requirements" class="search-box" rows="3" 
                              placeholder="np. Wzory na pochodne, całki podstawowe, definicje..."
                              style="width: 100%;"></textarea>
                </div>
                
                <div style="display: flex; gap: 10px; justify-content: flex-end;">
                    <button class="btn" onclick="closeExamModal()" style="background: var(--bg-card);">
                        ✖ Anuluj
                    </button>
                    <button class="btn btn-primary" onclick="createExam('${subjectId}')" style="background: linear-gradient(135deg, #a855f7, #8b5cf6);">
                        ✨ Utwórz kolokwium
                    </button>
                </div>
            </div>
        </div>
    `;
    
    document.body.insertAdjacentHTML('beforeend', modalHtml);
};

window.selectAllExamLectures = function(select) {
    document.querySelectorAll('.exam-lecture-checkbox').forEach(cb => {
        cb.checked = select;
    });
};

window.closeExamModal = function() {
    const modal = document.getElementById('modal-create-exam');
    if (modal) modal.remove();
};

window.createExam = async function(subjectId) {
    const name = document.getElementById('exam-name').value.trim();
    const requirements = document.getElementById('exam-requirements').value.trim();
    const selectedLectures = Array.from(document.querySelectorAll('.exam-lecture-checkbox:checked')).map(cb => cb.value);
    
    if (!name) {
        alert('Wprowadź nazwę kolokwium');
        return;
    }
    
    if (selectedLectures.length === 0) {
        alert('Wybierz przynajmniej jeden wykład');
        return;
    }
    
    try {
        await db.createExam(subjectId, name, selectedLectures, requirements);
        closeExamModal();
        await loadLectures();
        alert(`✅ Utworzono kolokwium "${name}" z ${selectedLectures.length} wykładami!`);
    } catch (error) {
        console.error('Error creating exam:', error);
        alert('Błąd podczas tworzenia kolokwium');
    }
};

window.deleteExamConfirm = async function(examId) {
    const confirmed = await showConfirmDialog({
        title: 'Usuń kolokwium',
        message: 'Czy na pewno chcesz usunąć to kolokwium?',
        icon: '📝',
        confirmText: 'Usuń',
        type: 'danger'
    });
    if (confirmed) {
        try {
            await db.deleteExam(examId);
            await loadLectures();
        } catch (error) {
            console.error('Error deleting exam:', error);
            showToast('❌ Błąd podczas usuwania kolokwium');
        }
    }
};

/**
 * Open exam view - show exam materials generation page
 */
window.openExamView = async function(examId) {
    const exam = await db.getExam(examId);
    if (!exam) {
        alert('Nie znaleziono kolokwium');
        return;
    }
    
    const subject = await db.getSubject(exam.subjectId);
    const subjectColor = subject ? subject.color : '#a855f7';
    
    // Get lectures content for this exam
    const lectureContents = [];
    for (const lectureId of exam.lectureIds) {
        const lecture = await db.getLecture(lectureId);
        if (lecture) {
            lectureContents.push({
                title: lecture.title,
                transcription: lecture.transcription || '',
                notes: lecture.notes || ''
            });
        }
    }
    
    window.currentExamId = examId;
    
    // Hide all content sections and show exam view
    document.querySelectorAll('.content').forEach(c => c.classList.remove('active'));
    document.querySelectorAll('.nav-btn').forEach(b => b.classList.remove('active'));
    
    // Create or show exam view
    let examView = document.getElementById('exam-view');
    if (!examView) {
        examView = document.createElement('div');
        examView.id = 'exam-view';
        examView.className = 'content';
        document.querySelector('.container').appendChild(examView);
    }
    
    examView.classList.add('active');
    examView.innerHTML = `
        <div style="margin-bottom: 20px;">
            <button class="btn" onclick="closeExamView()" style="background: var(--bg-card);">
                ← Powrót do wykładów
            </button>
        </div>
        
        <div class="card" style="margin-bottom: 20px;">
            <div style="display: flex; align-items: center; gap: 15px; margin-bottom: 15px;">
                <div style="width: 50px; height: 50px; border-radius: 12px; background: linear-gradient(135deg, #a855f7, #8b5cf6); display: flex; align-items: center; justify-content: center; font-size: 24px; color: white;">
                    📝
                </div>
                <div style="flex: 1;">
                    <h2 style="margin: 0; font-size: 24px;">${exam.name}</h2>
                    <p style="color: var(--text-secondary); margin: 4px 0 0 0;">
                        ${subject ? subject.name : 'Przedmiot'} • ${exam.lectureIds.length} wykładów
                    </p>
                </div>
            </div>
            
            ${exam.requirements ? `
                <div style="padding: 12px; background: var(--bg-hover); border-radius: 8px; margin-bottom: 15px;">
                    <strong>📋 Wymagania:</strong> ${exam.requirements}
                </div>
            ` : ''}
            
            <div style="display: flex; flex-wrap: wrap; gap: 8px;">
                ${lectureContents.map((l, idx) => `
                    <span style="padding: 6px 12px; background: ${subjectColor}22; color: ${subjectColor}; border-radius: 6px; font-size: 13px;">
                        ${idx + 1}. ${l.title}
                    </span>
                `).join('')}
            </div>
        </div>
        
        <!-- Material Generation Buttons -->
        <div class="card" style="margin-bottom: 20px;">
            <h3 style="margin-bottom: 15px;">🎯 Generuj materiały na kolokwium</h3>
            <p style="color: var(--text-secondary); margin-bottom: 15px; font-size: 14px;">
                Użyj AI do wygenerowania materiałów przygotowujących do kolokwium z wybranych wykładów.
            </p>
            <div style="display: grid; grid-template-columns: repeat(auto-fit, minmax(200px, 1fr)); gap: 15px;">
                <button class="btn" id="btn-exam-summary" onclick="generateExamMaterial('summary')"
                        style="padding: 20px; background: linear-gradient(135deg, rgba(99, 102, 241, 0.15), rgba(168, 85, 247, 0.15)); border: 2px solid var(--primary); border-radius: 12px; text-align: left;">
                    <div style="font-size: 24px; margin-bottom: 8px;">📋</div>
                    <div style="font-weight: 600; margin-bottom: 4px;">Podsumowanie</div>
                    <div style="font-size: 13px; color: var(--text-secondary);">Skondensowane informacje z wybranych wykładów</div>
                </button>
                <button class="btn" id="btn-exam-flashcards" onclick="generateExamMaterial('flashcards')"
                        style="padding: 20px; background: linear-gradient(135deg, rgba(16, 185, 129, 0.15), rgba(5, 150, 105, 0.15)); border: 2px solid #10b981; border-radius: 12px; text-align: left;">
                    <div style="font-size: 24px; margin-bottom: 8px;">🎴</div>
                    <div style="font-weight: 600; margin-bottom: 4px;">Fiszki</div>
                    <div style="font-size: 13px; color: var(--text-secondary);">Fiszki z kluczowych pojęć i wzorów</div>
                </button>
                <button class="btn" id="btn-exam-quiz" onclick="generateExamMaterial('quiz')"
                        style="padding: 20px; background: linear-gradient(135deg, rgba(249, 115, 22, 0.15), rgba(234, 88, 12, 0.15)); border: 2px solid #f97316; border-radius: 12px; text-align: left;">
                    <div style="font-size: 24px; margin-bottom: 8px;">❓</div>
                    <div style="font-weight: 600; margin-bottom: 4px;">Quiz</div>
                    <div style="font-size: 13px; color: var(--text-secondary);">Pytania egzaminacyjne</div>
                </button>
                <button class="btn" id="btn-exam-cheatsheet" onclick="generateExamMaterial('cheatsheet')"
                        style="padding: 20px; background: linear-gradient(135deg, rgba(239, 68, 68, 0.15), rgba(220, 38, 38, 0.15)); border: 2px solid #ef4444; border-radius: 12px; text-align: left;">
                    <div style="font-size: 24px; margin-bottom: 8px;">📑</div>
                    <div style="font-weight: 600; margin-bottom: 4px;">Ściągawka</div>
                    <div style="font-size: 13px; color: var(--text-secondary);">Wzory i definicje</div>
                </button>
            </div>
        </div>
        
        <!-- Generated Materials Container -->
        <div id="exam-materials-container">
            ${renderExamMaterials(exam)}
        </div>
    `;
    
    // Render LaTeX in materials if they exist
    setTimeout(() => renderLatex(examView), 100);
};

function renderExamMaterials(exam) {
    if (!exam.materials) return '';
    
    let html = '';
    
    if (exam.materials.summary) {
        html += `
            <div class="card" style="margin-bottom: 20px;">
                <h3 style="margin-bottom: 15px;">📋 Podsumowanie</h3>
                <div id="exam-summary-content" class="markdown-content">${marked.parse(exam.materials.summary)}</div>
            </div>
        `;
    }
    
    if (exam.materials.flashcards) {
        html += `
            <div class="card" style="margin-bottom: 20px;">
                <h3 style="margin-bottom: 15px;">🎴 Fiszki na kolokwium</h3>
                <div id="exam-flashcards-content">${renderExamFlashcardsList(exam.materials.flashcards)}</div>
            </div>
        `;
    }
    
    if (exam.materials.quiz) {
        html += `
            <div class="card" style="margin-bottom: 20px;">
                <h3 style="margin-bottom: 15px;">❓ Quiz egzaminacyjny</h3>
                <div id="exam-quiz-content">${renderExamQuizList(exam.materials.quiz)}</div>
            </div>
        `;
    }
    
    if (exam.materials.cheatsheet) {
        html += `
            <div class="card" style="margin-bottom: 20px;">
                <h3 style="margin-bottom: 15px;">📑 Ściągawka</h3>
                <div id="exam-cheatsheet-content" class="markdown-content">${marked.parse(exam.materials.cheatsheet)}</div>
            </div>
        `;
    }
    
    return html;
}

function renderExamFlashcardsList(flashcards) {
    if (!flashcards || flashcards.length === 0) return '<p style="color: var(--text-secondary);">Brak fiszek</p>';
    
    return `
        <div style="display: grid; gap: 15px;">
            ${flashcards.map((card, idx) => `
                <div class="card exam-flashcard-item" style="cursor: pointer; padding: 15px;" onclick="this.classList.toggle('flipped')">
                    <div style="display: flex; justify-content: space-between; align-items: start; margin-bottom: 10px;">
                        <span style="background: var(--primary); color: white; padding: 4px 10px; border-radius: 12px; font-size: 12px; font-weight: 600;">
                            #${idx + 1}
                        </span>
                    </div>
                    <div class="flashcard-question" style="font-weight: 600; font-size: 16px; margin-bottom: 12px;">
                        ❓ ${card.question || card.front}
                    </div>
                    <div class="flashcard-answer" style="display: none; padding: 15px; background: linear-gradient(135deg, rgba(16, 185, 129, 0.1), rgba(5, 150, 105, 0.1)); border-radius: 8px; border-left: 3px solid #10b981;">
                        💡 ${card.answer || card.back}
                    </div>
                    <div style="text-align: center; margin-top: 10px; font-size: 13px; color: var(--text-secondary);">
                        Kliknij, aby zobaczyć odpowiedź
                    </div>
                </div>
            `).join('')}
        </div>
        <style>
            .exam-flashcard-item.flipped .flashcard-answer { display: block !important; }
            .exam-flashcard-item.flipped .flashcard-question { color: var(--text-secondary); }
        </style>
    `;
}

function renderExamQuizList(questions) {
    if (!questions || questions.length === 0) return '<p style="color: var(--text-secondary);">Brak pytań</p>';
    
    return `
        <div style="display: grid; gap: 15px;">
            ${questions.map((q, idx) => `
                <div class="card exam-quiz-item" style="padding: 15px;" data-correct="${q.correctIndex}">
                    <div style="display: flex; gap: 12px; margin-bottom: 15px;">
                        <span style="flex-shrink: 0; width: 32px; height: 32px; border-radius: 50%; background: var(--primary); color: white; display: flex; align-items: center; justify-content: center; font-weight: 600;">
                            ${idx + 1}
                        </span>
                        <div style="flex: 1; font-weight: 600; font-size: 16px;">${q.question}</div>
                    </div>
                    <div style="display: grid; gap: 8px;">
                        ${q.options.map((opt, optIdx) => `
                            <button class="exam-quiz-option" data-idx="${optIdx}" 
                                    style="text-align: left; padding: 12px 15px; background: var(--bg-dark); border: 2px solid transparent; border-radius: 8px; cursor: pointer; transition: all 0.2s;"
                                    onclick="checkExamQuizAnswer(this, ${q.correctIndex})">
                                ${opt}
                            </button>
                        `).join('')}
                    </div>
                </div>
            `).join('')}
        </div>
    `;
}

window.checkExamQuizAnswer = function(btn, correctIdx) {
    const parent = btn.closest('.exam-quiz-item');
    const options = parent.querySelectorAll('.exam-quiz-option');
    const selectedIdx = parseInt(btn.dataset.idx);
    
    options.forEach((opt, idx) => {
        opt.disabled = true;
        if (idx === correctIdx) {
            opt.style.borderColor = '#10b981';
            opt.style.background = 'rgba(16, 185, 129, 0.2)';
        } else if (idx === selectedIdx && idx !== correctIdx) {
            opt.style.borderColor = '#ef4444';
            opt.style.background = 'rgba(239, 68, 68, 0.2)';
        }
    });
};

window.generateExamMaterial = async function(materialType) {
    const examId = window.currentExamId;
    if (!examId) return;
    
    const exam = await db.getExam(examId);
    if (!exam) return;
    
    const btn = document.getElementById(`btn-exam-${materialType}`);
    const originalContent = btn.innerHTML;
    btn.disabled = true;
    btn.innerHTML = '<div style="font-size: 24px; margin-bottom: 8px;">⏳</div><div style="font-weight: 600;">Generowanie...</div>';
    
    try {
        // Gather lecture content
        let combinedContent = '';
        for (const lectureId of exam.lectureIds) {
            const lecture = await db.getLecture(lectureId);
            if (lecture) {
                combinedContent += `\n\n=== ${lecture.title} ===\n`;
                if (lecture.transcription) combinedContent += lecture.transcription;
                if (lecture.notes) combinedContent += '\n\nNotatki:\n' + lecture.notes;
            }
        }
        
        // Build requirements - include exam requirements + lecture content
        const requirements = exam.requirements 
            ? `Wymagania na kolokwium: ${exam.requirements}\n\nTreść wykładów:\n${combinedContent}`
            : `Treść wykładów:\n${combinedContent}`;
        
        const result = await ai.generateExamMaterials(requirements, combinedContent, materialType);
        
        if (result) {
            // Extract the actual content from result
            let content;
            if (materialType === 'flashcards' || materialType === 'quiz') {
                content = result.content || result;
            } else {
                content = result.content || result;
            }
            
            await db.updateExamMaterials(examId, materialType, content);
            // Refresh view
            await openExamView(examId);
        }
    } catch (error) {
        console.error('Error generating exam material:', error);
        alert('Błąd podczas generowania materiałów: ' + error.message);
    } finally {
        btn.disabled = false;
        btn.innerHTML = originalContent;
    }
};

window.closeExamView = function() {
    window.currentExamId = null;
    const examView = document.getElementById('exam-view');
    if (examView) {
        examView.classList.remove('active');
    }
    
    // Return to lectures tab
    document.querySelectorAll('.content').forEach(c => c.classList.remove('active'));
    document.querySelectorAll('.nav-btn').forEach(b => b.classList.remove('active'));
    document.getElementById('lectures').classList.add('active');
    document.querySelector('[data-tab="lectures"]').classList.add('active');
    
    loadLectures();
};

// Make functions globally accessible for inline onclick handlers
window.openStudyMode = openStudyMode;
window.switchTab = switchTab;
window.startRetryRound = startRetryRound;
window.handleSRSRating = handleSRSRating;
window.startDueReview = startDueReview;
window.flipStudyCard = flipStudyCard;

// ============================================
// THEME MANAGEMENT
// ============================================

function initTheme() {
    const savedTheme = localStorage.getItem('studyflow-theme');
    const prefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
    
    // Set initial theme
    const theme = savedTheme || (prefersDark ? 'dark' : 'light');
    document.documentElement.setAttribute('data-theme', theme);
    
    // Theme toggle button
    const toggleBtn = document.getElementById('theme-toggle');
    if (toggleBtn) {
        toggleBtn.addEventListener('click', toggleTheme);
    }
    
    // Listen for system theme changes
    window.matchMedia('(prefers-color-scheme: dark)').addEventListener('change', e => {
        if (!localStorage.getItem('studyflow-theme')) {
            document.documentElement.setAttribute('data-theme', e.matches ? 'dark' : 'light');
        }
    });
}

function toggleTheme() {
    const currentTheme = document.documentElement.getAttribute('data-theme') || 'dark';
    const newTheme = currentTheme === 'dark' ? 'light' : 'dark';
    
    document.documentElement.setAttribute('data-theme', newTheme);
    localStorage.setItem('studyflow-theme', newTheme);
    
    // Update meta theme-color for mobile browsers
    const metaTheme = document.querySelector('meta[name="theme-color"]');
    if (metaTheme) {
        metaTheme.setAttribute('content', newTheme === 'dark' ? '#0f0f1e' : '#f8fafc');
    }
}

// ============================================
// SERVICE WORKER REGISTRATION
// ============================================

async function registerServiceWorker() {
    if ('serviceWorker' in navigator) {
        try {
            const registration = await navigator.serviceWorker.register('/service-worker.js');
            console.log('✅ Service Worker registered:', registration.scope);
            
            // Check for updates
            registration.addEventListener('updatefound', () => {
                const newWorker = registration.installing;
                newWorker.addEventListener('statechange', () => {
                    if (newWorker.state === 'installed' && navigator.serviceWorker.controller) {
                        // New version available
                        showUpdateNotification();
                    }
                });
            });
        } catch (error) {
            console.warn('Service Worker registration failed:', error);
        }
    }
}

function showUpdateNotification() {
    const notification = document.createElement('div');
    notification.className = 'update-notification';
    notification.innerHTML = `
        <div style="display: flex; align-items: center; gap: 12px;">
            <span>🔄</span>
            <span>Dostępna nowa wersja!</span>
            <button onclick="location.reload()" class="btn btn-primary" style="padding: 8px 16px;">
                Odśwież
            </button>
        </div>
    `;
    notification.style.cssText = `
        position: fixed;
        bottom: 20px;
        left: 50%;
        transform: translateX(-50%);
        background: var(--bg-card);
        border: 1px solid var(--primary);
        padding: 16px 24px;
        border-radius: 12px;
        z-index: 10000;
        box-shadow: 0 10px 40px rgba(0,0,0,0.3);
    `;
    document.body.appendChild(notification);
}

// ============================================
// ACHIEVEMENT SYSTEM
// ============================================

const ACHIEVEMENTS = {
    'first-flashcard': { icon: '🎴', title: 'Pierwsza fiszka!', desc: 'Utworzyłeś swoją pierwszą fiszkę' },
    'streak-7': { icon: '🔥', title: '7-dniowy streak!', desc: 'Uczysz się przez 7 dni z rzędu' },
    'streak-30': { icon: '🏆', title: 'Miesiąc nauki!', desc: '30 dni nieprzerwanej nauki' },
    'flashcards-100': { icon: '💯', title: '100 fiszek!', desc: 'Masz już 100 fiszek w bazie' },
    'flashcards-mastered-50': { icon: '🧠', title: 'Mistrz fiszek!', desc: 'Opanowałeś 50 fiszek' },
    'pomodoro-10': { icon: '🍅', title: 'Tomato Master!', desc: 'Ukończyłeś 10 sesji Pomodoro' },
    'perfect-session': { icon: '⭐', title: 'Perfekcyjna sesja!', desc: '100% poprawnych odpowiedzi w sesji' },
    'night-owl': { icon: '🦉', title: 'Nocna sowa!', desc: 'Uczysz się po północy' },
    'early-bird': { icon: '🐦', title: 'Ranny ptaszek!', desc: 'Uczysz się przed 6:00' }
};

function checkAndUnlockAchievement(achievementId) {
    const unlockedAchievements = JSON.parse(localStorage.getItem('studyflow-achievements') || '[]');
    
    if (unlockedAchievements.includes(achievementId)) return;
    
    const achievement = ACHIEVEMENTS[achievementId];
    if (!achievement) return;
    
    // Save achievement
    unlockedAchievements.push(achievementId);
    localStorage.setItem('studyflow-achievements', JSON.stringify(unlockedAchievements));
    
    // Show notification
    showAchievementNotification(achievement);
    
    // Trigger confetti
    triggerConfetti();
}

function showAchievementNotification(achievement) {
    const notification = document.createElement('div');
    notification.className = 'achievement-notification';
    notification.innerHTML = `
        <div class="achievement-icon">${achievement.icon}</div>
        <div class="achievement-title">${achievement.title}</div>
        <div class="achievement-desc">${achievement.desc}</div>
    `;
    document.body.appendChild(notification);
    
    // Remove after animation
    setTimeout(() => notification.remove(), 4000);
}

function triggerConfetti() {
    const container = document.createElement('div');
    container.className = 'confetti-container';
    document.body.appendChild(container);
    
    const colors = ['#6366f1', '#8b5cf6', '#ec4899', '#10b981', '#f59e0b'];
    
    for (let i = 0; i < 50; i++) {
        const confetti = document.createElement('div');
        confetti.className = 'confetti';
        confetti.style.left = Math.random() * 100 + '%';
        confetti.style.backgroundColor = colors[Math.floor(Math.random() * colors.length)];
        confetti.style.animationDelay = Math.random() * 0.5 + 's';
        confetti.style.animationDuration = (2 + Math.random()) + 's';
        container.appendChild(confetti);
    }
    
    setTimeout(() => container.remove(), 4000);
}

// Check achievements based on current state
async function checkAchievements() {
    const flashcards = await db.listFlashcards();
    const stats = JSON.parse(localStorage.getItem('studyflow-stats') || '{}');
    const hour = new Date().getHours();
    
    // Flashcard count achievements
    if (flashcards.length >= 1) checkAndUnlockAchievement('first-flashcard');
    if (flashcards.length >= 100) checkAndUnlockAchievement('flashcards-100');
    
    // Mastered flashcards
    const mastered = flashcards.filter(f => f.repetitions >= 5).length;
    if (mastered >= 50) checkAndUnlockAchievement('flashcards-mastered-50');
    
    // Streak achievements
    const streak = stats.streak || 0;
    if (streak >= 7) checkAndUnlockAchievement('streak-7');
    if (streak >= 30) checkAndUnlockAchievement('streak-30');
    
    // Time-based achievements
    if (hour >= 0 && hour < 5) checkAndUnlockAchievement('night-owl');
    if (hour >= 4 && hour < 6) checkAndUnlockAchievement('early-bird');
    
    // Pomodoro sessions
    const pomodoroSessions = parseInt(localStorage.getItem('studyflow-pomodoro-total') || '0');
    if (pomodoroSessions >= 10) checkAndUnlockAchievement('pomodoro-10');
}

// Make achievement functions global
window.checkAndUnlockAchievement = checkAndUnlockAchievement;
window.triggerConfetti = triggerConfetti;

// ============================================
// COMMAND PALETTE (Cmd+K)
// ============================================

const COMMANDS = [
    { id: 'dashboard', icon: '📊', label: 'Dashboard', shortcut: ['Alt', '1'], action: () => switchTab('dashboard') },
    { id: 'flashcards', icon: '🎴', label: 'Fiszki', shortcut: ['Alt', '2'], action: () => switchTab('flashcards') },
    { id: 'lectures', icon: '📖', label: 'Wykłady', shortcut: ['Alt', '3'], action: () => switchTab('lectures') },
    { id: 'new-lecture', icon: '✨', label: 'Nowy wykład', shortcut: ['Alt', '4'], action: () => switchTab('new-lecture') },
    { id: 'subjects', icon: '📚', label: 'Przedmioty', shortcut: ['Alt', '5'], action: () => switchTab('subjects') },
    { id: 'schedule', icon: '📅', label: 'Plan zajęć', shortcut: ['Alt', '6'], action: () => switchTab('schedule') },
    { id: 'settings', icon: '⚙️', label: 'Ustawienia', shortcut: ['Alt', '7'], action: () => switchTab('settings') },
    { id: 'study', icon: '🎯', label: 'Rozpocznij naukę', action: () => { switchTab('study-mode'); } },
    { id: 'add-flashcard', icon: '➕', label: 'Dodaj fiszkę', action: () => openModal('modal-flashcard') },
    { id: 'add-subject', icon: '📁', label: 'Dodaj przedmiot', action: () => openModal('modal-subject') },
    { id: 'toggle-theme', icon: '🌓', label: 'Zmień motyw', shortcut: ['Ctrl', 'Shift', 'T'], action: toggleTheme },
    { id: 'help', icon: '❓', label: 'Skróty klawiszowe', shortcut: ['?'], action: () => toggleKeyboardHelp() }
];

let commandPaletteVisible = false;
let selectedCommandIndex = 0;

function initCommandPalette() {
    // Create command palette HTML
    const palette = document.createElement('div');
    palette.id = 'command-palette';
    palette.className = 'command-palette';
    palette.innerHTML = `
        <div class="command-palette-box">
            <input type="text" class="command-palette-input" placeholder="Wpisz polecenie..." id="command-input">
            <div class="command-palette-results" id="command-results"></div>
        </div>
    `;
    document.body.appendChild(palette);
    
    // Event listeners
    const input = document.getElementById('command-input');
    input.addEventListener('input', filterCommands);
    input.addEventListener('keydown', handleCommandKeydown);
    
    palette.addEventListener('click', (e) => {
        if (e.target === palette) closeCommandPalette();
    });
    
    // Render initial commands
    renderCommands(COMMANDS);
}

function openCommandPalette() {
    const palette = document.getElementById('command-palette');
    const input = document.getElementById('command-input');
    
    palette.classList.add('active');
    commandPaletteVisible = true;
    selectedCommandIndex = 0;
    input.value = '';
    input.focus();
    renderCommands(COMMANDS);
}

function closeCommandPalette() {
    const palette = document.getElementById('command-palette');
    palette.classList.remove('active');
    commandPaletteVisible = false;
}

function filterCommands() {
    const query = document.getElementById('command-input').value.toLowerCase();
    const filtered = COMMANDS.filter(cmd => 
        cmd.label.toLowerCase().includes(query) || cmd.id.includes(query)
    );
    selectedCommandIndex = 0;
    renderCommands(filtered);
}

function renderCommands(commands) {
    const results = document.getElementById('command-results');
    results.innerHTML = commands.map((cmd, i) => `
        <div class="command-item ${i === selectedCommandIndex ? 'selected' : ''}" data-index="${i}">
            <div class="command-item-icon">${cmd.icon}</div>
            <div class="command-item-label">${cmd.label}</div>
            ${cmd.shortcut ? `
                <div class="command-item-shortcut">
                    ${cmd.shortcut.map(k => `<kbd>${k}</kbd>`).join('')}
                </div>
            ` : ''}
        </div>
    `).join('');
    
    // Click handlers
    results.querySelectorAll('.command-item').forEach((item, i) => {
        item.addEventListener('click', () => executeCommand(commands[i]));
    });
}

function handleCommandKeydown(e) {
    const results = document.querySelectorAll('.command-item');
    
    if (e.key === 'ArrowDown') {
        e.preventDefault();
        selectedCommandIndex = Math.min(selectedCommandIndex + 1, results.length - 1);
        updateSelectedCommand();
    } else if (e.key === 'ArrowUp') {
        e.preventDefault();
        selectedCommandIndex = Math.max(selectedCommandIndex - 1, 0);
        updateSelectedCommand();
    } else if (e.key === 'Enter') {
        e.preventDefault();
        const filtered = COMMANDS.filter(cmd => {
            const query = document.getElementById('command-input').value.toLowerCase();
            return cmd.label.toLowerCase().includes(query) || cmd.id.includes(query);
        });
        if (filtered[selectedCommandIndex]) {
            executeCommand(filtered[selectedCommandIndex]);
        }
    } else if (e.key === 'Escape') {
        closeCommandPalette();
    }
}

function updateSelectedCommand() {
    document.querySelectorAll('.command-item').forEach((item, i) => {
        item.classList.toggle('selected', i === selectedCommandIndex);
    });
}

function executeCommand(cmd) {
    closeCommandPalette();
    cmd.action();
}

function toggleKeyboardHelp() {
    const help = document.getElementById('keyboard-help');
    if (help) {
        help.style.display = help.style.display === 'none' ? 'flex' : 'none';
    }
}

// ============================================
// ENHANCED KEYBOARD SHORTCUTS
// ============================================

function initEnhancedKeyboardShortcuts() {
    document.addEventListener('keydown', (e) => {
        // Command palette: Cmd/Ctrl + K
        if ((e.metaKey || e.ctrlKey) && e.key === 'k') {
            e.preventDefault();
            if (commandPaletteVisible) {
                closeCommandPalette();
            } else {
                openCommandPalette();
            }
            return;
        }
        
        // Theme toggle: Ctrl + Shift + T
        if (e.ctrlKey && e.shiftKey && e.key === 'T') {
            e.preventDefault();
            toggleTheme();
            return;
        }
        
        // Quick navigation: Alt + 1-7
        if (e.altKey && e.key >= '1' && e.key <= '7') {
            e.preventDefault();
            const tabs = ['dashboard', 'flashcards', 'lectures', 'new-lecture', 'subjects', 'schedule', 'settings'];
            const tabIndex = parseInt(e.key) - 1;
            if (tabs[tabIndex]) {
                switchTab(tabs[tabIndex]);
            }
            return;
        }
        
        // Keyboard help: ?
        if (e.key === '?' && !e.target.matches('input, textarea')) {
            e.preventDefault();
            toggleKeyboardHelp();
        }
        
        // Close modals: Escape
        if (e.key === 'Escape') {
            if (commandPaletteVisible) {
                closeCommandPalette();
            }
        }
    });
}

// Initialize new features
document.addEventListener('DOMContentLoaded', () => {
    initTheme();
    initPomodoro();
    initKeyboardShortcuts();
    initCommandPalette();
    initEnhancedKeyboardShortcuts();
    registerServiceWorker();
    
    // Check achievements on load
    setTimeout(checkAchievements, 2000);
    
    // Due review button
    const dueReviewBtn = document.getElementById('btn-start-due-review');
    if (dueReviewBtn) {
        dueReviewBtn.addEventListener('click', startDueReview);
    }
});

// Note: Other functions (deleteSubject, toggleFlashcardSection, etc.) are already defined as window.function above

console.log('✅ App.js loaded');
