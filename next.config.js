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
    serverComponentsExternalPackages: ['@prisma/client', 'pg'],
  },
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