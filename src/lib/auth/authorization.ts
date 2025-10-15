import { prisma } from '@/lib/prisma'

/**
 * Authorization utilities for verifying user permissions
 *
 * SECURITY: These functions ensure users can only access resources they own
 */

export interface UserOrganization {
  userId: string
  organizationId: string
  role: string
}

/**
 * SECURITY: Verify user has access to organization
 * Prevents cross-tenant attacks where User A tries to access User B's data
 */
export async function verifyUserOwnsOrganization(
  userEmail: string,
  organizationId: string
): Promise<boolean> {
  const membership = await prisma.organizationMember.findFirst({
    where: {
      organizationId,
      user: {
        email: userEmail
      }
    }
  })

  return membership !== null
}

/**
 * SECURITY: Verify user has access to shop
 * Checks that the shop belongs to an organization the user is a member of
 */
export async function verifyUserOwnsShop(
  userEmail: string,
  shop: string
): Promise<{ authorized: boolean; organizationId?: string }> {
  const integration = await prisma.integration.findFirst({
    where: {
      type: 'SHOPIFY',
      status: 'CONNECTED',
      config: {
        path: ['shop'],
        equals: shop
      }
    },
    select: {
      organizationId: true,
      organization: {
        select: {
          members: {
            where: {
              user: {
                email: userEmail
              }
            },
            select: {
              userId: true
            }
          }
        }
      }
    }
  })

  if (!integration) {
    return { authorized: false }
  }

  const isMember = integration.organization.members.length > 0

  return {
    authorized: isMember,
    organizationId: isMember ? integration.organizationId : undefined
  }
}

/**
 * Get all organizations a user belongs to
 */
export async function getUserOrganizations(userEmail: string): Promise<string[]> {
  const user = await prisma.user.findUnique({
    where: { email: userEmail },
    select: {
      organizations: {
        select: {
          organizationId: true
        }
      }
    }
  })

  return user?.organizations.map(org => org.organizationId) || []
}
