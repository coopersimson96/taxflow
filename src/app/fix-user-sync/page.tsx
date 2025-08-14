'use client'

import { useState } from 'react'
import { useSession } from 'next-auth/react'

export default function FixUserSyncPage() {
  const { data: session, status } = useSession()
  const [isFixing, setIsFixing] = useState(false)
  const [result, setResult] = useState<any>(null)
  const [error, setError] = useState<string | null>(null)

  const handleFix = async () => {
    setIsFixing(true)
    setError(null)
    setResult(null)

    try {
      const response = await fetch('/api/debug/fix-user-sync', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        }
      })

      const data = await response.json()

      if (response.ok) {
        setResult(data)
      } else {
        setError(data.error || 'Fix failed')
      }
    } catch (err) {
      setError('Failed to run fix')
    } finally {
      setIsFixing(false)
    }
  }

  if (status === 'loading') {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p className="text-gray-600">Loading...</p>
        </div>
      </div>
    )
  }

  if (status === 'unauthenticated') {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <h1 className="text-2xl font-bold text-gray-900 mb-4">Authentication Required</h1>
          <p className="text-gray-600 mb-6">You need to be signed in to use this fix.</p>
          <a 
            href="/auth/signin"
            className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
          >
            Sign In
          </a>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gray-50 py-12">
      <div className="max-w-2xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="bg-white rounded-lg shadow p-8">
          <div className="text-center mb-8">
            <h1 className="text-3xl font-bold text-gray-900 mb-4">Fix User Sync</h1>
            <p className="text-gray-600">
              This tool will fix database sync issues that prevent the dashboard from loading properly.
            </p>
          </div>

          <div className="bg-blue-50 rounded-lg p-4 mb-6">
            <h3 className="text-lg font-medium text-blue-900 mb-2">Current User</h3>
            <p className="text-blue-700">
              <strong>Email:</strong> {session?.user?.email}
            </p>
            <p className="text-blue-700">
              <strong>Name:</strong> {session?.user?.name || 'Not set'}
            </p>
          </div>

          <div className="mb-6">
            <h3 className="text-lg font-medium text-gray-900 mb-3">What this fix does:</h3>
            <ul className="list-disc list-inside space-y-2 text-gray-600">
              <li>Creates your user record in the database if missing</li>
              <li>Finds Shopify integrations matching your email</li>
              <li>Adds you as a member to the appropriate organizations</li>
              <li>Ensures you can access your connected stores in the dashboard</li>
            </ul>
          </div>

          <div className="text-center mb-6">
            <button
              onClick={handleFix}
              disabled={isFixing}
              className={`px-6 py-3 rounded-lg font-medium ${
                isFixing
                  ? 'bg-gray-400 cursor-not-allowed'
                  : 'bg-blue-600 hover:bg-blue-700'
              } text-white transition-colors`}
            >
              {isFixing ? (
                <span className="flex items-center">
                  <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                  Fixing...
                </span>
              ) : (
                'Fix User Sync'
              )}
            </button>
          </div>

          {error && (
            <div className="bg-red-50 border border-red-200 rounded-lg p-4 mb-6">
              <h4 className="text-red-900 font-medium mb-2">Error</h4>
              <p className="text-red-700">{error}</p>
            </div>
          )}

          {result && (
            <div className="bg-green-50 border border-green-200 rounded-lg p-4">
              <h4 className="text-green-900 font-medium mb-4">✅ Fix Complete!</h4>
              
              <div className="space-y-3">
                <div>
                  <strong className="text-green-800">User ID:</strong>
                  <span className="text-green-700 ml-2">{result.details.userId}</span>
                </div>
                
                <div>
                  <strong className="text-green-800">Matching Integrations:</strong>
                  <span className="text-green-700 ml-2">{result.details.matchingIntegrations}</span>
                </div>
                
                <div>
                  <strong className="text-green-800">Memberships Created:</strong>
                  <span className="text-green-700 ml-2">{result.details.membershipsCreated}</span>
                </div>

                {result.details.newMemberships.length > 0 && (
                  <div>
                    <strong className="text-green-800">New Organization Access:</strong>
                    <ul className="list-disc list-inside mt-2 space-y-1">
                      {result.details.newMemberships.map((membership: any, index: number) => (
                        <li key={index} className="text-green-700">
                          {membership.organizationName} ({membership.integrationName}) - {membership.role}
                        </li>
                      ))}
                    </ul>
                  </div>
                )}

                <div>
                  <strong className="text-green-800">Final State:</strong>
                  <div className="text-green-700 ml-2">
                    {result.details.finalState.organizationMemberships} organization(s), {result.details.finalState.accessibleStores} accessible store(s)
                  </div>
                </div>
              </div>

              <div className="mt-6 pt-4 border-t border-green-200">
                <p className="text-green-800 font-medium mb-2">Next Steps:</p>
                <a 
                  href="/dashboard"
                  className="inline-flex items-center px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors"
                >
                  Go to Dashboard
                  <svg className="w-4 h-4 ml-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                  </svg>
                </a>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}