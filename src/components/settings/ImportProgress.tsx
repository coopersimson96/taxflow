import React, { useState, useEffect } from 'react'

interface ImportStatus {
  status: 'not_started' | 'in_progress' | 'completed' | 'failed'
  progress?: number
  totalImported?: number
  startedAt?: string
  completedAt?: string
  failedAt?: string
  error?: string
}

interface ImportProgressProps {
  integrationId?: string
}

const ImportProgress: React.FC<ImportProgressProps> = ({ integrationId }) => {
  const [importStatus, setImportStatus] = useState<ImportStatus | null>(null)
  const [isLoading, setIsLoading] = useState(false)
  const [isTriggering, setIsTriggering] = useState(false)

  const fetchImportStatus = async () => {
    if (!integrationId) return
    
    try {
      setIsLoading(true)
      const response = await fetch(`/api/admin/trigger-historical-import?integrationId=${integrationId}`)
      const result = await response.json()
      
      if (result.success) {
        setImportStatus(result.status)
      }
    } catch (error) {
      console.error('Failed to fetch import status:', error)
    } finally {
      setIsLoading(false)
    }
  }

  const triggerHistoricalImport = async () => {
    if (!integrationId) return
    
    try {
      setIsTriggering(true)
      const response = await fetch('/api/admin/trigger-historical-import', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          integrationId,
          options: {
            daysBack: 90,
            batchSize: 50,
            maxOrders: 1000
          }
        })
      })
      
      const result = await response.json()
      
      if (result.success) {
        // Start polling for status updates
        setImportStatus({ status: 'in_progress', progress: 0 })
        pollForUpdates()
      } else {
        console.error('Import trigger failed:', result.error)
      }
    } catch (error) {
      console.error('Failed to trigger import:', error)
    } finally {
      setIsTriggering(false)
    }
  }

  const pollForUpdates = () => {
    const interval = setInterval(async () => {
      await fetchImportStatus()
      
      // Stop polling if completed or failed
      if (importStatus?.status === 'completed' || importStatus?.status === 'failed') {
        clearInterval(interval)
      }
    }, 2000) // Poll every 2 seconds

    // Stop polling after 5 minutes to prevent infinite loops
    setTimeout(() => clearInterval(interval), 300000)
  }

  useEffect(() => {
    if (integrationId) {
      fetchImportStatus()
    }
  }, [integrationId])

  if (!integrationId) {
    return (
      <div className="bg-gray-50 border border-gray-200 rounded-lg p-4">
        <p className="text-gray-600 text-sm">No Shopify integration found</p>
      </div>
    )
  }

  if (isLoading) {
    return (
      <div className="bg-gray-50 border border-gray-200 rounded-lg p-4">
        <div className="flex items-center space-x-2">
          <div className="animate-spin w-4 h-4 border-2 border-blue-600 border-t-transparent rounded-full"></div>
          <span className="text-gray-600 text-sm">Checking import status...</span>
        </div>
      </div>
    )
  }

  const getStatusDisplay = () => {
    if (!importStatus || importStatus.status === 'not_started') {
      return {
        color: 'bg-yellow-50 border-yellow-200',
        textColor: 'text-yellow-800',
        icon: '⚠️',
        title: 'Historical Data Not Imported',
        description: 'Your historical order data has not been imported yet. Import the last 90 days to see complete tax calculations.'
      }
    }

    if (importStatus.status === 'in_progress') {
      return {
        color: 'bg-blue-50 border-blue-200',
        textColor: 'text-blue-800',
        icon: '🔄',
        title: 'Import In Progress',
        description: `Importing historical orders... ${importStatus.progress || 0} orders processed so far.`
      }
    }

    if (importStatus.status === 'completed') {
      return {
        color: 'bg-green-50 border-green-200',
        textColor: 'text-green-800',
        icon: '✅',
        title: 'Import Completed',
        description: `Successfully imported ${importStatus.totalImported || 0} historical orders. Your dashboard now shows complete tax data.`
      }
    }

    if (importStatus.status === 'failed') {
      return {
        color: 'bg-red-50 border-red-200',
        textColor: 'text-red-800',
        icon: '❌',
        title: 'Import Failed',
        description: `Historical import failed: ${importStatus.error || 'Unknown error'}. You can retry the import below.`
      }
    }

    return {
      color: 'bg-gray-50 border-gray-200',
      textColor: 'text-gray-800',
      icon: '❓',
      title: 'Unknown Status',
      description: 'Unable to determine import status.'
    }
  }

  const statusDisplay = getStatusDisplay()

  return (
    <div>
      <h3 className="text-lg font-medium text-gray-900 mb-4">Historical Data Import</h3>
      
      <div className={`${statusDisplay.color} border rounded-lg p-4 mb-4`}>
        <div className="flex items-start space-x-3">
          <span className="text-xl">{statusDisplay.icon}</span>
          <div className="flex-1">
            <h4 className={`font-medium ${statusDisplay.textColor} mb-1`}>
              {statusDisplay.title}
            </h4>
            <p className={`text-sm ${statusDisplay.textColor}`}>
              {statusDisplay.description}
            </p>
            
            {importStatus?.startedAt && (
              <p className={`text-xs ${statusDisplay.textColor} mt-2`}>
                Started: {new Date(importStatus.startedAt).toLocaleString()}
              </p>
            )}
            
            {importStatus?.completedAt && (
              <p className={`text-xs ${statusDisplay.textColor} mt-1`}>
                Completed: {new Date(importStatus.completedAt).toLocaleString()}
              </p>
            )}
          </div>
        </div>
      </div>

      {/* Progress bar for in-progress imports */}
      {importStatus?.status === 'in_progress' && importStatus.progress && (
        <div className="mb-4">
          <div className="bg-gray-200 rounded-full h-2">
            <div 
              className="bg-blue-600 h-2 rounded-full transition-all duration-300"
              style={{ width: `${Math.min((importStatus.progress / 1000) * 100, 100)}%` }}
            ></div>
          </div>
          <p className="text-xs text-gray-600 mt-1">
            {importStatus.progress} / 1000 orders (max)
          </p>
        </div>
      )}

      {/* Action buttons */}
      <div className="flex space-x-3">
        {(!importStatus || importStatus.status === 'not_started' || importStatus.status === 'failed') && (
          <button
            onClick={triggerHistoricalImport}
            disabled={isTriggering}
            className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {isTriggering ? (
              <div className="flex items-center space-x-2">
                <div className="animate-spin w-4 h-4 border-2 border-white border-t-transparent rounded-full"></div>
                <span>Starting Import...</span>
              </div>
            ) : (
              'Import Historical Data'
            )}
          </button>
        )}

        <button
          onClick={fetchImportStatus}
          disabled={isLoading}
          className="bg-gray-300 text-gray-700 px-4 py-2 rounded-lg hover:bg-gray-400 transition-colors disabled:opacity-50"
        >
          Refresh Status
        </button>
      </div>

      <div className="mt-4 bg-blue-50 border border-blue-200 rounded-lg p-3">
        <p className="text-blue-800 text-sm">
          <strong>What gets imported:</strong> Orders from the last 90 days that have been paid. 
          This ensures your tax calculations are based on complete historical data.
        </p>
      </div>
    </div>
  )
}

export default ImportProgress