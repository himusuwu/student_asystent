# 🤝 Contributing to Student Assistant

Dziękujemy za zainteresowanie rozwojem Student Assistant! Ten dokument zawiera wytyczne jak wnieść swój wkład do projektu.

---

## 📋 Spis treści

- [Code of Conduct](#code-of-conduct)
- [Jak zacząć](#jak-zacząć)
- [Sposób zgłaszania błędów](#sposób-zgłaszania-błędów)
- [Sposób proponowania funkcji](#sposób-proponowania-funkcji)
- [Development workflow](#development-workflow)
- [Style guide](#style-guide)
- [Commit messages](#commit-messages)
- [Pull Request process](#pull-request-process)

---

## 📜 Code of Conduct

- **Bądź uprzejmy** - Szanuj innych kontrybutorów
- **Bądź konstruktywny** - Krytyka tak, ale zawsze z sugestiami
- **Bądź cierpliwy** - Wszyscy się uczymy
- **Bądź inkluzywny** - Każdy może wnieść wartość

---

## 🚀 Jak zacząć

### 1. Fork i clone

```bash
# Fork repo na GitHubie, następnie:
git clone https://github.com/YOUR_USERNAME/student_asystent.git
cd student_asystent
```

### 2. Setup środowiska

```bash
# Install dependencies
npm install
npm run install:server

# Skopiuj example env
cp .env.example .env

# Uruchom dev environment
npm start
```

### 3. Stwórz branch

```bash
git checkout -b feature/your-feature-name
# lub
git checkout -b fix/bug-description
```

---

## 🐛 Sposób zgłaszania błędów

### Przed zgłoszeniem:
1. Sprawdź [istniejące issues](https://github.com/himusuwu/student_asystent/issues)
2. Sprawdź [TROUBLESHOOTING.md](./TROUBLESHOOTING.md)
3. Upewnij się że używasz najnowszej wersji

### Szablon issue dla bugów:

```markdown
**Opis błędu:**
Jasny i konkretny opis co się stało.

**Kroki do reprodukcji:**
1. Idź do '...'
2. Kliknij na '...'
3. Scroll down do '...'
4. Zobacz błąd

**Oczekiwane zachowanie:**
Co powinno się stać?

**Screenshots:**
Jeśli możliwe, dodaj screenshoty.

**Środowisko:**
- OS: [np. macOS 14.0]
- Przeglądarka: [np. Chrome 120]
- Wersja Node.js: [np. 20.0.0]
- Wersja app: [np. 2.0.0]

**Dodatkowe informacje:**
Console errors, logi, itp.
```

---

## 💡 Sposób proponowania funkcji

### Przed propozycją:
1. Sprawdź [istniejące feature requests](https://github.com/himusuwu/student_asystent/issues?q=label%3Aenhancement)
2. Upewnij się że feature pasuje do celu projektu

### Szablon issue dla feature request:

```markdown
**Jaki problem rozwiązuje ta funkcja?**
Jasny opis problemu. Ex. "Zawsze jestem sfrustrowany gdy [...]"

**Proponowane rozwiązanie:**
Jasny opis jak to powinno działać.

**Alternatywy:**
Jakie inne rozwiązania rozważałeś?

**Mockupy/przykłady:**
Jeśli masz wizję UI, dodaj szkice/mockupy.

**Dodatkowe info:**
Cokolwiek innego istotnego.
```

---

## 🛠️ Development workflow

### Struktura projektu

```
student_asystent/
├── student_assistant_app.html  # Main frontend (single-file app)
├── server/                      # Backend (Express + Whisper)
│   ├── server.js               # Main server
│   └── package.json            # Server dependencies
├── models/                      # Whisper models (binary)
├── public/models/               # Browser models (transformers.js)
├── stare/                       # Archive (old React app)
└── docs/                        # Documentation
```

### Development commands

```bash
# Uruchom oba serwery (backend + frontend)
npm start

# Tylko backend (port 3001)
npm run server

# Tylko backend (dev mode z hot-reload)
npm run server:dev

# Tylko frontend (port 8000)
npm run frontend

# Zatrzymaj oba serwery
npm stop

# Check backend health
npm run check-backend
```

### Hot-reload podczas developmentu

- **Frontend**: Odśwież przeglądarkę po zmianach w `student_assistant_app.html`
- **Backend**: Użyj `npm run server:dev` dla auto-restart z nodemon

---

## 🎨 Style guide

### HTML/CSS

- **Indentacja**: 4 spacje
- **Class naming**: kebab-case (np. `subject-card`, `btn-primary`)
- **CSS organizacja**: Grupuj style logicznie
- **Mobile-first**: Responsywny design od mobile do desktop

### JavaScript

- **Style**: Modern ES6+
- **Indentacja**: 4 spacje
- **Semicolons**: Tak (zawsze)
- **Quotes**: Single quotes dla stringów ('example')
- **Functions**: Arrow functions dla callback, named functions dla głównej logiki
- **Async/await**: Preferuj nad `.then()`

**Przykład:**

```javascript
// ✅ Good
async function saveSubject(name, description) {
    try {
        const subject = {
            name: name.trim(),
            description: description.trim(),
            createdAt: new Date().toISOString()
        };
        
        await db.subjects.add(subject);
        showToast('Przedmiot zapisany!', 'success');
    } catch (error) {
        console.error('Save failed:', error);
        showToast('Błąd podczas zapisu', 'error');
    }
}

// ❌ Bad
function saveSubject(name,description){
  db.subjects.add({name:name,description:description,createdAt:new Date().toISOString()}).then(()=>{
    alert("Saved")
  }).catch((e)=>{console.log(e)})
}
```

### Commit messages

Format: `<type>(<scope>): <subject>`

**Types:**
- `feat`: Nowa funkcja
- `fix`: Bugfix
- `docs`: Zmiany w dokumentacji
- `style`: Formatowanie (bez zmian w kodzie)
- `refactor`: Refactoring kodu
- `perf`: Performance improvements
- `test`: Dodanie/poprawienie testów
- `chore`: Maintenance (dependencies, build, itp.)

**Przykłady:**

```bash
feat(transcription): add support for Portuguese language
fix(srs): correct SM-2 algorithm interval calculation
docs(readme): update installation instructions
style(ui): improve button hover animations
refactor(db): simplify IndexedDB schema migration
perf(whisper): optimize model loading time
chore(deps): update transformers.js to v2.18.0
```

**Zasady:**
- Używaj present tense ("add" nie "added")
- Imperative mood ("move" nie "moves")
- Nie kończy kropką
- Max 72 znaki w subject
- Body commit message - jeśli potrzebne (po pustej linii)

---

## 🔄 Pull Request process

### 1. Przed PR

- [ ] Kod działa lokalnie bez błędów
- [ ] Kod jest zgodny ze style guide
- [ ] Dodałeś/zaktualizowałeś dokumentację (jeśli potrzebne)
- [ ] Commit messages są zgodne z konwencją
- [ ] Branch jest up-to-date z `main`

```bash
# Update branch
git fetch origin
git rebase origin/main
```

### 2. Stwórz PR

**Tytuł PR:** Taki sam jak główny commit message

**Opis PR:**

```markdown
## What does this PR do?
Brief description of changes.

## Why is this needed?
Context and motivation.

## How was it tested?
- [ ] Tested locally
- [ ] Tested in production-like environment
- [ ] Added/updated tests (if applicable)

## Screenshots (if applicable)
Add before/after screenshots for UI changes.

## Related issues
Closes #123
Fixes #456
```

### 3. Review process

- **CI checks**: Muszą przejść (jeśli skonfigurowane)
- **Code review**: Minimum 1 approving review
- **Zmiany**: Jeśli reviewer prosi o zmiany, commituj do tego samego brancha
- **Merge**: Po approval, maintainer zmerge'uje

---

## 🧪 Testing (TODO: do implementacji)

Aktualnie projekt nie ma automatycznych testów. To jest obszar który potrzebuje pomocy!

### Proponowane testy do dodania:

```javascript
// Example: IndexedDB tests
describe('Database', () => {
    it('should create a new subject', async () => {
        const subject = { name: 'Math', description: 'Test' };
        const id = await db.subjects.add(subject);
        expect(id).toBeDefined();
    });
});

// Example: SRS algorithm tests
describe('SRS SM-2', () => {
    it('should calculate correct intervals', () => {
        const card = { easeFactor: 2.5, repetition: 0, interval: 0 };
        const result = updateCard(card, 4); // quality 4
        expect(result.interval).toBe(1);
    });
});
```

**Pomóż nam dodać:**
- Unit tests (Jest/Vitest)
- Integration tests
- E2E tests (Playwright/Cypress)

---

## 📚 Przydatne zasoby

### Dokumentacja projektu:
- [README.md](./README.md) - Główna dokumentacja
- [FRONTEND.md](./FRONTEND.md) - Frontend architecture
- [BACKEND_SETUP.md](./BACKEND_SETUP.md) - Backend setup
- [DEPLOYMENT.md](./DEPLOYMENT.md) - Deployment guide
- [TROUBLESHOOTING.md](./TROUBLESHOOTING.md) - Common issues

### External docs:
- [Transformers.js](https://huggingface.co/docs/transformers.js) - Whisper w przeglądarce
- [IndexedDB API](https://developer.mozilla.org/en-US/docs/Web/API/IndexedDB_API) - Database
- [SM-2 Algorithm](https://www.supermemo.com/en/blog/application-of-a-computer-to-improve-the-results-obtained-in-working-with-the-supermemo-method) - SRS

---

## 💬 Komunikacja

- **Issues**: Główna komunikacja o bugach i features
- **Discussions**: Pytania i ogólne dyskusje (jeśli włączone)
- **Email**: [himusuwu@gmail.com] - Dla prywatnych kwestii

---

## 🏆 Kontrybutorzy

Dziękujemy wszystkim którzy wnieśli wkład! 🎉

<!-- Automated contributors list -->
<!-- Contributors will be listed here automatically -->

---

## 📄 Licencja

Wnosząc kod do Student Assistant, zgadzasz się że Twój wkład będzie licencjonowany pod [MIT License](./LICENSE).

---

**Dziękujemy za pomoc w rozwoju Student Assistant!** 🚀

Masz pytania? Otwórz issue lub skontaktuj się z maintainerami.
