/** @type {import('next').NextConfig} */
const nextConfig = {
  // Enable bundle analysis
  webpack: (config, { isServer }) => {
    // Bundle optimization for better performance
    if (!isServer) {
      config.optimization = {
        ...config.optimization,
        splitChunks: {
          ...config.optimization.splitChunks,
          cacheGroups: {
            ...config.optimization.splitChunks.cacheGroups,
            // Create separate chunks for analytics components
            analytics: {
              name: 'analytics',
              test: /[\/]src[\/]components[\/]analytics[\/]/,
              chunks: 'all',
              priority: 10,
            },
            // Create separate chunk for hooks
            hooks: {
              name: 'hooks',
              test: /[\/]src[\/]hooks[\/]/,
              chunks: 'all',
              priority: 10,
            },
          },
        },
      }
    }
    return config
  },
  images: {
    domains: ['cdn.shopify.com', 'squareup.com'],
  },
  env: {
    CUSTOM_KEY: process.env.CUSTOM_KEY,
  },
  // Ensure proper handling of static/dynamic pages
  experimental: {
    // Enable proper Suspense support
    serverComponentsExternalPackages: ['@prisma/client', 'pg'],
    // Enable optimizeCss for better performance
    optimizeCss: true,
  },
  // Enable compression
  compress: true,
  // Enable React strict mode for better performance
  reactStrictMode: true,
  // Force rebuild for dependency changes
  generateBuildId: async () => {
    return `build-${Date.now()}-pg-fix`
  },
  // Configure static export behavior
  trailingSlash: false,
  // Ensure proper handling of dynamic routes
  typescript: {
    ignoreBuildErrors: false,
  },
  eslint: {
    ignoreDuringBuilds: false,
  },
}

module.exports = nextConfig