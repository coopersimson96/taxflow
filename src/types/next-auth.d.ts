import { Role } from '@prisma/client'
import 'next-auth'

declare module 'next-auth' {
  interface Session {
    user: {
      id: string
      name?: string | null
      email?: string | null
      image?: string | null
      organizations: {
        id: string
        name: string
        slug: string
        role: Role
      }[]
      currentOrganization: {
        id: string
        name: string
        slug: string
        role: Role
      } | null
    }
  }

  interface User {
    id: string
    name?: string | null
    email?: string | null
    image?: string | null
  }
}

declare module 'next-auth/jwt' {
  interface JWT {
    id: string
    organizations?: {
      id: string
      name: string
      slug: string
      role: Role
    }[]
  }
}