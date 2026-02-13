

# Fix: "View Documents" Should Filter by Selected Case

## Problem

When clicking "View Documents" on a specific case in the Client Portal, the Documents tab shows all documents instead of filtering to only that case's documents. This happens because `ClientPortal.tsx` stores the selected case ID in its own state but never passes it down to `ClientDocumentLibrary`.

## Solution

A simple prop-threading fix across two files:

### 1. `ClientDocumentLibrary.tsx`
- Add an optional `initialCaseId` prop to the component interface
- Initialize the internal `selectedCaseId` state from this prop instead of always defaulting to `'all'`
- When `initialCaseId` changes (e.g., user clicks "View Documents" on a different case), update the internal state accordingly via a `useEffect`

### 2. `ClientPortal.tsx`
- Pass the parent's `selectedCaseId` to `ClientDocumentLibrary` as the new `initialCaseId` prop

## Technical Details

**`src/components/portal/ClientDocumentLibrary.tsx`**

```typescript
interface ClientDocumentLibraryProps {
  clientId: string;
  cases?: Case[];
  initialCaseId?: string | null; // NEW
}

// Initialize from prop
const [selectedCaseId, setSelectedCaseId] = useState<string>(
  initialCaseId || 'all'
);

// Sync when prop changes
useEffect(() => {
  if (initialCaseId) {
    setSelectedCaseId(initialCaseId);
  }
}, [initialCaseId]);
```

**`src/components/portal/ClientPortal.tsx`**

```tsx
<ClientDocumentLibrary 
  clientId={clientId} 
  cases={clientCases.map(c => ({ id: c.id, case_number: c.case_number, title: c.title }))}
  initialCaseId={selectedCaseId}  // NEW
/>
```

The user can still switch to "All Cases" using the existing dropdown filter. This change only sets the initial filter when navigating from a specific case.

| File | Change |
|------|--------|
| `src/components/portal/ClientDocumentLibrary.tsx` | Add `initialCaseId` prop, sync internal state |
| `src/components/portal/ClientPortal.tsx` | Pass `selectedCaseId` to document library |

