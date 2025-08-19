import React, { useState } from 'react'
import { signOut } from 'next-auth/react'

const DisconnectAccount: React.FC = () => {
  const [isDisconnecting, setIsDisconnecting] = useState(false)
  const [showConfirmation, setShowConfirmation] = useState(false)
  const [disconnectResult, setDisconnectResult] = useState<any>(null)

  const handleDisconnectAccount = async () => {
    setIsDisconnecting(true)
    try {
      // First, clear any Shopify integrations
      const clearResponse = await fetch('/api/admin/clear-integration', {
        method: 'POST'
      })
      const clearResult = await clearResponse.json()
      
      console.log('Cleared integrations:', clearResult)
      
      // Sign out the user
      await signOut({ 
        callbackUrl: '/',
        redirect: true 
      })
      
    } catch (error) {
      console.error('Disconnect account error:', error)
      setDisconnectResult({ 
        error: 'Failed to disconnect account',
        details: error instanceof Error ? error.message : 'Unknown error' 
      })
    } finally {
      setIsDisconnecting(false)
      setShowConfirmation(false)
    }
  }

  if (disconnectResult?.error) {
    return (
      <div className="space-y-6">
        <div>
          <h3 className="text-lg font-medium text-gray-900 mb-4">Account Management</h3>
          <div className="bg-red-50 border border-red-200 rounded-lg p-4">
            <div className="flex">
              <svg className="w-5 h-5 text-red-400" fill="currentColor" viewBox="0 0 20 20">
                <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
              </svg>
              <div className="ml-3">
                <h3 className="text-sm font-medium text-red-800">Disconnect Failed</h3>
                <p className="text-sm text-red-700 mt-1">{disconnectResult.error}</p>
              </div>
            </div>
          </div>
          <button
            onClick={() => setDisconnectResult(null)}
            className="mt-4 bg-gray-600 text-white px-4 py-2 rounded-lg hover:bg-gray-700 transition-colors"
          >
            Try Again
          </button>
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <div>
        <h3 className="text-lg font-medium text-gray-900 mb-4">Account Management</h3>
        <p className="text-sm text-gray-600 mb-6">
          Manage your account connection and data. Disconnecting will remove all integrations and sign you out.
        </p>
      </div>

      {/* Disconnect Account Section */}
      <div className="bg-red-50 border border-red-200 rounded-lg p-6">
        <div className="flex items-start">
          <svg className="w-6 h-6 text-red-600 mt-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L3.732 16.5c-.77.833.192 2.5 1.732 2.5z" />
          </svg>
          <div className="ml-4 flex-1">
            <h4 className="text-lg font-medium text-red-900 mb-2">Disconnect Account</h4>
            <p className="text-sm text-red-700 mb-4">
              This action will permanently disconnect your account and remove all connected integrations. You will need to reconnect your stores if you sign in again.
            </p>
            
            <div className="text-sm text-red-600 mb-4">
              <p className="font-medium mb-2">This will:</p>
              <ul className="list-disc list-inside space-y-1">
                <li>Remove all Shopify store connections</li>
                <li>Clear stored access tokens and credentials</li>
                <li>Sign you out of the application</li>
                <li>Require re-authentication to access the app again</li>
              </ul>
            </div>

            {!showConfirmation ? (
              <button
                onClick={() => setShowConfirmation(true)}
                className="bg-red-600 text-white px-4 py-2 rounded-lg hover:bg-red-700 transition-colors font-medium"
              >
                Disconnect My Account
              </button>
            ) : (
              <div className="space-y-4">
                <div className="bg-red-100 border border-red-300 rounded-lg p-4">
                  <p className="text-red-800 font-medium mb-2">⚠️ Are you sure?</p>
                  <p className="text-red-700 text-sm mb-4">
                    This action cannot be undone. All your integrations will be removed and you'll be signed out.
                  </p>
                  <div className="flex space-x-3">
                    <button
                      onClick={handleDisconnectAccount}
                      disabled={isDisconnecting}
                      className="bg-red-600 text-white px-4 py-2 rounded-lg hover:bg-red-700 transition-colors font-medium disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      {isDisconnecting ? (
                        <div className="flex items-center space-x-2">
                          <svg className="animate-spin h-4 w-4" fill="none" viewBox="0 0 24 24">
                            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                          </svg>
                          <span>Disconnecting...</span>
                        </div>
                      ) : (
                        'Yes, Disconnect Account'
                      )}
                    </button>
                    <button
                      onClick={() => setShowConfirmation(false)}
                      disabled={isDisconnecting}
                      className="bg-gray-300 text-gray-700 px-4 py-2 rounded-lg hover:bg-gray-400 transition-colors"
                    >
                      Cancel
                    </button>
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Alternative: Clear Integration Only */}
      <div className="bg-orange-50 border border-orange-200 rounded-lg p-6">
        <div className="flex items-start">
          <svg className="w-6 h-6 text-orange-600 mt-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
          </svg>
          <div className="ml-4 flex-1">
            <h4 className="text-lg font-medium text-orange-900 mb-2">Clear Integrations Only</h4>
            <p className="text-sm text-orange-700 mb-4">
              If you only want to remove connected stores without signing out, you can clear integrations from the dashboard.
            </p>
            <button
              onClick={() => window.location.href = '/dashboard'}
              className="bg-orange-600 text-white px-4 py-2 rounded-lg hover:bg-orange-700 transition-colors"
            >
              Go to Dashboard
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}

export default DisconnectAccount