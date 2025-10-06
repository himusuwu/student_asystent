# 📖 Przykłady użycia - Dokumenty PDF i PowerPoint

Ten przewodnik pokazuje jak używać nowej funkcji importu dokumentów w praktyce.

---

## 📋 Scenariusz 1: Notatki z wykładu PDF

### Sytuacja
Twój wykładowca udostępnił slajdy z wykładu w formacie PDF.

### Kroki

1. **Przejdź do zakładki "✨ Nowy wykład"**
   ```
   Nawigacja → Nowy wykład
   ```

2. **Wybierz przedmiot**
   - Z listy rozwijanej wybierz przedmiot (np. "Matematyka")

3. **Przełącz na tryb dokumentów**
   - Kliknij przycisk **📄 Dokument (PDF/PPT)**
   - Sekcja zmieni się na opcje dokumentów

4. **Wgraj PDF**
   - Kliknij **📕 Wgraj PDF**
   - Wybierz plik z dysku (np. `wyklad_1_algebra.pdf`)
   - Zatwierdź ekstrakcję tekstu

5. **Poczekaj na przetwarzanie**
   - Zobaczysz pasek postępu
   - PDF jest przetwarzany w przeglądarce (lokalnie!)
   - Tekst pojawi się w polu tekstowym

6. **AI wygeneruje tytuł**
   - Automatycznie: "Algebra liniowa - macierze i wyznaczniki"
   - Możesz edytować przed zapisaniem

7. **Zapisz wykład**
   - Kliknij **💾 Zapisz wykład**
   - Wykład jest teraz dostępny w zakładce "📖 Wykłady"

8. **Generuj materiały do nauki**
   - Otwórz wykład
   - Kliknij zakładkę **🎴 Fiszki** → Generuj z AI
   - Kliknij zakładkę **📝 Quiz** → Generuj z AI
   - Gotowe! Możesz się uczyć

---

## 📊 Scenariusz 2: Prezentacja PowerPoint

### Sytuacja
Masz prezentację z zajęć w formacie PPTX.

### Kroki

1. **Upewnij się że backend działa**
   ```bash
   # Terminal
   npm run server
   
   # Sprawdź status
   curl http://localhost:3001/health
   ```

2. **Przejdź do "✨ Nowy wykład"**

3. **Wybierz przedmiot** (np. "Programowanie")

4. **Przełącz na tryb dokumentów**
   - Kliknij **📄 Dokument (PDF/PPT)**

5. **Wgraj PowerPoint**
   - Kliknij **📊 Wgraj PowerPoint**
   - Wybierz plik PPTX (np. `java_podstawy.pptx`)
   - Zatwierdź ekstrakcję

6. **Backend przetworzy plik**
   - Plik jest wysyłany do lokalnego backendu
   - Backend rozpakowuje PPTX i wyciąga tekst
   - Zobaczysz postęp: 10% → 30% → 70% → 100%

7. **Treść pojawi się z podziałem na slajdy**
   ```
   --- Slajd 1 ---
   Java - podstawy programowania
   
   --- Slajd 2 ---
   Typy danych: int, double, String...
   ```

8. **AI wygeneruje tytuł**
   - "Java - podstawy programowania obiektowego"

9. **Zapisz i ucz się!**

---

## 🎓 Scenariusz 3: Materiały bez nagrania

### Sytuacja
Nie byłeś na wykładzie, ale masz materiały PDF od kolegi.

### Problem
Nie masz nagrania audio, tylko dokument.

### Rozwiązanie

1. **Użyj trybu dokumentów zamiast audio**
   - To jest dokładnie to, do czego służy nowa funkcja!

2. **Wgraj PDF**
   - Aplikacja wyekstrahuje tekst

3. **Generuj notatki**
   - Otwórz wykład
   - **📝 Notatki** → Generuj z AI
   - Otrzymasz czytelne, strukturalne notatki

4. **Twórz fiszki**
   - **🎴 Fiszki** → Generuj z AI
   - System SRS pomoże Ci się nauczyć

5. **Rozwiąż quiz**
   - **📝 Quiz** → Generuj z AI
   - Sprawdź swoją wiedzę

---

## 💡 Scenariusz 4: Szybkie przypomnienie przed egzaminem

### Sytuacja
Egzamin za 2 dni, masz 5 prezentacji do przejrzenia.

### Kroki

**Dla każdej prezentacji:**

1. **Szybki import**
   ```
   Nowy wykład → Dokument → Wgraj PPTX
   ```

2. **AI auto-tytuł**
   - Zaakceptuj wygenerowany tytuł

3. **Generuj krótką notatkę**
   ```
   Otwórz wykład → 📄 Krótka → Generuj z AI
   ```

4. **Eksportuj do Markdown**
   ```
   Pobierz wszystkie notatki jako .md
   Przejrzyj je w jednym pliku
   ```

**Wynik:** W 30 minut masz przegląd całego materiału!

---

## 🔄 Scenariusz 5: Porównanie różnych źródeł

### Sytuacja
Masz wykład audio + slajdy PDF - chcesz połączyć

### Strategia A: Dwa osobne wykłady

1. **Wykład 1: Audio**
   - Transkrypcja nagrania
   - Tytuł: "Wykład 5 - Java (audio)"

2. **Wykład 2: PDF**
   - Ekstrakcja z PDF
   - Tytuł: "Wykład 5 - Java (slajdy)"

3. **Porównaj notatki**
   - Generuj notatki z obu
   - Porównaj i połącz ręcznie

### Strategia B: Jeden wykład z transkrypcją + PDF

1. **Utwórz wykład z audio**
   - Transkrybuj nagranie

2. **Skopiuj tekst z PDF**
   - Wgraj PDF jako osobny "wykład tymczasowy"
   - Skopiuj wyekstrahowany tekst

3. **Dodaj do transkrypcji**
   - Wklej tekst z PDF do pola transkrypcji
   - Zapisz

4. **Generuj materiały**
   - Notatki będą zawierać informacje z obu źródeł!

---

## 🎯 Scenariusz 6: Grupowa praca projektowa

### Sytuacja
Zespół przygotowuje prezentację - każdy robi część.

### Workflow

1. **Każdy członek zespołu:**
   - Tworzy swoją część w PowerPoint
   - Eksportuje do PPTX

2. **Lider zespołu:**
   ```
   Dla każdego PPTX:
   → Nowy wykład
   → Wgraj PPTX
   → Zapisz z tytułem "Projekt X - Część [1-5]"
   ```

3. **Generuj wspólne notatki**
   - Otwórz każdą część
   - Generuj szczegółową notatkę
   - Eksportuj wszystkie do Markdown

4. **Połącz w jeden dokument**
   - Masz kompletne notatki z całego projektu
   - Gotowe do prezentacji!

---

## 🔍 Porównanie: Audio vs Dokumenty

| Aspekt | Audio (Nagranie) | Dokument (PDF/PPT) |
|--------|------------------|-------------------|
| **Czas przetwarzania** | 5-15 min (zależy od długości) | 10-60 sek |
| **Jakość treści** | Pełny kontekst, naturalna narracja | Punkty kluczowe, struktura |
| **Wymaga backendu** | Tak (dla szybszej transkrypcji) | Tylko dla PPTX |
| **Offline** | Tak (tryb browser-only) | Tak (PDF), Nie (PPTX) |
| **Rozmiar pliku** | Duży (10-100 MB) | Mały (1-10 MB) |
| **Kiedy używać** | Nagranie wykładu, rozmowy | Slajdy, dokumenty, materiały |

---

## 🎬 Video tutorial (konceptualny)

### Część 1: Import PDF (2 min)
```
0:00 - Wprowadzenie
0:15 - Wybór przedmiotu
0:30 - Przełączenie na tryb dokumentów
0:45 - Wgranie PDF
1:00 - Ekstrakcja tekstu (demo)
1:30 - Auto-generowanie tytułu
1:45 - Zapis wykładu
```

### Część 2: Import PowerPoint (3 min)
```
0:00 - Wprowadzenie
0:20 - Uruchomienie backendu
0:40 - Wgranie PPTX
1:00 - Przetwarzanie na serwerze
1:30 - Podgląd wyekstrahowanego tekstu
2:00 - Generowanie fiszek
2:30 - Generowanie quizu
```

### Część 3: Praktyczny przykład (5 min)
```
0:00 - Scenariusz: Egzamin za 2 dni
0:30 - Import 3 prezentacji
2:00 - Generowanie notatek
3:00 - Tworzenie fiszek
4:00 - Quiz i sprawdzenie wiedzy
```

---

## 📞 Pomoc

### Problem: "Nie mogę wgrać PDF"
**Rozwiązanie:**
- Sprawdź rozmiar (max 50 MB)
- Sprawdź czy to prawidłowy PDF
- Spróbuj w innej przeglądarce

### Problem: "PowerPoint nie działa"
**Rozwiązanie:**
```bash
# Sprawdź backend
npm run server

# Sprawdź status
curl http://localhost:3001/health

# Sprawdź logi
# Zobacz terminal z backendem
```

### Problem: "Brak tekstu w PDF"
**Rozwiązanie:**
- PDF może zawierać tylko obrazy (skany)
- Użyj narzędzia OCR (np. Adobe Acrobat)
- Przekonwertuj do tekstu przed importem

---

## 🎉 Podsumowanie

Nowa funkcja dokumentów otwiera mnóstwo możliwości:
- ✅ Notatki bez nagrania audio
- ✅ Szybsze przetwarzanie (sekundy zamiast minut)
- ✅ Łatwiejsze udostępnianie materiałów
- ✅ Większa elastyczność w nauce

**Happy learning!** 🚀
