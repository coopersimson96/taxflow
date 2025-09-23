import { NextAuthOptions } from 'next-auth'
import GoogleProvider from 'next-auth/providers/google'
import { PrismaAdapter } from '@next-auth/prisma-adapter'
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
        token.name = user.name
        token.email = user.email
        token.image = user.image
      }
      return token
    },
    async session({ session, token }) {
      if (token.id) {
        session.user = {
          id: token.id as string,
          name: token.name,
          email: token.email,
          image: token.image,
          organizations: [],
          currentOrganization: null,
        }
      }
      return session
    },
  },
}