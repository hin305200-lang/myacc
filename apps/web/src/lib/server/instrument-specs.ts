/** Broker-style instrument specs used for margin / P/L (account currency = USD). */

export type InstrumentCategory = 'forex' | 'crypto' | 'stocks' | 'commodities' | 'indices'

export type InstrumentSpec = {
  symbol: string
  /** External provider symbol (biquote / MT5 feed) */
  providerSymbol: string
  category: InstrumentCategory
  /** Contract size in base units (standard lot) */
  contractSize: number
  digits: number
  tickSize: number
}

/** Platform symbols → provider symbols + contract specs */
export const INSTRUMENTS: Record<string, InstrumentSpec> = {
  EURUSD: { symbol: 'EURUSD', providerSymbol: 'EURUSD', category: 'forex', contractSize: 100000, digits: 5, tickSize: 0.00001 },
  GBPUSD: { symbol: 'GBPUSD', providerSymbol: 'GBPUSD', category: 'forex', contractSize: 100000, digits: 5, tickSize: 0.00001 },
  USDJPY: { symbol: 'USDJPY', providerSymbol: 'USDJPY', category: 'forex', contractSize: 100000, digits: 3, tickSize: 0.001 },
  AUDUSD: { symbol: 'AUDUSD', providerSymbol: 'AUDUSD', category: 'forex', contractSize: 100000, digits: 5, tickSize: 0.00001 },
  EURNOK: { symbol: 'EURNOK', providerSymbol: 'EURNOK', category: 'forex', contractSize: 100000, digits: 5, tickSize: 0.00001 },
  USDQAR: { symbol: 'USDQAR', providerSymbol: 'USDQAR', category: 'forex', contractSize: 100000, digits: 5, tickSize: 0.00001 },
  USDMXN: { symbol: 'USDMXN', providerSymbol: 'USDMXN', category: 'forex', contractSize: 100000, digits: 5, tickSize: 0.00001 },
  BTCUSD: { symbol: 'BTCUSD', providerSymbol: 'BTCUSD', category: 'crypto', contractSize: 1, digits: 2, tickSize: 0.01 },
  ETHUSD: { symbol: 'ETHUSD', providerSymbol: 'ETHUSD', category: 'crypto', contractSize: 1, digits: 2, tickSize: 0.01 },
  SOLUSD: { symbol: 'SOLUSD', providerSymbol: 'SOLUSD', category: 'crypto', contractSize: 1, digits: 3, tickSize: 0.001 },
  XRPUSD: { symbol: 'XRPUSD', providerSymbol: 'XRPUSD', category: 'crypto', contractSize: 1, digits: 5, tickSize: 0.00001 },
  XAUUSD: { symbol: 'XAUUSD', providerSymbol: 'XAUUSD', category: 'commodities', contractSize: 100, digits: 3, tickSize: 0.001 },
  XAGUSD: { symbol: 'XAGUSD', providerSymbol: 'XAGUSD', category: 'commodities', contractSize: 5000, digits: 3, tickSize: 0.001 },
  UKOIL: { symbol: 'UKOIL', providerSymbol: 'UKOIL', category: 'commodities', contractSize: 1000, digits: 3, tickSize: 0.001 },
  USOIL: { symbol: 'USOIL', providerSymbol: 'USOIL', category: 'commodities', contractSize: 1000, digits: 3, tickSize: 0.001 },
  SPX500: { symbol: 'SPX500', providerSymbol: 'US500', category: 'indices', contractSize: 1, digits: 2, tickSize: 0.01 },
  NAS100: { symbol: 'NAS100', providerSymbol: 'USTEC', category: 'indices', contractSize: 1, digits: 2, tickSize: 0.01 },
  DJI30: { symbol: 'DJI30', providerSymbol: 'US30', category: 'indices', contractSize: 1, digits: 2, tickSize: 0.01 },
  DAX40: { symbol: 'DAX40', providerSymbol: 'DE30', category: 'indices', contractSize: 1, digits: 2, tickSize: 0.01 },
  AAPL: { symbol: 'AAPL', providerSymbol: 'AAPL', category: 'stocks', contractSize: 1, digits: 2, tickSize: 0.01 },
  MSFT: { symbol: 'MSFT', providerSymbol: 'MSFT', category: 'stocks', contractSize: 1, digits: 2, tickSize: 0.01 },
  AMZN: { symbol: 'AMZN', providerSymbol: 'AMZN', category: 'stocks', contractSize: 1, digits: 2, tickSize: 0.01 },
  TSLA: { symbol: 'TSLA', providerSymbol: 'TSLA', category: 'stocks', contractSize: 1, digits: 2, tickSize: 0.01 },
  NVDA: { symbol: 'NVDA', providerSymbol: 'NVDA', category: 'stocks', contractSize: 1, digits: 2, tickSize: 0.01 },
  GOOGL: { symbol: 'GOOGL', providerSymbol: 'GOOGL', category: 'stocks', contractSize: 1, digits: 2, tickSize: 0.01 },
  META: { symbol: 'META', providerSymbol: 'META', category: 'stocks', contractSize: 1, digits: 2, tickSize: 0.01 },
  NFLX: { symbol: 'NFLX', providerSymbol: 'NFLX', category: 'stocks', contractSize: 1, digits: 2, tickSize: 0.01 },
  AMD: { symbol: 'AMD', providerSymbol: 'AMD', category: 'stocks', contractSize: 1, digits: 2, tickSize: 0.01 },
}

export function getInstrument(symbol: string): InstrumentSpec | null {
  return INSTRUMENTS[symbol.toUpperCase()] ?? null
}

export function providerSymbolFor(symbol: string): string {
  return getInstrument(symbol)?.providerSymbol ?? symbol.toUpperCase()
}

export function contractSizeFor(symbol: string): number {
  return getInstrument(symbol)?.contractSize ?? 100000
}

export const ALL_PLATFORM_SYMBOLS = Object.keys(INSTRUMENTS)
