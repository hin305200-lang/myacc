/** Client-safe platform ↔ provider symbol map (biquote / MT5). */
export const PLATFORM_TO_PROVIDER: Record<string, string> = {
  EURUSD: 'EURUSD',
  GBPUSD: 'GBPUSD',
  USDJPY: 'USDJPY',
  AUDUSD: 'AUDUSD',
  EURNOK: 'EURNOK',
  USDQAR: 'USDQAR',
  USDMXN: 'USDMXN',
  BTCUSD: 'BTCUSD',
  ETHUSD: 'ETHUSD',
  SOLUSD: 'SOLUSD',
  XRPUSD: 'XRPUSD',
  XAUUSD: 'XAUUSD',
  XAGUSD: 'XAGUSD',
  UKOIL: 'UKOIL',
  USOIL: 'USOIL',
  SPX500: 'US500',
  NAS100: 'USTEC',
  DJI30: 'US30',
  DAX40: 'DE30',
  AAPL: 'AAPL',
  MSFT: 'MSFT',
  AMZN: 'AMZN',
  TSLA: 'TSLA',
  NVDA: 'NVDA',
  GOOGL: 'GOOGL',
  META: 'META',
  NFLX: 'NFLX',
  AMD: 'AMD',
}

export const PROVIDER_TO_PLATFORM: Record<string, string> = Object.fromEntries(
  Object.entries(PLATFORM_TO_PROVIDER).map(([platform, provider]) => [provider, platform])
)

export function toProviderSymbol(platform: string) {
  return PLATFORM_TO_PROVIDER[platform.toUpperCase()] ?? platform.toUpperCase()
}

export function toPlatformSymbol(provider: string) {
  return PROVIDER_TO_PLATFORM[provider.toUpperCase()] ?? provider.toUpperCase()
}

export const ALL_PROVIDER_SYMBOLS = Array.from(new Set(Object.values(PLATFORM_TO_PROVIDER)))
