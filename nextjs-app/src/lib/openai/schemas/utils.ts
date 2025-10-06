/**
 * Schema Utilities
 * Fire Department Radio Transcription System
 *
 * Utilities for working with Zod schemas and OpenAI structured outputs.
 *
 * @module lib/openai/schemas/utils
 */

import { z } from 'zod';

/**
 * Validate and parse JSON content with Zod schema
 *
 * Safely parses JSON string and validates against Zod schema.
 *
 * @param content JSON string or object to parse/validate
 * @param schema Zod schema for validation
 * @returns Parsed and validated data
 * @throws {z.ZodError} if validation fails
 *
 * @example
 * ```typescript
 * const schema = z.object({ name: z.string() });
 * const data = validateWithSchema('{"name":"John"}', schema);
 * // data is typed as { name: string }
 * ```
 */
export function validateWithSchema<T extends z.ZodType<any>>(
  content: string | unknown,
  schema: T
): z.infer<T> {
  // Parse JSON if string
  const parsed = typeof content === 'string' ? JSON.parse(content) : content;

  // Validate with Zod
  return schema.parse(parsed);
}

/**
 * Safe parse with error message formatting
 *
 * Attempts to parse and validate, returning either success or formatted error.
 *
 * @param content Content to parse/validate
 * @param schema Zod schema
 * @returns Result object with success flag and data or error
 *
 * @example
 * ```typescript
 * const result = safeParseWithSchema(jsonString, MySchema);
 * if (result.success) {
 *   console.log(result.data);
 * } else {
 *   console.error(result.error);
 * }
 * ```
 */
export function safeParseWithSchema<T extends z.ZodType<any>>(
  content: string | unknown,
  schema: T
):
  | { success: true; data: z.infer<T> }
  | { success: false; error: string } {
  try {
    const data = validateWithSchema(content, schema);
    return { success: true, data };
  } catch (error) {
    if (error instanceof z.ZodError) {
      const issues = error.issues.map(
        (issue) => `${issue.path.join('.')}: ${issue.message}`
      );
      return {
        success: false,
        error: `Validation failed:\n${issues.join('\n')}`,
      };
    }

    if (error instanceof SyntaxError) {
      return {
        success: false,
        error: `Invalid JSON: ${error.message}`,
      };
    }

    return {
      success: false,
      error: `Unknown error: ${error instanceof Error ? error.message : String(error)}`,
    };
  }
}
