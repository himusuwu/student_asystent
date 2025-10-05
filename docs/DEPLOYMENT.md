# 🚀 Deployment - Student Assistant

Przewodnik po wdrożeniu aplikacji Student Assistant na różne platformy.

---

## 📋 Przegląd opcji deployment

| Platforma | Frontend | Backend | Trudność | Koszt |
|-----------|----------|---------|----------|-------|
| **Lokalne użycie** | ✅ | ✅ | 🟢 Łatwe | 💚 Darmowe |
| **GitHub Pages** | ✅ | ❌ | 🟢 Łatwe | 💚 Darmowe |
| **Netlify** | ✅ | ❌ | 🟢 Łatwe | 💚 Darmowe |
| **Vercel** | ✅ | ⚠️ API Routes | 🟡 Średnie | 💚 Darmowe |
| **Railway** | ✅ | ✅ | 🟡 Średnie | 💛 $5/mies |
| **Heroku** | ✅ | ✅ | 🟡 Średnie | 💛 $7/mies |
| **VPS (DigitalOcean)** | ✅ | ✅ | 🔴 Trudne | 💛 $6/mies |

---

## 🏠 Opcja 1: Lokalne użycie (zalecane dla studentów)

### Zalety:
- ✅ 100% prywatności
- ✅ Działa offline
- ✅ Najszybsze
- ✅ Darmowe

### Setup:

1. **Sklonuj repo:**
```bash
git clone https://github.com/himusuwu/student_asystent.git
cd student_asystent
```

2. **Zainstaluj backend:**
```bash
npm run install:server
```

3. **Uruchom:**
```bash
npm start
```

4. **Otwórz:** http://localhost:8000/student_assistant_app.html

### Auto-start przy uruchomieniu systemu (opcjonalnie):

**macOS/Linux:**
```bash
# Dodaj do ~/.zshrc lub ~/.bashrc
alias student-assistant="cd /path/to/student_asystent && npm start"
```

**Windows:**
Stwórz plik `start.bat`:
```batch
cd C:\path\to\student_asystent
npm start
```

---

## 🌐 Opcja 2: GitHub Pages (tylko frontend)

### Krok 1: Przygotuj repo

```bash
git add .
git commit -m "Deploy frontend"
git push origin main
```

### Krok 2: Włącz GitHub Pages

1. Idź do **Settings** → **Pages**
2. Source: **Deploy from a branch**
3. Branch: `main` → folder: `/ (root)`
4. Kliknij **Save**

### Krok 3: Dostęp

Po 2-3 minutach:
```
https://himusuwu.github.io/student_asystent/student_assistant_app.html
```

### ⚠️ Ograniczenia:
- ❌ Brak backendu (tylko transkrypcja w przeglądarce)
- ❌ Wolniejsza transkrypcja
- ✅ Wszystko inne działa normalnie

---

## 🎨 Opcja 3: Netlify (tylko frontend)

### Metoda A: Drag & Drop

1. Idź na [netlify.com](https://netlify.com)
2. Przeciągnij folder projektu
3. Gotowe!

### Metoda B: Git Integration

1. Połącz z GitHub repo
2. Ustawienia build:
   - Build command: (puste)
   - Publish directory: `/`
3. Deploy

### Custom domain (opcjonalnie):

1. Netlify Dashboard → **Domain settings**
2. Dodaj swój domain
3. Zaktualizuj DNS

**Przykład:** https://student-assistant.netlify.app/student_assistant_app.html

---

## ⚡ Opcja 4: Vercel (frontend + backend jako API)

### Struktur dla Vercel:

```
student_asystent/
├── student_assistant_app.html  # Frontend
├── api/                         # Backend jako Serverless Functions
│   └── transcribe.js            # Port z server.js
└── vercel.json                  # Config
```

### vercel.json:

```json
{
  "version": 2,
  "builds": [
    {
      "src": "student_assistant_app.html",
      "use": "@vercel/static"
    },
    {
      "src": "api/**/*.js",
      "use": "@vercel/node"
    }
  ],
  "routes": [
    {
      "src": "/api/(.*)",
      "dest": "/api/$1"
    }
  ]
}
```

### Deploy:

```bash
npm install -g vercel
vercel login
vercel
```

**URL:** https://student-asystent.vercel.app

### ⚠️ Ograniczenia:
- Serverless functions mają limit 10s execution (za mało dla długich transkrypcji)
- Lepiej dla małych audio (<2 min)

---

## 🚂 Opcja 5: Railway (full stack)

### Krok 1: Stwórz railway.toml

```toml
[build]
builder = "NIXPACKS"

[deploy]
startCommand = "npm start"
restartPolicyType = "ON_FAILURE"
restartPolicyMaxRetries = 10

[[services]]
name = "backend"
source = "server"
```

### Krok 2: Deploy

```bash
npm install -g @railway/cli
railway login
railway init
railway up
```

### Krok 3: Environment Variables

W Railway Dashboard dodaj:
```
NODE_ENV=production
PORT=3001
```

**URL:** https://student-asystent.up.railway.app

---

## 🔵 Opcja 6: Heroku (full stack)

### Krok 1: Stwórz Procfile

```
web: npm start
```

### Krok 2: Deploy

```bash
heroku login
heroku create student-asystent
git push heroku main
```

### Krok 3: Config

```bash
heroku config:set NODE_ENV=production
heroku ps:scale web=1
```

**URL:** https://student-asystent.herokuapp.com

---

## 🖥️ Opcja 7: VPS (DigitalOcean, Linode, AWS EC2)

### Setup na Ubuntu 22.04:

```bash
# 1. Update system
sudo apt update && sudo apt upgrade -y

# 2. Install Node.js
curl -fsSL https://deb.nodesource.com/setup_20.x | sudo -E bash -
sudo apt install -y nodejs

# 3. Clone repo
git clone https://github.com/himusuwu/student_asystent.git
cd student_asystent

# 4. Install dependencies
npm run install:server

# 5. Install PM2 (process manager)
sudo npm install -g pm2

# 6. Start backend with PM2
cd server
pm2 start server.js --name student-backend

# 7. Start frontend with PM2
cd ..
pm2 start python3 --name student-frontend -- -m http.server 8000

# 8. Save PM2 config
pm2 save
pm2 startup

# 9. Install Nginx
sudo apt install nginx -y

# 10. Configure Nginx
sudo nano /etc/nginx/sites-available/student-assistant
```

### Nginx config:

```nginx
server {
    listen 80;
    server_name your-domain.com;

    # Frontend
    location / {
        proxy_pass http://localhost:8000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_cache_bypass $http_upgrade;
    }

    # Backend API
    location /api/ {
        proxy_pass http://localhost:3001/;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_cache_bypass $http_upgrade;
        
        # CORS
        add_header Access-Control-Allow-Origin *;
        add_header Access-Control-Allow-Methods "GET, POST, OPTIONS";
    }
}
```

### Enable Nginx:

```bash
sudo ln -s /etc/nginx/sites-available/student-assistant /etc/nginx/sites-enabled/
sudo nginx -t
sudo systemctl restart nginx
```

### SSL z Let's Encrypt (opcjonalnie):

```bash
sudo apt install certbot python3-certbot-nginx -y
sudo certbot --nginx -d your-domain.com
```

**URL:** https://your-domain.com

---

## 🐳 Opcja 8: Docker (najłatwiejszy deployment na VPS)

### Dockerfile:

```dockerfile
# Multi-stage build
FROM node:20-alpine AS backend
WORKDIR /app/server
COPY server/package*.json ./
RUN npm ci --only=production
COPY server/ ./

FROM python:3.11-alpine AS frontend
WORKDIR /app
COPY student_assistant_app.html ./
COPY public/ ./public/
COPY models/ ./models/

FROM nginx:alpine
COPY --from=backend /app/server /app/server
COPY --from=frontend /app /usr/share/nginx/html

# Install Node.js in Nginx image
RUN apk add --no-cache nodejs npm

# Nginx config
COPY nginx.conf /etc/nginx/nginx.conf

# Start script
COPY start.sh /start.sh
RUN chmod +x /start.sh

EXPOSE 80 3001

CMD ["/start.sh"]
```

### docker-compose.yml:

```yaml
version: '3.8'

services:
  backend:
    build: ./server
    ports:
      - "3001:3001"
    environment:
      - NODE_ENV=production
    restart: unless-stopped

  frontend:
    image: nginx:alpine
    volumes:
      - ./student_assistant_app.html:/usr/share/nginx/html/index.html
      - ./public:/usr/share/nginx/html/public
      - ./models:/usr/share/nginx/html/models
    ports:
      - "8000:80"
    depends_on:
      - backend
    restart: unless-stopped
```

### Deploy:

```bash
docker-compose up -d
```

**Dostęp:** http://localhost:8000

---

## 📱 Opcja 9: Progressive Web App (PWA)

### Dodaj Service Worker:

**sw.js:**
```javascript
const CACHE_NAME = 'student-assistant-v1';
const urlsToCache = [
  '/student_assistant_app.html',
  '/public/models/',
  // ... inne zasoby
];

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then((cache) => cache.addAll(urlsToCache))
  );
});

self.addEventListener('fetch', (event) => {
  event.respondWith(
    caches.match(event.request)
      .then((response) => response || fetch(event.request))
  );
});
```

### manifest.json:

```json
{
  "name": "Student Assistant",
  "short_name": "StudyFlow",
  "description": "AI-powered learning tool",
  "start_url": "/student_assistant_app.html",
  "display": "standalone",
  "background_color": "#0f0f1e",
  "theme_color": "#6366f1",
  "icons": [
    {
      "src": "/icon-192.png",
      "sizes": "192x192",
      "type": "image/png"
    },
    {
      "src": "/icon-512.png",
      "sizes": "512x512",
      "type": "image/png"
    }
  ]
}
```

### Dodaj do HTML:

```html
<link rel="manifest" href="/manifest.json">
<script>
  if ('serviceWorker' in navigator) {
    navigator.serviceWorker.register('/sw.js');
  }
</script>
```

---

## 🔒 Bezpieczeństwo w production

### 1. Environment Variables

**NIE COMMITUJ** tokenów i secrets!

```bash
# .env (dodaj do .gitignore)
GITHUB_TOKEN=ghp_xxxxx
OPENAI_API_KEY=sk-xxxxx
```

### 2. HTTPS

Zawsze używaj HTTPS w production:
- Let's Encrypt (darmowe)
- Cloudflare (darmowe + CDN)

### 3. Rate Limiting

Dodaj do backendu:

```javascript
const rateLimit = require('express-rate-limit');

const limiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minut
  max: 100 // max 100 requests per window
});

app.use('/api/', limiter);
```

### 4. CORS

```javascript
const cors = require('cors');

app.use(cors({
  origin: 'https://your-domain.com',
  methods: ['GET', 'POST']
}));
```

---

## 📊 Monitoring

### Opcja A: PM2 Monitoring (darmowe)

```bash
pm2 monitor
```

### Opcja B: Sentry (darmowe tier)

```javascript
import * as Sentry from "@sentry/browser";

Sentry.init({
  dsn: "https://xxx@sentry.io/xxx",
  integrations: [new Sentry.BrowserTracing()],
  tracesSampleRate: 1.0,
});
```

---

## 🎯 Zalecenia

### Dla studentów (użytek osobisty):
→ **Lokalne użycie** (Opcja 1)

### Dla małej grupy (kilka osób):
→ **Railway** lub **Heroku** (Opcja 5/6)

### Dla publicznej dystrybucji:
→ **VPS + Docker** (Opcja 7/8)

### Tylko frontend (demo):
→ **GitHub Pages** lub **Netlify** (Opcja 2/3)

---

## 🆘 Troubleshooting

### Build fails on Railway/Heroku

Sprawdź:
```bash
node --version  # Powinno być 18+
npm --version
```

Dodaj do package.json:
```json
"engines": {
  "node": ">=18.0.0",
  "npm": ">=9.0.0"
}
```

### CORS errors in production

Zaktualizuj backend CORS config o production URL.

### Models not loading

Upewnij się że folder `/models` jest wdrożony i dostępny publicznie.

---

**Powodzenia z deploymentem!** 🚀
