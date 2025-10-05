# Student Asystent - Backend Server

Lokalny serwer Node.js do transkrypcji audio za pomocą Whisper AI.

## 🚀 Zalety backendu

- ✅ **Nie blokuje przeglądarki** - strona działa płynnie podczas transkrypcji
- ✅ **Szybsza transkrypcja** - lepsze wykorzystanie zasobów CPU
- ✅ **Pełna prywatność** - wszystko działa lokalnie na twoim komputerze
- ✅ **Możliwość użycia GPU** (opcjonalnie z CUDA)

## 📦 Instalacja

```bash
cd server
npm install
```

## ▶️ Uruchomienie

```bash
npm start
```

Serwer uruchomi się na `http://localhost:3001`

### Tryb deweloperski (auto-restart)

```bash
npm run dev
```

## 🔧 Konfiguracja

Server domyślnie:
- Port: **3001**
- Modele: czyta z `../public/models` (możesz zmienić w `server.js`)
- CORS: włączony dla localhost

## 📡 Endpointy

### `GET /health`
Sprawdza status serwera

**Response:**
```json
{
  "status": "ok",
  "service": "student-asystent-backend",
  "version": "1.0.0",
  "modelsPath": "/path/to/models"
}
```

### `POST /transcribe`
Transkrypcja audio (zwraca pełny wynik)

**Request:**
- Method: POST
- Content-Type: multipart/form-data
- Fields:
  - `audio`: plik audio (MP3, WAV, etc.)
  - `language`: 'pl' | 'en' | 'auto' (opcjonalnie)
  - `model`: 'tiny' | 'base' | 'small' (opcjonalnie)

**Response:**
```json
{
  "success": true,
  "text": "Transkrypcja tekstu...",
  "duration": 2.5,
  "audioLength": "15.2",
  "model": "Xenova/whisper-base"
}
```

### `POST /transcribe-stream`
Transkrypcja z postępem (Server-Sent Events)

**Request:** (jak `/transcribe`)

**Response:** SSE stream
```
data: {"type":"progress","progress":10,"phase":"ładowanie modelu"}
data: {"type":"progress","progress":40,"phase":"transkrypcja"}
data: {"type":"complete","text":"Transkrypcja...","model":"Xenova/whisper-base"}
```

## 🔍 Troubleshooting

### Backend nie uruchamia się
- Sprawdź czy port 3001 nie jest zajęty
- Upewnij się że zainstalowałeś dependencies (`npm install`)

### "Nieobsługiwany format audio"
- ⚠️ **WAŻNE: Zainstaluj FFmpeg!**
  
  **macOS:**
  ```bash
  brew install ffmpeg
  ```
  
  **Ubuntu/Debian:**
  ```bash
  sudo apt-get install ffmpeg
  ```
  
  **Windows:**
  Pobierz z https://ffmpeg.org/download.html i dodaj do PATH

- Sprawdź czy ffmpeg działa: `which ffmpeg` (macOS/Linux) lub `where ffmpeg` (Windows)
- Wspierane formaty z FFmpeg: MP3, M4A, WAV, OGG, FLAC i inne

### Brak modeli
- Modele powinny być w `../public/models/Xenova/whisper-*`
- Możesz zmienić ścieżkę w `server.js` w zmiennej `env.localModelPath`

## 🛠️ Rozwój

### Dodanie wsparcia dla GPU (CUDA)

1. Zainstaluj ONNX Runtime z CUDA:
```bash
npm install onnxruntime-node-gpu
```

2. Zmień `device: 'cpu'` na `device: 'cuda'` w `server.js`

### Dodanie wsparcia dla więcej formatów audio

Zainstaluj ffmpeg i dodaj decoder:
```bash
npm install fluent-ffmpeg
```

## 📝 Licencja

Część projektu Student Asystent - patrz główny README.
