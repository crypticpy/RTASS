# Incident Creation API Update: `selectedTemplateIds` Support

## Overview

Updated the incident creation API endpoint to accept and properly document the `selectedTemplateIds` field, which allows clients to associate compliance audit templates with incidents during creation.

**Date**: 2025-11-16
**File Modified**: `src/app/api/incidents/create/route.ts`

---

## Changes Made

### Documentation Updates

#### 1. Function-level JSDoc (Lines 16-23)

**Before**:
```typescript
/**
 * POST /api/incidents/create
 *
 * Create a new incident record with optional auto-generation of fields.
 *
 * @param {JSON} request - Incident data
 * @returns {Response} Created incident with ID
```

**After**:
```typescript
/**
 * POST /api/incidents/create
 *
 * Create a new incident record with optional auto-generation of fields.
 * Supports associating compliance templates via selectedTemplateIds for automated auditing.
 *
 * @param {JSON} request - Incident data (including optional selectedTemplateIds)
 * @returns {Response} Created incident with ID and associated template IDs
```

#### 2. Request Body Documentation (Lines 25-38)

**Added**:
```json
"selectedTemplateIds": ["template-id-1", "template-id-2"]  // Optional - compliance templates for auditing
```

This field is now documented as an optional array of template IDs that will be used for compliance auditing against the incident's transcripts.

#### 3. Response Documentation (Lines 40-61)

**Added**:
```json
"selectedTemplateIds": ["template-id-1", "template-id-2"],
```

The response now explicitly shows that `selectedTemplateIds` will be included in the returned incident object.

---

## Implementation Details

### No Code Changes Required

The underlying implementation already fully supports this field:

1. **Schema Validation** (Line 75): `CreateIncidentSchema.parse(body)`
   - The schema in `incidentService.ts` includes: `selectedTemplateIds: z.array(z.string()).optional()`
   - Validation happens automatically

2. **Service Layer** (Line 78): `incidentService.createIncident(validated)`
   - The service method at `incidentService.ts:85` stores: `selectedTemplateIds: validatedInput.selectedTemplateIds || []`
   - Database persistence is automatic

3. **Database Schema** (`prisma/schema.prisma`):
   - Field defined as: `selectedTemplateIds Json?`
   - Supports storing array of template ID strings

---

## API Usage Example

### Request

```bash
POST /api/incidents/create
Content-Type: application/json

{
  "type": "Structure Fire",
  "severity": "HIGH",
  "address": "123 Main Street",
  "selectedTemplateIds": ["cm123abc", "cm456def"]
}
```

### Response (201 Created)

```json
{
  "success": true,
  "data": {
    "id": "cm789xyz",
    "number": "2024-0001",
    "type": "Structure Fire",
    "severity": "HIGH",
    "address": "123 Main Street",
    "startTime": "2024-11-16T10:30:00.000Z",
    "endTime": null,
    "status": "MONITORING",
    "summary": null,
    "selectedTemplateIds": ["cm123abc", "cm456def"],
    "units": [],
    "createdAt": "2024-11-16T10:30:00.000Z",
    "updatedAt": "2024-11-16T10:30:00.000Z"
  },
  "timestamp": "2024-11-16T10:30:00.000Z"
}
```

---

## Validation Rules

The `selectedTemplateIds` field:

- **Type**: Array of strings
- **Required**: No (optional field)
- **Default**: Empty array `[]` if not provided
- **Validation**: Must be an array (enforced by Zod schema)
- **Storage**: Stored as JSON in PostgreSQL

---

## Integration Points

This field integrates with:

1. **Compliance Service** (`src/lib/services/complianceService.ts`)
   - Templates specified here will be used for automated compliance auditing
   - When a transcript is uploaded for this incident, the system can automatically run audits against the selected templates

2. **Template Service** (`src/lib/services/templateService.ts`)
   - Template IDs should reference existing Template records in the database
   - Frontend should fetch available templates using the template service

3. **Frontend Upload Flow**
   - The incident creation form can now include a template selector
   - Users can pre-select which compliance templates should be applied to the incident's transcripts

---

## Testing Recommendations

### Unit Tests

```typescript
describe('POST /api/incidents/create', () => {
  it('should accept selectedTemplateIds', async () => {
    const response = await POST({
      json: async () => ({
        type: 'Structure Fire',
        severity: 'HIGH',
        address: '123 Main St',
        selectedTemplateIds: ['template-1', 'template-2']
      })
    });

    expect(response.status).toBe(201);
    const data = await response.json();
    expect(data.data.selectedTemplateIds).toEqual(['template-1', 'template-2']);
  });

  it('should default to empty array if selectedTemplateIds not provided', async () => {
    const response = await POST({
      json: async () => ({
        type: 'Structure Fire',
        severity: 'HIGH',
        address: '123 Main St'
      })
    });

    const data = await response.json();
    expect(data.data.selectedTemplateIds).toEqual([]);
  });
});
```

### Integration Tests

```typescript
describe('Incident creation with templates', () => {
  it('should create incident with valid template IDs', async () => {
    // Create templates first
    const template1 = await templateService.createTemplate({...});
    const template2 = await templateService.createTemplate({...});

    // Create incident with template references
    const incident = await incidentService.createIncident({
      type: 'Structure Fire',
      severity: 'HIGH',
      address: '123 Main St',
      selectedTemplateIds: [template1.id, template2.id]
    });

    expect(incident.selectedTemplateIds).toHaveLength(2);
  });
});
```

---

## Related Files

- **API Route**: `src/app/api/incidents/create/route.ts` ✓ Updated
- **Service Schema**: `src/lib/services/incidentService.ts` ✓ Already supports field
- **Database Schema**: `prisma/schema.prisma` ✓ Field already defined
- **Frontend Components**: (To be updated separately)
  - `src/components/incidents/IncidentForm.tsx` (needs template selector)
  - `src/app/incidents/upload/page.tsx` (may need template selection UI)

---

## Verification Checklist

- [x] API documentation updated with new field
- [x] Request body example includes `selectedTemplateIds`
- [x] Response example includes `selectedTemplateIds`
- [x] Schema validation already supports the field
- [x] Service layer already persists the field
- [x] Database schema already has the field defined
- [x] No code changes required (documentation-only update)
- [x] ESLint validation passes
- [ ] Unit tests added (recommended)
- [ ] Integration tests added (recommended)
- [ ] Frontend components updated (separate task)

---

## Next Steps

1. **Frontend Integration**: Update incident creation forms to include template selection UI
2. **Validation Enhancement**: Consider adding database-level validation to ensure template IDs exist
3. **Documentation**: Update API documentation (Swagger/OpenAPI) if applicable
4. **Testing**: Add comprehensive unit and integration tests for the new field
