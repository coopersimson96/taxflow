'use client'

import { useEffect, useState } from 'react'
import { Card } from '@/components/ui/Card'

interface ImportProgressProps {
  integrationId: string
}

interface ImportStatus {
  status: 'not_started' | 'pending' | 'in_progress' | 'completed' | 'failed'
  totalOrders?: number
  processedOrders?: number
  percentComplete?: number
  error?: string
  completed?: boolean
  importDate?: string
}

export function ImportProgress({ integrationId }: ImportProgressProps) {
  const [status, setStatus] = useState<ImportStatus | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const checkStatus = async () => {
      try {
        const response = await fetch(`/api/integrations/${integrationId}/import-status`)
        if (response.ok) {
          const data = await response.json()
          setStatus(data)
        }
      } catch (error) {
        console.error('Failed to fetch import status:', error)
      } finally {
        setLoading(false)
      }
    }

    // Check immediately
    checkStatus()

    // Poll every 5 seconds if import is in progress
    const interval = setInterval(() => {
      if (status?.status === 'in_progress' || status?.status === 'pending') {
        checkStatus()
      }
    }, 5000)

    return () => clearInterval(interval)
  }, [integrationId, status?.status])

  if (loading) {
    return null
  }

  if (!status || status.status === 'not_started') {
    return null
  }

  if (status.status === 'completed' && status.completed) {
    // Don't show anything if import was completed in the past
    return null
  }

  return (
    <Card className="mb-6 bg-blue-50 border-blue-200">
      <div className="p-6">
        <h3 className="text-lg font-semibold text-blue-900 mb-2">
          📚 Importing Historical Orders
        </h3>
        
        {status.status === 'in_progress' && (
          <>
            <p className="text-sm text-blue-700 mb-4">
              We're importing your last 12 months of order history. This may take a few minutes.
            </p>
            
            <div className="mb-2">
              <div className="flex justify-between text-sm text-blue-700 mb-1">
                <span>Progress</span>
                <span>{status.processedOrders} of {status.totalOrders} orders</span>
              </div>
              <div className="w-full bg-blue-200 rounded-full h-2.5">
                <div 
                  className="bg-blue-600 h-2.5 rounded-full transition-all duration-500"
                  style={{ width: `${status.percentComplete || 0}%` }}
                />
              </div>
            </div>
          </>
        )}

        {status.status === 'pending' && (
          <p className="text-sm text-blue-700">
            Preparing to import historical orders...
          </p>
        )}

        {status.status === 'failed' && (
          <div className="text-red-600">
            <p className="text-sm font-semibold">Import failed</p>
            <p className="text-xs mt-1">{status.error}</p>
          </div>
        )}
      </div>
    </Card>
  )
}