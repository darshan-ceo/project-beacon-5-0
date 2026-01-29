

# Plan: Unify "Create New Task" UI with "Create New Case" Modal Pattern

## Current State Analysis

| Aspect | Create New Case | Create New Task (Current) |
|--------|-----------------|---------------------------|
| **Container** | `AdaptiveFormShell` (modal/overlay) | Full-page route layout |
| **Header** | Clean title with icon, X close button | Back arrow with inline title |
| **Content** | `Card` sections with icons and headers | Mixed divs, collapsibles, inline styling |
| **Footer** | Sticky footer via `AdaptiveFormShell` | Inline sticky div |
| **Navigation** | Modal close returns to previous view | Navigate away to `/tasks` |
| **Form Layout** | Organized into semantic Card groups | Scattered across styled divs |

## Solution Approach

### Option A: Convert to Modal-Based Flow
Keep CreateTask as a full-page route but wrap content in `AdaptiveFormShell` to achieve visual consistency. This approach:
- Preserves the `/tasks/new` route (for bookmarking, deep linking)
- Uses the same visual container as CaseModal
- Organizes fields into Card sections like CaseForm

### Architecture Decision

We will adopt **Option A** - wrapping the CreateTask page content in `AdaptiveFormShell` while keeping it as a route. This is consistent with the AFPA memory pattern and ensures uniform experience.

---

## Detailed Implementation

### File: `src/pages/CreateTask.tsx`

#### Change 1: Import AdaptiveFormShell and Card Components

Add imports for the adaptive shell and card components:

```typescript
import { AdaptiveFormShell } from '@/components/ui/adaptive-form-shell';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
```

#### Change 2: Replace Container Structure

**Before (current):**
```tsx
return (
  <div className="h-full flex flex-col bg-background">
    {/* Header - custom inline */}
    <div className="border-b bg-card px-3...">
      <Button variant="ghost" onClick={() => navigate('/tasks')}>
        <ArrowLeft />
      </Button>
      <h1>Create New Task</h1>
    </div>
    
    {/* Content - inline scroll container */}
    <div className="flex-1 overflow-auto bg-muted/20">
      <div className="max-w-2xl mx-auto p-4">
        {/* Mixed div sections */}
      </div>
    </div>
    
    {/* Footer - inline sticky */}
    <div className="border-t bg-card p-4">
      <Button>Create Task</Button>
    </div>
  </div>
);
```

**After:**
```tsx
return (
  <AdaptiveFormShell
    isOpen={true}
    onClose={() => navigate('/tasks')}
    title="Create New Task"
    icon={<FileText className="h-5 w-5" />}
    complexity="complex"
    footer={footer}
    dataTour="task-form"
  >
    {/* Content organized in Cards */}
    <TaskFormContent ... />
  </AdaptiveFormShell>
);
```

#### Change 3: Reorganize Form Content into Card Sections

Restructure the form content to match CaseForm's pattern:

| Card Section | Icon | Fields Included |
|--------------|------|-----------------|
| **Task Details** | `FileText` | Title, Description |
| **Case Linkage** (Optional) | `Link2` | Client selector, Case selector |
| **Assignment** | `User` | Assign To (with helper text), Category |
| **Scheduling** | `Calendar` | Due Date, Priority, Estimated Hours |
| **Attachments & Tags** | `Paperclip` | File upload, Tag selection |

#### Change 4: Update Field Labels and Helper Text

Following the approved plan from the previous task assignment work:
- Keep "Assign To" label with helper text "Who will complete this task?"
- Keep "Creating as" context badge at the top (move into form header or first Card)

#### Change 5: Define Footer Component

```typescript
const footer = (
  <div className="flex items-center justify-end gap-3 px-6 py-4">
    <Button type="button" variant="outline" onClick={() => navigate('/tasks')}>
      Cancel
    </Button>
    <Button 
      type="button" 
      onClick={handleSubmit} 
      disabled={isSubmitting || !formData.title.trim()}
    >
      {isSubmitting ? <><Loader2 className="mr-2 h-4 w-4 animate-spin" />Creating...</> : 'Create Task'}
    </Button>
  </div>
);
```

---

## Detailed Card Structure

### Card 1: Task Details
```tsx
<Card className="shadow-sm border">
  <CardHeader className="pb-4">
    <div className="flex items-center gap-2">
      <FileText className="h-5 w-5 text-primary" />
      <CardTitle className="text-base">Task Details</CardTitle>
    </div>
  </CardHeader>
  <CardContent className="space-y-4">
    {/* Creator context badge */}
    <div className="bg-muted/30 rounded-lg px-4 py-2 flex items-center gap-2 text-sm">
      <User className="h-4 w-4 text-muted-foreground" />
      <span className="text-muted-foreground">Creating as:</span>
      <span className="font-medium">{creatorName}</span>
      {creatorRole && <Badge variant="outline" className="text-xs">{creatorRole}</Badge>}
    </div>
    
    {/* Title */}
    <div className="space-y-2">
      <Label>Task Title <span className="text-destructive">*</span></Label>
      <Input value={formData.title} ... placeholder="What needs to be done?" />
    </div>
    
    {/* Description */}
    <div className="space-y-2">
      <Label>Description</Label>
      <Textarea value={formData.description} ... />
    </div>
  </CardContent>
</Card>
```

### Card 2: Case Linkage (Optional)
```tsx
<Card className="shadow-sm border">
  <CardHeader className="pb-4">
    <div className="flex items-center gap-2">
      <Link2 className="h-5 w-5 text-primary" />
      <CardTitle className="text-base">Link to Case (Optional)</CardTitle>
    </div>
  </CardHeader>
  <CardContent className="space-y-4">
    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
      {/* Client selector */}
      {/* Case selector */}
    </div>
    {/* Selected case context badge */}
  </CardContent>
</Card>
```

### Card 3: Assignment
```tsx
<Card className="shadow-sm border">
  <CardHeader className="pb-4">
    <div className="flex items-center gap-2">
      <User className="h-5 w-5 text-primary" />
      <CardTitle className="text-base">Assignment</CardTitle>
    </div>
  </CardHeader>
  <CardContent className="space-y-4">
    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
      {/* Assign To with EmployeeCombobox */}
      <div className="space-y-2">
        <Label>Assign To</Label>
        <EmployeeCombobox ... />
        <p className="text-xs text-muted-foreground">
          Who will complete this task? Can include managers, partners, or admins.
        </p>
      </div>
      
      {/* Category */}
      <div className="space-y-2">
        <Label>Category</Label>
        <Select ... />
      </div>
    </div>
  </CardContent>
</Card>
```

### Card 4: Scheduling
```tsx
<Card className="shadow-sm border">
  <CardHeader className="pb-4">
    <div className="flex items-center gap-2">
      <Calendar className="h-5 w-5 text-primary" />
      <CardTitle className="text-base">Scheduling</CardTitle>
    </div>
  </CardHeader>
  <CardContent className="space-y-4">
    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
      {/* Due Date */}
      {/* Priority (badge selector) */}
      {/* Estimated Hours */}
    </div>
  </CardContent>
</Card>
```

### Card 5: Attachments & Tags
```tsx
<Card className="shadow-sm border">
  <CardHeader className="pb-4">
    <div className="flex items-center gap-2">
      <Paperclip className="h-5 w-5 text-primary" />
      <CardTitle className="text-base">Attachments & Tags</CardTitle>
    </div>
  </CardHeader>
  <CardContent className="space-y-4">
    {/* Tags selection */}
    <div className="space-y-2">
      <Label className="flex items-center gap-2">
        <Tag className="h-4 w-4" /> Tags
      </Label>
      <div className="flex flex-wrap gap-2">
        {DEFAULT_TAGS.map(...)}
      </div>
    </div>
    
    {/* File upload */}
    <div className="space-y-2">
      {/* Attachment list and upload button */}
    </div>
  </CardContent>
</Card>
```

---

## Template Button Handling

The "Use Template" button currently lives in the header. We have two options:

**Option 1**: Move to top of first Card as a secondary action
```tsx
<Card>
  <CardHeader className="pb-4">
    <div className="flex items-center justify-between">
      <div className="flex items-center gap-2">
        <FileText className="h-5 w-5 text-primary" />
        <CardTitle className="text-base">Task Details</CardTitle>
      </div>
      <Button variant="outline" size="sm" onClick={() => setShowTemplatePicker(true)}>
        <Sparkles className="h-4 w-4 mr-1" /> Use Template
      </Button>
    </div>
  </CardHeader>
  ...
</Card>
```

**Option 2**: Pass as description/action in AdaptiveFormShell

We will use **Option 1** for cleaner integration with the Card-based layout.

---

## File Modifications Summary

| File | Changes |
|------|---------|
| `src/pages/CreateTask.tsx` | Replace full-page layout with `AdaptiveFormShell`, reorganize content into Card sections |

---

## Visual Comparison

```text
BEFORE (CreateTask):                    AFTER (Unified):
┌─────────────────────────┐            ┌─────────────────────────┐
│ ← Create New Task   📄  │            │                         │
│ Creating as: Admin      │            │ ┌─────────────────────┐ │
├─────────────────────────┤            │ │ 📄 Create New Task X │ │
│ ┌─Link to Case────────┐ │            │ ├─────────────────────┤ │
│ │ Client | Case       │ │            │ │ Card: Task Details  │ │
│ └─────────────────────┘ │            │ │ Creating as: Admin  │ │
│                         │            │ │ Title: ___________  │ │
│ ┌─Main Form Card──────┐ │            │ │ Description: ______ │ │
│ │ Title               │ │            │ ├─────────────────────┤ │
│ │ Description         │ │            │ │ Card: Link to Case  │ │
│ └─────────────────────┘ │            │ │ Client | Case       │ │
│                         │            │ ├─────────────────────┤ │
│ ┌─Task Settings───────┐ │            │ │ Card: Assignment    │ │
│ │ Assign|Cat|Pri|Hours│ │            │ │ Assign To | Category│ │
│ └─────────────────────┘ │            │ ├─────────────────────┤ │
│                         │            │ │ Card: Scheduling    │ │
│ ┌─Tags────────────────┐ │            │ │ Due | Priority | Hr │ │
│ │ [Tag] [Tag] [Tag]   │ │            │ ├─────────────────────┤ │
│ └─────────────────────┘ │            │ │ Card: Attachments   │ │
│                         │            │ │ Tags + Files        │ │
│ ┌─Attachments─────────┐ │            │ └─────────────────────┘ │
│ │ Click to attach     │ │            ├─────────────────────────┤
│ └─────────────────────┘ │            │ [Cancel]   [Create Task]│
├─────────────────────────┤            └─────────────────────────┘
│ [Cancel]   [Create Task]│
└─────────────────────────┘
```

---

## Testing Checklist

1. Open `/tasks/new` on desktop - verify full-page overlay appears (like CaseModal)
2. Open on tablet - verify large slide-over drawer
3. Open on mobile - verify full-screen modal
4. Verify "Use Template" button works in new location
5. Verify Case linkage (Client/Case selectors) work correctly
6. Verify form submission creates task successfully
7. Verify Cancel closes the shell and navigates back to `/tasks`
8. Compare visual appearance with CaseModal for consistency
9. Test keyboard navigation (Escape to close)
10. Verify responsive behavior of Card sections

