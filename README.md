# İnşaat Takip Uygulaması - Supabase Edition

**Lovable AI'dan Supabase'e Taşınmış Versiyon**

Profesyonel inşaat projesi yönetim sistemi. Projeler, görevler, ekip üyeleri, malzemeler ve müşteri ilişkileri yönetimi.

## 🏗️ Özellikler

- ✅ **Proje Yönetimi** - Projelerinizi oluşturun, takip edin ve yönetin
- ✅ **Görev Yönetimi** - Detaylı görev ataması ve takibi
- ✅ **Ekip Yönetimi** - Ekip üyeleri ve ücret takibi
- ✅ **Müşteri Yönetimi** - Müşteri bilgileri ve ödemeler
- ✅ **Malzeme Takibi** - Proje malzemeleri ve tedarikçiler
- ✅ **Sözleşme Üretimi** - AI destekli taşeron sözleşmesi
- ✅ **Malzeme Önerileri** - AI ile akıllı malzeme önerileri
- ✅ **Fotoğraf Depolama** - Supabase Storage ile bulut depolama
- ✅ **Çoklu Dil Desteği** - Türkçe ve İngilizce

## 🔄 Teknoloji Yığını

- **Frontend**: React + TypeScript + Vite
- **Database**: Supabase (PostgreSQL)
- **Auth**: Supabase Authentication
- **Storage**: Supabase Storage
- **AI**: OpenAI API (GPT-4o-mini)
- **UI**: Radix UI + Tailwind CSS
- **State Management**: TanStack Query (React Query)
- **Mobile**: Capacitor

## 🚀 Hızlı Başlangıç

### 1. Gereksinimleri Yükle
```bash
# Node.js 18+ ve npm gereklidir
npm install
```

### 2. Environment Değişkenlerini Ayarla
```bash
cp .env.example .env.local
```

`.env.local` dosyasını açıp aşağıdakileri doldurun:

```env
# Supabase
VITE_SUPABASE_URL=https://your-project.supabase.co
VITE_SUPABASE_PUBLISHABLE_KEY=your_anon_key_here

# OpenAI (AI özelikleri için)
OPENAI_API_KEY=sk-your_api_key_here
```

### 3. Veritabanı Migrasyonlarını Çalıştır
```bash
npm run migrate
```

### 4. Uygulamayı Başlat
```bash
npm run dev
```

## 📥 Eski Verilerinizi İçeri Aktarma

Lovable AI'dan export ettiğiniz verilerinizi Supabase'e aktarmak için:

### 1. JSON Dosyasını Hazırla
`data-import-example.json` dosyasını şablon olarak kullanarak:

```json
{
  "projects": [...],
  "customers": [...],
  "teamMembers": [...],
  "tasks": [...],
  "materials": [...]
}
```

### 2. Import Komutunu Çalıştır
```bash
# Environment'te SUPABASE_SERVICE_ROLE_KEY olmalı
npm run import-data path/to/your/data.json
```

## 📋 Proje Yapısı

```
src/
├── components/        # React bileşenleri
├── hooks/            # Custom React hooks
├── pages/            # Sayfa bileşenleri
├── integrations/     # Supabase istemcisi
├── i18n/             # Çoklu dil desteği
└── lib/              # Yardımcı fonksiyonlar

supabase/
├── migrations/       # Veritabanı migrasyonları
├── functions/        # Edge Functions (Supabase)
└── config.toml       # Supabase yapılandırması
```

## 🔧 Supabase Edge Functions

### generate-contract
Proje bilgilerine göre taşeron sözleşmesi PDF oluşturur.

**Endpoint**: `/functions/v1/generate-contract`
**Kimlik**: JWT gereklidir
**Model**: OpenAI GPT-4o-mini

### suggest-materials  
Proje açıklamasına göre malzeme listesi önerir.

**Endpoint**: `/functions/v1/suggest-materials`
**Kimlik**: JWT gereklidir
**Model**: OpenAI GPT-4o-mini

## 🔐 Güvenlik

- **Row Level Security (RLS)**: Tüm tablolarda kullanıcı bazında veri izolasyonu
- **JWT Authentication**: Supabase tarafından sağlanan güvenli oturum
- **Service Role Key**: Migration'lar için gizli anahtar kullanılır
- **Environment Variables**: Hassas bilgiler şifrelenmiş şekilde saklanır

## 📱 Mobil Uygulama

Capacitor ile iOS ve Android için derleme:

```bash
# Android
npx cap build android

# iOS  
npx cap build ios
```

## 🛠️ Geliştirme Komutları

```bash
npm run dev        # Geliştirme sunucusunu başlat
npm run build      # Üretim derlemesi
npm run lint       # Code linting
npm run preview    # Üretim derlemesini önizle
npm run migrate    # Supabase migrasyonlarını çalıştır
npm run import-data <path> # Verileri import et
```

## 📚 Belgelendirme

### Hooks
- `useAuth()` - Authentication
- `useProjects()` - Proje yönetimi
- `useTasks()` - Görev yönetimi
- `useTeamMembers()` - Ekip yönetimi
- `useCustomers()` - Müşteri yönetimi
- `useMaterials()` - Malzeme takibi
- `useSubscription()` - Abonelik yönetimi
- `useAdmin()` - Admin yönetimi

## 🤝 Katkıda Bulunma

1. Bu deposu fork edin
2. Özellik branşı oluşturun (`git checkout -b feature/AmazingFeature`)
3. Değişiklikleri commit edin (`git commit -m 'Harika özellik ekle'`)
4. Branşa push edin (`git push origin feature/AmazingFeature`)
5. Pull Request açın

## 📞 Destek

Sorularınız veya sorunlarınız varsa, GitHub Issues üzerinden iletişime geçin.

## 📄 Lisans

MIT License - Dosya detayları için [LICENSE](LICENSE) dosyasını görmüştür.
- Edit files directly within the Codespace and commit and push your changes once you're done.

## What technologies are used for this project?

This project is built with:

- Vite
- TypeScript
- React
- shadcn-ui
- Tailwind CSS

## How can I deploy this project?

Simply open [Lovable](https://lovable.dev/projects/2ced7393-cb91-4168-8a20-7d9950a42bfa) and click on Share -> Publish.

## Can I connect a custom domain to my Lovable project?

Yes, you can!

To connect a domain, navigate to Project > Settings > Domains and click Connect Domain.

Read more here: [Setting up a custom domain](https://docs.lovable.dev/features/custom-domain#custom-domain)
