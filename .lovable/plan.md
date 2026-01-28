
# Enable Geocoding for Courts and Judges Modules

## Objective
Update the `ADDRESS_MODULE_CONFIGS` to enable geocoding by default for Courts and Judges entities, allowing users to automatically obtain lat/lng coordinates for court and judge addresses.

---

## Current State

| Module | showGeocoding |
|--------|---------------|
| client | `false` |
| court | `false` |
| judge | `false` |
| employee | `false` |
| contact | `false` |

## Target State

| Module | showGeocoding |
|--------|---------------|
| client | `false` |
| court | `true` |
| judge | `true` |
| employee | `false` |
| contact | `false` |

---

## File to Modify

| File | Change |
|------|--------|
| `src/types/address.ts` | Set `showGeocoding: true` for court and judge configs |

---

## Implementation Details

**Line 104** - Change court config:
```typescript
// Before
showGeocoding: false,

// After
showGeocoding: true,
```

**Line 112** - Change judge config:
```typescript
// Before
showGeocoding: false,

// After
showGeocoding: true,
```

---

## Impact Analysis

### Forms Affected
- Court Create/Edit Modal → Will now show "Get Coordinates" button
- Judge Create/Edit Modal → Will now show "Get Coordinates" button

### User Experience
When creating or editing a Court or Judge, users will see:
1. A "Location Coordinates" section with a "Get Coordinates" button
2. Latitude and Longitude input fields
3. Map preview links (Google Maps / OpenStreetMap) when coordinates are present

### No Breaking Changes
- Geocoding is optional - users can still save addresses without coordinates
- Existing court/judge records without coordinates remain valid
- The feature uses the free Nominatim API (no API key required)

---

## Estimated Effort

| Task | Time |
|------|------|
| Update config values | ~2 min |
| Testing | ~5 min |
| **Total** | **~7 min** |
