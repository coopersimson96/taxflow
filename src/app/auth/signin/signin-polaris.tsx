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
  Stack,
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
                    <Text variant="bodyMd" as="p" color="subdued">
                      Sign in to access your tax reporting dashboard
                    </Text>
                  </Box>
                </div>
              </Box>

              <Card>
                <Stack vertical spacing="loose">
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
                    <Stack alignment="center" spacing="tight">
                      {!isLoading && (
                        <svg
                          width="20"
                          height="20"
                          viewBox="0 0 24 24"
                          xmlns="http://www.w3.org/2000/svg"
                        >
                          <path
                            fill="#4285F4"
                            d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
                          />
                          <path
                            fill="#34A853"
                            d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
                          />
                          <path
                            fill="#FBBC05"
                            d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"
                          />
                          <path
                            fill="#EA4335"
                            d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"
                          />
                        </svg>
                      )}
                      <Text variant="bodyMd" as="span">
                        {isLoading ? 'Signing in...' : 'Continue with Google'}
                      </Text>
                    </Stack>
                  </Button>

                  <Box paddingBlockStart="400">
                    <div style={{ textAlign: 'center' }}>
                      <Text variant="bodySm" as="p" color="subdued">
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
                </Stack>
              </Card>

              <Box paddingBlockStart="800">
                <Card>
                  <Stack vertical spacing="tight">
                    <Text variant="headingMd" as="h3">
                      What happens after you sign in?
                    </Text>
                    <Stack vertical spacing="extraTight">
                      <Text variant="bodyMd" as="p">✓ We'll create your organization automatically</Text>
                      <Text variant="bodyMd" as="p">✓ You can connect your Shopify and Square accounts</Text>
                      <Text variant="bodyMd" as="p">✓ Start tracking sales tax across all platforms</Text>
                      <Text variant="bodyMd" as="p">✓ Generate comprehensive tax reports</Text>
                    </Stack>
                  </Stack>
                </Card>
              </Box>
            </div>
          </div>
        </Layout.Section>
      </Layout>
    </Page>
  )
}