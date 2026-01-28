
# Fix: "Tour Not Available" for All Onboarding Steps

## Problem Summary
When clicking "Start Tour" for any onboarding step (except completed ones), users see a "Tour Not Available" error message. This affects all user roles and prevents the Get Started onboarding flow from functioning.

## Root Cause
The file `public/help/tours.json` contains **invalid JSON** that prevents the entire tours data from being parsed.

### Location of Corruption
**File:** `public/help/tours.json`  
**Lines:** 1215-1226

### Current (Malformed) Structure
```json
      }
    ]
  },                                          // ← hearing-lifecycle-tour closes
        "content": "If adjourned...",         // ← ORPHAN! No opening brace
        "target": "[data-tour='next-hearing']",
        "placement": "right"
      },
      {
        "id": "hl-order",
        "title": "Upload Order",
        ...
    }
  ]                                           // ← Extra closing bracket
},
{
  "id": "dashboard-tour",
```

This orphaned fragment breaks JSON.parse(), causing `toursData` in OnboardingWizard to remain empty (`[]`). As a result, when `handleStartTour()` searches for any tour ID, it finds nothing and displays "Tour Not Available".

## Solution

### Fix 1: Remove Orphaned JSON Fragment

Delete the orphaned step fragments (lines 1215-1226) that exist outside any tour object. These appear to be duplicate remnants from `hearing-lifecycle-tour`.

**Before (lines 1213-1228):**
```json
      }
    ]
  },
        "content": "If adjourned, schedule next hearing...",
        "target": "[data-tour='next-hearing']",
        "placement": "right"
      },
      {
        "id": "hl-order",
        "title": "Upload Order",
        "content": "When order is passed...",
        "target": "[data-tour='upload-order']",
        "placement": "left"
    }
  ]
},
```

**After (lines 1213-1215):**
```json
      }
    ]
  },
```

### Fix 2: Restore Missing Steps to hearing-lifecycle-tour (Optional)

The orphaned steps (`hl-next-hearing` and `hl-order`) appear to be legitimate steps that were accidentally displaced. These should be reintegrated into the `hearing-lifecycle-tour` before the closing bracket.

**Complete Corrected hearing-lifecycle-tour structure:**
```json
{
  "id": "hearing-lifecycle-tour",
  "title": "Hearing Lifecycle Management",
  ...
  "steps": [
    ... existing steps ...,
    {
      "id": "hl-outcome",
      "title": "Record Outcome",
      ...
    },
    {
      "id": "hl-next-hearing",
      "title": "Schedule Next Hearing",
      "content": "If adjourned, schedule next hearing from outcome form. This links hearings together and maintains continuity in case history.",
      "target": "[data-tour='next-hearing']",
      "placement": "right"
    },
    {
      "id": "hl-order",
      "title": "Upload Order",
      "content": "When order is passed, upload the order document immediately. Link it to this hearing for proper case history and timeline.",
      "target": "[data-tour='upload-order']",
      "placement": "left"
    }
  ]
},
```

---

## Technical Details

### Flow Diagram
```
User clicks "Start Tour"
         ↓
OnboardingWizard.handleStartTour(tourId)
         ↓
toursData.find(t => t.id === tourId)
         ↓
toursData is [] (empty due to JSON parse failure)
         ↓
tourData = undefined
         ↓
Shows "Tour Not Available" toast
```

### Why Step 1 Appeared to Work
The first step may have been cached in the browser or completed before the JSON corruption occurred. Browser caching of `/help/tours.json` can show stale (valid) data until cache expires.

---

## Files to Modify

| File | Change |
|------|--------|
| `public/help/tours.json` | Fix JSON structure at lines 1207-1228: remove orphaned fragments and properly close hearing-lifecycle-tour with its complete steps |

---

## Validation Steps

After the fix:
1. Hard refresh the browser (Ctrl+Shift+R) to clear cache
2. Navigate to Help → Get Started
3. Click "Start Tour" for "Case Management Basics" (Step 2)
4. Verify the tour launches successfully
5. Test "Start Tour" for all other steps (Daily Workflow, Hearing Management, etc.)

---

## Risk Assessment

| Risk | Mitigation |
|------|------------|
| Other JSON issues | Validate entire file with JSON linter after fix |
| Missing tour steps | Restore orphaned steps to their correct position |
| Cache issues | Instruct users to hard refresh browser |

**Impact:** All onboarding tours will work once JSON is valid. This is a critical fix affecting all users' onboarding experience.
