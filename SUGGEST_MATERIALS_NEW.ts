import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

// Language -> Country -> Currency mapping
const countryConfig: Record<string, { country: string; currency: string }> = {
  tr: { country: "Türkiye", currency: "TRY" },
  en: { country: "İsveç", currency: "SEK" },
  sv: { country: "İsveç", currency: "SEK" },
  de: { country: "Almanya", currency: "EUR" },
  fr: { country: "Fransa", currency: "EUR" },
  es: { country: "İspanya", currency: "EUR" },
};

// Localized system prompts
const systemPrompts: Record<string, string> = {
  tr: `Sen bir inşaat malzeme uzmanısın. Verilen proje bilgilerine göre gerekli malzemelerin listesini oluştur.
Her malzeme için şunları belirt:
- name: Malzeme adı (Türkçe)
- quantity: Tahmini miktar (sayı)
- unit: Birim (adet, kg, ton, m², m³, paket, vb.)
- estimatedCost: Tahmini maliyet (sayı)
- currency: Para birimi

JSON formatında bir dizi döndür. Sadece JSON döndür, başka metin ekleme.
Örnek: [{"name": "Çimento", "quantity": 100, "unit": "torba", "estimatedCost": 15000, "currency": "TRY"}]`,

  en: `You are a construction materials expert. Create a list of required materials for the given project.
For each material specify:
- name: Material name (English)
- quantity: Estimated quantity (number)
- unit: Unit (pieces, kg, ton, m², m³, package, etc.)
- estimatedCost: Estimated cost (number)
- currency: Currency code

Return as JSON array only. No additional text.
Example: [{"name": "Cement", "quantity": 100, "unit": "bag", "estimatedCost": 2500, "currency": "SEK"}]`,

  sv: `Du är en expert på byggmaterial. Skapa en lista över nödvändiga material för det givna projektet.
För varje material, ange:
- name: Materialets namn (Svenska)
- quantity: Beräknad mängd (nummer)
- unit: Enhet (st, kg, ton, m², m³, paket, etc.)
- estimatedCost: Beräknad kostnad (nummer)
- currency: Valutakod

Returnera endast JSON-array. Ingen annan text.
Exempel: [{"name": "Cement", "quantity": 100, "unit": "säck", "estimatedCost": 3500, "currency": "SEK"}]`,

  de: `Du bist ein Experte für Baumaterialien. Erstelle eine Liste der erforderlichen Materialien für das gegebene Projekt.
Für jedes Material angeben:
- name: Materialname (Deutsch)
- quantity: Geschätzte Menge (Zahl)
- unit: Einheit (Stück, kg, Tonne, m², m³, Paket, etc.)
- estimatedCost: Geschätzte Kosten (Zahl)
- currency: Währungscode

Nur JSON-Array zurückgeben. Kein zusätzlicher Text.
Beispiel: [{"name": "Zement", "quantity": 100, "unit": "Sack", "estimatedCost": 2800, "currency": "EUR"}]`,

  fr: `Vous êtes un expert en matériaux de construction. Créez une liste des matériaux requis pour le projet donné.
Pour chaque matériau, précisez:
- name: Nom du matériau (Français)
- quantity: Quantité estimée (nombre)
- unit: Unité (pièce, kg, tonne, m², m³, paquet, etc.)
- estimatedCost: Coût estimé (nombre)
- currency: Code de devise

Retournez uniquement un tableau JSON. Pas de texte supplémentaire.
Exemple: [{"name": "Ciment", "quantity": 100, "unit": "sac", "estimatedCost": 2600, "currency": "EUR"}]`,

  es: `Eres un experto en materiales de construcción. Crea una lista de materiales requeridos para el proyecto dado.
Para cada material especifica:
- name: Nombre del material (Español)
- quantity: Cantidad estimada (número)
- unit: Unidad (piezas, kg, tonelada, m², m³, paquete, etc.)
- estimatedCost: Costo estimado (número)
- currency: Código de moneda

Devuelve solo un array JSON. Sin texto adicional.
Ejemplo: [{"name": "Cemento", "quantity": 100, "unit": "saco", "estimatedCost": 2400, "currency": "EUR"}]`,
};

// Localized user messages
const userMessages: Record<string, (title: string, desc: string, country: string) => string> = {
  tr: (title, desc, country) =>
    `Proje: ${title}\nAçıklama: ${desc || "Belirtilmemiş"}\n\nBu proje için gerekli malzemeleri ${country}'de geçerli fiyatlarla birlikte listele.`,
  en: (title, desc, country) =>
    `Project: ${title}\nDescription: ${desc || "Not specified"}\n\nList the required materials for this project with pricing valid in ${country}.`,
  sv: (title, desc, country) =>
    `Projekt: ${title}\nBeskrivning: ${desc || "Ej angiven"}\n\nLista det material som krävs för detta projekt med priser giltiga i ${country}.`,
  de: (title, desc, country) =>
    `Projekt: ${title}\nBeschreibung: ${desc || "Nicht angegeben"}\n\nListen Sie die erforderlichen Materialien für dieses Projekt mit Preisen auf, die in ${country} gültig sind.`,
  fr: (title, desc, country) =>
    `Projet: ${title}\nDescription: ${desc || "Non spécifiée"}\n\nLister les matériaux requis pour ce projet avec des prix valides en ${country}.`,
  es: (title, desc, country) =>
    `Proyecto: ${title}\nDescripción: ${desc || "No especificado"}\n\nIndique los materiales requeridos para este proyecto con precios válidos en ${country}.`,
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { projectTitle, projectDescription, language = "tr", country: userCountry } = await req.json();
    const OPENAI_API_KEY = Deno.env.get("OPENAI_API_KEY");

    if (!OPENAI_API_KEY) {
      throw new Error("OPENAI_API_KEY is not configured");
    }

    // Normalize language code (en-US -> en)
    const langCode = (language?.toLowerCase().split("-")[0] || "tr") as keyof typeof countryConfig;
    const config = countryConfig[langCode] || countryConfig["tr"];
    const finalCountry = userCountry || config.country;
    const finalCurrency = config.currency;

    // Get localized prompts
    const systemMessage = systemPrompts[langCode] || systemPrompts["tr"];
    const userMessage = (userMessages[langCode] || userMessages["tr"])(
      projectTitle,
      projectDescription,
      finalCountry
    );

    console.log(`[suggest-materials] lang=${langCode} country=${finalCountry} currency=${finalCurrency}`);

    // Call OpenAI API
    const response = await fetch("https://api.openai.com/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${OPENAI_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "gpt-4o-mini",
        messages: [
          { role: "system", content: systemMessage },
          { role: "user", content: userMessage },
        ],
        temperature: 0.7,
        max_tokens: 2000,
      }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error(`OpenAI error: ${response.status} ${errorText}`);

      if (response.status === 429) {
        return new Response(
          JSON.stringify({ error: "Rate limit exceeded. Please try again later." }),
          { status: 429, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }
      if (response.status === 402) {
        return new Response(
          JSON.stringify({ error: "Payment required. Please add credits." }),
          { status: 402, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      return new Response(JSON.stringify({ error: "AI service error" }), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const data = await response.json();
    const content = data.choices?.[0]?.message?.content;

    // Parse JSON response
    let materials: Array<{
      name: string;
      quantity: number;
      unit: string;
      estimatedCost: number;
      currency: string;
    }> = [];

    try {
      const jsonMatch = content.match(/\[[\s\S]*\]/);
      if (jsonMatch) {
        materials = JSON.parse(jsonMatch[0]);
        // Ensure currency is set to finalCurrency
        materials = materials.map((m) => ({
          ...m,
          currency: finalCurrency,
        }));
      }
    } catch (parseError) {
      console.error("JSON parse error:", parseError);
    }

    return new Response(
      JSON.stringify({
        materials,
        country: finalCountry,
        currency: finalCurrency,
        language: langCode,
      }),
      {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );
  } catch (error) {
    console.error("suggest-materials error:", error);
    return new Response(JSON.stringify({ error: error instanceof Error ? error.message : "Unknown error" }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
