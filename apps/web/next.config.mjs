/** @type {import('next').NextConfig} */
const apiProxyTarget = process.env.API_PROXY_TARGET?.replace(/\/$/, '')

const nextConfig = {
  eslint: {
    ignoreDuringBuilds: true,
  },
  async rewrites() {
    if (!apiProxyTarget) {
      return []
    }
    return [
      {
        source: '/backend/:path*',
        destination: `${apiProxyTarget}/:path*`,
      },
    ]
  },
}

export default nextConfig
