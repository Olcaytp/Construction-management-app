# 🚀 Supabase Geçişi - Başlangıç Kontrol Listesi

## 📋 Konfigürasyon Adımları

### 1️⃣ Supabase Projesi Kurulumu
- [ ] Supabase Dashboard'a giriş yap (https://app.supabase.com)
- [ ] Yeni proje oluştur: `insaat-takip`
- [ ] Proje oluşturulmasını bekle (5-10 dakika)
- [ ] Veritabanı başlatıldığını kontrol et

### 2️⃣ API Credentials
- [ ] Project URL'yi kopyala → `.env.local`
- [ ] Anon key'i kopyala → `.env.local`
- [ ] Service role key'i güvenli bir yerde sakla
- [ ] OpenAI API key oluştur → `.env.local`

### 3️⃣ Dosya Hazırlığı
```bash
# Projeyi klonla
git clone <repo-url>
cd insaat-takip

# .env.local oluştur
cp .env.example .env.local

# Valores doldur:
# VITE_SUPABASE_URL=...
# VITE_SUPABASE_PUBLISHABLE_KEY=...
# SUPABASE_SERVICE_ROLE_KEY=... (import-data için)
# OPENAI_API_KEY=...
```

### 4️⃣ Bağımlılıkları Yükle
```bash
npm install
# veya
yarn install
```

### 5️⃣ Veritabanı Migrasyonları
```bash
npm run migrate
```

**Bu otomatik olarak çalışır:**
- ✅ Tüm tabloları oluşturur
- ✅ RLS policies'i ayarlar
- ✅ Storage bucket'larını oluşturur
- ✅ Trigger'ları ve functions'ları kurur

### 6️⃣ OpenAI Key'i Supabase'e Ekle

**Seçenek A: Supabase CLI (Recommended)**
```bash
supabase secrets set OPENAI_API_KEY=sk-proj-YOUR_KEY_HERE
```

**Seçenek B: Supabase Dashboard**
1. Supabase Dashboard aç
2. **Edge Functions** → **Secrets**
3. **New Secret** tıkla
4. **Key**: `OPENAI_API_KEY`
5. **Value**: `sk-proj-...` (OpenAI key'i)

### 7️⃣ Geliştirme Sunucusunu Başlat
```bash
npm run dev
```

### 8️⃣ Test Et
1. Tarayıcıyı aç: `http://localhost:5173`
2. **Sign Up** sekmesine git
3. Test hesabı oluştur (örn: test@example.com)
4. Uygulamaya giriş yap
5. **Proje Oluştur** sekmesinden proje oluştur
6. **Malzeme Önerileri** butonuna tıkla → OpenAI çalışmalı
7. **Sözleşme Oluştur** butonuna tıkla → OpenAI çalışmalı

---

## 📊 Veri Migration (Eski Veriler Varsa)

### JSON Dosyasını Hazırla

`data.json` dosyası bu yapıya sahip olmalı:

```json
{
  "projects": [
    {
      "title": "Proje Adı",
      "description": "Açıklama",
      "status": "planning",
      "progress": 25,
      "startDate": "2024-01-01",
      "endDate": "2024-12-31",
      "budget": 100000
    }
  ],
  "customers": [...],
  "teamMembers": [...],
  "tasks": [...],
  "materials": [...]
}
```

### Import Komutunu Çalıştır

```bash
# .env.local dosyasına SUPABASE_SERVICE_ROLE_KEY ekle
npm run import-data ./data.json
```

**Beklenenler:**
- ✅ Projeler import edilecek
- ✅ Müşteriler import edilecek
- ✅ Ekip üyeleri import edilecek
- ✅ Görevler import edilecek
- ✅ Malzemeler import edilecek

---

## 🔍 Sorun Giderme

### ❌ "VITE_SUPABASE_URL is not defined"
```
✅ Çözüm: .env.local dosyasını kontrol et
Dosya root dizininde olmalı ve değerler doldurulmuş olmalı
```

### ❌ "OpenAI API Error 401"
```
✅ Çözüm: 
1. supabase secrets list ile kontrol et
2. supabase secrets set OPENAI_API_KEY=sk-proj-...
3. Edge Functions'ları redeploy et
```

### ❌ "Storage upload error"
```
✅ Çözüm:
1. Supabase Dashboard → Storage
2. project-photos bucket'ını seç
3. Policies tab'ına git
4. Public read ve authenticated upload izinlerini kontrol et
```

### ❌ "Migration error: table already exists"
```
✅ Çözüm:
1. Supabase Dashboard → SQL Editor
2. Tüm tabloları sil: DROP TABLE IF EXISTS ... CASCADE;
3. npm run migrate'i yeniden çalıştır
```

### ❌ "Auth Session Lost"
```
✅ Çözüm:
1. Browser dev tools → Application → Local Storage
2. Supabase-auth-token'ı kontrol et
3. localStorage temizle ve yeniden login yap
```

---

## ✅ Doğrulama Kontrolleri

### Database
```bash
# Supabase Dashboard → SQL Editor
SELECT * FROM public.projects;  -- Proje oluştur ve kontrol et
SELECT * FROM public.customers;  -- Müşteri oluştur ve kontrol et
SELECT * FROM public.tasks;     -- Görev oluştur ve kontrol et
```

### Storage
```bash
# Supabase Dashboard → Storage
# project-photos bucket'ında dosyaları kontrol et
```

### Edge Functions
```bash
# Supabase Dashboard → Edge Functions
# generate-contract: "ACTIVE" olmalı
# suggest-materials: "ACTIVE" olmalı
```

### Auth
```bash
# Supabase Dashboard → Authentication
# Users sekmesinde test hesabını kontrol et
```

---

## 📚 Kullanım

### Projeyi Başlatmak
```bash
npm run dev
```

### Üretim için Build
```bash
npm run build
npm run preview
```

### Verilerinizi Export/Backup
```bash
# Supabase CLI ile
supabase db dump > backup.sql

# Ya da Dashboard → Settings → Backups
```

---

## 🔐 Güvenlik Kontrol Listesi

- [ ] `.env.local` dosyası `.gitignore`'da
- [ ] `.env.local` dosyası GitHub'ta upload değil
- [ ] `OPENAI_API_KEY` environment variable'da
- [ ] `SUPABASE_SERVICE_ROLE_KEY` yalnızca lokal dev'de
- [ ] Production'da environment variables kurmak planlandı
- [ ] RLS policies tüm tablolarda aktif
- [ ] Storage bucket policies doğru ayarlanmış

---

## 📱 Mobil Uygulama (Opsiyonel)

```bash
# Android
npx cap build android

# iOS
npx cap build ios
```

Capacitor Supabase ile uyumludur. iOS/Android'de localhost yerine actual URL gerekir.

---

## 🚀 Deployment (Üretim)

### Vercel, Netlify, vb.

```bash
# Environment variables ekle:
VITE_SUPABASE_URL=
VITE_SUPABASE_PUBLISHABLE_KEY=

# Build command: npm run build
# Output directory: dist/
```

### Supabase Backup
- Supabase Dashboard → Settings → Database → Enable backups
- PITR (Point in Time Recovery) açmayı düşün

---

## 📞 Yardım Kaynakları

- [Supabase Documentation](https://supabase.com/docs)
- [OpenAI API Documentation](https://platform.openai.com/docs)
- [GitHub Issues](../../issues)
- [Supabase Community](https://community.opensupabase.com/)

---

## ⏱️ Tahmini Kurulum Süresi

| Adım | Süre |
|------|------|
| Supabase Projesi Oluştur | 10 dakika |
| Credentials Kopyala | 5 dakika |
| .env.local Hazırla | 5 dakika |
| npm install | 3 dakika |
| npm run migrate | 2 dakika |
| OpenAI Key'i Ekle | 3 dakika |
| Test Et | 5 dakika |
| **Toplam** | **~33 dakika** |

---

**✨ Başarılı kurulumlar dileyelim! 🎉**
