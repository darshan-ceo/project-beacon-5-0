# Task Bundle JSON Import Guide

## Overview
The Task Bundle Import feature allows you to import pre-configured task bundles from JSON files, enabling easy sharing and deployment of task automation workflows.

## JSON Format

### Structure
```json
{
  "bundle": {
    "bundleName": "Bundle Name",
    "trigger": "onCaseCreated",
    "stageScope": "Any",
    "bundleCode": "SAMPLE001",
    "linkedModule": "Case Management",
    "defaultPriority": "Medium",
    "status": "Draft",
    "bundleDescription": "Description of the bundle",
    "createdAt": "2025-10-08T00:00:00.000Z",
    "updatedAt": "2025-10-08T00:00:00.000Z"
  },
  "tasks": [
    {
      "id": "T-001",
      "title": "Task Title",
      "stage": "Notice Received",
      "priority": "High",
      "assignedRole": "Associate",
      "assignedUserEmail": "user@firm.com",
      "triggerType": "Auto",
      "triggerEvent": "onNoticeUpload",
      "estimatedHours": 2,
      "category": "Assessment",
      "description": "Task description",
      "checklist": [
        "Step 1",
        "Step 2"
      ],
      "dependencies": []
    }
  ]
}
```

## Field Mapping

### Bundle Fields (camelCase → snake_case)

| External JSON (camelCase) | Internal DB (snake_case) | Required | Description |
|---------------------------|--------------------------|----------|-------------|
| `bundleName` | `name` | ✅ | Bundle display name |
| `trigger` | `trigger` | ✅ | Trigger event type |
| `stageScope` | `stage_code` | ❌ | Stage scope (empty for "Any") |
| `bundleCode` | - | ❌ | External reference code |
| `linkedModule` | - | ❌ | Module association |
| `defaultPriority` | - | ❌ | Default task priority |
| `status` | `active` | ❌ | Active/Draft/Archived → boolean |
| `bundleDescription` | `description` | ❌ | Bundle description |

### Task Fields (camelCase → snake_case)

| External JSON (camelCase) | Internal DB (snake_case) | Required | Description |
|---------------------------|--------------------------|----------|-------------|
| `title` | `title` | ✅ | Task title |
| `stage` | `stage` | ❌ | Associated stage |
| `priority` | `priority` | ✅ | Low/Medium/High/Critical |
| `assignedRole` | `assigned_role` | ❌ | Role assignment |
| `assignedUserEmail` | `assigned_user` | ❌ | User email (stored as-is) |
| `triggerType` | `trigger_type` | ❌ | Auto/Manual |
| `triggerEvent` | `trigger_event` | ❌ | Event trigger name |
| `estimatedHours` | `estimated_hours` | ❌ | Time estimate |
| `category` | `category` | ❌ | Task category |
| `description` | `description` | ❌ | Task description |
| `checklist` | `checklist` | ❌ | Array of checklist items |
| `dependencies` | `dependencies` | ❌ | Array of dependency IDs |

## Field Defaults

When fields are omitted, the following defaults are applied:

### Bundle Defaults
- `stage_code`: `""` (empty for "Any Stage")
- `active`: `false` (if status is "Draft" or "Archived")
- `is_default`: `false`
- `execution_mode`: `"Sequential"`
- `version`: `1`
- `usage_count`: `0`

### Task Defaults
- `priority`: `"medium"`
- `assigned_role`: `""`
- `category`: `"General"`
- `stage`: `""`
- `trigger_type`: `"Manual"`
- `trigger_event`: `""`
- `assigned_user`: `""`
- `checklist`: `[]`
- `dependencies`: `[]`
- `estimated_hours`: `undefined`

## Using the Import Feature

### Step 1: Access Import
1. Navigate to **Task Automation** page
2. Click the **Import JSON** button in the header

### Step 2: Get Template (Optional)
1. Click **Download Template** to get a sample JSON file
2. Or click **Copy Template** to copy to clipboard
3. Use this as a reference for your imports

### Step 3: Select JSON File
1. Click **Choose JSON File**
2. Select your `.json` file from the file system

### Step 4: Review Validation
The system will automatically validate your JSON and display:
- ✅ **Success**: Green check with summary
- ❌ **Errors**: Red X with specific error messages
- ⚠️ **Warnings**: Yellow alerts for non-critical issues

### Step 5: Preview (Optional)
- Click **Show Preview** to view the raw JSON
- Review the transformed data structure

### Step 6: Import
- Click **Import Bundle** to complete the import
- The bundle will be created with all tasks

## Validation Rules

### Required Fields
- Bundle: `bundleName`, `trigger`
- Task: `title`, `priority`

### Field Validation
- **Email**: Must be valid email format (if provided)
- **Priority**: Must be "Low", "Medium", "High", or "Critical"
- **TriggerType**: Must be "Auto" or "Manual"
- **Task IDs**: Must be unique within the bundle

### Business Logic Validation
- ⚠️ Warning if bundle has no tasks
- ⚠️ Warning if bundle has more than 50 tasks

## Example Use Cases

### 1. GST Litigation Flow
Import a complete workflow for GST litigation cases with tasks for each stage from ASMT-10 to hearing completion.

### 2. Notice Response Bundle
Pre-configured tasks for responding to tax notices with standard checklists and role assignments.

### 3. Hearing Preparation Bundle
Task sequences for preparing for hearings, including research, brief preparation, and client coordination.

## Troubleshooting

### Common Errors

#### "Invalid JSON format"
- **Cause**: File is not valid JSON
- **Fix**: Validate JSON using a tool like JSONLint

#### "Bundle name is required"
- **Cause**: Missing `bundleName` field
- **Fix**: Add `bundleName` to bundle object

#### "Duplicate task IDs found"
- **Cause**: Multiple tasks have the same `id`
- **Fix**: Ensure all task IDs are unique

#### "Invalid email address"
- **Cause**: `assignedUserEmail` is not a valid email
- **Fix**: Use proper email format or omit the field

### Tips
1. Start with the template and modify incrementally
2. Validate JSON syntax before importing
3. Test with a simple bundle first
4. Check console logs for detailed error messages

## Export Feature (Future)
The export feature allows you to export existing bundles to the external JSON format for sharing or backup.

## Technical Details

### Transformation Process
1. **Validation**: JSON structure is validated against zod schema
2. **Field Mapping**: camelCase fields are mapped to snake_case
3. **Default Values**: Missing fields are populated with defaults
4. **Database Insert**: Transformed data is inserted via TaskBundleRepository

### Security
- JSON files are processed entirely client-side
- No server upload required
- All data stays within the application

### Performance
- Large bundles (>50 tasks) may take a few seconds to import
- Validation is performed before transformation
- Transaction-based inserts ensure data integrity
