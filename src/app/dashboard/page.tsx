import { Metadata } from 'next'
import TaxTracker from '@/components/dashboard/TaxTracker'

export const metadata: Metadata = {
  title: 'Tax Tracker Dashboard - Know How Much to Set Aside',
  description: 'View your tax collection summary and know exactly how much money to set aside from your sales.',
}

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
  return (
    <main className="min-h-screen bg-secondary-50 py-8">
      <TaxTracker 
        totalTaxToSetAside={sampleData.totalTaxToSetAside}
        totalSales={sampleData.totalSales}
        transactionCount={sampleData.transactionCount}
        recentTransactions={sampleData.recentTransactions}
        isConnected={sampleData.isConnected}
      />
    </main>
  )
}