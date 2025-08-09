'use client'

import { useEffect, useState } from 'react'
import { useSession } from 'next-auth/react'

export default function DashboardDebugPage() {
  const [logs, setLogs] = useState<string[]>([])
  const [apiResponse, setApiResponse] = useState<any>(null)
  const [apiError, setApiError] = useState<string | null>(null)
  const { data: session } = useSession()

  const addLog = (message: string) => {
    console.log(`🐛 DEBUG: ${message}`)
    setLogs(prev => [...prev, `${new Date().toLocaleTimeString()}: ${message}`])
  }

  useEffect(() => {
    addLog('Dashboard debug page mounted')
    addLog(`Session status: ${session ? 'authenticated' : 'not authenticated'}`)
    addLog(`User email: ${session?.user?.email || 'none'}`)

    // Test both APIs
    const testAPIs = async () => {
      addLog('Testing sample data API...')
      try {
        const sampleResponse = await fetch('/api/analytics/sample-data?days=30')
        addLog(`Sample API status: ${sampleResponse.status}`)
        
        if (sampleResponse.ok) {
          const sampleData = await sampleResponse.json()
          addLog(`Sample API success: ${JSON.stringify(sampleData).substring(0, 100)}...`)
          setApiResponse(sampleData)
        } else {
          const error = await sampleResponse.text()
          addLog(`Sample API error: ${error}`)
          setApiError(`Sample API: ${error}`)
        }
      } catch (error) {
        addLog(`Sample API fetch error: ${error}`)
        setApiError(`Sample API fetch: ${error}`)
      }

      addLog('Testing real dashboard API...')
      try {
        const realResponse = await fetch('/api/analytics/tax-dashboard?days=30&includeTrends=true')
        addLog(`Real API status: ${realResponse.status}`)
        
        if (realResponse.ok) {
          const realData = await realResponse.json()
          addLog(`Real API success: ${JSON.stringify(realData).substring(0, 100)}...`)
        } else {
          const error = await realResponse.text()
          addLog(`Real API error: ${error}`)
        }
      } catch (error) {
        addLog(`Real API fetch error: ${error}`)
      }
    }

    testAPIs()
  }, [session])

  return (
    <div className="p-6 max-w-4xl mx-auto">
      <h1 className="text-2xl font-bold mb-6">Dashboard Debug Page</h1>
      
      <div className="space-y-6">
        <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
          <h2 className="font-semibold text-blue-900 mb-3">Debug Logs</h2>
          <div className="space-y-1 font-mono text-sm">
            {logs.map((log, index) => (
              <div key={index} className="text-blue-800">{log}</div>
            ))}
          </div>
        </div>

        {apiError && (
          <div className="bg-red-50 border border-red-200 rounded-lg p-4">
            <h2 className="font-semibold text-red-900 mb-3">API Error</h2>
            <p className="text-red-800">{apiError}</p>
          </div>
        )}

        {apiResponse && (
          <div className="bg-green-50 border border-green-200 rounded-lg p-4">
            <h2 className="font-semibold text-green-900 mb-3">API Response Sample</h2>
            <pre className="text-sm bg-white p-3 rounded border overflow-auto">
              {JSON.stringify(apiResponse, null, 2)}
            </pre>
          </div>
        )}
      </div>
    </div>
  )
}