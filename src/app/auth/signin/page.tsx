import { Suspense } from 'react'
import SignInClient from './signin-client'

// Force dynamic rendering for this page
export const dynamic = 'force-dynamic'
export const dynamicParams = true
export const revalidate = 0

export default function SignInPage() {
  return (
    <Suspense fallback={
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary-600"></div>
      </div>
    }>
      <SignInClient />
    </Suspense>
  )
}