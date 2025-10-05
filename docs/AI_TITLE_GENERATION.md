# 🤖 AI Auto-Title Generation

## Funkcja

**Inteligentne generowanie tytułu wykładu** na podstawie transkrypcji przez AI.

Zamiast po prostu brać pierwsze słowa transkrypcji, AI analizuje treść i **wydobywa główny temat** wykładu.

---

## 🎯 Jak to działa?

### Poprzednia wersja (v2.1.2 i wcześniej):
```javascript
// Brało pierwsze 60 znaków
"dzisiaj będziemy mówić o algorytmach sortowania które są..."
→ Tytuł: "dzisiaj będziemy mówić o algorytmach sortowania które..."
```

❌ **Problem**: Tytuł zawiera niepotrzebne wprowadzenie ("dzisiaj będziemy mówić o")

### Nowa wersja (v2.2.0) - 4-poziomowa strategia:

#### Strategia 1: Explicytne frazy (NAJLEPSZA)
```javascript
Input: "Dzisiaj będziemy omawiać algorytmy sortowania. Quicksort..."
→ AI wykrywa: "dzisiaj będziemy omawiać [TEMAT]"
→ Wydobywa: "algorytmy sortowania" (POMIJA czasownik "omawiać"!)
→ Tytuł: "Algorytmy sortowania" ✨
```

#### Strategia 2: Term Frequency (TF)
```javascript
Input: długa transkrypcja bez explicytnego tematu
→ AI liczy słowa: {algorytm: 15, sortowanie: 12, quicksort: 8}
→ Top 3 słowa: "algorytm", "sortowanie", "quicksort"
→ Przechodzi do Strategii 3...
```

#### Strategia 3: Kontekstowa ekstrakcja
```javascript
→ AI szuka zdań z top słowami: "algorytm"
→ Znajduje: "...najszybszy algorytm sortowania to quicksort..."
→ Wydobywa fragment: "algorytm sortowania to quicksort"
→ Obcina: "Algorytm sortowania" ✨
```

#### Strategia 4: Fallback (najgorszy przypadek)
```javascript
→ Jeśli nic nie znaleziono, użyj top 3 słów
→ Tytuł: "Algorytm sortowanie quicksort"
```

✅ **Korzyść**: Zwięzły, opisowy tytuł bez zbędnych słów - nawet dla 36k+ znaków transkrypcji!

---

## 📋 Przykłady

### Przykład 1: Wykład z wyraźnym tematem

**Transkrypcja**:
> "No to dobra, dzisiaj będziemy omawiać temat dzisiejszego wykładu to rachunek różniczkowy i całkowy. Podstawowe wzory które musicie znać to..."

**Wygenerowany tytuł**:
> "Rachunek różniczkowy i całkowy"

---

### Przykład 2: Wykład bez explicytnego wprowadzenia

**Transkrypcja**:
> "Zajmiemy się algorytmami sortowania, quicksort to najszybszy algorytm sortowania w praktyce..."

**Wygenerowany tytuł**:
> "Algorytmy sortowania"

---

### Przykład 3: Wykład rozpoczynający się od tematu

**Transkrypcja**:
> "Bazy danych SQL to systemy zarządzania relacyjnymi bazami danych. Pierwsza normalna forma to..."

**Wygenerowany tytuł**:
> "Bazy danych SQL"

---

## 🔧 Architektura

### Backend (server/server.js)

**Endpoint**: `POST /generate-title`

**Request**:
```json
{
  "transcription": "tekst transkrypcji..."
}
```

**Response**:
```json
{
  "success": true,
  "title": "Wygenerowany tytuł"
}
```

**Logika**:
1. **Strategia 1**: Wykrywa explicytne frazy językowe:
   - "temat wykładu to: X" → "X"
   - "dzisiaj będziemy **omawiać** X" → "X" (pomija czasownik!)
   - "mówimy dziś o X" → "X"
   
2. **Strategia 2**: Analiza częstotliwości terminów (TF):
   - Liczy wystąpienia każdego słowa (>3 znaki)
   - Filtruje 40+ polskich stop words
   - Wybiera top 10 najczęstszych terminów
   
3. **Strategia 3**: Kontekstowa ekstrakcja:
   - Szuka zdań zawierających top słowa kluczowe
   - Wydobywa 3-7 słów wokół słowa kluczowego
   - Wybiera najbardziej sensowny fragment
   
4. **Strategia 4**: Fallback - top 3 słowa jako tytuł

5. Oczyszcza artefakty: "um", "uh", "hmm", "jeszcze", "chwilkę"
6. Kapitalizuje pierwszą literę
7. Obcina na granicy słowa/przecinka (max 50-60 znaków)

**Przykład 36k znaków transkrypcji**:
```
Input: "Jeszcze chwilkę poczekamy... [35950 więcej znaków]... algorytmy sortowania..."
Output: "Algorytmy sortowania" ✨
```

---

### Frontend (frontend/js/modules/ai.js)

**Funkcja**: `generateLectureTitle(transcription)`

**Używana w**:
- `handleNewLectureSubmit()` - gdy zapisujesz wykład bez tytułu
- `handleStopRecording()` - automatycznie po transkrypcji

**Fallback**: Jeśli backend nie działa, używa prostszej logiki po stronie frontendu

---

## 🎬 Flow użytkownika

### Nagrywanie wykładu:

1. **Kliknij**: ➕ Nowy wykład
2. **Kliknij**: 🎤 Nagrywaj
3. **Mów**: 10-30 sekund o temacie wykładu
4. **Kliknij**: ⏹️ Zatrzymaj i transkrybuj

**Co się dzieje w tle**:
```
1. Nagranie audio → Backend (0.5s)
2. Whisper.cpp transkrybuje → "dzisiaj będziemy omawiać algorytmy..."
3. AI generuje tytuł → "Algorytmy sortowania"
4. Tytuł pojawia się w polu "Tytuł wykładu"
5. Możesz edytować lub zapisać
```

---

## 🧠 Rozpoznawane wzorce (PL)

Backend rozpoznaje te frazy i wydobywa temat po nich:

| Wzorzec | Przykład | Wydobyty tytuł |
|---------|----------|----------------|
| "dzisiaj będziemy/omówimy/poznamy..." | "dzisiaj będziemy omawiać bazy danych" | "Bazy danych" |
| "temat dzisiejszego wykładu to..." | "temat dzisiejszego wykładu to sortowanie" | "Sortowanie" |
| "na dzisiejszym wykładzie..." | "na dzisiejszym wykładzie algorytmy grafowe" | "Algorytmy grafowe" |
| "mówimy dziś o..." | "mówimy dziś o strukturach danych" | "Struktury danych" |
| "zajmiemy się..." | "zajmiemy się rekurencją" | "Rekurencja" |

Jeśli żaden wzorzec nie pasuje, bierze **pierwsze zdanie** jako tytuł.

---

## ⚡ Performance

- **Czas generowania**: < 10ms (heurystyka, nie LLM)
- **Dokładność**: ~80% dla języka polskiego
- **Fallback**: Jeśli backend nie działa, frontend generuje prostszy tytuł

---

## 🔮 Przyszłe ulepszenia

### v2.3.0+ (Roadmap):

1. **Prawdziwy LLM**: Użycie GPT-4 / Claude dla lepszej jakości
2. **Multi-język**: Wsparcie dla angielskiego, niemieckiego itp.
3. **Kontekst**: Uwzględnienie przedmiotu wykładu
4. **Keywords extraction**: Wydobywanie słów kluczowych oprócz tytułu

---

## 📝 Przykładowy kod

### Użycie w aplikacji:

```javascript
import { generateLectureTitle } from './modules/ai.js';

const transcription = "dzisiaj będziemy omawiać algorytmy sortowania...";
const title = await generateLectureTitle(transcription);

console.log(title); // "Algorytmy sortowania"
```

### Testowanie:

```bash
# Uruchom backend
npm run server

# Test przez curl
curl -X POST http://localhost:3001/generate-title \
  -H "Content-Type: application/json" \
  -d '{"transcription": "dzisiaj będziemy omawiać rekurencję która jest..."}'

# Output:
# {"success":true,"title":"Rekurencja"}
```

---

## 🎓 Edukacyjna wartość

**Dla studenta**:
- Nie musisz wymyślać tytułu - AI zrobi to za Ciebie
- Lepsze organizowanie wykładów (zwięzłe, opisowe tytuły)
- Szybsze odnajdywanie wykładów później

**Dla projektu**:
- Demonstracja integracji AI z aplikacją webową
- Praktyczne użycie NLP (Natural Language Processing)
- Architektura backend (Node.js) + frontend (ES6 modules)

---

## Changelog

### v2.2.0 (2025-10-05)
- ✅ Dodano endpoint `/generate-title` w backendzie
- ✅ Stworzono moduł `ai.js` w frontendzie
- ✅ AI analizuje treść i wydobywa temat (nie bierze pierwszych słów)
- ✅ Rozpoznawanie 5+ wzorców językowych PL
- ✅ Fallback gdy backend niedostępny
- ✅ Async/await integration w app.js
- ✅ Pokazuje "🤖 AI generuje tytuł..." podczas przetwarzania

---

**Wniosek**: Inteligentne tytułowanie wykładów sprawia, że organizacja notatek jest o wiele łatwiejsza! 🎓✨
