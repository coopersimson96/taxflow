import { NextAuthOptions } from 'next-auth'
import GoogleProvider from 'next-auth/providers/google'
import { PrismaAdapter } from '@next-auth/prisma-adapter'
import { PrismaClient } from '@prisma/client'

// Create a dedicated Prisma client for NextAuth to ensure consistent connections
const authPrisma = new PrismaClient({
  log: ['error', 'warn'],
  datasources: {
    db: {
      url: process.env.DATABASE_URL
    }
  }
})

// Validate environment variables
const googleClientId = process.env.GOOGLE_CLIENT_ID
const googleClientSecret = process.env.GOOGLE_CLIENT_SECRET

if (!googleClientId || !googleClientSecret) {
  console.error('Missing Google OAuth environment variables')
  console.error('GOOGLE_CLIENT_ID:', googleClientId ? 'Set' : 'Missing')
  console.error('GOOGLE_CLIENT_SECRET:', googleClientSecret ? 'Set' : 'Missing')
}

export const authOptions: NextAuthOptions = {
  adapter: PrismaAdapter(authPrisma),
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
      if (session?.user) {
        session.user.id = user.id
        
        // Load user's organizations
        const userWithOrgs = await authPrisma.user.findUnique({
          where: { id: user.id },
          include: {
            organizations: {
              include: {
                organization: true
              }
            }
          }
        })
        
        if (userWithOrgs) {
          session.user.organizations = userWithOrgs.organizations.map(om => ({
            id: om.organization.id,
            name: om.organization.name,
            slug: om.organization.slug,
            role: om.role
          }))
          
          // Set current organization (first one for now)
          session.user.currentOrganization = session.user.organizations[0] || null
        }
      }
      return session
    },
  },
  debug: true, // Enable debug logging to see what's happening
}