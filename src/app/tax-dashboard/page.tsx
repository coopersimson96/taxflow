'use client'

import TaxAnalyticsDashboard from '@/components/analytics/TaxAnalyticsDashboard'

export default function TaxDashboardPage() {
  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-7xl mx-auto py-6 px-4 sm:px-6 lg:px-8">
        <div className="mb-6">
          <h1 className="text-3xl font-bold text-gray-900">Tax Analytics Dashboard</h1>
          <p className="mt-2 text-gray-600">Monitor your Shopify tax obligations and set aside the right amount</p>
        </div>
        
        <TaxAnalyticsDashboard 
          organizationId="demo-org-1"
          className="pb-8"
        />
      </div>
    </div>
  )
}