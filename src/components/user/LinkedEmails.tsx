'use client'

import { useState, useEffect } from 'react'
import { useSession } from 'next-auth/react'
import { Button } from '@/components/ui/Button'
import { Input } from '@/components/ui/Input'

interface LinkedEmail {
  id: string
  email: string
  isPrimary: boolean
  isVerified: boolean
  createdAt: string
}

export default function LinkedEmails() {
  const { data: session } = useSession()
  const [emails, setEmails] = useState<LinkedEmail[]>([])
  const [newEmail, setNewEmail] = useState('')
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState('')
  const [message, setMessage] = useState('')

  useEffect(() => {
    fetchEmails()
  }, [])

  const fetchEmails = async () => {
    try {
      const response = await fetch('/api/user/emails')
      if (response.ok) {
        const data = await response.json()
        setEmails(data.emails || [])
      }
    } catch (error) {
      console.error('Error fetching emails:', error)
    }
  }

  const handleAddEmail = async (e: React.FormEvent) => {
    e.preventDefault()
    setError('')
    setMessage('')
    setIsLoading(true)

    try {
      const response = await fetch('/api/user/emails', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: newEmail })
      })

      const data = await response.json()

      if (response.ok) {
        setMessage(data.message)
        setNewEmail('')
        fetchEmails()
      } else {
        setError(data.error)
      }
    } catch (error) {
      setError('Failed to add email')
    } finally {
      setIsLoading(false)
    }
  }

  const handleRemoveEmail = async (email: string) => {
    if (!confirm(`Remove ${email} from your account?`)) return

    try {
      const response = await fetch(`/api/user/emails?email=${encodeURIComponent(email)}`, {
        method: 'DELETE'
      })

      if (response.ok) {
        setMessage('Email removed successfully')
        fetchEmails()
      } else {
        const data = await response.json()
        setError(data.error)
      }
    } catch (error) {
      setError('Failed to remove email')
    }
  }

  return (
    <div className="space-y-6">
      <div>
        <h3 className="text-lg font-medium text-gray-900 mb-2">Linked Email Addresses</h3>
        <p className="text-sm text-gray-600 mb-4">
          Link multiple email addresses to your account to automatically access Shopify stores 
          connected with different emails.
        </p>
      </div>

      {/* Current emails */}
      <div className="space-y-2">
        <div className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
          <div>
            <p className="font-medium text-gray-900">{session?.user?.email}</p>
            <p className="text-xs text-gray-500">Primary email</p>
          </div>
          <span className="text-xs bg-green-100 text-green-800 px-2 py-1 rounded">Primary</span>
        </div>

        {emails.map((email) => (
          <div key={email.id} className="flex items-center justify-between p-3 bg-white border border-gray-200 rounded-lg">
            <div>
              <p className="font-medium text-gray-900">{email.email}</p>
              <p className="text-xs text-gray-500">
                Added {new Date(email.createdAt).toLocaleDateString()}
                {!email.isVerified && ' • Pending verification'}
              </p>
            </div>
            <div className="flex items-center gap-2">
              {email.isVerified ? (
                <span className="text-xs bg-blue-100 text-blue-800 px-2 py-1 rounded">Verified</span>
              ) : (
                <span className="text-xs bg-yellow-100 text-yellow-800 px-2 py-1 rounded">Unverified</span>
              )}
              <Button
                variant="outline"
                size="sm"
                onClick={() => handleRemoveEmail(email.email)}
              >
                Remove
              </Button>
            </div>
          </div>
        ))}
      </div>

      {/* Add new email */}
      <form onSubmit={handleAddEmail} className="flex gap-2">
        <Input
          type="email"
          value={newEmail}
          onChange={(e) => setNewEmail(e.target.value)}
          placeholder="Add another email address"
          className="flex-1"
          required
        />
        <Button type="submit" disabled={isLoading}>
          {isLoading ? 'Adding...' : 'Add Email'}
        </Button>
      </form>

      {error && (
        <div className="p-3 bg-red-50 text-red-800 rounded-lg text-sm">
          {error}
        </div>
      )}

      {message && (
        <div className="p-3 bg-green-50 text-green-800 rounded-lg text-sm">
          {message}
        </div>
      )}
    </div>
  )
}