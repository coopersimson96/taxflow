'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { useAuth, useUserOrganizations, useCurrentOrganization } from '@/hooks/useAuth'

export default function OrganizationSwitcher() {
  const [isOpen, setIsOpen] = useState(false)
  const organizations = useUserOrganizations()
  const currentOrg = useCurrentOrganization()
  const router = useRouter()

  if (organizations.length <= 1) {
    return null
  }

  const handleOrgSwitch = (orgSlug: string) => {
    router.push(`/org/${orgSlug}/dashboard`)
    setIsOpen(false)
  }

  return (
    <div className="relative">
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="flex items-center space-x-2 px-3 py-2 text-sm bg-white border border-gray-300 rounded-lg hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-transparent"
      >
        <div className="w-6 h-6 bg-primary-500 rounded flex items-center justify-center text-white text-xs font-medium">
          {currentOrg?.name.charAt(0)?.toUpperCase() || 'O'}
        </div>
        <span className="font-medium text-gray-900 max-w-32 truncate">
          {currentOrg?.name || 'Select Organization'}
        </span>
        <svg
          className="w-4 h-4 text-gray-500"
          fill="none"
          stroke="currentColor"
          viewBox="0 0 24 24"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={2}
            d="M19 9l-7 7-7-7"
          />
        </svg>
      </button>

      {isOpen && (
        <>
          <div
            className="fixed inset-0 z-10"
            onClick={() => setIsOpen(false)}
          />
          <div className="absolute left-0 mt-2 w-64 bg-white rounded-lg shadow-lg border border-gray-200 z-20">
            <div className="p-2">
              <div className="px-3 py-2 text-xs font-medium text-gray-500 uppercase tracking-wide">
                Switch Organization
              </div>
              {organizations.map((org) => (
                <button
                  key={org.id}
                  onClick={() => handleOrgSwitch(org.slug)}
                  className={`w-full flex items-center space-x-3 px-3 py-2 text-left rounded-md hover:bg-gray-100 transition-colors ${
                    currentOrg?.id === org.id ? 'bg-primary-50 text-primary-700' : 'text-gray-900'
                  }`}
                >
                  <div className="w-8 h-8 bg-primary-500 rounded flex items-center justify-center text-white text-sm font-medium">
                    {org.name.charAt(0)?.toUpperCase()}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="font-medium truncate">
                      {org.name}
                    </p>
                    <p className="text-xs text-gray-500 capitalize">
                      {org.role.toLowerCase()}
                    </p>
                  </div>
                  {currentOrg?.id === org.id && (
                    <div className="w-2 h-2 bg-primary-500 rounded-full" />
                  )}
                </button>
              ))}
            </div>
          </div>
        </>
      )}
    </div>
  )
}