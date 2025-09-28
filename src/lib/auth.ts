import { NextAuthOptions } from 'next-auth'
import GoogleProvider from 'next-auth/providers/google'
import { PrismaAdapter } from '@next-auth/prisma-adapter'
import { PrismaClient } from '@prisma/client'

// Import the main Prisma client to ensure consistency
import { prisma } from './prisma'

// Validate environment variables
const googleClientId = process.env.GOOGLE_CLIENT_ID
const googleClientSecret = process.env.GOOGLE_CLIENT_SECRET

if (!googleClientId || !googleClientSecret) {
  console.error('Missing Google OAuth environment variables')
  console.error('GOOGLE_CLIENT_ID:', googleClientId ? 'Set' : 'Missing')
  console.error('GOOGLE_CLIENT_SECRET:', googleClientSecret ? 'Set' : 'Missing')
}

export const authOptions: NextAuthOptions = {
  adapter: PrismaAdapter(prisma),
  providers: googleClientId && googleClientSecret ? [
    GoogleProvider({
      clientId: googleClientId,
      clientSecret: googleClientSecret,
      allowDangerousEmailAccountLinking: true,
    }),
  ] : [],
  pages: {
    signIn: '/auth/signin',
    error: '/auth/error',
  },
  session: {
    strategy: 'database',
    maxAge: 30 * 24 * 60 * 60, // 30 days
  },
  callbacks: {
    async session({ session, user }) {
      try {
        if (session?.user) {
          session.user.id = user.id
          
          // Initialize empty arrays to prevent undefined errors
          session.user.organizations = []
          session.user.currentOrganization = null
          
          // Try to load user's organizations - but don't fail if this fails
          try {
            const userWithOrgs = await prisma.user.findUnique({
              where: { id: user.id },
              include: {
                organizations: {
                  include: {
                    organization: true
                  }
                }
              }
            })
            
            if (userWithOrgs?.organizations) {
              session.user.organizations = userWithOrgs.organizations.map(om => ({
                id: om.organization.id,
                name: om.organization.name,
                slug: om.organization.slug,
                role: om.role
              }))
              
              // Set current organization (first one for now)
              session.user.currentOrganization = session.user.organizations[0] || null
            }
          } catch (orgError) {
            console.error('[auth] Failed to load organizations:', orgError)
            // Continue with empty organizations - don't break the session
          }
        }
        
        console.log('[auth] Session callback completed for user:', user.id)
        return session
      } catch (error) {
        console.error('[auth] Session callback error:', error)
        // Return the basic session even if organization loading fails
        if (session?.user) {
          session.user.id = user.id
          session.user.organizations = []
          session.user.currentOrganization = null
        }
        return session
      }
    },
  },
  debug: true,
  logger: {
    error(code, metadata) {
      console.error('[next-auth][error]', code, metadata)
    },
    warn(code) {
      console.warn('[next-auth][warn]', code)
    },
    debug(code, metadata) {
      console.log('[next-auth][debug]', code, metadata)
    }
  },
}