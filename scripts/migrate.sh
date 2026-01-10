#!/bin/bash

# Supabase Migration Script
# Bu script eski Lovable sisteminden Supabase'e veri taşımak için kullanılır

echo "=== Supabase Migration Tool ==="
echo ""

# Supabase CLI kontrol et
if ! command -v supabase &> /dev/null; then
    echo "❌ Supabase CLI bulunamadı. Lütfen kurun:"
    echo "   npm install -g supabase"
    exit 1
fi

echo "✅ Supabase CLI bulundu"
echo ""

# 1. Supabase durumunu kontrol et
echo "1️⃣  Supabase durumu kontrol ediliyor..."
supabase status

echo ""
echo "2️⃣  Migrasyonlar uygulanıyor..."
supabase migration up

echo ""
echo "3️⃣  Environment variables kontrol ediliyor..."

if [ ! -f ".env.local" ]; then
    echo "❌ .env.local dosyası bulunamadı!"
    echo "Lütfen .env.example dosyasını .env.local olarak kopyalayın ve değerleri doldurun:"
    echo "   cp .env.example .env.local"
    exit 1
else
    echo "✅ .env.local dosyası bulundu"
fi

echo ""
echo "=== Migration Tamamlandı! ==="
echo ""
echo "Sonraki adımlar:"
echo "1. Supabase project ID'nizi .env.local dosyasında ayarlayın"
echo "2. OpenAI API key'ini .env.local dosyasında ayarlayın"
echo "3. Uygulamayı başlatın: npm run dev"
echo ""
echo "Eğer eski verileriniz varsa, JSON dosyasından import etmek için:"
echo "   node scripts/import-data.js <json-file-path>"
