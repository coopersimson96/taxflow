'use client'

import { useEffect, useState } from 'react'
import { useSession } from 'next-auth/react'

export default function DebugStoresPage() {
  const { data: session } = useSession()
  const [orphanedData, setOrphanedData] = useState<any>(null)
  const [stores, setStores] = useState<any[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (session) {
      fetchData()
    }
  }, [session])

  const fetchData = async () => {
    try {
      // Fetch orphaned stores
      const orphanedRes = await fetch('/api/user/find-orphaned-stores')
      const orphaned = await orphanedRes.json()
      setOrphanedData(orphaned)

      // Fetch current stores
      const storesRes = await fetch('/api/user/stores')
      const storesData = await storesRes.json()
      setStores(storesData.stores || [])
    } catch (error) {
      console.error('Error fetching data:', error)
    } finally {
      setLoading(false)
    }
  }

  const linkStore = async (organizationId: string) => {
    try {
      const res = await fetch('/api/user/link-store', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ organizationId })
      })

      if (res.ok) {
        alert('Store linked successfully!')
        fetchData() // Refresh data
      } else {
        const error = await res.json()
        alert(`Failed to link store: ${error.error}`)
      }
    } catch (error) {
      console.error('Error linking store:', error)
      alert('Failed to link store')
    }
  }

  if (!session) {
    return <div className="p-8">Please sign in to view this page.</div>
  }

  if (loading) {
    return <div className="p-8">Loading...</div>
  }

  return (
    <div className="max-w-6xl mx-auto p-8">
      <h1 className="text-2xl font-bold mb-6">Debug: Store Connections</h1>
      
      <div className="mb-8">
        <h2 className="text-xl font-semibold mb-4">Current User</h2>
        <div className="bg-gray-100 p-4 rounded">
          <p>Email: {session.user?.email}</p>
        </div>
      </div>

      <div className="mb-8">
        <h2 className="text-xl font-semibold mb-4">Connected Stores</h2>
        {stores.length > 0 ? (
          <div className="space-y-2">
            {stores.map((store) => (
              <div key={store.id} className="bg-white border rounded p-4">
                <p className="font-medium">{store.name}</p>
                <p className="text-sm text-gray-600">Shop: {store.shop}</p>
                <p className="text-sm text-gray-600">Status: {store.status}</p>
                <p className="text-sm text-gray-600">Role: {store.role}</p>
                <p className="text-sm text-gray-600">Integration ID: {store.id}</p>
              </div>
            ))}
          </div>
        ) : (
          <p className="text-gray-500">No stores connected</p>
        )}
      </div>

      <div className="mb-8">
        <h2 className="text-xl font-semibold mb-4">Orphaned Organizations</h2>
        {orphanedData?.orphanedOrganizations?.length > 0 ? (
          <div className="space-y-2">
            {orphanedData.orphanedOrganizations.map((org: any) => (
              <div key={org.id} className="bg-yellow-50 border border-yellow-200 rounded p-4">
                <p className="font-medium">{org.name}</p>
                <p className="text-sm text-gray-600">ID: {org.id}</p>
                <p className="text-sm text-gray-600">
                  Integrations: {org.integrations.map((i: any) => `${i.name} (${i.status})`).join(', ')}
                </p>
                <p className="text-sm text-gray-600">
                  Members: {org.members.length}
                </p>
                <div className="text-xs text-gray-500 mt-2">
                  <pre>{JSON.stringify(org.settings, null, 2)}</pre>
                </div>
                {org.members.length === 0 && (
                  <button
                    onClick={() => linkStore(org.id)}
                    className="mt-2 px-4 py-2 bg-blue-500 text-white rounded hover:bg-blue-600"
                  >
                    Link to My Account
                  </button>
                )}
              </div>
            ))}
          </div>
        ) : (
          <p className="text-gray-500">No orphaned organizations found</p>
        )}
      </div>

      <div className="mb-8">
        <h2 className="text-xl font-semibold mb-4">Pending Integrations</h2>
        {orphanedData?.pendingIntegrations?.length > 0 ? (
          <div className="space-y-2">
            {orphanedData.pendingIntegrations.map((integration: any) => (
              <div key={integration.id} className="bg-orange-50 border border-orange-200 rounded p-4">
                <p className="font-medium">{integration.name}</p>
                <p className="text-sm text-gray-600">Status: {integration.status}</p>
                <p className="text-sm text-gray-600">Organization: {integration.organization.name}</p>
                <button
                  onClick={() => linkStore(integration.organizationId)}
                  className="mt-2 px-4 py-2 bg-blue-500 text-white rounded hover:bg-blue-600"
                >
                  Link Organization to My Account
                </button>
              </div>
            ))}
          </div>
        ) : (
          <p className="text-gray-500">No pending integrations found</p>
        )}
      </div>
    </div>
  )
}