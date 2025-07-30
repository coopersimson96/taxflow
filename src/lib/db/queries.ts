import { prisma } from '../prisma'
import type { 
  User, 
  Organization, 
  Integration, 
  Transaction,
  TaxPeriod,
  IntegrationType,
  TransactionType,
  PeriodType,
  Role
} from '@prisma/client'

// User queries
export async function getUserById(id: string) {
  return await prisma.user.findUnique({
    where: { id },
    include: {
      organizations: {
        include: {
          organization: true
        }
      }
    }
  })
}

export async function getUserByEmail(email: string) {
  return await prisma.user.findUnique({
    where: { email },
    include: {
      organizations: {
        include: {
          organization: true
        }
      }
    }
  })
}

// Organization queries
export async function getOrganizationById(id: string) {
  return await prisma.organization.findUnique({
    where: { id },
    include: {
      members: {
        include: {
          user: true
        }
      },
      integrations: true,
      _count: {
        select: {
          transactions: true,
          taxPeriods: true,
          notifications: true
        }
      }
    }
  })
}

export async function getUserOrganizations(userId: string) {
  return await prisma.organization.findMany({
    where: {
      members: {
        some: {
          userId
        }
      }
    },
    include: {
      members: {
        where: { userId },
        select: { role: true }
      },
      _count: {
        select: {
          transactions: true,
          integrations: true
        }
      }
    }
  })
}

// Integration queries
export async function getOrganizationIntegrations(organizationId: string) {
  return await prisma.integration.findMany({
    where: { organizationId },
    orderBy: { createdAt: 'desc' }
  })
}

export async function getIntegrationByType(organizationId: string, type: IntegrationType) {
  return await prisma.integration.findUnique({
    where: {
      organizationId_type: {
        organizationId,
        type
      }
    }
  })
}

// Transaction queries
export async function getOrganizationTransactions(
  organizationId: string,
  options?: {
    limit?: number
    offset?: number
    type?: TransactionType
    integrationId?: string
    startDate?: Date
    endDate?: Date
  }
) {
  const { limit = 50, offset = 0, type, integrationId, startDate, endDate } = options ?? {}

  return await prisma.transaction.findMany({
    where: {
      organizationId,
      ...(type && { type }),
      ...(integrationId && { integrationId }),
      ...(startDate || endDate) && {
        transactionDate: {
          ...(startDate && { gte: startDate }),
          ...(endDate && { lte: endDate })
        }
      }
    },
    include: {
      integration: {
        select: {
          type: true,
          name: true
        }
      }
    },
    orderBy: { transactionDate: 'desc' },
    take: limit,
    skip: offset
  })
}

export async function getTransactionById(id: string) {
  return await prisma.transaction.findUnique({
    where: { id },
    include: {
      integration: true,
      organization: true
    }
  })
}

// Tax period queries
export async function getOrganizationTaxPeriods(organizationId: string) {
  return await prisma.taxPeriod.findMany({
    where: { organizationId },
    orderBy: [
      { year: 'desc' },
      { quarter: 'desc' },
      { month: 'desc' }
    ]
  })
}

export async function getTaxPeriod(
  organizationId: string,
  type: PeriodType,
  year: number,
  quarter?: number,
  month?: number
) {
  return await prisma.taxPeriod.findUnique({
    where: {
      organizationId_type_year_quarter_month: {
        organizationId,
        type,
        year,
        quarter,
        month
      }
    }
  })
}

// Analytics queries
export async function getTransactionSummary(
  organizationId: string,
  startDate: Date,
  endDate: Date
) {
  const result = await prisma.transaction.aggregate({
    where: {
      organizationId,
      transactionDate: {
        gte: startDate,
        lte: endDate
      },
      status: 'COMPLETED'
    },
    _sum: {
      subtotal: true,
      taxAmount: true,
      totalAmount: true
    },
    _count: {
      id: true
    }
  })

  return {
    totalTransactions: result._count.id,
    totalSales: result._sum.subtotal ?? 0,
    totalTax: result._sum.taxAmount ?? 0,
    totalRevenue: result._sum.totalAmount ?? 0
  }
}

export async function getTaxSummaryByPeriod(
  organizationId: string,
  year: number,
  type: 'monthly' | 'quarterly' = 'monthly'
) {
  const startDate = new Date(year, 0, 1)
  const endDate = new Date(year + 1, 0, 1)

  if (type === 'monthly') {
    return await prisma.$queryRaw`
      SELECT 
        EXTRACT(MONTH FROM "transactionDate") as month,
        SUM("taxAmount") as total_tax,
        SUM("totalAmount") as total_revenue,
        COUNT(*) as transaction_count
      FROM transactions
      WHERE "organizationId" = ${organizationId}
        AND "transactionDate" >= ${startDate}
        AND "transactionDate" < ${endDate}
        AND status = 'COMPLETED'
      GROUP BY EXTRACT(MONTH FROM "transactionDate")
      ORDER BY month
    `
  } else {
    return await prisma.$queryRaw`
      SELECT 
        EXTRACT(QUARTER FROM "transactionDate") as quarter,
        SUM("taxAmount") as total_tax,
        SUM("totalAmount") as total_revenue,
        COUNT(*) as transaction_count
      FROM transactions
      WHERE "organizationId" = ${organizationId}
        AND "transactionDate" >= ${startDate}
        AND "transactionDate" < ${endDate}
        AND status = 'COMPLETED'
      GROUP BY EXTRACT(QUARTER FROM "transactionDate")
      ORDER BY quarter
    `
  }
}

// Notification queries
export async function getUserNotifications(userId: string, unreadOnly = false) {
  return await prisma.notification.findMany({
    where: {
      userId,
      ...(unreadOnly && { readAt: null })
    },
    orderBy: { createdAt: 'desc' },
    take: 50
  })
}

export async function getOrganizationNotifications(organizationId: string, unreadOnly = false) {
  return await prisma.notification.findMany({
    where: {
      organizationId,
      ...(unreadOnly && { readAt: null })
    },
    orderBy: { createdAt: 'desc' },
    take: 50
  })
}