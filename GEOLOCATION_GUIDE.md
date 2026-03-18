/**
 * Copyright © 2026 Olcaytp. All rights reserved.
 * Geolocation-based Localization Guide
 */

# 🌍 Otomatik Ülke & Para Birimi Algılama

## 📋 Genel Bakış

Uygulama artık kullanıcıların bulunduğu ülkeyi **otomatik olarak algılıyor** ve uygun dili ile para birimini ayarlıyor.

### 🎯 Özellikler

✅ **İlk Girişte Otomatik Ayarlama**
- Kullanıcı uygulamaya ilk kez girdiğinde konum otomatik tespit edilir
- Uygun dil ve para birimi otomatik set edilir

✅ **Desteklenen Ülkeler**
- 🇹🇷 **Türkiye** → Türkçe (tr) + TRY
- 🇸🇪 **İsveç** → İsveçce (sv) + SEK
- 🇪🇺 **Avrupa Ülkeleri** (Almanya, Fransa, İtalya, İspanya, vb.) → İngilizce (en) + EUR
- 🇺🇸 **Amerika** → İngilizce (en) + USD
- 🇬🇧 **İngiltere** → İngilizce (en) + GBP
- 🇳🇴 **Norveç** → İngilizce (en) + NOK
- 🇩🇰 **Danimarka** → İngilizce (en) + DKK
- Diğer ülkeler → İngilizce (en) + USD (default)

✅ **Manuel Ayarlama**
Herhangi bir zaman profil açılarak dil ve para birimi değiştirebilir:
- Sağ üst köşe → Profil Menüsü → Ülke Seçimi
- Veya Mobil menü → Profil → Ülke Seçimi

---

## 🔧 Teknik Detaylar

### Nasıl Çalışır?

1. **Konum Tespit Etme** (`locationDetection.ts`)
   - Kullanıcı ilk kez giriş yaptığında IP adresi üzerinden konum tespit edilir
   - `ipapi.co` hizmetini kullanarak ücretsiz geolocation API çağrısı yapılır
   - Ülke kodu alınır ve uygun config'e eşlenir

2. **Dil & Para Birimi Ayarlama** (`useAuth.tsx`)
   - Location detection sonucuna göre dil ve para birimi set edilir
   - `localStorage` içinde saklanır (ilk açılışta hızlı yükleme için)
   - `i18n.changeLanguage()` çağrılarak dil değiştirilir
   - Supabase `profiles` tablosuna kaydedilir

3. **Kullanıcı vs Sistem Ayarları**
   - **localStorage** → Her bileşende hızlı erişim için
   - **Supabase DB** → Kalıcı kullanıcı tercihlerinin saklanması
   - Uygulamayı yeniden açtığında otomatik restore edilir

---

## 📁 Değiştirilmiş Dosyalar

### Yeni Dosya
- `src/lib/locationDetection.ts` - Konum tespit servisi

### Güncellenmiş Dosyalar
- `src/hooks/useAuth.tsx` - Location detection entegrasyonu
- `src/components/ProfileDropdown.tsx` - localStorage yüklemesi
- `src/components/HeaderMenu.tsx` - localStorage yüklemesi  
- `src/components/MaterialsSection.tsx` - localStorage yüklemesi
- `src/components/MaterialForm.tsx` - localStorage yüklemesi

---

## 💻 Kullanım Örnekleri

### Senaryo 1: Türkiye'deki kullanıcı
```
1. Uygulamaya giriş yapar
2. IP algılanır: TR
3. Otomatik ayarlar: Türkçe + TRY
4. Tüm malzeme fiyatları ₺ (Türk Lirası) cinsinden gösterilir
```

### Senaryo 2: İsveç'teki kullanıcı
```
1. Uygulamaya giriş yapar
2. IP algılanır: SE
3. Otomatik ayarlar: İsveçce + SEK
4. Tüm malzeme fiyatları kr (İsveç Kronu) cinsinden gösterilir
```

### Senaryo 3: Almanya'daki kullanıcı
```
1. Uygulamaya giriş yapar
2. IP algılanır: DE
3. Otomatik ayarlar: İngilizce + EUR
4. Tüm malzeme fiyatları € (Euro) cinsinden gösterilir
```

---

## 🛠️ Geolocation API

**Hizmet:** [ipapi.co](https://ipapi.co)

**Özellikler:**
- ✅ Ücretsiz (günlük 1000 request)
- ✅ API key gerekmez
- ✅ 5 saniye timeout güvenliği

**Fallback:** Hata durumunda veya timeout'ta → Default (İngilizce + USD)

---

## 🔐 Gizlilik

- Konum tespiti **sunucu tarafında değil, istemci tarafında** yapılır
- Sadece **ülke kodu** alınır (şehir bilgisi yok)
- Veriler **localStorage** ve **Supabase** içinde saklanır
- Kullanıcı herhangi zaman settings'ten değiştirebilir

---

## 📝 Kod Örneği

### Location Tespiti Nasıl Yapılır?

```typescript
// locationDetection.ts
export async function detectLocation(): Promise<LocationData> {
  const response = await fetch('https://ipapi.co/json/', {
    signal: AbortSignal.timeout(5000),
  });
  
  const data = await response.json();
  const countryCode = data.country_code?.toUpperCase();
  
  return COUNTRY_CONFIG[countryCode] || COUNTRY_CONFIG['DEFAULT'];
}
```

### AuthProvider'da Nasıl Kullanılıyor?

```typescript
// useAuth.tsx
if (session?.user && isFirstTimeUser()) {
  const location = await detectLocation();
  
  // Dil ayarla
  localStorage.setItem('language', location.language);
  await i18n.changeLanguage(location.language);
  
  // Para birimi ayarla
  localStorage.setItem('userCurrency', location.currency);
  localStorage.setItem('userCountry', location.countryCode);
  
  markLocationInitialized();
}
```

---

## 🧪 Test Etme

### 1. Yeni Browser'da Test
```bash
# 1. localStorage temizle: DevTools → Application → Storage → Clear
# 2. Reload et
# 3. Ülkenize göre dil/para birimi otomatik ayarlanacak
```

### 2. Farklı VPN ile Test
```bash
# Türkiye VPN'i ile test et → Türkçe + TRY
# İsveç VPN'i ile test et → İsveçce + SEK
# Almanya VPN'i ile test et → İngilizce + EUR
```

### 3. Browser Console'dan Test
```javascript
// Geçerli ayarları kontrol et
console.log('Language:', localStorage.getItem('language'));
console.log('Currency:', localStorage.getItem('userCurrency'));
console.log('Country:', localStorage.getItem('userCountry'));

// localStorage temizle ve reload et
localStorage.removeItem('hasInitializedLocation');
location.reload();
```

---

## ❓ SSS (Sık Sorulan Sorular)

**S: Location detection başarısız olursa ne olur?**
A: Default olarak İngilizce + USD ayarı uygulanır. Hata logları console'da görüntülenir.

**S: VPN kullanıyorsam ne olur?**
A: VPN'in ülkesine göre konum tespit edilir ve o ülkenin ayarları uygulanır.

**S: Dil sonradan değiştirebilir miyim?**
A: Evet! Sağ üst köşe → Profil → Dil seçeneğinden değiştirebilirsiniz.

**S: Offline ise ne olur?**
A: localStorage'dan önceki ayarlar yüklenir. Eğer ilk kez ise default ayarlar kullanılır.

S: Yeni ülke ekleme nasıl yapılır?**
A: `src/lib/locationDetection.ts` dosyasında `COUNTRY_CONFIG` objesine yeni ülkeyi ekleyin.

Örnek:
```typescript
'JP': { country: 'Japonya', countryCode: 'JP', language: 'en', currency: 'JPY' }
```

---

## 📞 Destek

Herhangi bir sorun yaşanırsa:
1. Browser console'unu kontrol edin ([Location] loglarını arayın)
2. localStorage'ı temizleyin
3. Uygulamayı yeniden açın
