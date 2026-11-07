const PRODUCTION_HOSTS = new Set(['barrattcookelimited.com', 'www.barrattcookelimited.com'])

export function isProductionSiteHost(hostname: string): boolean {
  return PRODUCTION_HOSTS.has(hostname.toLowerCase())
}

/** REST API base URL (no trailing slash). Empty string = same-origin (use path prefix). */
export function getApiBaseUrl(): string {
  // Production domain always uses same-origin /backend (local Prisma auth + optional upstream proxy).
  if (typeof window !== 'undefined' && isProductionSiteHost(window.location.hostname)) {
    return '/backend'
  }
  if (process.env.NEXT_PUBLIC_API_URL) {
    return process.env.NEXT_PUBLIC_API_URL.replace(/\/$/, '')
  }
  return 'http://localhost:4000'
}

/** Socket.IO server URL (must be absolute; cannot use /backend proxy). */
export function getWsBaseUrl(): string {
  if (process.env.NEXT_PUBLIC_WS_URL) {
    return process.env.NEXT_PUBLIC_WS_URL.replace(/\/$/, '')
  }
  const api = process.env.NEXT_PUBLIC_API_URL?.replace(/\/$/, '')
  if (api?.startsWith('https://')) {
    return api.replace('https://', 'wss://')
  }
  if (api?.startsWith('http://')) {
    return api.replace('http://', 'ws://')
  }
  if (typeof window !== 'undefined' && isProductionSiteHost(window.location.hostname)) {
    return ''
  }
  return 'ws://localhost:4000'
}

export function isDemoAutoLoginEnabled(): boolean {
  if (process.env.NEXT_PUBLIC_ENABLE_DEMO_AUTOLOGIN === 'true') return true
  if (process.env.NEXT_PUBLIC_ENABLE_DEMO_AUTOLOGIN === 'false') return false
  return process.env.NODE_ENV === 'development'
}
