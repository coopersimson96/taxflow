'use client'

import { useState, useEffect } from 'react'
import { useSession } from 'next-auth/react'
import { useRouter, useSearchParams } from 'next/navigation'
import { Button } from '@/components/ui/Button'
import { Card } from '@/components/ui/Card'

export default function ConnectPage() {
  const { data: session, status } = useSession()
  const router = useRouter()
  const searchParams = useSearchParams()
  const [isConnecting, setIsConnecting] = useState(false)
  const [shopDomain, setShopDomain] = useState('')
  const [error, setError] = useState('')
  const [success, setSuccess] = useState('')

  // Handle URL parameters for success/error states
  useEffect(() => {
    const errorParam = searchParams.get('error')
    const successParam = searchParams.get('success')
    const shopParam = searchParams.get('shop')

    if (errorParam) {
      switch (errorParam) {
        case 'missing_parameters':
          setError('Missing required parameters from Shopify')
          break
        case 'invalid_signature':
          setError('Invalid signature - potential security issue')
          break
        case 'token_exchange_failed':
          setError('Failed to connect to your Shopify store')
          break
        case 'callback_failed':
          setError('Connection process failed - please try again')
          break
        default:
          setError('An error occurred during connection')
      }
    }

    if (successParam && shopParam) {
      setSuccess(`Successfully connected to ${shopParam}.myshopify.com!`)
      // Clear URL parameters
      router.replace('/connect', { scroll: false })
    }
  }, [searchParams, router])

  // Redirect if not authenticated
  useEffect(() => {
    if (status === 'unauthenticated') {
      router.push('/auth/signin?callbackUrl=/connect')
    }
  }, [status, router])

  const handleConnect = async () => {
    if (!shopDomain.trim()) {
      setError('Please enter your Shopify store domain')
      return
    }

    setIsConnecting(true)
    setError('')

    try {
      const response = await fetch('/api/shopify/auth', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ shop: shopDomain.trim() }),
      })

      const data = await response.json()

      if (!response.ok) {
        throw new Error(data.error || 'Failed to initiate connection')
      }

      // Redirect to Shopify OAuth
      window.location.href = data.authUrl

    } catch (error) {
      console.error('Connection error:', error)
      setError(error instanceof Error ? error.message : 'Failed to connect to Shopify')
      setIsConnecting(false)
    }
  }

  const handleShopDomainChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value
    setShopDomain(value)
    setError('')
  }

  const formatShopDomain = (domain: string) => {
    // Remove common prefixes and suffixes
    let cleaned = domain.replace(/^https?:\/\//, '')
    cleaned = cleaned.replace(/\.myshopify\.com.*$/, '')
    cleaned = cleaned.replace(/\/.*$/, '')
    return cleaned.toLowerCase()
  }

  if (status === 'loading') {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary-600"></div>
      </div>
    )
  }

  if (!session) {
    return null // Will redirect to signin
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-primary-50 to-secondary-50">
      <div className="max-w-2xl mx-auto px-4 py-12">
        <div className="text-center mb-8">
          <h1 className="text-3xl font-bold text-secondary-900 mb-4">
            Connect Your Shopify Store
          </h1>
          <p className="text-lg text-secondary-600">
            Start tracking tax collected from your Shopify sales automatically
          </p>
        </div>

        {success && (
          <div className="mb-6 p-4 bg-green-50 border border-green-200 rounded-lg">
            <div className="flex items-center">
              <svg className="w-5 h-5 text-green-500 mr-2" fill="currentColor" viewBox="0 0 20 20">
                <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
              </svg>
              <p className="text-green-800 font-medium">{success}</p>
            </div>
            <div className="mt-3">
              <Button
                onClick={() => router.push('/dashboard')}
                className="bg-green-600 hover:bg-green-700 text-white"
              >
                Go to Dashboard
              </Button>
            </div>
          </div>
        )}

        <Card className="p-8 shadow-lg">
          <div className="space-y-6">
            <div>
              <label htmlFor="shopDomain" className="block text-sm font-medium text-secondary-700 mb-2">
                Shopify Store Domain
              </label>
              <div className="relative">
                <input
                  type="text"
                  id="shopDomain"
                  value={shopDomain}
                  onChange={handleShopDomainChange}
                  onBlur={(e) => setShopDomain(formatShopDomain(e.target.value))}
                  placeholder="your-store-name"
                  className="w-full px-4 py-3 border border-secondary-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-primary-500 pr-32"
                  disabled={isConnecting}
                />
                <div className="absolute inset-y-0 right-0 flex items-center pr-3 pointer-events-none">
                  <span className="text-secondary-500 text-sm">.myshopify.com</span>
                </div>
              </div>
              <p className="mt-2 text-sm text-secondary-500">
                Enter just your store name (e.g., "my-store" for my-store.myshopify.com)
              </p>
            </div>

            {error && (
              <div className="p-4 bg-red-50 border border-red-200 rounded-lg">
                <div className="flex items-center">
                  <svg className="w-5 h-5 text-red-500 mr-2" fill="currentColor" viewBox="0 0 20 20">
                    <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
                  </svg>
                  <p className="text-red-800 text-sm">{error}</p>
                </div>
              </div>
            )}

            <Button
              onClick={handleConnect}
              disabled={isConnecting || !shopDomain.trim()}
              className="w-full"
              size="lg"
            >
              {isConnecting ? (
                <>
                  <svg className="animate-spin -ml-1 mr-3 h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                  </svg>
                  Connecting to Shopify...
                </>
              ) : (
                'Connect Shopify Store'
              )}
            </Button>
          </div>

          <div className="mt-8 pt-6 border-t border-secondary-200">
            <h3 className="text-lg font-semibold text-secondary-900 mb-4">
              What happens when you connect?
            </h3>
            <div className="space-y-3 text-sm text-secondary-600">
              <div className="flex items-start">
                <svg className="w-5 h-5 text-green-500 mt-0.5 mr-3 flex-shrink-0" fill="currentColor" viewBox="0 0 20 20">
                  <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                </svg>
                <span>We'll securely access your order and product data</span>
              </div>
              <div className="flex items-start">
                <svg className="w-5 h-5 text-green-500 mt-0.5 mr-3 flex-shrink-0" fill="currentColor" viewBox="0 0 20 20">
                  <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                </svg>
                <span>Automatic webhooks will track new orders in real-time</span>
              </div>
              <div className="flex items-start">
                <svg className="w-5 h-5 text-green-500 mt-0.5 mr-3 flex-shrink-0" fill="currentColor" viewBox="0 0 20 20">
                  <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                </svg>
                <span>Start getting accurate tax collection reports immediately</span>
              </div>
              <div className="flex items-start">
                <svg className="w-5 h-5 text-green-500 mt-0.5 mr-3 flex-shrink-0" fill="currentColor" viewBox="0 0 20 20">
                  <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                </svg>
                <span>Know exactly how much tax money to set aside</span>
              </div>
            </div>
          </div>
        </Card>

        <div className="mt-8 text-center">
          <p className="text-sm text-secondary-500">
            Secured by Shopify OAuth. We never store your Shopify password.
          </p>
        </div>
      </div>
    </div>
  )
}