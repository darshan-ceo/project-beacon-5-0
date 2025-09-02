// Frontend-only secrets service using encrypted localStorage
// For production, this should be moved to a secure backend

interface EncryptedData {
  iv: string;
  data: string;
}

class SecretsService {
  private readonly keyPrefix = 'beacon_secrets_';
  private readonly encryptionKey: string;

  constructor() {
    // Generate or retrieve encryption key for this browser session
    // In production, this should use a more secure key derivation method
    this.encryptionKey = this.getOrCreateEncryptionKey();
  }

  private getOrCreateEncryptionKey(): string {
    const keyName = 'beacon_enc_key';
    let key = localStorage.getItem(keyName);
    if (!key) {
      // Generate a simple key for demo purposes
      // In production, use proper key derivation with user credentials
      key = btoa(Math.random().toString(36).substring(2, 15) + Date.now().toString(36));
      localStorage.setItem(keyName, key);
    }
    return key;
  }

  private encrypt(text: string): EncryptedData {
    // Simple XOR encryption for demo purposes
    // In production, use Web Crypto API with AES-GCM
    const iv = Math.random().toString(36).substring(2, 15);
    let encrypted = '';
    for (let i = 0; i < text.length; i++) {
      const keyChar = this.encryptionKey.charCodeAt(i % this.encryptionKey.length);
      const textChar = text.charCodeAt(i);
      encrypted += String.fromCharCode(textChar ^ keyChar);
    }
    return {
      iv,
      data: btoa(encrypted)
    };
  }

  private decrypt(encryptedData: EncryptedData): string {
    // Simple XOR decryption for demo purposes
    const encrypted = atob(encryptedData.data);
    let decrypted = '';
    for (let i = 0; i < encrypted.length; i++) {
      const keyChar = this.encryptionKey.charCodeAt(i % this.encryptionKey.length);
      const encChar = encrypted.charCodeAt(i);
      decrypted += String.fromCharCode(encChar ^ keyChar);
    }
    return decrypted;
  }

  set(key: string, value: string): void {
    const encrypted = this.encrypt(value);
    localStorage.setItem(this.keyPrefix + key, JSON.stringify(encrypted));
  }

  get(key: string): string | null {
    const stored = localStorage.getItem(this.keyPrefix + key);
    if (!stored) return null;
    
    try {
      const encryptedData = JSON.parse(stored) as EncryptedData;
      return this.decrypt(encryptedData);
    } catch (error) {
      console.error('Failed to decrypt secret:', error);
      return null;
    }
  }

  remove(key: string): void {
    localStorage.removeItem(this.keyPrefix + key);
  }

  exists(key: string): boolean {
    return localStorage.getItem(this.keyPrefix + key) !== null;
  }

  // Clear all secrets for an organization
  clearOrgSecrets(orgId: string): void {
    const prefix = `${this.keyPrefix}calendar.${orgId}.`;
    Object.keys(localStorage).forEach(key => {
      if (key.startsWith(prefix)) {
        localStorage.removeItem(key);
      }
    });
  }
}

export const secretsService = new SecretsService();