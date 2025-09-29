'use client'

import { useSession } from 'next-auth/react'
import { useEffect, useState } from 'react'

export default function DebugClientSession() {
  const { data: session, status } = useSession()
  const [serverSession, setServerSession] = useState<any>(null)
  
  useEffect(() => {
    // Fetch server-side session info
    fetch('/api/debug/client-session')
      .then(res => res.json())
      .then(data => setServerSession(data))
      .catch(err => console.error('Failed to fetch server session:', err))
  }, [])
  
  return (
    <div className="p-8 max-w-4xl mx-auto">
      <h1 className="text-2xl font-bold mb-6">Client-Side Session Debug</h1>
      
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Client-side session */}
        <div className="bg-white rounded-lg border p-6">
          <h2 className="text-lg font-semibold mb-4">Client-Side (useSession)</h2>
          <div className="space-y-2">
            <div><strong>Status:</strong> {status}</div>
            <div><strong>Session exists:</strong> {session ? 'Yes' : 'No'}</div>
            <div><strong>Email:</strong> {session?.user?.email || 'None'}</div>
            <div><strong>User ID:</strong> {session?.user?.id || 'None'}</div>
          </div>
          
          {session && (
            <div className="mt-4">
              <h3 className="font-semibold">Full Session:</h3>
              <pre className="bg-gray-100 p-2 text-xs overflow-auto max-h-40">
                {JSON.stringify(session, null, 2)}
              </pre>
            </div>
          )}
        </div>
        
        {/* Server-side session */}
        <div className="bg-white rounded-lg border p-6">
          <h2 className="text-lg font-semibold mb-4">Server-Side</h2>
          {serverSession ? (
            <div className="space-y-2">
              <div><strong>Session exists:</strong> {serverSession.serverSideSession?.exists ? 'Yes' : 'No'}</div>
              <div><strong>Email:</strong> {serverSession.serverSideSession?.email || 'None'}</div>
              <div><strong>User ID:</strong> {serverSession.serverSideSession?.userId || 'None'}</div>
              <div><strong>Organizations:</strong> {serverSession.serverSideSession?.organizationCount || 0}</div>
              <div><strong>Has session cookie:</strong> {serverSession.cookies?.hasSessionToken ? 'Yes' : 'No'}</div>
            </div>
          ) : (
            <div>Loading server session...</div>
          )}
          
          {serverSession && (
            <div className="mt-4">
              <h3 className="font-semibold">Full Server Response:</h3>
              <pre className="bg-gray-100 p-2 text-xs overflow-auto max-h-40">
                {JSON.stringify(serverSession, null, 2)}
              </pre>
            </div>
          )}
        </div>
      </div>
      
      <div className="mt-6 p-4 bg-yellow-50 border border-yellow-200 rounded">
        <h3 className="font-semibold text-yellow-800">Debug Analysis:</h3>
        <ul className="mt-2 space-y-1 text-yellow-700">
          <li>• If server-side shows session but client-side doesn't, it's a cookie/sync issue</li>
          <li>• If both show session but dashboard doesn't load, it's a component issue</li>
          <li>• If neither show session, user needs to re-authenticate</li>
        </ul>
      </div>
      
      <div className="mt-4 space-x-4">
        <button 
          onClick={() => window.location.reload()} 
          className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700"
        >
          Refresh Page
        </button>
        <button 
          onClick={() => fetch('/api/auth/session').then(() => window.location.reload())} 
          className="px-4 py-2 bg-green-600 text-white rounded hover:bg-green-700"
        >
          Refresh Session
        </button>
      </div>
    </div>
  )
}