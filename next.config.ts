import type { NextConfig } from 'next'
import bundleAnalyzer from '@next/bundle-analyzer'
import { withSentryConfig } from '@sentry/nextjs'
import createNextIntlPlugin from 'next-intl/plugin'

const withNextIntl = createNextIntlPlugin('./src/i18n/request.ts')

const withBundleAnalyzer = bundleAnalyzer({
  enabled: process.env.ANALYZE === 'true',
})

const nextConfig: NextConfig = {
  async redirects() {
    return [
      { source: '/wishlist-templates', destination: '/customized-tours', permanent: true },
      { source: '/wishlist-templates/:id', destination: '/customized-tours/:id', permanent: true },
      { source: '/p/wishlist/:slug', destination: '/p/customized/:slug', permanent: true },
      { source: '/p/wishlist/:slug/track/:code', destination: '/p/customized/track/:code', permanent: true },
    ]
  },
  // ✅ 啟用圖片優化（Next.js 15 內建優化）
  images: {
    formats: ['image/avif', 'image/webp'],
    deviceSizes: [640, 750, 828, 1080, 1200, 1920, 2048, 3840],
    imageSizes: [16, 32, 48, 64, 96, 128, 256, 384],
    remotePatterns: [
      {
        protocol: 'https',
        hostname: 'images.unsplash.com',
      },
      {
        protocol: 'https',
        hostname: 'images.pexels.com',
      },
      {
        protocol: 'https',
        hostname: 'pfqvdacxowpgfamuvnsn.supabase.co',
      },
    ],
  },

  headers: async () => [
    {
      source: '/(.*)',
      headers: [
        { key: 'X-Frame-Options', value: 'DENY' },
        { key: 'X-Content-Type-Options', value: 'nosniff' },
        { key: 'Referrer-Policy', value: 'strict-origin-when-cross-origin' },
        { key: 'X-XSS-Protection', value: '1; mode=block' },
        {
          key: 'Content-Security-Policy',
          value:
            "default-src 'self'; script-src 'self' 'unsafe-eval' 'unsafe-inline' https://va.vercel-scripts.com; style-src 'self' 'unsafe-inline' https://fonts.googleapis.com; img-src 'self' data: blob: https:; font-src 'self' data: https://fonts.gstatic.com; connect-src 'self' https://*.supabase.co wss://*.supabase.co https://api.taishinbank.com.tw https://tspg.taishinbank.com.tw https://*.sentry.io https://va.vercel-scripts.com https://api.open-meteo.com;",
        },
      ],
    },
  ],

  // TypeScript 錯誤已全部修復，不再需要忽略
  // typescript: {
  //   ignoreBuildErrors: true,
  // },

  experimental: {
    serverActions: {
      bodySizeLimit: '2mb',
    },
    // 優化常用套件的 tree-shaking
    optimizePackageImports: [
      'lucide-react',
      '@radix-ui/react-dialog',
      '@radix-ui/react-dropdown-menu',
      '@radix-ui/react-select',
      '@radix-ui/react-tabs',
      '@radix-ui/react-tooltip',
      '@radix-ui/react-popover',
      '@radix-ui/react-checkbox',
      '@radix-ui/react-switch',
      '@radix-ui/react-label',
      '@radix-ui/react-scroll-area',
      '@radix-ui/react-slot',
      'date-fns',
      'recharts',
      '@supabase/supabase-js',
      'framer-motion',
    ],
  },

  // 允許 ngrok 等開發工具的跨域請求
  allowedDevOrigins: ['frisky-masonic-mellissa.ngrok-free.dev', '192.168.1.181', '100.89.92.46'],

  // ✅ 啟用 standalone 輸出模式（適合 Docker/Vercel 部署）
  output: 'standalone',

  // Next.js 16 使用 Turbopack 作為預設打包工具
  turbopack: {},
}

// Sentry 設定選項
const sentryWebpackPluginOptions = {
  // 只在生產環境且有 Sentry DSN 時才上傳 source maps
  silent: true,
  // disableLogger: true, // Deprecated, use webpack.treeshake.removeDebugLogging instead
  // 僅在有 auth token 時上傳
  hideSourceMaps: true,
}

export default withSentryConfig(
  withNextIntl(withBundleAnalyzer(nextConfig)),
  sentryWebpackPluginOptions
)
