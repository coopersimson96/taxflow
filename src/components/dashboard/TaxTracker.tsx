interface TaxTransaction {
  id: string
  date: string
  amount: number
  taxAmount: number
  platform: 'shopify' | 'square'
}

interface TaxTrackerProps {
  totalTaxToSetAside: number
  totalSales: number
  transactionCount: number
  recentTransactions: TaxTransaction[]
  isConnected: boolean
}

const TaxTracker = ({ 
  totalTaxToSetAside, 
  totalSales, 
  transactionCount, 
  recentTransactions,
  isConnected 
}: TaxTrackerProps) => {
  return (
    <div className="max-w-4xl mx-auto p-6 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-secondary-900">Tax Tracker</h1>
        <div className="flex items-center space-x-2">
          <div className={`w-3 h-3 rounded-full ${isConnected ? 'bg-success-500' : 'bg-error-500'}`}></div>
          <span className="text-sm text-secondary-600">
            {isConnected ? 'Connected' : 'Disconnected'}
          </span>
        </div>
      </div>

      {/* Primary Set Aside Card */}
      <div className="bg-gradient-to-r from-primary-50 to-primary-100 rounded-xl p-8 border-2 border-primary-200 shadow-lg">
        <div className="text-center space-y-4">
          <div className="space-y-2">
            <div className="text-5xl font-bold text-primary-700">
              ${totalTaxToSetAside.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
            </div>
            <div className="text-xl font-semibold text-primary-600">
              Tax Money to Set Aside
            </div>
            <div className="text-sm text-primary-500">
              From your recent sales - keep this separate from your operating funds
            </div>
          </div>
          
          {/* Action Button */}
          <div className="pt-4">
            <button className="bg-primary-600 hover:bg-primary-700 text-white px-6 py-3 rounded-lg font-medium transition-colors duration-200">
              Transfer to Tax Savings
            </button>
          </div>
        </div>
      </div>

      {/* Secondary Stats */}
      <div className="grid md:grid-cols-3 gap-6">
        <div className="bg-white rounded-lg p-6 border border-secondary-200 shadow-sm">
          <div className="text-center">
            <div className="text-2xl font-bold text-secondary-800">
              ${totalSales.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
            </div>
            <div className="text-sm text-secondary-600 mt-1">Total Sales</div>
          </div>
        </div>
        
        <div className="bg-white rounded-lg p-6 border border-secondary-200 shadow-sm">
          <div className="text-center">
            <div className="text-2xl font-bold text-secondary-800">
              {transactionCount.toLocaleString()}
            </div>
            <div className="text-sm text-secondary-600 mt-1">Transactions</div>
          </div>
        </div>
        
        <div className="bg-white rounded-lg p-6 border border-secondary-200 shadow-sm">
          <div className="text-center">
            <div className="text-2xl font-bold text-secondary-800">
              {totalSales > 0 ? ((totalTaxToSetAside / totalSales) * 100).toFixed(1) : '0.0'}%
            </div>
            <div className="text-sm text-secondary-600 mt-1">Average Tax Rate</div>
          </div>
        </div>
      </div>

      {/* Recent Transactions */}
      <div className="bg-white rounded-lg p-6 border border-secondary-200 shadow-sm">
        <h2 className="text-lg font-semibold text-secondary-900 mb-4">Recent Sales</h2>
        
        {recentTransactions.length > 0 ? (
          <div className="space-y-3">
            {recentTransactions.map((transaction) => (
              <div key={transaction.id} className="flex items-center justify-between py-3 border-b border-secondary-100 last:border-b-0">
                <div className="flex items-center space-x-4">
                  <div className="flex items-center space-x-2">
                    <div className={`w-2 h-2 rounded-full ${transaction.platform === 'shopify' ? 'bg-green-500' : 'bg-blue-500'}`}></div>
                    <span className="text-sm font-medium text-secondary-700 capitalize">
                      {transaction.platform}
                    </span>
                  </div>
                  <div className="text-sm text-secondary-600">
                    Sale #{transaction.id}
                  </div>
                  <div className="text-sm text-secondary-500">
                    {new Date(transaction.date).toLocaleDateString()}
                  </div>
                </div>
                
                <div className="text-right">
                  <div className="text-sm font-semibold text-secondary-700">
                    +${transaction.taxAmount.toFixed(2)} tax
                  </div>
                  <div className="text-xs text-secondary-500">
                    ${transaction.amount.toFixed(2)} total
                  </div>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className="text-center py-8 text-secondary-500">
            <p>No transactions yet. Connect your store to start tracking tax.</p>
          </div>
        )}
      </div>

      {/* Integration Status */}
      <div className="bg-secondary-50 rounded-lg p-6">
        <h2 className="text-lg font-semibold text-secondary-900 mb-4">Platform Connections</h2>
        
        <div className="grid md:grid-cols-2 gap-4">
          <div className="flex items-center justify-between p-4 bg-white rounded-lg border border-secondary-200">
            <div className="flex items-center space-x-3">
              <div className="w-10 h-10 bg-green-100 rounded-lg flex items-center justify-center">
                <span className="text-green-600 font-bold">S</span>
              </div>
              <div>
                <div className="font-medium text-secondary-800">Shopify</div>
                <div className="text-sm text-secondary-600">E-commerce platform</div>
              </div>
            </div>
            <button className="text-primary-600 hover:text-primary-700 font-medium text-sm">
              Connect
            </button>
          </div>
          
          <div className="flex items-center justify-between p-4 bg-white rounded-lg border border-secondary-200">
            <div className="flex items-center space-x-3">
              <div className="w-10 h-10 bg-blue-100 rounded-lg flex items-center justify-center">
                <div className="w-6 h-6 bg-blue-600 rounded"></div>
              </div>
              <div>
                <div className="font-medium text-secondary-800">Square</div>
                <div className="text-sm text-secondary-600">Point of sale</div>
              </div>
            </div>
            <button className="text-primary-600 hover:text-primary-700 font-medium text-sm">
              Connect
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}

export default TaxTracker