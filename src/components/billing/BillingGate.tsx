import React, { useEffect, useState } from 'react'
import { useSearchParams } from 'next/navigation'
import { AlertTriangle, CreditCard, Clock, XCircle } from 'lucide-react'
import { cn } from '@/lib/utils'

interface BillingStatus {
  hasActiveBilling: boolean
  status: 'ACTIVE' | 'PENDING' | 'CANCELLED' | 'EXPIRED' | 'NOT_FOUND'
  requiresBilling: boolean
  plan?: {
    baseFee: number
    usageRate: number
    currency: string
  }
}

interface BillingGateProps {
  children: React.ReactNode
  shop?: string
  className?: string
}

export function BillingGate({ children, shop, className }: BillingGateProps) {
  const [billingStatus, setBillingStatus] = useState<BillingStatus | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const searchParams = useSearchParams()
  
  // Get shop from props or URL params
  const shopDomain = shop || searchParams.get('shop')

  useEffect(() => {
    if (!shopDomain) {
      setError('Shop parameter is required')
      setIsLoading(false)
      return
    }

    checkBillingStatus()
  }, [shopDomain])

  const checkBillingStatus = async () => {
    try {
      setIsLoading(true)
      setError(null)

      const response = await fetch(`/api/billing/status?shop=${shopDomain}`)
      
      if (!response.ok) {
        const errorData = await response.json()
        throw new Error(errorData.error || 'Failed to check billing status')
      }

      const data = await response.json()
      setBillingStatus(data.data)
    } catch (err) {
      console.error('Billing status check failed:', err)
      setError(err instanceof Error ? err.message : 'Unknown error')
    } finally {
      setIsLoading(false)
    }
  }

  const handleActivateBilling = () => {
    window.location.href = `/api/shopify/billing/create?shop=${shopDomain}`
  }

  if (isLoading) {
    return (
      <div className={cn("flex items-center justify-center min-h-screen bg-gray-50", className)}>
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-green-600 mx-auto mb-4"></div>
          <h2 className="text-xl font-semibold text-gray-900 mb-2">
            Checking Subscription Status
          </h2>
          <p className="text-gray-600">
            Please wait while we verify your billing information...
          </p>
        </div>
      </div>
    )
  }

  if (error) {
    return (
      <div className={cn("flex items-center justify-center min-h-screen bg-gray-50", className)}>
        <div className="text-center max-w-md">
          <XCircle className="w-16 h-16 text-red-500 mx-auto mb-4" />
          <h2 className="text-2xl font-bold text-gray-900 mb-4">
            Connection Error
          </h2>
          <p className="text-gray-600 mb-6">
            We couldn't verify your billing status. Please try again or contact support if the problem persists.
          </p>
          <div className="space-x-4">
            <button 
              onClick={checkBillingStatus}
              className="bg-green-600 text-white px-6 py-3 rounded-lg hover:bg-green-700 transition-colors"
            >
              Try Again
            </button>
            <button 
              onClick={() => window.location.href = '/support'}
              className="bg-gray-600 text-white px-6 py-3 rounded-lg hover:bg-gray-700 transition-colors"
            >
              Contact Support
            </button>
          </div>
        </div>
      </div>
    )
  }

  // If billing is active, render children
  if (billingStatus?.hasActiveBilling) {
    return <>{children}</>
  }

  // Render billing required screen based on status
  return (
    <div className={cn("flex items-center justify-center min-h-screen bg-gray-50", className)}>
      <div className="text-center max-w-lg mx-auto p-8">
        {renderBillingPrompt()}
      </div>
    </div>
  )

  function renderBillingPrompt() {
    const status = billingStatus?.status

    switch (status) {
      case 'PENDING':
        return (
          <>
            <Clock className="w-16 h-16 text-orange-500 mx-auto mb-4" />
            <h2 className="text-2xl font-bold text-gray-900 mb-4">
              Subscription Pending
            </h2>
            <p className="text-gray-600 mb-6">
              Your subscription is being processed. Please complete the billing setup to access TaxFlow.
            </p>
            <button 
              onClick={handleActivateBilling}
              className="bg-orange-600 text-white px-6 py-3 rounded-lg hover:bg-orange-700 transition-colors"
            >
              Complete Billing Setup
            </button>
          </>
        )

      case 'CANCELLED':
        return (
          <>
            <AlertTriangle className="w-16 h-16 text-red-500 mx-auto mb-4" />
            <h2 className="text-2xl font-bold text-gray-900 mb-4">
              Subscription Cancelled
            </h2>
            <p className="text-gray-600 mb-6">
              Your subscription has been cancelled. Reactivate your subscription to continue using TaxFlow.
            </p>
            <button 
              onClick={handleActivateBilling}
              className="bg-red-600 text-white px-6 py-3 rounded-lg hover:bg-red-700 transition-colors"
            >
              Reactivate Subscription
            </button>
          </>
        )

      case 'EXPIRED':
        return (
          <>
            <XCircle className="w-16 h-16 text-red-500 mx-auto mb-4" />
            <h2 className="text-2xl font-bold text-gray-900 mb-4">
              Subscription Expired
            </h2>
            <p className="text-gray-600 mb-6">
              Your subscription has expired due to a payment issue. Please update your billing to continue.
            </p>
            <button 
              onClick={handleActivateBilling}
              className="bg-red-600 text-white px-6 py-3 rounded-lg hover:bg-red-700 transition-colors"
            >
              Update Billing
            </button>
          </>
        )

      default:
        return (
          <>
            <CreditCard className="w-16 h-16 text-green-600 mx-auto mb-4" />
            <h2 className="text-2xl font-bold text-gray-900 mb-4">
              Subscription Required
            </h2>
            <div className="bg-white rounded-lg p-6 shadow-sm border mb-6">
              <h3 className="font-semibold text-lg mb-3">TaxFlow Pricing</h3>
              <div className="text-left space-y-2">
                <div className="flex justify-between">
                  <span>Base fee:</span>
                  <span className="font-semibold">$49/month</span>
                </div>
                <div className="flex justify-between">
                  <span>Usage fee:</span>
                  <span className="font-semibold">0.5% of sales volume</span>
                </div>
                <div className="border-t pt-2 mt-3">
                  <div className="text-sm text-gray-600">
                    Example: $100,000 in sales = $49 + $500 = $549/month
                  </div>
                </div>
              </div>
            </div>
            <p className="text-gray-600 mb-6">
              Start your subscription to access TaxFlow's automated tax tracking and reporting features.
            </p>
            <button 
              onClick={handleActivateBilling}
              className="bg-green-600 text-white px-8 py-4 rounded-lg hover:bg-green-700 transition-colors font-semibold text-lg"
            >
              Start Subscription
            </button>
          </>
        )
    }
  }
}

export default BillingGate