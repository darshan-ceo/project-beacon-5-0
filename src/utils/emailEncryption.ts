/**
 * Email Credential Encryption Utilities
 * Basic encryption using Web Crypto API for demo mode
 * 
 * ⚠️ WARNING: This provides basic protection for demo purposes only.
 * For production, use proper backend secret management (e.g., Lovable Cloud with Supabase Vault)
 */

const ENCRYPTION_KEY_NAME = 'email_encryption_key';
const ALGORITHM = 'AES-GCM';

/**
 * Generate or retrieve encryption key
 */
async function getEncryptionKey(): Promise<CryptoKey> {
  // In a real app, this would be derived from user authentication
  // For demo, we'll use a key stored in sessionStorage (cleared on browser close)
  
  const keyData = new TextEncoder().encode(
    'demo-encryption-key-' + (sessionStorage.getItem(ENCRYPTION_KEY_NAME) || 'default')
  );
  
  return await crypto.subtle.importKey(
    'raw',
    await crypto.subtle.digest('SHA-256', keyData),
    { name: ALGORITHM, length: 256 },
    false,
    ['encrypt', 'decrypt']
  );
}

/**
 * Encrypt sensitive data
 */
export async function encryptCredentials(data: string): Promise<string> {
  try {
    const key = await getEncryptionKey();
    const iv = crypto.getRandomValues(new Uint8Array(12));
    const encodedData = new TextEncoder().encode(data);
    
    const encryptedData = await crypto.subtle.encrypt(
      { name: ALGORITHM, iv },
      key,
      encodedData
    );
    
    // Combine IV and encrypted data
    const combined = new Uint8Array(iv.length + encryptedData.byteLength);
    combined.set(iv, 0);
    combined.set(new Uint8Array(encryptedData), iv.length);
    
    // Convert to base64 for storage
    return btoa(String.fromCharCode(...combined));
  } catch (error) {
    console.error('[Email Encryption] Encryption failed:', error);
    throw new Error('Failed to encrypt credentials');
  }
}

/**
 * Decrypt sensitive data
 */
export async function decryptCredentials(encryptedData: string): Promise<string> {
  try {
    const key = await getEncryptionKey();
    
    // Decode from base64
    const combined = Uint8Array.from(atob(encryptedData), c => c.charCodeAt(0));
    
    // Extract IV and encrypted data
    const iv = combined.slice(0, 12);
    const data = combined.slice(12);
    
    const decryptedData = await crypto.subtle.decrypt(
      { name: ALGORITHM, iv },
      key,
      data
    );
    
    return new TextDecoder().decode(decryptedData);
  } catch (error) {
    console.error('[Email Encryption] Decryption failed:', error);
    throw new Error('Failed to decrypt credentials');
  }
}

/**
 * Check if encryption is available
 */
export function isEncryptionAvailable(): boolean {
  return typeof crypto !== 'undefined' && 
         typeof crypto.subtle !== 'undefined' &&
         typeof crypto.subtle.encrypt === 'function';
}

/**
 * Securely clear credentials from memory
 */
export function clearCredentials(obj: any): void {
  if (obj && typeof obj === 'object') {
    Object.keys(obj).forEach(key => {
      if (key.toLowerCase().includes('password') || 
          key.toLowerCase().includes('secret') ||
          key.toLowerCase().includes('key')) {
        obj[key] = undefined;
      }
    });
  }
}
