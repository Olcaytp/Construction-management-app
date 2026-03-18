/**
 * Copyright © 2026 Olcaytp. All rights reserved.
 * Location detection and localization mapping
 */

export interface LocationData {
  country: string;
  countryCode: string;
  language: string;
  currency: string;
}

// Country code to config mapping
const COUNTRY_CONFIG: Record<string, LocationData> = {
  // Turkey
  'TR': { country: 'Türkiye', countryCode: 'TR', language: 'tr', currency: 'TRY' },

  // Sweden
  'SE': { country: 'İsveç', countryCode: 'SE', language: 'sv', currency: 'SEK' },

  // European countries - Euro
  'DE': { country: 'Almanya', countryCode: 'DE', language: 'en', currency: 'EUR' },
  'FR': { country: 'Fransa', countryCode: 'FR', language: 'en', currency: 'EUR' },
  'IT': { country: 'İtalya', countryCode: 'IT', language: 'en', currency: 'EUR' },
  'ES': { country: 'İspanya', countryCode: 'ES', language: 'en', currency: 'EUR' },
  'AT': { country: 'Avusturya', countryCode: 'AT', language: 'en', currency: 'EUR' },
  'BE': { country: 'Belçika', countryCode: 'BE', language: 'en', currency: 'EUR' },
  'CZ': { country: 'Çek Cumhuriyeti', countryCode: 'CZ', language: 'en', currency: 'EUR' },
  'NL': { country: 'Hollanda', countryCode: 'NL', language: 'en', currency: 'EUR' },
  'PL': { country: 'Polonya', countryCode: 'PL', language: 'en', currency: 'EUR' },
  'PT': { country: 'Portekiz', countryCode: 'PT', language: 'en', currency: 'EUR' },
  'GR': { country: 'Yunanistan', countryCode: 'GR', language: 'en', currency: 'EUR' },
  'IE': { country: 'İrlanda', countryCode: 'IE', language: 'en', currency: 'EUR' },
  'LU': { country: 'Lüksemburg', countryCode: 'LU', language: 'en', currency: 'EUR' },
  'MT': { country: 'Malta', countryCode: 'MT', language: 'en', currency: 'EUR' },
  'CY': { country: 'Kıbrıs', countryCode: 'CY', language: 'en', currency: 'EUR' },
  'SK': { country: 'Slovakya', countryCode: 'SK', language: 'en', currency: 'EUR' },
  'SI': { country: 'Slovenya', countryCode: 'SI', language: 'en', currency: 'EUR' },
  'FI': { country: 'Finlandiya', countryCode: 'FI', language: 'en', currency: 'EUR' },

  // Other European countries
  'GB': { country: 'İngiltere', countryCode: 'GB', language: 'en', currency: 'GBP' },
  'NO': { country: 'Norveç', countryCode: 'NO', language: 'en', currency: 'NOK' },
  'DK': { country: 'Danimarka', countryCode: 'DK', language: 'en', currency: 'DKK' },
  'CH': { country: 'İsviçre', countryCode: 'CH', language: 'en', currency: 'CHF' },

  // Americas
  'US': { country: 'Amerika', countryCode: 'US', language: 'en', currency: 'USD' },
  'CA': { country: 'Kanada', countryCode: 'CA', language: 'en', currency: 'CAD' },
  'MX': { country: 'Meksika', countryCode: 'MX', language: 'en', currency: 'MXN' },
  'BR': { country: 'Brezilya', countryCode: 'BR', language: 'en', currency: 'BRL' },
  'AR': { country: 'Arjantin', countryCode: 'AR', language: 'en', currency: 'ARS' },

  // Default fallback
  'DEFAULT': { country: 'Diğer', countryCode: 'OTHER', language: 'en', currency: 'USD' },
};

/**
 * Detect user's location from IP and return localization config
 * Uses free geolocation API (no API key needed for basic usage)
 */
export async function detectLocation(): Promise<LocationData> {
  try {
    // Try multiple geolocation services as fallback
    const response = await fetch('https://ipapi.co/json/', {
      signal: AbortSignal.timeout(5000), // 5 second timeout
    });

    if (!response.ok) {
      console.warn('Location detection failed, using default');
      return COUNTRY_CONFIG['DEFAULT'];
    }

    const data = await response.json();
    const countryCode = data.country_code?.toUpperCase();

    if (countryCode && COUNTRY_CONFIG[countryCode]) {
      console.log(`[Location] Detected country: ${countryCode}`);
      return COUNTRY_CONFIG[countryCode];
    }

    console.warn(`[Location] Unknown country code: ${countryCode}, using default`);
    return COUNTRY_CONFIG['DEFAULT'];
  } catch (error) {
    console.error('Location detection error:', error);
    return COUNTRY_CONFIG['DEFAULT'];
  }
}

/**
 * Get localization config from country code
 */
export function getLocationConfig(countryCode: string): LocationData {
  return COUNTRY_CONFIG[countryCode] || COUNTRY_CONFIG['DEFAULT'];
}

/**
 * Check if this is the first time user opens the app
 */
export function isFirstTimeUser(): boolean {
  return !localStorage.getItem('hasInitializedLocation');
}

/**
 * Mark that location initialization is complete
 */
export function markLocationInitialized(): void {
  localStorage.setItem('hasInitializedLocation', 'true');
}
