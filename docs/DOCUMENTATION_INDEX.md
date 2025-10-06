# 📚 Documentation Index - Student Assistant

Kompletny indeks całej dokumentacji projektu Student Assistant.

---

## 🚀 Dla użytkowników

### Pierwsze kroki

| Dokument | Opis | Czas czytania |
|----------|------|---------------|
| [**README.md**](./README.md) | Główna dokumentacja, przegląd funkcji | 5 min |
| [**QUICK_START.md**](./QUICK_START.md) | Szybki przewodnik instalacji | 2 min |
| [**FAQ.md**](./FAQ.md) | Często zadawane pytania | 10 min |

### Konfiguracja i użytkowanie

| Dokument | Opis | Czas czytania |
|----------|------|---------------|
| [**FRONTEND.md**](./FRONTEND.md) | Frontend - jak używać interfejsu | 8 min |
| [**BACKEND_SETUP.md**](./BACKEND_SETUP.md) | Konfiguracja backendu | 5 min |
| [**DOCUMENT_SUPPORT.md**](./DOCUMENT_SUPPORT.md) | Obsługa PDF i PowerPoint - nowa funkcja! | 10 min |
| [**.env.example**](./.env.example) | Przykładowa konfiguracja zmiennych środowiskowych | 2 min |

### Deployment i hosting

| Dokument | Opis | Czas czytania |
|----------|------|---------------|
| [**DEPLOYMENT.md**](./DEPLOYMENT.md) | Kompletny przewodnik wdrożenia (GitHub Pages, Railway, Docker, VPS) | 15 min |

### Rozwiązywanie problemów

| Dokument | Opis | Czas czytania |
|----------|------|---------------|
| [**TROUBLESHOOTING.md**](./TROUBLESHOOTING.md) | Najczęstsze problemy i rozwiązania | 5 min |
| [**FAQ.md**](./FAQ.md) | Często zadawane pytania | 10 min |

---

## 🛠️ Dla developerów

### Zrozumienie projektu

| Dokument | Opis | Czas czytania |
|----------|------|---------------|
| [**ARCHITECTURE.md**](./ARCHITECTURE.md) | Szczegółowa architektura techniczna | 15 min |
| [**MIGRATION_NOTES.md**](./MIGRATION_NOTES.md) | Historia migracji v1 → v2 | 10 min |
| [**CHANGELOG.md**](./CHANGELOG.md) | Historia zmian i wersji | 5 min |

### Wkład w projekt

| Dokument | Opis | Czas czytania |
|----------|------|---------------|
| [**CONTRIBUTING.md**](./CONTRIBUTING.md) | Jak wnieść wkład - style guide, workflow | 10 min |
| [**CODE_OF_CONDUCT.md**](./CODE_OF_CONDUCT.md) | Kodeks postępowania społeczności | 3 min |
| [**ROADMAP.md**](./ROADMAP.md) | Plan rozwoju - przyszłe funkcje | 8 min |

### Bezpieczeństwo

| Dokument | Opis | Czas czytania |
|----------|------|---------------|
| [**SECURITY.md**](./SECURITY.md) | Polityka bezpieczeństwa, zgłaszanie luk | 8 min |

### Narzędzia i skrypty

| Plik | Opis | Użycie |
|------|------|--------|
| [**start.sh**](./start.sh) | Automatyczne uruchomienie backend + frontend | `npm start` |
| [**stop.sh**](./stop.sh) | Zatrzymanie serwerów | `npm stop` |
| [**check-backend.sh**](./check-backend.sh) | Sprawdzenie czy backend działa | `npm run check-backend` |
| [**download-whisper-tiny-onnx.sh**](./download-whisper-tiny-onnx.sh) | Pobieranie modeli Whisper | `npm run download-models` |

---

## 🎯 GitHub Templates

### Issue templates

| Template | Opis | Kiedy używać |
|----------|------|--------------|
| [**bug_report.md**](./.github/ISSUE_TEMPLATE/bug_report.md) | Szablon zgłaszania bugów | Znalazłeś błąd |
| [**feature_request.md**](./.github/ISSUE_TEMPLATE/feature_request.md) | Szablon propozycji funkcji | Masz pomysł na nową funkcję |
| [**config.yml**](./.github/ISSUE_TEMPLATE/config.yml) | Konfiguracja issue templates | - |

### Pull Request template

| Template | Opis | Kiedy używać |
|----------|------|--------------|
| [**PULL_REQUEST_TEMPLATE.md**](./.github/PULL_REQUEST_TEMPLATE.md) | Szablon PR | Wysyłasz Pull Request |

---

## ⚙️ Configuration files

| Plik | Opis | Dokumentacja |
|------|------|--------------|
| [**.editorconfig**](./.editorconfig) | Spójne formatowanie kodu | [EditorConfig.org](https://editorconfig.org) |
| [**.npmrc**](./.npmrc) | Konfiguracja npm | [npm docs](https://docs.npmjs.com/cli/v9/configuring-npm/npmrc) |
| [**.env.example**](./.env.example) | Przykład zmiennych środowiskowych | [BACKEND_SETUP.md](./BACKEND_SETUP.md) |
| [**.gitignore**](./.gitignore) | Pliki ignorowane przez git | - |
| [**package.json**](./package.json) | Metadane projektu, npm scripts | [npm docs](https://docs.npmjs.com/cli/v9/configuring-npm/package-json) |

---

## 📊 Statystyki dokumentacji

**Total documentation**: ~100KB text (22 plików)

**Breakdown**:
- 📄 **User documentation**: ~40KB (6 plików)
- 🛠️ **Developer documentation**: ~50KB (10 plików)
- ⚙️ **Configuration files**: ~5KB (4 pliki)
- 🎯 **Templates**: ~5KB (3 pliki)

**Lines of documentation**: ~3,000 linii

**Estimated read time**: ~2 godziny (cała dokumentacja)

---

## 🗺️ Ścieżki nauki

### Ścieżka 1: Użytkownik (student)

```
1. README.md (5 min)
   ↓
2. QUICK_START.md (2 min)
   ↓
3. Zainstaluj i uruchom
   ↓
4. FAQ.md (jeśli pytania)
   ↓
5. TROUBLESHOOTING.md (jeśli problemy)

Total: ~20 min
```

### Ścieżka 2: Developer (chce wnieść wkład)

```
1. README.md (5 min)
   ↓
2. ARCHITECTURE.md (15 min)
   ↓
3. CONTRIBUTING.md (10 min)
   ↓
4. Setup development environment
   ↓
5. Przeczytaj CODE_OF_CONDUCT.md (3 min)
   ↓
6. Wybierz task z ROADMAP.md
   ↓
7. Submit PR!

Total: ~1 godzina
```

### Ścieżka 3: DevOps (deployment)

```
1. README.md (5 min)
   ↓
2. ARCHITECTURE.md (15 min)
   ↓
3. DEPLOYMENT.md (15 min)
   ↓
4. BACKEND_SETUP.md (5 min)
   ↓
5. SECURITY.md (8 min)
   ↓
6. Deploy!

Total: ~1 godzina
```

### Ścieżka 4: Maintainer (full understanding)

```
Przeczytaj wszystko! (~2 godziny)
```

---

## 🔍 Szybkie wyszukiwanie

### Mam problem...

- ❓ Z instalacją → [QUICK_START.md](./QUICK_START.md)
- 🐛 Z uruchomieniem → [TROUBLESHOOTING.md](./TROUBLESHOOTING.md)
- 🎤 Z transkrypcją → [FAQ.md](./FAQ.md#transkrypcja)
- 🎴 Z fiszkami → [FAQ.md](./FAQ.md#fiszki)
- 🔄 Z GitHub sync → [FAQ.md](./FAQ.md#github-sync)
- 🚀 Z deploymentem → [DEPLOYMENT.md](./DEPLOYMENT.md)

### Chcę zrozumieć...

- 🏗️ Architekturę → [ARCHITECTURE.md](./ARCHITECTURE.md)
- 🎨 Frontend → [FRONTEND.md](./FRONTEND.md)
- 🔧 Backend → [BACKEND_SETUP.md](./BACKEND_SETUP.md)
- 🔒 Bezpieczeństwo → [SECURITY.md](./SECURITY.md)
- 📈 Plan rozwoju → [ROADMAP.md](./ROADMAP.md)

### Chcę pomóc...

- 🤝 Jak zacząć → [CONTRIBUTING.md](./CONTRIBUTING.md)
- 🐛 Zgłosić bug → [bug_report.md](./.github/ISSUE_TEMPLATE/bug_report.md)
- 💡 Zaproponować feature → [feature_request.md](./.github/ISSUE_TEMPLATE/feature_request.md)
- 📝 Wysłać PR → [PULL_REQUEST_TEMPLATE.md](./.github/PULL_REQUEST_TEMPLATE.md)

---

## 📞 Kontakt i pomoc

**Mam pytanie**:
1. Sprawdź [FAQ.md](./FAQ.md)
2. Sprawdź [TROUBLESHOOTING.md](./TROUBLESHOOTING.md)
3. Otwórz [Discussion](https://github.com/himusuwu/student_asystent/discussions)

**Znalazłem bug**:
1. Sprawdź [znane problemy](https://github.com/himusuwu/student_asystent/issues)
2. Użyj [bug report template](./.github/ISSUE_TEMPLATE/bug_report.md)

**Mam pomysł**:
1. Sprawdź [ROADMAP.md](./ROADMAP.md)
2. Użyj [feature request template](./.github/ISSUE_TEMPLATE/feature_request.md)

**Luka bezpieczeństwa**:
1. **NIE** otwieraj public issue
2. Email: himusuwu@gmail.com (zobacz [SECURITY.md](./SECURITY.md))

---

## 🎯 Dokumentacja według kategorii

### 📱 User Experience
- README.md
- QUICK_START.md
- FAQ.md
- FRONTEND.md

### ⚙️ Technical
- ARCHITECTURE.md
- BACKEND_SETUP.md
- DEPLOYMENT.md
- MIGRATION_NOTES.md

### 🤝 Community
- CONTRIBUTING.md
- CODE_OF_CONDUCT.md
- ROADMAP.md

### 🔒 Security & Legal
- SECURITY.md
- LICENSE

### 📊 Meta
- CHANGELOG.md
- TROUBLESHOOTING.md
- DOCUMENTATION_INDEX.md (ten dokument)

---

## 🔄 Aktualizacje dokumentacji

**Frequency**: Dokumentacja jest aktualizowana przy każdej wersji.

**Last major update**: v2.0.0 (Styczeń 2024)

**Contributors**: Zobacz [CONTRIBUTING.md](./CONTRIBUTING.md)

**Zgłoś błąd w dokumentacji**: Otwórz [issue](https://github.com/himusuwu/student_asystent/issues) z tagiem `documentation`

---

## 📦 Offline Access

Cała dokumentacja jest dostępna offline:

```bash
# Klonuj repo
git clone https://github.com/himusuwu/student_asystent.git

# Dokumentacja jest w folderze głównym
cd student_asystent
ls *.md

# Czytaj w terminalu
cat README.md

# Lub otwórz w edytorze
code .
```

---

## 🌍 Tłumaczenia (Future)

Obecnie dokumentacja jest dostępna tylko po polsku i angielsku.

Chcesz pomóc w tłumaczeniu? Zobacz [CONTRIBUTING.md](./CONTRIBUTING.md).

Planowane języki:
- 🇬🇧 English (partial)
- 🇵🇱 Polski (complete)
- 🇪🇸 Español (future)
- 🇩🇪 Deutsch (future)
- 🇫🇷 Français (future)

---

## 📚 External Resources

### AI/ML
- [Transformers.js Docs](https://huggingface.co/docs/transformers.js)
- [Whisper Model Card](https://huggingface.co/openai/whisper-base)
- [SM-2 Algorithm](https://www.supermemo.com/en/blog/application-of-a-computer-to-improve-the-results-obtained-in-working-with-the-supermemo-method)

### Web APIs
- [IndexedDB API](https://developer.mozilla.org/en-US/docs/Web/API/IndexedDB_API)
- [Web Audio API](https://developer.mozilla.org/en-US/docs/Web/API/Web_Audio_API)
- [MediaRecorder API](https://developer.mozilla.org/en-US/docs/Web/API/MediaRecorder)

### Development
- [Node.js Docs](https://nodejs.org/docs)
- [Express.js Guide](https://expressjs.com/en/guide/routing.html)
- [GitHub API](https://docs.github.com/en/rest)

---

**Maintained by**: Student Assistant Team  
**Last updated**: January 2024

**Happy reading!** 📚✨
