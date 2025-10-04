# ⚠️ Problemy z transkrypcją audio

## 🚨 Problem 1: "Unsupported model type: whisper"

### 🔍 Co się stało?

Dostałeś błąd:
```
Unsupported model type: whisper
```

### 💡 Przyczyna

**transformers.js** (biblioteka do uruchamiania AI w przeglądarce) wymaga modeli w formacie **ONNX** (`.onnx` pliki).

Twój model `whisper-tiny` jest w formacie **PyTorch** (`.bin`) zamiast ONNX!

### Sprawdzenie:

```bash
# Model BEZ ONNX (❌ nie działa):
ls public/models/Xenova/whisper-tiny/
# Wynik: pytorch_model.bin, tf_model.h5 (brak folderu onnx/)

# Model Z ONNX (✅ działa):
ls public/models/Xenova/whisper-base/onnx/
# Wynik: encoder_model.onnx, decoder_model.onnx, etc.
```

---

## 🚨 Problem 2: "Attempting to extract features for audio longer than 30 seconds"

### 🔍 Co się stało?

Dostajesz ostrzeżenie:
```
Attempting to extract features for audio longer than 30 seconds. 
If using a pipeline to extract transcript from a long audio clip, 
remember to specify chunk_length_s and/or stride_length_s.
```

### 💡 Przyczyna

Whisper domyślnie przetwarza audio w 30-sekundowych fragmentach. Dla długich nagrań (>30s) musisz jawnie ustawić parametry `chunk_length_s` i `stride_length_s`.

### ✅ ROZWIĄZANIE

**Backend już został zoptymalizowany!** Sprawdź plik `server/server.js`:

```javascript
const result = await transcriber(pcm, {
  chunk_length_s: 30,     // Optymalne dla M4 Pro ✅
  stride_length_s: 5,     // Overlap między chunkami ✅
  // ... inne parametry
})
```

### 📊 Oczekiwane czasy na M4 Pro

| Długość audio | Czas transkrypcji | Ratio |
|---------------|-------------------|-------|
| 1 minuta      | ~5-8 sekund       | ~8-10x |
| 10 minut      | ~50-90 sekund     | ~7-12x |
| 60 minut      | ~6-10 minut       | ~6-10x |

> **Zobacz**: `PERFORMANCE_M4.md` dla szczegółów optymalizacji

---

## ✅ ROZWIĄZANIA dla "Unsupported model"

### **Opcja 1: Używaj modelu `base`** (najszybsze)

Masz już `whisper-base` w formacie ONNX! Po prostu:

1. **Otwórz aplikację → Settings**
2. **Zmień "Model Whisper" na: `base`**
3. **Gotowe!** ✅

> **Uwaga**: Domyślnie aplikacja teraz używa `base` zamiast `tiny`. Możesz zostawić to ustawienie.

---

### **Opcja 2: Pobierz `whisper-tiny` w ONNX**

Jeśli koniecznie chcesz używać `tiny`:

#### Automatycznie (zalecane):
```bash
./download-whisper-tiny-onnx.sh
```

#### Manualnie:
```bash
cd public/models/Xenova
rm -rf whisper-tiny  # Usuń starą wersję

# Klonuj z sparse checkout (tylko ONNX)
git clone --depth 1 --filter=blob:none --sparse https://huggingface.co/Xenova/whisper-tiny
cd whisper-tiny
git sparse-checkout set onnx
git lfs pull
```

---

### **Opcja 3: Używaj backendu** (najlepsze dla dużych nagrań!)

Backend **nie potrzebuje ONNX** - działa z dowolnym formatem modelu:

```bash
# Terminal 1: Uruchom backend
cd server
npm start

# Terminal 2: Uruchom aplikację
npm run dev
```

W aplikacji: **Settings → Transkrypcja: Auto (backend first)**

Backend automatycznie:
- ✅ Pobiera model w poprawnym formacie
- ✅ Jest 5-10x szybszy od przeglądarki
- ✅ Nie blokuje UI

---

## 📊 Porównanie opcji

| Opcja | Szybkość | Złożoność | Dla dużych nagrań (90min) |
|-------|----------|-----------|---------------------------|
| **Base w przeglądarce** | 🐌 Średnia | ✅ Bardzo prosta | ❌ 90-120 min |
| **Tiny w przeglądarce** | 🐌 Szybsza | 🔧 Wymaga pobrania ONNX | ❌ 60-90 min |
| **Backend (zalecane!)** | 🚀 Najszybsza | ✅ Prosta | ✅ 9-18 min |

---

## 🎯 Zalecenie

Dla twoich **90-minutowych nagrań (600MB)**:

### ⚡ **Użyj backendu!**

1. `cd server && npm start`
2. Aplikacja automatycznie wykryje backend
3. Transkrypcja: ~10-20 minut zamiast >60 minut!

Przeglądarkowe modele są OK dla **krótkich nagrań (<10 min)**, ale dla długich wykładów backend jest **niezbędny**.

---

## 🐛 Dalsze problemy?

Sprawdź logi:
- Otwórz konsolę (F12)
- Szukaj `[AI]` w logach
- Sprawdź czy widzisz: `Local model detected!` lub `Using remote`

Lub uruchom diagnostykę:
```bash
./check-backend.sh
```
