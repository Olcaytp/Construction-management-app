/**
 * Copyright © 2026 Olcaytp. All rights reserved.
 * Currency format hook - Global currency management
 */

import { useEffect, useState, useMemo } from 'react';

interface CurrencyFormat {
  symbol: string;
  locale: string;
  symbolAtEnd: boolean;
  code: string;
}

const CURRENCY_MAP: Record<string, CurrencyFormat> = {
  TRY: { symbol: '₺', locale: 'tr-TR', symbolAtEnd: false, code: 'TRY' },
  SEK: { symbol: 'kr', locale: 'sv-SE', symbolAtEnd: true, code: 'SEK' },
  EUR: { symbol: '€', locale: 'de-DE', symbolAtEnd: false, code: 'EUR' },
  USD: { symbol: '$', locale: 'en-US', symbolAtEnd: false, code: 'USD' },
  GBP: { symbol: '£', locale: 'en-GB', symbolAtEnd: false, code: 'GBP' },
  NOK: { symbol: 'kr', locale: 'nb-NO', symbolAtEnd: true, code: 'NOK' },
  DKK: { symbol: 'kr', locale: 'da-DK', symbolAtEnd: true, code: 'DKK' },
  CHF: { symbol: 'CHF', locale: 'de-CH', symbolAtEnd: true, code: 'CHF' },
  CAD: { symbol: '$', locale: 'en-CA', symbolAtEnd: false, code: 'CAD' },
  MXN: { symbol: '$', locale: 'es-MX', symbolAtEnd: false, code: 'MXN' },
  BRL: { symbol: 'R$', locale: 'pt-BR', symbolAtEnd: false, code: 'BRL' },
  ARS: { symbol: '$', locale: 'es-AR', symbolAtEnd: false, code: 'ARS' },
};

/**
 * Hook to get currency format from localStorage or language fallback
 * Returns currency configuration based on user's stored preference
 */
export const useCurrencyFormat = (): CurrencyFormat => {
  const [currencyFormat, setCurrencyFormat] = useState<CurrencyFormat>(CURRENCY_MAP.TRY);

  useEffect(() => {
    // Load from localStorage first
    const storedCurrency = localStorage.getItem('userCurrency');
    
    if (storedCurrency && CURRENCY_MAP[storedCurrency]) {
      setCurrencyFormat(CURRENCY_MAP[storedCurrency]);
      console.log('[useCurrencyFormat] Using stored currency:', storedCurrency);
    } else {
      // Fallback to default
      setCurrencyFormat(CURRENCY_MAP.TRY);
    }

    // Listen for storage changes (for multi-tab sync)
    const handleStorageChange = (e: StorageEvent) => {
      if (e.key === 'userCurrency' && e.newValue && CURRENCY_MAP[e.newValue]) {
        setCurrencyFormat(CURRENCY_MAP[e.newValue]);
        console.log('[useCurrencyFormat] Currency changed:', e.newValue);
      }
    };

    window.addEventListener('storage', handleStorageChange);
    return () => window.removeEventListener('storage', handleStorageChange);
  }, []);

  return currencyFormat;
};

/**
 * Hook to format currency values based on stored preference
 */
export const useFormatCurrency = () => {
  const currencyFormat = useCurrencyFormat();

  const formatCurrency = (amount: number): string => {
    const formattedAmount = amount.toLocaleString(currencyFormat.locale, {
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    });

    if (currencyFormat.symbolAtEnd) {
      return `${formattedAmount} ${currencyFormat.symbol}`;
    } else {
      return `${currencyFormat.symbol}${formattedAmount}`;
    }
  };

  return { formatCurrency, currency: currencyFormat };
};
