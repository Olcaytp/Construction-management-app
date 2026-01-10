#!/usr/bin/env pwsh

Write-Host "🔄 Supabase Edge Function redeploy başlıyor..." -ForegroundColor Cyan

# Supabase CLI'nin yüklü olup olmadığını kontrol et
$supabaseCmd = Get-Command supabase -ErrorAction SilentlyContinue
if (-not $supabaseCmd) {
    Write-Host "❌ Supabase CLI bulunamadı. Lütfen önce yükleyin:" -ForegroundColor Red
    Write-Host "   npm install -g supabase" -ForegroundColor Yellow
    exit 1
}

# Proje dizinine git
$projectPath = Split-Path -Parent $MyInvocation.MyCommand.Path
Set-Location $projectPath

Write-Host "📁 Proje dizini: $projectPath" -ForegroundColor Blue

# suggest-materials fonksiyonunu deploy et
Write-Host "📤 suggest-materials fonksiyonu deploy ediliyor..." -ForegroundColor Cyan
supabase functions deploy suggest-materials

if ($LASTEXITCODE -eq 0) {
    Write-Host "✅ Deploy başarılı!" -ForegroundColor Green
    Write-Host "🎯 Artık yeni malzeme oluşturduğunuzda dil/ülke doğru şekilde uygulanacaktır." -ForegroundColor Green
} else {
    Write-Host "❌ Deploy başarısız oldu. Hata kodu: $LASTEXITCODE" -ForegroundColor Red
    exit $LASTEXITCODE
}
