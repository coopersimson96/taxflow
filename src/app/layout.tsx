import type { Metadata } from 'next'
import { Inter } from 'next/font/google'
import './globals.css'
import SessionProvider from '@/components/providers/SessionProvider'
import ShopifyAppProvider from '@/components/providers/AppBridgeProvider'

const inter = Inter({ subsets: ['latin'] })

export const metadata: Metadata = {
  title: 'Set Aside - Tax Analytics for Shopify',
  description: 'Automatically calculate daily tax amounts from your Shopify payouts',
  keywords: ['tax analytics', 'shopify', 'tax reporting', 'e-commerce', 'payout tracking'],
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="en">
      <body className={inter.className}>
        <SessionProvider>
          <ShopifyAppProvider>
            {children}
          </ShopifyAppProvider>
        </SessionProvider>
      </body>
    </html>
  )
}