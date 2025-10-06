# 📚 Student Assistant v2.3 - OFFLINE MODE

> **Pełna funkcjonalność offline z Qwen 2.5:14b!**

## 🚀 Szybki start (1 komenda)

```bash
npm run start:offline
```

System automatycznie uruchomi:
- ✅ Ollama + Qwen 2.5:14b (AI offline)
- ✅ Backend (transkrypcja + dokumenty)
- ✅ Frontend (interfejs)

**Otwórz:** http://localhost:8000

---

## ✨ Co działa offline?

| Funkcja | Status | Czas |
|---------|--------|------|
| 🎤 Transkrypcja audio (Whisper) | ✅ Offline | 2-5 min |
| 📄 Ekstrakcja PDF | ✅ Offline | 10-30 sek |
| 📊 Ekstrakcja PowerPoint | ✅ Offline (backend) | 10-30 sek |
| 🤖 Generowanie tytułów (Qwen) | ✅ Offline | 15-30 sek |
| 📝 Generowanie notatek (Qwen) | ✅ Offline | 30-60 sek |
| 🎴 Generowanie fiszek (Qwen) | ✅ Offline | 30-60 sek |
| 📝 Generowanie quizów (Qwen) | ✅ Offline | 30-60 sek |

**🎉 Wszystko działa bez internetu po zainstalowaniu modeli!**

---

## 🧪 Test systemu

```bash
npm run test:offline
```

Lub otwórz: http://localhost:8000/test-offline.html

---

## 📖 Pełna dokumentacja

- 📘 [Przewodnik Offline](./docs/OFFLINE_GUIDE.md) - Kompletny setup i troubleshooting
- 📄 [Obsługa dokumentów](./docs/DOCUMENT_SUPPORT.md) - PDF i PowerPoint
- 🎬 [Przykłady użycia](./docs/DOCUMENT_EXAMPLES.md) - Scenariusze
- 🔧 [Backend Setup](./docs/BACKEND_SETUP.md) - Konfiguracja
- ❓ [FAQ](./docs/FAQ.md) - Częste pytania

---

## 🎯 Komfortowy workflow

### 1. Uruchom system (raz na sesję)
```bash
npm run start:offline
```

### 2. Użyj aplikacji
- **Nowy wykład** → Nagraj audio lub wgraj PDF/PPT
- **AI generuje** → Tytuł automatycznie (~30 sek)
- **Zapisz** → Wykład gotowy!
- **Generuj materiały** → Notatki, fiszki, quiz (~1 min)

### 3. Ucz się offline! 🎓

---

## ⚙️ Wymagania

### Wymagane:
- **Node.js** 18+ (backend + frontend)
- **Python 3** (frontend server)
- **Ollama** (AI offline)
- **Qwen 2.5:14b** model (~9 GB)

### Opcjonalne:
- Whisper models (tiny: 75MB, base: 142MB, small: 466MB)
- 16+ GB RAM (dla Qwen 14B)
- M1/M2/M3/M4 Mac (najszybsze, ale działa wszędzie)

---

## 💾 Instalacja modeli

### Qwen (AI - WYMAGANE)
```bash
ollama pull qwen2.5:14b
```

### Whisper (transkrypcja - opcjonalne)
```bash
npm run download-models
```

---

## 🐛 Problemy?

### "Przycisk nie działa"
```bash
# Odśwież stronę
Cmd+R lub Ctrl+R

# Sprawdź konsolę
F12 → Console
```

### "Qwen nie generuje"
```bash
# Sprawdź czy Ollama działa
curl http://localhost:11434/api/tags

# Jeśli nie, uruchom
ollama serve
```

### "Backend nie odpowiada"
```bash
# Sprawdź status
curl http://localhost:3001/health

# Jeśli nie działa, uruchom
cd server && npm start
```

---

## 📊 Porównanie modeli AI

| Model | RAM | Szybkość | Jakość | Użycie |
|-------|-----|----------|--------|--------|
| **qwen2.5:14b** | 12GB | 20-30s | ⭐⭐⭐⭐⭐ | Produkcja |
| llama3.1:8b | 8GB | 15-20s | ⭐⭐⭐⭐ | Alternatywa |
| phi3.5:3.8b | 4GB | 10-15s | ⭐⭐⭐ | Szybkość |

**Rekomendacja: Qwen 2.5:14b** (najlepsza jakość)

---

## 🎉 Enjoy offline learning!

**Happy learning without internet!** 🚀

---

## 🔗 Linki

- 🌐 GitHub: [student_asystent](https://github.com/himusuwu/student_asystent)
- 📚 Docs: [docs/](./docs/)
- 💬 Issues: [GitHub Issues](https://github.com/himusuwu/student_asystent/issues)

---

**Wersja:** 2.3.0  
**Data:** 6 października 2025  
**Licencja:** MIT
