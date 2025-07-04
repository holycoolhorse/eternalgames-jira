# Vercel Deployment Guide - EternalGames Jira

## Yaygın Vercel Hata Kodları ve Çözümleri

### 1. BUILD ERRORS (BUILD_UTILS_SPAWN_*)

#### `BUILD_UTILS_SPAWN_1` - Command not found
**Sebep:** Gerekli dependencies yüklenmemiş veya command bulunamıyor.

**Çözüm:**
```json
// vercel.json - Install komutu eklenmeli
{
  "builds": [
    {
      "src": "backend/server.js",
      "use": "@vercel/node"
    },
    {
      "src": "frontend/package.json",
      "use": "@vercel/static-build",
      "config": {
        "distDir": "dist"
      }
    }
  ]
}
```

#### `BUILD_UTILS_SPAWN_2` - Permission denied
**Sebep:** Dosya izinleri problemi.

**Çözüm:**
```bash
# Dosya izinlerini kontrol et
chmod +x backend/server.js
chmod +x frontend/package.json
```

### 2. FUNCTION ERRORS (FUNCTION_INVOCATION_*)

#### `FUNCTION_INVOCATION_FAILED` - Function crashed
**Sebep:** Backend kodunda runtime error.

**Çözümler:**
1. **Error Handling Güçlendirme:**
```javascript
// backend/server.js'e eklenecek
process.on('uncaughtException', (error) => {
  console.error('Uncaught Exception:', error);
  process.exit(1);
});

process.on('unhandledRejection', (reason, promise) => {
  console.error('Unhandled Rejection at:', promise, 'reason:', reason);
  process.exit(1);
});
```

2. **Database Connection Kontrolü:**
```javascript
// backend/config/database.js kontrol
const db = require('./config/database');

// Async/await ile proper error handling
const initializeApp = async () => {
  try {
    await db.initialize();
    console.log('Database initialized successfully');
  } catch (error) {
    console.error('Database initialization failed:', error);
    throw error;
  }
};
```

#### `FUNCTION_INVOCATION_TIMEOUT` - Function timeout
**Sebep:** Function 10 saniyede tamamlanmadı.

**Çözüm:**
```json
// vercel.json'a eklenecek
{
  "functions": {
    "backend/server.js": {
      "maxDuration": 30
    }
  }
}
```

### 3. ROUTING ERRORS

#### `DEPLOYMENT_NOT_FOUND` - Route not found
**Sebep:** Routes yanlış tanımlanmış.

**Mevcut Konfigürasyon Kontrolü:**
```json
// vercel.json - Şu anki konfigürasyon doğru
{
  "routes": [
    {
      "src": "/api/(.*)",
      "dest": "backend/server.js"
    },
    {
      "src": "/(.*)",
      "dest": "frontend/dist/$1"
    }
  ]
}
```

### 4. ENVIRONMENT VARIABLES

#### `MISSING_ENV_VARS` - Environment variables missing
**Vercel Dashboard'da Mutlaka Tanımlanmalı:**
```bash
# Production Environment Variables
NODE_ENV=production
JWT_SECRET=your-super-secret-jwt-key-here
EMAIL_USER=your-email@gmail.com
EMAIL_PASS=your-email-password
EMAIL_FROM=your-email@gmail.com
FRONTEND_URL=https://your-vercel-app.vercel.app
```

### 5. STATIC FILE ERRORS

#### `STATIC_FILE_NOT_FOUND` - Static files missing
**Sebep:** Frontend build dizini yanlış.

**Çözüm:**
```json
// frontend/vite.config.js kontrol
import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

export default defineConfig({
  plugins: [react()],
  build: {
    outDir: 'dist',
    assetsDir: 'assets'
  }
})
```

### 6. MEMORY ERRORS

#### `FUNCTION_INVOCATION_MEMORY_EXCEEDED` - Memory limit exceeded
**Sebep:** Function 1024MB memory limitini aştı.

**Çözüm:**
```json
// vercel.json'a eklenecek
{
  "functions": {
    "backend/server.js": {
      "memory": 1024
    }
  }
}
```

### 7. CORS ERRORS

#### `CORS_ORIGIN_NOT_ALLOWED` - CORS policy violation
**Mevcut Konfigürasyon:**
```javascript
// backend/server.js - Şu anki konfigürasyon
app.use(cors({
  origin: process.env.NODE_ENV === 'production' ? true : [
    'http://localhost:5173',
    // ... diğer local portlar
  ],
  credentials: true
}));
```

**Production için düzenleme:**
```javascript
// Daha güvenli CORS konfigürasyonu
app.use(cors({
  origin: process.env.NODE_ENV === 'production' 
    ? ['https://your-app.vercel.app', process.env.FRONTEND_URL]
    : ['http://localhost:5173', 'http://localhost:5174'],
  credentials: true
}));
```

## Deployment Kontrol Listesi

### Ön Hazırlık
- [ ] Tüm dependencies yüklendi (`npm install`)
- [ ] Frontend build başarılı (`cd frontend && npm run build`)
- [ ] Backend local'de çalışıyor (`cd backend && npm start`)
- [ ] Environment variables hazırlandı

### Vercel Konfigürasyonu
- [ ] `vercel.json` dosyası mevcut
- [ ] Routes doğru tanımlanmış
- [ ] Build konfigürasyonu doğru
- [ ] Function settings optimized

### Environment Variables (Vercel Dashboard)
- [ ] `NODE_ENV=production`
- [ ] `JWT_SECRET` (güçlü bir secret)
- [ ] `EMAIL_USER` (SMTP kullanıcısı)
- [ ] `EMAIL_PASS` (SMTP şifresi)
- [ ] `EMAIL_FROM` (gönderen email)
- [ ] `FRONTEND_URL` (Vercel app URL'i)

### SQLite Database Uyarısı
⚠️ **Önemli:** Vercel'de SQLite dosyaları kalıcı değildir. Production için:
- **Önerilen:** Railway, PlanetScale, Supabase gibi managed database
- **Geçici:** Her deployment'ta database reset olacak

### Deployment Komutları
```bash
# Git commitleri kontrol et
git status
git add .
git commit -m "Fix: Vercel deployment optimizations"

# Vercel CLI ile deploy
npx vercel --prod

# Veya GitHub repo'dan otomatik deploy
git push origin main
```

## Deployment Sonrası Kontroller

### 1. Health Check
```bash
curl https://your-app.vercel.app/api/health
```

### 2. API Endpoints Test
```bash
# Login test
curl -X POST https://your-app.vercel.app/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"test@example.com","password":"password123"}'

# Tasks test
curl https://your-app.vercel.app/api/tasks \
  -H "Authorization: Bearer YOUR_JWT_TOKEN"
```

### 3. Frontend Test
- Ana sayfa açılıyor mu?
- Login çalışıyor mu?
- Kanban board yükleniyor mu?
- Drag & drop çalışıyor mu?

## Sık Karşılaşılan Sorunlar ve Çözümleri

### 1. Database Connection Error
**Hata:** `ENOENT: no such file or directory, open 'database.sqlite'`

**Çözüm:**
```javascript
// backend/config/database.js
const path = require('path');

const DB_PATH = process.env.NODE_ENV === 'production' 
  ? '/tmp/database.sqlite'  // Vercel temp directory
  : path.join(__dirname, '../database.sqlite');
```

### 2. File Upload Issues
**Hata:** Dosya upload çalışmıyor

**Çözüm:**
```javascript
// Vercel'de /tmp dizini kullan
const uploadPath = process.env.NODE_ENV === 'production' 
  ? '/tmp/uploads'
  : path.join(__dirname, '../uploads');
```

### 3. API Base URL Problems
**Hata:** Frontend API çağrıları 404 veriyor

**Çözüm:**
```javascript
// frontend/src/utils/api.js - kontrol et
const API_BASE_URL = import.meta.env.PROD 
  ? '/api'  // Production'da relative path
  : 'http://localhost:3000/api';
```

## Acil Durum Çözümleri

### 1. Deployment Geri Alma
```bash
# Vercel CLI ile önceki versiyona dön
vercel rollback
```

### 2. Logs Kontrol
```bash
# Vercel function logs
vercel logs --follow

# Veya Vercel dashboard'dan real-time logs
```

### 3. Local Debug
```bash
# Vercel dev environment
vercel dev

# Production build'i local test
npm run build
vercel --prod --local
```

## Performans Optimizasyonları

### 1. Bundle Size Optimization
```javascript
// frontend/vite.config.js
export default defineConfig({
  build: {
    rollupOptions: {
      output: {
        manualChunks: {
          vendor: ['react', 'react-dom'],
          utils: ['@dnd-kit/core', '@dnd-kit/sortable']
        }
      }
    }
  }
})
```

### 2. API Response Caching
```javascript
// backend/server.js
app.use((req, res, next) => {
  if (req.method === 'GET' && req.path.startsWith('/api/')) {
    res.set('Cache-Control', 'public, max-age=300'); // 5 dakika cache
  }
  next();
});
```

### 3. Rate Limiting Adjustment
```javascript
// Production için rate limiting artır
const limiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: process.env.NODE_ENV === 'production' ? 100 : 1000
});
```

Bu rehber ile Vercel deployment'ınızda karşılaşabileceğiniz tüm ana sorunları önceden tespit edip çözebilirsiniz.
