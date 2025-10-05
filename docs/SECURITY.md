# 🔒 Security Policy

## Supported Versions

Obecnie wspieramy następujące wersje Student Assistant:

| Version | Supported          |
| ------- | ------------------ |
| 2.0.x   | ✅ Yes             |
| 1.0.x   | ❌ No (archived)   |

## 🐛 Reporting a Vulnerability

Jeśli znalazłeś lukę w bezpieczeństwie, **nie zgłaszaj jej publicznie przez GitHub Issues**.

### Jak zgłosić:

1. **Email**: Wyślij email na **himusuwu@gmail.com** z:
   - Opisem luki
   - Krokami do reprodukcji
   - Potencjalnym wpływem
   - Sugerowanym rozwiązaniem (jeśli masz)

2. **Subject**: `[SECURITY] Brief description of the issue`

3. **Encryption** (opcjonalnie): Jeśli chcesz, możesz zaszyfrować email używając PGP (klucz dostępny na request)

### Czego się spodziewać:

- **24h**: Potwierdzenie otrzymania
- **7 dni**: Wstępna ocena
- **30 dni**: Fix lub plan działania
- **Po fix**: Credit w CHANGELOG (jeśli chcesz)

### Hall of Fame 🏆

Lista osób które odpowiedzialnie zgłosiły luki (będzie aktualizowana):

<!-- Lista będzie tutaj -->

---

## 🛡️ Security Best Practices

### Dla użytkowników:

#### 1. **GitHub Token Security**

❌ **NIE RÓB TEGO:**
```javascript
// Hardcoded token w kodzie
const GITHUB_TOKEN = 'ghp_xxxxxxxxxxxxx';
```

✅ **RÓB TO:**
```javascript
// Token w .env (nigdy nie commituj!)
const GITHUB_TOKEN = process.env.GITHUB_TOKEN;
```

**Setup:**
```bash
# Skopiuj example
cp .env.example .env

# Edytuj .env i dodaj swój token
# GITHUB_TOKEN=ghp_your_token_here

# Upewnij się że .env jest w .gitignore
cat .gitignore | grep .env
```

#### 2. **Backend Security**

Jeśli eksponujesz backend publicznie:

```javascript
// server/server.js

// ✅ Rate limiting
const rateLimit = require('express-rate-limit');

const limiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 100 // max 100 requests per window per IP
});

app.use('/api/', limiter);

// ✅ CORS - tylko twoja domena
app.use(cors({
  origin: 'https://your-domain.com',
  methods: ['GET', 'POST']
}));

// ✅ Helmet.js dla bezpieczeństwa headers
const helmet = require('helmet');
app.use(helmet());
```

#### 3. **File Upload Validation**

Backend już ma podstawową walidację, ale dodaj więcej jeśli potrzebujesz:

```javascript
// Sprawdź rozmiar
if (file.size > 100 * 1024 * 1024) { // 100MB
  return res.status(400).json({ error: 'File too large' });
}

// Sprawdź typ
const allowedTypes = ['audio/wav', 'audio/mpeg', 'audio/aiff'];
if (!allowedTypes.includes(file.mimetype)) {
  return res.status(400).json({ error: 'Invalid file type' });
}
```

#### 4. **HTTPS in Production**

**Lokalne dev**: HTTP OK  
**Production**: TYLKO HTTPS

```nginx
# Nginx redirect HTTP -> HTTPS
server {
    listen 80;
    server_name your-domain.com;
    return 301 https://$server_name$request_uri;
}

server {
    listen 443 ssl http2;
    server_name your-domain.com;
    
    ssl_certificate /path/to/cert.pem;
    ssl_certificate_key /path/to/key.pem;
    
    # Modern SSL config
    ssl_protocols TLSv1.2 TLSv1.3;
    ssl_ciphers HIGH:!aNULL:!MD5;
    
    # ...rest of config
}
```

#### 5. **IndexedDB Security**

IndexedDB jest bezpieczny per-origin, ale:

- ❌ Nie przechowuj haseł/tokenów w plain text
- ✅ Używaj Web Crypto API dla szyfrowania jeśli potrzebujesz:

```javascript
// Przykład encryption (advanced)
async function encryptData(data, password) {
    const encoder = new TextEncoder();
    const key = await crypto.subtle.importKey(
        'raw',
        encoder.encode(password),
        'PBKDF2',
        false,
        ['deriveBits', 'deriveKey']
    );
    // ... rest of encryption logic
}
```

#### 6. **GitHub Sync Permissions**

Gdy tworzysz GitHub Personal Access Token:

✅ **Minimalne wymagane permissions:**
- `repo` (tylko jeśli repo jest prywatne)
- Lub `public_repo` (jeśli repo jest publiczne)

❌ **NIE DAWAJ:**
- `admin:org`
- `delete_repo`
- `admin:public_key`

#### 7. **Content Security Policy**

Dodaj CSP headers dla production:

```html
<!-- W student_assistant_app.html -->
<meta http-equiv="Content-Security-Policy" 
      content="default-src 'self'; 
               script-src 'self' 'unsafe-inline' https://cdn.jsdelivr.net https://esm.sh; 
               style-src 'self' 'unsafe-inline'; 
               connect-src 'self' https://api.github.com http://localhost:3001;">
```

---

## 🔍 Known Security Considerations

### 1. **Audio Files**

- Audio files nigdy nie są uploadowane do chmury (z wyjątkiem GitHub jeśli użytkownik wybierze sync)
- Transkrypcje są przetwarzane lokalnie (przeglądarka lub localhost backend)
- **Privacy**: 100% prywatny, offline-first

### 2. **GitHub Token**

- Token jest przechowywany w localStorage
- ⚠️ **Risk**: Jeśli ktoś ma fizyczny dostęp do komputera, może wyciągnąć token z localStorage
- 🛡️ **Mitigation**: Używaj tokenów z minimalnym scope i wygasaniem

### 3. **XSS Protection**

- Markdown rendering używa DOMPurify (od marked library)
- User input jest sanitized przed zapisem do DB
- ⚠️ **Zawsze validuj user input**

### 4. **Dependencies**

Regularne aktualizacje:

```bash
# Check for vulnerabilities
npm audit

# Fix automatically
npm audit fix

# Backend dependencies
cd server && npm audit
```

---

## 🚨 Security Incident Response Plan

Jeśli dojdzie do incydentu bezpieczeństwa:

1. **Containment** (0-24h):
   - Ocena skali problemu
   - Temporary mitigation jeśli możliwe
   - Komunikat dla użytkowników jeśli potrzebne

2. **Investigation** (1-7 days):
   - Root cause analysis
   - Sprawdzenie czy inne części są dotknięte
   - Dokumentacja incydentu

3. **Fix** (7-30 days):
   - Development i testing fix
   - Security review
   - Deployment

4. **Post-mortem** (po fix):
   - Publiczny raport (jeśli nie ma ryzyka)
   - Aktualizacja dokumentacji
   - Lessons learned

---

## 📚 Security Resources

- [OWASP Top 10](https://owasp.org/www-project-top-ten/)
- [Node.js Security Best Practices](https://nodejs.org/en/docs/guides/security/)
- [MDN Web Security](https://developer.mozilla.org/en-US/docs/Web/Security)
- [GitHub Security Best Practices](https://docs.github.com/en/code-security)

---

## 🙏 Acknowledgments

Dziękujemy wszystkim którzy odpowiedzialnie zgłaszają luki i pomagają uczynić Student Assistant bezpieczniejszym!

---

**Remember: Security is everyone's responsibility.** 🔒
