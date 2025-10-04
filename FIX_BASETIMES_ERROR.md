# 🔧 Naprawiono błąd: baseTimes[model] is undefined

## ❌ Błąd
```
Błąd podczas przetwarzania: can't access property "cleaning", baseTimes[model] is undefined
```

## 🔍 Przyczyna

Funkcja `estimateAITime()` oczekiwała ścisłego typu:
```typescript
model: 'phi3.5:3.8b' | 'llama3.1:8b' | 'qwen2.5:14b'
```

Ale wywoływana była z wartościami które mogły być:
- Ustawienie użytkownika: `'phi3.5'`, `'llama3.1'`, `'qwen2.5'`, `'auto'`
- Wartość z `selectModelForTask()`: pełne nazwy modeli

TypeScript był omijany przez `as any`, więc błąd pojawiał się dopiero w runtime.

## ✅ Rozwiązanie

1. **Zmieniono typ parametru `model` na `string`**
2. **Dodano normalizację nazwy modelu:**

```typescript
export function estimateAITime(
  operation: 'cleaning' | 'notes' | 'flashcards' | 'verification' | 'transcription',
  textLength: number,
  model: string = 'llama3.1:8b'  // ✅ Teraz przyjmuje dowolny string
): number {
  // Normalizuj nazwę modelu do obsługiwanych typów
  const normalizedModel = model.includes('phi3') ? 'phi3.5:3.8b' 
    : model.includes('llama') ? 'llama3.1:8b'
    : model.includes('qwen') ? 'qwen2.5:14b'
    : 'llama3.1:8b' // domyślny fallback
  
  // Bezpieczne pobieranie z fallbackiem
  const modelTimes = baseTimes[normalizedModel] || baseTimes['llama3.1:8b']
  const baseTime = modelTimes[operation] || 2000
  
  // ...
}
```

3. **Usunięto `as any` z wywołań:**

```typescript
// ❌ Przed:
const estimatedTime = estimateAITime('cleaning', rawText.length, model as any)

// ✅ Po:
const estimatedTime = estimateAITime('cleaning', rawText.length, model)
```

## 🎯 Teraz funkcja obsługuje:

- ✅ `'phi3.5'` → normalizuje do `'phi3.5:3.8b'`
- ✅ `'phi3.5:3.8b'` → używa bezpośrednio
- ✅ `'llama3.1'` → normalizuje do `'llama3.1:8b'`
- ✅ `'llama3.1:8b'` → używa bezpośrednio
- ✅ `'qwen2.5'` → normalizuje do `'qwen2.5:14b'`
- ✅ `'qwen2.5:14b'` → używa bezpośrednio
- ✅ `'auto'` → fallback do `'llama3.1:8b'`
- ✅ Dowolna inna wartość → fallback do `'llama3.1:8b'`

## 🧪 Test

Aplikacja uruchomiona na: **http://localhost:5173**

Błąd `baseTimes[model] is undefined` nie powinien się już pojawiać! ✅
