import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Credentials': 'true',
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { 
      project, 
      customer, 
      teamMembers, 
      language = 'tr', 
      country: userCountry, 
      currency: userCurrency,
      mode = 'basic',
      options = {}
    } = await req.json();
    const OPENAI_API_KEY = Deno.env.get("OPENAI_API_KEY");
    
    if (!OPENAI_API_KEY) {
      throw new Error("OPENAI_API_KEY is not configured");
    }

    console.log("Generating contract for project:", project.title);
    console.log("Mode:", mode, "Options:", options);

    // Language -> Country/Currency/Locale mapping
    const countryConfig: Record<string, { country: string; currency: string; locale: string }> = {
      tr: { country: 'Türkiye', currency: 'TRY', locale: 'tr-TR' },
      en: { country: 'Sweden', currency: 'SEK', locale: 'sv-SE' },
      sv: { country: 'Sverige', currency: 'SEK', locale: 'sv-SE' },
      de: { country: 'Deutschland', currency: 'EUR', locale: 'de-DE' },
      fr: { country: 'France', currency: 'EUR', locale: 'fr-FR' },
      es: { country: 'España', currency: 'EUR', locale: 'es-ES' },
    };

    const langCode = (language?.toLowerCase().split('-')[0] || 'tr') as keyof typeof countryConfig;
    const cfg = countryConfig[langCode] || countryConfig['tr'];
    const finalCountry = userCountry || cfg.country;
    const currency = userCurrency || cfg.currency;
    const locale = cfg.locale;

        const systemPrompts: Record<string, string> = {
      tr: `Sen profesyonel bir inşaat hukuku uzmanısın. Taşeron sözleşmeleri hazırlama konusunda uzmansın.
    Verilen proje detaylarına göre kapsamlı ve yasal açıdan geçerli bir taşeron sözleşmesi taslağı hazırla.

    Sözleşme şu bölümleri içermeli:
    1. TARAFLAR - İşveren ve taşeron bilgileri
    2. SÖZLEŞMENİN KONUSU - Yapılacak işin tanımı
    3. SÖZLEŞME BEDELİ - Ücret ve ödeme koşulları
    4. İŞ SÜRESİ - Başlangıç ve bitiş tarihleri
    5. TARAFLARIN YÜKÜMLÜLÜKLERİ - Her iki tarafın sorumlulukları
    6. İŞ GÜVENLİĞİ - İSG kuralları ve yükümlülükler
    7. CEZAİ ŞARTLAR - Gecikme ve eksik iş durumları
    8. FESİH KOŞULLARI - Sözleşmenin sona ermesi
    9. UYUŞMAZLIKLARIN ÇÖZÜMÜ - Arabuluculuk ve mahkeme
    10. DİĞER HÜKÜMLER - Genel hükümler

    Sözleşmeyi Markdown formatında hazırla. Profesyonel ve resmi bir dil kullan.`,
      en: `You are a professional construction law expert. Prepare a comprehensive and legally sound subcontractor agreement.

    The agreement should include:
    1. PARTIES - Employer and subcontractor details
    2. SCOPE OF WORK - Description of the work
    3. CONTRACT PRICE - Payment terms
    4. TERM - Start and end dates
    5. OBLIGATIONS - Responsibilities of both parties
    6. SAFETY - Occupational safety obligations
    7. PENALTIES - Delays and deficiencies
    8. TERMINATION - Conditions for termination
    9. DISPUTE RESOLUTION - Mediation and courts
    10. MISCELLANEOUS - General provisions

    Write in Markdown with a professional tone.`,
      sv: `Du är expert på entreprenadjuridik. Ta fram ett omfattande och juridiskt korrekt underentreprenadavtal.

    Avtalet ska innehålla:
    1. PARTER - Beställare och underentreprenör
    2. ARBETETS OMFATTNING - Beskrivning av arbetet
    3. AVTALSSUMMA - Betalningsvillkor
    4. TID - Start- och slutdatum
    5. FÖRPLIKTELSER - Parternas ansvar
    6. SÄKERHET - Arbetsmiljö och säkerhet
    7. VITEN - Förseningar och brister
    8. UPPSÄGNING - Villkor för uppsägning
    9. TVISTLÖSNING - Medling och domstol
    10. ÖVRIGT - Allmänna bestämmelser

    Skriv i Markdown med professionell ton.`,
      de: `Du bist Experte für Baurecht. Erstelle einen umfassenden und rechtsgültigen Nachunternehmervertrag.

    Der Vertrag soll enthalten:
    1. PARTEIEN - Auftraggeber und Nachunternehmer
    2. VERTRAGSGEGENSTAND - Beschreibung der Arbeiten
    3. VERTRAGSSUMME - Zahlungsbedingungen
    4. LAUFZEIT - Beginn und Ende
    5. PFLICHTEN - Verantwortlichkeiten beider Parteien
    6. SICHERHEIT - Arbeitssicherheit
    7. VERTRAGSSTRAFEN - Verzögerungen und Mängel
    8. KÜNDIGUNG - Kündigungsbedingungen
    9. STREITBEILEGUNG - Mediation und Gericht
    10. SONSTIGES - Allgemeine Bestimmungen

    Schreibe in Markdown und professionellem Ton.`,
      fr: `Vous êtes expert en droit de la construction. Rédigez un accord de sous-traitance complet et juridiquement valable.

    Le contrat doit inclure :
    1. PARTIES - Donneur d'ordre et sous-traitant
    2. OBJET - Description des travaux
    3. PRIX - Modalités de paiement
    4. DURÉE - Dates de début et de fin
    5. OBLIGATIONS - Responsabilités des parties
    6. SÉCURITÉ - Obligations de sécurité
    7. PÉNALITÉS - Retards et défauts
    8. RÉSILIATION - Conditions de résiliation
    9. RÈGLEMENT DES LITIGES - Médiation et tribunaux
    10. DIVERS - Dispositions générales

    Rédigez en Markdown avec un ton professionnel.`,
      es: `Eres experto en derecho de la construcción. Elabora un contrato de subcontratación completo y jurídicamente válido.

    El contrato debe incluir:
    1. PARTES - Contratante y subcontratista
    2. OBJETO - Descripción del trabajo
    3. PRECIO - Condiciones de pago
    4. PLAZO - Fechas de inicio y fin
    5. OBLIGACIONES - Responsabilidades de ambas partes
    6. SEGURIDAD - Seguridad laboral
    7. PENALIZACIONES - Retrasos y deficiencias
    8. RESCISIÓN - Condiciones de rescisión
    9. RESOLUCIÓN DE CONFLICTOS - Mediación y tribunales
    10. MISCELÁNEO - Disposiciones generales

    Escribe en Markdown con tono profesional.`,
        };

        const systemPrompt = systemPrompts[langCode] || systemPrompts['tr'];

        const fmt = (v?: number) => (typeof v === 'number' ? v.toLocaleString(locale) : undefined);

        const userMessages: Record<string, (p: any, c: any, tms: any[]) => string> = {
      tr: (p, c, tms) => `Aşağıdaki proje için taşeron sözleşmesi hazırla (${finalCountry} - para birimi ${currency}):

    PROJE BİLGİLERİ:
    - Proje Adı: ${p.title}
    - Açıklama: ${p.description || 'Belirtilmemiş'}
    - Başlangıç Tarihi: ${p.startDate}
    - Bitiş Tarihi: ${p.endDate}
    - Bütçe: ${p.budget ? `${fmt(p.budget)} ${currency}` : 'Belirtilmemiş'}
    - Gerçekleşen Maliyet: ${p.actualCost ? `${fmt(p.actualCost)} ${currency}` : 'Henüz yok'}
    - Gelir: ${p.revenue ? `${fmt(p.revenue)} ${currency}` : 'Belirtilmemiş'}
    - Durum: ${p.status}
    - İlerleme: %${p.progress}

    MÜŞTERİ BİLGİLERİ:
    ${c ? `- Ad/Unvan: ${c.name}
    - Telefon: ${c.phone || 'Belirtilmemiş'}
    - Adres: ${c.address || 'Belirtilmemiş'}` : 'Müşteri bilgisi bulunmuyor'}

    ATANAN EKİP ÜYELERİ:
    ${tms && tms.length > 0 ? tms.map((m: any) => `- ${m.name} (${m.specialty}) - Günlük Ücret: ${m.daily_wage ? `${fmt(m.daily_wage)} ${currency}` : 'Belirtilmemiş'}`).join('\n') : 'Ekip üyesi atanmamış'}

    Bu bilgilere göre detaylı ve profesyonel bir taşeron sözleşmesi taslağı oluştur.`,
      en: (p, c, tms) => `Prepare a subcontractor agreement for the following project (pricing locale: ${finalCountry}, currency: ${currency}):

    PROJECT DETAILS:
    - Title: ${p.title}
    - Description: ${p.description || 'Not specified'}
    - Start Date: ${p.startDate}
    - End Date: ${p.endDate}
    - Budget: ${p.budget ? `${fmt(p.budget)} ${currency}` : 'Not specified'}
    - Actual Cost: ${p.actualCost ? `${fmt(p.actualCost)} ${currency}` : 'None yet'}
    - Revenue: ${p.revenue ? `${fmt(p.revenue)} ${currency}` : 'Not specified'}
    - Status: ${p.status}
    - Progress: ${p.progress}%

    CUSTOMER DETAILS:
    ${c ? `- Name: ${c.name}
    - Phone: ${c.phone || 'Not specified'}
    - Address: ${c.address || 'Not specified'}` : 'No customer details'}

    ASSIGNED TEAM MEMBERS:
    ${tms && tms.length > 0 ? tms.map((m: any) => `- ${m.name} (${m.specialty}) - Daily Wage: ${m.daily_wage ? `${fmt(m.daily_wage)} ${currency}` : 'Not specified'}`).join('\n') : 'No team members assigned'}

    Use a professional tone and produce Markdown.`,
      sv: (p, c, tms) => `Ta fram ett underentreprenadavtal för följande projekt (land: ${finalCountry}, valuta: ${currency}):

    PROJEKTDETALJER:
    - Titel: ${p.title}
    - Beskrivning: ${p.description || 'Ej angiven'}
    - Startdatum: ${p.startDate}
    - Slutdatum: ${p.endDate}
    - Budget: ${p.budget ? `${fmt(p.budget)} ${currency}` : 'Ej angiven'}
    - Faktisk kostnad: ${p.actualCost ? `${fmt(p.actualCost)} ${currency}` : 'Ingen ännu'}
    - Intäkter: ${p.revenue ? `${fmt(p.revenue)} ${currency}` : 'Ej angiven'}
    - Status: ${p.status}
    - Framsteg: ${p.progress}%

    KUNDUPPGIFTER:
    ${c ? `- Namn: ${c.name}
    - Telefon: ${c.phone || 'Ej angiven'}
    - Adress: ${c.address || 'Ej angiven'}` : 'Inga kunduppgifter'}

    TEAMMEDLEMMAR:
    ${tms && tms.length > 0 ? tms.map((m: any) => `- ${m.name} (${m.specialty}) - Daglön: ${m.daily_wage ? `${fmt(m.daily_wage)} ${currency}` : 'Ej angiven'}`).join('\n') : 'Inga teammedlemmar'}

    Skriv i Markdown med professionell ton.`,
      de: (p, c, tms) => `Erstelle einen Nachunternehmervertrag für folgendes Projekt (Land: ${finalCountry}, Währung: ${currency}):

    PROJEKTDETAILS:
    - Titel: ${p.title}
    - Beschreibung: ${p.description || 'Nicht angegeben'}
    - Startdatum: ${p.startDate}
    - Enddatum: ${p.endDate}
    - Budget: ${p.budget ? `${fmt(p.budget)} ${currency}` : 'Nicht angegeben'}
    - Ist-Kosten: ${p.actualCost ? `${fmt(p.actualCost)} ${currency}` : 'Noch keine'}
    - Einnahmen: ${p.revenue ? `${fmt(p.revenue)} ${currency}` : 'Nicht angegeben'}
    - Status: ${p.status}
    - Fortschritt: ${p.progress}%

    KUNDENDATEN:
    ${c ? `- Name: ${c.name}
    - Telefon: ${c.phone || 'Nicht angegeben'}
    - Adresse: ${c.address || 'Nicht angegeben'}` : 'Keine Kundendaten'}

    ZUGETEILTE TEAMMITGLIEDER:
    ${tms && tms.length > 0 ? tms.map((m: any) => `- ${m.name} (${m.specialty}) - Tageslohn: ${m.daily_wage ? `${fmt(m.daily_wage)} ${currency}` : 'Nicht angegeben'}`).join('\n') : 'Keine Teammitglieder zugeteilt'}

    Professionell formulieren und in Markdown ausgeben.`,
      fr: (p, c, tms) => `Rédigez un contrat de sous-traitance pour le projet suivant (pays: ${finalCountry}, devise: ${currency}) :

    DÉTAILS DU PROJET:
    - Titre : ${p.title}
    - Description : ${p.description || 'Non spécifiée'}
    - Date de début : ${p.startDate}
    - Date de fin : ${p.endDate}
    - Budget : ${p.budget ? `${fmt(p.budget)} ${currency}` : 'Non spécifié'}
    - Coût réel : ${p.actualCost ? `${fmt(p.actualCost)} ${currency}` : 'Aucun pour le moment'}
    - Revenus : ${p.revenue ? `${fmt(p.revenue)} ${currency}` : 'Non spécifié'}
    - Statut : ${p.status}
    - Avancement : ${p.progress}%

    INFORMATIONS CLIENT:
    ${c ? `- Nom : ${c.name}
    - Téléphone : ${c.phone || 'Non spécifié'}
    - Adresse : ${c.address || 'Non spécifiée'}` : 'Aucune information client'}

    MEMBRES DE L'ÉQUIPE:
    ${tms && tms.length > 0 ? tms.map((m: any) => `- ${m.name} (${m.specialty}) - Salaire journalier : ${m.daily_wage ? `${fmt(m.daily_wage)} ${currency}` : 'Non spécifié'}`).join('\n') : "Aucun membre d'équipe affecté"}

    Rédigez en Markdown avec un ton professionnel.`,
      es: (p, c, tms) => `Elabora un contrato de subcontratación para el siguiente proyecto (país: ${finalCountry}, moneda: ${currency}):

    DETALLES DEL PROYECTO:
    - Título: ${p.title}
    - Descripción: ${p.description || 'No especificada'}
    - Fecha de inicio: ${p.startDate}
    - Fecha de fin: ${p.endDate}
    - Presupuesto: ${p.budget ? `${fmt(p.budget)} ${currency}` : 'No especificado'}
    - Costo real: ${p.actualCost ? `${fmt(p.actualCost)} ${currency}` : 'Aún ninguno'}
    - Ingresos: ${p.revenue ? `${fmt(p.revenue)} ${currency}` : 'No especificado'}
    - Estado: ${p.status}
    - Progreso: ${p.progress}%

    DATOS DEL CLIENTE:
    ${c ? `- Nombre: ${c.name}
    - Teléfono: ${c.phone || 'No especificado'}
    - Dirección: ${c.address || 'No especificada'}` : 'Sin datos del cliente'}

    MIEMBROS DEL EQUIPO:
    ${tms && tms.length > 0 ? tms.map((m: any) => `- ${m.name} (${m.specialty}) - Salario diario: ${m.daily_wage ? `${fmt(m.daily_wage)} ${currency}` : 'No especificado'}`).join('\n') : 'Sin miembros asignados'}

    Usa un tono profesional y genera Markdown.`,
        };

        const userPrompt = (userMessages[langCode] || userMessages['tr'])(project, customer, teamMembers || []);

    const response = await fetch("https://api.openai.com/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${OPENAI_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "gpt-4o-mini",
        messages: [
          { role: "system", content: systemPrompt },
          { role: "user", content: userPrompt },
        ],
      }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error("AI gateway error:", response.status, errorText);
      
      if (response.status === 429) {
        return new Response(JSON.stringify({ error: "Çok fazla istek gönderildi, lütfen biraz bekleyin." }), {
          status: 429,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      if (response.status === 402) {
        return new Response(JSON.stringify({ error: "Kredi yetersiz, lütfen hesabınıza kredi ekleyin." }), {
          status: 402,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      
      throw new Error(`AI gateway error: ${response.status}`);
    }

    const data = await response.json();
    const contract = data.choices?.[0]?.message?.content;

    if (!contract) {
      throw new Error("Sözleşme oluşturulamadı");
    }

    console.log("Contract generated successfully");

    return new Response(JSON.stringify({ contract }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (error) {
    console.error("Error generating contract:", error);
    return new Response(JSON.stringify({ error: error instanceof Error ? error.message : "Bilinmeyen hata" }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
