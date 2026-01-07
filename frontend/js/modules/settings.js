// Settings Module
// Student Assistant v2.0

const SETTINGS_KEY = 'student-asystent:settings';

const DEFAULT_SETTINGS = {
    whisperModel: 'tiny', // SZYBKI model - tiny jest 5x szybszy niż base!
    whisperLanguage: 'pl',
    modelSource: 'remote',
    transcriptionMode: 'backend', // TYLKO BACKEND - przeglądarka jest zbyt wolna
    backendUrl: 'http://localhost:3001',
    aiMode: 'local',
    
    // AI Provider Settings
    aiProvider: 'ollama',           // 'ollama' | 'gemini'
    geminiApiKey: '',               // Klucz API Gemini
    geminiModel: 'gemini-3-pro-preview',  // Model Gemini: gemini-1.5-pro, gemini-1.5-flash, gemini-2.0-flash-exp
    ollamaModel: 'qwen2.5:14b',     // Model Ollama
    
    githubRepo: '',
    githubToken: '',
    githubBranch: 'main',
    username: 'Student'
};

export function getSettings() {
    try {
        const stored = localStorage.getItem(SETTINGS_KEY);
        return stored ? { ...DEFAULT_SETTINGS, ...JSON.parse(stored) } : DEFAULT_SETTINGS;
    } catch (error) {
        console.error('Error loading settings:', error);
        return DEFAULT_SETTINGS;
    }
}

export function setSettings(newSettings) {
    try {
        const current = getSettings();
        const merged = { ...current, ...newSettings };
        localStorage.setItem(SETTINGS_KEY, JSON.stringify(merged));
        return merged;
    } catch (error) {
        console.error('Error saving settings:', error);
        throw error;
    }
}

export function resetSettings() {
    localStorage.removeItem(SETTINGS_KEY);
    return DEFAULT_SETTINGS;
}

export function getSetting(key) {
    const settings = getSettings();
    return settings[key];
}

export function setSetting(key, value) {
    const settings = getSettings();
    settings[key] = value;
    setSettings(settings);
}
