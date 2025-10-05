// Transcription Module - BACKEND ONLY
// Student Assistant v2.1
// Transkrypcja TYLKO przez backend (Node.js + Whisper.cpp)

import { getSettings } from './settings.js';

let mediaRecorder = null;
let audioChunks = [];

// ============================================
// BACKEND TRANSCRIPTION (TYLKO TEN TRYB!)
// ============================================

// Transcribe audio using backend
async function transcribeAudioBackend(audioFile) {
    const settings = getSettings();
    const backendUrl = settings.backendUrl || 'http://localhost:3001';
    
    const formData = new FormData();
    formData.append('audio', audioFile); // Backend oczekuje 'audio' nie 'file'!
    formData.append('language', settings.whisperLanguage);
    formData.append('model', settings.whisperModel);
    
    console.log(`📤 Wysyłanie audio do backendu (Whisper.cpp Metal): ${backendUrl}/transcribe-cpp`);
    
    const response = await fetch(`${backendUrl}/transcribe-cpp`, {
        method: 'POST',
        body: formData
    });
    
    if (!response.ok) {
        const errorText = await response.text();
        throw new Error(`Backend error: ${response.status} - ${errorText}`);
    }
    
    const result = await response.json();
    console.log('✅ Transkrypcja zakończona!');
    return result.text;
}

// Check if backend is available
export async function checkBackend() {
    try {
        const settings = getSettings();
        const backendUrl = settings.backendUrl || 'http://localhost:3001';
        
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), 2000); // 2s timeout
        
        const response = await fetch(`${backendUrl}/health`, {
            method: 'GET',
            signal: controller.signal
        });
        
        clearTimeout(timeoutId);
        
        if (!response.ok) return false;
        
        const data = await response.json();
        return data.status === 'ok';
    } catch (error) {
        console.log('❌ Backend niedostępny');
        return false;
    }
}

// ============================================
// MAIN TRANSCRIBE FUNCTION
// ============================================

export async function transcribeAudio(audioFile, onProgress = null) {
    const settings = getSettings();
    
    if (onProgress) onProgress(10);
    
    // Sprawdź czy backend działa
    console.log('🔍 Sprawdzanie dostępności backendu...');
    const backendAvailable = await checkBackend();
    
    if (!backendAvailable) {
        const backendUrl = settings.backendUrl || 'http://localhost:3001';
        throw new Error(
            `❌ Backend nie jest uruchomiony!\n\n` +
            `Backend URL: ${backendUrl}\n\n` +
            `Uruchom backend w nowym terminalu:\n` +
            `npm run server\n\n` +
            `Sprawdź czy działa:\n` +
            `npm run check-backend`
        );
    }
    
    console.log('✅ Backend dostępny!');
    if (onProgress) onProgress(20);
    
    try {
        const text = await transcribeAudioBackend(audioFile);
        if (onProgress) onProgress(100);
        return text;
    } catch (error) {
        console.error('❌ Błąd transkrypcji:', error);
        throw new Error(
            `❌ Błąd podczas transkrypcji:\n${error.message}\n\n` +
            `Sprawdź:\n` +
            `1. Backend działa: npm run check-backend\n` +
            `2. Audio format jest poprawny\n` +
            `3. Logi backendu w terminalu`
        );
    }
}

// ============================================
// RECORDING FUNCTIONS
// ============================================

export async function startRecording() {
    try {
        const stream = await navigator.mediaDevices.getUserMedia({ 
            audio: {
                channelCount: 1,
                sampleRate: 16000,
                echoCancellation: true,
                noiseSuppression: true
            } 
        });
        
        mediaRecorder = new MediaRecorder(stream, {
            mimeType: 'audio/webm;codecs=opus'
        });
        
        audioChunks = [];
        
        mediaRecorder.ondataavailable = (event) => {
            if (event.data.size > 0) {
                audioChunks.push(event.data);
            }
        };
        
        mediaRecorder.start();
        console.log('🎤 Nagrywanie rozpoczęte');
        
        return true;
    } catch (error) {
        console.error('Błąd podczas uruchamiania nagrywania:', error);
        throw new Error('Nie można uzyskać dostępu do mikrofonu. Sprawdź uprawnienia przeglądarki.');
    }
}

export async function stopRecording() {
    return new Promise((resolve, reject) => {
        if (!mediaRecorder || mediaRecorder.state === 'inactive') {
            reject(new Error('Nagrywanie nie jest aktywne'));
            return;
        }
        
        mediaRecorder.onstop = () => {
            const audioBlob = new Blob(audioChunks, { type: 'audio/webm' });
            
            // Stop all tracks
            if (mediaRecorder.stream) {
                mediaRecorder.stream.getTracks().forEach(track => track.stop());
            }
            
            console.log('⏹ Nagrywanie zakończone');
            resolve(audioBlob);
        };
        
        mediaRecorder.stop();
    });
}

export function isRecording() {
    return mediaRecorder && mediaRecorder.state === 'recording';
}
