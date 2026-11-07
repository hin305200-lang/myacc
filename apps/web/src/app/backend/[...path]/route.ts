import { NextRequest, NextResponse } from 'next/server'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

function resolveApiTarget(): string | null {
  const raw = process.env.API_PROXY_TARGET || process.env.NEXT_PUBLIC_API_URL
  if (!raw?.trim()) return null
  // Don't proxy to our own /backend path or relative URLs
  if (!/^https?:\/\//i.test(raw.trim())) return null
  return raw.replace(/\/$/, '')
}

async function proxyRequest(req: NextRequest, pathSegments: string[]) {
  try {
    const { tryHandleLocalApi } = await import('@/lib/server/local-api')
    const local = await tryHandleLocalApi(req, pathSegments)
    if (local) return local
  } catch (error: any) {
    console.error('[backend] local api failed', error)
    return NextResponse.json(
      {
        error: 'Local trading API failed to start',
        detail: error?.message || String(error),
      },
      { status: 500 }
    )
  }

  const target = resolveApiTarget()
  if (!target) {
    return NextResponse.json(
      {
        error:
          'Trading API is not configured. Set DATABASE_URL and JWT_SECRET on Vercel (auth/account), or deploy apps/api and set API_PROXY_TARGET.',
      },
      { status: 503 }
    )
  }

  const path = pathSegments.map(encodeURIComponent).join('/')
  const url = `${target}/${path}${req.nextUrl.search}`

  const headers = new Headers()
  const contentType = req.headers.get('content-type')
  if (contentType) headers.set('content-type', contentType)
  const authorization = req.headers.get('authorization')
  if (authorization) headers.set('authorization', authorization)

  const init: RequestInit = {
    method: req.method,
    headers,
    cache: 'no-store',
  }

  if (req.method !== 'GET' && req.method !== 'HEAD') {
    init.body = await req.arrayBuffer()
  }

  let upstream: Response
  try {
    upstream = await fetch(url, init)
  } catch {
    return NextResponse.json(
      { error: 'Cannot reach trading API. Check API_PROXY_TARGET and that Render/Railway is live.' },
      { status: 502 }
    )
  }

  const responseHeaders = new Headers()
  const upstreamType = upstream.headers.get('content-type')
  if (upstreamType) responseHeaders.set('content-type', upstreamType)

  return new NextResponse(upstream.body, {
    status: upstream.status,
    headers: responseHeaders,
  })
}

type RouteContext = { params: { path: string[] } }

export async function GET(req: NextRequest, context: RouteContext) {
  return proxyRequest(req, context.params.path ?? [])
}

export async function POST(req: NextRequest, context: RouteContext) {
  return proxyRequest(req, context.params.path ?? [])
}

export async function PUT(req: NextRequest, context: RouteContext) {
  return proxyRequest(req, context.params.path ?? [])
}

export async function PATCH(req: NextRequest, context: RouteContext) {
  return proxyRequest(req, context.params.path ?? [])
}

export async function DELETE(req: NextRequest, context: RouteContext) {
  return proxyRequest(req, context.params.path ?? [])
}

export async function OPTIONS() {
  return new NextResponse(null, { status: 204 })
}
