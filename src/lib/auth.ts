import { NextAuthOptions } from 'next-auth'
import GoogleProvider from 'next-auth/providers/google'
// import { PrismaAdapter } from '@next-auth/prisma-adapter'
import { prisma } from './prisma'
import { UserService } from './services/user-service'

// Validate environment variables
const googleClientId = process.env.GOOGLE_CLIENT_ID
const googleClientSecret = process.env.GOOGLE_CLIENT_SECRET

if (!googleClientId || !googleClientSecret) {
  console.error('Missing Google OAuth environment variables')
  console.error('GOOGLE_CLIENT_ID:', googleClientId ? 'Set' : 'Missing')
  console.error('GOOGLE_CLIENT_SECRET:', googleClientSecret ? 'Set' : 'Missing')
}

export const authOptions: NextAuthOptions = {
  // adapter: PrismaAdapter(prisma), // Temporarily disabled for hybrid approach
  providers: googleClientId && googleClientSecret ? [
    GoogleProvider({
      clientId: googleClientId,
      clientSecret: googleClientSecret,
    }),
  ] : [],
  pages: {
    signIn: '/auth/signin',
    error: '/auth/error',
  },
  session: {
    strategy: 'jwt',
    maxAge: 30 * 24 * 60 * 60, // 30 days
  },
  callbacks: {
    async jwt({ token, user, account }) {
      if (user) {
        token.id = user.id
      }
      return token
    },
    async session({ session, token }) {
      if (token) {
        session.user.id = token.id as string
      }
      return session
    },
    async signIn({ user, account, profile }) {
      try {
        // Automatically sync user to database when they sign in
        if (user.email) {
          console.log('🔄 Auto-syncing user to database:', user.email)
          await UserService.upsertUserFromOAuth({
            email: user.email,
            name: user.name || undefined,
            avatar: user.image || undefined,
            googleId: account?.providerAccountId || undefined,
          })
          console.log('✅ User sync completed for:', user.email)
        }
        return true
      } catch (error) {
        console.error('❌ User sync failed during sign in:', error)
        // Don't block sign in even if sync fails
        return true
      }
    },
  },
}