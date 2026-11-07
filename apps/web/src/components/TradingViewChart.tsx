'use client'

import { useEffect, useRef } from 'react'

interface SymbolData {
  symbol: string
  bid: number
  ask: number
  spread: number
  changePercent: number
  icon: string
}

interface TradingViewChartProps {
  symbol: SymbolData
}

// Map our symbols to TradingView symbols
const getTradingViewSymbol = (symbol: string): string => {
  const symbolMap: Record<string, string> = {
    'EURUSD': 'FX:EURUSD',
    'GBPUSD': 'FX:GBPUSD',
    'USDJPY': 'FX:USDJPY',
    'AUDUSD': 'FX:AUDUSD',
    'EURNOK': 'FX:EURNOK',
    'USDQAR': 'FX:USDQAR',
    'USDMXN': 'FX:USDMXN',
    'BTCUSD': 'BINANCE:BTCUSDT',
    'ETHUSD': 'BINANCE:ETHUSDT',
    'SOLUSD': 'BINANCE:SOLUSDT',
    'XRPUSD': 'BINANCE:XRPUSDT',
    'XAUUSD': 'FX:XAUUSD',
    'XAGUSD': 'FX:XAGUSD',
    'UKOIL': 'TVC:UKOIL',
    'USOIL': 'TVC:USOIL',
    'SPX500': 'SP:SPX',
    'NAS100': 'NASDAQ:NDX',
    'DJI30': 'DJ:DJI',
    'DAX40': 'XETR:DAX',
    'AAPL': 'NASDAQ:AAPL',
    'MSFT': 'NASDAQ:MSFT',
    'AMZN': 'NASDAQ:AMZN',
    'TSLA': 'NASDAQ:TSLA',
    'NVDA': 'NASDAQ:NVDA',
    'GOOGL': 'NASDAQ:GOOGL',
    'META': 'NASDAQ:META',
    'NFLX': 'NASDAQ:NFLX',
    'AMD': 'NASDAQ:AMD',
  }
  return symbolMap[symbol] || `FX:${symbol}`
}

export default function TradingViewChart({ symbol }: TradingViewChartProps) {
  const containerRef = useRef<HTMLDivElement>(null)
  const tvSymbol = getTradingViewSymbol(symbol.symbol)

  useEffect(() => {
    if (!containerRef.current) return

    // Clear previous content
    containerRef.current.innerHTML = ''

    // Create widget container
    const widgetContainer = document.createElement('div')
    widgetContainer.className = 'tradingview-widget-container'
    widgetContainer.style.cssText = 'height: 100%; width: 100%;'

    const widgetDiv = document.createElement('div')
    widgetDiv.className = 'tradingview-widget-container__widget'
    widgetDiv.style.cssText = 'height: 100%; width: 100%;'

    const script = document.createElement('script')
    script.type = 'text/javascript'
    script.src = 'https://s3.tradingview.com/external-embedding/embed-widget-advanced-chart.js'
    script.async = true
    script.innerHTML = JSON.stringify({
      autosize: true,
      symbol: tvSymbol,
      interval: '60',
      timezone: 'Etc/UTC',
      theme: 'dark',
      style: '1',
      locale: 'en',
      enable_publishing: false,
      allow_symbol_change: false,
      hide_side_toolbar: false,
      hide_top_toolbar: false,
      withdateranges: false,
      calendar: false,
      support_host: 'https://www.tradingview.com',
      backgroundColor: '#0f1216',
      gridColor: 'rgba(42, 46, 53, 0.6)',
    })

    widgetContainer.appendChild(widgetDiv)
    widgetContainer.appendChild(script)
    containerRef.current.appendChild(widgetContainer)

    return () => {
      if (containerRef.current) {
        containerRef.current.innerHTML = ''
      }
    }
  }, [tvSymbol])

  return (
    <div className="w-full h-full relative bg-[#0f1216]">
      <div ref={containerRef} className="w-full h-full" />
    </div>
  )
}
