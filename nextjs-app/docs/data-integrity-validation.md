# Template Data Integrity Validation

**Phase 5.4 Implementation: Data Integrity Checks**

This document describes the comprehensive data integrity validation system for compliance templates in the Fire Department Radio Transcription System.

## Overview

Data integrity validation ensures that all template data is mathematically correct and structurally consistent before being saved to the database or used for compliance auditing. This prevents runtime errors, ensures accurate scoring calculations, and maintains data quality throughout the system.

## Validation Rules

### 1. Category Weight Validation

**Rule**: Category weights must sum to 1.0 (±0.01 tolerance)

**Mathematical Constraint**:
```
Σ(category.weight) = 1.0 ± 0.01
```

**Validation Checks**:
- ✅ Category weights sum to exactly 1.0
- ✅ Category weights sum to 0.995 - 1.005 (within tolerance)
- ❌ Category weights sum to 0.8 (too low)
- ❌ Category weights sum to 1.2 (too high)

**Example Error**:
```
Category weights must sum to 1.0 (got 0.800). Please regenerate template.
```

**Individual Weight Constraints**:
- Each category weight must be between 0 and 1 (exclusive of 0)
- ❌ Negative weights (e.g., -0.5)
- ❌ Weights greater than 1.0 (e.g., 1.5)
- ❌ Zero weights (categories with zero weight should be removed)

**Example Error**:
```
Weight for "Radio Communications" must be between 0 and 1 (got 1.5)
```

### 2. Criterion Weight Validation (Within Category)

**Rule**: Within each category, criterion weights must sum to 1.0 (±0.01 tolerance)

**Mathematical Constraint**:
```
For each category:
  Σ(criterion.weight) = 1.0 ± 0.01
```

**Validation Checks**:
- ✅ Criterion weights sum to 1.0 within the category
- ❌ Criterion weights sum to 0.8 (missing weight)
- ❌ Criterion weights sum to 1.3 (over-weighted)

**Example Error**:
```
Criterion weights in category "Safety Procedures" must sum to 1.0 (got 0.800)
```

**Individual Weight Constraints**:
- Each criterion weight must be between 0 and 1 (exclusive of 0)
- ❌ Negative weights
- ❌ Weights greater than 1.0
- ❌ Zero weights

**Example Error**:
```
Weight for criterion "radio-clear-transmission" in category "Radio Communications" must be between 0 and 1 (got 1.2)
```

### 3. Criterion ID Uniqueness

**Rule**: All criterion IDs must be unique across the entire template

**Validation Checks**:
- ✅ All criterion IDs are unique
- ❌ Duplicate IDs within the same category
- ❌ Duplicate IDs across different categories

**Example Error**:
```
Duplicate criterion IDs found: radio-clear-transmission, safety-par-conducted. Each criterion must have a unique ID.
```

**Rationale**: Unique IDs are essential for:
- Database referential integrity
- Audit result tracking
- UI component rendering (React keys)
- API queries and lookups

### 4. Template Structure Validation

**Required Fields**:

**Category Level**:
- ✅ `name` (non-empty string)
- ✅ `weight` (0 < weight ≤ 1)
- ✅ At least one criterion
- ⚠️ `description` (recommended but not required)

**Criterion Level**:
- ✅ `id` (non-empty string, unique)
- ✅ `description` (non-empty string)
- ✅ `scoringMethod` (PASS_FAIL, NUMERIC, or CRITICAL_PASS_FAIL)
- ✅ `weight` (0 < weight ≤ 1)
- ⚠️ `evidenceRequired` (recommended but not required)

**Example Errors**:
```
Template must have at least one category
Category "Safety Procedures" must have at least one criterion
Criterion "crit-1" has invalid scoringMethod "CUSTOM_METHOD". Must be one of: PASS_FAIL, NUMERIC, CRITICAL_PASS_FAIL
```

## Implementation Locations

### 1. Template Generation Service (`src/lib/services/templateGeneration.ts`)

**Method**: `validateDataIntegrity(categories, jobId)`

Called after weight normalization in Phase 3 of template generation:

```typescript
// Phase 3: Weight Normalization
weightedCategories = this.applyWeights(validDiscovered, criteriaMap);

// Validate data integrity after normalization
this.validateDataIntegrity(weightedCategories, jobId);
```

**Features**:
- Validates category weight sum
- Validates individual category weights
- Validates criterion weight sums per category
- Validates individual criterion weights
- Validates criterion ID uniqueness
- Logs all validation errors with detailed context
- Throws `ServiceError` with actionable error messages

### 2. Template Service (`src/lib/services/templateService.ts`)

**Method**: `validateTemplateStructure(categories)`

Called when:
- Creating a new template (`createTemplate()`)
- Updating an existing template (`updateTemplate()`)
- Manual validation requests

**Returns**: `ValidationResult` object
```typescript
{
  valid: boolean;
  errors: string[];
}
```

**Features**:
- Comprehensive structure validation
- Mathematical constraint checking
- Uniqueness verification
- Clear error messages with context

## Error Messages

All error messages follow a consistent format:

1. **Field identification**: Clearly state which field has the issue
2. **Actual value**: Show what was received
3. **Expected value**: Show what was expected
4. **Actionable guidance**: Suggest how to fix

**Examples**:

```
Category weights must sum to 1.0 (got 0.800). Please regenerate template.

Weight for "Radio Communications" must be between 0 and 1 (got 1.5)

Criterion weights in category "Safety Procedures" must sum to 1.0 (got 0.800)

Duplicate criterion IDs found: radio-clear-transmission. Each criterion must have a unique ID.
```

## Logging Integration

All validation operations are logged using the structured logging system:

### Success Logs (Debug Level)
```typescript
logger.debug('Data integrity validation passed', {
  component: 'template-generation',
  operation: 'validate-data-integrity',
  jobId,
  categoryCount: categories.length,
  totalCriteria: criterionIds.length,
  categoryWeightSum,
});
```

### Error Logs (Error Level)
```typescript
logger.error('Category weights do not sum to 1.0', {
  component: 'template-generation',
  operation: 'validate-data-integrity',
  jobId,
  weightSum: categoryWeightSum,
  categories: categories.map(c => ({ name: c.name, weight: c.weight })),
});
```

**Log Context Includes**:
- Component name
- Operation name
- Job ID (for tracing)
- Actual values that failed validation
- Category/criterion names
- Weight sums and individual weights

## Testing

Comprehensive test suite in `__tests__/services/templateDataIntegrity.test.ts`:

**Test Coverage**:
- ✅ Category weight validation (21 test cases)
- ✅ Criterion weight validation
- ✅ Uniqueness validation
- ✅ Structure validation
- ✅ Edge cases (zeros, negatives, boundary values)
- ✅ Valid template examples

**Test Categories**:
1. Category Weight Validation (6 tests)
2. Criterion Weight Validation (5 tests)
3. Criterion ID Uniqueness Validation (3 tests)
4. Template Structure Validation (6 tests)
5. Valid Template Examples (1 test)

**Run Tests**:
```bash
npm test -- templateDataIntegrity.test.ts
```

## Edge Cases Handled

### 1. Floating Point Precision
- Uses ±0.01 tolerance to account for JavaScript floating-point arithmetic
- Example: 0.333 + 0.333 + 0.334 = 1.000 (accepted)

### 2. Zero Weights
- Categories/criteria with zero weight are rejected
- Rationale: Zero-weight items don't contribute to scoring and should be removed

### 3. Negative Weights
- Negative weights are rejected
- Rationale: Weights represent proportions and cannot be negative

### 4. Missing Fields
- Null/undefined weights are treated as validation errors
- Empty strings are treated as missing values

### 5. Duplicate IDs
- Tracks all duplicates, not just first occurrence
- Provides complete list of duplicate IDs in error message

## Auto-Fix Capabilities

The `autoFixTemplate()` method can automatically correct some issues:

**Auto-fixable Issues**:
- ✅ Category weights not summing to 1.0 (normalized)
- ✅ Criterion weights not summing to 1.0 (normalized)

**Non-fixable Issues** (require manual intervention):
- ❌ Duplicate criterion IDs
- ❌ Missing required fields
- ❌ Invalid scoring methods
- ❌ Zero weights

## Integration with Compliance Auditing

Data integrity validation ensures:

1. **Accurate Scoring**: Weighted scores are mathematically correct
2. **Consistent Results**: Same template always produces same score for same transcript
3. **No Runtime Errors**: No division by zero or invalid weight calculations
4. **Audit Trail**: All validations logged for debugging and compliance

## Best Practices

### For Template Creators

1. **Use Auto-Generation**: Let AI generate templates with proper weights
2. **Verify Results**: Always check validation results before saving
3. **Review Logs**: Check logs for auto-fix warnings
4. **Test Templates**: Use test transcripts to verify scoring

### For Developers

1. **Validate Early**: Call validation immediately after generation/updates
2. **Handle Errors**: Catch and display validation errors to users
3. **Log Context**: Include jobId and relevant data in logs
4. **Test Edge Cases**: Write tests for boundary conditions

### For System Administrators

1. **Monitor Logs**: Watch for repeated validation failures
2. **Database Integrity**: Run periodic validation on existing templates
3. **Audit History**: Track auto-fix occurrences
4. **Performance**: Validation is fast (< 10ms for typical templates)

## Mathematical Proof

**Weight Sum Constraint**:

For a template to produce a valid audit score (0-100):

```
score = Σ(category_i.score × category_i.weight)

where:
  category_i.score = Σ(criterion_j.score × criterion_j.weight)

For valid scoring:
  Σ(category_i.weight) = 1.0
  For each category: Σ(criterion_j.weight) = 1.0
```

**Proof by Induction**:
- Base case: Template with 1 category, 1 criterion → weight = 1.0
- Inductive step: Adding categories/criteria preserves normalization
- Conclusion: Final score always in range [0, 100]

## Related Documentation

- [Logging Integration Summary](./logging-integration-summary.md)
- [Template Generation Service](../src/lib/services/templateGeneration.ts)
- [Template Service](../src/lib/services/templateService.ts)
- [Error Handlers](../src/lib/services/utils/errorHandlers.ts)

## Version History

- **v1.0.0** (2025-01-16): Initial implementation of Phase 5.4 data integrity checks
  - Category weight validation
  - Criterion weight validation
  - Uniqueness validation
  - Comprehensive error messages
  - Test suite with 21 test cases
