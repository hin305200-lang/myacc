const PRODUCTION_HOSTS = new Set(['barrattcookelimited.com', 'www.barrattcookelimited.com'])

export function isProductionSiteHost(hostname: string): boolean {
  return PRODUCTION_HOSTS.has(hostname.toLowerCase())
}

/** REST API base URL (no trailing slash). */
export function getApiBaseUrl(): string {
  if (process.env.NEXT_PUBLIC_API_URL) {
    return process.env.NEXT_PUBLIC_API_URL.replace(/\/$/, '')
  }
  if (typeof window !== 'undefined' && isProductionSiteHost(window.location.hostname)) {
    return 'https://api.barrattcookelimited.com'
  }
  return 'http://localhost:4000'
}

/** Socket.IO server URL. */
export function getWsBaseUrl(): string {
  if (process.env.NEXT_PUBLIC_WS_URL) {
    return process.env.NEXT_PUBLIC_WS_URL.replace(/\/$/, '')
  }
  const api = getApiBaseUrl()
  if (api.startsWith('https://')) {
    return api.replace('https://', 'wss://')
  }
  if (api.startsWith('http://')) {
    return api.replace('http://', 'ws://')
  }
  return api
}

export function isDemoAutoLoginEnabled(): boolean {
  if (process.env.NEXT_PUBLIC_ENABLE_DEMO_AUTOLOGIN === 'true') return true
  if (process.env.NEXT_PUBLIC_ENABLE_DEMO_AUTOLOGIN === 'false') return false
  return process.env.NODE_ENV === 'development'
}
