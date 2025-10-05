# 🚀 Konfiguracja Backendu dla Długich Nagrań

## Dlaczego backend?

Dla nagrań **dłuższych niż 10 minut** lub **większych niż 100MB**, transkrypcja w przeglądarce jest **bardzo wolna**:

| Długość nagrania | Przeglądarka (Whisper tiny) | Backend (Whisper tiny) |
|------------------|----------------------------|------------------------|
| 10 minut         | ~7 minut                   | ~1-2 minuty           |
| 30 minut         | ~20 minut                  | ~3-6 minut            |
| **90 minut** 🎯  | **~60-90 minut**          | **~9-18 minut** ⚡    |

Backend jest **5-10x szybszy** i nie blokuje przeglądarki!

---

## 📋 Instrukcja krok po kroku

### 1️⃣ Zainstaluj FFmpeg (wymagane!)

FFmpeg jest potrzebny do dekodowania MP3/M4A i innych formatów audio.

**macOS:**
```bash
brew install ffmpeg
```

**Ubuntu/Debian:**
```bash
sudo apt-get install ffmpeg
```

**Windows:**
1. Pobierz z https://ffmpeg.org/download.html
2. Rozpakuj do `C:\ffmpeg`
3. Dodaj `C:\ffmpeg\bin` do zmiennej PATH

**Sprawdź instalację:**
```bash
ffmpeg -version
```

### 2️⃣ Zainstaluj zależności backendu

```bash
cd server
npm install
```

### 3️⃣ Uruchom backend

```bash
npm start
```

Powinieneś zobaczyć:
```
✅ Server uruchomiony na http://localhost:3001
📁 Ścieżka modeli: /path/to/public/models
```

### 4️⃣ Sprawdź ustawienia aplikacji

W aplikacji głównej (Settings):
- **Model Whisper**: `tiny` (najszybszy!) lub `base`
- **Źródło modeli**: `local` (jeśli masz modele w `/public/models`)
- **Transkrypcja**: `Auto (backend first)` ✅

---

## ✅ Gotowe!

Teraz gdy dodasz duży plik audio (>100MB), aplikacja automatycznie:
1. Wyświetli ostrzeżenie o rozmiarze pliku
2. Poda szacowany czas transkrypcji
3. Użyje backendu jeśli jest dostępny (10-20x szybciej!)
4. Automatycznie przełączy się na przeglądarkę jeśli backend nie działa

---

## 🐛 Troubleshooting

**Backend nie uruchamia się:**
- Sprawdź czy port 3001 nie jest zajęty: `lsof -i :3001` (macOS/Linux)
- Sprawdź logi: mogą wskazywać na brakujące zależności

**Błąd "Cannot decode audio" / "FFmpeg not found":**
- Upewnij się że FFmpeg jest zainstalowany: `which ffmpeg` (macOS/Linux)
- Jeśli FFmpeg jest zainstalowany ale backend go nie widzi, restart terminala

**Backend używa niewłaściwego modelu:**
- Model wybierasz w **ustawieniach aplikacji głównej**, nie backendu!
- Backend automatycznie załaduje ten sam model który wybrałeś w UI

**Nadal trwa długo:**
- Sprawdź czy backend rzeczywiście jest używany (w logach powinno być "Backend dostępny - używam serwera")
- Użyj modelu `tiny` zamiast `base` - jest 4x szybszy
- Dla naprawdę długich nagrań (2h+) rozważ dzielenie ich na krótsze fragmenty

---

## 💡 Wskazówki

- **Model tiny** jest wystarczająco dobry dla większości zastosowań (notatki z wykładów)
- **Model base** jest dokładniejszy ale 4x wolniejszy
- Backend działa **lokalnie** - twoje nagrania nie opuszczają komputera!
- Backend możesz zostawić uruchomiony w tle i używać wielokrotnie
