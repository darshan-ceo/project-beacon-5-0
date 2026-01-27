

# Fix: DOCX Files Showing Folder Icon Instead of Document Icon

## Problem

In Document Management, DOCX files display a folder icon (📁) instead of a document-related icon. This happens because the `getFileIcon` function in multiple components doesn't include `'docx'` in its switch cases, causing it to fall through to the default case which returns a folder emoji.

## Root Cause

The `getFileIcon` function in `DocumentManagement.tsx` (line 204-213):

```typescript
const getFileIcon = (type: string) => {
  switch (type) {
    case 'pdf': return '📄';
    case 'doc': return '📝';      // ← Only 'doc', missing 'docx'!
    case 'xlsx': return '📊';      // ← Only 'xlsx', missing 'xls'!
    case 'jpg':
    case 'png': return '🖼️';
    default: return '📁';          // ← Falls through to folder icon!
  }
};
```

The same issue exists in `RecentDocuments.tsx` (lines 21-34).

## Solution

Update the `getFileIcon` functions in affected components to:
1. Add `'docx'` case alongside `'doc'` 
2. Add `'xls'` case alongside `'xlsx'`
3. Add common file extensions like `'jpeg'`, `'gif'`, `'txt'`
4. Change the default fallback from folder (📁) to a generic document icon (📄)

---

## Files to Modify

### 1. `src/components/documents/DocumentManagement.tsx`

**Location:** Lines 204-213

Update the `getFileIcon` function:

```typescript
const getFileIcon = (type: string) => {
  const normalizedType = type?.toLowerCase() || '';
  switch (normalizedType) {
    case 'pdf': 
    case 'application/pdf':
      return '📄';
    case 'doc':
    case 'docx':
    case 'application/msword':
    case 'application/vnd.openxmlformats-officedocument.wordprocessingml.document':
      return '📝';
    case 'xls':
    case 'xlsx':
    case 'application/vnd.ms-excel':
    case 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet':
      return '📊';
    case 'ppt':
    case 'pptx':
    case 'application/vnd.ms-powerpoint':
    case 'application/vnd.openxmlformats-officedocument.presentationml.presentation':
      return '📽️';
    case 'jpg':
    case 'jpeg':
    case 'png':
    case 'gif':
    case 'webp':
    case 'image/jpeg':
    case 'image/png':
    case 'image/gif':
      return '🖼️';
    case 'txt':
    case 'text/plain':
      return '📋';
    default: 
      return '📄'; // Generic document icon, NOT folder
  }
};
```

### 2. `src/components/documents/RecentDocuments.tsx`

**Location:** Lines 21-34

Update the `getFileIcon` function with the same comprehensive mapping:

```typescript
const getFileIcon = (type: string) => {
  const normalizedType = type?.toLowerCase() || '';
  switch (normalizedType) {
    case 'pdf': 
    case 'application/pdf':
      return '📄';
    case 'doc':
    case 'docx':
    case 'application/msword':
    case 'application/vnd.openxmlformats-officedocument.wordprocessingml.document':
      return '📝';
    case 'xls':
    case 'xlsx':
    case 'application/vnd.ms-excel':
    case 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet':
      return '📊';
    case 'ppt':
    case 'pptx':
    case 'application/vnd.ms-powerpoint':
    case 'application/vnd.openxmlformats-officedocument.presentationml.presentation':
      return '📽️';
    case 'jpg':
    case 'jpeg':
    case 'png':
    case 'gif':
    case 'webp':
    case 'image/jpeg':
    case 'image/png':
    case 'image/gif':
      return '🖼️';
    case 'txt':
    case 'text/plain':
      return '📋';
    default: 
      return '📄'; // Generic document icon, NOT folder
  }
};
```

---

## File Type to Icon Mapping (After Fix)

| File Extension | MIME Type | Icon | Description |
|---------------|-----------|------|-------------|
| `.pdf` | application/pdf | 📄 | PDF document |
| `.doc`, `.docx` | application/msword, application/vnd.openxmlformats-officedocument.wordprocessingml.document | 📝 | Word document |
| `.xls`, `.xlsx` | application/vnd.ms-excel, application/vnd.openxmlformats-officedocument.spreadsheetml.sheet | 📊 | Excel spreadsheet |
| `.ppt`, `.pptx` | application/vnd.ms-powerpoint, application/vnd.openxmlformats-officedocument.presentationml.presentation | 📽️ | PowerPoint presentation |
| `.jpg`, `.jpeg`, `.png`, `.gif`, `.webp` | image/* | 🖼️ | Image |
| `.txt` | text/plain | 📋 | Text file |
| *Other/Unknown* | - | 📄 | Generic document |

---

## Expected Results After Fix

| File Type | Before | After |
|-----------|--------|-------|
| `.docx` | 📁 (folder) | 📝 (Word doc) |
| `.doc` | 📝 | 📝 (no change) |
| `.xlsx` | 📊 | 📊 (no change) |
| `.xls` | 📁 (folder) | 📊 (Excel) |
| `.pptx` | 📁 (folder) | 📽️ (PowerPoint) |
| Unknown type | 📁 (folder) | 📄 (document) |

---

## Testing Checklist

After implementation:
1. Upload a `.docx` file → Should display 📝 icon
2. Upload a `.doc` file → Should display 📝 icon
3. Upload a `.xlsx` file → Should display 📊 icon
4. Upload a `.xls` file → Should display 📊 icon
5. Upload a `.pptx` file → Should display 📽️ icon
6. Upload an unknown file type → Should display 📄 (not folder)
7. Check "Recent Documents" section → Same correct icons

