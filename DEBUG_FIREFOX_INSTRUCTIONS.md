# 🔍 Instrukcja debugowania - Firefox

## Dodano szczegółowe logowanie!

Właśnie dodałem BARDZO szczegółowe logowanie które pokaże dokładnie co się dzieje w Firefox.

## 🧪 Jak przetestować?

### Metoda 1: Test w głównej aplikacji

1. **Otwórz Firefox**
2. **Otwórz http://localhost:8000**
3. **Otwórz konsolę deweloperską** (F12 lub Cmd+Option+K na Mac)
4. **Przejdź do zakładki Console**
5. **Odśwież stronę** (Cmd+R)

#### Powinieneś zobaczyć przy starcie:
```
🚀 ========================================
🚀 Student Assistant starting...
🚀 Browser: Mozilla/5.0 (... Firefox ...)
🚀 ========================================
✅ Database initialized
✅ Settings loaded
✅ Navigation setup complete
🔧 Setting up event listeners...
🔍 Starting document upload setup...
🔍 Browser: Mozilla/5.0 ...
🔍 Elements found:
  - pdf-file-input: ✅
  - ppt-file-input: ✅
  - document-file-input: ✅
  - btn-upload-pdf-label: ✅
  - btn-upload-ppt-label: ✅
✅ PDF file input listener added (label-based)
✅ PPT file input listener added (label-based)
✅ PDF label click logger added
✅ PPT label click logger added
... więcej logów ...
✅ Application ready!
```

#### ⚠️ Jeśli widzisz ❌ przy jakimkolwiek elemencie:
To znaczy że element nie został znaleziony w HTML! Zrób screenshot i pokaż mi.

6. **Przejdź do zakładki "✨ Nowy wykład"**
7. **Kliknij przycisk "📄 Dokument (PDF/PPT)"**

#### Powinieneś zobaczyć:
```
🔄 ========================================
🔄 Switching content source to: document
🔄 ========================================
🔄 Found 2 source selector buttons
🔄 Button 0: dataset.source = audio
🔄 Button 0 is now INACTIVE
🔄 Button 1: dataset.source = document
🔄 Button 1 is now ACTIVE
🔍 Section elements:
  - audioSection: ✅ Found
  - documentSection: ✅ Found
  - audioSection current display: block
  - documentSection current display: none
✅ Hiding audio section, SHOWING DOCUMENT SECTION
📄 Document section details:
  - display after change: block
  - visibility: 
  - offsetHeight: [jakaś liczba > 0]
  - offsetWidth: [jakaś liczba > 0]
📄 Label visibility:
  - PDF label: exists
  - PPT label: exists
  - PDF label display: inline-block
  - PDF label visibility: visible
  - PPT label display: inline-block
  - PPT label visibility: visible
✅ Content label updated
🔄 ========================================
🔄 switchContentSource COMPLETE
🔄 ========================================
```

8. **Teraz kliknij przycisk "📕 Wgraj PDF"**

#### Powinieneś zobaczyć:
```
🖱️ PDF LABEL CLICKED!
🖱️ Event: [MouseEvent object]
🖱️ Target: [label element]
🖱️ Current target: [label element]
```

9. **Jeśli otworzy się dialog wyboru pliku:**
   - ✅ **DZIAŁA!** Wybierz jakiś PDF
   
10. **Po wybraniu pliku powinieneś zobaczyć:**
```
📕 PDF file selected via label (Firefox-compatible)
📕 Event: [Event object]
📕 Files: [FileList]
📕 File name: [nazwa twojego pliku.pdf]
📕 File type: application/pdf
📕 File size: [rozmiar w bajtach]
```

### Metoda 2: Test izolowany (prostszy)

1. **Otwórz Firefox**
2. **Otwórz http://localhost:8000/test-firefox-buttons.html**
3. **Otwórz konsolę** (F12)
4. **Kliknij każdy przycisk testowy**
5. **Zobacz które testy DZIAŁAJĄ a które NIE**

Ten test pokazuje 4 różne metody:
- Test 1: `<label>` dla PDF (powinien działać ✅)
- Test 2: `<label>` dla PPT (powinien działać ✅)
- Test 3: Button + `input.click()` (może nie działać w Firefox ❌)
- Test 4: Button + `MouseEvent` (może działać ⚠️)

## 📋 Co mi prześlij?

### Jeśli NIE DZIAŁA:

1. **Screenshot konsoli** z wszystkimi logami
2. **Odpowiedz na pytania:**
   - Czy widzisz wszystkie ✅ przy elementach?
   - Czy dokumentSection ma `display: block` po kliknięciu?
   - Czy widzisz "PDF LABEL CLICKED!" po kliknięciu przycisku?
   - Czy otwiera się dialog wyboru pliku?
   - Jeśli tak - czy po wybraniu pliku widzisz logi "PDF file selected"?

3. **Wyniki z testu izolowanego** (test-firefox-buttons.html)
   - Które testy działają?
   - Screenshot logów z tego testu

### Jeśli DZIAŁA:

Powiedz mi dokładnie co zrobiłeś! 🎉

## 🔧 Możliwe problemy

### Problem 1: Elementy nie są znajdowane (❌ NOT FOUND)
- **Przyczyna:** HTML nie jest załadowany lub ma błąd
- **Rozwiązanie:** Sprawdź czy nie ma błędów w HTML

### Problem 2: Label click nie wywołuje change eventu
- **Przyczyna:** Firefox blokuje połączenie label→input
- **Rozwiązanie:** Sprawdź czy `for="pdf-file-input"` odpowiada `id="pdf-file-input"`

### Problem 3: Sekcja dokumentów nie jest widoczna
- **Przyczyna:** CSS override lub JavaScript error
- **Rozwiązanie:** Sprawdź czy `offsetHeight > 0` w logach

### Problem 4: Dialog się nie otwiera mimo kliknięcia
- **Przyczyna:** Firefox security policy
- **Rozwiązanie:** Sprawdź logi czy change event jest wywoływany

## 📞 Zgłoś wyniki

Skopiuj wszystkie logi z konsoli i prześlij mi je, razem z informacją:
- ✅ Działa / ❌ Nie działa
- Na którym etapie problem występuje
- Screenshots konsoli

Dzięki tym logom zobaczę DOKŁADNIE co się dzieje! 🔍
