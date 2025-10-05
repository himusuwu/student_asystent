# 📚 Student Assistant v2.1

> Inteligentny asystent studenta z transkrypcją AI, fiszkami SRS i zarządzaniem notatkami

**Nowa wersja 2.1** - Backend ONLY! Szybka transkrypcja bez problemów! 🚀

---

## ⚠️ WYMAGANE: Backend musi być uruchomiony!

```bash
# Terminal 1: Backend (WYMAGANE!)
npm run server

# Terminal 2: Frontend
npm run dev
```

**Otwórz:** http://localhost:8000

👉 **[Jak skonfigurować backend](./docs/BACKEND_SETUP.md)** 📖

---

## ✨ Główne funkcje

- 🎤 **Transkrypcja AI** - Whisper models (tiny/base/small)
- 🤖 **Auto-tytuł wykładu** - AI automatycznie generuje tytuł z transkrypcji
- 🎴 **Fiszki SRS** - System powtórek z algorytmem SM-2
- 📝 **Notatki** - Markdown, rich formatting
- 📚 **Przedmioty** - Organizacja wykładów z kolorami
- 🔄 **GitHub Sync** - Backup do prywatnego repo
- 🌙 **Dark Mode** - Piękne gradienty
- ⚡ **Offline** - Działa bez internetu
- 🎯 **100% UI** - Wszystko przez przyciski, zero konsoli F12!

---

## 📁 Nowa struktura projektu

```
student_asystent/
├── index.html                    # ← Główny plik (otwórz ten)
│
├── frontend/                     # ← Cały kod frontendu
│   ├── css/
│   │   └── main.css             # Style
│   ├── js/
│   │   ├── app.js               # Main app logic
│   │   └── modules/
│   │       ├── database.js      # IndexedDB
│   │       ├── settings.js      # Ustawienia
│   │       └── transcription.js # Whisper AI
│   └── assets/
│
├── server/                       # ← Backend (opcjonalny)
│   ├── server.js
│   └── package.json
│
├── docs/                         # ← Dokumentacja
│   ├── README.md
│   ├── ARCHITECTURE.md
│   ├── FAQ.md
│   └── ...
│
├── scripts/                      # ← Skrypty pomocnicze
│   ├── start.sh
│   ├── stop.sh
│   └── ...
│
└── config/                       # ← Konfiguracja
    ├── .editorconfig
    └── .env.example
```

### 🎯 Co się zmieniło w v2.1?

**Przed (v2.0):**
```javascript
// Musiałeś wchodzić w konsolę F12 i pisać:
createSubject('Matematyka', '#6366f1')
createFlashcard('Pytanie?', 'Odpowiedź', subjectId)
// Ręcznie wpisywać tytuł wykładu
```

**Teraz (v2.1):**
- ✅ Kliknij przycisk "+ Dodaj przedmiot" → wypełnij formularz → gotowe!
- ✅ Kliknij przycisk "+ Dodaj fiszkę" → wypełnij formularz → gotowe!
- ✅ AI **automatycznie generuje tytuł wykładu** z transkrypcji!
- ✅ Piękne okna modalne zamiast brzydkich `prompt()`
- ✅ Toast notifications (zielone powiadomienia)
- ✅ **Zero konsoli F12!**

---

## 🛠️ Komendy

### Podstawowe (najczęściej używane)

```bash
# Uruchom aplikację (frontend)
npm run dev

# Zatrzymaj wszystkie serwery
npm stop
```

### Pełny stos (backend + frontend)

```bash
# Start: backend + frontend razem
npm start

# Tylko backend (szybsza transkrypcja)
npm run server
```

### Setup (pierwszy raz)

```bash
# Zainstaluj zależności backendu
npm run install:server

# Pobierz modele Whisper (opcjonalnie)
npm run download-models

# Sprawdź backend
npm run check-backend
```

---

## 💡 Jak używać?

### 1. Pierwsza konfiguracja

Po uruchomieniu `npm run dev` otwórz http://localhost:8000:

1. **Przejdź do Settings** (⚙️)
2. **Wybierz model Whisper** (tiny = szybki, base = optymalny, small = dokładny)
3. **Ustaw język** (Polski/Auto)
4. **(Opcjonalnie)** Włącz backend URL: `http://localhost:3001`

### 2. Dodaj przedmiot (przez przycisk!)

1. **Przejdź do "📚 Przedmioty"**
2. **Kliknij "+ Dodaj przedmiot"** (nie F12!)
3. **Wypełnij formularz:**
   - Nazwa: np. "Matematyka"
   - Kolor: kliknij na kolorowe kółko
4. **Kliknij "✅ Dodaj przedmiot"**

### 3. Nagraj wykład z auto-tytułem

1. **Przejdź do "✨ Nowy wykład"**
2. **Wybierz przedmiot** z listy
3. **Kliknij "🎤 Rozpocznij nagrywanie"** (lub wgraj plik)
4. **Mów...** wykład jest nagrywany
5. **Kliknij "⏹ Zatrzymaj"**
6. **AI automatycznie wygeneruje tytuł** z transkrypcji! ✨
7. **Kliknij "💾 Zapisz wykład"**

### 4. Dodaj fiszkę (przez przycisk!)

1. **Przejdź do "🎴 Fiszki"**
2. **Kliknij "+ Dodaj fiszkę"** (nie F12!)
3. **Wypełnij formularz:**
   - Pytanie (przód)
   - Odpowiedź (tył)
   - Przedmiot
4. **Kliknij "✅ Dodaj fiszkę"**

**🎉 Gotowe! Wszystko przez przyciski, zero konsoli!**

👉 **[Pełny przewodnik użytkownika](./docs/USER_GUIDE.md)**

---

## 📖 Dokumentacja

Kompletna dokumentacja w folderze `docs/`:

- 🔧 [**ARCHITECTURE.md**](./docs/ARCHITECTURE.md) - Architektura aplikacji
- 🚀 [**DEPLOYMENT.md**](./docs/DEPLOYMENT.md) - Deployment i hosting
- ❓ [**FAQ.md**](./docs/FAQ.md) - Często zadawane pytania
- 🛠️ [**TROUBLESHOOTING.md**](./docs/TROUBLESHOOTING.md) - Rozwiązywanie problemów
- 🎨 [**FRONTEND.md**](./docs/FRONTEND.md) - Frontend debugging
- 📋 [**DOCUMENTATION_INDEX.md**](./docs/DOCUMENTATION_INDEX.md) - Pełny indeks

---

## 🔧 Technologia

### Frontend
- **Vanilla JavaScript** (ES6+ modules)
- **CSS3** (gradients, animations, responsive)
- **HTML5** (semantic markup)
- **IndexedDB** (via idb library) - lokalna baza danych
- **Transformers.js** - Whisper AI w przeglądarce

### Backend (opcjonalny)
- **Node.js** + Express
- **Whisper.cpp** - szybsza transkrypcja na serwerze
- **CORS** - bezpieczna komunikacja z frontendem

### Moduły (frontend/js/modules/)
- `database.js` - IndexedDB CRUD operations (subjects, lectures, flashcards)
- `settings.js` - localStorage settings management
- `transcription.js` - Whisper AI integration (browser + backend)
- `app.js` - Main application coordinator

---

## 🔒 Prywatność

- ✅ **Wszystko lokalne** - IndexedDB przechowuje dane w przeglądarce
- ✅ **Audio nie wychodzi z komputera** - transkrypcja lokalna lub localhost
- ✅ **Brak trackerów** - zero analytics, reklam, cookies
- ✅ **GitHub sync opcjonalny** - tylko tekst, nigdy audio

---

## 🤝 Contributing

Chcesz pomóc? Świetnie!

1. Fork repo
2. Stwórz branch: `git checkout -b feature/twoja-funkcja`
3. Commit: `git commit -m "Add: opis"`
4. Push: `git push origin feature/twoja-funkcja`
5. Pull Request

Zobacz [CONTRIBUTING.md](./docs/CONTRIBUTING.md) po więcej info.

---

## 🐛 Znalazłeś bug?

1. Sprawdź [TROUBLESHOOTING.md](./docs/TROUBLESHOOTING.md)
2. Sprawdź [FAQ.md](./docs/FAQ.md)
3. Otwórz Issue na GitHubie z:
   - Opisem problemu
   - Krokami reprodukcji
   - Konsola błędów (F12 → Console)
   - System (macOS/Windows/Linux + przeglądarka)

---

## 📄 Licencja

[MIT License](./LICENSE)

---

## 🎓 Autor

Stworzone dla studentów, przez studenta 💙

**Repository**: https://github.com/himusuwu/student_asystent

---

## 🙏 Podziękowania

- [Whisper.cpp](https://github.com/ggerganov/whisper.cpp) - Fast Whisper inference
- [Transformers.js](https://github.com/xenova/transformers.js) - Whisper w przeglądarce
- [idb](https://github.com/jakearchibald/idb) - IndexedDB wrapper

---

**Powodzenia na egzaminach!** 📚✨

Masz pytania? Otwórz Issue albo zobacz dokumentację w `docs/` 🚀
