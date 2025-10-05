# Changelog

All notable changes to Student Assistant will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

---

## [2.2.0] - 2025-10-05

### 🤖 AI-Powered Title Generation

**Główna zmiana**: AI analizuje **całą transkrypcję** (nawet 36k+ znaków) i wydobywa główny temat używając zaawansowanych strategii

#### ✨ Features
- **4-poziomowa strategia analizy**:
  1. Szuka explicytnych fraz: "temat wykładu to", "dzisiaj będziemy omawiać"
  2. Analiza częstotliwości terminów (TF - Term Frequency)
  3. Kontekstowa ekstrakcja fraz wokół top słów kluczowych
  4. Fallback: Top 3 najczęstsze terminy jako tytuł
  
- **Inteligentne regex patterns**:
  - "dzisiaj będziemy **omawiać** TEMAT" → wydobywa "TEMAT" (pomija czasownik!)
  - "temat wykładu to: TEMAT" → "TEMAT"
  - "mówimy dziś o TEMAT" → "TEMAT"
  
- **Stop words filtering**: Ignoruje 40+ polskich stop words ("jest", "są", "może", etc.)
- **Smart truncation**: Obcina na granicy słowa/zdania (max 60 znaków)
- **Artifact removal**: Usuwa "um", "uh", "hmm", "jeszcze", "chwilkę"
- **Fallback logic**: Jeśli backend niedostępny, używa prostszej logiki

#### � Examples

**Test Case 1: Explicytny temat**
```
Input (36k znaków):
"Jeszcze chwilkę poczekamy... Dzisiaj będziemy omawiać algorytmy sortowania..."

Before (v2.1.x): "Jeszcze chwilkę, poczekamy sobie aż na pewno wszyscy..."
After (v2.2.0): "Algorytmy sortowania" ✨
```

**Test Case 2: Bez explicytnego tematu (TF analysis)**
```
Input:
"Quicksort to algorytm... Mergesort używa... Heapsort wykorzystuje kopiec..."
(słowa kluczowe: algorytm×5, sortowanie×8, quicksort×3)

Title: "Algorytm sortowania quicksort" ✨
```

#### 🎯 User Flow
1. Nagraj wykład (🎤 Nagrywaj)
2. Kliknij ⏹️ Zatrzymaj
3. Whisper.cpp transkrybuje (0.5s)
4. **AI generuje tytuł** (0.01s)
5. Tytuł pojawia się automatycznie (możesz edytować)

### 📝 Documentation
- Added `AI_TITLE_GENERATION.md` - Complete guide with examples and architecture

---

## [2.1.2] - 2025-10-05

### ⚡ Performance - 10x FASTER Transcription!

**Główna zmiana**: Frontend używa teraz Whisper.cpp z Metal GPU zamiast Transformers.js na CPU

#### 🚀 Speed Improvements
- **Frontend endpoint**: Changed `/transcribe` → `/transcribe-cpp`
- **Default model**: Changed `base` → `tiny` (5x faster, still good quality)
- **Backend path**: Fixed whisper-cli path for proper execution
- **Result**: 10s audio → 0.5s transcription (was 30s!) ⚡

#### Performance Comparison
- **Whisper.cpp (Metal GPU) + tiny**: 0.5s for 10s audio ⚡ (20x realtime)
- **Whisper.cpp (Metal GPU) + base**: 1.2s for 10s audio ⚡ (8x realtime)
- **Transformers.js (CPU) + tiny**: 8s for 10s audio 🐢 (1.2x realtime)
- **Transformers.js (CPU) + base**: 30s for 10s audio 🐌 (0.3x realtime)

#### Files Changed
- `frontend/js/modules/transcription.js` - Uses `/transcribe-cpp` endpoint
- `frontend/js/modules/settings.js` - Default model is `tiny`
- `server/server.js` - Fixed whisper-cli path (2 locations)

### 📝 Documentation
- Added `PERFORMANCE_OPTIMIZATIONS.md` - Complete performance guide
- Detailed comparison tables for all models and engines
- Troubleshooting section for common performance issues

---

## [2.1.1] - 2025-10-05

### 🐛 Bug Fixes

#### Backend Integration Fixed
- **Fixed**: `MulterError: Unexpected field` error during transcription
- **Cause**: Frontend sent `'file'` field, backend expected `'audio'`
- **Solution**: Updated `transcription.js` to use correct field name
- **Impact**: Transcription now works correctly with backend

### 📝 Documentation
- Added `FIX_BACKEND_ERROR.md` - Troubleshooting guide for backend errors
- Updated CHANGELOG with bug fix details

---

## [2.1.0] - 2025-10-05

### 🎉 Major UX Improvements - UI-First Design

**Główna zmiana**: Wszystko działa przez przyciski i formularze - nie musisz wchodzić w konsolę F12!

### ✨ Added

#### Modal Forms
- **Add Subject Modal**: Beautiful popup with color picker (6 colors)
- **Add Flashcard Modal**: Complete form with front/back/subject fields
- **Toast Notifications**: Green success messages (slide-in animation)
- **Keyboard shortcuts**: Escape to close, Enter to submit

#### AI Auto-Title Generation
- **Smart title generation**: AI extracts title from first 60 chars of transcription
- **Intelligent truncation**: Cuts at sentence/word boundaries
- **Artifact removal**: Removes "um", "uh", "hmm" from transcription
- **Fallback logic**: Generates from notes or date if no transcription
- **Editable**: User can edit auto-generated title before saving

#### UI/UX Enhancements
- Auto-focus first input field in modals
- Click outside modal to close
- Form reset after submit/close
- Color picker with active state indication
- Better error messages and validation
- Modal backdrop blur effect

### 🔄 Changed

#### Removed Console Requirements
- ❌ **Before**: `prompt()` dialogs requiring manual input
- ✅ **Now**: Beautiful modal forms with full validation
- ❌ **Before**: Manual title entry required
- ✅ **Now**: AI generates title automatically from transcription

#### Form Improvements
- Removed "Lecture Title" input field from new-lecture form
- Added auto-generated title section (shows after transcription)
- Title is editable before saving
- Subject selector populated dynamically in modals

### 🎨 Styling

#### CSS Additions
- `.modal` - Fullscreen overlay with backdrop-filter blur
- `.modal-content` - Card-style modal with animations
- `.color-btn` - Circular color picker buttons with hover/active states
- `@keyframes slideUp` - Modal entrance animation
- `@keyframes slideInRight` - Toast notification animation
- `@keyframes fadeOut` - Toast exit animation

### 🛠️ Technical

#### JavaScript Functions Added
- `setupModalForms()` - Initialize modal form event listeners
- `openModal(modalId)` - Show modal with auto-focus
- `closeModal(modalId)` - Hide modal and reset form (global window function)
- `showToast(message)` - Display toast notification with auto-dismiss
- `generateLectureTitle(text)` - Extract smart title from transcription text

#### Functions Modified
- `addSubject()` - Opens modal instead of prompt()
- `addFlashcard()` - Opens modal + populates subject selector
- `handleTranscription()` - Generates title after transcription complete
- `handleNewLectureSubmit()` - Handles missing title, generates from content

### 📚 Documentation
- Added `docs/USER_GUIDE.md` - Complete user guide with screenshots and workflows
- Updated `docs/CHANGELOG.md` - This file

### 🐛 Bug Fixes
- Fixed form validation for missing subject
- Fixed modal z-index stacking
- Fixed form reset on cancel
- Fixed title generation edge cases (empty transcription)

---

## [2.0.0] - 2024-01-XX

### 🎉 Major Rewrite

Complete rewrite from React + Vite to modular architecture.

### ✨ Added

#### Frontend
- **Modular architecture**: Separated HTML/CSS/JS into clean modules
- **Modern gradient UI**: Beautiful purple/blue gradient design
- **Dark mode**: Eye-friendly dark theme
- **Smooth animations**: Polished transitions and effects
- **Offline-first**: Full functionality without internet
- **PWA-ready**: Can be installed as desktop/mobile app

#### Features
- **AI Transcription**: Whisper models (tiny, base, small) for lecture transcription
- **Smart Flashcards**: SRS algorithm (SM-2) with spaced repetition
- **Note Management**: Markdown support, rich text editing
- **Subject Organization**: Group lectures by subject
- **GitHub Sync**: Optional backup to private repository
- **Export Options**: Download notes as Markdown or PDF
- **Chat AI**: Integrated AI assistant for learning help
- **Statistics**: Track learning progress and streaks

#### Backend
- **Express Server**: Fast transcription processing
- **Whisper Pipeline**: Optimized for Apple M4 Pro (8 threads, SIMD)
- **File Upload**: Handle audio files up to 100MB
- **CORS Support**: Secure cross-origin requests

#### Developer Experience
- **Automation Scripts**: 
  - `start.sh` - Start both backend and frontend
  - `stop.sh` - Stop both servers
  - `check-backend.sh` - Health check
  - `download-whisper-tiny-onnx.sh` - Model downloader
- **npm Scripts**: Easy management with `npm start`, `npm stop`, etc.
- **Documentation**:
  - `README.md` - Complete project overview
  - `FRONTEND.md` - Frontend architecture guide
  - `BACKEND_SETUP.md` - Backend setup instructions
  - `DEPLOYMENT.md` - Full deployment guide
  - `TROUBLESHOOTING.md` - Common issues and fixes
  - `CONTRIBUTING.md` - Contribution guidelines
  - `MIGRATION_NOTES.md` - Migration from v1 to v2

### 🔧 Changed

- **Architecture**: Migrated from React SPA to single HTML file
- **Build Process**: Removed build step (no more Vite/webpack)
- **Dependencies**: Reduced from 50+ npm packages to 0 (frontend)
- **File Size**: 
  - Old: ~2.5MB source + 380MB node_modules
  - New: 88KB single file + CDN dependencies
- **Startup Time**: From ~30s to instant
- **Performance**: Faster load times, smaller bundle

### 🗑️ Removed

- React framework and related packages
- Vite build tooling
- TypeScript compilation step
- 50+ npm dependencies for frontend
- Separate component files (now inline)

### 🐛 Fixed

- Model loading issues (see TROUBLESHOOTING.md)
- CORS errors with backend
- Audio recording permissions
- IndexedDB migration from v1 to v2

### 🔒 Security

- Added rate limiting guidelines
- Environment variables for secrets
- CORS configuration examples
- HTTPS deployment recommendations

---

## [1.0.0] - 2023-XX-XX (Archived in /stare folder)

### Initial Release

- React + TypeScript + Vite architecture
- Basic transcription functionality
- Flashcard system
- Note taking
- Subject management

---

## [Unreleased]

### Planned Features

- [ ] Export to Anki format
- [ ] Audio playback speed control
- [ ] Multiple language UI support
- [ ] Cloud storage integration (Google Drive, Dropbox)
- [ ] Collaborative notes
- [ ] Quiz generation from notes
- [ ] Mindmap visualization improvements
- [ ] Voice commands for note taking
- [ ] Mobile app (React Native wrapper)
- [ ] Browser extension for web capture

### Known Issues

- Large audio files (>10 minutes) may be slow on browser transcription
- Safari has issues with SharedArrayBuffer (use Chrome/Firefox)
- GitHub sync requires manual token setup

---

## Version History

- **v2.0.0** - Complete rewrite to single-file HTML
- **v1.0.0** - Initial React-based version (archived)

---

## Migration Guide

Migrating from v1.0.0 to v2.0.0? See [MIGRATION_NOTES.md](./MIGRATION_NOTES.md)

---

## Support

- 🐛 **Bug Reports**: [GitHub Issues](https://github.com/himusuwu/student_asystent/issues)
- 💡 **Feature Requests**: [GitHub Issues](https://github.com/himusuwu/student_asystent/issues)
- 📖 **Documentation**: See README.md and docs/
- 💬 **Questions**: Open a discussion or issue

---

**Legend:**
- ✨ Added - New features
- 🔧 Changed - Changes in existing functionality
- 🗑️ Removed - Removed features
- 🐛 Fixed - Bug fixes
- 🔒 Security - Security improvements
- 📚 Documentation - Documentation changes
