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
    router.push('/connect')
  }

  return (
    <AuthGuard>
      <DashboardLayout>
        <div className="space-y-6">
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