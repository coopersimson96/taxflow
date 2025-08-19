'use client'

import { useState } from 'react'
import { useSession } from 'next-auth/react'
import AuthGuard from '@/components/auth/AuthGuard'
import DashboardLayout from '@/components/dashboard/DashboardLayout'
import LinkedEmails from '@/components/user/LinkedEmails'
import DisconnectAccount from '@/components/settings/DisconnectAccount'
import { Card } from '@/components/ui/Card'

export default function SettingsPage() {
  const { data: session } = useSession()
  const [activeTab, setActiveTab] = useState('emails')

  const tabs = [
    { id: 'emails', label: 'Email Addresses' },
    { id: 'profile', label: 'Profile' },
    { id: 'notifications', label: 'Notifications' },
    { id: 'account', label: 'Account' },
  ]

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