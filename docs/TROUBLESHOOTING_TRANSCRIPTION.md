# 🔧 Troubleshooting - Błąd transkrypcji

## Problem: "NetworkError when attempting to fetch resource"

### Przyczyna
Aplikacja próbuje pobrać model Whisper AI z internetu (pierwsze użycie) lub nie może połączyć się z backendem.

---

## ✅ Rozwiązania

### Rozwiązanie 1: Użyj trybu Browser (zalecane)

Transkrypcja będzie działać w przeglądarce:

1. **Otwórz aplikację**: http://localhost:8000
2. **Przejdź do ⚙️ Settings**
3. **Zmień "Tryb transkrypcji"** na: **"Tylko przeglądarka"** (Browser)
4. **Kliknij "💾 Zapisz ustawienia"**
5. **Spróbuj ponownie nagrać wykład**

### Rozwiązanie 2: Uruchom backend (szybsze)

Jeśli chcesz szybszą transkrypcję:

```bash
# W nowym terminalu:
npm run server
```

Następnie:
1. **Otwórz aplikację**: http://localhost:8000
2. **Przejdź do ⚙️ Settings**
3. **Backend URL**: `http://localhost:3001` (już ustawiony)
4. **Tryb transkrypcji**: "Automatyczny" lub "Tylko backend"
5. **Kliknij "💾 Zapisz ustawienia"**

### Rozwiązanie 3: Sprawdź połączenie z internetem

Model Whisper AI musi być pobrany z internetu przy pierwszym użyciu (~75-466MB w zależności od modelu).

**Sprawdź:**
- ✅ Masz połączenie z internetem
- ✅ Firewall nie blokuje `cdn.jsdelivr.net`
- ✅ Przeglądarce pozwolono na pobieranie dużych plików

**Porady:**
- Użyj modelu "Tiny" (najmniejszy, 75MB) w Settings
- Poczekaj 1-2 minuty przy pierwszym użyciu (pobieranie + inicjalizacja)

---

## 🔍 Diagnoza problemu

### Sprawdź co nie działa:

#### 1. Otwórz Console (F12)

```
Kliknij F12 → Console
```

**Szukaj błędów:**
- `CORS error` → Problem z backendem, użyj trybu Browser
- `Failed to fetch` → Brak internetu lub firewall
- `Model loading failed` → Model nie może się pobrać

#### 2. Sprawdź backend

```bash
npm run check-backend
```

**Jeśli backend nie działa:**
```bash
# Zainstaluj zależności
cd server
npm install

# Uruchom backend
npm start
```

#### 3. Test połączenia z CDN

Otwórz w przeglądarce:
```
https://cdn.jsdelivr.net/npm/@xenova/transformers@2.17.2
```

**Jeśli nie otwiera się** → Firewall/proxy blokuje CDN

---

## 📊 Porównanie trybów transkrypcji

| Tryb | Prędkość | Wymaga internetu | Wymaga backendu |
|------|----------|------------------|-----------------|
| **Browser** | Wolniejsza | Tak (pierwsze użycie) | ❌ Nie |
| **Backend** | Szybsza | Nie | ✅ Tak |
| **Auto** | Inteligentna | Zależy | Jeśli dostępny |

### Zalecenia:

- 🏠 **W domu z dobrym internetem**: Backend (najszybszy)
- 📱 **Mobilnie/bez backendu**: Browser (działa wszędzie)
- 🎯 **Nie wiesz co wybrać**: Auto (inteligentny wybór)

---

## 🎬 Przykład użycia (Browser mode)

### Krok po kroku:

1. **Settings → Tryb transkrypcji → "Tylko przeglądarka"**
2. **Zapisz ustawienia**
3. **Nowy wykład → Wybierz przedmiot**
4. **Kliknij 🎤 Rozpocznij nagrywanie**
5. **Mów 10-30 sekund** (test)
6. **Kliknij ⏹ Zatrzymaj**
7. **Poczekaj 1-2 minuty** (pierwsze użycie pobiera model)
8. **Progress bar** pokaże postęp
9. **Transkrypcja pojawi się automatycznie!**
10. **AI wygeneruje tytuł z transkrypcji** ✨

---

## ⚠️ Częste problemy

### Problem: "Model loading failed"
**Rozwiązanie**: 
- Sprawdź internet
- Zmień model na "Tiny" (Settings)
- Wyczyść cache przeglądarki (Ctrl+Shift+Delete)

### Problem: "Backend not available"
**Rozwiązanie**:
```bash
# Uruchom backend
npm run server

# W innym terminalu sprawdź:
npm run check-backend
```

### Problem: Transkrypcja trwa bardzo długo
**Rozwiązanie**:
- Użyj modelu "Tiny" zamiast "Base" lub "Small"
- Uruchom backend (szybszy)
- Nagraj krótsze audio (30s zamiast 30min)

### Problem: Transkrypcja jest niedokładna
**Rozwiązanie**:
- Użyj większego modelu ("Small" najdokładniejszy)
- Ustaw prawidłowy język w Settings
- Mów wyraźnie i głośno
- Usuń szumy tła

---

## 💡 Szybkie fix: Reset ustawień

Jeśli nic nie działa:

```javascript
// Otwórz Console (F12) i wklej:
localStorage.clear();
location.reload();
```

To wyczyści wszystkie ustawienia i zresetuje aplikację.

---

## 🆘 Dalej nie działa?

### Otwórz Issue na GitHub:

1. Przejdź do: https://github.com/himusuwu/student_asystent/issues
2. Kliknij "New Issue"
3. Podaj:
   - System (macOS/Windows/Linux)
   - Przeglądarka (Chrome/Firefox/Safari)
   - Błąd z Console (F12)
   - Logi z terminala

---

## 📚 Dodatkowe zasoby

- [USER_GUIDE.md](./USER_GUIDE.md) - Kompletny przewodnik
- [ARCHITECTURE.md](./ARCHITECTURE.md) - Jak działa aplikacja
- [FAQ.md](./FAQ.md) - Często zadawane pytania

---

**Powodzenia!** 🚀

Jeśli nadal masz problemy, pisz na GitHub Issues - pomożemy! 💙
