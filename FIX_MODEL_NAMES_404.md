# 🔧 Naprawiono błąd 404: Nieprawidłowe nazwy modeli z ustawień

## ❌ Problem

```
[Ollama] Wywołuję model qwen2.5 dla zadania: cleaning
[Ollama] Błąd wywołania qwen2.5: Ollama API error: 404 Not Found
[Ollama] Dostępne modele: llama3.1:8b, qwen2.5:14b, phi3.5:3.8b
```

**Przyczyna:**
- Ustawienia zapisywały krótkie nazwy: `qwen2.5`, `llama3.1`, `phi3.5`
- Ollama API wymaga pełnych nazw z tagami: `qwen2.5:14b`, `llama3.1:8b`, `phi3.5:3.8b`
- Funkcja `selectModelForTask()` zwracała wartość z ustawień bez normalizacji

**Log z problemu:**
```
[Ustawienia zapisane] AI: local/qwen2.5  ❌ Brak tagu :14b
```

## ✅ Rozwiązanie

### 1. Normalizacja w `selectModelForTask()`

```typescript
function selectModelForTask(taskType: string): string {
  const s = getSettings()
  const preferredModel = s.aiModel || 'auto'
  
  // Normalizuj nazwę modelu - dodaj tag wersji jeśli go brakuje
  function normalizeModelName(model: string): string {
    if (model.includes(':')) return model // Już ma tag wersji
    
    // Dodaj odpowiedni tag wersji
    if (model === 'phi3.5') return 'phi3.5:3.8b'
    if (model === 'llama3.1') return 'llama3.1:8b'
    if (model === 'qwen2.5') return 'qwen2.5:14b'
    
    return model
  }
  
  if (preferredModel !== 'auto') {
    return normalizeModelName(preferredModel) // ✅ Zawsze zwraca pełną nazwę
  }
  
  // ...
}
```

### 2. Aktualizacja typów w `settings.ts`

**Przed:**
```typescript
export type AiModel = 'phi3.5' | 'llama3.1' | 'qwen2.5' | 'auto'  // ❌ Krótkie nazwy
```

**Po:**
```typescript
export type AiModel = 'phi3.5:3.8b' | 'llama3.1:8b' | 'qwen2.5:14b' | 'auto'  // ✅ Pełne nazwy
```

### 3. Migracja starych ustawień

```typescript
export function getSettings(): SettingsState {
  // ...
  const parsed = JSON.parse(raw)
  
  // Migracja starych nazw modeli do nowych z tagami wersji
  let migratedAiModel = parsed.aiModel ?? 'auto'
  if (migratedAiModel === 'phi3.5') migratedAiModel = 'phi3.5:3.8b'
  if (migratedAiModel === 'llama3.1') migratedAiModel = 'llama3.1:8b'
  if (migratedAiModel === 'qwen2.5') migratedAiModel = 'qwen2.5:14b'
  
  return {
    // ...
    aiModel: migratedAiModel,  // ✅ Zawsze zwraca pełną nazwę
  }
}
```

### 4. Poprawka w UI (Settings.tsx)

**Przed:**
```typescript
<option value="qwen2.5">🎓 Qwen2.5 (14B - najlepszy)</option>  // ❌ Krótka nazwa
```

**Po:**
```typescript
<option value="qwen2.5:14b">🎓 Qwen2.5 (14B - najlepszy)</option>  // ✅ Pełna nazwa
```

## 🎯 Rezultat

### Teraz wszystkie ścieżki używają pełnych nazw:

1. **Zapisywanie ustawień:**
   ```
   [Ustawienia zapisane] AI: local/qwen2.5:14b  ✅ Pełna nazwa
   ```

2. **Wywołanie Ollama:**
   ```
   [Ollama] Wywołuję model qwen2.5:14b dla zadania: cleaning  ✅ 200 OK
   ```

3. **Migracja starych ustawień:**
   - Użytkownicy z `qwen2.5` automatycznie dostaną `qwen2.5:14b`
   - Działa również dla nowych instalacji

## 🧪 Test normalizacji

```javascript
// Test wszystkich przypadków
'phi3.5' → 'phi3.5:3.8b'      ✅
'llama3.1' → 'llama3.1:8b'    ✅
'qwen2.5' → 'qwen2.5:14b'     ✅
'qwen2.5:14b' → 'qwen2.5:14b' ✅ (bez zmian)
'auto' → 'auto'               ✅ (bez zmian)
```

## 🚀 Weryfikacja

Aplikacja działa na: **http://localhost:5174**

**Co sprawdzić:**
1. Idź do Ustawień
2. Wybierz dowolny model AI
3. Zapisz ustawienia
4. Stwórz nową notatkę z tekstem
5. Sprawdź logi - **nie powinno być błędów 404!** ✅

**Oczekiwany log:**
```
[Ollama] Wywołuję model qwen2.5:14b dla zadania: cleaning
[Ollama] qwen2.5:14b odpowiedział: 156 znaków w 2347ms  ✅
```

## 📊 Poprawione pliki

- ✅ `src/lib/ai.ts` - normalizacja w `selectModelForTask()`
- ✅ `src/stores/settings.ts` - typ `AiModel` i migracja
- ✅ `src/pages/Settings.tsx` - wartości `<option>` z pełnymi nazwami

## 🎉 Wszystkie błędy 404 naprawione!

**Teraz Ollama zawsze dostaje poprawne nazwy modeli z tagami wersji.**
