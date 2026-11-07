/** Matches backend instrument-specs contract sizes for P/L / margin display */
export const CONTRACT_SIZES: Record<string, number> = {
  EURUSD: 100000,
  GBPUSD: 100000,
  USDJPY: 100000,
  AUDUSD: 100000,
  EURNOK: 100000,
  USDQAR: 100000,
  USDMXN: 100000,
  BTCUSD: 1,
  ETHUSD: 1,
  SOLUSD: 1,
  XRPUSD: 1,
  XAUUSD: 100,
  XAGUSD: 5000,
  UKOIL: 1000,
  USOIL: 1000,
  SPX500: 1,
  NAS100: 1,
  DJI30: 1,
  DAX40: 1,
  AAPL: 1,
  MSFT: 1,
  AMZN: 1,
  TSLA: 1,
  NVDA: 1,
  GOOGL: 1,
  META: 1,
  NFLX: 1,
  AMD: 1,
}

export function contractSize(symbol: string): number {
  return CONTRACT_SIZES[symbol] ?? 100000
}
