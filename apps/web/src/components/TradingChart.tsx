'use client'

import { useEffect, useMemo, useRef, useState } from 'react'
import type { IChartApi, ISeriesApi, Time } from 'lightweight-charts'
import { Settings, Maximize2, BarChart3, Zap, TrendingUp, TrendingDown, Activity, Layers } from 'lucide-react'

interface SymbolData {
  symbol: string
  bid: number
  ask: number
  spread: number
  changePercent: number
  icon: string
}

interface TradingChartProps {
  symbol: SymbolData
  candles: {
    time: number
    open: number
    high: number
    low: number
    close: number
  }[]
}

export default function TradingChart({ symbol, candles }: TradingChartProps) {
  const mainContainerRef = useRef<HTMLDivElement>(null)
  const rsiContainerRef = useRef<HTMLDivElement>(null)
  const macdContainerRef = useRef<HTMLDivElement>(null)
  
  const mainChartRef = useRef<IChartApi | null>(null)
  const rsiChartRef = useRef<IChartApi | null>(null)
  const macdChartRef = useRef<IChartApi | null>(null)
  
  const seriesRef = useRef<ISeriesApi<'Candlestick'> | null>(null)
  const seriesRef = useRef<ISeriesApi<'Candlestick'> | null>(null)
const ema20Ref = useRef<ISeriesApi<'Line'> | null>(null)
const ema50Ref = useRef<ISeriesApi<'Line'> | null>(null)
const ema200Ref = useRef<ISeriesApi<'Line'> | null>(null)
const volumeRef = useRef<ISeriesApi<'Histogram'> | null>(null)
const rsiRef = useRef<ISeriesApi<'Line'> | null>(null)
const macdLineRef = useRef<ISeriesApi<'Line'> | null>(null)
const macdSignalRef = useRef<ISeriesApi<'Line'> | null>(null)
const macdHistRef = useRef<ISeriesApi<'Histogram'> | null>(null)
  
  const [showIndicators, setShowIndicators] = useState(true)
  const [chartLoaded, setChartLoaded] = useState(false)
  const [timeframe, setTimeframe] = useState<'1H' | '4H' | '1D' | '1W'>('1H')
  const [crosshairData, setCrosshairData] = useState<{ price?: number; time?: string } | null>(null)

  // Generate realistic market data
  const effectiveCandles = useMemo(() => {
    if (candles.length > 0) return candles
    const now = Date.now()
    const seed = symbol.bid || 1.1
    const arr: typeof candles = []
    let price = seed
    let trend = 1
    
    for (let i = 200; i >= 0; i--) {
      const volatility = 0.001
      const drift = (Math.random() - 0.48) * volatility * trend
      price += drift
      
      if (Math.random() < 0.05) trend *= -1
      
      const open = price
      const change = (Math.random() - 0.5) * volatility * 2
      const close = open + change
      const high = Math.max(open, close) + Math.abs(Math.random() * volatility * 0.5)
      const low = Math.min(open, close) - Math.abs(Math.random() * volatility * 0.5)
      
      arr.push({
        time: now - i * 3600000,
        open,
        high,
        low,
        close,
      })
      price = close
    }
    return arr
  }, [candles, symbol.bid])

  // Calculate EMA
  const calculateEMA = (data: number[], period: number): number[] => {
    const multiplier = 2 / (period + 1)
    const ema: number[] = []
    let sum = 0
    
    for (let i = 0; i < data.length; i++) {
      if (i < period) {
        sum += data[i]
        ema.push(sum / (i + 1))
      } else {
        const prevEMA = ema[i - 1]
        ema.push((data[i] - prevEMA) * multiplier + prevEMA)
      }
    }
    return ema
  }

  // Calculate RSI
  const calculateRSI = (closes: number[], period: number = 14): number[] => {
    const rsi: number[] = []
    const gains: number[] = []
    const losses: number[] = []
    
    for (let i = 1; i < closes.length; i++) {
      const change = closes[i] - closes[i - 1]
      gains.push(change > 0 ? change : 0)
      losses.push(change < 0 ? -change : 0)
    }
    
    for (let i = period - 1; i < gains.length; i++) {
      const avgGain = gains.slice(i - period + 1, i + 1).reduce((a, b) => a + b, 0) / period
      const avgLoss = losses.slice(i - period + 1, i + 1).reduce((a, b) => a + b, 0) / period
      const rs = avgLoss === 0 ? 100 : avgGain / avgLoss
      rsi.push(100 - (100 / (1 + rs)))
    }
    
    return [...new Array(period).fill(50), ...rsi]
  }

  // Calculate MACD
  const calculateMACD = (closes: number[]) => {
    const ema12 = calculateEMA(closes, 12)
    const ema26 = calculateEMA(closes, 26)
    const macdLine = ema12.map((val, i) => val - ema26[i])
    const signalLine = calculateEMA(macdLine, 9)
    const histogram = macdLine.map((val, i) => val - signalLine[i])
    
    return { macdLine, signalLine, histogram }
  }

  // Initialize main chart
  useEffect(() => {
    const container = mainContainerRef.current
    if (!container) return

    let chart: IChartApi | null = null
    let resizeObserver: ResizeObserver | null = null

    const initChart = async () => {
      try {
        const lw = await import('lightweight-charts')
        
        // Get dimensions with retry logic
        const getDimensions = async (retries = 0): Promise<{ width: number; height: number }> => {
          const rect = container.getBoundingClientRect()
          let width = rect.width || container.clientWidth || 800
          let height = rect.height || container.clientHeight || 500
          
          // If dimensions are still 0, wait a bit and retry
          if ((width === 0 || height === 0) && retries < 5) {
            await new Promise((resolve) => setTimeout(resolve, 100))
            return getDimensions(retries + 1)
          }
          
          // Ensure minimum dimensions
          if (width === 0 || height === 0) {
            width = 800
            height = 500
          }
          
          container.style.width = `${width}px`
          container.style.height = `${height}px`
          
          return { width, height }
        }
        
        const { width, height } = await getDimensions()

        chart = lw.createChart(container, {
          layout: {
            background: { type: lw.ColorType.Solid, color: '#0a0f1c' },
            textColor: '#8b9dc3',
            fontFamily: 'Inter, sans-serif',
            fontSize: 11,
          },
          grid: {
            vertLines: { color: '#1a1f2e', style: 0, visible: true },
            horzLines: { color: '#1a1f2e', style: 0, visible: true },
          },
          crosshair: {
            mode: 1,
            vertLine: { 
              color: '#06b6d4', 
              width: 1, 
              style: 0,
              labelBackgroundColor: '#0a0f1c',
              labelTextColor: '#06b6d4',
            },
            horzLine: { 
              color: '#06b6d4', 
              width: 1, 
              style: 0,
              labelBackgroundColor: '#0a0f1c',
              labelTextColor: '#06b6d4',
            },
          },
          rightPriceScale: {
            borderColor: '#1a1f2e',
            scaleMargins: { top: 0.1, bottom: 0.2 },
            entireTextOnly: false,
            textColor: '#8b9dc3',
          },
          timeScale: {
            borderColor: '#1a1f2e',
            timeVisible: true,
            secondsVisible: false,
            fixLeftEdge: true,
            rightOffset: 10,
            textColor: '#8b9dc3',
          },
          width,
          height,
          handleScroll: { mouseWheel: true, pressedMouseMove: true },
          handleScale: { mouseWheel: true, pinch: true, axisPressedMouseMove: true },
        })
        
        // Subscribe to crosshair
        chart.subscribeCrosshairMove((param) => {
          if (param.point === undefined || !param.time || param.seriesData.size === 0) {
            setCrosshairData(null)
            return
          }
          
          const candleData = param.seriesData.get(seriesRef.current!) as any
          if (candleData) {
            const timeStr = new Date(Number(param.time) * 1000).toLocaleTimeString('en-US', {
              hour: '2-digit',
              minute: '2-digit',
            })
            setCrosshairData({
              price: candleData.close,
              time: timeStr,
            })
          }
        })

        // Add series
        seriesRef.current = chart.addCandlestickSeries({
          upColor: '#10b981',
          downColor: '#ef4444',
          wickUpColor: '#10b981',
          wickDownColor: '#ef4444',
          borderVisible: true,
          borderUpColor: '#34d399',
          borderDownColor: '#f87171',
          priceLineVisible: false,
          lastValueVisible: true,
        })

        ema20Ref.current = chart.addLineSeries({
          color: '#06b6d4',
          lineWidth: 2,
          priceLineVisible: false,
          lastValueVisible: false,
          title: 'EMA 20',
        })

        ema50Ref.current = chart.addLineSeries({
          color: '#8b5cf6',
          lineWidth: 2.5,
          priceLineVisible: false,
          lastValueVisible: false,
          title: 'EMA 50',
        })

        ema200Ref.current = chart.addLineSeries({
          color: '#f59e0b',
          lineWidth: 3,
          priceLineVisible: false,
          lastValueVisible: false,
          title: 'EMA 200',
        })

        volumeRef.current = chart.addHistogramSeries({
          color: '#06b6d4',
          priceFormat: { type: 'volume' },
          priceScaleId: '',
          scaleMargins: { top: 0.8, bottom: 0 },
        })

        mainChartRef.current = chart
        setChartLoaded(true)

        // Resize observer with debouncing
        let resizeTimeout: NodeJS.Timeout | null = null
        resizeObserver = new ResizeObserver(() => {
          if (resizeTimeout) clearTimeout(resizeTimeout)
          resizeTimeout = setTimeout(() => {
          const rect = container.getBoundingClientRect()
            if (rect.width > 0 && rect.height > 0 && chart) {
              chart.applyOptions({ width: rect.width, height: rect.height })
          }
          }, 100)
        })
        resizeObserver.observe(container)

      } catch (err) {
        console.error('Chart initialization failed:', err)
        setChartLoaded(false)
      }
    }

    // Initialize with delay and ensure container is ready
    const timer = setTimeout(() => {
      if (container && container.offsetWidth > 0 && container.offsetHeight > 0) {
        initChart()
      } else {
        // Wait for container to be properly sized
        const checkAndInit = setInterval(() => {
          if (container && container.offsetWidth > 0 && container.offsetHeight > 0) {
            clearInterval(checkAndInit)
      initChart()
          }
        }, 50)
        setTimeout(() => clearInterval(checkAndInit), 2000) // Max 2 second wait
      }
    }, 150)

    return () => {
      clearTimeout(timer)
      resizeObserver?.disconnect()
      if (chart) {
        try {
          chart.remove()
        } catch (e) {
          console.error('Error removing chart:', e)
        }
      }
      mainChartRef.current = null
      seriesRef.current = null
      ema20Ref.current = null
      ema50Ref.current = null
      ema200Ref.current = null
      volumeRef.current = null
      setChartLoaded(false)
    }
  }, [symbol.symbol]) // Re-initialize when symbol changes

  // Initialize RSI chart
  useEffect(() => {
    const container = rsiContainerRef.current
    if (!container || !showIndicators || !chartLoaded) return

    let chart: IChartApi | null = null

    const initRSI = async () => {
      try {
        const lw = await import('lightweight-charts')
        const width = container.clientWidth || 900
        const height = 100

        chart = lw.createChart(container, {
          layout: {
            background: { type: lw.ColorType.Solid, color: '#0a0f1c' },
            textColor: '#8b9dc3',
            fontFamily: 'Inter, sans-serif',
            fontSize: 10,
          },
          grid: {
            vertLines: { color: '#1a1f2e', visible: false },
            horzLines: { color: '#1a1f2e', visible: true },
          },
          rightPriceScale: {
            borderColor: '#1a1f2e',
            scaleMargins: { top: 0.1, bottom: 0.1 },
            entireTextOnly: false,
            textColor: '#8b9dc3',
          },
          timeScale: {
            borderColor: '#1a1f2e',
            visible: false,
          },
          width,
          height,
          handleScroll: { mouseWheel: false, pressedMouseMove: false },
          handleScale: { mouseWheel: false, pinch: false },
        })

        rsiRef.current = chart.addLineSeries({
          color: '#8b5cf6',
          lineWidth: 2,
          priceLineVisible: false,
        })

        chart.createPriceLine({ price: 70, color: '#ef5350', lineWidth: 1, lineStyle: 2, axisLabelVisible: true })
        chart.createPriceLine({ price: 50, color: '#758696', lineWidth: 1, lineStyle: 2, axisLabelVisible: true })
        chart.createPriceLine({ price: 30, color: '#26a69a', lineWidth: 1, lineStyle: 2, axisLabelVisible: true })

        rsiChartRef.current = chart
      } catch (err) {
        console.error('RSI chart initialization failed:', err)
      }
    }

    initRSI()

    return () => {
      chart?.remove()
      rsiChartRef.current = null
      rsiRef.current = null
    }
  }, [showIndicators, chartLoaded])

  // Initialize MACD chart
  useEffect(() => {
    const container = macdContainerRef.current
    if (!container || !showIndicators || !chartLoaded) return

    let chart: IChartApi | null = null

    const initMACD = async () => {
      try {
        const lw = await import('lightweight-charts')
        const width = container.clientWidth || 900
        const height = 100

        chart = lw.createChart(container, {
          layout: {
            background: { type: lw.ColorType.Solid, color: '#0a0f1c' },
            textColor: '#8b9dc3',
            fontFamily: 'Inter, sans-serif',
            fontSize: 10,
          },
          grid: {
            vertLines: { color: '#1a1f2e', visible: false },
            horzLines: { color: '#1a1f2e', visible: true },
          },
          rightPriceScale: {
            borderColor: '#1a1f2e',
            scaleMargins: { top: 0.1, bottom: 0.1 },
            entireTextOnly: false,
            textColor: '#8b9dc3',
          },
          timeScale: {
            borderColor: '#1a1f2e',
            visible: false,
          },
          width,
          height,
          handleScroll: { mouseWheel: false, pressedMouseMove: false },
          handleScale: { mouseWheel: false, pinch: false },
        })

        macdLineRef.current = chart.addLineSeries({
          color: '#06b6d4',
          lineWidth: 2,
          priceLineVisible: false,
        })

        macdSignalRef.current = chart.addLineSeries({
          color: '#8b5cf6',
          lineWidth: 2,
          priceLineVisible: false,
        })

        macdHistRef.current = chart.addHistogramSeries({
          color: '#10b981',
          priceFormat: { type: 'price', precision: 4 },
          priceScaleId: '',
          scaleMargins: { top: 0.5, bottom: 0 },
        })

        chart.createPriceLine({ price: 0, color: '#758696', lineWidth: 1, lineStyle: 2 })

        macdChartRef.current = chart
      } catch (err) {
        console.error('MACD chart initialization failed:', err)
      }
    }

    initMACD()

    return () => {
      chart?.remove()
      macdChartRef.current = null
      macdLineRef.current = null
      macdSignalRef.current = null
      macdHistRef.current = null
    }
  }, [showIndicators, chartLoaded])

  // Update chart data
  useEffect(() => {
    if (!chartLoaded || !seriesRef.current || effectiveCandles.length === 0) {
      return
    }

    // Ensure candles are sorted by time
    const sortedCandles = [...effectiveCandles].sort((a, b) => a.time - b.time)
    
    const mapped = sortedCandles.map((c) => {
      // Convert milliseconds to seconds (Unix timestamp)
      const timeInSeconds = Math.floor(c.time / 1000)
      return {
        time: timeInSeconds as Time,
        open: Number(c.open),
        high: Number(c.high),
        low: Number(c.low),
        close: Number(c.close),
      }
    }).filter(c => c.time > 0 && isFinite(c.open) && isFinite(c.close))

    if (mapped.length === 0) {
      console.warn('No valid candle data to display')
      return
    }

    const closes = mapped.map((c) => c.close)
    const times = mapped.map((c) => c.time)

    // Set candlestick data
    try {
      if (seriesRef.current) {
      seriesRef.current.setData(mapped)
        // Fit content after a short delay to ensure chart is ready
      setTimeout(() => {
          if (mainChartRef.current) {
            mainChartRef.current.timeScale().fitContent()
          }
        }, 150)
      }
    } catch (err) {
      console.error('Error setting candlestick data:', err)
    }

    if (showIndicators && mapped.length > 0) {
      // EMAs
      const ema20 = calculateEMA(closes, Math.min(20, closes.length))
      const ema50 = closes.length >= 50 ? calculateEMA(closes, 50) : null
      const ema200 = closes.length >= 200 ? calculateEMA(closes, 200) : null

      ema20Ref.current?.setData(times.map((t, i) => ({ time: t, value: ema20[i] })))
      if (ema50) {
      ema50Ref.current?.setData(times.map((t, i) => ({ time: t, value: ema50[i] })))
      }
      if (ema200) {
      ema200Ref.current?.setData(times.map((t, i) => ({ time: t, value: ema200[i] })))
      }

      // Volume
      if (volumeRef.current) {
        const volume = mapped.map((c, i) => ({
          time: c.time,
          value: Math.abs((c.close - (mapped[i - 1]?.close || c.close)) * 1000000) + Math.random() * 500000,
          color: c.close >= (mapped[i - 1]?.close || c.close) ? '#10b981' : '#ef4444',
        }))
        volumeRef.current.setData(volume)
      }

      // RSI
      if (rsiRef.current) {
        const rsi = calculateRSI(closes, 14)
        rsiRef.current.setData(times.map((t, i) => ({ time: t, value: rsi[i] || 50 })))
        rsiChartRef.current?.timeScale().fitContent()
      }

      // MACD
      if (macdLineRef.current && macdSignalRef.current && macdHistRef.current) {
        const { macdLine, signalLine, histogram } = calculateMACD(closes)
        macdLineRef.current.setData(times.map((t, i) => ({ time: t, value: macdLine[i] || 0 })))
        macdSignalRef.current.setData(times.map((t, i) => ({ time: t, value: signalLine[i] || 0 })))
        macdHistRef.current.setData(
          times.map((t, i) => ({
            time: t,
            value: histogram[i] || 0,
            color: histogram[i] >= 0 ? '#10b981' : '#ef4444',
          }))
        )
        macdChartRef.current?.timeScale().fitContent()
      }
    }
  }, [effectiveCandles, showIndicators, chartLoaded])

  const lastCandle = effectiveCandles[effectiveCandles.length - 1]
  const priceLabel = useMemo(() => {
    const price = symbol.bid ?? lastCandle?.close ?? 0
    const decimals = price > 1000 ? 2 : price > 100 ? 3 : price > 10 ? 4 : 5
    return price.toFixed(decimals)
  }, [symbol.bid, lastCandle])

  const ohlcData = useMemo(() => {
    if (!lastCandle) return null
    const decimals = lastCandle.close > 1000 ? 2 : lastCandle.close > 100 ? 3 : lastCandle.close > 10 ? 4 : 5
    return {
      open: lastCandle.open.toFixed(decimals),
      high: lastCandle.high.toFixed(decimals),
      low: lastCandle.low.toFixed(decimals),
      close: lastCandle.close.toFixed(decimals),
    }
  }, [lastCandle])

  return (
    <div className="relative h-full w-full flex flex-col rounded-2xl border border-white/10 bg-gradient-to-br from-[#0a0f1c] via-[#0c1220] to-[#0a0f1c] overflow-hidden shadow-[0_20px_60px_rgba(0,0,0,0.5)]" style={{ display: 'flex', flexDirection: 'column', maxHeight: '100%' }}>
      {/* Advanced Toolbar */}
      <div className="relative flex items-center gap-3 px-4 py-3 border-b border-white/10 bg-gradient-to-r from-[#0f172a] via-[#0c1220] to-[#0f172a] flex-shrink-0 backdrop-blur-sm">
        <div className="absolute inset-0 bg-gradient-to-r from-cyan-500/5 via-purple-500/5 to-cyan-500/5 opacity-50" />
        
        <div className="relative flex items-center gap-3">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-cyan-500/20 to-purple-500/20 border border-cyan-500/30 flex items-center justify-center">
              <span className="text-sm font-bold text-cyan-400">{symbol.icon}</span>
            </div>
            <div>
              <div className="text-sm font-bold text-white tracking-tight">{symbol.symbol}</div>
              <div className="text-[10px] text-slate-400">Spread: {symbol.spread.toFixed(symbol.spread > 10 ? 2 : 5)}</div>
            </div>
          </div>
          
          <div className={`flex items-center gap-1.5 px-2.5 py-1 rounded-lg ${
            symbol.changePercent >= 0 
              ? 'bg-green-500/10 border border-green-500/30' 
              : 'bg-red-500/10 border border-red-500/30'
          }`}>
            {symbol.changePercent >= 0 ? (
              <TrendingUp size={12} className="text-green-400" />
            ) : (
              <TrendingDown size={12} className="text-red-400" />
            )}
            <span className={`text-xs font-bold ${symbol.changePercent >= 0 ? 'text-green-400' : 'text-red-400'}`}>
              {symbol.changePercent >= 0 ? '+' : ''}
              {symbol.changePercent.toFixed(2)}%
            </span>
          </div>
        </div>
        
        <div className="relative flex-1" />
        
        <div className="relative flex items-center gap-1 bg-white/5 rounded-lg p-1 border border-white/10">
          {(['1H', '4H', '1D', '1W'] as const).map((tf) => (
            <button
              key={tf}
              onClick={() => setTimeframe(tf)}
              className={`px-2.5 py-1 text-[10px] font-semibold rounded transition-all ${
                timeframe === tf
                  ? 'bg-gradient-to-r from-cyan-500 to-purple-500 text-white shadow-lg shadow-cyan-500/30'
                  : 'text-slate-400 hover:text-white'
              }`}
            >
              {tf}
            </button>
          ))}
        </div>
        
        <div className="relative flex items-center gap-1">
          <button
            onClick={() => setShowIndicators((v) => !v)}
            className={`p-2 rounded-lg transition-all ${
              showIndicators 
                ? 'bg-cyan-500/20 text-cyan-400 border border-cyan-500/30' 
                : 'text-slate-400 hover:text-white hover:bg-white/5'
            }`}
            title="Toggle indicators"
          >
            <Layers size={14} />
          </button>
          <button 
            className="p-2 rounded-lg text-slate-400 hover:text-white hover:bg-white/5 transition-all" 
            title="Settings"
          >
            <Settings size={14} />
          </button>
          <button 
            className="p-2 rounded-lg text-slate-400 hover:text-white hover:bg-white/5 transition-all" 
            title="Fullscreen"
          >
            <Maximize2 size={14} />
          </button>
        </div>
      </div>

      {/* Main Chart */}
      <div className="flex-1 relative bg-[#0a0f1c] overflow-hidden" style={{ display: 'flex', flexDirection: 'column', position: 'relative', minHeight: 0 }}>
        <div 
          ref={mainContainerRef} 
          className="w-full h-full" 
          style={{ 
            minWidth: '100%',
            width: '100%',
            height: '100%',
            minHeight: '400px',
            backgroundColor: '#0a0f1c',
            position: 'relative',
            zIndex: 1,
            flex: '1 1 0%',
          }}
        />
        
        {/* Advanced Price Overlay */}
        {chartLoaded && (
          <>
            <div className="absolute top-3 left-3 z-20 bg-gradient-to-br from-[#0f172a]/95 via-[#0c1220]/95 to-[#0f172a]/95 backdrop-blur-xl border border-cyan-500/30 rounded-xl px-3 py-2 shadow-lg shadow-cyan-500/20 pointer-events-none">
              <div className="flex items-center gap-2 mb-1">
                <Activity size={12} className="text-cyan-400" />
                <span className="text-[10px] text-slate-400 uppercase tracking-wider">Current Price</span>
              </div>
              <div className={`text-lg font-bold font-mono ${
                symbol.changePercent >= 0 ? 'text-green-400' : 'text-red-400'
              }`}>
                {priceLabel}
              </div>
            </div>
            
            {ohlcData && (
              <div className="absolute bottom-3 left-3 z-20 bg-gradient-to-br from-[#0f172a]/95 via-[#0c1220]/95 to-[#0f172a]/95 backdrop-blur-xl border border-white/10 rounded-xl px-3 py-2 shadow-lg pointer-events-none">
                <div className="grid grid-cols-4 gap-3 text-[10px]">
                  <div>
                    <div className="text-slate-500 mb-0.5">O</div>
                    <div className="text-white font-mono font-semibold">{ohlcData.open}</div>
                  </div>
                  <div>
                    <div className="text-slate-500 mb-0.5">H</div>
                    <div className="text-green-400 font-mono font-semibold">{ohlcData.high}</div>
                  </div>
                  <div>
                    <div className="text-slate-500 mb-0.5">L</div>
                    <div className="text-red-400 font-mono font-semibold">{ohlcData.low}</div>
                  </div>
                  <div>
                    <div className="text-slate-500 mb-0.5">C</div>
                    <div className="text-cyan-400 font-mono font-semibold">{ohlcData.close}</div>
                  </div>
                </div>
              </div>
            )}
            
            {crosshairData && (
              <div className="absolute top-3 right-3 z-20 bg-gradient-to-br from-[#0f172a]/95 via-[#0c1220]/95 to-[#0f172a]/95 backdrop-blur-xl border border-purple-500/30 rounded-xl px-3 py-2 shadow-lg shadow-purple-500/20 pointer-events-none">
                <div className="flex items-center gap-2 mb-1">
                  <Zap size={12} className="text-purple-400" />
                  <span className="text-[10px] text-slate-400 uppercase tracking-wider">Crosshair</span>
                </div>
                <div className="text-sm font-bold font-mono text-purple-400">
                  {crosshairData.price?.toFixed(symbol.bid > 1000 ? 2 : symbol.bid > 100 ? 3 : symbol.bid > 10 ? 4 : 5)}
                </div>
                <div className="text-[10px] text-slate-500 mt-1">{crosshairData.time}</div>
              </div>
            )}
          </>
        )}
        
        {/* Loading indicator */}
        {!chartLoaded && (
          <div className="absolute inset-0 flex items-center justify-center bg-[#0a0f1c] z-10 pointer-events-none">
            <div className="text-center">
              <div className="relative w-16 h-16 mx-auto mb-4">
                <div className="absolute inset-0 border-4 border-cyan-500/20 rounded-full" />
                <div className="absolute inset-0 border-4 border-transparent border-t-cyan-500 rounded-full animate-spin" />
              </div>
              <div className="text-cyan-400 text-sm font-semibold">Loading Chart...</div>
            </div>
          </div>
        )}
      </div>

      {/* Advanced RSI Panel */}
      {showIndicators && chartLoaded && (
        <div className="h-[100px] border-t border-white/10 relative bg-gradient-to-b from-[#0a0f1c] to-[#0c1220] flex-shrink-0 overflow-hidden">
          <div className="absolute top-2 left-3 z-10 pointer-events-none">
            <div className="flex items-center gap-2">
              <div className="w-1 h-4 bg-gradient-to-b from-purple-500 to-cyan-500 rounded" />
              <span className="text-[10px] text-slate-400 font-semibold uppercase tracking-wider">RSI (14)</span>
            </div>
          </div>
          <div 
            ref={rsiContainerRef} 
            className="w-full h-full" 
            style={{ width: '100%', height: '100%', minHeight: 0 }} 
          />
        </div>
      )}

      {/* Advanced MACD Panel */}
      {showIndicators && chartLoaded && (
        <div className="h-[100px] border-t border-white/10 relative bg-gradient-to-b from-[#0a0f1c] to-[#0c1220] flex-shrink-0 overflow-hidden">
          <div className="absolute top-2 left-3 z-10 pointer-events-none">
            <div className="flex items-center gap-2">
              <div className="w-1 h-4 bg-gradient-to-b from-cyan-500 to-purple-500 rounded" />
              <span className="text-[10px] text-slate-400 font-semibold uppercase tracking-wider">MACD</span>
            </div>
          </div>
          <div 
            ref={macdContainerRef} 
            className="w-full h-full" 
            style={{ width: '100%', height: '100%', minHeight: 0 }} 
          />
        </div>
      )}
    </div>
  )
}
