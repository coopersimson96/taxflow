import { withWebhookDb } from '@/lib/prisma'

export class IntegrationService {
  /**
   * Find a user's Shopify integration across all their organizations
   * Handles multiple orgs and different integration statuses
   */
  static async findUserShopifyIntegration(userEmail: string) {
    try {
      const integration = await withWebhookDb(async (db) => {
        return await db.integration.findFirst({
          where: {
            type: 'SHOPIFY',
            status: { in: ['CONNECTED', 'PENDING_USER_LINK'] },
            organization: {
              members: {
                some: {
                  user: { email: userEmail }
                }
              }
            }
          },
          include: {
            organization: {
              include: {
                members: {
                  where: {
                    user: { email: userEmail }
                  },
                  include: {
                    user: true
                  }
                }
              }
            }
          }
        })
      })

      return integration
    } catch (error) {
      console.error('Error finding user Shopify integration:', error)
      return null
    }
  }

  /**
   * Get user's integration with detailed organization context
   * Returns null if no integration found, with detailed logging
   */
  static async getUserIntegrationWithContext(userEmail: string) {
    try {
      // First, verify user exists
      const user = await withWebhookDb(async (db) => {
        return await db.user.findUnique({
          where: { email: userEmail },
          include: {
            organizations: {
              include: {
                organization: {
                  include: {
                    integrations: {
                      where: { type: 'SHOPIFY' }
                    }
                  }
                }
              }
            }
          }
        })
      })

      if (!user) {
        console.log('❌ User not found:', userEmail)
        return { 
          integration: null, 
          debugInfo: { error: 'User not found', userEmail } 
        }
      }

      if (!user.organizations || user.organizations.length === 0) {
        console.log('❌ User has no organizations:', userEmail)
        return { 
          integration: null, 
          debugInfo: { 
            error: 'User has no organizations', 
            userEmail,
            userId: user.id,
            needsOrganization: true
          } 
        }
      }

      // Find Shopify integration across all user's organizations
      const allIntegrations = user.organizations.flatMap(
        membership => membership.organization.integrations
      )

      const shopifyIntegration = allIntegrations.find(
        integration => integration.type === 'SHOPIFY'
      )

      if (!shopifyIntegration) {
        console.log('❌ No Shopify integration found:', {
          userEmail,
          organizationCount: user.organizations.length,
          totalIntegrations: allIntegrations.length
        })
        return { 
          integration: null, 
          debugInfo: { 
            error: 'No Shopify integration found',
            userEmail,
            organizationCount: user.organizations.length,
            integrations: allIntegrations.map(i => ({ type: i.type, status: i.status })),
            needsShopifyConnection: true
          } 
        }
      }

      console.log('✅ Found Shopify integration:', {
        integrationId: shopifyIntegration.id,
        status: shopifyIntegration.status,
        organizationId: shopifyIntegration.organizationId
      })

      return { 
        integration: shopifyIntegration, 
        debugInfo: { 
          success: true,
          integrationId: shopifyIntegration.id,
          status: shopifyIntegration.status
        } 
      }

    } catch (error) {
      console.error('Error in getUserIntegrationWithContext:', error)
      return { 
        integration: null, 
        debugInfo: { 
          error: 'Database query failed', 
          details: error instanceof Error ? error.message : 'Unknown error' 
        } 
      }
    }
  }

  /**
   * Ensure user has a default organization
   * Creates one if missing - critical for new user flow
   */
  static async ensureUserOrganization(userId: string, userName?: string, userEmail?: string) {
    try {
      const membershipCount = await withWebhookDb(async (db) => {
        return await db.organizationMember.count({
          where: { userId }
        })
      })

      if (membershipCount === 0) {
        console.log('🔧 Creating default organization for user:', userId)
        
        const organization = await withWebhookDb(async (db) => {
          return await db.organization.create({
            data: {
              name: `${userName || userEmail || 'User'}'s Organization`,
              members: {
                create: {
                  userId,
                  role: 'ADMIN'
                }
              }
            }
          })
        })

        console.log('✅ Created organization:', organization.id)
        return organization
      }

      return null
    } catch (error) {
      console.error('Error ensuring user organization:', error)
      throw error
    }
  }
}