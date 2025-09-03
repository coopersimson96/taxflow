'use client'

import { useState, useEffect } from 'react'
import { useSession } from 'next-auth/react'
import { useRouter, useSearchParams } from 'next/navigation'
import {
  Page,
  Layout,
  Card,
  Button,
  TextField,
  Text,
  Banner,
  Spinner,
  Box,
  List
} from '@shopify/polaris'

export default function ConnectPolaris() {
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
    const actionParam = searchParams.get('action')
    const orgParam = searchParams.get('org')

    // Handle store linking redirect
    if (actionParam === 'link_store' && shopParam && orgParam) {
      router.push(`/link-store?shop=${shopParam}&org=${orgParam}`)
      return
    }

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

  const handleShopDomainChange = (value: string) => {
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

  const handleFieldBlur = () => {
    setShopDomain(formatShopDomain(shopDomain))
  }

  if (status === 'loading') {
    return (
      <Page title="Connect Store">
        <Layout>
          <Layout.Section>
            <div style={{ textAlign: 'center', padding: '60px 0' }}>
              <Spinner size="large" />
            </div>
          </Layout.Section>
        </Layout>
      </Page>
    )
  }

  if (!session) {
    return null // Will redirect to signin
  }

  return (
    <Page
      title="Connect Your Shopify Store"
      subtitle="Start tracking tax collected from your Shopify sales automatically"
      fullWidth={false}
    >
      <Layout>
        <Layout.Section>
          <div style={{ maxWidth: '600px', margin: '0 auto' }}>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
              {success && (
                <Banner tone="success" title="Store Connected Successfully">
                  <Text variant="bodyMd" as="p">
                    {success}
                  </Text>
                  <Box paddingBlockStart="400">
                    <Button 
                      onClick={() => router.push('/dashboard')}
                      variant="primary"
                    >
                      Go to Dashboard
                    </Button>
                  </Box>
                </Banner>
              )}

              <Card>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
                  <TextField
                    label="Shopify Store Domain"
                    value={shopDomain}
                    onChange={handleShopDomainChange}
                    onBlur={handleFieldBlur}
                    placeholder="your-store-name"
                    suffix=".myshopify.com"
                    helpText="Enter just your store name (e.g., 'my-store' for my-store.myshopify.com)"
                    disabled={isConnecting}
                    error={error}
                    autoComplete="off"
                  />

                  {error && (
                    <Banner tone="critical">
                      <Text variant="bodyMd" as="p">
                        {error}
                      </Text>
                    </Banner>
                  )}

                  <Button
                    onClick={handleConnect}
                    loading={isConnecting}
                    disabled={!shopDomain.trim()}
                    variant="primary"
                    size="large"
                    fullWidth
                  >
                    {isConnecting ? 'Connecting to Shopify...' : 'Connect Shopify Store'}
                  </Button>
                </div>
              </Card>

              <Card>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
                  <Text variant="headingMd" as="h3">
                    What happens when you connect?
                  </Text>
                  
                  <List>
                    <List.Item>
                      <div style={{ display: 'flex', alignItems: 'flex-start', gap: '8px' }}>
                        <Text variant="bodyMd" as="span" tone="success">✓</Text>
                        <Text variant="bodyMd" as="span">
                          We'll securely access your order and product data
                        </Text>
                      </div>
                    </List.Item>
                    <List.Item>
                      <div style={{ display: 'flex', alignItems: 'flex-start', gap: '8px' }}>
                        <Text variant="bodyMd" as="span" tone="success">✓</Text>
                        <Text variant="bodyMd" as="span">
                          Automatic webhooks will track new orders in real-time
                        </Text>
                      </div>
                    </List.Item>
                    <List.Item>
                      <div style={{ display: 'flex', alignItems: 'flex-start', gap: '8px' }}>
                        <Text variant="bodyMd" as="span" tone="success">✓</Text>
                        <Text variant="bodyMd" as="span">
                          Start getting accurate tax collection reports immediately
                        </Text>
                      </div>
                    </List.Item>
                    <List.Item>
                      <div style={{ display: 'flex', alignItems: 'flex-start', gap: '8px' }}>
                        <Text variant="bodyMd" as="span" tone="success">✓</Text>
                        <Text variant="bodyMd" as="span">
                          Know exactly how much tax money to set aside
                        </Text>
                      </div>
                    </List.Item>
                  </List>
                </div>
              </Card>

              <Box paddingBlockStart="400">
                <div style={{ textAlign: 'center' }}>
                  <Text variant="bodySm" as="p" tone="subdued">
                    Secured by Shopify OAuth. We never store your Shopify password.
                  </Text>
                </div>
              </Box>
            </div>
          </div>
        </Layout.Section>
      </Layout>
    </Page>
  )
}