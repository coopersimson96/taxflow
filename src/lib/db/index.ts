export { prisma, connectToDatabase, disconnectFromDatabase, checkDatabaseHealth, withTransaction } from '../prisma'

// Re-export common Prisma types for convenience
export type {
  User,
  Organization,
  OrganizationMember,
  Integration,
  Transaction,
  TaxPeriod,
  Notification,
  Role,
  IntegrationType,
  IntegrationStatus,
  TransactionType,
  TransactionStatus,
  PeriodType,
  FilingStatus,
  NotificationType,
  NotificationPriority,
  NotificationStatus,
} from '@prisma/client'