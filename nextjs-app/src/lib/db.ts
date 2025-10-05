/**
 * Prisma Database Client Singleton
 * Fire Department Radio Transcription System
 *
 * This module exports a singleton instance of the Prisma Client to prevent
 * multiple instances in development (due to hot module reload) and ensure
 * proper connection pooling in production.
 *
 * @see https://www.prisma.io/docs/guides/performance-and-optimization/connection-management
 */

import { PrismaClient } from '@prisma/client';

/**
 * Global variable to store the Prisma client instance across hot reloads in development.
 * This prevents creating multiple Prisma clients during Next.js development mode.
 */
const globalForPrisma = globalThis as unknown as {
  prisma: PrismaClient | undefined;
};

/**
 * Prisma Client instance with environment-specific logging configuration.
 *
 * **Development**: Logs queries, errors, and warnings for debugging.
 * **Production**: Logs only errors to reduce overhead.
 *
 * **Connection Pooling**: Prisma handles connection pooling automatically.
 * The default pool size is determined by the database connector.
 *
 * @example
 * ```typescript
 * import { prisma } from '@/lib/db';
 *
 * const incidents = await prisma.incident.findMany({
 *   where: { status: 'ACTIVE' },
 *   include: { transcripts: true }
 * });
 * ```
 */
export const prisma =
  globalForPrisma.prisma ??
  new PrismaClient({
    log:
      process.env.NODE_ENV === 'development'
        ? ['query', 'error', 'warn']
        : ['error'],
    errorFormat: 'pretty',
  });

/**
 * In development, store the Prisma client instance globally to prevent
 * multiple instances during hot module reload.
 */
if (process.env.NODE_ENV !== 'production') {
  globalForPrisma.prisma = prisma;
}

/**
 * Helper function to safely disconnect from the database.
 * Useful for graceful shutdowns and testing cleanup.
 *
 * @example
 * ```typescript
 * import { disconnectDatabase } from '@/lib/db';
 *
 * // In a shutdown handler or test cleanup
 * await disconnectDatabase();
 * ```
 */
export async function disconnectDatabase(): Promise<void> {
  await prisma.$disconnect();
}

/**
 * Helper function to check database connectivity.
 * Useful for health checks and startup validation.
 *
 * @returns {Promise<boolean>} True if database is connected, false otherwise
 *
 * @example
 * ```typescript
 * import { isDatabaseConnected } from '@/lib/db';
 *
 * const isConnected = await isDatabaseConnected();
 * if (!isConnected) {
 *   console.error('Database connection failed!');
 * }
 * ```
 */
export async function isDatabaseConnected(): Promise<boolean> {
  try {
    await prisma.$queryRaw`SELECT 1`;
    return true;
  } catch (error) {
    console.error('Database connection check failed:', error);
    return false;
  }
}

/**
 * Execute a database transaction with automatic rollback on error.
 * Provides a safe way to perform multiple database operations atomically.
 *
 * @template T The return type of the transaction callback
 * @param {Function} callback Function containing the transaction operations
 * @returns {Promise<T>} The result of the transaction
 *
 * @example
 * ```typescript
 * import { executeTransaction } from '@/lib/db';
 *
 * const result = await executeTransaction(async (tx) => {
 *   const incident = await tx.incident.create({
 *     data: { number: '2024-001', type: 'Fire', ... }
 *   });
 *
 *   const transcript = await tx.transcript.create({
 *     data: { incidentId: incident.id, ... }
 *   });
 *
 *   return { incident, transcript };
 * });
 * ```
 */
export async function executeTransaction<T>(
  callback: (tx: PrismaClient) => Promise<T>
): Promise<T> {
  return await prisma.$transaction(callback as any);
}

/**
 * Type export for Prisma Client to use in service layer
 */
export type PrismaTransaction = Omit<
  PrismaClient,
  '$connect' | '$disconnect' | '$on' | '$transaction' | '$use'
>;
