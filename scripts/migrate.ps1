# Supabase Migration Script - Windows Compatible
# Checks environment setup

Write-Host "=== Supabase Migration Setup ===" -ForegroundColor Green
Write-Host ""

if (-not (Test-Path ".env.local")) {
    Write-Host "ERROR: .env.local file not found!" -ForegroundColor Red
    Write-Host "Copy template: Copy-Item .env.example .env.local" -ForegroundColor Yellow
    exit 1
}

Write-Host "OK: .env.local found" -ForegroundColor Green
Write-Host ""
Write-Host "Checking Environment Variables:" -ForegroundColor Cyan

$envContent = Get-Content ".env.local" -Raw

if ($envContent -like "*VITE_SUPABASE_URL*") {
    Write-Host "OK: VITE_SUPABASE_URL set" -ForegroundColor Green
} else {
    Write-Host "WARN: VITE_SUPABASE_URL missing" -ForegroundColor Yellow
}

if ($envContent -like "*VITE_SUPABASE_PUBLISHABLE_KEY*") {
    Write-Host "OK: VITE_SUPABASE_PUBLISHABLE_KEY set" -ForegroundColor Green
} else {
    Write-Host "WARN: VITE_SUPABASE_PUBLISHABLE_KEY missing" -ForegroundColor Yellow
}

if ($envContent -like "*OPENAI_API_KEY*") {
    Write-Host "OK: OPENAI_API_KEY set" -ForegroundColor Green
} else {
    Write-Host "WARN: OPENAI_API_KEY missing" -ForegroundColor Yellow
}

Write-Host ""
Write-Host "=== Setup Complete ===" -ForegroundColor Green
Write-Host ""
Write-Host "Next steps:" -ForegroundColor Yellow
Write-Host "1. Run: npx supabase link --project-ref xumnfngrhcxfhnemrozu" -ForegroundColor White
Write-Host "2. Run: npx supabase db push" -ForegroundColor White
Write-Host "3. Run: npx supabase secrets set OPENAI_API_KEY=sk-proj-..." -ForegroundColor White
Write-Host "4. Run: npm run dev" -ForegroundColor White
Write-Host ""
