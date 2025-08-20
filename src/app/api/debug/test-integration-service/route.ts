import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth/next'
import { authOptions } from '@/lib/auth'
import { IntegrationService } from '@/lib/services/integration-service'

export const dynamic = 'force-dynamic'

export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user?.email) {
      return NextResponse.json({ error: 'No session' }, { status: 401 })
    }

    const email = session.user.email
    console.log('Testing IntegrationService for:', email)

    // Test the service method
    let integration
    try {
      integration = await IntegrationService.findUserShopifyIntegration(email)
      console.log('Service returned:', integration ? 'Found integration' : 'No integration')
    } catch (serviceError) {
      console.error('Service error:', serviceError)
      return NextResponse.json({
        error: 'Service failed',
        details: serviceError instanceof Error ? serviceError.message : 'Unknown error',
        stack: serviceError instanceof Error ? serviceError.stack : undefined
      })
    }

    // Return the result
    if (integration) {
      return NextResponse.json({
        success: true,
        integration: {
          id: integration.id,
          name: integration.name,
          status: integration.status,
          organizationId: integration.organizationId,
          hasOrganization: !!integration.organization,
          organizationName: integration.organization?.name
        }
      })
    } else {
      return NextResponse.json({
        success: false,
        message: 'No integration found',
        email
      })
    }

  } catch (error) {
    console.error('Test endpoint error:', error)
    return NextResponse.json({
      error: 'Test failed',
      details: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 })
  }
}