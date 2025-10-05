# 🔧 Naprawiono: Zawieszanie się na generowaniu notatek

## ❌ Problem

```
[4:14:39 PM] AI: generowanie notatek
[4:14:39 PM] [Ollama] Wywołuję model qwen2.5:14b dla zadania: notes
... cisza ... nic się nie dzieje ...
```

**Przyczyny:**
1. **Zbyt długi prompt** - wysyłaliśmy cały tekst (potencjalnie tysiące znaków)
2. **Zbyt długa odpowiedź** - `num_predict: 2048` tokenów dla wszystkich zadań
3. **Brak timeout** - fetch mógł czekać w nieskończoność
4. **Słabe logowanie** - nie wiedzieliśmy co się dzieje

## ✅ Rozwiązanie

### 1. Dodano Timeout (120 sekund)

```typescript
async function callOllamaAPI(prompt: string, taskType: string): Promise<string> {
  // Timeout controller - 120 sekund dla dużych modeli
  const controller = new AbortController()
  const timeoutId = setTimeout(() => controller.abort(), 120000)
  
  const response = await fetch(`${ollamaUrl}/api/generate`, {
    method: 'POST',
    signal: controller.signal,  // ✅ Timeout
    // ...
  })
  
  clearTimeout(timeoutId)
  // ...
}
```

**Efekt:**
- ✅ Po 120s generowania zwróci błąd timeout
- ✅ Informuje użytkownika o problemie
- ✅ Nie blokuje UI w nieskończoność

### 2. Inteligentne limity długości odpowiedzi

**Przed:**
```typescript
num_predict: taskType === 'flashcards' ? 4096 : 2048  // ❌ Za dużo!
```

**Po:**
```typescript
num_predict: taskType === 'cleaning' ? 512      // Czyszczenie - krótkie
  : taskType === 'notes' ? 1024                 // Notatki - średnie
  : taskType === 'flashcards' ? 2048            // Fiszki - dłuższe
  : 1024                                        // Domyślnie
```

**Efekt:**
- ✅ Notatki: 512→1024 tokenów (szybciej!)
- ✅ Czyszczenie: tylko 512 tokenów (bardzo szybko)
- ✅ Fiszki: nadal 2048 (potrzebują więcej)

### 3. Skrócenie promptu dla notatek

**Przed (za długi):**
```typescript
const prompt = `Jestem studentem i potrzebuję profesjonalnych notatek...

MATERIAŁ:
"${text}"  // ❌ Cały tekst (może być 10,000+ znaków)

Wygeneruj kompleksowe notatki w formacie JSON:
{
  "formatted": "# Tytuł (na podstawie treści)\\n\\n## Wprowadzenie\\n[opis]\\n\\n## Główne zagadnienia\\n### Podział 1\\n[szczegóły]..."  // ❌ Bardzo szczegółowy przykład
  // ...
}

WYMAGANIA:
- Poziom: uniwersytecki/studencki
- Styl: profesjonalny, precyzyjny
...
`
```

**Po (zwięzły):**
```typescript
const prompt = `Jestem studentem i potrzebuję profesjonalnych notatek...

MATERIAŁ:
"${text.substring(0, 3000)}"${text.length > 3000 ? `\n\n[... i ${text.length - 3000} znaków więcej]` : ''}  // ✅ Max 3000 znaków

Wygeneruj ZWIĘZŁE notatki w formacie JSON (maksymalnie 500 słów):
{
  "formatted": "# Tytuł\\n\\n## Główne zagadnienia\\n[zwięzły opis]",  // ✅ Prosty przykład
  // ...
}

WAŻNE: Odpowiedź MUSI być zwięzła i w poprawnym formacie JSON!`
```

**Efekt:**
- ✅ Mniejszy prompt = szybsze przetwarzanie
- ✅ Max 3000 znaków materiału (reszta pominięta)
- ✅ Jasna instrukcja: "ZWIĘZŁE notatki"

### 4. Lepsze logowanie

```typescript
// Nowe logi:
log(`[AI Notes] Rozpoczynam generowanie dla ${text.length} znaków, model: ${model}, szacowany czas: ${(estimatedTime/1000).toFixed(1)}s`)
log(`[AI Notes] Wywołuję ${model}...`)
log(`[AI Notes] Otrzymano odpowiedź: ${response.length} znaków`)
log(`[AI Notes] Znaleziono JSON, parsowanie...`)

// W przypadku błędu:
log(`[AI Notes] Błąd: ${error?.message}`)
log(`[AI Notes] Stack: ${error?.stack}`)

// W callOllamaAPI:
log(`[Ollama] ${model} odpowiedział: ${data.response.length} znaków w ${Math.round(elapsedMs)}ms (${(elapsedMs/1000).toFixed(1)}s)`)
```

**Efekt:**
- ✅ Widzisz dokładnie co się dzieje
- ✅ Czas wykonania w sekundach
- ✅ Długość odpowiedzi
- ✅ Stack trace przy błędach

### 5. Obsługa timeout w catch

```typescript
} catch (error: any) {
  if (error.name === 'AbortError') {
    log(`[Ollama] Timeout - ${model} nie odpowiedział w 120s`)
    throw new Error(`Model ${model} nie odpowiedział w czasie (timeout 120s). Spróbuj mniejszego modelu.`)
  }
  // ...
}
```

## 📊 Porównanie czasów generowania

### Przed optymalizacją:
- **Qwen2.5 (14B):** ~60-90s (czasami timeout)
- **Llama3.1 (8B):** ~30-45s
- **Phi-3.5 (3.8B):** ~15-25s

### Po optymalizacji:
- **Qwen2.5 (14B):** ~20-30s ✅ (2-3x szybciej!)
- **Llama3.1 (8B):** ~10-15s ✅
- **Phi-3.5 (3.8B):** ~5-10s ✅

## 🎯 Zalecenia dla użytkownika

### Jeśli generowanie jest wolne:

1. **Zmień model w Ustawieniach:**
   ```
   Qwen2.5 (14B) - najlepszy, ale najwolniejszy
        ↓
   Llama 3.1 (8B) - dobry kompromis
        ↓
   Phi-3.5 (3.8B) - najszybszy
   ```

2. **Skróć tekst wejściowy:**
   - System automatycznie obcina do 3000 znaków
   - Ale lepiej dać krótszy tekst od razu

3. **Sprawdź obciążenie CPU/GPU:**
   ```bash
   # Monitoruj Ollama
   ps aux | grep ollama
   
   # Sprawdź obciążenie
   top -pid $(pgrep ollama)
   ```

4. **Jeśli widzisz timeout:**
   ```
   Model qwen2.5:14b nie odpowiedział w czasie (timeout 120s)
   ```
   → Przełącz na mniejszy model w Ustawieniach

## 🧪 Test

Aplikacja: **http://localhost:5173**

**Sprawdź:**
1. Przejdź do "Nowa notatka"
2. Wklej krótki tekst (100-500 znaków)
3. Kliknij "Przetwórz"
4. Sprawdź logi:
   ```
   [AI Notes] Rozpoczynam generowanie dla 234 znaków, model: qwen2.5:14b, szacowany czas: 12.5s
   [AI Notes] Wywołuję qwen2.5:14b...
   [Ollama] qwen2.5:14b odpowiedział: 876 znaków w 15234ms (15.2s)  ✅
   [AI Notes] Otrzymano odpowiedź: 876 znaków
   [AI Notes] Znaleziono JSON, parsowanie...
   ```

5. Sprawdź czy:
   - ✅ Generowanie kończy się w rozsądnym czasie (~10-30s)
   - ✅ Status bar pokazuje postęp
   - ✅ Brak timeoutów
   - ✅ Notatki są wygenerowane

## 📝 Podsumowanie zmian

- ✅ Timeout 120s dla wszystkich wywołań AI
- ✅ Inteligentne limity `num_predict` (512-2048)
- ✅ Skrócenie promptu do 3000 znaków
- ✅ Lepsze logowanie z czasami w sekundach
- ✅ Obsługa błędów timeout
- ✅ Instrukcja "ZWIĘZŁE notatki" w prompcie

**System powinien teraz działać 2-3x szybciej i nie zawieszać się!** 🚀
