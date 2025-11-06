# UI State Migration Guide

## Overview

This guide explains how to migrate from localStorage-based UI state management to Supabase-backed state management.

## Why Migrate?

### Problems with localStorage:
- ❌ Limited to single device
- ❌ Cleared when browser cache is cleared
- ❌ No sync across browsers/devices
- ❌ No backup/recovery
- ❌ No versioning

### Benefits of Supabase UI State:
- ✅ Syncs across all devices
- ✅ Persistent and backed up
- ✅ Survives browser cache clears
- ✅ Tenant-scoped security
- ✅ Audit trail (updated_by, updated_at)
- ✅ Type-safe with TypeScript

## Migration Steps

### 1. Use the Migration Panel

Navigate to Admin → Settings → UI State Migration and click "Start Migration". This will automatically:
- Read all UI preferences from localStorage
- Save them to Supabase system_settings table
- Remove them from localStorage
- Mark migration as complete

### 2. Update Components

#### Before (localStorage):
```typescript
const MyComponent = () => {
  const [filters, setFilters] = useState(() => {
    const saved = localStorage.getItem('case_filters');
    return saved ? JSON.parse(saved) : {};
  });

  useEffect(() => {
    localStorage.setItem('case_filters', JSON.stringify(filters));
  }, [filters]);

  return <div>...</div>;
};
```

#### After (Supabase):
```typescript
import { useUIState } from '@/hooks/useUIState';

const MyComponent = () => {
  const [filters, setFilters, isLoading] = useUIState(
    'ui.cases.filters',
    {},
    { category: 'filters', description: 'Case filters' }
  );

  if (isLoading) return <div>Loading...</div>;

  return <div>...</div>;
};
```

## API Reference

### `useUIState` Hook

```typescript
const [value, setValue, isLoading] = useUIState<T>(
  key: string,
  defaultValue: T,
  options?: {
    category?: UIStateCategory;
    description?: string;
  }
);
```

**Parameters:**
- `key` - Unique identifier for the setting (use dot notation: 'ui.module.setting')
- `defaultValue` - Default value if not set
- `options.category` - One of: 'filters', 'preferences', 'view_settings', 'column_visibility', 'sort_settings', 'layout'
- `options.description` - Human-readable description

**Returns:**
- `value` - Current value
- `setValue` - Function to update value (async)
- `isLoading` - Loading state

### `useUIStateCategory` Hook

For managing multiple related settings:

```typescript
const [values, updateValue, isLoading] = useUIStateCategory('filters');

// values = { 'ui.cases.status': 'active', 'ui.cases.priority': 'high' }
await updateValue('ui.cases.status', 'closed');
```

### Direct Service Usage

```typescript
import { uiStateService } from '@/services/UIStateService';

// Get value
const value = await uiStateService.get('ui.theme.dark_mode');

// Set value
await uiStateService.set('ui.theme.dark_mode', true, {
  category: 'preferences'
});

// Remove value
await uiStateService.remove('ui.theme.dark_mode');

// Get by category
const filters = await uiStateService.getByCategory('filters');

// Clear all
await uiStateService.clearAll('filters');
```

## Naming Conventions

Use dot notation for keys:
- `ui.{module}.{setting}`
- Examples:
  - `ui.cases.filters`
  - `ui.cases.sort`
  - `ui.dashboard.widgets`
  - `ui.layout.sidebar_collapsed`
  - `ui.theme.dark_mode`

## Categories

Choose appropriate category for each setting:

| Category | Use Case | Examples |
|----------|----------|----------|
| `filters` | Data filtering | Case status, priority filters |
| `preferences` | User preferences | Theme, language, notifications |
| `view_settings` | View modes | List/grid view, density |
| `column_visibility` | Table columns | Which columns to show |
| `sort_settings` | Sorting | Sort field, direction |
| `layout` | Layout state | Sidebar, panel positions |

## Security

- All settings are tenant-scoped (multi-tenancy safe)
- RLS policies ensure users can only access their tenant's settings
- Admin-only settings should use different mechanisms
- Never store sensitive data (passwords, tokens) in UI state

## Best Practices

1. **Use descriptive keys** - `ui.cases.filters` not `cf`
2. **Provide descriptions** - Helps with debugging and auditing
3. **Choose correct category** - Makes bulk operations easier
4. **Use TypeScript types** - `useUIState<MyType>(...)`
5. **Handle loading state** - UI state is async
6. **Set sensible defaults** - Don't assume values exist
7. **Clean up on logout** - Call `clearAll()` if needed

## Common Patterns

### Debounced Updates
```typescript
const [search, setSearch] = useUIState('ui.cases.search', '');

const debouncedUpdate = useMemo(
  () => debounce((value: string) => setSearch(value), 500),
  [setSearch]
);

<input onChange={(e) => debouncedUpdate(e.target.value)} />
```

### Complex Objects
```typescript
interface CaseFilters {
  status?: string[];
  priority?: string[];
  dateRange?: { start: Date; end: Date };
}

const [filters, setFilters] = useUIState<CaseFilters>(
  'ui.cases.filters',
  {},
  { category: 'filters' }
);

// Update partial
setFilters({ ...filters, status: ['active', 'pending'] });
```

### Conditional Loading
```typescript
const [filters, setFilters, isLoading] = useUIState('ui.cases.filters', {});

if (isLoading) {
  return <Skeleton />;
}

return <FilteredCaseList filters={filters} />;
```

## Troubleshooting

### Values not saving
- Check authentication (user must be logged in)
- Verify tenant_id is set
- Check browser console for errors
- Ensure RLS policies allow insert/update

### Values not loading
- Check if migration completed
- Verify key matches exactly
- Check category is correct
- Look for errors in console

### Migration failed
- Check localStorage has data to migrate
- Ensure you're logged in
- Check tenant_id exists
- Review error messages in migration result

## Migration Checklist

- [ ] Run UI State Migration from admin panel
- [ ] Verify migration completed successfully
- [ ] Update components to use `useUIState` hook
- [ ] Remove old localStorage code
- [ ] Test all UI preferences work correctly
- [ ] Test across multiple devices/browsers
- [ ] Update documentation
- [ ] Train users on new functionality

## Support

For issues or questions:
1. Check console errors
2. Review this guide
3. Check Supabase system_settings table
4. Contact support with error details
