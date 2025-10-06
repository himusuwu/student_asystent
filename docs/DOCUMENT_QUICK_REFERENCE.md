# 🚀 Szybka instrukcja - Import dokumentów

## PDF

```
1. Nowy wykład
2. Kliknij: 📄 Dokument (PDF/PPT)
3. Kliknij: 📕 Wgraj PDF
4. Wybierz plik
5. Poczekaj na ekstrakcję
6. AI wygeneruje tytuł
7. Zapisz wykład ✅
```

**Czas:** ~30 sekund  
**Wymaga backendu:** NIE  
**Działa offline:** TAK

---

## PowerPoint (PPTX)

```
1. Uruchom backend: npm run server
2. Nowy wykład
3. Kliknij: 📄 Dokument (PDF/PPT)
4. Kliknij: 📊 Wgraj PowerPoint
5. Wybierz plik PPTX
6. Poczekaj na przetwarzanie
7. AI wygeneruje tytuł
8. Zapisz wykład ✅
```

**Czas:** ~1 minuta  
**Wymaga backendu:** TAK  
**Działa offline:** NIE

---

## Wspierane formaty

| Format | Rozmiar | Backend | Offline |
|--------|---------|---------|---------|
| PDF | max 50 MB | NIE | TAK |
| PPTX | max 50 MB | TAK | NIE |
| PPT (stary) | - | ❌ Nie obsługiwane | - |

---

## Generowanie materiałów

Po zapisaniu wykładu:

```
📝 Notatki → Generuj z AI
🎴 Fiszki → Generuj z AI  
📝 Quiz → Generuj z AI
🎯 Kluczowe punkty → Generuj z AI
```

---

## Rozwiązywanie problemów

### PDF nie działa
- Sprawdź rozmiar (max 50 MB)
- PDF musi zawierać tekst (nie tylko obrazy)
- Spróbuj inną przeglądarkę

### PowerPoint nie działa
```bash
# Sprawdź backend
npm run server

# Test
curl http://localhost:3001/health
```

### Brak tekstu
- PDF może być skanem (tylko obrazy)
- Użyj OCR przed importem
- Upewnij się że dokument zawiera tekst

---

## Wsparcie

📖 Pełna dokumentacja: [DOCUMENT_SUPPORT.md](./DOCUMENT_SUPPORT.md)  
📚 Przykłady użycia: [DOCUMENT_EXAMPLES.md](./DOCUMENT_EXAMPLES.md)  
🐛 Problemy: [TROUBLESHOOTING.md](./TROUBLESHOOTING.md)
