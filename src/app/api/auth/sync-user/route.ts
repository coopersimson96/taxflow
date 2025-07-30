import { NextRequest, NextResponse } from 'next/server'
import { UserService } from '@/lib/services/user-service'

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { email, name, image, googleId } = body

    if (!email) {
      return NextResponse.json(
        { error: 'Email is required' },
        { status: 400 }
      )
    }

    // Sync user to database
    const user = await UserService.upsertUserFromOAuth({
      email,
      name,
      avatar: image,
      googleId,
    })

    // Check if user has an organization, create one if not
    const userWithOrgs = await UserService.getUserById(user.id)
    if (userWithOrgs && userWithOrgs.organizations.length === 0) {
      await UserService.createUserOrganization(user.id, name, email)
    }

    return NextResponse.json({ 
      success: true,
      user: {
        id: user.id,
        email: user.email,
        name: user.name,
      }
    })
  } catch (error) {
    console.error('User sync API error:', error)
    return NextResponse.json(
      { error: 'Failed to sync user' },
      { status: 500 }
    )
  }
}