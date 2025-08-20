import { withWebhookDb } from '@/lib/prisma'

export class IntegrationService {
  /**
   * Find a user's Shopify integration across all their organizations
   * Handles multiple orgs and different integration statuses
   */
  static async findUserShopifyIntegration(userEmail: string) {
    try {
      console.log('🔍 Finding Shopify integration for user:', userEmail)
      
      const integration = await withWebhookDb(async (db) => {
        // First, let's see all integrations for this user
        const allIntegrations = await db.integration.findMany({
          where: {
            type: 'SHOPIFY',
            organization: {
              members: {
                some: {
                  user: { email: userEmail }
                }
              }
            }
          },
          include: {
            organization: true
          }
        })

        console.log(`📋 Found ${allIntegrations.length} Shopify integrations for user`)
        allIntegrations.forEach((int, index) => {
          console.log(`  ${index + 1}. ${int.name} (${int.status}) in org ${int.organization.name}`)
        })

        // Return the first one (or could add logic to pick the best one)
        return allIntegrations[0] || null
      })

      if (integration) {
        console.log('✅ Selected integration:', {
          id: integration.id,
          status: integration.status,
          name: integration.name,
          organizationId: integration.organizationId
        })
      } else {
        console.log('❌ No Shopify integration found for user:', userEmail)
      }

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
        
        // Generate unique slug from user info
        const baseSlug = (userName || userEmail || 'user')
          .toLowerCase()
          .replace(/[^a-z0-9]+/g, '-')
          .replace(/^-|-$/g, '')
        
        // Add timestamp to ensure uniqueness
        const uniqueSlug = `${baseSlug}-${Date.now()}`

        const organization = await withWebhookDb(async (db) => {
          return await db.organization.create({
            data: {
              name: `${userName || userEmail || 'User'}'s Organization`,
              slug: uniqueSlug,
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