/**
 * Correlation ID Utilities
 *
 * Simple wrapper around the logging context system for generating and managing
 * correlation IDs. This provides a clean API for tracking operations across
 * the compliance audit workflow.
 *
 * @module correlation
 */

import { generateCorrelationId as generateCID, getCorrelationId as getCID } from '@/lib/logging';

/**
 * Generates unique correlation ID for tracking operations.
 *
 * Uses the logging infrastructure's crypto-based generator which produces
 * correlation IDs in the format: cor_<16-char-hex>
 *
 * @returns Correlation ID string (e.g., "cor_a3f5d8c9e2b1f4a7")
 *
 * @example
 * ```typescript
 * const correlationId = generateCorrelationId();
 * logger.info('Audit started', { correlationId });
 * ```
 */
export function generateCorrelationId(): string {
  return generateCID();
}

/**
 * Extracts correlation ID from request headers or generates new one.
 *
 * Checks for x-correlation-id header first, then falls back to context,
 * and finally generates a new ID if neither exists.
 *
 * @param request - Optional Next.js request object
 * @returns Correlation ID from header, context, or newly generated
 *
 * @example
 * ```typescript
 * export async function POST(request: NextRequest) {
 *   const correlationId = getOrCreateCorrelationId(request);
 *   logger.info('Request received', { correlationId });
 * }
 * ```
 */
export function getOrCreateCorrelationId(request?: Request): string {
  // Check request headers first
  if (request?.headers) {
    const headerValue = request.headers.get('x-correlation-id');
    if (headerValue) {
      return headerValue;
    }
  }

  // Check current context
  const contextId = getCID();
  if (contextId) {
    return contextId;
  }

  // Generate new ID as fallback
  return generateCID();
}

/**
 * Validates correlation ID format.
 *
 * Checks if the provided string matches the expected correlation ID format.
 * Valid formats:
 * - cor_<16-char-hex> (logging system format)
 * - audit_<16-char-hex> (audit-specific format)
 * - Any string starting with alphanumeric followed by underscore
 *
 * @param correlationId - Correlation ID to validate
 * @returns True if valid correlation ID format
 *
 * @example
 * ```typescript
 * isValidCorrelationId('cor_a3f5d8c9e2b1f4a7'); // true
 * isValidCorrelationId('audit_123456789abcdef0'); // true
 * isValidCorrelationId('invalid'); // false
 * ```
 */
export function isValidCorrelationId(correlationId: string): boolean {
  if (!correlationId || typeof correlationId !== 'string') {
    return false;
  }

  // Match format: prefix_hexstring (e.g., cor_a3f5d8c9e2b1f4a7, audit_123abc)
  const pattern = /^[a-z]+_[a-f0-9]{16}$/;
  return pattern.test(correlationId);
}

/**
 * Extracts correlation ID from various sources with priority fallback.
 *
 * Priority order:
 * 1. Explicit correlationId parameter
 * 2. Request x-correlation-id header
 * 3. Current async context
 * 4. Generate new ID
 *
 * @param options - Options for extraction
 * @returns Correlation ID from highest priority source
 *
 * @example
 * ```typescript
 * const correlationId = extractCorrelationId({
 *   request,
 *   correlationId: customId, // Takes precedence if provided
 * });
 * ```
 */
export function extractCorrelationId(options?: {
  request?: Request;
  correlationId?: string;
}): string {
  // Priority 1: Explicit correlation ID
  if (options?.correlationId) {
    return options.correlationId;
  }

  // Priority 2: Request header
  if (options?.request) {
    const headerValue = options.request.headers.get('x-correlation-id');
    if (headerValue) {
      return headerValue;
    }
  }

  // Priority 3: Current context
  const contextId = getCID();
  if (contextId) {
    return contextId;
  }

  // Priority 4: Generate new
  return generateCID();
}
