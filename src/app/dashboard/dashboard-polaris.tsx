'use client'

import { useEffect, useState, useCallback } from 'react'
import { useSession } from 'next-auth/react'
import { useSearchParams } from 'next/navigation'
import { 
  Page, 
  Layout, 
  Card, 
  Spinner, 
  Text, 
  EmptyState, 
  Banner,
  Button
} from '@shopify/polaris'
import AuthGuard from '@/components/auth/AuthGuard'
import TaxAnalyticsDashboard from '@/components/analytics/TaxAnalyticsDashboard'

interface Store {
  integrationId: string
  organizationId: string
  organizationName: string
  storeName: string
  shopDomain: string
  role: string
  createdAt: string
  lastSyncAt: string | null
}

export default function DashboardPolaris() {
  const { data: session, status } = useSession()
  const searchParams = useSearchParams()
  const urlOrganizationId = searchParams.get('org')
  
  const [stores, setStores] = useState<Store[]>([])
  const [isLoadingStores, setIsLoadingStores] = useState(true)
  const [storeError, setStoreError] = useState<string | null>(null)
  const [selectedOrganizationId, setSelectedOrganizationId] = useState<string | null>(null)

  const fetchStores = useCallback(async () => {
    if (!session?.user?.email) return
    
    try {
      setIsLoadingStores(true)
      setStoreError(null)
      
      const response = await fetch('/api/debug/list-stores')
      const data = await response.json()
      
      if (data.success && Array.isArray(data.stores)) {
        setStores(data.stores)
        
        // Auto-select organization from URL or first available
        const targetOrgId = urlOrganizationId || data.stores[0]?.organizationId
        if (targetOrgId) {
          setSelectedOrganizationId(targetOrgId)
        }
      } else {
        setStoreError('No stores found')
      }
    } catch (error) {
      setStoreError('Failed to load stores')
      console.error('Error fetching stores:', error)
    } finally {
      setIsLoadingStores(false)
    }
  }, [urlOrganizationId, selectedOrganizationId, session?.user?.email])
  
  // Fetch available stores when authenticated
  useEffect(() => {
    if (status === 'authenticated') {
      fetchStores()
    }
  }, [status, fetchStores])
  
  // Loading state
  if (status === 'loading' || isLoadingStores) {
    return (
      <AuthGuard>
        <Page title="Dashboard" fullWidth>
          <Layout>
            <Layout.Section>
              <Card>
                <div style={{ textAlign: 'center', padding: '60px 0' }}>
                  <Spinner size="large" />
                  <div style={{ marginTop: '16px' }}>
                    <Text variant="bodyMd" as="p">Loading your tax dashboard...</Text>
                  </div>
                </div>
              </Card>
            </Layout.Section>
          </Layout>
        </Page>
      </AuthGuard>
    )
  }

  // Error state
  if (storeError) {
    return (
      <AuthGuard>
        <Page title="Dashboard" fullWidth>
          <Layout>
            <Layout.Section>
              <Banner tone="critical">
                <Text variant="bodyMd" as="p">
                  {storeError}
                </Text>
              </Banner>
              <div style={{ marginTop: '20px' }}>
                <Card>
                  <EmptyState
                    heading="No connected stores found"
                    action={{
                      content: 'Connect a store',
                      url: '/connect'
                    }}
                    secondaryAction={{
                      content: 'Retry',
                      onAction: fetchStores
                    }}
                    image="https://cdn.shopify.com/s/files/1/0262/4071/2726/files/emptystate-files.png"
                  >
                    <Text variant="bodyMd" as="p">
                      Connect your Shopify store to start tracking tax analytics.
                    </Text>
                  </EmptyState>
                </Card>
              </div>
            </Layout.Section>
          </Layout>
        </Page>
      </AuthGuard>
    )
  }

  // Success state with data
  const selectedStore = stores.find(store => store.organizationId === selectedOrganizationId)
  
  return (
    <AuthGuard>
      <Page 
        title="Tax Analytics Dashboard"
        subtitle={selectedStore ? `${selectedStore.storeName} (${selectedStore.shopDomain})` : undefined}
        fullWidth
      >
        {selectedStore && (
          <TaxAnalyticsDashboard 
            organizationId={selectedStore.organizationId}
          />
        )}
      </Page>
    </AuthGuard>
  )
}