import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth/next'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { z } from 'zod'

// GET /api/user/emails - Get all linked emails for the current user
export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user?.email) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Get user with linked emails
    const user = await prisma.user.findUnique({
      where: { email: session.user.email },
      include: {
        linkedEmails: {
          orderBy: [
            { isPrimary: 'desc' },
            { createdAt: 'asc' }
          ]
        }
      }
    })

    if (!user) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 })
    }

    return NextResponse.json({
      emails: user.linkedEmails,
      primaryEmail: user.email
    })
  } catch (error) {
    console.error('Error fetching user emails:', error)
    return NextResponse.json(
      { error: 'Failed to fetch emails' },
      { status: 500 }
    )
  }
}

// POST /api/user/emails - Add a new linked email
const addEmailSchema = z.object({
  email: z.string().email(),
})

export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user?.email) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const body = await request.json()
    const { email } = addEmailSchema.parse(body)

    // Check if email is already in use (also check if it's the user's primary email)
    if (email.toLowerCase() === session.user.email.toLowerCase()) {
      return NextResponse.json(
        { error: 'This is already your primary email' },
        { status: 400 }
      )
    }

    const existingEmail = await prisma.userEmail.findUnique({
      where: { email }
    })

    if (existingEmail) {
      return NextResponse.json(
        { error: 'Email already linked to another account' },
        { status: 400 }
      )
    }

    // Get user - handle case sensitivity
    let user = await prisma.user.findFirst({
      where: { 
        email: {
          equals: session.user.email,
          mode: 'insensitive'
        }
      }
    })

    if (!user) {
      // Try to create the user if they don't exist
      try {
        user = await prisma.user.create({
          data: {
            email: session.user.email,
            name: session.user.name || session.user.email.split('@')[0],
          }
        })
        
        // Also create their primary email entry
        await prisma.userEmail.create({
          data: {
            userId: user.id,
            email: session.user.email,
            isPrimary: true,
            isVerified: true,
            verifiedAt: new Date()
          }
        })
      } catch (createError) {
        console.error('Failed to create user:', createError)
        return NextResponse.json({ error: 'Failed to create user account' }, { status: 500 })
      }
    }

    // Generate verification token
    const verificationToken = crypto.randomUUID()

    // Create linked email
    const linkedEmail = await prisma.userEmail.create({
      data: {
        userId: user.id,
        email,
        verificationToken,
      }
    })

    // TODO: Send verification email
    // await sendVerificationEmail(email, verificationToken)

    return NextResponse.json({
      message: 'Email added. Please check your inbox for verification.',
      email: linkedEmail.email
    })
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: 'Invalid email format' },
        { status: 400 }
      )
    }

    console.error('Error adding email:', error)
    
    // More specific error handling
    if (error instanceof Error) {
      return NextResponse.json(
        { error: `Failed to add email: ${error.message}` },
        { status: 500 }
      )
    }

    return NextResponse.json(
      { error: 'Failed to add email' },
      { status: 500 }
    )
  }
}

// DELETE /api/user/emails/[email] - Remove a linked email
export async function DELETE(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user?.email) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const url = new URL(request.url)
    const emailToDelete = url.searchParams.get('email')

    if (!emailToDelete) {
      return NextResponse.json({ error: 'Email required' }, { status: 400 })
    }

    // Get user - handle case sensitivity
    const user = await prisma.user.findFirst({
      where: { 
        email: {
          equals: session.user.email,
          mode: 'insensitive'
        }
      }
    })

    if (!user) {
      // Debug: Check what's in the database
      console.error('User not found for email:', session.user.email)
      const allUsers = await prisma.user.findMany({
        select: { email: true }
      })
      console.error('Available users:', allUsers.map(u => u.email))
      
      return NextResponse.json({ error: 'User not found' }, { status: 404 })
    }

    // Don't allow deleting primary email
    if (emailToDelete === user.email) {
      return NextResponse.json(
        { error: 'Cannot delete primary email' },
        { status: 400 }
      )
    }

    // Delete the linked email
    await prisma.userEmail.deleteMany({
      where: {
        userId: user.id,
        email: emailToDelete
      }
    })

    return NextResponse.json({ message: 'Email removed successfully' })
  } catch (error) {
    console.error('Error removing email:', error)
    return NextResponse.json(
      { error: 'Failed to remove email' },
      { status: 500 }
    )
  }
}