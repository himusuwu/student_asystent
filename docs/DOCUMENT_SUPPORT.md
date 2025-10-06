# Obsługa dokumentów PDF i PowerPoint

## 📄 Przegląd

Aplikacja StudyFlow teraz obsługuje tworzenie notatek nie tylko z nagrań audio, ale również z dokumentów:
- **PDF** - wyekstrahowanie tekstu bezpośrednio w przeglądarce
- **PowerPoint (PPTX)** - przetwarzanie na serwerze backend

## ✨ Jak to działa

### 1. PDF
- Plik PDF jest przetwarzany bezpośrednio w przeglądarce używając **PDF.js**
- Tekst jest ekstraktowany ze wszystkich stron
- Nie wymaga połączenia z backendem (działa offline!)
- Obsługuje wielojęzyczne dokumenty

### 2. PowerPoint (PPTX)
- Plik PPTX jest wysyłany do serwera backend
- Backend rozpakuje PPTX (jest to plik ZIP z XML)
- Ekstraktuje tekst z każdego slajdu
- Zwraca sformatowaną treść z informacją o numerach slajdów

### 3. Generowanie notatek z AI
Po wyeksportowaniu tekstu z dokumentu:
- AI (Ollama) automatycznie generuje tytuł wykładu
- Możesz użyć tego tekstu do generowania:
  - Notatek
  - Fiszek
  - Quizów
  - Kluczowych punktów

## 🚀 Jak używać

### Krok 1: Wybierz źródło materiału
W formularzu "Nowy wykład" zobaczysz dwie opcje:
- **🎤 Nagranie audio** - tradycyjna transkrypcja
- **📄 Dokument (PDF/PPT)** - nowa funkcja!

### Krok 2: Wgraj dokument
1. Kliknij przycisk **📕 Wgraj PDF** lub **📊 Wgraj PowerPoint**
2. Wybierz plik z dysku (max 50MB)
3. Aplikacja automatycznie wykryje typ pliku

### Krok 3: Ekstrakcja treści
- Dla PDF: natychmiastowa ekstrakcja w przeglądarce
- Dla PPTX: wysyłka do backendu (musi działać!)
- Zobaczysz pasek postępu

### Krok 4: AI generuje tytuł
- Po ekstrakcji tekstu AI automatycznie wygeneruje tytuł
- Możesz go edytować przed zapisaniem

### Krok 5: Zapisz wykład
- Kliknij "💾 Zapisz wykład"
- Wykład zostanie zapisany z wyekstrahowaną treścią
- Możesz teraz generować notatki, fiszki i quizy!

## 🔧 Wymagania techniczne

### Frontend (Przeglądarka)
- **PDF.js** - automatycznie załadowany z CDN
- Nowoczesna przeglądarka (Chrome, Firefox, Safari, Edge)

### Backend (dla PowerPoint)
- Node.js server musi działać: `npm run server`
- Biblioteka **jszip** (automatycznie zainstalowana)
- Endpoint: `POST /api/extract-ppt`

## 📋 Wspierane formaty

| Format | Rozszerzenie | Przetwarzanie | Max rozmiar |
|--------|--------------|---------------|-------------|
| PDF | `.pdf` | Przeglądarka (PDF.js) | 50 MB |
| PowerPoint | `.pptx` | Backend (jszip) | 50 MB |
| PowerPoint (stary) | `.ppt` | ❌ Nie obsługiwane | - |

**Uwaga:** Stare pliki `.ppt` nie są obsługiwane. Przekonwertuj je do `.pptx` w PowerPoint.

## ⚠️ Ograniczenia

### PDF
- Musi zawierać tekst (nie skanowane obrazy)
- OCR nie jest obsługiwane
- Niektóre PDF z nietypowym formatowaniem mogą nie działać prawidłowo

### PowerPoint
- Tylko format `.pptx` (XML-based)
- Stare pliki `.ppt` wymagają konwersji
- Ekstraktuje tylko tekst (bez obrazów, wykresów, animacji)
- Backend musi działać

### Ogólne
- Maksymalny rozmiar pliku: 50 MB
- Generowanie tytułu wymaga działającego Ollama
- Bardzo długie dokumenty mogą być wolno przetwarzane

## 🐛 Rozwiązywanie problemów

### "Nie udało się wyekstrahować tekstu z PDF"
- Sprawdź czy PDF zawiera tekst (nie tylko obrazy)
- Spróbuj otworzyć PDF w innej przeglądarce
- Plik może być uszkodzony

### "Backend error" przy PowerPoint
- Upewnij się że backend działa: `npm run server`
- Sprawdź URL backendu w ustawieniach
- Plik może być uszkodzony lub w starszym formacie (.ppt)

### "Plik jest za duży"
- Maksymalny rozmiar to 50 MB
- Spróbuj skompresować PDF lub podzielić prezentację

### Backend nie odpowiada
```bash
# Terminal 1: Uruchom backend
cd server
npm install
npm start

# Sprawdź czy działa
curl http://localhost:3001/health
```

## 💡 Przykłady użycia

### Przypadek 1: Notatki z wykładu PDF
1. Wykładowca udostępnił slajdy w PDF
2. Wgrywasz PDF do aplikacji
3. AI wyekstrahuje tekst i wygeneruje tytuł
4. Generujesz notatki, fiszki i quiz
5. Uczysz się efektywnie! 🎓

### Przypadek 2: Prezentacja PowerPoint
1. Masz prezentację z lekcji
2. Wgrywasz PPTX do aplikacji
3. Backend wyekstrahuje tekst z każdego slajdu
4. Masz pełną treść do nauki

### Przypadek 3: Materiały bez nagrania
1. Nie masz nagrania z wykładu, tylko materiały
2. Używasz dokumentów zamiast audio
3. AI pomaga ci w nauce tak samo efektywnie!

## 🔐 Prywatność

- **PDF**: przetwarzane lokalnie w przeglądarce (100% prywatne)
- **PowerPoint**: wysyłane do lokalnego backendu (nie do chmury!)
- Żadne dane nie są wysyłane do zewnętrznych serwerów
- Wszystko działa lokalnie na twoim komputerze

## 🚀 Przyszłe funkcje (roadmap)

- [ ] Obsługa starszych plików PPT
- [ ] OCR dla skanowanych PDF-ów
- [ ] Ekstrakcja obrazów z dokumentów
- [ ] Obsługa dokumentów Word (DOCX)
- [ ] Import z Google Docs
- [ ] Rozpoznawanie tabel i wykresów

## 📚 Dokumentacja techniczna

### Moduł: document-processor.js
```javascript
// Ekstrakcja z PDF
extractTextFromPDF(file, onProgress)

// Ekstrakcja z PowerPoint
extractTextFromPowerPoint(file, backendUrl, onProgress)

// Uniwersalne przetwarzanie
processDocument(file, backendUrl, onProgress)
```

### Backend Endpoint: /api/extract-ppt
```
POST /api/extract-ppt
Content-Type: multipart/form-data

Body:
- file: PowerPoint file (PPTX)

Response:
{
  "text": "Extracted text content...",
  "slideCount": 10,
  "fileName": "presentation.pptx"
}
```

## 📞 Wsparcie

Jeśli masz problemy:
1. Sprawdź sekcję "Rozwiązywanie problemów"
2. Sprawdź logi konsoli przeglądarki (F12)
3. Sprawdź logi serwera backend
4. Otwórz issue na GitHub

---

**Wersja:** 2.0  
**Data:** Październik 2025  
**Autor:** Student Assistant Team
