# 🚀 Quick Start Guide

## Natychmiastowy start (dla Ciebie!)

```bash
npm run dev
```

**GOTOWE!** Otwórz: http://localhost:8000

---

## Co zostało zrobione? ✅

### 1. Nowa modularna struktura

**Przed:**
```
❌ student_assistant_app.html (2,065 linii - wszystko w jednym)
```

**Teraz:**
```
✅ index.html (275 linii - czytelny)
✅ frontend/css/main.css (476 linii - stylowanie)
✅ frontend/js/app.js (450+ linii - główna logika)
✅ frontend/js/modules/
    ├── database.js (220 linii - IndexedDB)
    ├── settings.js (60 linii - ustawienia)
    └── transcription.js (200 linii - Whisper AI)
```

### 2. Uporządkowane foldery

```
student_asystent/
├── frontend/        ← Cała aplikacja frontendowa
├── server/          ← Backend (opcjonalny)
├── docs/            ← Cała dokumentacja (30+ plików)
├── scripts/         ← Skrypty pomocnicze (start/stop/check)
├── config/          ← Konfiguracja (.env, .editorconfig)
├── index.html       ← Główny entry point
└── README.md        ← Ten przewodnik
```

### 3. Prostsze komendy

**Przed:**
```bash
# Musiałeś wchodzić w konsolę i:
cd stare
python3 -m http.server 8000
# Potem w innym terminalu:
cd server && npm start
# I jeszcze ręcznie otwierać przeglądarkę...
```

**Teraz:**
```bash
npm run dev          # Frontend na http://localhost:8000
npm start            # Backend + Frontend razem
npm stop             # Zatrzymaj wszystko
```

### 4. Profesjonalna architektura

**ES6 Modules:**
```javascript
// frontend/js/modules/database.js
export async function createSubject(name) { ... }
export async function listSubjects() { ... }

// frontend/js/modules/settings.js
export function getSettings() { ... }
export function setSettings(settings) { ... }

// frontend/js/modules/transcription.js
export async function transcribeAudio(audioBlob) { ... }
export async function startRecording() { ... }

// frontend/js/app.js
import { createSubject, listSubjects } from './modules/database.js';
import { getSettings } from './modules/settings.js';
import { transcribeAudio, startRecording } from './modules/transcription.js';
```

**Separation of Concerns:**
- HTML: Struktura strony
- CSS: Style i animacje
- JS Modules: Logika biznesowa podzielona na małe, czytelne moduły
- Backend: Opcjonalnie dla szybszej transkrypcji

---

## Jak to działa?

### 1. Uruchamianie aplikacji

```bash
npm run dev
```

To uruchamia Python HTTP server na porcie 8000:
- Serwuje `index.html` jako główny plik
- `index.html` ładuje:
  - `frontend/css/main.css` (style)
  - `frontend/js/app.js` (główna aplikacja jako ES6 module)
- `app.js` importuje moduły:
  - `modules/database.js`
  - `modules/settings.js`
  - `modules/transcription.js`

### 2. Nagrywanie wykładów

1. Kliknij "New Lecture" w aplikacji
2. Wybierz przedmiot lub dodaj nowy
3. Kliknij przycisk "Start Recording" 🎤
4. Mów... (nagrywanie w przeglądarce)
5. Kliknij "Stop Recording" ⏹️
6. Kliknij "Transcribe" - Whisper AI zamienia audio na tekst
7. Kliknij "Save" - notatki zapisane w IndexedDB

### 3. Backend (opcjonalny - szybsza transkrypcja)

```bash
npm run server
```

Backend na porcie 3001 używa Whisper.cpp do szybszej transkrypcji.

W aplikacji:
- Settings → Backend URL: `http://localhost:3001`
- Teraz transkrypcja będzie używać backendu (szybsze!)

---

## Dostępne komendy

### Development

```bash
npm run dev              # Uruchom frontend (port 8000)
npm run server           # Uruchom backend (port 3001)
npm start                # Uruchom backend + frontend
npm stop                 # Zatrzymaj wszystkie serwery
```

### Setup (pierwszy raz)

```bash
npm run install:server   # Zainstaluj zależności backendu
npm run download-models  # Pobierz modele Whisper
npm run check-backend    # Sprawdź czy backend działa
```

### Maintenance

```bash
npm run clean            # Wyczyść node_modules
npm run docs             # Otwórz dokumentację
```

---

## Rozwiązywanie problemów

### Port zajęty (Address already in use)

```bash
npm stop                 # Zatrzymaj wszystkie serwery
npm run dev              # Uruchom ponownie
```

### Moduły się nie ładują (CORS error)

**MUSISZ** używać HTTP servera, nie otwierać `file://`:
```bash
npm run dev              # To uruchomi HTTP server
```

Nie rób:
```bash
# ❌ Nie otwieraj bezpośrednio w przeglądarce:
open index.html          # To nie zadziała z ES6 modules!
```

### Backend nie działa

```bash
cd server
npm install              # Zainstaluj zależności
npm start                # Uruchom backend
```

Sprawdź w aplikacji: Settings → Backend URL: `http://localhost:3001`

---

## Struktura modułów

### database.js - IndexedDB Operations

```javascript
// Otwórz bazę danych
await openDatabase();

// Przedmioty
const subject = await createSubject('Matematyka');
const subjects = await listSubjects();
await deleteSubject(subjectId);

// Wykłady
const lecture = await createLecture({
  subject: 'Matematyka',
  title: 'Pochodne',
  transcript: '...',
  audio: blob
});
const lectures = await listLectures();
const lecturesBySubject = await listLecturesBySubject(subjectId);

// Fiszki
const flashcard = await createFlashcard({
  front: 'Pytanie?',
  back: 'Odpowiedź',
  subject: 'Matematyka'
});
const flashcards = await listFlashcards();
```

### settings.js - Settings Management

```javascript
// Pobierz wszystkie ustawienia
const settings = getSettings();

// Ustaw ustawienia
setSettings({
  whisperModel: 'base',
  language: 'pl',
  backendURL: 'http://localhost:3001'
});

// Pojedyncze wartości
const model = getSetting('whisperModel');
setSetting('whisperModel', 'small');

// Reset do defaults
resetSettings();
```

### transcription.js - Whisper AI

```javascript
// Transkrypcja audio
const text = await transcribeAudio(audioBlob);

// Nagrywanie
await startRecording();
const isRec = isRecording();
const audioBlob = await stopRecording();

// Sprawdź backend
const available = await checkBackend();

// Inicjalizuj Whisper w przeglądarce
await initializeWhisper();
```

### app.js - Main Application

Główna aplikacja która:
- Ładuje moduły
- Inicjalizuje UI
- Obsługuje nawigację (dashboard, subjects, lectures, flashcards, settings)
- Zarządza eventami (click, submit, record, upload)
- Renderuje widoki

---

## Co dalej?

### Rozwijaj funkcje

1. Dodaj nowe moduły w `frontend/js/modules/`:
   ```bash
   touch frontend/js/modules/export.js
   touch frontend/js/modules/github.js
   ```

2. Importuj w `app.js`:
   ```javascript
   import { exportToMarkdown } from './modules/export.js';
   import { syncToGitHub } from './modules/github.js';
   ```

### Poprawiaj UI

1. Edytuj `frontend/css/main.css`:
   - Dodaj nowe style
   - Zmień kolory (CSS variables na górze)
   - Dodaj animacje

2. Modyfikuj `index.html`:
   - Dodaj nowe sekcje
   - Zmień layout
   - Dodaj nowe przyciski

### Testuj

1. Otwórz DevTools (F12)
2. Sprawdź Console na błędy
3. Sprawdź Network na problemy z ładowaniem
4. Sprawdź Application → IndexedDB na dane

---

## Dokumentacja

Pełna dokumentacja w `docs/`:
- [README.md](./docs/README.md) - Główny README
- [ARCHITECTURE.md](./docs/ARCHITECTURE.md) - Szczegóły architektury
- [FAQ.md](./docs/FAQ.md) - Często zadawane pytania
- [TROUBLESHOOTING.md](./docs/TROUBLESHOOTING.md) - Rozwiązywanie problemów

---

## Podsumowanie

✅ **Zamiast jednego 2,065-liniowego pliku:**
- Masz modularną architekturę z 4 modułami
- Czystą separację HTML/CSS/JS
- Profesjonalną strukturę folderów
- Proste `npm run dev` zamiast ręcznych komend

✅ **Łatwy development:**
- Edytujesz moduł → odświeżasz przeglądarkę → działa
- Nie musisz scrollować 2000 linii
- Łatwo znaleźć kod (database.js, settings.js, transcription.js)

✅ **Gotowe do użycia:**
```bash
npm run dev
```

**Powodzenia!** 🚀
