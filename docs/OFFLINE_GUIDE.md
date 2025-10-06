# 🚀 Student Assistant - Tryb Offline z Qwen

## ✅ System jest skonfigurowany do pracy offline!

### 📋 Co działa offline:

1. **Frontend** - Pełny interfejs użytkownika
2. **Backend** - Lokalny serwer Node.js (port 3001)
3. **Whisper** - Transkrypcja audio (modele local)
4. **Qwen 2.5:14b** - Generowanie tytułów i notatek (przez Ollama)
5. **PDF** - Ekstrakcja tekstu (działa w przeglądarce)
6. **PowerPoint** - Ekstrakcja tekstu (przez backend)

---

## 🎯 Szybki start (3 komendy)

```bash
# Terminal 1: Ollama (Qwen)
ollama serve

# Terminal 2: Backend
cd server && npm start

# Terminal 3: Frontend
npm run dev
```

**Otwórz:** http://localhost:8000

---

## 🧪 Test systemu

Otwórz w przeglądarce:
```
http://localhost:8000/test-offline.html
```

Ten test automatycznie sprawdzi:
- ✅ Backend działa
- ✅ Ollama działa
- ✅ Qwen 2.5:14b jest dostępny
- ✅ Generowanie tytułów działa

---

## 🐛 Rozwiązywanie problemów

### Problem: "Przycisk Nowy wykład nie działa"

**Rozwiązanie:**
1. Otwórz konsolę przeglądarki (F12)
2. Sprawdź czy są błędy
3. Odśwież stronę (Cmd+R / Ctrl+R)
4. Sprawdź czy wszystkie serwery działają:

```bash
# Sprawdź frontend
curl http://localhost:8000

# Sprawdź backend
curl http://localhost:3001/health

# Sprawdź Ollama
curl http://localhost:11434/api/tags
```

### Problem: "Ollama nie działa"

```bash
# Uruchom Ollama
ollama serve

# Sprawdź czy Qwen jest zainstalowany
ollama list

# Jeśli nie ma, zainstaluj
ollama pull qwen2.5:14b
```

### Problem: "Backend nie odpowiada"

```bash
# Sprawdź czy port jest zajęty
lsof -i :3001

# Jeśli tak, zabij proces
kill -9 <PID>

# Uruchom ponownie
cd server && npm start
```

### Problem: "Generowanie tytułu trwa wiecznie"

**Przyczyny:**
- Qwen 2.5:14b potrzebuje ~15-30 sekund (to normalne!)
- Model jest duży (14 miliardów parametrów)
- Pierwsza generacja może trwać dłużej (ładowanie modelu)

**Rozwiązanie:**
- Poczekaj cierpliwie 30-60 sekund
- Lub użyj mniejszego modelu:

```bash
# Zainstaluj szybszy model
ollama pull phi3.5:3.8b

# W server/server.js zmień:
const model = 'phi3.5:3.8b'  // Zamiast qwen2.5:14b
```

---

## 📊 Porównanie modeli

| Model | Rozmiar | Szybkość | Jakość |
|-------|---------|----------|--------|
| phi3.5:3.8b | 2.3 GB | ⚡⚡⚡ Bardzo szybki (5-10s) | ⭐⭐⭐ Dobra |
| qwen2.5:14b | 9.0 GB | ⚡⚡ Średni (15-30s) | ⭐⭐⭐⭐⭐ Doskonała |
| llama3.1:8b | 4.7 GB | ⚡⚡ Średni (10-20s) | ⭐⭐⭐⭐ Bardzo dobra |

**Rekomendacja:** 
- **Qwen 2.5:14b** - Najlepsza jakość (używaj tego!)
- **phi3.5:3.8b** - Jeśli potrzebujesz szybkości
- **llama3.1:8b** - Dobry kompromis

---

## 🎓 Przykładowy workflow

### Scenariusz 1: Nagranie wykładu

```
1. Nowy wykład → Wybierz przedmiot
2. 🎤 Nagranie audio → Rozpocznij nagrywanie
3. Nagraj wykład (lub wgraj plik audio)
4. Zatrzymaj → Potwierdź transkrypcję
5. ⏳ Poczekaj ~2 minuty (transkrypcja)
6. ⏳ Poczekaj ~30 sekund (AI generuje tytuł)
7. Edytuj tytuł jeśli potrzebujesz
8. Zapisz wykład ✅
```

### Scenariusz 2: PDF/PowerPoint

```
1. Nowy wykład → Wybierz przedmiot
2. 📄 Dokument (PDF/PPT)
3. Wgraj PDF lub PPTX
4. ⏳ Poczekaj ~10 sekund (ekstrakcja)
5. ⏳ Poczekaj ~30 sekund (AI generuje tytuł)
6. Zapisz wykład ✅
```

### Scenariusz 3: Generowanie materiałów

```
1. Otwórz wykład
2. Kliknij zakładkę:
   - 📝 Notatki → Generuj z AI
   - 🎴 Fiszki → Generuj z AI
   - 📝 Quiz → Generuj z AI
3. ⏳ Poczekaj ~30-60 sekund (Qwen generuje)
4. Gotowe! Ucz się! 🎉
```

---

## ⚡ Optymalizacja

### Przyspieszenie Qwen

1. **Używaj GPU** (jeśli masz):
   ```bash
   # Ollama automatycznie wykrywa GPU
   # Na M4 Pro używa Metal (już skonfigurowane!)
   ```

2. **Zwiększ limity pamięci**:
   ```bash
   # W ~/.ollama/config.json
   {
     "gpu_layers": 99,
     "context_size": 4096
   }
   ```

3. **Pre-load model**:
   ```bash
   # Załaduj Qwen przed użyciem aplikacji
   ollama run qwen2.5:14b "test"
   ```

---

## 📚 Dodatkowe informacje

### Gdzie są modele?

```bash
# Ollama models
~/.ollama/models/

# Whisper models
./public/models/Xenova/
```

### Ile miejsca zajmuje?

- **Qwen 2.5:14b**: ~9 GB
- **Whisper base**: ~142 MB
- **Whisper small**: ~466 MB
- **Razem**: ~10 GB

### Czy mogę używać bez internetu?

✅ **TAK!** Po zainstalowaniu wszystkich modeli:
- Transkrypcja: 100% offline
- Generowanie tytułów: 100% offline (Qwen local)
- Ekstrakcja PDF: 100% offline (PDF.js w przeglądarce)
- Ekstrakcja PPTX: wymaga backendu (local, offline)

---

## 🎉 Podsumowanie

Twój system jest **w pełni funkcjonalny offline**:

✅ Backend działa (Node.js)  
✅ Ollama działa  
✅ Qwen 2.5:14b jest dostępny  
✅ Whisper jest gotowy  
✅ Frontend działa  

**Możesz teraz używać Student Assistant bez internetu!**

---

## 📞 Pomoc

Jeśli coś nie działa:
1. Sprawdź http://localhost:8000/test-offline.html
2. Zobacz logi w terminalu
3. Otwórz issue na GitHub
4. Sprawdź dokumentację: docs/TROUBLESHOOTING.md

**Happy offline learning!** 🚀
