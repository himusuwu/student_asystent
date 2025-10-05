# 🏗️ Architecture - Student Assistant

Szczegółowy opis architektury aplikacji Student Assistant v2.0.

---

## 📋 Table of Contents

- [Przegląd](#przegląd)
- [Frontend Architecture](#frontend-architecture)
- [Backend Architecture](#backend-architecture)
- [Database Schema](#database-schema)
- [Data Flow](#data-flow)
- [AI/ML Pipeline](#aiml-pipeline)
- [Storage Strategy](#storage-strategy)

---

## 🎯 Przegląd

Student Assistant to **hybrid single-page application** która działa w trybie offline-first z opcjonalnym backendem.

### Tech Stack

**Frontend:**
- Vanilla JavaScript (ES6+) - No frameworks
- HTML5 + CSS3
- IndexedDB (via `idb` library) - Local storage
- Transformers.js - Browser AI inference
- ESM modules from CDN (jsDelivr, esm.sh)

**Backend (Optional):**
- Node.js 18+
- Express.js 4.18.2
- @xenova/transformers 2.17.2 - Server-side AI
- Multer - File upload handling

**Infrastructure:**
- Python HTTP server (dev) - Static file serving
- PM2 (production) - Process management
- Nginx (production) - Reverse proxy

---

## 🎨 Frontend Architecture

### Single-File Design

```
student_assistant_app.html (88KB, 2065 lines)
├── <head>
│   ├── Meta tags (PWA manifest, viewport, etc.)
│   ├── <style> - All CSS (1000+ lines)
│   └── External CDN imports
├── <body>
│   ├── App Shell (sidebar, main content area)
│   ├── UI Components (modals, forms, cards)
│   └── <script type="module"> - All JavaScript (1000+ lines)
└── Service Worker registration (future PWA)
```

### Component Structure

```javascript
// Pseudo-component structure (all in one file)

// ============= STATE MANAGEMENT =============
const state = {
    currentView: 'dashboard',
    currentSubject: null,
    currentLecture: null,
    user: null,
    settings: {}
};

// ============= DATABASE LAYER =============
const db = await openDB('studentAssistant', 2, {
    upgrade(db, oldVersion, newVersion, transaction) {
        // Schema migrations
    }
});

// ============= UI RENDERING =============
function renderView(viewName) {
    // Router logic
}

function renderDashboard() { /* ... */ }
function renderSubjects() { /* ... */ }
function renderFlashcards() { /* ... */ }

// ============= BUSINESS LOGIC =============
async function saveSubject(data) { /* ... */ }
async function transcribeAudio(file) { /* ... */ }
function updateSRSCard(card, quality) { /* ... */ }

// ============= EVENT HANDLERS =============
document.getElementById('btn').addEventListener('click', handler);

// ============= INITIALIZATION =============
init();
```

### Routing

Simple client-side routing:

```javascript
const routes = {
    'dashboard': renderDashboard,
    'subjects': renderSubjects,
    'lectures': renderLectures,
    'flashcards': renderFlashcards,
    'exams': renderExams,
    'settings': renderSettings
};

function navigate(route) {
    state.currentView = route;
    routes[route]();
    updateNavigation();
}
```

### State Management

```javascript
// Reactive state updates
function setState(key, value) {
    state[key] = value;
    saveStateToLocalStorage();
    rerenderUI();
}

// Persistent state
localStorage.setItem('appState', JSON.stringify(state));
```

---

## ⚙️ Backend Architecture

### Server Structure

```
server/
├── server.js              # Main Express app
├── package.json           # Dependencies
├── .temp/                 # Uploaded files (gitignored)
└── node_modules/          # Dependencies (gitignored)
```

### API Endpoints

```javascript
// Health check
GET /health
Response: { status: 'ok', model: 'Xenova/whisper-base', timestamp: ... }

// Transcribe audio
POST /transcribe
Body: FormData { file: audio.wav, language: 'pl', model: 'base' }
Response: { text: '...transcription...', duration: 123.45 }
```

### Transcription Pipeline

```javascript
// Simplified flow
1. Receive file upload (Multer)
2. Validate file (type, size)
3. Save to temp directory
4. Load Whisper model (cached)
5. Run inference (8 threads, SIMD)
6. Return transcription
7. Cleanup temp files
```

### Performance Optimizations

```javascript
// Model caching
let cachedPipeline = null;

async function getTranscriber(model) {
    if (cachedPipeline?.model === model) {
        return cachedPipeline.pipe;
    }
    
    // Load new model
    cachedPipeline = {
        model: model,
        pipe: await pipeline('automatic-speech-recognition', model, {
            device: 'cpu',
            num_threads: 8,
            use_simd: true
        })
    };
    
    return cachedPipeline.pipe;
}
```

---

## 💾 Database Schema

### IndexedDB v2 Schema

```javascript
// Store: subjects
{
    id: number (auto-increment),
    name: string,
    description: string,
    color: string,
    icon: string,
    createdAt: string (ISO timestamp),
    updatedAt: string (ISO timestamp)
}

// Store: lectures
{
    id: number (auto-increment),
    subjectId: number,
    title: string,
    date: string (ISO timestamp),
    type: 'lecture' | 'lab' | 'seminar',
    audioFile: Blob | null,
    transcription: string | null,
    notes: string,
    createdAt: string,
    updatedAt: string
}

// Store: lectureTabs
{
    id: number (auto-increment),
    lectureId: number,
    title: string,
    content: string,
    type: 'transcription' | 'notes' | 'summary',
    order: number,
    createdAt: string
}

// Store: flashcards
{
    id: number (auto-increment),
    subjectId: number,
    lectureId: number | null,
    front: string,
    back: string,
    // SRS data
    easeFactor: number (2.5 default),
    interval: number (0 default),
    repetition: number (0 default),
    nextReview: string (ISO timestamp),
    lastReview: string | null,
    createdAt: string
}

// Store: quizQuestions
{
    id: number (auto-increment),
    subjectId: number,
    question: string,
    options: string[],
    correctAnswer: number,
    explanation: string,
    difficulty: 'easy' | 'medium' | 'hard',
    timesAnswered: number,
    timesCorrect: number,
    createdAt: string
}

// Store: chatMessages
{
    id: number (auto-increment),
    role: 'user' | 'assistant',
    content: string,
    timestamp: string (ISO timestamp)
}

// Store: settings
{
    key: string (primary key),
    value: any (JSON-serializable)
}
```

### Indexes

```javascript
// Fast lookups
subjects: none (small table)
lectures: subjectId, date
lectureTabs: lectureId
flashcards: [subjectId, lectureId, nextReview]
quizQuestions: [subjectId]
chatMessages: timestamp
settings: key (primary)
```

---

## 🔄 Data Flow

### 1. Recording & Transcription Flow

```mermaid
User clicks "Record"
    ↓
MediaRecorder API starts
    ↓
User clicks "Stop"
    ↓
Audio Blob created
    ↓
┌─────────────────┐
│   User choice:  │
│ Backend or      │
│ Browser?        │
└─────────────────┘
         ↓
    ┌────┴────┐
    ↓         ↓
Backend    Browser
    ↓         ↓
Express    Transformers.js
server     WebAssembly
    ↓         ↓
Whisper    Whisper
(Node)     (WASM)
    ↓         ↓
    └────┬────┘
         ↓
Transcription text
         ↓
Save to IndexedDB
         ↓
Display in UI
```

### 2. Flashcard Review Flow (SRS)

```mermaid
User clicks "Flashcards"
    ↓
Load cards due today (nextReview <= now)
    ↓
Show card front
    ↓
User clicks "Show Answer"
    ↓
Show card back
    ↓
User rates quality (1-5)
    ↓
Calculate new SRS values:
  - easeFactor
  - interval
  - repetition
  - nextReview
    ↓
Update card in IndexedDB
    ↓
Next card or "Done for today!"
```

### 3. GitHub Sync Flow

```mermaid
User saves lecture
    ↓
Check if GitHub sync enabled
    ↓
Yes → Prepare markdown content
    ↓
Format:
  # Lecture Title
  Date: ...
  Subject: ...
  
  ## Notes
  ...
  
  ## Transcription
  ...
    ↓
GitHub API call (authenticated)
    ↓
POST /repos/:owner/:repo/contents/:path
    ↓
Success → Show toast
Failure → Show error
```

---

## 🤖 AI/ML Pipeline

### Browser Inference (Transformers.js)

```javascript
// 1. Load pipeline
import { pipeline } from 'https://cdn.jsdelivr.net/npm/@xenova/transformers';

const transcriber = await pipeline(
    'automatic-speech-recognition',
    'Xenova/whisper-tiny'  // or base, small
);

// 2. Prepare audio
const audioContext = new AudioContext({ sampleRate: 16000 });
const audioBuffer = await audioContext.decodeAudioData(arrayBuffer);
const audio = audioBuffer.getChannelData(0);

// 3. Run inference
const result = await transcriber(audio, {
    language: 'polish',
    task: 'transcribe',
    return_timestamps: true
});

// 4. Extract text
const text = result.text;
```

### Server Inference (Node.js)

```javascript
// 1. Load pipeline (cached)
import { pipeline } from '@xenova/transformers';

const transcriber = await pipeline(
    'automatic-speech-recognition',
    'Xenova/whisper-base',
    {
        device: 'cpu',
        num_threads: 8,    // M4 Pro optimization
        use_simd: true     // SIMD acceleration
    }
);

// 2. Run inference
const result = await transcriber(audioPath, {
    language: 'pl',
    task: 'transcribe',
    chunk_length_s: 30,
    stride_length_s: 5
});

// 3. Return text
return result.text;
```

### Model Selection

| Model | Size | Speed (10min audio) | Accuracy | Use Case |
|-------|------|---------------------|----------|----------|
| Tiny  | 75MB | ~1min (backend) | 85% | Quick notes |
| Base  | 142MB | ~2min (backend) | 92% | Default, balanced |
| Small | 466MB | ~4min (backend) | 95% | Important lectures |

---

## 💿 Storage Strategy

### 1. Audio Files

```javascript
// Stored in IndexedDB as Blob
const lecture = {
    audioFile: blob,  // Raw audio Blob
    // ...
};

// Retrieval
const blob = lecture.audioFile;
const url = URL.createObjectURL(blob);
audioElement.src = url;

// Cleanup
URL.revokeObjectURL(url);
```

### 2. Text Content

```javascript
// Stored as strings in IndexedDB
const lecture = {
    transcription: "Long text...",
    notes: "Markdown content..."
};

// Compression (future optimization)
import pako from 'pako';
const compressed = pako.deflate(longText);
const decompressed = pako.inflate(compressed, { to: 'string' });
```

### 3. AI Models

```javascript
// Browser: Downloaded on-demand, cached by browser
// Location: public/models/Xenova/whisper-*/

// Server: Downloaded once, cached in memory
// Location: node_modules/.cache/
```

### 4. Settings & State

```javascript
// localStorage for app state
localStorage.setItem('theme', 'dark');
localStorage.setItem('githubToken', token);

// IndexedDB for settings
await db.put('settings', { key: 'dailyGoal', value: 20 });
```

---

## 🔐 Security Architecture

### 1. Authentication

```javascript
// No backend auth (all local)
// GitHub token stored in localStorage
// Token scoped to repo access only
```

### 2. Data Isolation

```javascript
// IndexedDB is origin-isolated
// Same-origin policy applies
// No cross-site data access
```

### 3. API Security

```javascript
// Backend CORS configuration
app.use(cors({
    origin: ['http://localhost:8000', 'https://yourdomain.com'],
    methods: ['GET', 'POST']
}));

// Rate limiting
const limiter = rateLimit({
    windowMs: 15 * 60 * 1000,
    max: 100
});
app.use('/api/', limiter);
```

---

## 📊 Performance Considerations

### Bundle Size

- **v1 (React)**: ~2.5MB source + 380MB node_modules
- **v2 (Vanilla)**: 88KB single file + CDN dependencies

### Load Time

```
Initial Load:
- HTML: 88KB (~100ms on good connection)
- CSS: Inline (0ms additional)
- JS: Inline (0ms additional)
- Models: Lazy-loaded on first use

Subsequent Loads:
- Service Worker cache (future)
- Instant load (<50ms)
```

### Memory Usage

```javascript
// Typical usage:
- IndexedDB: 10-100MB (depending on audio files)
- AI Models in memory: 75-466MB (when loaded)
- DOM: ~5-10MB
- Total: ~100-500MB
```

---

## 🚀 Scaling Considerations

### Horizontal Scaling (Backend)

```nginx
# Load balancer (Nginx)
upstream backend {
    server localhost:3001;
    server localhost:3002;
    server localhost:3003;
}

server {
    location /api/ {
        proxy_pass http://backend;
    }
}
```

### Caching Strategy

```javascript
// CDN for static assets
// Service Worker for offline support
// Model caching in memory
// IndexedDB for data persistence
```

---

## 🔮 Future Architecture

### Potential Enhancements

1. **PWA with Service Worker**
   - Offline support
   - Background sync
   - Push notifications

2. **WebRTC for real-time collaboration**
   - Shared note-taking
   - Live transcription sharing

3. **Cloud backend (optional)**
   - User accounts
   - Cross-device sync
   - Cloud storage

4. **Mobile apps**
   - React Native wrapper
   - Shared web codebase

---

## 📚 References

- [IndexedDB API](https://developer.mozilla.org/en-US/docs/Web/API/IndexedDB_API)
- [Transformers.js](https://huggingface.co/docs/transformers.js)
- [Web Audio API](https://developer.mozilla.org/en-US/docs/Web/API/Web_Audio_API)
- [Service Workers](https://developer.mozilla.org/en-US/docs/Web/API/Service_Worker_API)

---

**Maintained by: Student Assistant Team**  
**Last Updated: 2024**
