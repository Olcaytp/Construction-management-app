// Debug Script for Supabase Connection
// Tarayıcı console'unda çalıştır

console.log("🔍 Supabase Connection Test");
console.log("============================");

// 1. URL Check
const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
const supabaseKey = import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY;

console.log("\n1️⃣  Environment Variables:");
console.log("URL:", supabaseUrl);
console.log("Key:", supabaseKey ? "✅ Set" : "❌ Missing");

// 2. Basic connectivity test
if (supabaseUrl && supabaseKey) {
  console.log("\n2️⃣  Testing Supabase Connection:");
  
  fetch(`${supabaseUrl}/auth/v1/settings`, {
    headers: {
      "apikey": supabaseKey,
    }
  })
  .then(r => {
    console.log("Status:", r.status);
    return r.json();
  })
  .then(data => {
    console.log("✅ Supabase is accessible");
    console.log("Response:", data);
  })
  .catch(err => {
    console.error("❌ Connection failed:");
    console.error(err);
  });

  // 3. Auth endpoint test
  console.log("\n3️⃣  Testing Auth Endpoint:");
  console.log("Try signup with:");
  console.log("- Email: test@example.com");
  console.log("- Password: Test123456!");
  console.log("\nIf 400 error:");
  console.log("→ Supabase project might not exist");
  console.log("→ Or Auth not configured");
  console.log("→ Visit: https://app.supabase.com");
  
} else {
  console.error("❌ Missing Supabase credentials in .env.local");
}

console.log("\n============================");
