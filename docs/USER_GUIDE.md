# 🎯 Jak używać Student Assistant - Kompletny przewodnik

## ✨ Wszystko działa przez przyciski - nie musisz wchodzić w konsolę F12!

---

## 📚 1. Dodawanie przedmiotu

### Krok po kroku:

1. **Otwórz aplikację**: http://localhost:8000
2. **Przejdź do zakładki "📚 Przedmioty"**
3. **Kliknij przycisk "+ Dodaj przedmiot"** (na górze)
4. **Wypełnij formularz w oknie popup:**
   - Nazwa przedmiotu (np. "Matematyka", "Fizyka")
   - Wybierz kolor (kliknij na kolorowe kółko)
5. **Kliknij "✅ Dodaj przedmiot"**

✅ **Gotowe!** Przedmiot jest dodany i widoczny w zakładce Przedmioty.

---

## 🎤 2. Nagrywanie i transkrypcja wykładu

### Krok po kroku:

1. **Przejdź do zakładki "✨ Nowy wykład"**
2. **Wybierz przedmiot** z listy (jeśli nie masz, najpierw dodaj przedmiot)
3. **Nagrywanie audio** (2 opcje):
   
   **Opcja A: Nagraj na żywo**
   - Kliknij "🎤 Rozpocznij nagrywanie"
   - Pozwól przeglądarce na dostęp do mikrofonu
   - Mów... (wykład jest nagrywany)
   - Kliknij "⏹ Zatrzymaj" gdy skończysz
   
   **Opcja B: Wgraj plik audio**
   - Kliknij "📁 Wgraj plik"
   - Wybierz plik audio z dysku (.mp3, .wav, .m4a, itp.)

4. **Transkrypcja automatyczna:**
   - Po nagraniu/wgraniu pojawi się progress bar
   - Whisper AI zamieni audio na tekst (może potrwać 1-2 min)
   - Transkrypcja pojawi się w polu tekstowym

5. **✨ Tytuł wykładu AUTOMATYCZNIE:**
   - Po transkrypcji AI **automatycznie wygeneruje tytuł** z pierwszych zdań!
   - Tytuł pojawi się w polu "✨ Tytuł wykładu (wygenerowany automatycznie)"
   - **Możesz go edytować** przed zapisaniem jeśli chcesz

6. **Dodaj notatki** (opcjonalnie):
   - Wpisz dodatkowe notatki w pole "Notatki"

7. **Kliknij "💾 Zapisz wykład"**

✅ **Gotowe!** Wykład jest zapisany z automatycznym tytułem i transkrypcją.

---

## 🎴 3. Dodawanie fiszki

### Krok po kroku:

1. **Przejdź do zakładki "🎴 Fiszki"**
2. **Kliknij przycisk "+ Dodaj fiszkę"** (na górze)
3. **Wypełnij formularz w oknie popup:**
   - **Przednia strona (pytanie)**: np. "Co to jest rekurencja?"
   - **Tylna strona (odpowiedź)**: np. "Funkcja która wywołuje samą siebie"
   - **Przedmiot**: Wybierz przedmiot z listy
4. **Kliknij "✅ Dodaj fiszkę"**

✅ **Gotowe!** Fiszka jest dodana i widoczna w zakładce Fiszki.

### Jak przeglądać fiszki:
- **Kliknij na fiszkę** aby ją obrócić i zobaczyć odpowiedź
- **Kliknij ponownie** aby wrócić do pytania

---

## 📊 4. Dashboard - przegląd postępów

### Co widzisz na Dashboard:

- **Statystyki:**
  - Liczba opanowanych fiszek
  - Liczba aktywnych przedmiotów
  - Średnia skuteczność
  - Streak (dni z rzędu)

- **Ostatnia aktywność:**
  - Ostatnie 3 wykłady
  - Kliknij na wykład aby go otworzyć

---

## 📖 5. Przeglądanie wykładów

### W zakładce "📖 Wykłady":

- **Lista wszystkich wykładów** z:
  - Automatycznie wygenerowanym tytułem
  - Nazwą przedmiotu
  - Datą utworzenia

- **Wyszukiwanie:**
  - Użyj pola "🔍 Szukaj wykładów..." na górze

- **Otwórz wykład:**
  - Kliknij przycisk "Otwórz" aby zobaczyć szczegóły

---

## ⚙️ 6. Ustawienia

### Zakładka "⚙️ Ustawienia":

**🎤 Transkrypcja (Whisper):**
- **Model**: Wybierz jakość transkrypcji
  - Tiny (szybki, 75MB) - podstawowa jakość
  - Base (optymalny, 142MB) - ⭐ **zalecany**
  - Small (dokładny, 466MB) - najlepsza jakość
- **Język**: Polski / Angielski / Auto-detect
- **Backend URL**: `http://localhost:3001` (dla szybszej transkrypcji)

**🔄 Synchronizacja GitHub:**
- Połącz z prywatnym repozytorium
- Automatyczny backup notatek (tylko tekst, nie audio)

**👤 Profil:**
- Ustaw swoją nazwę użytkownika

**Kliknij "💾 Zapisz ustawienia"** po zmianach.

---

## 🚀 Szybki start - kompletny flow

### Scenariusz: Nowy wykład z matematyki

1. **Dodaj przedmiot "Matematyka":**
   - Przedmioty → + Dodaj przedmiot → Wpisz "Matematyka" → Wybierz niebieski kolor → ✅

2. **Nagraj wykład:**
   - Nowy wykład → Wybierz "Matematyka" → 🎤 Rozpocznij nagrywanie → Mów 30 sekund → ⏹ Zatrzymaj

3. **AI wygeneruje tytuł automatycznie:**
   - Poczekaj na transkrypcję (1-2 min)
   - Tytuł pojawi się automatycznie (np. "Dzisiaj omawiamy pochodne funkcji...")
   - Możesz edytować: zmień na "Wprowadzenie do pochodnych"

4. **Zapisz wykład:**
   - 💾 Zapisz wykład

5. **Dodaj fiszkę:**
   - Fiszki → + Dodaj fiszkę
   - Przód: "Co to jest pochodna?"
   - Tył: "Miara szybkości zmiany funkcji"
   - Przedmiot: Matematyka
   - ✅ Dodaj fiszkę

6. **Sprawdź Dashboard:**
   - Dashboard → Zobacz statystyki (1 przedmiot, 1 fiszka)
   - Zobacz ostatnią aktywność (twój wykład)

✅ **Gotowe! Wszystko działa przez przyciski, zero konsoli F12!**

---

## 💡 Najważniejsze zmiany vs stara wersja

### ❌ STARA WERSJA (v1.x):
```javascript
// Musiałeś wchodzić do konsoli F12 i wpisywać:
createSubject('Matematyka', '#6366f1')
createFlashcard('...', '...', subjectId)
```

### ✅ NOWA WERSJA (v2.0):
- **Wszystko przez przyciski i formularze**
- **Okna popup zamiast prompt()**
- **Auto-generowanie tytułu wykładu z AI**
- **Toast notifications (zielone powiadomienia)**
- **Piękny, profesjonalny UI**

---

## 🐛 Troubleshooting

### Problem: Nie słyszę audio podczas nagrywania
**Rozwiązanie:** To normalne - audio jest nagrywane w tle, nie odtwarzane na żywo.

### Problem: Błąd "NetworkError when attempting to fetch resource"
**Rozwiązanie:** Model AI musi być pobrany z internetu przy pierwszym użyciu.
1. Sprawdź połączenie z internetem
2. W Settings → Tryb transkrypcji → "Tylko przeglądarka"
3. Lub uruchom backend: `npm run server`
4. Poczekaj 1-2 minuty przy pierwszej transkrypcji (pobieranie modelu)

👉 **[Pełny przewodnik rozwiązywania problemów](./TROUBLESHOOTING_TRANSCRIPTION.md)**

### Problem: Transkrypcja trwa bardzo długo
**Rozwiązanie:** 
1. Użyj mniejszego modelu (Tiny zamiast Base/Small) w Ustawieniach
2. Uruchom backend: `npm run server` - będzie szybciej
3. Nagraj krótszy fragment audio (test 10-30 sekund)

### Problem: Modals (okna popup) nie działają
**Rozwiązanie:**
1. Odśwież stronę (Ctrl+R / Cmd+R)
2. Sprawdź konsolę (F12) czy są błędy
3. Upewnij się że używasz `npm run dev` (nie otwieranie pliku bezpośrednio)

### Problem: Nie widzę swoich danych po odświeżeniu
**Rozwiązanie:** Dane są w IndexedDB - otwórz F12 → Application → IndexedDB → student-assistant

---

## 🎓 FAQ

**Q: Czy mogę edytować tytuł wykładu po transkrypcji?**  
A: Tak! Tytuł jest wygenerowany automatycznie, ale możesz go zmienić przed zapisaniem.

**Q: Co jeśli nie chcę nagrywać audio?**  
A: Możesz dodać wykład tylko z notatkami - tytuł zostanie wygenerowany z notatek.

**Q: Czy audio jest wysyłane do internetu?**  
A: Nie! Wszystko działa lokalnie w przeglądarce lub na localhost. Audio nigdy nie opuszcza twojego komputera.

**Q: Jak zmienić kolor przedmiotu?**  
A: Podczas dodawania przedmiotu kliknij na kolorowe kółko aby wybrać kolor.

**Q: Czy mogę eksportować notatki?**  
A: Funkcja eksportu będzie dostępna w przyszłej wersji. Na razie możesz używać GitHub sync.

---

## 📱 Skróty klawiszowe

- **Escape** - Zamknij otwarty modal
- **Enter** w formularzu - Zapisz (submit)
- **Tab** - Przełącz między polami formularza

---

## 🎉 Podsumowanie

### Teraz możesz:
✅ Dodawać przedmioty przez przycisk (nie konsola)  
✅ Nagrywać wykłady przez przycisk (nie konsola)  
✅ AI automatycznie generuje tytuł wykładu  
✅ Dodawać fiszki przez przycisk (nie konsola)  
✅ Wszystko działa przez piękny UI  
✅ Zero potrzeby wchodzenia w F12  

**Ciesz się nauką! 📚✨**

---

**Masz pytania?** Otwórz Issue na GitHub: https://github.com/himusuwu/student_asystent
