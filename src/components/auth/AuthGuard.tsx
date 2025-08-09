'use client'

import { useAuth } from '@/hooks/useAuth'
import { Role } from '@prisma/client'
import { ReactNode } from 'react'
import { useRouter } from 'next/navigation'
import { useEffect } from 'react'

interface AuthGuardProps {
  children: ReactNode
  requireAuth?: boolean
  requiredRole?: Role
  organizationId?: string
  fallback?: ReactNode
  redirectTo?: string
}

export default function AuthGuard({
  children,
  requireAuth = true,
  requiredRole,
  organizationId,
  fallback,
  redirectTo,
}: AuthGuardProps) {
  const { session, isLoading, isAuthenticated } = useAuth()
  const router = useRouter()
  
  // Debug logging
  console.log('🔍 AuthGuard state:', { 
    isLoading, 
    isAuthenticated, 
    hasSession: !!session,
    sessionUser: session?.user?.email || 'none'
  })

  useEffect(() => {
    if (!isLoading && requireAuth && !isAuthenticated) {
      if (redirectTo) {
        router.push(redirectTo)
      } else {
        router.push('/auth/signin')
      }
    }
  }, [isLoading, isAuthenticated, requireAuth, redirectTo, router])

  // Show loading state
  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary-600"></div>
      </div>
    )
  }

  // Check authentication
  if (requireAuth && !isAuthenticated) {
    return fallback || (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <h2 className="text-xl font-semibold text-gray-900 mb-2">
            Authentication Required
          </h2>
          <p className="text-gray-600">Please sign in to access this page.</p>
        </div>
      </div>
    )
  }

  // Check role-based permissions
  if (requiredRole && session) {
    const org = organizationId
      ? session.user.organizations.find(o => o.id === organizationId)
      : session.user.currentOrganization

    if (!org) {
      return fallback || (
        <div className="min-h-screen flex items-center justify-center">
          <div className="text-center">
            <h2 className="text-xl font-semibold text-gray-900 mb-2">
              Organization Access Required
            </h2>
            <p className="text-gray-600">
              You need to be a member of an organization to access this page.
            </p>
          </div>
        </div>
      )
    }

    const roleHierarchy: Record<Role, number> = {
      VIEWER: 1,
      MEMBER: 2,
      ADMIN: 3,
      OWNER: 4,
    }

    if (roleHierarchy[org.role] < roleHierarchy[requiredRole]) {
      return fallback || (
        <div className="min-h-screen flex items-center justify-center">
          <div className="text-center">
            <h2 className="text-xl font-semibold text-gray-900 mb-2">
              Insufficient Permissions
            </h2>
            <p className="text-gray-600">
              You don't have the required permissions to access this page.
              Required role: {requiredRole}
            </p>
          </div>
        </div>
      )
    }
  }

  return <>{children}</>
}