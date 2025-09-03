'use client'

import { useState, useEffect, useCallback, useMemo } from 'react'
import { useSession } from 'next-auth/react'
import { 
  Page, 
  Layout, 
  Card, 
  Tabs, 
  Text,
  FormLayout,
  TextField,
  Banner,
  Spinner,
  EmptyState
} from '@shopify/polaris'
import AuthGuard from '@/components/auth/AuthGuard'
import LinkedEmails from '@/components/user/LinkedEmails'
import DisconnectAccount from '@/components/settings/DisconnectAccount'
import ImportProgress from '@/components/settings/ImportProgress'

interface TabDescriptor {
  id: string
  content: string
  panelID: string
}

export default function SettingsPolaris() {
  const { data: session } = useSession()
  const [selectedTab, setSelectedTab] = useState(0)
  const [integrationId, setIntegrationId] = useState<string | null>(null)
  const [isLoadingIntegration, setIsLoadingIntegration] = useState(true)

  // Tab configuration
  const tabs: TabDescriptor[] = useMemo(() => [
    {
      id: 'emails',
      content: 'Email Addresses',
      panelID: 'emails-content'
    },
    {
      id: 'profile',
      content: 'Profile',
      panelID: 'profile-content'
    },
    {
      id: 'data',
      content: 'Data & Import',
      panelID: 'data-content'
    },
    {
      id: 'notifications',
      content: 'Notifications',
      panelID: 'notifications-content'
    },
    {
      id: 'account',
      content: 'Account',
      panelID: 'account-content'
    }
  ], [])

  // Check URL for tab parameter and set initial tab
  useEffect(() => {
    const searchParams = new URLSearchParams(window.location.search)
    const tabParam = searchParams.get('tab')
    if (tabParam) {
      const tabIndex = tabs.findIndex(tab => tab.id === tabParam)
      if (tabIndex !== -1) {
        setSelectedTab(tabIndex)
      }
    }
  }, [tabs])

  // Fetch user's current integration
  const fetchIntegration = useCallback(async () => {
    if (!session?.user) return
    
    try {
      setIsLoadingIntegration(true)
      const response = await fetch('/api/user/current-integration')
      
      if (!response.ok) {
        console.error('API returned error:', response.status, response.statusText)
        return
      }
      
      const text = await response.text()
      if (!text) {
        console.error('API returned empty response')
        return
      }
      
      let result
      try {
        result = JSON.parse(text)
      } catch (parseError) {
        console.error('Failed to parse JSON:', text)
        return
      }
      
      console.log('Current integration API response:', result)
      
      if (result.integration) {
        setIntegrationId(result.integration.id)
        console.log('✅ Set integration ID:', result.integration.id)
      } else if (result.error) {
        console.error('API error:', result.error)
      } else {
        console.log('No integration found')
      }
      
    } catch (error) {
      console.error('Failed to fetch integration:', error)
    } finally {
      setIsLoadingIntegration(false)
    }
  }, [session])

  useEffect(() => {
    fetchIntegration()
  }, [fetchIntegration])

  const handleTabChange = useCallback((selectedTabIndex: number) => {
    setSelectedTab(selectedTabIndex)
  }, [])

  // Loading state for integration
  if (isLoadingIntegration) {
    return (
      <AuthGuard>
        <Page title="Settings" fullWidth>
          <Layout>
            <Layout.Section>
              <Card>
                <div style={{ textAlign: 'center', padding: '60px 0' }}>
                  <Spinner size="large" />
                  <div style={{ marginTop: '16px' }}>
                    <Text variant="bodyMd" as="p">Loading settings...</Text>
                  </div>
                </div>
              </Card>
            </Layout.Section>
          </Layout>
        </Page>
      </AuthGuard>
    )
  }

  return (
    <AuthGuard>
      <Page title="Settings" fullWidth>
        <Layout>
          <Layout.Section>
            <Card>
              <Tabs 
                tabs={tabs} 
                selected={selectedTab} 
                onSelect={handleTabChange}
              >
                {/* Email Addresses Tab */}
                {selectedTab === 0 && (
                  <div style={{ padding: '20px' }}>
                    <LinkedEmails />
                  </div>
                )}

                {/* Profile Tab */}
                {selectedTab === 1 && (
                  <div style={{ padding: '20px' }}>
                    <Text variant="headingMd" as="h3">
                      Profile Information
                    </Text>
                    <div style={{ marginTop: '16px' }}>
                      <FormLayout>
                        <TextField
                          label="Name"
                          value={session?.user?.name || ''}
                          disabled
                          autoComplete="name"
                        />
                        <TextField
                          label="Primary Email"
                          value={session?.user?.email || ''}
                          disabled
                          autoComplete="email"
                        />
                      </FormLayout>
                    </div>
                  </div>
                )}

                {/* Data & Import Tab */}
                {selectedTab === 2 && (
                  <div style={{ padding: '20px' }}>
                    {integrationId ? (
                      <ImportProgress integrationId={integrationId} />
                    ) : (
                      <EmptyState
                        heading="No store connected"
                        action={{
                          content: 'Connect store',
                          url: '/connect'
                        }}
                        image="https://cdn.shopify.com/s/files/1/0262/4071/2726/files/emptystate-files.png"
                      >
                        <Text variant="bodyMd" as="p">
                          Connect your Shopify store to access import settings.
                        </Text>
                      </EmptyState>
                    )}
                  </div>
                )}

                {/* Notifications Tab */}
                {selectedTab === 3 && (
                  <div style={{ padding: '20px' }}>
                    <Text variant="headingMd" as="h3">
                      Notification Preferences
                    </Text>
                    <div style={{ marginTop: '16px' }}>
                      <Banner tone="info">
                        <Text variant="bodyMd" as="p">
                          Notification settings coming soon...
                        </Text>
                      </Banner>
                    </div>
                  </div>
                )}

                {/* Account Tab */}
                {selectedTab === 4 && (
                  <div style={{ padding: '20px' }}>
                    <DisconnectAccount />
                  </div>
                )}
              </Tabs>
            </Card>
          </Layout.Section>
        </Layout>
      </Page>
    </AuthGuard>
  )
}