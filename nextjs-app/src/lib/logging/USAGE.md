# Logging Infrastructure Usage Guide

Production-grade TypeScript logging system for the Next.js fire department application.

## Quick Start

```typescript
import { logger } from '@/lib/logging';

// Basic logging
logger.info('Template generation started', {
  component: 'template-generation',
  operation: 'discover-categories',
  jobId: 'job-123',
  documentCount: 3
});

logger.error('OpenAI API failed', {
  component: 'openai',
  operation: 'responses-create',
  model: 'gpt-4.1',
  error: new Error('Rate limit exceeded')
});
```

## Core Features

### Log Levels

- **DEBUG**: Detailed diagnostic information
- **INFO**: General informational messages
- **WARN**: Potentially harmful situations
- **ERROR**: Error events that might allow continued operation
- **CRITICAL**: Severe errors requiring immediate attention

### Automatic Context Enrichment

All logs automatically include:
- **Timestamp**: ISO 8601 format
- **Correlation ID**: From AsyncLocalStorage context
- **Job ID**: For multi-turn workflows
- **Environment**: NODE_ENV value
- **App Version**: From environment

## Usage Patterns

### 1. Service Layer Logging

```typescript
import { logger } from '@/lib/logging';

export async function generateTemplate(documents: PolicyDocument[]) {
  logger.info('Starting template generation', {
    component: 'template-generation',
    operation: 'start',
    documentCount: documents.length
  });

  try {
    const result = await processDocuments(documents);

    logger.info('Template generation complete', {
      component: 'template-generation',
      operation: 'complete',
      duration: result.duration
    });

    return result;
  } catch (error) {
    logger.error('Template generation failed', {
      component: 'template-generation',
      operation: 'generate',
      error: error instanceof Error ? error : new Error(String(error))
    });
    throw error;
  }
}
```

### 2. API Route Logging with Context

```typescript
import { logger, runWithContext } from '@/lib/logging';
import { NextRequest } from 'next/server';

export async function POST(request: NextRequest) {
  return runWithContext(async () => {
    logger.info('API request received', {
      component: 'api',
      operation: 'policy-extract',
      path: request.url
    });

    // All logs in this scope automatically include correlation ID
    const data = await processRequest(request);

    logger.info('API request complete', {
      component: 'api',
      operation: 'policy-extract',
      statusCode: 200
    });

    return Response.json(data);
  });
}
```

### 3. Child Loggers for Consistent Context

```typescript
import { logger } from '@/lib/logging';

// Create child logger with default metadata
const templateLogger = logger.child({
  component: 'template-generation',
  jobId: 'job-123'
});

// All logs include component and jobId automatically
templateLogger.info('Starting category discovery');
templateLogger.info('Category discovery complete', {
  categoryCount: 5
});
```

### 4. Multi-turn Workflow Tracking

```typescript
import { logger, generateJobId, setJobId, runWithContext } from '@/lib/logging';

export async function multiTurnGeneration() {
  return runWithContext(async () => {
    const jobId = generateJobId();
    setJobId(jobId);

    logger.info('Multi-turn workflow started');

    for (let turn = 1; turn <= 3; turn++) {
      logger.info('Processing turn', { turn });
      await processTurn(turn);
    }

    logger.info('Multi-turn workflow complete');
  });
}
```

### 5. Request Duration Tracking

```typescript
import { logger, runWithContext, getRequestDuration } from '@/lib/logging';

export async function processRequest() {
  return runWithContext(async () => {
    logger.info('Request started');

    await doWork();

    logger.info('Request complete', {
      duration: getRequestDuration()
    });
  });
}
```

## Configuration

### Environment Variables

```bash
# Log level (DEBUG, INFO, WARN, ERROR, CRITICAL)
LOG_LEVEL=INFO

# Enable/disable database logging
LOG_DATABASE=true

# Enable file logging (optional fallback)
LOG_FILE=false
LOG_FILE_PATH=/var/log/fire-dept-app.log
```

### Custom Configuration

```typescript
import { createLogger, LogLevel, ConsoleTransport } from '@/lib/logging';

const customLogger = createLogger({
  minLevel: LogLevel.WARN,
  transports: [
    new ConsoleTransport({
      minLevel: LogLevel.WARN,
      useColors: false
    })
  ]
});
```

## Transports

### Console Transport (Always Enabled)

- **Development**: Human-readable colored output
- **Production**: JSON structured logs
- Writes WARN/ERROR/CRITICAL to stderr

### Database Transport (Production Default)

- Batches logs for performance (10 entries or 5 seconds)
- Persists to `system_logs` table via Prisma
- Automatically disables if database unavailable
- Minimum level: INFO

### File Transport (Optional)

- Writes to local file system
- Automatic log rotation at 10MB
- JSON or human-readable format
- Enable with `LOG_FILE=true`

## Structured Metadata

Standard metadata fields:

```typescript
{
  component: 'template-generation',    // System component
  operation: 'discover-categories',    // Specific operation
  jobId: 'job-123',                   // Multi-turn workflow ID
  correlationId: 'cor-456',           // Request tracking ID
  userId: 'user-789',                 // User identifier
  incidentId: 'inc-abc',              // Incident reference
  templateId: 'tpl-def',              // Template reference
  duration: 1250,                     // Duration in milliseconds
  statusCode: 200,                    // HTTP status code
  error: Error                        // Error object
}
```

## Best Practices

### 1. Use Appropriate Log Levels

```typescript
// DEBUG - Development diagnostics
logger.debug('Request headers parsed', { headers });

// INFO - Normal operations
logger.info('Template generation started', { jobId });

// WARN - Degraded performance, approaching limits
logger.warn('Rate limit approaching', { remainingRequests: 5 });

// ERROR - Operation failed but app continues
logger.error('API request failed', { error, retryCount: 3 });

// CRITICAL - System failure, immediate action required
logger.critical('Database connection lost', { error });
```

### 2. Include Contextual Metadata

```typescript
// Good - Rich context
logger.info('Compliance audit complete', {
  component: 'compliance',
  operation: 'audit',
  incidentId: 'inc-123',
  templateId: 'tpl-456',
  score: 87.5,
  duration: 2500
});

// Poor - Missing context
logger.info('Audit done');
```

### 3. Log Errors with Full Details

```typescript
try {
  await riskyOperation();
} catch (error) {
  logger.error('Operation failed', {
    component: 'service',
    operation: 'risky-operation',
    error: error instanceof Error ? error : new Error(String(error)),
    context: { userId, documentId }
  });
  throw error;
}
```

### 4. Use Child Loggers for Consistency

```typescript
// Create once
const auditLogger = logger.child({
  component: 'compliance-audit',
  templateId: template.id
});

// Use throughout
auditLogger.info('Audit started');
auditLogger.info('Category scored', { category, score });
auditLogger.info('Audit complete', { overallScore });
```

### 5. Flush Before Shutdown

```typescript
process.on('SIGTERM', async () => {
  logger.info('Application shutting down');
  await logger.flush();
  process.exit(0);
});
```

## Database Schema

The `system_logs` table structure:

```prisma
model SystemLog {
  id        String   @id @default(cuid())
  timestamp DateTime
  level     String   // DEBUG, INFO, WARN, ERROR, CRITICAL
  message   String   @db.Text
  metadata  Json     // Structured metadata
  createdAt DateTime @default(now())

  @@index([level])
  @@index([timestamp])
  @@map("system_logs")
}
```

## Querying Logs

### Find errors in last hour

```typescript
const errors = await prisma.systemLog.findMany({
  where: {
    level: 'ERROR',
    timestamp: {
      gte: new Date(Date.now() - 3600000)
    }
  },
  orderBy: { timestamp: 'desc' }
});
```

### Track specific job

```typescript
const jobLogs = await prisma.systemLog.findMany({
  where: {
    metadata: {
      path: ['jobId'],
      equals: 'job-123'
    }
  },
  orderBy: { timestamp: 'asc' }
});
```

### Find correlation chain

```typescript
const requestLogs = await prisma.systemLog.findMany({
  where: {
    metadata: {
      path: ['correlationId'],
      equals: 'cor-abc'
    }
  },
  orderBy: { timestamp: 'asc' }
});
```

## Migration Required

After implementing this logging system, run:

```bash
npx prisma migrate dev --name add-system-logs
npx prisma generate
```

This creates the `system_logs` table and updates the Prisma client.
