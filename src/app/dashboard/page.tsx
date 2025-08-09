'use client'

import { useEffect, Component, ReactNode } from 'react'
import { useSession } from 'next-auth/react'
import AuthGuard from '@/components/auth/AuthGuard'
import DashboardLayout from '@/components/dashboard/DashboardLayout'
import TaxAnalyticsDashboard from '@/components/analytics/TaxAnalyticsDashboard'

// Simple Error Boundary
class ErrorBoundary extends Component<{children: ReactNode}, {hasError: boolean, error?: Error}> {
  constructor(props: {children: ReactNode}) {
    super(props)
    this.state = { hasError: false }
  }

  static getDerivedStateFromError(error: Error) {
    return { hasError: true, error }
  }

  componentDidCatch(error: Error, errorInfo: any) {
    console.error('Dashboard Error:', error, errorInfo)
  }

  render() {
    if (this.state.hasError) {
      return (
        <div className="p-4 bg-red-50 border border-red-200 rounded">
          <h3 className="text-red-800 font-semibold">Dashboard Error</h3>
          <p className="text-red-600">Something went wrong loading the tax analytics dashboard.</p>
          <p className="text-sm text-gray-600 mt-2">{this.state.error?.message}</p>
        </div>
      )
    }

    return this.props.children
  }
}


export default function DashboardPage() {
  const { data: session, status } = useSession()
  
  // Debug logging - simplified
  useEffect(() => {
    console.log('🎯 Dashboard mounted:', {
      sessionStatus: status,
      sessionEmail: session?.user?.email,
      timestamp: new Date().toISOString()
    })
  }, [status, session])
  
  // Render immediately once authenticated - no complex org loading
  if (status === 'loading') {
    return (
      <AuthGuard>
        <DashboardLayout>
          <div className="flex items-center justify-center min-h-96">
            <div className="text-center">
              <div className="animate-spin w-8 h-8 border-4 border-blue-500 border-t-transparent rounded-full mx-auto mb-4"></div>
              <p className="text-gray-600">Loading...</p>
            </div>
          </div>
        </DashboardLayout>
      </AuthGuard>
    )
  }

  return (
    <AuthGuard>
      <DashboardLayout>
        <ErrorBoundary>
          <TaxAnalyticsDashboard 
            organizationId="" // Empty string triggers auto-detection in API
          />
        </ErrorBoundary>
      </DashboardLayout>
    </AuthGuard>
  )
}