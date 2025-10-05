# 🚀 Jak uruchomić Student Asystent z backendem

## Szybki start (2 terminale)

### Terminal 1: Frontend (aplikacja webowa)
```bash
# W głównym folderze projektu
npm install
npm run dev
```

Otwórz http://localhost:5173

### Terminal 2: Backend (serwer transkrypcji)
```bash
# W głównym folderze projektu
cd server
npm install
npm start
```

Backend uruchomi się na http://localhost:3001

## 🎯 Konfiguracja w aplikacji

1. Otwórz aplikację w przeglądarce
2. Przejdź do **Ustawienia**
3. W sekcji **"🚀 Tryb transkrypcji"** wybierz:
   - **Auto** (zalecane) - spróbuje backend, jeśli nie działa użyje przeglądarki
   - **Tylko backend** - wymaga działającego serwera
   - **Tylko przeglądarka** - bez backendu (wolniejsze, blokuje UI)
4. Kliknij **Test** aby sprawdzić połączenie z backendem
5. Status powinien pokazać: ✅ Dostępny
6. Zapisz ustawienia

## 📝 Test transkrypcji

1. Przejdź do **Nowa notatka**
2. Wybierz przedmiot
3. Dodaj plik audio (MP3, WAV)
4. Kliknij **Przetwórz i zapisz**
5. Obserwuj postęp - strona powinna działać płynnie!

## ⚙️ Dodatkowe opcje

### Zmiana portu backendu

W `server/server.js` zmień:
```javascript
const PORT = 3001  // Zmień na inny port
```

Następnie w aplikacji, w Ustawieniach zaktualizuj URL backendu.

### Wybór modelu Whisper

W Ustawieniach wybierz:
- **tiny** - najszybszy, najmniej dokładny (~200MB)
- **base** - balans prędkości i jakości (~500MB) [domyślny]
- **small** - bardziej dokładny, wolniejszy (~1GB)

### Modele lokalne

Aby przyspieszyć pierwsze uruchomienie:
1. Pobierz modele do `public/models/Xenova/whisper-base/`
2. W Ustawieniach wybierz "Źródło modeli: Lokalne"

## 🐛 Troubleshooting

### Backend pokazuje "Niedostępny"
- Sprawdź czy serwer jest uruchomiony (`cd server && npm start`)
- Sprawdź w konsoli serwera czy nie ma błędów
- Sprawdź czy port 3001 nie jest zajęty

### Transkrypcja trwa długo
- Zmień model na "tiny" dla szybszych wyników
- Sprawdź czy backend jest uruchomiony (znacznie szybszy niż przeglądarka)

### Błąd "Nieobsługiwany format audio"
- Obecnie backend wspiera tylko WAV
- Możesz skonwertować MP3 do WAV używając ffmpeg:
  ```bash
  ffmpeg -i audio.mp3 audio.wav
  ```

## 🎉 Gotowe!

Teraz możesz korzystać z aplikacji z szybką transkrypcją, która nie blokuje interfejsu!
