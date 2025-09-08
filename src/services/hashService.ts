// File hash and duplication checking service
export class HashService {
  private static fileHashes = new Map<string, string>();
  
  // Generate simple hash from file content and metadata
  static async generateFileHash(file: File): Promise<string> {
    const buffer = await file.arrayBuffer();
    const hashBuffer = await crypto.subtle.digest('SHA-256', buffer);
    const hashArray = Array.from(new Uint8Array(hashBuffer));
    const hashHex = hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
    
    // Combine with filename and size for better uniqueness
    const metadata = `${file.name}-${file.size}-${file.lastModified}`;
    const metaHash = btoa(metadata).replace(/[^a-zA-Z0-9]/g, '');
    
    return `${hashHex.substring(0, 16)}-${metaHash.substring(0, 8)}`;
  }
  
  // Check if file already exists
  static async checkDuplicate(file: File, existingDocuments: any[]): Promise<{
    isDuplicate: boolean;
    existingDoc?: any;
    hash: string;
  }> {
    const hash = await this.generateFileHash(file);
    
    // Check against existing documents
    const duplicate = existingDocuments.find(doc => 
      doc.name === file.name && 
      doc.size === file.size
    );
    
    return {
      isDuplicate: !!duplicate,
      existingDoc: duplicate,
      hash
    };
  }
  
  // Get suggested version name
  static getVersionedName(originalName: string, existingDocuments: any[]): string {
    const nameWithoutExt = originalName.substring(0, originalName.lastIndexOf('.'));
    const extension = originalName.substring(originalName.lastIndexOf('.'));
    
    const versionPattern = new RegExp(`^${nameWithoutExt}( v\\d+)?${extension}$`);
    const existingVersions = existingDocuments
      .filter(doc => versionPattern.test(doc.name))
      .map(doc => {
        const match = doc.name.match(/ v(\d+)/);
        return match ? parseInt(match[1]) : 1;
      });
    
    const nextVersion = existingVersions.length > 0 ? Math.max(...existingVersions) + 1 : 2;
    return `${nameWithoutExt} v${nextVersion}${extension}`;
  }
}