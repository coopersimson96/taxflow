'use client'

import { useSession } from 'next-auth/react'
import { Role } from '@prisma/client'
import {
  ExtendedSession,
  OrganizationMembership,
  hasRole,
  isOwner,
  isAdmin,
  canManageOrganization,
  canViewOrganization,
  getUserOrganizationRole,
  getCurrentOrganization,
  getUserOrganizations,
} from '@/lib/auth-utils'

export function useAuth() {
  const { data: session, status } = useSession()

  return {
    session: session as ExtendedSession | null,
    user: session?.user || null,
    status,
    isLoading: status === 'loading',
    isAuthenticated: status === 'authenticated',
    isUnauthenticated: status === 'unauthenticated',
  }
}

export function useCurrentOrganization(): OrganizationMembership | null {
  const { session } = useAuth()
  return getCurrentOrganization(session)
}

export function useUserOrganizations(): OrganizationMembership[] {
  const { session } = useAuth()
  return getUserOrganizations(session)
}

export function useOrganizationRole(organizationId?: string): Role | null {
  const { session } = useAuth()
  
  if (!organizationId) {
    return getCurrentOrganization(session)?.role || null
  }
  
  return getUserOrganizationRole(session, organizationId)
}

export function usePermissions(organizationId?: string) {
  const { session } = useAuth()

  return {
    hasRole: (role: Role) => hasRole(session, role, organizationId),
    isOwner: () => isOwner(session, organizationId),
    isAdmin: () => isAdmin(session, organizationId),
    canManage: () => canManageOrganization(session, organizationId),
    canView: () => canViewOrganization(session, organizationId),
    role: organizationId ? getUserOrganizationRole(session, organizationId) : null,
  }
}

export function useRequireAuth() {
  const { session, status, isLoading } = useAuth()

  if (isLoading) {
    return { session: null, isLoading: true }
  }

  if (!session) {
    throw new Error('Authentication required')
  }

  return { session, isLoading: false }
}