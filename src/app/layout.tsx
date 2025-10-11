import type { Metadata } from 'next'
import { Inter } from 'next/font/google'
import './globals.css'
import SessionProvider from '@/components/providers/SessionProvider'
import ShopifyAppProvider from '@/components/providers/AppBridgeProvider'
import { StoreProvider } from '@/contexts/StoreContext'
import { Toaster } from 'sonner'

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
          <StoreProvider>
            <ShopifyAppProvider>
              {children}
              <Toaster 
                richColors
                theme="light"
                position="bottom-right"
                toastOptions={{
                  style: {
                    background: '#fff',
                    borderRadius: '12px',
                    border: '1px solid #e2e8f0',
                    fontSize: '14px',
                  },
                  className: 'sonner-toast',
                }}
              />
            </ShopifyAppProvider>
          </StoreProvider>
        </SessionProvider>
      </body>
    </html>
  )
}