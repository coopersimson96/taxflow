import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { NextRequest } from 'next/server'

/**
 * Unified session management utilities
 * 
 * This ensures consistent session access across:
 * - API routes
 * - Server components  
 * - Middleware (where applicable)
 */

export interface SessionUser {
  id: string
  email: string
  name?: string | null
  image?: string | null
  organizations: Array<{
    id: string
    name: string
    slug: string
    role: string
  }>
  currentOrganization: {
    id: string
    name: string
    slug: string
    role: string
  } | null
}

export interface ExtendedSession {
  user: SessionUser
  expires: string
}

/**
 * Get session consistently across the app
 * Use this instead of getServerSession directly
 */
export async function getUnifiedSession(): Promise<ExtendedSession | null> {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user?.email) {
      return null
    }
    
    return session as ExtendedSession
  } catch (error) {
    console.error('Session access error:', error)
    return null
  }
}

/**
 * Require authentication for API routes
 * Returns session or throws with appropriate error response
 */
export async function requireAuth(): Promise<ExtendedSession> {
  const session = await getUnifiedSession()
  
  if (!session) {
    throw new Error('UNAUTHORIZED')
  }
  
  return session
}

/**
 * Check if user has specific role in organization
 */
export function hasRole(session: ExtendedSession, requiredRole: string, organizationId?: string): boolean {
  const targetOrg = organizationId 
    ? session.user.organizations.find(org => org.id === organizationId)
    : session.user.currentOrganization
    
  if (!targetOrg) return false
  
  const roleHierarchy: Record<string, number> = {
    VIEWER: 1,
    MEMBER: 2,
    ADMIN: 3,
    OWNER: 4,
  }
  
  return (roleHierarchy[targetOrg.role] || 0) >= (roleHierarchy[requiredRole] || 0)
}

/**
 * Session debugging utility
 */
export async function debugSessionAccess(): Promise<{
  sessionExists: boolean
  method: string
  email?: string
  userId?: string
  timestamp: string
}> {
  const timestamp = new Date().toISOString()
  
  try {
    const session = await getUnifiedSession()
    
    return {
      sessionExists: !!session,
      method: 'getUnifiedSession',
      email: session?.user?.email,
      userId: session?.user?.id,
      timestamp
    }
  } catch (error) {
    return {
      sessionExists: false,
      method: 'getUnifiedSession (error)',
      timestamp
    }
  }
}