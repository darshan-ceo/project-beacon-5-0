# Template Builder 2.0 - User Guide

## Overview
Template Builder 2.0 is a unified document template authoring system that consolidates all template creation workflows into a single, powerful interface.

---

## 🎨 Key Features

### 1️⃣ Design Tab
**Rich Text Editor with Live Preview**

- **WYSIWYG Editor**: Full-featured text editor with formatting toolbar
- **Variable Insertion**: Click variables from the left sidebar to insert merge tags like `{{client.name}}`
- **Live Preview**: Toggle between Editor and Preview modes to see your document with mock data
- **Formatting Options**:
  - Bold, Italic, Underline
  - Bullet and numbered lists
  - Text alignment (left, center, right)
  - Tables
  - Undo/Redo

**Preview Mode**:
- Click "Preview Document" to see your template with sample data
- Headers, footers, watermarks, and branding are rendered
- Mock data automatically fills in all variables
- Preview shows actual page dimensions (A4/Letter)

---

### 2️⃣ Fields Tab
**Structured Field Management**

- **Field Library**: Browse and search available fields by category
  - Client fields (name, GSTIN, city, state)
  - Case fields (case number, status, stage)
  - Employee fields
  - Court fields
  - System fields (current date, current time)
  
- **Field Search**: Type to filter fields by name or description
- **Category Filters**: Filter by Client, Case, Employee, Court, or System
- **Add Fields**: Click the (+) button to add fields to your template
- **Selected Fields Panel**: View and manage all fields in your template

---

### 3️⃣ Branding Tab
**Customize Document Appearance**

**Logo Upload**:
- Upload company logo (PNG, JPG, SVG)
- Max file size: 2MB
- Logo appears in document header

**Header & Footer**:
- Company Header: Text displayed at top of document
- Company Footer: Text displayed at bottom of document

**Watermark**:
- Toggle watermark on/off
- Adjust opacity (0-100%)
- "CONFIDENTIAL" watermark displayed diagonally

**Design Settings**:
- Font Family: Inter, Roboto, Open Sans
- Primary Color: Brand color for headers and accents
- Accent Color: Secondary brand color

---

### 4️⃣ Output Settings Tab
**Configure Document Generation**

**Output Format**:
- PDF (recommended)
- DOCX (Microsoft Word)
- HTML (web format)

**Page Layout**:
- Orientation: Portrait or Landscape
- Page Size: A4, Letter, or Legal
- Margins: Adjust top, bottom, left, right (10-50mm)

**Document Elements**:
- ☑️ Include Header
- ☑️ Include Footer
- ☑️ Page Numbers

**Filename Pattern**:
- Use variables in filename: `${code}_${case.caseNumber}_${now:YYYYMMDD}.pdf`
- Supported placeholders:
  - `${code}` - Template code
  - `${case.*}` - Any case field
  - `${now:YYYYMMDD}` - Current date with format

---

### 5️⃣ Import/Export Tab
**Advanced Template Operations** (Admin Only)

#### Upload DOCX Template
**Feature**: Auto-detect variables from Word documents

**How to Use**:
1. Click "Choose File" and select a .docx file
2. System automatically scans for placeholders like `{{variable_name}}`
3. Detected variables are displayed with green badges
4. Variables can be mapped to system fields

**Supported Placeholders**:
- `{{client.name}}` → Client display name
- `{{case.caseNumber}}` → Case number
- `{{system.currentDate}}` → Current date

#### JSON Import/Export
**Export Template**:
- Click "Download JSON"
- Template configuration saved as JSON file
- Use for version control, backups, or sharing

**Import Template**:
- Click "Import JSON"
- Select previously exported .json file
- Template configuration restored
- Useful for migrating templates between environments

**JSON Structure**:
```json
{
  "templateCode": "GST_SCRUTINY_LETTER_01",
  "title": "GST Scrutiny Response Letter",
  "version": "1.0",
  "richContent": "<p>Dear {{client.name}}...</p>",
  "fields": [...],
  "variableMappings": {...},
  "branding": {...},
  "output": {...}
}
```

---

## 📋 Template Metadata

**Template Code**:
- Auto-generated or manually entered
- Click sparkle (✨) icon to auto-generate
- Format: `STAGE_TEMPLATE_XXXXXX`

**Template Title**:
- Human-readable name
- Example: "GST Scrutiny Response Letter"

**Stage**:
- Lifecycle stage: Scrutiny, Demand, Appeals, etc.
- Used for organizing templates

**Version**:
- Auto-incremented on save
- Format: 1.0, 1.1, 2.0, etc.

**Visibility**:
- **Admin**: Only administrators can view/use
- **Team**: All internal team members
- **All**: Including client portal users

---

## 🔐 RBAC & Permissions

### Access Control
- **Import/Export Tab**: Restricted to Admin users only
- **Template Creation**: Based on role permissions
- **Template Visibility**: Controlled by visibility setting

### Role Permissions
- **Admin**: Full access to all features
- **Manager**: Can create and edit team templates
- **Associate**: Can use templates, limited editing
- **Client**: View-only access to "All" visibility templates

---

## 🚀 Quick Start Guide

### Creating Your First Template

**Step 1: Open Template Builder**
1. Navigate to Documents → Form Templates
2. Click "Create Template" button

**Step 2: Set Metadata**
1. Enter Template Title
2. Auto-generate Template Code (click ✨)
3. Select Stage
4. Set Visibility

**Step 3: Design Content**
1. Use rich text editor to write template
2. Click variables from left sidebar to insert
3. Format text using toolbar
4. Click "Preview Document" to check

**Step 4: Add Branding (Optional)**
1. Go to Branding tab
2. Upload logo
3. Set header and footer
4. Choose colors and fonts

**Step 5: Configure Output**
1. Go to Output Settings tab
2. Select PDF format
3. Choose page size (A4)
4. Set margins
5. Enable header, footer, page numbers

**Step 6: Save Template**
1. Click "Save & Publish"
2. Template is now available for use

---

## 💡 Best Practices

### Variable Naming
✅ **Good**: `{{client.name}}`, `{{case.caseNumber}}`
❌ **Bad**: `{{n}}`, `{{x123}}`

Use descriptive, self-explanatory variable names.

### Content Structure
- Start with a clear heading
- Use bullet points for lists
- Include all necessary client/case information
- Add a professional closing

### Branding Consistency
- Use same logo across all templates
- Maintain consistent header/footer text
- Use brand colors (primary and accent)
- Choose one font family for all templates

### Testing Templates
1. Always preview before saving
2. Check all variables are populated correctly
3. Verify header and footer display properly
4. Test with actual case data before production use

---

## 🔍 Troubleshooting

### Variables Not Showing in Preview
- Ensure variable mappings are set correctly in Fields tab
- Check variable syntax: `{{variable.name}}`
- Verify mock data includes the referenced field

### DOCX Upload Failed
- File must be .docx format (not .doc)
- File size must be under 10MB
- Ensure document contains valid placeholders

### JSON Import Error
- Verify JSON file structure matches template format
- Check for syntax errors in JSON
- Ensure all required fields are present

### Preview Not Rendering
- Check browser console for errors
- Verify rich content contains valid HTML
- Ensure branding settings are complete

---

## 📊 Seed Templates

Two sample templates are included for testing:

### GST_SCRUTINY_LETTER_01
**Purpose**: Scrutiny response letter
**Fields**: Client name, GSTIN, case number, notice details
**Branding**: H-Office Legal Team header

### GST_APPEAL_SUMMARY_02
**Purpose**: Appeal summary document
**Fields**: Client info, case details, court information
**Branding**: H-Office header with watermark

---

## 🛠️ Technical Details

### Supported Variable Types
- **String**: Text values (names, addresses)
- **Number**: Numeric values (amounts, IDs)
- **Date**: Date fields with formatting
- **System**: Auto-populated (current date, time)

### File Format Support
- **DOCX**: Upload and auto-detect variables
- **JSON**: Import/export template configuration
- **PDF**: Generated output format
- **HTML**: Web-based preview and export

### Browser Compatibility
- Chrome/Edge (recommended)
- Firefox
- Safari

---

## 📞 Support

For additional help:
- Check Help Center in application
- Review template examples
- Contact system administrator

---

**Version**: 2.0  
**Last Updated**: January 2025  
**Maintained By**: Beacon Development Team
