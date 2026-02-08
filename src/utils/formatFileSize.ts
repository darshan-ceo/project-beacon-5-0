/**
 * Format file size in human-readable units (B, KB, MB)
 * @param bytes - File size in bytes
 * @returns Formatted string like "3.9 KB", "800 B", or "2.4 MB"
 */
export function formatFileSize(bytes: number): string {
  if (bytes < 1024) {
    return `${bytes} B`;
  }
  if (bytes < 1024 * 1024) {
    return `${(bytes / 1024).toFixed(1)} KB`;
  }
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}
