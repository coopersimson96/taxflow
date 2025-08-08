'use client'

export default function TestDashboard() {
  return (
    <div className="min-h-screen bg-gray-50 p-8">
      <div className="max-w-4xl mx-auto">
        <h1 className="text-4xl font-bold text-center mb-8">🎯 Tax Analytics Dashboard</h1>
        
        <div className="bg-gradient-to-r from-blue-500 to-green-500 text-white rounded-xl p-8 mb-8 text-center">
          <h2 className="text-2xl font-bold mb-2">Tax Money to Set Aside</h2>
          <p className="text-4xl font-bold">$123.45</p>
          <p className="text-sm opacity-90 mt-2">From your recent Shopify sales</p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
          <div className="bg-white p-6 rounded-lg shadow">
            <h3 className="font-semibold text-gray-700">Total Sales</h3>
            <p className="text-2xl font-bold text-blue-600">$1,234.56</p>
          </div>
          <div className="bg-white p-6 rounded-lg shadow">
            <h3 className="font-semibold text-gray-700">Tax Collected</h3>
            <p className="text-2xl font-bold text-green-600">$123.45</p>
          </div>
          <div className="bg-white p-6 rounded-lg shadow">
            <h3 className="font-semibold text-gray-700">Total Orders</h3>
            <p className="text-2xl font-bold text-purple-600">15</p>
          </div>
        </div>

        <div className="bg-white p-6 rounded-lg shadow">
          <h3 className="text-xl font-bold mb-4">Tax Breakdown</h3>
          <div className="space-y-2">
            <div className="flex justify-between">
              <span>GST (5%):</span>
              <span className="font-semibold">$97.20</span>
            </div>
            <div className="flex justify-between">
              <span>PST (7%):</span>
              <span className="font-semibold">$136.06</span>
            </div>
            <div className="flex justify-between">
              <span>State Tax:</span>
              <span className="font-semibold">$8.25</span>
            </div>
          </div>
        </div>

        <div className="mt-8 text-center text-gray-500">
          <p>✅ This is a working test version of the tax dashboard!</p>
          <p>The real dashboard uses your actual Shopify data.</p>
        </div>
      </div>
    </div>
  )
}