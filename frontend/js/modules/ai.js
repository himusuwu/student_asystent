// AI Module - Student Assistant v2.1
// Generowanie tekstu przez backend AI (Ollama / Gemini)

import { getSettings } from './settings.js';

/**
 * Helper: Pobierz parametry AI z ustawień
 * @returns {Object} Parametry AI providera
 */
function getAIParams() {
    const settings = getSettings();
    return {
        aiProvider: settings.aiProvider || 'ollama',
        geminiApiKey: settings.geminiApiKey || '',
        geminiModel: settings.geminiModel || 'gemini-1.5-pro',
        ollamaModel: settings.ollamaModel || 'qwen2.5:14b'
    };
}

/**
 * Generate lecture title from transcription using AI
 * @param {string} transcription - The lecture transcription text
 * @returns {Promise<string>} Generated title
 */
export async function generateLectureTitle(transcription) {
    if (!transcription || transcription.trim().length === 0) {
        return 'Wykład bez tytułu';
    }
    
    const settings = getSettings();
    const backendUrl = settings.backendUrl || 'http://localhost:3001';
    const aiParams = getAIParams();
    
    try {
        console.log(`🤖 Generowanie tytułu przez AI (${aiParams.aiProvider})...`);
        
        const response = await fetch(`${backendUrl}/generate-title`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({ 
                transcription,
                ...aiParams
            })
        });
        
        if (!response.ok) {
            const errorText = await response.text();
            throw new Error(`Backend error: ${response.status} - ${errorText}`);
        }
        
        const result = await response.json();
        console.log(`✅ AI wygenerowało tytuł: "${result.title}" (${result.provider || aiParams.aiProvider})`);
        
        return result.title;
        
    } catch (error) {
        console.error('❌ Błąd generowania tytułu przez AI:', error);
        
        // Fallback: prostsze generowanie po stronie frontendu
        console.log('⚠️ Używam fallback title generation');
        return generateTitleFallback(transcription);
    }
}

/**
 * Fallback title generation (client-side)
 * Used when backend is unavailable
 */
function generateTitleFallback(transcription) {
    // Remove extra whitespace
    let text = transcription.trim().replace(/\s+/g, ' ');
    
    // Remove common artifacts
    text = text.replace(/^(um|uh|eh|hmm|eee|no|to)\s+/gi, '');
    
    // Get first sentence
    const sentences = text.split(/[.!?]+/).filter(s => s.trim().length > 10);
    
    if (sentences.length > 0) {
        let title = sentences[0].trim();
        
        // Truncate at 60 chars on word boundary
        if (title.length > 60) {
            title = title.substring(0, 60);
            const lastSpace = title.lastIndexOf(' ');
            if (lastSpace > 40) {
                title = title.substring(0, lastSpace) + '...';
            }
        }
        
        // Capitalize
        title = title.charAt(0).toUpperCase() + title.slice(1);
        
        return title;
    }
    
    return 'Wykład bez tytułu';
}

/**
 * Generate comprehensive notes from transcription using AI
 * @param {string} transcription - The lecture transcription text
 * @param {Function} onProgress - Progress callback (percent, message)
 * @returns {Promise<Object>} Generated notes { formatted, structured, summary, keyPoints, questions }
 */
export async function generateNotes(transcription, onProgress = null) {
    if (!transcription || transcription.trim().length === 0) {
        throw new Error('Brak transkrypcji do przetworzenia');
    }
    
    const settings = getSettings();
    const backendUrl = settings.backendUrl || 'http://localhost:3001';
    const aiParams = getAIParams();
    
    try {
        console.log(`🤖 Generowanie notatek z ${transcription.length} znaków (${aiParams.aiProvider})...`);
        if (onProgress) onProgress(10, `Wysyłanie do AI (${aiParams.aiProvider})...`);
        
        const response = await fetch(`${backendUrl}/generate-notes`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({ 
                transcription,
                ...aiParams
            })
        });
        
        if (!response.ok) {
            const errorText = await response.text();
            throw new Error(`Backend error: ${response.status} - ${errorText}`);
        }
        
        if (onProgress) onProgress(90, 'Parsowanie odpowiedzi...');
        
        const result = await response.json();
        
        if (onProgress) onProgress(100, 'Gotowe!');
        
        console.log(`✅ Notatki wygenerowane w ${(result.duration / 1000).toFixed(1)}s (${result.provider || aiParams.aiProvider})`);
        
        return {
            formatted: result.formatted || '',
            structured: result.structured || '',
            summary: result.summary || '',
            keyPoints: result.keyPoints || '',
            questions: result.questions || ''
        };
        
    } catch (error) {
        console.error('❌ Błąd generowania notatek:', error);
        throw error;
    }
}

/**
 * Generate flashcards from transcription using AI
 * @param {string} transcription - The lecture transcription text
 * @param {Function} onProgress - Progress callback (percent, message)
 * @returns {Promise<Array>} Generated flashcards [{ question, answer, category, difficulty }]
 */
export async function generateFlashcards(transcription, onProgress = null) {
    if (!transcription || transcription.trim().length === 0) {
        throw new Error('Brak transkrypcji do przetworzenia');
    }
    
    const settings = getSettings();
    const backendUrl = settings.backendUrl || 'http://localhost:3001';
    const aiParams = getAIParams();
    
    try {
        console.log(`🤖 Generowanie fiszek z ${transcription.length} znaków (${aiParams.aiProvider})...`);
        if (onProgress) onProgress(10, `Wysyłanie do AI (${aiParams.aiProvider})...`);
        
        const response = await fetch(`${backendUrl}/generate-flashcards`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({ 
                transcription,
                ...aiParams
            })
        });
        
        if (!response.ok) {
            const errorText = await response.text();
            throw new Error(`Backend error: ${response.status} - ${errorText}`);
        }
        
        if (onProgress) onProgress(90, 'Parsowanie fiszek...');
        
        const result = await response.json();
        
        if (onProgress) onProgress(100, 'Gotowe!');
        
        console.log(`✅ Wygenerowano ${result.flashcards.length} fiszek w ${(result.duration / 1000).toFixed(1)}s`);
        
        return result.flashcards || [];
        
    } catch (error) {
        console.error('❌ Błąd generowania fiszek:', error);
        throw error;
    }
}

/**
 * Generate detailed notes from transcription using AI
 * @param {string} transcription - The lecture transcription text
 * @param {Function} onProgress - Progress callback (percent, message)
 * @returns {Promise<string>} Detailed notes in markdown
 */
export async function generateDetailedNote(transcription, onProgress = null) {
    if (!transcription || transcription.trim().length === 0) {
        throw new Error('Brak transkrypcji do przetworzenia');
    }
    
    const settings = getSettings();
    const backendUrl = settings.backendUrl || 'http://localhost:3001';
    const aiParams = getAIParams();
    
    try {
        console.log(`🤖 Generowanie szczegółowej notatki z ${transcription.length} znaków (${aiParams.aiProvider})...`);
        if (onProgress) onProgress(10, `Wysyłanie do AI (${aiParams.aiProvider})...`);
        
        const response = await fetch(`${backendUrl}/generate-detailed-note`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({ 
                transcription,
                ...aiParams
            })
        });
        
        if (!response.ok) {
            const errorText = await response.text();
            throw new Error(`Backend error: ${response.status} - ${errorText}`);
        }
        
        if (onProgress) onProgress(90, 'Parsowanie notatki...');
        
        const result = await response.json();
        
        if (onProgress) onProgress(100, 'Gotowe!');
        
        console.log(`✅ Szczegółowa notatka wygenerowana`);
        
        return result.note || '';
        
    } catch (error) {
        console.error('❌ Błąd generowania szczegółowej notatki:', error);
        throw error;
    }
}

/**
 * Generate short summary note from transcription using AI
 * @param {string} transcription - The lecture transcription text
 * @param {Function} onProgress - Progress callback (percent, message)
 * @returns {Promise<string>} Short summary in markdown
 */
export async function generateShortNote(transcription, onProgress = null) {
    if (!transcription || transcription.trim().length === 0) {
        throw new Error('Brak transkrypcji do przetworzenia');
    }
    
    const settings = getSettings();
    const backendUrl = settings.backendUrl || 'http://localhost:3001';
    const aiParams = getAIParams();
    
    try {
        console.log(`🤖 Generowanie krótkiej notatki z ${transcription.length} znaków (${aiParams.aiProvider})...`);
        if (onProgress) onProgress(10, `Wysyłanie do AI (${aiParams.aiProvider})...`);
        
        const response = await fetch(`${backendUrl}/generate-short-note`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({ 
                transcription,
                ...aiParams
            })
        });
        
        if (!response.ok) {
            const errorText = await response.text();
            throw new Error(`Backend error: ${response.status} - ${errorText}`);
        }
        
        if (onProgress) onProgress(90, 'Parsowanie notatki...');
        
        const result = await response.json();
        
        if (onProgress) onProgress(100, 'Gotowe!');
        
        console.log(`✅ Krótka notatka wygenerowana`);
        
        return result.note || '';
        
    } catch (error) {
        console.error('❌ Błąd generowania krótkiej notatki:', error);
        throw error;
    }
}

/**
 * Generate key points from transcription using AI
 * @param {string} transcription - The lecture transcription text
 * @param {Function} onProgress - Progress callback (percent, message)
 * @returns {Promise<string>} Key points in markdown
 */
export async function generateKeyPoints(transcription, onProgress = null) {
    if (!transcription || transcription.trim().length === 0) {
        throw new Error('Brak transkrypcji do przetworzenia');
    }
    
    const settings = getSettings();
    const backendUrl = settings.backendUrl || 'http://localhost:3001';
    const aiParams = getAIParams();
    
    try {
        console.log(`🤖 Generowanie kluczowych punktów z ${transcription.length} znaków (${aiParams.aiProvider})...`);
        if (onProgress) onProgress(10, `Wysyłanie do AI (${aiParams.aiProvider})...`);
        
        const response = await fetch(`${backendUrl}/generate-key-points`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({ 
                transcription,
                ...aiParams
            })
        });
        
        if (!response.ok) {
            const errorText = await response.text();
            throw new Error(`Backend error: ${response.status} - ${errorText}`);
        }
        
        if (onProgress) onProgress(90, 'Parsowanie punktów...');
        
        const result = await response.json();
        
        if (onProgress) onProgress(100, 'Gotowe!');
        
        console.log(`✅ Kluczowe punkty wygenerowane`);
        
        return result.keyPoints || '';
        
    } catch (error) {
        console.error('❌ Błąd generowania kluczowych punktów:', error);
        throw error;
    }
}

/**
 * Generate quiz questions from transcription using AI
 * @param {string} transcription - The lecture transcription text
 * @param {Function} onProgress - Progress callback (percent, message)
 * @returns {Promise<Array>} Quiz questions [{ question, options, correctIndex, category }]
 */
export async function generateQuiz(transcription, onProgress = null) {
    if (!transcription || transcription.trim().length === 0) {
        throw new Error('Brak transkrypcji do przetworzenia');
    }
    
    const settings = getSettings();
    const backendUrl = settings.backendUrl || 'http://localhost:3001';
    const aiParams = getAIParams();
    
    try {
        console.log(`🤖 Generowanie quizu z ${transcription.length} znaków (${aiParams.aiProvider})...`);
        if (onProgress) onProgress(10, `Wysyłanie do AI (${aiParams.aiProvider})...`);
        
        const response = await fetch(`${backendUrl}/generate-quiz`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({ 
                transcription,
                ...aiParams
            })
        });
        
        if (!response.ok) {
            const errorText = await response.text();
            throw new Error(`Backend error: ${response.status} - ${errorText}`);
        }
        
        if (onProgress) onProgress(90, 'Parsowanie pytań...');
        
        const result = await response.json();
        
        if (onProgress) onProgress(100, 'Gotowe!');
        
        console.log(`✅ Wygenerowano ${result.questions.length} pytań quizowych`);
        
        return result.questions || [];
        
    } catch (error) {
        console.error('❌ Błąd generowania quizu:', error);
        throw error;
    }
}

/**
 * Perform fact-checking on transcription text
 * @param {string} transcription - The transcription text to fact-check
 * @param {Function} onProgress - Progress callback (percent, message)
 * @returns {Promise<Object>} Fact-checking results
 */
export async function factCheckTranscription(transcription, onProgress = null) {
    if (!transcription || transcription.trim().length === 0) {
        throw new Error('Brak transkrypcji do sprawdzenia');
    }
    
    const settings = getSettings();
    const backendUrl = settings.backendUrl || 'http://localhost:3001';
    
    try {
        console.log(`🔍 Sprawdzanie faktów w transkrypcji...`);
        if (onProgress) onProgress(10, 'Weryfikacja faktów...');
        
        const response = await fetch(`${backendUrl}/fact-check`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({ transcription })
        });
        
        if (!response.ok) {
            const errorText = await response.text();
            throw new Error(`Backend error: ${response.status} - ${errorText}`);
        }
        
        if (onProgress) onProgress(90, 'Przetwarzanie wyników...');
        
        const result = await response.json();
        
        if (onProgress) onProgress(100, 'Weryfikacja zakończona!');
        
        console.log(`✅ Fact-checking zakończony: ${result.stats.verified}/${result.stats.total} zweryfikowane`);
        
        return result;
        
    } catch (error) {
        console.error('❌ Błąd fact-checkingu:', error);
        throw error;
    }
}

/**
 * Generate notes with fact-checking integrated
 * @param {string} transcription - The lecture transcription text
 * @param {Function} onProgress - Progress callback (percent, message)
 * @returns {Promise<Object>} Generated notes with fact-check results
 */
export async function generateNotesWithFactCheck(transcription, onProgress = null) {
    if (!transcription || transcription.trim().length === 0) {
        throw new Error('Brak transkrypcji do przetworzenia');
    }
    
    const settings = getSettings();
    const backendUrl = settings.backendUrl || 'http://localhost:3001';
    
    try {
        console.log(`🤖🔍 Generowanie notatek z weryfikacją faktów...`);
        if (onProgress) onProgress(10, 'Sprawdzanie faktów...');
        
        const response = await fetch(`${backendUrl}/generate-notes-with-fact-check`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({ transcription })
        });
        
        if (!response.ok) {
            const errorText = await response.text();
            throw new Error(`Backend error: ${response.status} - ${errorText}`);
        }
        
        if (onProgress) onProgress(50, 'Generowanie notatek...');
        
        const result = await response.json();
        
        if (onProgress) onProgress(100, 'Gotowe z weryfikacją!');
        
        const factCheckStats = result.factCheck.stats;
        console.log(`✅ Notatki z fact-checkiem wygenerowane:`);
        console.log(`   📊 Zweryfikowano: ${factCheckStats.verified}/${factCheckStats.total} faktów`);
        console.log(`   ✏️ Poprawki: ${factCheckStats.changes}`);
        console.log(`   🎯 Pewność: ${(factCheckStats.confidence * 100).toFixed(1)}%`);
        
        return {
            formatted: result.formatted || '',
            structured: result.structured || '',
            summary: result.summary || '',
            keyPoints: result.keyPoints || '',
            questions: result.questions || '',
            factCheck: result.factCheck
        };
        
    } catch (error) {
        console.error('❌ Błąd generowania notatek z fact-checkiem:', error);
        throw error;
    }
}
