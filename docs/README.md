# 📚 Student Assistant v2.0

> Inteligentn## 📚 Dokumentacja

> 📑 **[DOCUMENTATION_INDEX.md](./DOCUMENTATION_INDEX.md)** - Kompletny indeks całej dokumentacji

- 📖 [**README.md**](./README.md) - Ten dokument
- ❓ [**FAQ.md**](./FAQ.md) - Często zadawane pytania
- 📖 [**ARCHITECTURE.md**](./ARCHITECTURE.md) - Szczegółowa architektura aplikacji
- 🗺️ [**ROADMAP.md**](./ROADMAP.md) - Plan rozwoju i przyszłe funkcje
- 🎨 [**FRONTEND.md**](./FRONTEND.md) - Frontend architecture i debuggingystent studenta z transkrypcją AI, fiszkami SRS i zarządzaniem notatkami

**Nowa wersja** z pięknym, nowoczesnym interfejsem i pełną funkcjonalnością offline!

---

## ✨ Funkcje

### 🎤 Transkrypcja AI (Whisper)
- **Transkrypcja wykładów** - Nagrywaj wykłady i automatycznie konwertuj na tekst
- **3 modele do wyboru**: Tiny (szybki), Base (optymalny), Small (najdokładniejszy)
- **Wsparcie języków**: Polski, Angielski, Auto-detect
- **Backend lokalny** - Szybsza transkrypcja z użyciem Node.js
- **Tryb offline** - Wszystko działa w przeglądarce bez internetu

### 🎴 Fiszki z SRS (Spaced Repetition System)
- **Algorytm SM-2** - Inteligentne powtórki dopasowane do Twojej pamięci
- **Auto-generowanie fiszek** - AI tworzy fiszki z Twoich notatek
- **Statystyki nauki** - Śledź postępy i streaki
- **Dzienny limit** - Konfigurowalny cel nauki

### 📝 Notatki i wykłady
- **Zarządzanie przedmiotami** - Organizuj wykłady według przedmiotów
- **Wieloformatowe notatki** - Transkrypcje, czysty tekst, podsumowania
- **Markdown support** - Bogate formatowanie notatek
- **Eksport** - Pobieraj notatki jako .md lub PDF

### 🔄 Synchronizacja GitHub
- **Prywatne repo** - Synchronizuj notatki do Twojego prywatnego repozytorium
- **Tylko tekst** - Audio nigdy nie trafia do chmury (prywatność!)
- **Auto-sync** - Automatyczna synchronizacja po zapisie

### 🎨 Piękny UI/UX
- **Gradient design** - Nowoczesny, premium wygląd
- **Dark mode** - Przyjazny dla oczu tryb ciemny
- **Animacje** - Płynne przejścia i efekty
- **Responsywny** - Działa na desktop, tablet i mobile

---

## � Dokumentacja

- 📖 [**ARCHITECTURE.md**](./ARCHITECTURE.md) - Szczegółowa architektura aplikacji
- 🎨 [**FRONTEND.md**](./FRONTEND.md) - Frontend architecture i debugging
- 🔧 [**BACKEND_SETUP.md**](./BACKEND_SETUP.md) - Konfiguracja backendu
- 🚀 [**DEPLOYMENT.md**](./DEPLOYMENT.md) - Przewodnik wdrożenia (GitHub Pages, Railway, Docker, VPS)
- 🐛 [**TROUBLESHOOTING.md**](./TROUBLESHOOTING.md) - Rozwiązywanie problemów
- 📋 [**MIGRATION_NOTES.md**](./MIGRATION_NOTES.md) - Migracja z v1 do v2
- 📝 [**CHANGELOG.md**](./CHANGELOG.md) - Historia zmian
- 🤝 [**CONTRIBUTING.md**](./CONTRIBUTING.md) - Jak wnieść wkład
- 🔒 [**SECURITY.md**](./SECURITY.md) - Polityka bezpieczeństwa
- 📜 [**CODE_OF_CONDUCT.md**](./CODE_OF_CONDUCT.md) - Kodeks postępowania

---

## �🚀 Szybki start

### Opcja A: Automatyczny start (najłatwiejsze)

Uruchom **backend + frontend** jedną komendą:

```bash
npm start
```

> 📦 **Deployment:** Zobacz [DEPLOYMENT.md](./DEPLOYMENT.md) dla pełnego przewodnika wdrożenia (GitHub Pages, Railway, Docker, VPS, itp.)

To uruchomi:
- 🔧 Backend na **http://localhost:3001**
- 🌐 Frontend na **http://localhost:8000**

**Otwórz aplikację:** [http://localhost:8000/student_assistant_app.html](http://localhost:8000/student_assistant_app.html)

### Opcja B: Ręczne uruchomienie

#### 1. **Instalacja backendu** (pierwszy raz)

```bash
npm run install:server
```

#### 2. **Uruchom backend** (opcjonalnie, ale zalecane)

```bash
npm run server
# Backend: http://localhost:3001
```

#### 3. **Uruchom frontend**

```bash
npm run frontend
# Frontend: http://localhost:8000
```

**Otwórz:** [http://localhost:8000/student_assistant_app.html](http://localhost:8000/student_assistant_app.html)

### Opcja C: Tylko przeglądarka (bez instalacji)

Możesz otworzyć `student_assistant_app.html` bezpośrednio w przeglądarce:

```bash
open student_assistant_app.html
```

⚠️ **Ograniczenia**: Transkrypcja będzie wolniejsza (tylko w przeglądarce, bez backendu)

---

### 🛑 Zatrzymywanie serwerów

```bash
npm run stop
```

---

## 🎯 Pierwsza konfiguracja

### 1. **Instalacja backendu** (zalecane)

Backend przyspiesza transkrypcję i nie blokuje przeglądarki:

```bash
# Zainstaluj zależności serwera
npm run install:server

# Uruchom backend
npm start
```

Backend uruchomi się na `http://localhost:3001`

### 2. **Otwórz aplikację**

Otwórz [http://localhost:8000/student_assistant_app.html](http://localhost:8000/student_assistant_app.html) w przeglądarce

### 3. **Dodaj pierwszy przedmiot**

1. Otwórz konsolę przeglądarki (F12)
2. Wykonaj:
```javascript
await StudentAssistant.createSubject('Matematyka', '#6366f1')
```

### 4. **Utwórz wykład z transkrypcją**

1. Przejdź do zakładki **"✨ Nowy wykład"**
2. Wybierz przedmiot
3. Przeciągnij plik audio (MP3, WAV, M4A)
4. Kliknij **"🚀 Transkrybuj i utwórz wykład"**
5. Poczekaj na transkrypcję (status pokazuje postęp)

---

## ⚙️ Konfiguracja

### Ustawienia transkrypcji

Przejdź do **⚙️ Ustawienia** → **🤖 Transkrypcja i AI**:

- **Tryb transkrypcji**:
  - `Automatyczny` - próbuje backend, potem przeglądarka
  - `Tylko backend` - wymaga działającego serwera
  - `Tylko przeglądarka` - wolniejsze, ale nie wymaga instalacji

- **Model Whisper**:
  - `Tiny` (~75MB) - najszybszy, dobry dla prostych nagrań
  - `Base` (~142MB) - **zalecany**, optymalny balans
  - `Small` (~466MB) - najdokładniejszy, dla trudnych nagrań

- **Źródło modeli**:
  - `Remote` - pobiera z Hugging Face (wymaga internetu przy pierwszym użyciu)
  - `Local` - używa lokalnych modeli z folderu `/models`

### Synchronizacja GitHub

1. Utwórz **prywatne** repozytorium na GitHubie
2. Wygeneruj **Personal Access Token**:
   - GitHub → Settings → Developer settings → Personal access tokens
   - Zaznacz scope: `repo` (full control)
3. W ustawieniach aplikacji wpisz:
   - Repozytorium: `username/repo-name`
   - Token: `ghp_xxxxxxxxxxxxx`
   - Gałąź: `main`

---

## 📂 Struktura projektu

```
student_asystent/
├── student_assistant_app.html   # ← GŁÓWNA APLIKACJA (HTML + JS)
├── package.json                  # Skrypty npm
├── README.md                     # Ta dokumentacja
│
├── server/                       # Backend Node.js
│   ├── server.js                 # Express + Whisper API
│   ├── package.json
│   └── .temp/                    # Cache tymczasowy (audio)
│
├── models/                       # Modele lokalne (opcjonalne)
│   └── whisper-cpp/
│       ├── ggml-tiny.bin
│       ├── ggml-base.bin
│       └── ggml-small.bin
│
├── public/
│   └── models/                   # Modele Whisper dla przeglądarki
│       └── Xenova/
│           ├── whisper-tiny/
│           ├── whisper-base/
│           └── whisper-small/
│
├── stare/                        # STARA WERSJA (React app - nie używane)
│   ├── src/                      # Stary frontend React
│   ├── index.html                # Stara strona
│   └── ...                       # Stare pliki UI
│
└── docs/                         # Dokumentacja techniczna
    ├── BACKEND_SETUP.md
    ├── QUICK_START.md
    └── TROUBLESHOOTING.md
```

---

## 🔧 Dostępne komendy

```bash
# Backend + Frontend
npm start                 # Uruchom backend + frontend (port 3001 + 8000)
npm run stop              # Zatrzymaj wszystkie serwery

# Backend osobno
npm run server            # Uruchom backend (port 3001)
npm run server:dev        # Uruchom z auto-reload

# Frontend osobno
npm run frontend          # Uruchom frontend (port 8000)

# Instalacja
npm run install:server    # Zainstaluj zależności backendu

# Narzędzia
npm run check-backend     # Sprawdź czy backend działa
npm run download-models   # Pobierz modele Whisper (opcjonalne)
```

---

## 💾 Baza danych (IndexedDB)

Aplikacja używa **IndexedDB** do przechowywania danych lokalnie:

### Struktura danych:

- **subjects** - Przedmioty (id, name, color)
- **lectures** - Wykłady (id, subjectId, title, createdAt)
- **lectureTabs** - Zakładki wykładu (transcript, cleaned, notes)
- **flashcards** - Fiszki z algorytmem SRS (question, answer, easiness, interval)
- **quizQuestions** - Pytania testowe
- **chatMessages** - Historia czatu z notatkami

### Debug w konsoli:

```javascript
// Dostęp do API
StudentAssistant.listSubjects()
StudentAssistant.listLectures()
StudentAssistant.listAllFlashcards()
StudentAssistant.currentState
StudentAssistant.getSettings()

// Tworzenie danych
await StudentAssistant.createSubject('Fizyka', '#10b981')
await StudentAssistant.createLecture('sub_xxx', 'Mechanika kwantowa')
```

---

## 🎯 Przykładowy workflow

### 1. **Przed wykładem**
- Utwórz przedmiot w aplikacji
- Przygotuj nagranie audio (dyktafon, telefon)

### 2. **Po wykładzie**
- Wgraj nagranie do zakładki "Nowy wykład"
- Poczekaj na transkrypcję (~1 min za każde 10 min nagrania z backendem)
- Aplikacja automatycznie utworzy wykład

### 3. **Nauka**
- Generuj fiszki z transkrypcji
- Ucz się w zakładce "Fiszki" z algorytmem SRS
- Sprawdź statystyki w Dashboard

### 4. **Przed egzaminem**
- Wygeneruj pytania testowe z notatek
- Powtarzaj zaległe fiszki
- Eksportuj notatki do PDF

---

## 🔒 Prywatność

### ✅ Bezpieczne:
- **Audio przetwarzane lokalnie** - Whisper działa w przeglądarce lub na Twoim komputerze
- **Automatyczne usuwanie** - Audio jest usuwane zaraz po transkrypcji
- **IndexedDB** - Wszystkie dane w przeglądarce, nie w chmurze
- **Opcjonalny GitHub** - Tylko TY decydujesz co synchronizować

### ⚠️ Do chmury trafiają (tylko jeśli włączysz):
- Notatki tekstowe (MD/JSON) → Twoje prywatne repo GitHub
- **NIE trafiają**: Audio, PDF, PPTX, dane osobowe

---

## 🐛 Troubleshooting

### Backend nie działa?
```bash
# Sprawdź status
npm run check-backend

# Zobacz logi
cd server && npm start

# Sprawdź port 3001
lsof -i :3001
```

### Transkrypcja trwa długo?
- Użyj mniejszego modelu (Tiny zamiast Base)
- Uruchom backend: `npm start`
- Zmniejsz jakość nagrania przed wgraniem

### Modele nie ładują się?
- Sprawdź połączenie z internetem (przy pierwszym użyciu)
- Pobierz modele lokalnie: `npm run download-models`
- Zmień źródło w Ustawieniach → "Lokalne modele"

### Więcej pomocy?
Zobacz dokumentację:
- 🐛 [TROUBLESHOOTING.md](./TROUBLESHOOTING.md) - Rozwiązywanie problemów
- 🚀 [DEPLOYMENT.md](./DEPLOYMENT.md) - Przewodnik wdrożenia
- 🎨 [FRONTEND.md](./FRONTEND.md) - Architektura frontendu
- 🔧 [BACKEND_SETUP.md](./BACKEND_SETUP.md) - Konfiguracja backendu
- 📋 [MIGRATION_NOTES.md](./MIGRATION_NOTES.md) - Migracja z v1 do v2
- 📝 [CHANGELOG.md](./CHANGELOG.md) - Historia zmian

---

## 📊 Wydajność

### Czasy transkrypcji (nagranie 10 min):

| Model | Backend (M4 Pro) | Przeglądarka | Rozmiar |
|-------|------------------|--------------|---------|
| Tiny  | ~1 min           | ~5 min       | 75 MB   |
| Base  | ~2 min           | ~8 min       | 142 MB  |
| Small | ~4 min           | ~15 min      | 466 MB  |

*Czasy orientacyjne, zależą od sprzętu*

---

## 🤝 Contributing

Chcesz pomóc w rozwoju? Super! 🎉

1. Przeczytaj [CONTRIBUTING.md](./CONTRIBUTING.md)
2. Fork repo
3. Stwórz branch (`git checkout -b feature/amazing-feature`)
4. Commit changes (`git commit -m 'feat: add amazing feature'`)
5. Push branch (`git push origin feature/amazing-feature`)
6. Otwórz Pull Request

Zgłaszaj bugi i sugestie przez [GitHub Issues](https://github.com/himusuwu/student_asystent/issues)!

---

## 📄 Licencja

[MIT License](./LICENSE) - używaj jak chcesz! 🎉

---

## 🎓 Wsparcie

Stworzone dla studentów, przez studenta 💙

**Links:**
- 🌐 [GitHub Repository](https://github.com/himusuwu/student_asystent)
- 🐛 [Report Issues](https://github.com/himusuwu/student_asystent/issues)
- 📖 [Documentation](./FRONTEND.md)
- 💬 [Discussions](https://github.com/himusuwu/student_asystent/discussions)

Powodzenia na egzaminach! 📚✨
