/**
 * Database Transaction Utilities
 * Fire Department Radio Transcription System
 *
 * Provides centralized transaction management with production-ready defaults
 * for multi-step database operations that require atomicity.
 *
 * **Transaction Best Practices**:
 * - DO use for multi-step writes that must be atomic
 * - DO NOT wrap external API calls inside transactions
 * - DO NOT use for single-step operations (already atomic)
 * - DO keep transaction scope as small as possible
 * - DO NOT include long-running operations (>5 seconds)
 *
 * @module lib/utils/database
 */

import { prisma } from '@/lib/db';
import type { PrismaClient } from '@prisma/client';

/**
 * Prisma transaction client type
 *
 * Represents a Prisma client instance within a transaction context.
 * Omits transaction-related methods that are not available during transaction execution.
 *
 * @example
 * ```typescript
 * async function saveAudit(tx: PrismaTransaction, data: AuditData) {
 *   return await tx.audit.create({ data });
 * }
 * ```
 */
export type PrismaTransaction = Omit<
  PrismaClient,
  '$connect' | '$disconnect' | '$on' | '$transaction' | '$use' | '$extends'
>;

/**
 * Execute database operations within a transaction
 *
 * Provides automatic rollback on error and configures production-ready defaults:
 * - **maxWait**: 5 seconds - Maximum time to wait for a database connection
 * - **timeout**: 30 seconds - Maximum transaction execution time
 * - **isolationLevel**: ReadCommitted - Prevents dirty reads while allowing concurrency
 *
 * **When to Use**:
 * - Multi-step database writes that must be atomic (all succeed or all fail)
 * - Operations where partial failure would create inconsistent state
 * - Concurrent writes that require isolation guarantees
 *
 * **When NOT to Use**:
 * - Single-step database operations (Prisma operations are already atomic)
 * - Operations involving external API calls (OpenAI, storage, etc.)
 * - Long-running operations exceeding 5 seconds
 * - Read-only queries (no consistency risk)
 *
 * @template T The return type of the transaction operation
 * @param {Function} operation - Async function that receives transaction client and returns result
 * @returns {Promise<T>} The result of the transaction operation
 * @throws {Error} If transaction fails or times out (automatic rollback occurs)
 *
 * @example
 * ```typescript
 * // ✅ CORRECT: Multi-step audit save (atomic)
 * const audit = await withTransaction(async (tx) => {
 *   const audit = await tx.audit.create({
 *     data: { incidentId, templateId, overallScore }
 *   });
 *
 *   await tx.auditFinding.createMany({
 *     data: findings.map(f => ({ auditId: audit.id, ...f }))
 *   });
 *
 *   return audit;
 * });
 * ```
 *
 * @example
 * ```typescript
 * // ✅ CORRECT: External API call OUTSIDE transaction
 * const aiResult = await analyzeCompliance(transcript, template);
 *
 * const audit = await withTransaction(async (tx) => {
 *   return await tx.audit.create({ data: aiResult });
 * });
 * ```
 *
 * @example
 * ```typescript
 * // ❌ WRONG: External API call inside transaction
 * const audit = await withTransaction(async (tx) => {
 *   const aiResult = await analyzeCompliance(transcript, template); // BAD!
 *   return await tx.audit.create({ data: aiResult });
 * });
 * ```
 *
 * @example
 * ```typescript
 * // ❌ WRONG: Single operation doesn't need transaction
 * const audit = await withTransaction(async (tx) => {
 *   return await tx.audit.create({ data }); // Already atomic!
 * });
 * ```
 *
 * @see https://www.prisma.io/docs/concepts/components/prisma-client/transactions
 */
export async function withTransaction<T>(
  operation: (tx: PrismaTransaction) => Promise<T>
): Promise<T> {
  return await prisma.$transaction(operation, {
    maxWait: 5000, // 5 seconds: Maximum wait time to acquire a connection from the pool
    timeout: 30000, // 30 seconds: Maximum transaction execution time before rollback
    isolationLevel: 'ReadCommitted', // Prevents dirty reads, allows concurrent reads
  });
}

/**
 * Transaction configuration notes
 *
 * **maxWait (5000ms)**:
 * - Fire department audits are not real-time critical
 * - 5 seconds is acceptable wait time for database connection
 * - Prevents indefinite blocking under high load
 * - Fails fast if connection pool is exhausted
 *
 * **timeout (30000ms)**:
 * - Allows complex multi-step writes (audits with many findings)
 * - Longer than typical web request timeout (10-15s)
 * - Short enough to prevent indefinite locks
 * - External API calls must occur BEFORE transaction
 *
 * **isolationLevel (ReadCommitted)**:
 * - Prevents dirty reads (reading uncommitted data from other transactions)
 * - Allows non-blocking concurrent reads (better performance)
 * - Suitable for fire department compliance data (no serialization needed)
 * - PostgreSQL default, well-tested and reliable
 *
 * **Alternative Isolation Levels**:
 * - `ReadUncommitted`: Not supported by PostgreSQL (treats as ReadCommitted)
 * - `RepeatableRead`: Prevents non-repeatable reads, higher lock contention
 * - `Serializable`: Strongest isolation, significant performance impact
 *
 * **When to Change Isolation Level**:
 * - If audit data requires strict serialization: Use `Serializable`
 * - If performance issues occur: Profile queries, optimize indexes first
 * - If deadlocks occur frequently: Review transaction scope and duration
 */
