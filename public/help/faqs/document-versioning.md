# Document Versioning Guide

## How Document Versioning Works

Project Beacon automatically tracks versions when you upload documents with the same name. This ensures you always have access to previous versions while working with the latest.

---

## Version Control Basics

### Automatic Versioning
When you upload a file with the same name as an existing document:
1. System detects the duplicate name
2. Creates a new version (v2, v3, etc.)
3. Marks the new upload as "Latest Version"
4. Previous version is preserved and accessible

### Version Indicators
- **Latest**: Blue badge, shown by default in lists
- **Previous**: Grayed, accessible via version history
- **Version Number**: Shown as v1, v2, v3, etc.

---

## Frequently Asked Questions

### How do I upload a new version of a document?

1. Navigate to the document or its folder
2. Click **Upload** (or drag and drop)
3. Select a file with the **same name** as the existing document
4. System prompts: "Create new version?"
5. Confirm to create version 2

Alternatively:
1. Click on the existing document
2. Select **Upload New Version** from the menu
3. Select the new file (name doesn't need to match)

### Can I view previous versions?

Yes! 
1. Click on the document
2. Select **Version History** from the menu
3. See all versions with upload dates and who uploaded
4. Click any version to view or download

### How do I restore a previous version?

1. Open **Version History**
2. Find the version you want to restore
3. Click **Restore This Version**
4. Confirm the action

This creates a NEW version (doesn't delete the current one). The restored content becomes the latest version.

### Can I compare two versions?

Side-by-side comparison is not built-in, but you can:
1. Download both versions
2. Use external comparison tools (for text documents)
3. Open both in separate tabs

### What happens when I delete a document?

- If you delete the latest version, the previous version becomes "Latest"
- If you delete all versions, the document is fully removed
- Deleted documents go to Trash (recoverable for 30 days)

### Is there a version limit?

No hard limit, but consider:
- Storage usage increases with each version
- Very old versions may be archived
- Regular cleanup is recommended

### Can I add notes to a version?

Yes! When uploading a new version:
1. The upload form includes a "Change Notes" field
2. Describe what changed in this version
3. Notes appear in Version History

### How do I prevent accidental overwrites?

- Use unique filenames for different documents
- Enable "Confirm Version" prompt in settings
- Review before confirming version creation

---

## Best Practices

1. **Meaningful filenames**: Include version or date in filename for clarity
2. **Add change notes**: Always describe what's different in each version
3. **Regular cleanup**: Archive or delete obsolete versions periodically
4. **Before hearings**: Verify you're sharing the LATEST version
5. **Major changes**: Consider creating a new document instead of version

---

## Version Naming Convention

Recommended naming pattern:
```
{DocumentType}_{CaseRef}_{YYYYMMDD}.pdf

Examples:
- Reply_GST2025001_20250115.pdf
- Notice_GST2025001_20250110.pdf
- Annexure_A_GST2025001_20250115.pdf
```

---

**Related Articles:**
- [Document Management Guide](/help/pages/documents)
- [File Upload Best Practices](/help/articles/file-uploads)
- [Document Categorization](/help/articles/document-categories)
