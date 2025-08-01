'use client'

import { ReactNode } from 'react'
import { useAuth } from '@/hooks/useAuth'
import UserProfile from '@/components/auth/UserProfile'
import OrganizationSwitcher from '@/components/auth/OrganizationSwitcher'

interface DashboardLayoutProps {
  children: ReactNode
}

export default function DashboardLayout({ children }: DashboardLayoutProps) {
  const { user } = useAuth()

  return (
    <div className="min-h-screen bg-secondary-50">
      {/* Header */}
      <header className="bg-white border-b border-gray-200">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-16">
            {/* Left side - Logo and Organization Switcher */}
            <div className="flex items-center space-x-6">
              <div className="flex items-center space-x-2">
                <div className="w-8 h-8 bg-primary-600 rounded-lg flex items-center justify-center">
                  <span className="text-white font-bold text-sm">TA</span>
                </div>
                <h1 className="text-xl font-bold text-gray-900">Tax Analytics</h1>
              </div>
              <OrganizationSwitcher />
            </div>

            {/* Right side - User Profile */}
            <div className="flex items-center space-x-4">
              <UserProfile />
            </div>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="py-8">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          {user?.currentOrganization ? (
            children
          ) : (
            <div className="text-center py-12">
              <div className="mx-auto w-24 h-24 bg-gray-100 rounded-full flex items-center justify-center mb-6">
                <svg
                  className="w-12 h-12 text-gray-400"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-4m-5 0H9m11 0a2 2 0 01-2 2H7a2 2 0 01-2-2m2-16h2m2 0h4m-5 0a2 2 0 012-2h2a2 2 0 012 2m-5 0v3m5-3v3"
                  />
                </svg>
              </div>
              <h2 className="text-2xl font-bold text-gray-900 mb-2">
                Welcome to Tax Analytics!
              </h2>
              <p className="text-gray-600 mb-6">
                Your organization has been created and you're ready to start tracking taxes.
                <br />
                Connect your Shopify or Square accounts to begin importing transaction data.
              </p>
              <div className="space-y-3">
                <button className="inline-flex items-center px-4 py-2 bg-primary-600 text-white rounded-lg hover:bg-primary-700 transition-colors">
                  <svg className="w-5 h-5 mr-2" fill="currentColor" viewBox="0 0 24 24">
                    <path d="M12.04 2.15c.75 0 1.36.61 1.36 1.36v8.94c0 .75-.61 1.36-1.36 1.36s-1.36-.61-1.36-1.36V3.51c0-.75.61-1.36 1.36-1.36zM7.5 7.07c.53-.53 1.39-.53 1.92 0l6.32 6.32c.53.53.53 1.39 0 1.92-.53.53-1.39.53-1.92 0L7.5 8.99c-.53-.53-.53-1.39 0-1.92z"/>
                  </svg>
                  Connect Shopify
                </button>
                <button className="inline-flex items-center px-4 py-2 bg-black text-white rounded-lg hover:bg-gray-800 transition-colors ml-3">
                  <svg className="w-5 h-5 mr-2" fill="currentColor" viewBox="0 0 24 24">
                    <path d="M12 0C5.37 0 0 5.37 0 12s5.37 12 12 12 12-5.37 12-12S18.63 0 12 0zm0 22C6.48 22 2 17.52 2 12S6.48 2 12 2s10 4.48 10 10-4.48 10-10 10z"/>
                  </svg>
                  Connect Square
                </button>
              </div>
            </div>
          )}
        </div>
      </main>
    </div>
  )
}