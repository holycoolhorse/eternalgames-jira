# EternalGames Jira - Proje Yönetim Sistemi

Modern web teknolojileri ile geliştirilmiş Jira benzeri proje yönetim uygulaması.

## 🚀 Özellikler

### 👥 Kullanıcı Yönetimi
- **Roller**: Admin, Üye, Okuyucu
- **JWT Tabanlı Kimlik Doğrulama**
- **Maksimum 10 kullanıcı lisansı**
- **Kullanıcı profil yönetimi**

### 📊 Proje & Görev Yönetimi
- **Proje oluşturma ve yönetimi**
- **Görev türleri**: Task (Görev), Bug (Hata)
- **Öncelik seviyeleri**: Yüksek, Orta, Düşük
- **Durum takibi**: Yapılacak → Devam Ediyor → Tamamlandı
- **Kanban board görünümü**
- **Sürükle-bırak işlevselliği**

### 💬 İletişim & İşbirliği
- **Markdown destekli yorumlar**
- **@mention özelliği**
- **Dosya ekleri** (5MB limit, maks. 3 dosya)
- **E-posta bildirimleri**
- **Uygulama içi bildirimler**

### 📱 Responsive Tasarım
- **Mobile-first yaklaşım**
- **Tüm cihaz boyutlarına uyum**
- **Modern ve kullanıcı dostu arayüz**

### 📈 Raporlama
- **Proje istatistikleri**
- **Görev durum raporları**
- **CSV export**
- **Performans takibi**

## 🛠 Teknoloji Stack

### Frontend
- **React 18** - Modern UI library
- **Vite** - Hızlı build tool
- **TailwindCSS** - Utility-first CSS framework
- **React Router** - Client-side routing
- **@dnd-kit** - Drag and drop functionality
- **Axios** - HTTP client
- **React Hot Toast** - Notifications

### Backend
- **Node.js** - JavaScript runtime
- **Express.js** - Web framework
- **SQLite** - Embedded database
- **JWT** - Authentication
- **bcryptjs** - Password hashing
- **Multer** - File uploads
- **Express Rate Limit** - Rate limiting

### Güvenlik
- **Helmet** - Security headers
- **CORS** - Cross-origin protection
- **Input validation** - Express validator
- **Rate limiting** - API protection
- **JWT authentication** - Secure auth

## 📦 Kurulum

### Gereksinimler
- Node.js 16+ 
- npm veya yarn

### 1. Repository'yi klonlayın
\`\`\`bash
git clone <repository-url>
cd EternalGamesJira
\`\`\`

### 2. Backend kurulumu
\`\`\`bash
cd backend
npm install
cp .env.example .env
# .env dosyasını düzenleyin
npm run dev
\`\`\`

### 3. Frontend kurulumu
\`\`\`bash
cd frontend
npm install
npm run dev
\`\`\`

### 4. Uygulamayı açın
- Frontend: http://localhost:5173
- Backend API: http://localhost:5000

## 🔧 Yapılandırma

### Backend (.env)
\`\`\`env
PORT=5000
NODE_ENV=development
FRONTEND_URL=http://localhost:5173
JWT_SECRET=your-super-secret-jwt-key
DB_PATH=./database.sqlite
\`\`\`

### Frontend (.env)
\`\`\`env
VITE_API_URL=http://localhost:5000/api
\`\`\`

## 🚀 Production Deployment

### Docker ile deploy
\`\`\`bash
# Root dizinde
docker build -t eternalgames-jira .
docker run -p 3000:3000 eternalgames-jira
\`\`\`

### Manuel deploy
1. Backend'i production modunda çalıştırın
2. Frontend'i build edin: \`npm run build\`
3. Build dosyalarını web server'a deploy edin

## 📝 API Endpoints

### Authentication
- \`POST /api/auth/register\` - Kullanıcı kaydı
- \`POST /api/auth/login\` - Giriş
- \`GET /api/auth/me\` - Kullanıcı bilgileri

### Projects
- \`GET /api/projects\` - Projeleri listele
- \`POST /api/projects\` - Proje oluştur
- \`GET /api/projects/:id\` - Proje detayı
- \`PUT /api/projects/:id\` - Proje güncelle
- \`DELETE /api/projects/:id\` - Proje sil

### Tasks
- \`GET /api/tasks/project/:projectId\` - Proje görevleri
- \`POST /api/tasks\` - Görev oluştur
- \`GET /api/tasks/:id\` - Görev detayı
- \`PUT /api/tasks/:id\` - Görev güncelle
- \`PATCH /api/tasks/:id/status\` - Görev durumu güncelle

## 🤝 Katkıda Bulunma

1. Fork edin
2. Feature branch oluşturun (\`git checkout -b feature/amazing-feature\`)
3. Commit edin (\`git commit -m 'Add amazing feature'\`)
4. Push edin (\`git push origin feature/amazing-feature\`)
5. Pull Request oluşturun

## 📄 Lisans

Bu proje MIT lisansı altında lisanslanmıştır.

## 🆘 Destek

Herhangi bir sorun yaşarsanız:
1. [Issues](https://github.com/your-repo/issues) bölümünde arama yapın
2. Yeni bir issue oluşturun
3. Detaylı açıklama ve hata mesajları ekleyin

## 🔄 Güncellemeler

### v1.0.0
- İlk sürüm
- Temel proje yönetimi özellikleri
- Kullanıcı kimlik doğrulama
- Kanban board
- Dosya yükleme
- Responsive tasarım
