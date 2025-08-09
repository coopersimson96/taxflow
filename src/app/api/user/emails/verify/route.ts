import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'

// GET /api/user/emails/verify?token=xxx - Verify an email address
export async function GET(request: NextRequest) {
  try {
    const token = request.nextUrl.searchParams.get('token')

    if (!token) {
      return NextResponse.json({ error: 'Verification token required' }, { status: 400 })
    }

    // Find the email by verification token
    const userEmail = await prisma.userEmail.findFirst({
      where: {
        verificationToken: token,
        isVerified: false
      }
    })

    if (!userEmail) {
      return NextResponse.json(
        { error: 'Invalid or expired verification token' },
        { status: 400 }
      )
    }

    // Mark email as verified
    await prisma.userEmail.update({
      where: { id: userEmail.id },
      data: {
        isVerified: true,
        verifiedAt: new Date(),
        verificationToken: null // Clear the token after use
      }
    })

    // Redirect to success page or return success response
    return NextResponse.redirect(new URL('/settings?verified=true', request.url))
  } catch (error) {
    console.error('Error verifying email:', error)
    return NextResponse.json(
      { error: 'Failed to verify email' },
      { status: 500 }
    )
  }
}