'use client'

import { useState, useEffect, useMemo } from 'react'
import { useSession } from 'next-auth/react'
import AuthGuard from '@/components/auth/AuthGuard'
import DashboardLayout from '@/components/dashboard/DashboardLayout'
import LinkedEmails from '@/components/user/LinkedEmails'
import DisconnectAccount from '@/components/settings/DisconnectAccount'
import ImportProgress from '@/components/settings/ImportProgress'
import { Card } from '@/components/ui/Card'
import SettingsPolaris from './settings-polaris'
import { useEmbedded } from '@/hooks/useEmbedded'

export default function SettingsPage() {
  const { isEmbedded, isLoading } = useEmbedded()
  const { data: session } = useSession()
  const [activeTab, setActiveTab] = useState('emails')
  const [integrationId, setIntegrationId] = useState<string | null>(null)

  const tabs = useMemo(() => [
    { id: 'emails', label: 'Email Addresses' },
    { id: 'profile', label: 'Profile' },
    { id: 'data', label: 'Data & Import' },
    { id: 'notifications', label: 'Notifications' },
    { id: 'account', label: 'Account' },
  ], [])

  // Check URL for tab parameter
  useEffect(() => {
    const searchParams = new URLSearchParams(window.location.search)
    const tabParam = searchParams.get('tab')
    if (tabParam && tabs.some(tab => tab.id === tabParam)) {
      setActiveTab(tabParam)
    }
  }, [tabs])

  // Fetch user's current integration
  useEffect(() => {
    const fetchIntegration = async () => {
      if (!session?.user) return

      try {
        const response = await fetch('/api/user/current-integration')
        
        // Check if response is ok
        if (!response.ok) {
          console.error('API returned error:', response.status, response.statusText)
          return
        }
        
        // Get response text first to check if it's valid
        const text = await response.text()
        if (!text) {
          console.error('API returned empty response')
          return
        }
        
        // Parse JSON safely
        let result
        try {
          result = JSON.parse(text)
        } catch (parseError) {
          console.error('Failed to parse JSON:', text)
          return
        }
        
        console.log('Current integration API response:', result)
        
        if (result.integration) {
          setIntegrationId(result.integration.id)
          console.log('✅ Set integration ID:', result.integration.id)
        } else if (result.error) {
          console.error('API error:', result.error)
        } else {
          console.log('No integration found')
        }
        
      } catch (error) {
        console.error('Failed to fetch integration:', error)
      }
    }

    fetchIntegration()
  }, [session])

  // Use Polaris UI when embedded, traditional UI otherwise
  if (isEmbedded) {
    return <SettingsPolaris />
  }

  // Show loading state while detecting mode
  if (isLoading) {
    return (
      <AuthGuard>
        <DashboardLayout>
          <div className="max-w-4xl mx-auto">
            <div className="animate-pulse">
              <div className="h-8 bg-gray-200 rounded w-32 mb-6"></div>
              <div className="h-64 bg-gray-200 rounded"></div>
            </div>
          </div>
        </DashboardLayout>
      </AuthGuard>
    )
  }

  return (
    <AuthGuard>
      <DashboardLayout>
        <div className="max-w-4xl mx-auto">
          <h1 className="text-2xl font-bold text-gray-900 mb-6">Settings</h1>

          {/* Tabs */}
          <div className="border-b border-gray-200 mb-6">
            <nav className="-mb-px flex space-x-8">
              {tabs.map((tab) => (
                <button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id)}
                  className={`
                    py-2 px-1 border-b-2 font-medium text-sm
                    ${activeTab === tab.id
                      ? 'border-primary-500 text-primary-600'
                      : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                    }
                  `}
                >
                  {tab.label}
                </button>
              ))}
            </nav>
          </div>

          {/* Tab Content */}
          <Card className="p-6">
            {activeTab === 'emails' && <LinkedEmails />}
            
            {activeTab === 'profile' && (
              <div>
                <h3 className="text-lg font-medium text-gray-900 mb-4">Profile Information</h3>
                <div className="space-y-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700">Name</label>
                    <p className="mt-1 text-sm text-gray-900">{session?.user?.name}</p>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700">Primary Email</label>
                    <p className="mt-1 text-sm text-gray-900">{session?.user?.email}</p>
                  </div>
                </div>
              </div>
            )}

            {activeTab === 'data' && <ImportProgress integrationId={integrationId} />}
            
            {activeTab === 'notifications' && (
              <div>
                <h3 className="text-lg font-medium text-gray-900 mb-4">Notification Preferences</h3>
                <p className="text-sm text-gray-600">Notification settings coming soon...</p>
              </div>
            )}

            {activeTab === 'account' && <DisconnectAccount />}
          </Card>
        </div>
      </DashboardLayout>
    </AuthGuard>
  )
}