'use client'

import { Page, Layout, Card, Text, Button } from '@shopify/polaris'
import { useSession } from 'next-auth/react'
import { ReactNode } from 'react'

interface PolarisLayoutProps {
  title: string
  subtitle?: string
  primaryAction?: {
    content: string
    onAction: () => void
    loading?: boolean
  }
  secondaryActions?: Array<{
    content: string
    onAction: () => void
  }>
  children: ReactNode
  fullWidth?: boolean
}

export default function PolarisLayout({
  title,
  subtitle,
  primaryAction,
  secondaryActions,
  children,
  fullWidth = false
}: PolarisLayoutProps) {
  const { data: session } = useSession()

  return (
    <Page
      title={title}
      subtitle={subtitle}
      primaryAction={primaryAction ? {
        content: primaryAction.content,
        onAction: primaryAction.onAction,
        loading: primaryAction.loading,
      } : undefined}
      secondaryActions={secondaryActions}
      fullWidth={fullWidth}
    >
      <Layout>
        {children}
      </Layout>
    </Page>
  )
}

// Layout section components for consistent spacing
export function PolarisSection({ 
  children, 
  title, 
  fullWidth = false 
}: { 
  children: ReactNode
  title?: string
  fullWidth?: boolean 
}) {
  return (
    <Layout.Section>
      {title && (
        <Card>
          <Text variant="headingMd" as="h2">
            {title}
          </Text>
        </Card>
      )}
      {children}
    </Layout.Section>
  )
}

// Reusable card wrapper
export function PolarisCard({ 
  title, 
  children, 
  sectioned = true,
  actions
}: { 
  title?: string
  children: ReactNode
  sectioned?: boolean
  actions?: Array<{
    content: string
    onAction: () => void
  }>
}) {
  return (
    <Card>
      {title && (
        <Text variant="headingMd" as="h2">
          {title}
        </Text>
      )}
      <div style={{ padding: sectioned ? '16px' : '0' }}>
        {children}
      </div>
      {actions && actions.length > 0 && (
        <div style={{ padding: '16px', borderTop: '1px solid #e1e3e5', display: 'flex', gap: '8px' }}>
          {actions.map((action, index) => (
            <Button key={index} onClick={action.onAction}>
              {action.content}
            </Button>
          ))}
        </div>
      )}
    </Card>
  )
}