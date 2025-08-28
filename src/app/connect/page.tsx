import { Suspense } from 'react'
import ConnectClient from './connect-client'
import ConnectPolaris from './connect-polaris'

// Force dynamic rendering for this page
export const dynamic = 'force-dynamic'
export const dynamicParams = true
export const revalidate = 0

function ConnectContent() {
  // Simple client-side check for embedded mode
  const isEmbedded = typeof window !== 'undefined' && 
    (window.location.search.includes('embedded=1') || 
     window.location !== window.parent.location)

  if (isEmbedded) {
    return <ConnectPolaris />
  }

  return <ConnectClient />
}

export default function ConnectPage() {
  return (
    <Suspense fallback={
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary-600"></div>
      </div>
    }>
      <ConnectContent />
    </Suspense>
  )
}