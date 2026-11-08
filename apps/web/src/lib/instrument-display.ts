import { contractSize } from '@/lib/contract-sizes'

/** Base asset unit label for volume display (1 Lot = N units). */
const UNIT_LABEL: Record<string, string> = {
  EURUSD: 'EUR',
  GBPUSD: 'GBP',
  USDJPY: 'USD',
  AUDUSD: 'AUD',
  EURNOK: 'EUR',
  USDQAR: 'USD',
  USDMXN: 'USD',
  BTCUSD: 'BTC',
  ETHUSD: 'ETH',
  SOLUSD: 'SOL',
  XRPUSD: 'XRP',
  XAUUSD: 'oz',
  XAGUSD: 'oz',
  UKOIL: 'bbl',
  USOIL: 'bbl',
  SPX500: 'pt',
  NAS100: 'pt',
  DJI30: 'pt',
  DAX40: 'pt',
  AAPL: 'sh',
  MSFT: 'sh',
  AMZN: 'sh',
  TSLA: 'sh',
  NVDA: 'sh',
  GOOGL: 'sh',
  META: 'sh',
  NFLX: 'sh',
  AMD: 'sh',
}

/** Overnight swap per 1 lot (display only; USD). */
const SWAP_PER_LOT: Record<string, { buy: number; sell: number }> = {
  BTCUSD: { buy: -3.47, sell: -2.08 },
  ETHUSD: { buy: -1.85, sell: -1.12 },
  SOLUSD: { buy: -0.95, sell: -0.62 },
  XRPUSD: { buy: -0.48, sell: -0.31 },
  EURUSD: { buy: -7.2, sell: 1.4 },
  GBPUSD: { buy: -5.8, sell: 0.9 },
  USDJPY: { buy: 3.1, sell: -8.4 },
  AUDUSD: { buy: -2.4, sell: 0.6 },
  XAUUSD: { buy: -18.5, sell: 4.2 },
  XAGUSD: { buy: -4.1, sell: 1.1 },
  UKOIL: { buy: -6.2, sell: 1.8 },
  USOIL: { buy: -5.9, sell: 1.6 },
  NAS100: { buy: -2.1, sell: 0.4 },
  SPX500: { buy: -1.8, sell: 0.3 },
}

export function unitLabel(symbol: string): string {
  return UNIT_LABEL[symbol] ?? (symbol.replace(/USD$|EUR$|JPY$|NOK$|QAR$|MXN$/, '') || 'units')
}

export function formatVolumeUnits(symbol: string, lotSize: number): string {
  const units = Number(lotSize) * contractSize(symbol)
  const label = unitLabel(symbol)
  if (units >= 1000) return `${units.toLocaleString(undefined, { maximumFractionDigits: 2 })} ${label}`
  if (Number.isInteger(units)) return `${units.toFixed(2)} ${label}`
  return `${units.toFixed(units < 1 ? 4 : 2)} ${label}`
}

export function swapRates(symbol: string): { buy: number; sell: number } {
  return SWAP_PER_LOT[symbol] ?? { buy: 0, sell: 0 }
}

export function minPriceChange(symbol: string): number {
  if (['BTCUSD', 'ETHUSD'].includes(symbol)) return 0.01
  if (symbol === 'SOLUSD') return 0.001
  if (symbol === 'XRPUSD') return 0.00001
  if (['XAUUSD', 'XAGUSD', 'UKOIL', 'USOIL'].includes(symbol)) return 0.001
  if (['USDJPY'].includes(symbol)) return 0.001
  if (symbol.endsWith('USD') && symbol.length === 6) return 0.00001
  return 0.01
}
