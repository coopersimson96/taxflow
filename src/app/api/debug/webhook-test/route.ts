import { NextRequest, NextResponse } from 'next/server'
import { WebhookManager } from '@/lib/services/webhook-manager'
import { prisma } from '@/lib/prisma'

export const dynamic = 'force-dynamic'

export async function GET(request: NextRequest) {
  try {
    console.log('🧪 Starting comprehensive webhook system test...')

    // Get all active Shopify integrations
    const integrations = await prisma.integration.findMany({
      where: {
        type: 'SHOPIFY',
        status: 'CONNECTED'
      }
    })

    if (integrations.length === 0) {
      return NextResponse.json({
        success: false,
        message: 'No active Shopify integrations found. Please connect your Shopify store first.',
        nextSteps: [
          'Go to /connect to set up your Shopify integration',
          'Ensure your store is properly connected',
          'Then run this test again'
        ]
      })
    }

    const testResults = []

    for (const integration of integrations) {
      console.log(`Testing integration: ${integration.id}`)
      
      try {
        const healthResult = await WebhookManager.ensureWebhookHealth(integration.id)
        
        const testResult = {
          integrationId: integration.id,
          integrationName: integration.name,
          shop: (integration.credentials as any)?.shop,
          overallStatus: healthResult.overallStatus,
          webhookHealth: {
            total: healthResult.webhooks.length,
            healthy: healthResult.webhooks.filter(w => w.status === 'healthy').length,
            unhealthy: healthResult.webhooks.filter(w => w.status === 'unhealthy').length,
            missing: healthResult.webhooks.filter(w => w.status === 'missing').length
          },
          webhooks: healthResult.webhooks.map(w => ({
            topic: w.topic,
            status: w.status,
            url: w.url === 'missing' ? 'MISSING' : w.url.includes('taxflow-smoky.vercel.app/api/webhooks/shopify') ? 'CORRECT' : 'INCORRECT',
            consecutiveFailures: w.consecutiveFailures
          })),
          lastSync: healthResult.lastSync,
          nextHealthCheck: healthResult.nextHealthCheck
        }

        testResults.push(testResult)

      } catch (error) {
        testResults.push({
          integrationId: integration.id,
          integrationName: integration.name,
          shop: (integration.credentials as any)?.shop,
          overallStatus: 'error',
          error: error instanceof Error ? error.message : 'Unknown error',
          webhookHealth: { total: 0, healthy: 0, unhealthy: 0, missing: 0 }
        })
      }
    }

    // Overall test summary
    const summary = {
      totalIntegrations: testResults.length,
      healthyIntegrations: testResults.filter(r => r.overallStatus === 'healthy').length,
      degradedIntegrations: testResults.filter(r => r.overallStatus === 'degraded').length,
      failedIntegrations: testResults.filter(r => r.overallStatus === 'failed').length,
      errorIntegrations: testResults.filter(r => r.overallStatus === 'error').length,
      
      totalWebhooks: testResults.reduce((sum, r) => sum + (r.webhookHealth?.total || 0), 0),
      healthyWebhooks: testResults.reduce((sum, r) => sum + (r.webhookHealth?.healthy || 0), 0),
      
      testStatus: testResults.every(r => r.overallStatus === 'healthy') ? 'ALL_HEALTHY' :
                  testResults.some(r => r.overallStatus === 'healthy') ? 'PARTIALLY_HEALTHY' : 'ALL_FAILED'
    }

    const recommendations = []
    if (summary.failedIntegrations > 0 || summary.errorIntegrations > 0) {
      recommendations.push('Some integrations have failed webhook health. Check the error details below.')
    }
    if (summary.degradedIntegrations > 0) {
      recommendations.push('Some integrations have degraded webhook health. Monitor these closely.')
    }
    if (summary.healthyWebhooks < summary.totalWebhooks) {
      recommendations.push('Some webhooks are not healthy. The system should auto-heal these during the health check.')
    }
    if (summary.testStatus === 'ALL_HEALTHY') {
      recommendations.push('🎉 All webhook systems are healthy! Your robust webhook system is working correctly.')
    }

    console.log('🧪 Webhook system test completed:', summary)

    return NextResponse.json({
      success: true,
      summary,
      recommendations,
      integrationResults: testResults,
      testConfig: {
        webhookEndpoint: 'https://taxflow-smoky.vercel.app/api/webhooks/shopify',
        requiredWebhooks: ['orders/create', 'orders/updated', 'orders/cancelled', 'refunds/create', 'app/uninstalled'],
        healthCheckInterval: '24 hours',
        maxConsecutiveFailures: 5
      },
      timestamp: new Date().toISOString()
    })

  } catch (error) {
    console.error('❌ Webhook system test failed:', error)
    return NextResponse.json({
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error',
      timestamp: new Date().toISOString()
    }, { status: 500 })
  }
}

export async function POST(request: NextRequest) {
  try {
    const { action, integrationId } = await request.json()

    if (action === 'heal' && integrationId) {
      console.log(`🏥 Manual healing requested for integration: ${integrationId}`)
      
      const healthResult = await WebhookManager.ensureWebhookHealth(integrationId)
      
      return NextResponse.json({
        success: true,
        action: 'heal',
        integrationId,
        result: {
          overallStatus: healthResult.overallStatus,
          webhookHealth: {
            total: healthResult.webhooks.length,
            healthy: healthResult.webhooks.filter(w => w.status === 'healthy').length,
            unhealthy: healthResult.webhooks.filter(w => w.status === 'unhealthy').length,
            missing: healthResult.webhooks.filter(w => w.status === 'missing').length
          }
        },
        timestamp: new Date().toISOString()
      })
    }

    return NextResponse.json({
      success: false,
      error: 'Invalid action or missing integrationId'
    }, { status: 400 })

  } catch (error) {
    console.error('❌ Webhook test action failed:', error)
    return NextResponse.json({
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 })
  }
}