# Rozwiązywanie problemów z modelami Whisper

## ⚠️ Problem: "Unsupported model type: whisper"

**Najczęstszy problem!** Model nie jest w formacie ONNX wymaganym przez transformers.js.

### Szybkie rozwiązanie:
1. **Użyj modelu `base`** (masz go już w ONNX) - zmień w Settings
2. **LUB uruchom backend** (zalecane dla długich nagrań): `cd server && npm start`

📖 Szczegóły: [TROUBLESHOOTING_ONNX.md](./TROUBLESHOOTING_ONNX.md)

---

## Problem: "JSON.parse: unexpected character at line 1 column 1"

Ten błąd występuje gdy aplikacja próbuje załadować model Whisper, ale nie może prawidłowo pobrać plików konfiguracyjnych.

### Przyczyny:

1. **Próba pobrania z Hugging Face gdy brak połączenia**: Domyślnie aplikacja próbuje pobrać modele z internetu (`modelSource: 'remote'`)
2. **Nieprawidłowa walidacja odpowiedzi HTTP**: Zbyt restrykcyjna walidacja JSON może odrzucać prawidłowe odpowiedzi
3. **Nieznalezienie lokalnych modeli**: Modele lokalne istnieją w `public/models/` ale nie są wykrywane

### Rozwiązanie:

#### Opcja 1: Automatyczne wykrywanie (ZALECANE)
Od teraz aplikacja automatycznie wykrywa obecność lokalnych modeli w folderze `public/models/` i używa ich zamiast pobierania z internetu.

#### Opcja 2: Ręczna konfiguracja lokalnych modeli
W ustawieniach aplikacji ustaw:
- `modelSource`: `'local'`
- `localModelBase`: `'/models'`

#### Opcja 3: Wymuszenie pobierania z internetu
Jeśli chcesz pobrać modele z Hugging Face:
- `modelSource`: `'remote'`
- Upewnij się, że masz połączenie z internetem
- Opcjonalnie ustaw `hfMirror`: `'mirror'` aby użyć chińskiego mirrora

### Struktura plików lokalnych modeli:

Modele powinny być umieszczone w:
```
public/models/Xenova/whisper-base/
├── config.json
├── generation_config.json
├── preprocessor_config.json
├── tokenizer.json
├── vocab.json
├── merges.txt
└── onnx/
    ├── encoder_model.onnx
    ├── decoder_model_merged.onnx
    └── ...
```

### Logi diagnostyczne:

W konsoli przeglądarki szukaj logów z prefiksem `[AI]`:
- `[AI] Auto-detecting local models...` - sprawdzanie lokalnych modeli
- `[AI] Local model detected! Switching to local mode.` - znaleziono lokalne modele
- `[AI] Loading model ... • lokalnie` - ładowanie z lokalnych plików
- `[AI] Fetch: ...` - pokazuje wszystkie pobierane pliki

### Sprawdzenie czy lokalne modele są dostępne:

Otwórz konsolę przeglądarki i wpisz:
```javascript
fetch('/models/Xenova/whisper-base/config.json')
  .then(r => r.json())
  .then(d => console.log('Model config:', d))
  .catch(e => console.error('Błąd:', e))
```

Jeśli zobaczysz konfigurację modelu, lokalne pliki są dostępne.

### Kolejność ładowania (fallback):

1. Próba załadowania `Xenova/whisper-base` (zgodnie z ustawieniami)
2. Jeśli nie powiedzie się - timeout po 60s i fallback do `Xenova/whisper-tiny`
3. Próba WebGPU (jeśli dostępne) z timeoutem 30s
4. Fallback do WASM

## Dodatkowe problemy:

### WebGPU timeout
Jeśli widzisz "WebGPU nieosiągalne/zwłoka", to normalne - aplikacja automatycznie przełącza się na WASM.

### Wymuszenie WASM
W ustawieniach ustaw `forceWasm: true` aby pominąć WebGPU.

### Model za duży
Jeśli model `base` jest za duży lub wolno się ładuje, zmień w ustawieniach:
- `whisperModel`: `'tiny'` (szybszy, mniej dokładny)
- `whisperModel`: `'base'` (domyślny, dobry balans)
- `whisperModel`: `'small'` (większy, dokładniejszy, wolniejszy)
