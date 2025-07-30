import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'

export async function GET(request: NextRequest) {
  try {
    // Check authentication
    const session = await getServerSession(authOptions)
    if (!session?.user?.email) {
      return NextResponse.json(
        { error: 'Authentication required' },
        { status: 401 }
      )
    }

    const searchParams = request.nextUrl.searchParams
    const organizationId = searchParams.get('organizationId')

    // Fetch integrations
    let integrations
    
    if (organizationId) {
      // Fetch for specific organization
      integrations = await prisma.integration.findMany({
        where: {
          organizationId: organizationId
        },
        select: {
          id: true,
          type: true,
          name: true,
          status: true,
          lastSyncAt: true,
          syncStatus: true,
          syncError: true,
          credentials: true,
          createdAt: true,
          updatedAt: true
        },
        orderBy: {
          createdAt: 'desc'
        }
      })
    } else {
      // For now, fetch all integrations (in production, filter by user's organizations)
      integrations = await prisma.integration.findMany({
        select: {
          id: true,
          type: true,
          name: true,
          status: true,
          lastSyncAt: true,
          syncStatus: true,
          syncError: true,
          credentials: true,
          createdAt: true,
          updatedAt: true,
          organization: {
            select: {
              id: true,
              name: true,
              slug: true
            }
          }
        },
        orderBy: {
          createdAt: 'desc'
        }
      })
    }

    // Filter out sensitive credential data for security
    const safeIntegrations = integrations.map(integration => ({
      ...integration,
      credentials: integration.credentials ? {
        ...integration.credentials as any,
        accessToken: undefined // Remove access token from response
      } : null
    }))

    return NextResponse.json({
      success: true,
      integrations: safeIntegrations
    })

  } catch (error) {
    console.error('Error fetching integrations:', error)
    return NextResponse.json(
      { error: 'Failed to fetch integrations' },
      { status: 500 }
    )
  }
}

export async function POST(request: NextRequest) {
  try {
    // Check authentication
    const session = await getServerSession(authOptions)
    if (!session?.user?.email) {
      return NextResponse.json(
        { error: 'Authentication required' },
        { status: 401 }
      )
    }

    const body = await request.json()
    const { type, name, organizationId, config } = body

    if (!type || !name || !organizationId) {
      return NextResponse.json(
        { error: 'Missing required fields' },
        { status: 400 }
      )
    }

    // Create integration
    const integration = await prisma.integration.create({
      data: {
        type,
        name,
        organizationId,
        config: config || {},
        status: 'DISCONNECTED',
        syncStatus: 'IDLE'
      },
      select: {
        id: true,
        type: true,
        name: true,
        status: true,
        syncStatus: true,
        createdAt: true
      }
    })

    return NextResponse.json({
      success: true,
      integration
    })

  } catch (error) {
    console.error('Error creating integration:', error)
    return NextResponse.json(
      { error: 'Failed to create integration' },
      { status: 500 }
    )
  }
}