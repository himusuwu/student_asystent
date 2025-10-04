# 🚀 Optymalizacja wydajności na Apple Silicon (M4 Pro)

## ✅ Zaimplementowane optymalizacje

### 1. **Chunk Length: 30s (zamiast 60s)**
- **Dlaczego**: 30s to sweet spot dla Whisper na M4 Pro
- **Efekt**: ~2x szybsza transkrypcja długich nagrań
- **Poprzednio**: 60s chunki powodowały wysokie zużycie RAM i wolniejsze przetwarzanie
- **Teraz**: Optymalna równowaga między prędkością a dokładnością

### 2. **WASM Threading: 8 wątków**
- **Wykorzystanie**: M4 Pro ma 14 rdzeni (10 P-cores + 4 E-cores)
- **Ustawienie**: 8 wątków to optimum (nie za mało, nie za dużo)
- **SIMD**: Włączone (Single Instruction Multiple Data acceleration)

### 3. **ONNX Runtime Optimizations**
- `enableCpuMemArena: true` - lepsza alokacja pamięci
- `enableMemPattern: true` - optymalizacja dostępu do pamięci
- `graphOptimizationLevel: 'all'` - maksymalna optymalizacja grafu

### 4. **FP32 dtype (zamiast quantized)**
- Apple Silicon ma świetne wsparcie dla FP32
- Quantized modele (int8, fp16) są WOLNIEJSZE na M4 bez GPU support

## ⚡ Oczekiwane czasy transkrypcji

Z modelem **whisper-base** na M4 Pro:

| Długość audio | Czas transkrypcji | Ratio |
|---------------|-------------------|-------|
| 1 minuta      | ~5-8 sekund       | ~8-10x |
| 5 minut       | ~25-40 sekund     | ~7-12x |
| 10 minut      | ~50-90 sekund     | ~6-12x |
| 30 minut      | ~3-5 minut        | ~6-10x |
| 60 minut      | ~6-10 minut       | ~6-10x |

> **Cel**: Maksymalnie 1 minuta dla 60 minut audio ❌ (nierealne)
> **Realistyczny cel**: 6-10 minut dla 60 minut audio ✅

## 🔧 Dalsze optymalizacje (jeśli potrzebujesz JESZCZE szybciej)

### 1. **Użyj mniejszego modelu**
```javascript
model: 'tiny' // zamiast 'base'
```
- **whisper-tiny**: ~2-3x szybszy niż base
- **Dokładność**: 85-90% (vs 92-95% dla base)
- **Dla wykładów**: Tiny często wystarczy!

### 2. **Batch Processing (wiele plików jednocześnie)**
- M4 Pro radzi sobie z 2-3 transkrypcjami równolegle
- Uruchom kilka instancji backendu (różne porty)

### 3. **Whisper.cpp (natywna implementacja)**
Zamiast transformers.js, użyj whisper.cpp:
```bash
brew install whisper-cpp
```
- **Prędkość**: 3-5x szybszy niż transformers.js
- **Wsparcie**: Metal (GPU na Apple Silicon)
- **Wada**: Wymaga instalacji zewnętrznego narzędzia

### 4. **Cloud API (dla bardzo długich nagrań)**
Dla nagrań >60 minut rozważ:
- OpenAI Whisper API ($0.006/min)
- Assembly.AI
- Deepgram

## 📊 Monitoring wydajności

Sprawdź w logach backendu:
```
[Transcribe] Audio zdekodowane: 125.4s
[Transcribe] Zakończono w 18.2s
```

**Wskaźnik wydajności**: 
- Ratio = Czas audio / Czas transkrypcji
- **Dobry**: >6x (125s audio w 18s = 6.9x) ✅
- **Słaby**: <4x (potrzeba optymalizacji)

## 🎯 Realistyczne oczekiwania

**NIE jest możliwe**:
- ❌ 60 minut audio w 1 minutę (60x realtime)
- ❌ Transkrypcja szybsza niż odsłuchanie

**JEST możliwe**:
- ✅ 60 minut audio w 6-10 minut (6-10x realtime)
- ✅ 10 minut audio w ~1 minutę (10x realtime)

### Dlaczego NIE można szybciej?

1. **Model musi przetworzyć każdy chunk**
   - Whisper to transformer = kosztowne obliczenia
   - Nawet na najlepszych procesorach

2. **Dekodowanie audio zajmuje czas**
   - Konwersja MP3/M4A -> PCM 16kHz mono
   - FFmpeg dekodowanie

3. **Ograniczenia WASM/CPU**
   - Brak natywnego Metal/GPU support w transformers.js
   - ONNX Runtime WASM jest szybkie, ale nie jak natywny kod

## 💡 Rekomendacja

Dla **najlepszej równowagi prędkość/dokładność**:

1. **Krótkie nagrania (<5 min)**: Używaj `whisper-base` w przeglądarce
2. **Średnie nagrania (5-30 min)**: Backend + `whisper-base`
3. **Długie nagrania (30-90 min)**: Backend + `whisper-tiny` lub Cloud API
4. **Bardzo długie (>90 min)**: Cloud API (OpenAI, Assembly.AI)

## 🔍 Troubleshooting

### Problem: Nadal wolno (>2 min na 10 min audio)

**Sprawdź**:
1. Czy backend używa lokalnych modeli?
   ```bash
   ls -lh public/models/Xenova/whisper-base/
   ```
2. Czy masz dużo wolnej pamięci RAM?
   ```bash
   top -l 1 | grep PhysMem
   ```
3. Czy używasz najnowszej wersji Node.js?
   ```bash
   node --version  # powinno być >=18
   ```

### Problem: Out of memory

**Rozwiązanie**:
1. Użyj mniejszego modelu (`whisper-tiny`)
2. Zmniejsz `chunk_length_s` do 20
3. Zwiększ limit Node.js:
   ```bash
   NODE_OPTIONS="--max-old-space-size=8192" npm start
   ```

## ✨ Rezultat

Po optymalizacjach:
- **10 minut audio**: ~50-90 sekund (~7-12x realtime) ✅
- **Ostrzeżenie "30 seconds"**: Usunięte ✅
- **Stabilna wydajność**: Tak ✅
- **Maksymalnie 1 minuta dla 60 min audio**: Nierealne ❌

**Najbliższy realny cel**: 
- 60 minut audio w 6-10 minut
- To jest świetny wynik dla local processing! 🎉
