'use client'

import { signIn, getSession } from 'next-auth/react'
import { useEffect, useState } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { 
  Page, 
  Layout, 
  Card, 
  Button, 
  Text, 
  Banner,
  Spinner,
  Box
} from '@shopify/polaris'

export default function SignInPolaris() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState('')
  
  const callbackUrl = searchParams.get('callbackUrl') || '/dashboard'
  const errorParam = searchParams.get('error')

  useEffect(() => {
    // Check if user is already signed in
    getSession().then((session) => {
      if (session) {
        router.push(callbackUrl)
      }
    })
  }, [router, callbackUrl])

  useEffect(() => {
    // Handle authentication errors
    if (errorParam) {
      switch (errorParam) {
        case 'Configuration':
          setError('There is a problem with the server configuration.')
          break
        case 'AccessDenied':
          setError('Access denied. Please try again.')
          break
        case 'Verification':
          setError('The verification link was invalid or has expired.')
          break
        default:
          setError('An error occurred during authentication. Please try again.')
      }
    }
  }, [errorParam])

  const handleGoogleSignIn = async () => {
    try {
      setIsLoading(true)
      setError('')
      
      const result = await signIn('google', {
        callbackUrl,
        redirect: false,
      })
      
      if (result?.error) {
        setError('Failed to sign in with Google. Please try again.')
      } else if (result?.url) {
        router.push(result.url)
      }
    } catch (error) {
      console.error('Sign in error:', error)
      setError('An unexpected error occurred. Please try again.')
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <Page title="">
      <Layout>
        <Layout.Section>
          <div style={{ 
            display: 'flex', 
            justifyContent: 'center', 
            alignItems: 'center',
            minHeight: '70vh',
            padding: '20px'
          }}>
            <div style={{ width: '100%', maxWidth: '400px' }}>
              <Box paddingBlockEnd="800">
                <div style={{ textAlign: 'center', marginBottom: '32px' }}>
                  <Text variant="headingXl" as="h1">
                    Welcome to Tax Analytics
                  </Text>
                  <Box paddingBlockStart="200">
                    <Text variant="bodyMd" as="p" tone="subdued">
                      Sign in to access your tax reporting dashboard
                    </Text>
                  </Box>
                </div>
              </Box>

              <Card>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
                  {error && (
                    <Banner tone="critical">
                      <Text variant="bodyMd" as="p">
                        {error}
                      </Text>
                    </Banner>
                  )}

                  <Button
                    onClick={handleGoogleSignIn}
                    loading={isLoading}
                    fullWidth
                    size="large"
                  >
                    {isLoading ? 'Signing in...' : 'Continue with Google'}
                  </Button>

                  <Box paddingBlockStart="400">
                    <div style={{ textAlign: 'center' }}>
                      <Text variant="bodySm" as="p" tone="subdued">
                        By signing in, you agree to our{' '}
                        <a href="/terms" style={{ color: '#0070f3' }}>
                          Terms of Service
                        </a>{' '}
                        and{' '}
                        <a href="/privacy" style={{ color: '#0070f3' }}>
                          Privacy Policy
                        </a>
                      </Text>
                    </div>
                  </Box>
                </div>
              </Card>

              <Box paddingBlockStart="800">
                <Card>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                    <Text variant="headingMd" as="h3">
                      What happens after you sign in?
                    </Text>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                      <Text variant="bodyMd" as="p">✓ We'll create your organization automatically</Text>
                      <Text variant="bodyMd" as="p">✓ You can connect your Shopify and Square accounts</Text>
                      <Text variant="bodyMd" as="p">✓ Start tracking sales tax across all platforms</Text>
                      <Text variant="bodyMd" as="p">✓ Generate comprehensive tax reports</Text>
                    </div>
                  </div>
                </Card>
              </Box>
            </div>
          </div>
        </Layout.Section>
      </Layout>
    </Page>
  )
}