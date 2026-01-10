/**
 * Supabase Data Import Script
 * 
 * Eski Lovable sisteminden export edilen JSON verilerini Supabase'e import eder.
 * 
 * Kullanım:
 *   node scripts/import-data.js <path-to-json-file>
 * 
 * JSON dosyası yapısı:
 * {
 *   "users": [...],
 *   "projects": [...],
 *   "tasks": [...],
 *   "customers": [...],
 *   "teamMembers": [...],
 *   "materials": [...]
 * }
 */

import { createClient } from "@supabase/supabase-js";
import * as fs from "fs";
import * as path from "path";
import { fileURLToPath } from "url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Environment variables
const SUPABASE_URL = process.env.VITE_SUPABASE_URL;
const SUPABASE_SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!SUPABASE_URL || !SUPABASE_SERVICE_ROLE_KEY) {
  console.error("❌ Eksik environment variables:");
  console.error("   VITE_SUPABASE_URL ve SUPABASE_SERVICE_ROLE_KEY gereklidir");
  console.error("");
  console.error("Lütfen .env.local dosyasını şu şekilde güncelleyin:");
  console.error("   VITE_SUPABASE_URL=your_supabase_url");
  console.error("   SUPABASE_SERVICE_ROLE_KEY=your_service_role_key");
  process.exit(1);
}

// Supabase client
const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

// Get JSON file path from command line
const jsonFilePath = process.argv[2];

if (!jsonFilePath) {
  console.error("❌ Lütfen JSON dosyasının yolunu belirtin:");
  console.error("   node scripts/import-data.js <path-to-json-file>");
  process.exit(1);
}

// Read JSON file
if (!fs.existsSync(jsonFilePath)) {
  console.error(`❌ Dosya bulunamadı: ${jsonFilePath}`);
  process.exit(1);
}

const rawData = fs.readFileSync(jsonFilePath, "utf-8");
const data = JSON.parse(rawData);

console.log("📥 Supabase'e veri import edilmeye başlanıyor...");
console.log("");

// Counter for imported records
let stats = {
  projects: 0,
  tasks: 0,
  customers: 0,
  teamMembers: 0,
  materials: 0,
  errors: [],
};

async function importData() {
  try {
    // Get the current user (for user_id)
    const {
      data: { user },
      error: userError,
    } = await supabase.auth.admin.listUsers();

    if (userError || !user) {
      console.error("❌ Kullanıcı alınamadı. En az bir kullanıcı kayıtlı olmalıdır.");
      process.exit(1);
    }

    const userId = user[0]?.id;
    console.log(`✅ Kullanıcı bulundu: ${userId}`);
    console.log("");

    // Import Projects
    if (data.projects && Array.isArray(data.projects)) {
      console.log("📦 Projeler import ediliyor...");
      for (const project of data.projects) {
        try {
          await supabase.from("projects").insert({
            user_id: userId,
            title: project.title,
            description: project.description,
            status: project.status || "planning",
            progress: project.progress || 0,
            start_date: project.startDate || project.start_date,
            end_date: project.endDate || project.end_date,
            assigned_team: project.assignedTeam || project.assigned_team || [],
            budget: project.budget || 0,
            actual_cost: project.actualCost || project.actual_cost || 0,
            revenue: project.revenue || 0,
            photos: project.photos || [],
          });
          stats.projects++;
        } catch (err) {
          stats.errors.push(`Proje "${project.title}": ${err.message}`);
        }
      }
      console.log(`   ✅ ${stats.projects} proje eklendi`);
    }

    // Import Customers
    if (data.customers && Array.isArray(data.customers)) {
      console.log("👥 Müşteriler import ediliyor...");
      for (const customer of data.customers) {
        try {
          await supabase.from("customers").insert({
            user_id: userId,
            name: customer.name,
            phone: customer.phone || null,
            address: customer.address || null,
            notes: customer.notes || null,
            total_receivable: customer.totalReceivable || customer.total_receivable || 0,
            total_paid: customer.totalPaid || customer.total_paid || 0,
          });
          stats.customers++;
        } catch (err) {
          stats.errors.push(`Müşteri "${customer.name}": ${err.message}`);
        }
      }
      console.log(`   ✅ ${stats.customers} müşteri eklendi`);
    }

    // Import Team Members
    if (data.teamMembers && Array.isArray(data.teamMembers)) {
      console.log("👨‍💼 Ekip üyeleri import ediliyor...");
      for (const member of data.teamMembers) {
        try {
          await supabase.from("team_members").insert({
            user_id: userId,
            name: member.name,
            phone: member.phone,
            specialty: member.specialty,
            daily_wage: member.dailyWage || member.daily_wage || 0,
            total_receivable: member.totalReceivable || member.total_receivable || 0,
            total_paid: member.totalPaid || member.total_paid || 0,
          });
          stats.teamMembers++;
        } catch (err) {
          stats.errors.push(`Ekip üyesi "${member.name}": ${err.message}`);
        }
      }
      console.log(`   ✅ ${stats.teamMembers} ekip üyesi eklendi`);
    }

    // Import Tasks
    if (data.tasks && Array.isArray(data.tasks)) {
      console.log("📋 Görevler import ediliyor...");
      for (const task of data.tasks) {
        try {
          await supabase.from("tasks").insert({
            user_id: userId,
            project_id: task.projectId || task.project_id || null,
            title: task.title,
            description: task.description || null,
            status: task.status || "pending",
            priority: task.priority || "medium",
            assigned_to: task.assignedTo || task.assigned_to || null,
            due_date: task.dueDate || task.due_date,
            estimated_cost: task.estimatedCost || task.estimated_cost || 0,
          });
          stats.tasks++;
        } catch (err) {
          stats.errors.push(`Görev "${task.title}": ${err.message}`);
        }
      }
      console.log(`   ✅ ${stats.tasks} görev eklendi`);
    }

    // Import Materials
    if (data.materials && Array.isArray(data.materials)) {
      console.log("🔨 Malzemeler import ediliyor...");
      for (const material of data.materials) {
        try {
          await supabase.from("materials").insert({
            user_id: userId,
            project_id: material.projectId || material.project_id,
            name: material.name,
            quantity: material.quantity || 0,
            unit: material.unit || "adet",
            estimated_cost: material.estimatedCost || material.estimated_cost || 0,
            actual_cost: material.actualCost || material.actual_cost || 0,
            status: material.status || "planned",
            supplier: material.supplier || null,
            notes: material.notes || null,
          });
          stats.materials++;
        } catch (err) {
          stats.errors.push(`Malzeme "${material.name}": ${err.message}`);
        }
      }
      console.log(`   ✅ ${stats.materials} malzeme eklendi`);
    }

    // Print summary
    console.log("");
    console.log("=== Import Özeti ===");
    console.log(`📦 Projeler: ${stats.projects}`);
    console.log(`👥 Müşteriler: ${stats.customers}`);
    console.log(`👨‍💼 Ekip üyeleri: ${stats.teamMembers}`);
    console.log(`📋 Görevler: ${stats.tasks}`);
    console.log(`🔨 Malzemeler: ${stats.materials}`);

    if (stats.errors.length > 0) {
      console.log("");
      console.log("⚠️  Hata Özeti:");
      stats.errors.forEach((err) => console.log(`   - ${err}`));
    } else {
      console.log("");
      console.log("✅ Tüm veriler başarıyla import edildi!");
    }
  } catch (error) {
    console.error("❌ Import sırasında hata oluştu:", error.message);
    process.exit(1);
  }
}

// Run import
importData();
