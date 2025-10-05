# 🌐 Frontend - Student Assistant

## 📂 Architektura frontendu

Frontend to **jeden plik HTML** (`student_assistant_app.html`) zawierający:
- ✅ **HTML** - Struktura strony
- ✅ **CSS** - Style (inline w `<style>`)
- ✅ **JavaScript** - Logika aplikacji (ESM modules)

### Zalety tej architektury:
- **Zero build process** - Nie wymaga kompilacji
- **Szybkie uruchomienie** - Otwórz i działa
- **Łatwe debugowanie** - Wszystko w jednym pliku
- **Offline-first** - Działa bez internetu po pierwszym załadowaniu

---

## 🚀 Uruchamianie frontendu

### Opcja 1: Automatyczny start (zalecane)

Uruchom **backend + frontend** jedną komendą:

```bash
npm start
```

To uruchomi:
- Backend na **http://localhost:3001**
- Frontend na **http://localhost:8000**

**Otwórz aplikację:** http://localhost:8000/student_assistant_app.html

### Opcja 2: Tylko frontend (bez backendu)

```bash
npm run frontend
```

lub bezpośrednio:

```bash
python3 -m http.server 8000
```

**Otwórz:** http://localhost:8000/student_assistant_app.html

⚠️ **Bez backendu** transkrypcja będzie wolniejsza (tylko w przeglądarce)

### Opcja 3: Bezpośrednie otwarcie w przeglądarce

```bash
open student_assistant_app.html
```

lub przeciągnij plik do przeglądarki.

⚠️ **Ograniczenia**: 
- Brak CORS dla API (nie załadują się zewnętrzne zasoby)
- Lepiej używać z prostym serwerem HTTP

---

## 🛑 Zatrzymywanie serwerów

```bash
npm run stop
```

lub ręcznie:

```bash
# Zatrzymaj backend
lsof -ti:3001 | xargs kill -9

# Zatrzymaj frontend
lsof -ti:8000 | xargs kill -9
```

---

## 🔧 Struktura pliku HTML

```html
student_assistant_app.html
│
├── <head>
│   ├── Meta tags (viewport, charset)
│   └── <style> - CSS styles (1200 linii)
│
├── <body>
│   ├── .background-gradient - Tło z animacjami
│   │
│   ├── <header> - Logo + user info
│   │
│   ├── <nav> - Nawigacja (Dashboard, Fiszki, Wykłady, etc.)
│   │
│   └── Zakładki (.content):
│       ├── #dashboard - Statystyki i aktywność
│       ├── #flashcards - Fiszki SRS
│       ├── #lectures - Lista wykładów
│       ├── #new-lecture - ✨ Nowy wykład (transkrypcja)
│       ├── #subjects - Zarządzanie przedmiotami
│       ├── #schedule - Plan zajęć
│       └── #settings - Ustawienia
│
└── <script type="module">
    ├── Import bibliotek (transformers.js, idb)
    ├── IndexedDB setup
    ├── Funkcje zarządzania danymi
    ├── System transkrypcji (Whisper AI)
    ├── Algorytm SRS (SM-2)
    ├── UI handlers
    └── Inicjalizacja aplikacji
```

---

## 🎨 Dostosowywanie stylu

### Zmiana kolorów

Edytuj zmienne CSS w sekcji `:root`:

```css
:root {
    --primary: #6366f1;        /* Główny kolor (niebieski) */
    --secondary: #8b5cf6;      /* Drugi kolor (fioletowy) */
    --accent: #ec4899;         /* Akcent (różowy) */
    --success: #10b981;        /* Sukces (zielony) */
    --bg-dark: #0f0f1e;        /* Tło ciemne */
    --bg-card: #1a1a2e;        /* Tło kart */
    --text: #e2e8f0;           /* Kolor tekstu */
    --text-secondary: #94a3b8; /* Tekst drugorzędny */
}
```

### Dodanie nowego koloru/motywu

1. Znajdź sekcję `<style>` w HTML
2. Dodaj nowe zmienne CSS w `:root`
3. Użyj `var(--twoja-zmienna)` w stylach

---

## 🧩 Dodawanie nowych funkcji

### 1. Dodanie nowej zakładki

**Krok 1:** Dodaj przycisk w nawigacji:

```html
<nav>
    <!-- ... istniejące przyciski ... -->
    <button class="nav-btn" data-tab="new-tab">🆕 Nowa zakładka</button>
</nav>
```

**Krok 2:** Dodaj zawartość zakładki:

```html
<div class="content" id="new-tab">
    <h2>Nowa funkcjonalność</h2>
    <!-- Twoja treść -->
</div>
```

**Krok 3:** (Opcjonalnie) Dodaj handler w JavaScript:

```javascript
// W sekcji NAVIGATION
switch(tab) {
    // ... istniejące case'y ...
    case 'new-tab':
        renderNewTab();
        break;
}

function renderNewTab() {
    // Logika renderowania
}
```

### 2. Dodanie nowej funkcji IndexedDB

```javascript
async function getMojaNowaFunkcja(id) {
    const db = await openDatabase();
    return await db.get('nazwaTablicy', id);
}

async function saveMojaNowaFunkcja(data) {
    const db = await openDatabase();
    const id = uid('prefix_');
    await db.put('nazwaTablicy', { id, ...data }, id);
    return id;
}
```

---

## 🔍 Debugowanie frontendu

### Konsola przeglądarki (F12)

Aplikacja eksponuje globalne API:

```javascript
// Sprawdź stan aplikacji
StudentAssistant.currentState

// Lista przedmiotów
StudentAssistant.listSubjects()

// Lista wykładów
StudentAssistant.listLectures()

// Lista fiszek
StudentAssistant.listAllFlashcards()

// Ustawienia
StudentAssistant.getSettings()

// Dodaj przedmiot
await StudentAssistant.createSubject('Fizyka', '#10b981')

// Transkrybuj audio (wymaga pliku Blob)
const audioBlob = new Blob([...], {type: 'audio/wav'})
await StudentAssistant.transcribeAudio(audioBlob, 'pl', (p, phase) => {
    console.log(`${p}% - ${phase}`)
})
```

### Inspekcja IndexedDB

1. Otwórz DevTools (F12)
2. Zakładka **Application** (Chrome) lub **Storage** (Firefox)
3. Rozwiń **IndexedDB** → **student-asystent**
4. Przeglądaj tablice: subjects, lectures, flashcards, etc.

### Logi aplikacji

Wszystkie operacje są logowane z timestampem:

```
[2025-10-05T21:00:00.000Z] Inicjalizacja Student Assistant...
[2025-10-05T21:00:00.500Z] AI Environment: threads=4, isolated=false
[2025-10-05T21:00:01.000Z] Student Assistant gotowy do użycia!
```

---

## 📦 Zależności zewnętrzne (CDN)

Frontend ładuje biblioteki z CDN:

### IDB (IndexedDB wrapper)
```html
<script src="https://cdn.jsdelivr.net/npm/idb@8.0.0/build/umd.js"></script>
```

### Transformers.js (Whisper AI)
```javascript
import { pipeline, env } from 'https://cdn.jsdelivr.net/npm/@xenova/transformers@2.17.2'
```

**Ważne:** Przy pierwszym uruchomieniu wymaga internetu do pobrania bibliotek.

---

## 🚨 Częste problemy i rozwiązania

### Problem: "Failed to load module script"

**Przyczyna:** Plik otwarty bezpośrednio (`file://`) zamiast przez serwer HTTP

**Rozwiązanie:**
```bash
npm run frontend
# lub
python3 -m http.server 8000
```

### Problem: "Failed to fetch transformers model"

**Przyczyna:** Brak internetu przy pierwszym użyciu

**Rozwiązanie:**
1. Pobierz modele lokalnie: `npm run download-models`
2. W Settings zmień "Źródło modeli" na "Lokalne"

### Problem: Transkrypcja bardzo wolna

**Rozwiązanie:**
1. Uruchom backend: `npm run server`
2. W Settings wybierz "Tryb transkrypcji" → "Automatyczny" lub "Tylko backend"

### Problem: CORS errors

**Przyczyna:** Plik otwarty z `file://`

**Rozwiązanie:** Użyj serwera HTTP: `npm run frontend`

---

## 🔒 Bezpieczeństwo frontendu

### Content Security Policy (CSP)

Jeśli chcesz dodać CSP, dodaj meta tag:

```html
<meta http-equiv="Content-Security-Policy" 
      content="default-src 'self'; 
               script-src 'self' 'unsafe-inline' https://cdn.jsdelivr.net; 
               style-src 'self' 'unsafe-inline';">
```

### LocalStorage encryption

Ustawienia są zapisywane w plain text. Jeśli chcesz szyfrować:

```javascript
function setSettings(newSettings) {
    const encrypted = btoa(JSON.stringify(newSettings)); // Base64 (prosty)
    localStorage.setItem('student-asystent:settings', encrypted);
}

function getSettings() {
    const encrypted = localStorage.getItem('student-asystent:settings');
    return encrypted ? JSON.parse(atob(encrypted)) : {};
}
```

---

## 📱 Responsywność

Frontend jest responsywny dla:
- 🖥️ Desktop (1400px+)
- 💻 Laptop (1024px - 1400px)
- 📱 Tablet (768px - 1024px)
- 📱 Mobile (< 768px)

### Breakpoints w CSS:

```css
@media (max-width: 768px) {
    .grid {
        grid-template-columns: 1fr; /* 1 kolumna na mobile */
    }
}
```

---

## ⚡ Optymalizacja wydajności

### Lazy loading dla dużych sekcji

```javascript
// Ładuj dane dopiero gdy zakładka jest aktywna
async function renderLectures() {
    if (!currentState.lectures.length) {
        showLoader();
        currentState.lectures = await listLectures();
        hideLoader();
    }
    // Render...
}
```

### Debouncing dla search

```javascript
let searchTimeout;
searchBox.addEventListener('input', (e) => {
    clearTimeout(searchTimeout);
    searchTimeout = setTimeout(() => {
        performSearch(e.target.value);
    }, 300); // 300ms debounce
});
```

---

## 🎯 Roadmap frontendu

Plany rozwoju:

- [ ] **Service Worker** - Pełne PWA z offline caching
- [ ] **Dark/Light theme toggle** - Przełącznik motywów
- [ ] **Export/Import** - Backup danych do JSON
- [ ] **Drag & drop** - Dla wszystkich elementów
- [ ] **Keyboard shortcuts** - Skróty klawiszowe
- [ ] **Search** - Globalne wyszukiwanie
- [ ] **Notifications** - Powiadomienia systemowe
- [ ] **Charts** - Wykresy postępów
- [ ] **Mobile app** - Wrapper Capacitor

---

## 📞 Support

Problemy z frontendem? Sprawdź:
1. Konsolę przeglądarki (F12)
2. Network tab (czy zasoby się ładują?)
3. Application tab (IndexedDB, localStorage)

**Logi w konsoli powinny pokazać co się dzieje!**

---

## 🎨 Customizacja zaawansowana

### Dodanie nowego motywu

```javascript
const themes = {
    dark: {
        '--primary': '#6366f1',
        '--bg-dark': '#0f0f1e',
        // ...
    },
    light: {
        '--primary': '#6366f1',
        '--bg-dark': '#ffffff',
        // ...
    }
};

function applyTheme(themeName) {
    const theme = themes[themeName];
    Object.entries(theme).forEach(([key, value]) => {
        document.documentElement.style.setProperty(key, value);
    });
}
```

### Dodanie własnego fontu

```css
@import url('https://fonts.googleapis.com/css2?family=Poppins:wght@400;600;700&display=swap');

body {
    font-family: 'Poppins', -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif;
}
```

---

**Frontend jest gotowy i w pełni funkcjonalny!** 🎉

Wszystko w jednym pliku, prosty deployment, szybki start. ✨
