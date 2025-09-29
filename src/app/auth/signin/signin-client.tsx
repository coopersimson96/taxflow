'use client'

import { signIn, getSession } from 'next-auth/react'
import { useEffect, useState } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { Button } from '@/components/ui/Button'
import { Card } from '@/components/ui/Card'

export default function SignInClient() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState('')
  
  const callbackUrl = searchParams.get('callbackUrl') || '/dashboard'
  const errorParam = searchParams.get('error')

  // Note: Removed client-side redirect check as middleware handles this

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
    <div className="min-h-screen flex items-center justify-center bg-secondary-300 px-4">
      <div className="w-full max-w-lg">
        <div className="text-center mb-12">
          <h1 className="text-4xl font-bold mb-4 text-primary-900">
            Welcome to Set Aside
          </h1>
          <p className="text-xl text-secondary">
            Sign in to access your tax reporting dashboard
          </p>
        </div>

        <div className="card">
          {error && (
            <div className="mb-8 p-4 bg-error-50 border-2 border-error-200 rounded-xl">
              <p className="text-error-600 text-center font-medium">{error}</p>
            </div>
          )}

          <div className="space-y-6">
            <button
              onClick={handleGoogleSignIn}
              disabled={isLoading}
              className="w-full btn-primary flex items-center justify-center gap-3 text-lg py-4"
            >
              <svg
                className="w-5 h-5"
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
              {isLoading ? 'Signing in...' : 'Continue with Google'}
            </button>
          </div>

          <div className="mt-6 text-center">
            <p className="text-xs text-muted">
              By signing in, you agree to our{' '}
              <a href="/terms" className="text-highlight-500 hover:text-primary-900 transition-colors">
                Terms of Service
              </a>{' '}
              and{' '}
              <a href="/privacy" className="text-highlight-500 hover:text-primary-900 transition-colors">
                Privacy Policy
              </a>
            </p>
          </div>
        </div>

        <div className="mt-8 text-center">
          <div className="bg-white/80 backdrop-blur-sm rounded-xl p-6 border border-white/20">
            <h3 className="text-lg font-semibold text-primary-900 mb-3">
              What happens after you sign in?
            </h3>
            <div className="space-y-2 text-sm text-secondary">
              <p>✓ We'll create your organization automatically</p>
              <p>✓ You can connect your Shopify and Square accounts</p>
              <p>✓ Start tracking sales tax across all platforms</p>
              <p>✓ Generate comprehensive tax reports</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}