// Transcription Module - Whisper AI
// Student Assistant v2.0

import { getSettings } from './settings.js';

let transcriber = null;
let mediaRecorder = null;
let audioChunks = [];

// Initialize Whisper pipeline (browser)
export async function initializeWhisper() {
    const settings = getSettings();
    
    // Wait for pre-loaded Transformers.js
    let transformers;
    if (window.transformersPromise) {
        transformers = await window.transformersPromise;
    } else {
        // Fallback: load dynamically
        transformers = await import('https://cdn.jsdelivr.net/npm/@xenova/transformers@2.17.2');
    }
    
    const { pipeline, env } = transformers;
    
    // Configure
    env.allowLocalModels = false;
    env.useBrowserCache = true;
    
    console.log(`Initializing Whisper model: ${settings.whisperModel}`);
    
    transcriber = await pipeline(
        'automatic-speech-recognition',
        `Xenova/whisper-${settings.whisperModel}`,
        {
            quantized: true,
        }
    );
    
    console.log('Whisper model loaded successfully');
    return transcriber;
}

// Transcribe audio using browser
export async function transcribeAudioBrowser(audioFile) {
    if (!transcriber) {
        await initializeWhisper();
    }
    
    const settings = getSettings();
    
    // Read file as ArrayBuffer
    const arrayBuffer = await audioFile.arrayBuffer();
    
    // Decode audio
    const audioContext = new AudioContext({ sampleRate: 16000 });
    const audioBuffer = await audioContext.decodeAudioData(arrayBuffer);
    const audio = audioBuffer.getChannelData(0);
    
    console.log('Transcribing audio...');
    
    const result = await transcriber(audio, {
        language: settings.whisperLanguage === 'auto' ? null : settings.whisperLanguage,
        task: 'transcribe',
        return_timestamps: false,
    });
    
    return result.text;
}

// Transcribe audio using backend
export async function transcribeAudioBackend(audioFile) {
    const settings = getSettings();
    const backendUrl = settings.backendUrl || 'http://localhost:3001';
    
    const formData = new FormData();
    formData.append('file', audioFile);
    formData.append('language', settings.whisperLanguage);
    formData.append('model', settings.whisperModel);
    
    console.log(`Sending audio to backend: ${backendUrl}/transcribe`);
    
    const response = await fetch(`${backendUrl}/transcribe`, {
        method: 'POST',
        body: formData
    });
    
    if (!response.ok) {
        throw new Error(`Backend error: ${response.statusText}`);
    }
    
    const result = await response.json();
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
        // Ignore CORS, network errors - backend just not available
        console.log('Backend not available, using browser mode');
        return false;
    }
}

// Main transcribe function - ONLY BACKEND MODE
export async function transcribeAudio(audioFile, onProgress = null) {
    const settings = getSettings();
    
    if (onProgress) onProgress(10); // Starting
    
    // Check if backend is available
    console.log('Sprawdzanie dostępności backendu...');
    const backendAvailable = await checkBackend();
    
    if (!backendAvailable) {
        throw new Error('❌ Backend nie jest uruchomiony!\n\nUruchom backend w nowym terminalu:\n\nnpm run server\n\nBackend musi działać na: ' + (settings.backendUrl || 'http://localhost:3001'));
    }
    
    console.log('✅ Backend dostępny, rozpoczynam transkrypcję...');
    if (onProgress) onProgress(20);
    
    try {
        const text = await transcribeAudioBackend(audioFile);
        if (onProgress) onProgress(100);
        return text;
    } catch (error) {
        console.error('Błąd transkrypcji:', error);
        throw new Error(`❌ Błąd podczas transkrypcji:\n${error.message}\n\nSprawdź czy backend działa:\nnpm run check-backend`);
    }
}

// Recording functions
export async function startRecording() {
    try {
        const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
        
        audioChunks = [];
        mediaRecorder = new MediaRecorder(stream);
        
        mediaRecorder.ondataavailable = (event) => {
            if (event.data.size > 0) {
                audioChunks.push(event.data);
            }
        };
        
        mediaRecorder.start();
        console.log('Recording started');
        
        return true;
    } catch (error) {
        console.error('Error starting recording:', error);
        throw error;
    }
}

export async function stopRecording() {
    return new Promise((resolve, reject) => {
        if (!mediaRecorder) {
            reject(new Error('No active recording'));
            return;
        }
        
        mediaRecorder.onstop = () => {
            const audioBlob = new Blob(audioChunks, { type: 'audio/webm' });
            const audioFile = new File([audioBlob], 'recording.webm', { type: 'audio/webm' });
            
            // Stop all tracks
            mediaRecorder.stream.getTracks().forEach(track => track.stop());
            
            console.log('Recording stopped, file size:', audioFile.size);
            resolve(audioFile);
        };
        
        mediaRecorder.stop();
    });
}

export function isRecording() {
    return mediaRecorder && mediaRecorder.state === 'recording';
}
