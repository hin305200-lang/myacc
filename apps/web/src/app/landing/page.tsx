'use client'

import Link from 'next/link'
import { ArrowRight, ShieldCheck, Zap, Bot, Sparkles, Brain, TrendingUp, Globe, BarChart3, Cpu, Rocket, CheckCircle2 } from 'lucide-react'
import { useState } from 'react'

const metrics = [
  { label: 'AI Decision Speed', value: '<120ms', icon: Zap },
  { label: 'Assets Covered', value: '2000+', icon: Globe },
  { label: 'Uptime', value: '99.99%', icon: ShieldCheck },
  { label: 'Smart Orders', value: 'Auto', icon: Brain },
]

const features = [
  {
    icon: <Bot className="h-6 w-6 text-[#22d3ee]" />,
    title: 'AI Trade Copilot',
    desc: 'Advanced AI analyzes market conditions in real-time and suggests optimal entry points, position sizing, and risk management for every trade.',
    color: 'from-blue-500/20 to-cyan-500/20',
  },
  {
    icon: <Brain className="h-6 w-6 text-[#22c55e]" />,
    title: 'Intelligent Risk Management',
    desc: 'AI-powered stop-loss and take-profit suggestions based on volatility analysis, market depth, and historical patterns.',
    color: 'from-green-500/20 to-emerald-500/20',
  },
  {
    icon: <Zap className="h-6 w-6 text-[#fbbf24]" />,
    title: 'Real-Time Everything',
    desc: 'Live price feeds, instant order execution, real-time chat support, and synchronized data across all your devices.',
    color: 'from-amber-500/20 to-yellow-500/20',
  },
  {
    icon: <BarChart3 className="h-6 w-6 text-[#94a3b8]" />,
    title: 'Multi-Asset Portfolio',
    desc: 'Trade Forex, Crypto, Stocks, Commodities, and Indices all in one unified platform with AI-powered insights.',
    color: 'from-purple-500/20 to-pink-500/20',
  },
]

const aiFeatures = [
  {
    title: 'Smart Entry Detection',
    desc: 'AI analyzes 50+ indicators to find optimal entry points',
    icon: TrendingUp,
  },
  {
    title: 'Auto Position Sizing',
    desc: 'Automatically calculates lot size based on risk tolerance',
    icon: Cpu,
  },
  {
    title: 'Market Sentiment Analysis',
    desc: 'Real-time sentiment from news, social media, and order flow',
    icon: Brain,
  },
  {
    title: 'Adaptive Stop Loss',
    desc: 'AI adjusts stop-loss levels based on volatility patterns',
    icon: ShieldCheck,
  },
]

export default function LandingPage() {
  const [hoveredFeature, setHoveredFeature] = useState<number | null>(null)

  return (
    <div className="w-full min-h-screen bg-gradient-to-br from-[#0a0e27] via-[#111538] to-[#0d1230] text-[#ffffff] overflow-y-auto" style={{ height: 'auto', minHeight: '100vh' }}>
      {/* Hero Section */}
      <header className="relative z-10 mx-auto flex w-full max-w-7xl items-center justify-between px-4 sm:px-6 py-4 sm:py-6 flex-wrap gap-4">
        <Link href="/" className="flex items-center gap-3 hover:opacity-90 transition">
          <div className="h-12 w-12 rounded-xl bg-gradient-to-br from-[#6366f1] to-[#ffffff] shadow-lg flex items-center justify-center">
            <span className="text-lg font-black text-white">TM</span>
          </div>
          <div className="leading-tight">
            <p className="text-lg font-semibold text-[#ffffff]">TradeMarkets</p>
            <p className="text-xs text-[#94a3b8]">AI-Powered Trading Platform</p>
          </div>
        </Link>
        <div className="flex items-center gap-3">
          <Link
            href="/"
            className="rounded-lg border border-[#1e293b] bg-[#161b3d] px-4 py-2 text-sm font-semibold text-[#ffffff] hover:bg-[#6366f1] hover:text-white transition"
          >
            Launch Terminal
          </Link>
          <Link
            href="/"
            className="inline-flex items-center gap-2 rounded-lg bg-gradient-to-r from-[#6366f1] to-[#ffffff] px-4 py-2 text-sm font-semibold text-white shadow-lg hover:opacity-90 transition"
          >
            Start Trading
            <ArrowRight className="h-4 w-4" />
          </Link>
        </div>
      </header>

      <main className="relative z-10 mx-auto flex w-full max-w-7xl flex-col gap-8 sm:gap-12 lg:gap-16 px-4 sm:px-6 pb-12 sm:pb-20">
        {/* Hero */}
        <section className="grid gap-8 sm:gap-12 lg:grid-cols-[1.1fr_0.9fr] items-center pt-4 sm:pt-8">
          <div className="space-y-6">
            <div className="inline-flex items-center gap-2 rounded-full border border-[#1e293b] bg-[#161b3d] px-4 py-2 text-xs font-semibold text-[#94a3b8]">
              <Sparkles className="h-4 w-4" />
              AI-Driven · Real-Time · Multi-Asset
            </div>
            <h1 className="text-5xl sm:text-6xl font-bold leading-tight text-[#ffffff]">
              Trade Smarter with{' '}
              <span className="bg-gradient-to-r from-[#6366f1] to-[#ffffff] bg-clip-text text-transparent">
                AI-Powered
              </span>{' '}
              Intelligence
            </h1>
            <p className="text-xl text-[#94a3b8] leading-relaxed">
              Advanced AI analyzes markets in real-time, suggests optimal trades, manages risk automatically, 
              and helps you make informed decisions across Forex, Crypto, Stocks, Commodities, and Indices—all in one platform.
            </p>
            <div className="flex flex-wrap gap-4">
              <Link
                href="/"
                className="inline-flex items-center gap-2 rounded-lg bg-gradient-to-r from-[#6366f1] to-[#ffffff] px-6 py-3 text-base font-semibold text-white shadow-lg hover:opacity-90 transition"
              >
                Start Trading Now
                <ArrowRight className="h-5 w-5" />
              </Link>
              <a
                href="#features"
                className="inline-flex items-center gap-2 rounded-lg border-2 border-[#6366f1] bg-transparent px-6 py-3 text-base font-semibold text-[#ffffff] hover:bg-[#6366f1] hover:text-white transition"
              >
                Explore Features
              </a>
            </div>
            <div className="grid grid-cols-2 sm:grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4 pt-4">
              {metrics.map((m) => {
                const Icon = m.icon
                return (
                  <div
                    key={m.label}
                    className="rounded-xl border border-[#1e293b] bg-[#161b3d] p-4 shadow-sm"
                  >
                    <Icon className="h-5 w-5 text-[#94a3b8] mb-2" />
                    <p className="text-xs text-[#94a3b8] mb-1">{m.label}</p>
                    <p className="text-xl font-bold text-[#ffffff]">{m.value}</p>
                  </div>
                )
              })}
            </div>
          </div>

          <div className="relative">
            <div className="absolute -inset-6 rounded-3xl bg-gradient-to-br from-[#6366f1]/20 via-[#ffffff]/10 to-transparent blur-3xl" />
            <div className="relative overflow-hidden rounded-3xl border-2 border-[#1e293b] bg-[#161b3d] shadow-2xl">
              <div className="flex items-center justify-between px-6 py-4 border-b border-[#1e293b] bg-gradient-to-r from-[#6366f1] to-[#ffffff]">
                <div className="flex items-center gap-3">
                  <div className="h-10 w-10 rounded-xl bg-white/20 flex items-center justify-center text-lg font-bold text-white">
                    TM
                  </div>
                  <div>
                    <p className="text-sm font-semibold text-white">TradeMarkets Terminal</p>
                    <p className="text-[11px] text-white/80">AI-Enabled · Live Trading</p>
                  </div>
                </div>
                <div className="text-right">
                  <p className="text-[11px] text-white/80">Equity</p>
                  <p className="text-xl font-bold text-white">$350.00</p>
                </div>
              </div>
              <div className="p-6 space-y-4">
                <div className="flex flex-wrap items-center gap-2 text-xs text-[#94a3b8]">
                  <span className="rounded-full border border-[#1e293b] bg-[#161b3d] px-3 py-1">EURUSD</span>
                  <span className="rounded-full border border-[#1e293b] bg-[#161b3d] px-3 py-1">BTCUSD</span>
                  <span className="rounded-full border border-[#1e293b] bg-[#161b3d] px-3 py-1">XAUUSD</span>
                  <span className="rounded-full border border-[#1e293b] bg-[#161b3d] px-3 py-1">AAPL</span>
                  <span className="rounded-full border border-[#1e293b] bg-[#161b3d] px-3 py-1">NVDA</span>
                </div>
                <div className="rounded-xl border-2 border-[#1e293b] bg-[#0a0e27] p-4">
                  <div className="flex items-center justify-between text-xs text-[#94a3b8] mb-2">
                    <span className="font-semibold">EURUSD</span>
                    <span className="flex items-center gap-1">
                      <Bot className="h-3 w-3" />
                      AI Analysis Active
                    </span>
                  </div>
                  <div className="h-48 rounded-lg bg-gradient-to-b from-[#111538] to-[#0a0e27] border border-[#1e293b] flex items-center justify-center">
                    <div className="text-center">
                      <BarChart3 className="h-12 w-12 text-[#1e293b] mx-auto mb-2" />
                      <p className="text-sm text-[#94a3b8]">Live Trading Chart</p>
                    </div>
                  </div>
                  <div className="mt-4 grid grid-cols-2 gap-2">
                    <button className="rounded-lg bg-gradient-to-b from-red-600 to-red-700 px-4 py-3 font-semibold text-white shadow-lg">
                      Sell 1.05425
                    </button>
                    <button className="rounded-lg bg-gradient-to-b from-green-600 to-green-700 px-4 py-3 font-semibold text-white shadow-lg">
                      Buy 1.05427
                    </button>
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div className="rounded-xl border border-[#1e293b] bg-[#161b3d] p-3">
                    <p className="text-[10px] uppercase tracking-wide text-[#94a3b8] mb-1">AI Recommendation</p>
                    <p className="text-sm font-semibold text-[#ffffff]">BUY Signal Detected</p>
                    <p className="text-xs text-[#94a3b8] mt-1">Confidence: 87%</p>
                  </div>
                  <div className="rounded-xl border border-[#1e293b] bg-[#161b3d] p-3">
                    <p className="text-[10px] uppercase tracking-wide text-[#94a3b8] mb-1">Risk Guard</p>
                    <p className="text-sm font-semibold text-[#ffffff]">Auto Stop-Loss</p>
                    <p className="text-xs text-[#94a3b8] mt-1">Set at 0.7%</p>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* About Us */}
        <section id="about" className="rounded-3xl border-2 border-[#1e293b] bg-[#161b3d] p-12 shadow-xl">
          <div className="text-center mb-10">
            <h2 className="text-4xl font-bold text-[#ffffff] mb-4">Who We Are</h2>
            <p className="text-xl text-[#94a3b8] max-w-3xl mx-auto">
              TradeMarkets is a cutting-edge trading platform that combines advanced AI technology with 
              professional-grade trading tools. We're revolutionizing how traders interact with financial markets 
              by providing intelligent, real-time insights and automated risk management.
            </p>
          </div>
          <div className="grid md:grid-cols-3 gap-6">
            <div className="text-center p-6 rounded-xl bg-[#0a0e27] border border-[#1e293b]">
              <Rocket className="h-12 w-12 text-[#94a3b8] mx-auto mb-4" />
              <h3 className="text-xl font-semibold text-[#ffffff] mb-2">Innovation First</h3>
              <p className="text-[#94a3b8]">We leverage the latest AI and machine learning technologies to give you an edge in the markets.</p>
            </div>
            <div className="text-center p-6 rounded-xl bg-[#0a0e27] border border-[#1e293b]">
              <ShieldCheck className="h-12 w-12 text-[#94a3b8] mx-auto mb-4" />
              <h3 className="text-xl font-semibold text-[#ffffff] mb-2">Security & Trust</h3>
              <p className="text-[#94a3b8]">Your funds and data are protected with enterprise-grade security and encryption.</p>
            </div>
            <div className="text-center p-6 rounded-xl bg-[#0a0e27] border border-[#1e293b]">
              <Globe className="h-12 w-12 text-[#94a3b8] mx-auto mb-4" />
              <h3 className="text-xl font-semibold text-[#ffffff] mb-2">Global Reach</h3>
              <p className="text-[#94a3b8]">Trade 2000+ assets across Forex, Crypto, Stocks, Commodities, and Indices worldwide.</p>
            </div>
          </div>
        </section>

        {/* AI Features */}
        <section id="features" className="space-y-8">
          <div className="text-center">
            <h2 className="text-4xl font-bold text-[#ffffff] mb-4">AI-Powered Trading Features</h2>
            <p className="text-xl text-[#94a3b8]">Advanced technology to help you trade smarter</p>
          </div>
          <div className="grid md:grid-cols-2 gap-6">
            {features.map((feature, idx) => (
              <div
                key={idx}
                onMouseEnter={() => setHoveredFeature(idx)}
                onMouseLeave={() => setHoveredFeature(null)}
                className={`rounded-2xl border-2 border-[#1e293b] bg-[#161b3d] p-6 shadow-lg transition-all ${
                  hoveredFeature === idx ? 'scale-105 shadow-2xl' : ''
                }`}
              >
                <div className="flex gap-4">
                  <div className="p-3 rounded-xl bg-[#0a0e27] border border-[#1e293b]">
                    {feature.icon}
                  </div>
                  <div className="flex-1">
                    <h3 className="text-xl font-semibold text-[#ffffff] mb-2">{feature.title}</h3>
                    <p className="text-[#94a3b8] leading-relaxed">{feature.desc}</p>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </section>

        {/* AI Trading Capabilities */}
        <section className="rounded-3xl border-2 border-[#1e293b] bg-gradient-to-br from-[#111538] to-[#0a0e27] p-12 shadow-xl">
          <div className="text-center mb-10">
            <div className="inline-flex items-center gap-2 rounded-full bg-[#6366f1] text-white px-4 py-2 mb-4">
              <Brain className="h-5 w-5" />
              <span className="font-semibold">AI Trading Assistant</span>
            </div>
            <h2 className="text-4xl font-bold text-[#ffffff] mb-4">How AI Helps You Trade</h2>
            <p className="text-xl text-[#94a3b8] max-w-3xl mx-auto">
              Our AI analyzes market conditions in real-time and provides intelligent suggestions for every trade you make.
            </p>
          </div>
          <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-6">
            {aiFeatures.map((feature, idx) => {
              const Icon = feature.icon
              return (
                <div key={idx} className="rounded-xl border border-[#1e293b] bg-[#161b3d] p-6">
                  <Icon className="h-8 w-8 text-[#94a3b8] mb-4" />
                  <h3 className="text-lg font-semibold text-[#ffffff] mb-2">{feature.title}</h3>
                  <p className="text-sm text-[#94a3b8]">{feature.desc}</p>
                </div>
              )
            })}
          </div>
        </section>

        {/* Call to Action */}
        <section className="rounded-3xl border-2 border-[#1e293b] bg-gradient-to-r from-[#6366f1] to-[#ffffff] p-12 text-white shadow-2xl">
          <div className="text-center max-w-3xl mx-auto">
            <h2 className="text-4xl font-bold mb-4">Ready to Start Trading with AI?</h2>
            <p className="text-xl mb-8 text-white/90">
              Join thousands of traders using AI-powered insights to make better trading decisions. 
              Get started in under a minute with our demo account.
            </p>
            <div className="flex flex-wrap justify-center gap-4">
              <Link
                href="/"
                className="inline-flex items-center gap-2 rounded-lg bg-white text-[#ffffff] px-8 py-4 text-lg font-semibold shadow-lg hover:bg-[#161b3d] transition"
              >
                Launch Trading Terminal
                <ArrowRight className="h-5 w-5" />
              </Link>
              <Link
                href="/"
                className="inline-flex items-center gap-2 rounded-lg border-2 border-white bg-transparent text-white px-8 py-4 text-lg font-semibold hover:bg-white/10 transition"
              >
                Try Demo Account
              </Link>
            </div>
            <div className="mt-8 grid grid-cols-3 gap-6 text-center">
              <div>
                <div className="text-3xl font-bold mb-1">$350</div>
                <div className="text-sm text-white/80">Starting Balance</div>
              </div>
              <div>
                <div className="text-3xl font-bold mb-1">2000+</div>
                <div className="text-sm text-white/80">Tradable Assets</div>
              </div>
              <div>
                <div className="text-3xl font-bold mb-1">24/7</div>
                <div className="text-sm text-white/80">AI Support</div>
              </div>
            </div>
          </div>
        </section>
      </main>
    </div>
  )
}
