# Fact-Checking - Weryfikacja faktów w Student Assistant

## Opis funkcjonalności

System fact-checkingu w Student Assistant automatycznie weryfikuje fakty podczas generowania notatek z transkrypcji wykładów. Szczególnie koncentruje się na weryfikacji:

- **Imion i nazwisk** - wykrywanie i weryfikacja osób, postaci historycznych, naukowców
- **Dat** - sprawdzanie poprawności dat, okresów historycznych, wydarzeń
- **Miejsc** - weryfikacja nazw miast, krajów, regionów geograficznych

## Jak to działa

### 1. Ekstrakcja encji
System automatycznie wykrywa w transkrypcji:
- Imiona i nazwiska (polskie i obce wzorce)
- Daty w różnych formatach (DD.MM.YYYY, DD/MM/YY, okresy historyczne)
- Nazwy miejsc (miasta, kraje, regiony)

### 2. Weryfikacja w internecie
Każda wykryta encja jest weryfikowana przez:
- **DuckDuckGo Instant Answer API** - bezpłatne API do szybkiej weryfikacji
- Wyszukiwanie kontekstowe z otaczającym tekstem
- Analiza pewności wyników (0-100%)

### 3. Poprawki automatyczne
System może automatycznie poprawiać:
- Błędnie zapisane nazwiska (tylko przy wysokiej pewności >70%)
- Nieprawidłowe daty (weryfikacja z kontekstem)
- Nazwy miejsc (gdy są oczywiste błędy transkrypcji)

## Użycie

### Podstawowe generowanie z fact-checkiem
```javascript
import { generateNotesWithFactCheck } from './modules/ai.js';

const result = await generateNotesWithFactCheck(transcription, (percent, message) => {
    console.log(`${percent}%: ${message}`);
});

// Wynik zawiera:
// - result.formatted - sformatowane notatki
// - result.factCheck - wyniki weryfikacji
// - result.factCheck.stats - statystyki
// - result.factCheck.corrections - dokonane poprawki
```

### Osobna weryfikacja faktów
```javascript
import { factCheckTranscription } from './modules/ai.js';

const factCheckResult = await factCheckTranscription(transcription);

console.log(`Zweryfikowano: ${factCheckResult.stats.verified}/${factCheckResult.stats.total}`);
console.log(`Pewność: ${(factCheckResult.stats.confidence * 100).toFixed(1)}%`);
```

## API Endpoints

### POST /fact-check
Weryfikuje fakty w podanej transkrypcji.

**Request:**
```json
{
    "transcription": "tekst do sprawdzenia"
}
```

**Response:**
```json
{
    "success": true,
    "results": {
        "names": [
            {
                "name": "Albert Einstein",
                "verified": true,
                "confidence": 0.95,
                "source": "Wikipedia",
                "info": { "definition": "..." }
            }
        ],
        "dates": [...],
        "places": [...]
    },
    "stats": {
        "verified": 8,
        "total": 10,
        "confidence": 0.8,
        "changes": 2
    }
}
```

### POST /generate-notes-with-fact-check
Generuje notatki z wbudowaną weryfikacją faktów.

**Request:** jak `/generate-notes`

**Response:** 
```json
{
    "success": true,
    "formatted": "# Notatki...",
    "structured": "1. ...",
    "summary": "...",
    "keyPoints": "...",
    "questions": "...",
    "factCheck": {
        "results": { /* wyniki weryfikacji */ },
        "corrections": { /* dokonane poprawki */ },
        "stats": { /* statystyki */ }
    }
}
```

## Interfejs użytkownika

### Przycisk "Z weryfikacją faktów"
W interfejsie notatek dostępny jest dodatkowy przycisk **"🔍✨ Z weryfikacją faktów"** obok standardowego generowania.

### Modal wyników
Po zakończeniu weryfikacji wyświetlany jest modal z:
- **Podsumowaniem** - liczba zweryfikowanych faktów, pewność, liczba poprawek
- **Dokonane poprawki** - lista zmian z podaniem pewności i źródła
- **Weryfikowane encje** - szczegółowa lista wszystkich sprawdzonych imion, dat i miejsc

## Konfiguracja

### Limity weryfikacji
Aby uniknąć zbyt wielu zapytań do API:
- Maksymalnie 10 imion/nazwisk
- Maksymalnie 5 dat  
- Maksymalnie 5 miejsc
- Opóźnienie 500ms między zapytaniami

### Progi pewności
- **>70%** - automatyczne poprawki
- **>50%** - oznaczenie jako zweryfikowane
- **<50%** - oznaczenie jako niepewne

## Ograniczenia

1. **Zależność od internetu** - wymagane połączenie do DuckDuckGo API
2. **Ograniczona precyzja** - system może nie rozpoznać wszystkich błędów
3. **Języki** - zoptymalizowany dla polskiego, ograniczone wsparcie innych języków
4. **Rate limiting** - ograniczenia API mogą wpłynąć na szybkość

## Rozszerzenia w przyszłości

- Integracja z Wikipedia API dla lepszej weryfikacji
- Wsparcie dla dodatkowych języków
- Cache zweryfikowanych faktów
- Możliwość ręcznej korekty wyników
- Integracja z bazami danych faktów (DBpedia, Wikidata)

## Przykład użycia

```javascript
// W transkrypcji pojawia się:
// "Alber Ajnsztajn urodził się w 1879 roku w Ulm"

// System wykryje:
// - Imię: "Alber Ajnsztajn" 
// - Data: "1879 roku"
// - Miejsce: "Ulm"

// Po weryfikacji:
// - Poprawi na "Albert Einstein"
// - Potwierdzi datę urodzenia
// - Potwierdzi miejsce urodzenia

// W notatkach pojawi się poprawiona wersja
// + modal z informacją o dokonanych poprawkach
```

## Bezpieczeństwo

- Wszystkie zapytania do zewnętrznych API są anonimowe
- Nie są przesyłane żadne dane osobowe
- Wysyłane są tylko fragmenty tekstu potrzebne do weryfikacji
- Wyniki są cache'owane tylko lokalnie