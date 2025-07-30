/**
 * Supabase Configuration and Client Setup
 * 
 * This module provides Supabase client configuration for authentication,
 * real-time subscriptions, and database operations that complement Prisma.
 */

import { createClient, SupabaseClient } from '@supabase/supabase-js'
import { config } from './env-validator'

// Define the database schema type for better type safety
export interface Database {
  public: {
    Tables: {
      users: {
        Row: {
          id: string
          email: string
          name: string | null
          avatar: string | null
          email_verified: string | null
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          email: string
          name?: string | null
          avatar?: string | null
          email_verified?: string | null
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          email?: string
          name?: string | null
          avatar?: string | null
          email_verified?: string | null
          created_at?: string
          updated_at?: string
        }
      }
      organizations: {
        Row: {
          id: string
          name: string
          slug: string
          description: string | null
          logo: string | null
          tax_id: string | null
          address: any | null
          timezone: string
          settings: any
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          name: string
          slug: string
          description?: string | null
          logo?: string | null
          tax_id?: string | null
          address?: any | null
          timezone?: string
          settings?: any
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          name?: string
          slug?: string
          description?: string | null
          logo?: string | null
          tax_id?: string | null
          address?: any | null
          timezone?: string
          settings?: any
          created_at?: string
          updated_at?: string
        }
      }
      // Add other table types as needed
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      [_ in never]: never
    }
    Enums: {
      role: 'OWNER' | 'ADMIN' | 'MEMBER' | 'VIEWER'
      integration_type: 'SHOPIFY' | 'SQUARE' | 'STRIPE' | 'PAYPAL' | 'QUICKBOOKS' | 'XERO'
      integration_status: 'CONNECTED' | 'DISCONNECTED' | 'ERROR' | 'PENDING'
      transaction_type: 'SALE' | 'REFUND' | 'PARTIAL_REFUND' | 'VOID' | 'ADJUSTMENT'
      transaction_status: 'PENDING' | 'COMPLETED' | 'CANCELLED' | 'FAILED' | 'REFUNDED'
      filing_status: 'DRAFT' | 'READY' | 'FILED' | 'AMENDED' | 'OVERDUE'
      notification_type: 'TAX_DUE' | 'SYNC_ERROR' | 'INTEGRATION_DISCONNECTED' | 'REPORT_READY' | 'SYSTEM_UPDATE' | 'WELCOME' | 'REMINDER'
      notification_priority: 'LOW' | 'MEDIUM' | 'HIGH' | 'URGENT'
      notification_status: 'PENDING' | 'SENT' | 'DELIVERED' | 'READ' | 'FAILED'
    }
  }
}

// Create the Supabase client
let supabase: SupabaseClient<Database> | null = null

export function createSupabaseClient(): SupabaseClient<Database> | null {
  if (!config.supabase.isConfigured) {
    console.warn('⚠️  Supabase configuration incomplete. Some features may not work.')
    return null
  }

  if (!supabase) {
    supabase = createClient<Database>(
      config.supabase.url!,
      config.supabase.anonKey!,
      {
        auth: {
          persistSession: true,
          autoRefreshToken: true,
          detectSessionInUrl: true,
        },
        realtime: {
          params: {
            eventsPerSecond: 10,
          },
        },
      }
    )
  }

  return supabase
}

// Get the Supabase client instance
export function getSupabaseClient(): SupabaseClient<Database> | null {
  return supabase || createSupabaseClient()
}

// Admin client for server-side operations
export function createSupabaseAdminClient(): SupabaseClient<Database> | null {
  if (!config.supabase.isConfigured || !config.supabase.serviceRoleKey) {
    console.warn('⚠️  Supabase admin configuration incomplete.')
    return null
  }

  return createClient<Database>(
    config.supabase.url!,
    config.supabase.serviceRoleKey!,
    {
      auth: {
        autoRefreshToken: false,
        persistSession: false,
      },
    }
  )
}

// Real-time subscription helpers
export interface SubscriptionConfig {
  table: keyof Database['public']['Tables']
  filter?: string
  onInsert?: (payload: any) => void
  onUpdate?: (payload: any) => void
  onDelete?: (payload: any) => void
}

export function subscribeToTable(config: SubscriptionConfig) {
  const client = getSupabaseClient()
  if (!client) {
    console.warn('⚠️  Cannot create subscription: Supabase client not available')
    return null
  }

  const subscription = client
    .channel(`${config.table}_changes`)
    .on(
      'postgres_changes',
      {
        event: '*',
        schema: 'public',
        table: config.table as string,
        filter: config.filter,
      },
      (payload) => {
        switch (payload.eventType) {
          case 'INSERT':
            config.onInsert?.(payload)
            break
          case 'UPDATE':
            config.onUpdate?.(payload)
            break
          case 'DELETE':
            config.onDelete?.(payload)
            break
        }
      }
    )
    .subscribe()

  return subscription
}

// Utility functions for common operations
export async function checkSupabaseConnection(): Promise<boolean> {
  const client = getSupabaseClient()
  if (!client) return false

  try {
    const { data, error } = await client.from('users').select('count').limit(1)
    return !error
  } catch (error) {
    console.error('Supabase connection check failed:', error)
    return false
  }
}

export async function getUserProfile(userId: string) {
  const client = getSupabaseClient()
  if (!client) return null

  const { data, error } = await client
    .from('users')
    .select('*')
    .eq('id', userId)
    .single()

  if (error) {
    console.error('Error fetching user profile:', error)
    return null
  }

  return data
}

export async function getUserOrganizations(userId: string) {
  const client = getSupabaseClient()
  if (!client) return []

  const { data, error } = await client
    .from('organization_members')
    .select(`
      role,
      joined_at,
      organization:organizations(*)
    `)
    .eq('user_id', userId)

  if (error) {
    console.error('Error fetching user organizations:', error)
    return []
  }

  return data
}

// Export the configured client
export const supabaseClient = getSupabaseClient()

// Health check function for monitoring
export async function getSupabaseHealth() {
  const client = getSupabaseClient()
  
  if (!client) {
    return {
      status: 'unavailable',
      message: 'Supabase client not configured',
      timestamp: new Date().toISOString(),
    }
  }

  try {
    const start = Date.now()
    const { data, error } = await client.from('users').select('count').limit(1)
    const duration = Date.now() - start

    if (error) {
      throw error
    }

    return {
      status: 'healthy',
      message: 'Connected successfully',
      responseTime: duration,
      timestamp: new Date().toISOString(),
    }
  } catch (error) {
    return {
      status: 'unhealthy',
      message: error instanceof Error ? error.message : 'Unknown error',
      timestamp: new Date().toISOString(),
    }
  }
}

// Row Level Security (RLS) helpers
export const rlsPolicies = {
  // Example policies for reference - these would be created in Supabase
  users: {
    select: 'Users can view their own profile',
    update: 'Users can update their own profile',
  },
  organizations: {
    select: 'Users can view organizations they belong to',
    insert: 'Users can create organizations',
    update: 'Organization owners and admins can update',
    delete: 'Only organization owners can delete',
  },
  transactions: {
    select: 'Users can view transactions for their organizations',
    insert: 'System can insert transactions via integrations',
    update: 'Organization admins can update transactions',
    delete: 'Organization owners can delete transactions',
  },
}

// Migration helpers for Supabase-specific features
export const supabaseMigrations = {
  enableRLS: `
    -- Enable Row Level Security
    ALTER TABLE users ENABLE ROW LEVEL SECURITY;
    ALTER TABLE organizations ENABLE ROW LEVEL SECURITY;
    ALTER TABLE organization_members ENABLE ROW LEVEL SECURITY;
    ALTER TABLE integrations ENABLE ROW LEVEL SECURITY;
    ALTER TABLE transactions ENABLE ROW LEVEL SECURITY;
    ALTER TABLE tax_periods ENABLE ROW LEVEL SECURITY;
    ALTER TABLE notifications ENABLE ROW LEVEL SECURITY;
  `,
  
  createPolicies: `
    -- User policies
    CREATE POLICY "Users can view own profile" ON users FOR SELECT USING (auth.uid()::text = id);
    CREATE POLICY "Users can update own profile" ON users FOR UPDATE USING (auth.uid()::text = id);
    
    -- Organization member policies
    CREATE POLICY "Members can view their memberships" ON organization_members FOR SELECT USING (auth.uid()::text = user_id);
    
    -- Organization policies
    CREATE POLICY "Members can view their organizations" ON organizations FOR SELECT USING (
      EXISTS (
        SELECT 1 FROM organization_members 
        WHERE organization_id = organizations.id 
        AND user_id = auth.uid()::text
      )
    );
  `,
  
  createFunctions: `
    -- Function to check organization membership
    CREATE OR REPLACE FUNCTION check_organization_membership(org_id text, user_id text)
    RETURNS boolean AS $$
    BEGIN
      RETURN EXISTS (
        SELECT 1 FROM organization_members 
        WHERE organization_id = org_id 
        AND user_id = user_id
      );
    END;
    $$ LANGUAGE plpgsql SECURITY DEFINER;
  `,
}

export default supabaseClient