# Testing Improvements - Template Validation

## Date: 2025-11-16

## Issue Encountered During Testing

While testing the incident creation flow, encountered error:
```
Failed to start analysis: Error: Failed to create incident: Invalid selectedTemplateIds: Invalid or inactive template IDs: 1
```

**Root Cause**: Database had no templates seeded, but UI was attempting to use template ID `1`.

## Improvements Implemented

### 1. Default Template Seeding Script

**File**: `nextjs-app/scripts/seed-template.ts`

Created a script to seed the default NFPA 1561 Radio Communications Compliance template:

```bash
npx tsx scripts/seed-template.ts
```

**Template Created**:
- **ID**: `cmi2mgyep0000zddkwj4n2d9u`
- **Name**: NFPA 1561 Radio Communications Compliance
- **Source**: NFPA 1561
- **Categories**: 5
  - Initial Radio Report (weight: 0.25)
  - Incident Command Structure (weight: 0.2)
  - Personnel Accountability (weight: 0.2)
  - Progress Reports (weight: 0.15)
  - Emergency Communications (weight: 0.2)

### 2. Enhanced Error Messages

**File**: `nextjs-app/src/lib/services/incidentService.ts` (lines 351-393)

Improved `validateTemplateIds()` method to provide:

**Before**:
```
Invalid or inactive template IDs: 1
```

**After**:
```
Invalid or inactive template IDs: 1

Available active templates:
  - NFPA 1561 Radio Communications Compliance (ID: cmi2mgyep0000zddkwj4n2d9u)
```

**Key Improvements**:
- Shows invalid template IDs that were provided
- Lists up to 10 available active templates with names and IDs
- Provides actionable guidance to users
- Handles case when no templates exist with helpful message

## Testing Instructions

### 1. Seed Default Template

```bash
cd nextjs-app
npx tsx scripts/seed-template.ts
```

### 2. Verify Template in Database

```bash
npx prisma studio --browser none &
```

Navigate to `Templates` table and verify NFPA 1561 template exists.

### 3. Test Incident Creation

1. Go to http://localhost:3000/incidents/upload
2. Upload audio file
3. Select template from dropdown
4. **Verify**: Template ID should be the one created by seed script
5. Start analysis
6. **Expected**: Incident should be created successfully

### 4. Test Error Handling

Try creating an incident with invalid template ID:

```bash
curl -X POST http://localhost:3000/api/incidents/create \
  -H "Content-Type: application/json" \
  -d '{
    "type": "Structure Fire",
    "severity": "HIGH",
    "address": "123 Test St",
    "selectedTemplateIds": ["invalid-id-123"]
  }'
```

**Expected Response**:
```json
{
  "success": false,
  "error": {
    "message": "Invalid selectedTemplateIds: Invalid or inactive template IDs: invalid-id-123\n\nAvailable active templates:\n  - NFPA 1561 Radio Communications Compliance (ID: cmi2mgyep0000zddkwj4n2d9u)",
    "statusCode": 400
  }
}
```

## Future Enhancements

1. **Auto-seeding on First Run**: Add migration or initialization hook to auto-seed default templates
2. **Template Management UI**: Build UI for creating, editing, and activating/deactivating templates
3. **Template Versioning**: Add version control for templates as policies are updated
4. **Template Import/Export**: Allow sharing templates between departments

## Related Files

- `nextjs-app/scripts/seed-template.ts` - Template seeding script
- `nextjs-app/src/lib/services/templateService.ts` - Template service with seedDefaultTemplates() method
- `nextjs-app/src/lib/services/incidentService.ts` - Incident service with improved validation
- `nextjs-app/prisma/schema.prisma` - Database schema for templates

## Commit

```
feat: improve template validation error messages and add seed script

- Add seed-template.ts script for creating default NFPA 1561 template
- Improve validateTemplateIds error messages to show available templates
- Provide helpful guidance when invalid template IDs are used
- Display up to 10 available active templates in error message
```
