'use client'

import TaxTracker from '@/components/dashboard/TaxTracker'
import AuthGuard from '@/components/auth/AuthGuard'
import DashboardLayout from '@/components/dashboard/DashboardLayout'
import { ConnectionStatus } from '@/components/shopify/ConnectionStatus'
import { useRouter } from 'next/navigation'

// Sample data - in a real app this would come from your API
const sampleData = {
  totalTaxToSetAside: 4892.73,
  totalSales: 67234.50,
  transactionCount: 234,
  isConnected: true,
  recentTransactions: [
    {
      id: '1234',
      date: '2024-01-15',
      amount: 299.99,
      taxAmount: 24.80,
      platform: 'shopify' as const
    },
    {
      id: '1233',
      date: '2024-01-15',
      amount: 149.95,
      taxAmount: 18.65,
      platform: 'square' as const
    },
    {
      id: '1232',
      date: '2024-01-14',
      amount: 399.00,
      taxAmount: 31.20,
      platform: 'shopify' as const
    },
    {
      id: '1231',
      date: '2024-01-14',
      amount: 89.99,
      taxAmount: 7.20,
      platform: 'square' as const
    },
    {
      id: '1230',
      date: '2024-01-13',
      amount: 199.99,
      taxAmount: 16.00,
      platform: 'shopify' as const
    }
  ]
}

export default function DashboardPage() {
  const router = useRouter()
  
  const handleConnect = () => {
    console.log('Connect button clicked - navigating to /connect')
    try {
      router.push('/connect')
    } catch (error) {
      console.error('Navigation error:', error)
    }
  }

  return (
    <AuthGuard>
      <DashboardLayout>
        <div className="space-y-6">
          {/* Debug: Test deployment */}
          <div className="p-4 bg-red-100 border border-red-300 rounded-lg">
            <p className="text-sm text-red-800 mb-2">🚨 DEBUG: Deployment Test - Commit 315dc98</p>
            <p className="text-xs text-red-600">If you see this, the deployment is working</p>
            <button 
              onClick={() => {
                console.log('Debug button clicked')
                alert('Debug button works!')
                handleConnect()
              }}
              className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700 mt-2"
            >
              Debug: Connect Shopify
            </button>
          </div>
          
          <ConnectionStatus onConnect={handleConnect} />
          <TaxTracker 
            totalTaxToSetAside={sampleData.totalTaxToSetAside}
            totalSales={sampleData.totalSales}
            transactionCount={sampleData.transactionCount}
            recentTransactions={sampleData.recentTransactions}
            isConnected={sampleData.isConnected}
          />
        </div>
      </DashboardLayout>
    </AuthGuard>
  )
}