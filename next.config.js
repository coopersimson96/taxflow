/** @type {import('next').NextConfig} */
const nextConfig = {
  images: {
    domains: ['cdn.shopify.com', 'squareup.com'],
  },
  env: {
    CUSTOM_KEY: process.env.CUSTOM_KEY,
  },
  // Ensure proper handling of static/dynamic pages
  experimental: {
    // Enable proper Suspense support
    serverComponentsExternalPackages: ['@prisma/client'],
  },
  // Disable static optimization for API routes that need dynamic features
  generateBuildId: async () => {
    return `build-${Date.now()}`
  },
  // Configure static export behavior
  trailingSlash: false,
  // Force specific routes to be dynamic
  async rewrites() {
    return []
  },
  // Ensure proper handling of dynamic routes
  typescript: {
    // !! WARN !!
    // Dangerously allow production builds to successfully complete even if
    // your project has type errors.
    // !! WARN !!
    ignoreBuildErrors: false,
  },
  eslint: {
    // Warning: This allows production builds to successfully complete even if
    // your project has ESLint errors.
    ignoreDuringBuilds: false,
  },
}

module.exports = nextConfig