# ❓ FAQ - Frequently Asked Questions

Najczęściej zadawane pytania o Student Assistant.

---

## 📋 Spis treści

- [Ogólne](#ogólne)
- [Instalacja i Setup](#instalacja-i-setup)
- [Transkrypcja](#transkrypcja)
- [Fiszki](#fiszki)
- [GitHub Sync](#github-sync)
- [Prywatność](#prywatność)
- [Wydajność](#wydajność)
- [Troubleshooting](#troubleshooting)

---

## 🌟 Ogólne

### Czym jest Student Assistant?

Student Assistant to darmowe, open-source narzędzie dla studentów do:
- 🎤 Transkrypcji wykładów (AI Whisper)
- 🎴 Nauki fiszek (algorytm SRS)
- 📝 Zarządzania notatkami
- 🔄 Synchronizacji z GitHub

### Czy jest darmowy?

✅ TAK! 100% darmowy i open-source (MIT License).

### Czy działa offline?

✅ TAK! Cała aplikacja działa offline w przeglądarce. Backend jest opcjonalny (tylko przyspiesza transkrypcję).

### Jakie przeglądarki są wspierane?

✅ **Polecane**:
- Chrome 90+
- Firefox 88+
- Edge 90+

⚠️ **Ograniczone**:
- Safari 15+ (bez SharedArrayBuffer, wolniejsze modele)

### Czy mogę używać na mobile?

✅ TAK! Działa w przeglądarkach mobile:
- iOS Safari
- Chrome Mobile
- Firefox Mobile

W przyszłości planujemy natywne aplikacje (zobacz [ROADMAP.md](./ROADMAP.md)).

---

## 🛠️ Instalacja i Setup

### Jak zainstalować?

```bash
git clone https://github.com/himusuwu/student_asystent.git
cd student_asystent
npm start
```

Zobacz [README.md](./README.md) dla szczegółów.

### Czy muszę instalować Node.js?

**Nie**, jeśli chcesz używać tylko frontendu w przeglądarce.

**Tak**, jeśli chcesz szybszą transkrypcję przez backend.

### Co to jest backend i czy go potrzebuję?

**Backend** = Node.js server który przyspiesza transkrypcję.

- **Bez backendu**: Transkrypcja w przeglądarce (~5-15 min dla 10 min audio)
- **Z backendem**: Transkrypcja na serwerze (~1-4 min dla 10 min audio)

Backend jest **opcjonalny** ale zalecany.

### Jak uruchomić tylko frontend bez backendu?

```bash
npm run frontend
# Lub po prostu otwórz student_assistant_app.html w przeglądarce
```

### Gdzie są zapisywane dane?

Wszystko jest zapisywane **lokalnie w przeglądarce** (IndexedDB):
- Notatki
- Fiszki
- Audio nagrania
- Ustawienia

Nic nie trafia do internetu (z wyjątkiem GitHub sync jeśli włączysz).

---

## 🎤 Transkrypcja

### Jakie języki są wspierane?

✅ **Oficjalnie przetestowane**:
- Polski 🇵🇱
- Angielski 🇺🇸 🇬🇧

✅ **Wspierane przez Whisper** (ponad 50 języków):
- Niemiecki, Francuski, Hiszpański, Włoski, Chiński, Japoński, i więcej

### Który model Whisper wybrać?

| Model | Rozmiar | Szybkość | Jakość | Kiedy używać |
|-------|---------|----------|--------|--------------|
| **Tiny** | 75MB | ⚡⚡⚡ Bardzo szybki | ⭐⭐⭐ Dobra | Szybkie notatki, wstępne transkrypcje |
| **Base** | 142MB | ⚡⚡ Szybki | ⭐⭐⭐⭐ Bardzo dobra | Codzienne użycie, balans jakości/szybkości |
| **Small** | 466MB | ⚡ Wolniejszy | ⭐⭐⭐⭐⭐ Świetna | Ważne wykłady, oficjalne notatki |

**Rekomendacja**: Zacznij od **Base**, przełącz na **Small** dla ważnych wykładów.

### Jak długo trwa transkrypcja?

**Backend** (Node.js):
- Tiny: ~1 min na 10 min audio
- Base: ~2 min na 10 min audio
- Small: ~4 min na 10 min audio

**Przeglądarka** (wolniejsze):
- Tiny: ~5 min na 10 min audio
- Base: ~8 min na 10 min audio
- Small: ~15 min na 10 min audio

*Czasy dla Apple M4 Pro, mogą się różnić w zależności od sprzętu*

### Dlaczego transkrypcja jest wolna?

Sprawdź:
1. **Czy backend działa?** `curl http://localhost:3001/health`
2. **Czy używasz małego modelu?** (Tiny najszybszy)
3. **Czy komputer jest zajęty?** (Zamknij inne aplikacje)
4. **Safari?** (Wolniejszy niż Chrome, użyj Chrome)

Zobacz [TROUBLESHOOTING.md](./TROUBLESHOOTING.md).

### Czy mogę transkrybować video?

Nie bezpośrednio, ale:
1. Wyciągnij audio z video (np. ffmpeg)
2. Załaduj audio do Student Assistant
3. Transkrybuj

```bash
# Ekstrakt audio z video
ffmpeg -i video.mp4 -vn -acodec libmp3lame audio.mp3
```

### Jakość transkrypcji jest słaba, co robić?

1. **Użyj lepszego modelu** (Small zamiast Tiny)
2. **Upewnij się że audio jest dobre** (mało szumów)
3. **Ustaw poprawny język** (nie używaj auto-detect jeśli znasz język)
4. **Edytuj transkrypcję ręcznie** (zawsze sprawdzaj!)

---

## 🎴 Fiszki

### Jak działa algorytm SRS?

Używamy **SM-2 (SuperMemo 2)** - sprawdzony algorytm Spaced Repetition:

1. Nowa fiszka → pokażą się za 1 dzień
2. Jak ocenisz (1-5), odstęp się zmienia:
   - 5 (perfekt) → odstęp x 2.5
   - 4 (dobrze) → odstęp x 2.0
   - 3 (ok) → odstęp x 1.3
   - 1-2 (źle) → reset do 1 dnia

### Ile fiszek dziennie powinienem robić?

**Zalecane**: 20-30 fiszek dziennie (default: 20)

Możesz zmienić w Settings → Daily Goal.

### Czy mogę importować fiszki z Anki?

⚠️ Jeszcze nie, ale planowane w v2.3.0 (zobacz [ROADMAP.md](./ROADMAP.md)).

### Jak eksportować fiszki do Anki?

⚠️ Jeszcze nie, ale planowane w v2.3.0.

---

## 🔄 GitHub Sync

### Czy muszę używać GitHub sync?

❌ NIE! To jest całkowicie opcjonalne.

### Dlaczego używać GitHub sync?

- ✅ Backup notatek w chmurze
- ✅ Dostęp z wielu urządzeń
- ✅ Historia zmian (version control)
- ✅ Współpraca (jeśli udostępnisz repo)

### Jak skonfigurować GitHub sync?

1. Stwórz **Personal Access Token** na GitHubie:
   - Idź do https://github.com/settings/tokens
   - Kliknij "Generate new token (classic)"
   - Zaznacz `repo` scope
   - Skopiuj token

2. W Student Assistant → Settings:
   - Wklej token
   - Wpisz `username/repo-name`
   - Kliknij Save

3. Gotowe! Notatki będą sync'owane automatycznie.

### Co jest synchronizowane?

✅ **Synchronizowane**:
- Notatki (tekst)
- Transkrypcje (tekst)
- Fiszki

❌ **NIE synchronizowane**:
- Audio files (zbyt duże, prywatność)
- Ustawienia
- Historia czatu

### Czy moje audio trafia na GitHub?

❌ NIE! Audio nigdy nie jest uploadowane. Tylko tekst (notatki i transkrypcje).

### Czy muszę mieć publiczne repo?

❌ NIE! Polecamy **prywatne repo** dla prywatności.

---

## 🔒 Prywatność

### Czy moje dane są bezpieczne?

✅ TAK!

- Wszystko jest przechowywane **lokalnie w przeglądarce**
- Audio nigdy nie trafia do internetu (z wyjątkiem GitHub text sync)
- Transkrypcja jest **lokalna** (przeglądarka lub localhost backend)
- Brak trackerów, analytics, reklam

### Czy używacie moich danych?

❌ NIE! Student Assistant nie zbiera żadnych danych.

Jedyne co możemy zobaczyć to GitHub issues/pull requests które zgłaszasz.

### Co się stanie jeśli stracę komputer?

Jeśli używasz **GitHub sync**: Twoje notatki są bezpieczne w chmurze.

Jeśli **nie** używasz sync: Dane są tylko lokalnie. Zalecamy:
- Regularny backup (Export notes)
- Lub włącz GitHub sync

### Czy mogę używać na uniwersyteckim WiFi?

✅ TAK! Aplikacja działa offline, więc nawet jeśli WiFi blokuje coś, nie ma problemu.

Backend działa na `localhost`, więc nie ma ruchu sieciowego.

---

## ⚡ Wydajność

### Aplikacja jest wolna, co robić?

1. **Sprawdź rozmiar bazy danych**:
   - F12 → Application → Storage → IndexedDB
   - Jeśli >500MB, rozważ usunięcie starych audio files

2. **Zamknij inne taby**:
   - AI modele zajmują dużo pamięci

3. **Restart przeglądarki**:
   - Czasami pomaga

4. **Użyj Chrome**:
   - Najszybsza przeglądarka dla WebAssembly

### Ile pamięci zajmuje aplikacja?

**Typowo**:
- Aplikacja: ~10-20MB
- IndexedDB: ~50-500MB (zależy od audio files)
- AI model w pamięci: 75-466MB (kiedy używany)
- **Total**: ~150-1000MB

### Czy mogę używać na słabym komputerze?

✅ TAK, ale:
- Użyj **Tiny** model (najmniej RAM)
- Użyj **backend** zamiast browser transcription
- Usuń stare audio files

### Bateria się szybko rozładowuje, dlaczego?

AI transkrypcja jest **bardzo intensywna** dla CPU:
- Transkrypcja 10 min audio = ~5-10% baterii
- Zalecamy być podłączonym do prądu podczas transkrypcji

---

## 🐛 Troubleshooting

### Backend nie startuje

```bash
# Sprawdź czy port 3001 jest wolny
lsof -i :3001

# Jeśli zajęty, zabij proces
kill -9 <PID>

# Restart backend
npm run server
```

### IndexedDB quota exceeded

```javascript
// Usuń stare audio files
1. Dashboard → Settings
2. "Clear old audio files"
3. Lub ręcznie: F12 → Application → IndexedDB → Delete
```

### Modele się nie ładują

1. Sprawdź internet (pierwsze załadowanie)
2. Sprawdź console (F12) dla błędów
3. Wyczyść cache przeglądarki
4. Pobierz modele ręcznie:

```bash
npm run download-models
```

### Audio się nie nagrywa

1. Sprawdź permissions (Allow microphone)
2. Sprawdź czy mikrofon działa (inne aplikacje)
3. Restart przeglądarki
4. Sprawdź format audio (niektóre przeglądarki mają ograniczenia)

### Więcej problemów?

Zobacz [TROUBLESHOOTING.md](./TROUBLESHOOTING.md) lub otwórz [issue na GitHubie](https://github.com/himusuwu/student_asystent/issues).

---

## 🤝 Contributing

### Jak mogę pomóc?

Zobacz [CONTRIBUTING.md](./CONTRIBUTING.md)!

Możesz:
- 🐛 Zgłaszać bugi
- 💡 Proponować features
- 📝 Poprawiać dokumentację
- 💻 Wnosić kod
- ⭐ Dać gwiazdkę na GitHub!

### Gdzie mogę zadać pytanie?

1. Sprawdź ten FAQ
2. Sprawdź [TROUBLESHOOTING.md](./TROUBLESHOOTING.md)
3. Otwórz [Discussion na GitHubie](https://github.com/himusuwu/student_asystent/discussions)
4. Otwórz [Issue](https://github.com/himusuwu/student_asystent/issues)

---

## 📚 Dodatkowe zasoby

- 📖 [README.md](./README.md) - Główna dokumentacja
- 🏗️ [ARCHITECTURE.md](./ARCHITECTURE.md) - Architektura techniczna
- 🚀 [DEPLOYMENT.md](./DEPLOYMENT.md) - Przewodnik deployment
- 🗺️ [ROADMAP.md](./ROADMAP.md) - Przyszłe plany

---

**Nie znalazłeś odpowiedzi?** Otwórz issue lub discussion na GitHubie! 🚀
