import { type CurrencyCode } from '../types/travel'

export const SUPPORTED_CURRENCIES: CurrencyCode[] = [
  'USD',
  'INR',
  'EUR',
  'GBP',
  'JPY',
  'AED',
  'AUD',
  'CAD',
  'CHF',
  'SGD',
]

export function normalizeCurrencyCode(code: string | undefined): CurrencyCode {
  const upper = (code ?? '').toUpperCase()
  return SUPPORTED_CURRENCIES.includes(upper as CurrencyCode)
    ? (upper as CurrencyCode)
    : 'USD'
}

export function formatMoney(amount: number, currency: CurrencyCode): string {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency,
    maximumFractionDigits: 0,
  }).format(Number.isFinite(amount) ? amount : 0)
}
