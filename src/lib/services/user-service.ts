import { prisma } from '../prisma'
import { IntegrationService } from './integration-service'

export interface CreateUserData {
  email: string
  name?: string | null
  avatar?: string | null
  googleId?: string
}

export interface UpdateUserData {
  name?: string | null
  avatar?: string | null
  lastLoginAt?: Date
}

export class UserService {
  /**
   * Create or update user from OAuth sign-in
   */
  static async upsertUserFromOAuth(data: CreateUserData) {
    try {
      const user = await prisma.user.upsert({
        where: { email: data.email },
        update: {
          name: data.name,
          avatar: data.avatar,
          updatedAt: new Date(),
        },
        create: {
          email: data.email,
          name: data.name,
          avatar: data.avatar,
        },
      })

      // CRITICAL FIX: Ensure user has an organization
      await IntegrationService.ensureUserOrganization(user.id, user.name || undefined, user.email)

      console.log('✅ User synced to database with organization:', user.email)
      return user
    } catch (error) {
      console.error('❌ Error syncing user to database:', error)
      throw error
    }
  }

  /**
   * Get user by email
   */
  static async getUserByEmail(email: string) {
    try {
      return await prisma.user.findUnique({
        where: { email },
        include: {
          organizations: {
            include: {
              organization: true,
            },
          },
        },
      })
    } catch (error) {
      console.error('Error fetching user by email:', error)
      return null
    }
  }

  /**
   * Get user by ID
   */
  static async getUserById(id: string) {
    try {
      return await prisma.user.findUnique({
        where: { id },
        include: {
          organizations: {
            include: {
              organization: true,
            },
          },
        },
      })
    } catch (error) {
      console.error('Error fetching user by ID:', error)
      return null
    }
  }

  /**
   * Update user profile
   */
  static async updateUser(id: string, data: UpdateUserData) {
    try {
      return await prisma.user.update({
        where: { id },
        data: {
          ...data,
          updatedAt: new Date(),
        },
      })
    } catch (error) {
      console.error('Error updating user:', error)
      throw error
    }
  }

  /**
   * Create organization for new user
   */
  static async createUserOrganization(userId: string, userName?: string | null, userEmail?: string) {
    try {
      const organizationName = userName 
        ? `${userName}'s Tax Tracker`
        : `${userEmail?.split('@')[0]}'s Tax Tracker`
      
      const slug = organizationName
        .toLowerCase()
        .replace(/[^a-z0-9]+/g, '-')
        .replace(/-+/g, '-')
        .replace(/^-|-$/g, '')
      
      // Ensure slug is unique
      let uniqueSlug = slug
      let counter = 1
      while (await prisma.organization.findUnique({ where: { slug: uniqueSlug } })) {
        uniqueSlug = `${slug}-${counter}`
        counter++
      }
      
      const organization = await prisma.organization.create({
        data: {
          name: organizationName,
          slug: uniqueSlug,
          description: `Tax tracking organization for ${userName || userEmail}`,
        },
      })
      
      // Add user as owner
      await prisma.organizationMember.create({
        data: {
          userId,
          organizationId: organization.id,
          role: 'OWNER',
        },
      })
      
      console.log('✅ Organization created for user:', organizationName)
      return organization
    } catch (error) {
      console.error('❌ Error creating organization:', error)
      throw error
    }
  }

  /**
   * Test database connection
   */
  static async testConnection() {
    try {
      await prisma.$queryRaw`SELECT 1 as test`
      console.log('✅ Database connection test successful')
      return true
    } catch (error) {
      console.error('❌ Database connection test failed:', error)
      return false
    }
  }
}