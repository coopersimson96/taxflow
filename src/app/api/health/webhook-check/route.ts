import { NextRequest, NextResponse } from 'next/server'
import { WebhookManager } from '@/lib/services/webhook-manager'

export const dynamic = 'force-dynamic'

export async function GET(request: NextRequest) {
  try {
    console.log('🌐 Starting global webhook health check...')
    
    const healthResults = await WebhookManager.runGlobalHealthCheck()
    
    const summary = {
      totalIntegrations: healthResults.length,
      healthyCount: healthResults.filter(h => h.overallStatus === 'healthy').length,
      degradedCount: healthResults.filter(h => h.overallStatus === 'degraded').length,
      failedCount: healthResults.filter(h => h.overallStatus === 'failed').length,
      timestamp: new Date().toISOString()
    }

    console.log('🌐 Global health check completed:', summary)

    return NextResponse.json({
      success: true,
      summary,
      results: healthResults.map(result => ({
        integrationId: result.integrationId,
        shop: result.shop,
        overallStatus: result.overallStatus,
        lastSync: result.lastSync,
        nextHealthCheck: result.nextHealthCheck,
        webhookCount: result.webhooks.length,
        healthyWebhookCount: result.webhooks.filter(w => w.status === 'healthy').length,
        webhookDetails: result.webhooks.map(w => ({
          topic: w.topic,
          status: w.status,
          url: w.url === 'missing' ? 'missing' : 'configured',
          consecutiveFailures: w.consecutiveFailures
        }))
      }))
    })

  } catch (error) {
    console.error('❌ Global webhook health check failed:', error)
    return NextResponse.json({
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error',
      timestamp: new Date().toISOString()
    }, { status: 500 })
  }
}

export async function POST(request: NextRequest) {
  try {
    const { integrationId } = await request.json()

    if (!integrationId) {
      return NextResponse.json({
        success: false,
        error: 'integrationId is required'
      }, { status: 400 })
    }

    console.log(`🏥 Running health check for integration: ${integrationId}`)
    
    const healthResult = await WebhookManager.ensureWebhookHealth(integrationId)

    return NextResponse.json({
      success: true,
      result: {
        integrationId: healthResult.integrationId,
        shop: healthResult.shop,
        overallStatus: healthResult.overallStatus,
        lastSync: healthResult.lastSync,
        nextHealthCheck: healthResult.nextHealthCheck,
        webhookCount: healthResult.webhooks.length,
        healthyWebhookCount: healthResult.webhooks.filter(w => w.status === 'healthy').length,
        webhookDetails: healthResult.webhooks.map(w => ({
          topic: w.topic,
          status: w.status,
          url: w.url === 'missing' ? 'missing' : 'configured',
          consecutiveFailures: w.consecutiveFailures
        }))
      },
      timestamp: new Date().toISOString()
    })

  } catch (error) {
    console.error('❌ Individual webhook health check failed:', error)
    return NextResponse.json({
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error',
      timestamp: new Date().toISOString()
    }, { status: 500 })
  }
}