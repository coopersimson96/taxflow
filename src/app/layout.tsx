import type { Metadata } from 'next'
import { Inter } from 'next/font/google'
import './globals.css'

const inter = Inter({ subsets: ['latin'] })

export const metadata: Metadata = {
  title: 'Tax Analytics - Shopify & Square Integration',
  description: 'Advanced tax analytics and reporting for Shopify and Square merchants',
  keywords: ['tax analytics', 'shopify', 'square', 'tax reporting', 'e-commerce'],
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="en">
      <body className={inter.className}>
        <div className="min-h-screen bg-gradient-to-br from-secondary-50 to-primary-50">
          {children}
        </div>
      </body>
    </html>
  )
}