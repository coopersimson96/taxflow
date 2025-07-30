import { Session } from 'next-auth'
import { Role } from '@prisma/client'

export interface OrganizationMembership {
  id: string
  name: string
  slug: string
  role: Role
}

export interface ExtendedUser {
  id: string
  name?: string | null
  email?: string | null
  image?: string | null
  organizations: OrganizationMembership[]
  currentOrganization: OrganizationMembership | null
}

export interface ExtendedSession extends Omit<Session, 'user'> {
  user: ExtendedUser
}

export function hasRole(
  session: ExtendedSession | null,
  requiredRole: Role,
  organizationId?: string
): boolean {
  if (!session?.user) return false

  const org = organizationId
    ? session.user.organizations.find(o => o.id === organizationId)
    : session.user.currentOrganization

  if (!org) return false

  const roleHierarchy: Record<Role, number> = {
    VIEWER: 1,
    MEMBER: 2,
    ADMIN: 3,
    OWNER: 4,
  }

  return roleHierarchy[org.role] >= roleHierarchy[requiredRole]
}

export function isOwner(
  session: ExtendedSession | null,
  organizationId?: string
): boolean {
  return hasRole(session, 'OWNER', organizationId)
}

export function isAdmin(
  session: ExtendedSession | null,
  organizationId?: string
): boolean {
  return hasRole(session, 'ADMIN', organizationId)
}

export function canManageOrganization(
  session: ExtendedSession | null,
  organizationId?: string
): boolean {
  return hasRole(session, 'ADMIN', organizationId)
}

export function canViewOrganization(
  session: ExtendedSession | null,
  organizationId?: string
): boolean {
  return hasRole(session, 'VIEWER', organizationId)
}

export function getUserOrganizationRole(
  session: ExtendedSession | null,
  organizationId: string
): Role | null {
  if (!session?.user) return null

  const org = session.user.organizations.find(o => o.id === organizationId)
  return org?.role || null
}

export function getCurrentOrganization(
  session: ExtendedSession | null
): OrganizationMembership | null {
  return session?.user?.currentOrganization || null
}

export function getUserOrganizations(
  session: ExtendedSession | null
): OrganizationMembership[] {
  return session?.user?.organizations || []
}