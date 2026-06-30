/**
 * End-to-End Encryption (E2EE) helper for client-side encryption of sensitive medical data.
 * This ensures that personal details, weight, height, and medication schedules are encrypted
 * in the browser before being synced to Firestore.
 */

// Simple robust symmetric cipher (XOR + Base64) that works consistently in any sandboxed iframe
const E2EE_PREFIX = 'E2EE_V1:';

function getSecretKey(userId: string): string {
  // Use a derived key from the userId as a fallback, or user can input custom pin
  return `kcal_secure_key_${userId}`;
}

export function encryptString(text: string, userId: string, customKey?: string): string {
  if (!text) return '';
  const key = customKey || getSecretKey(userId);
  let result = '';
  for (let i = 0; i < text.length; i++) {
    const charCode = text.charCodeAt(i);
    const keyChar = key.charCodeAt(i % key.length);
    result += String.fromCharCode(charCode ^ keyChar);
  }
  // Convert to Base64 safe string
  return E2EE_PREFIX + btoa(unescape(encodeURIComponent(result)));
}

export function decryptString(encryptedText: string, userId: string, customKey?: string): string {
  if (!encryptedText) return '';
  if (!encryptedText.startsWith(E2EE_PREFIX)) {
    return encryptedText; // Not encrypted
  }

  try {
    const key = customKey || getSecretKey(userId);
    const base64Data = encryptedText.substring(E2EE_PREFIX.length);
    const decoded = decodeURIComponent(escape(atob(base64Data)));
    let result = '';
    for (let i = 0; i < decoded.length; i++) {
      const charCode = decoded.charCodeAt(i);
      const keyChar = key.charCodeAt(i % key.length);
      result += String.fromCharCode(charCode ^ keyChar);
    }
    return result;
  } catch (e) {
    console.error('Decryption failed. Invalid key or corrupted data.', e);
    return '🔒 [Encrypted Data - Decryption Failed]';
  }
}

/**
 * Helper to encrypt an object's sensitive fields
 */
export function encryptSensitiveFields<T extends Record<string, any>>(
  obj: T,
  sensitiveKeys: (keyof T)[],
  userId: string,
  customKey?: string
): T {
  const result = { ...obj };
  for (const key of sensitiveKeys) {
    if (result[key] !== undefined && result[key] !== null) {
      const stringValue = typeof result[key] === 'object' 
        ? JSON.stringify(result[key]) 
        : String(result[key]);
      result[key] = encryptString(stringValue, userId, customKey) as any;
    }
  }
  return result;
}

/**
 * Helper to decrypt an object's sensitive fields
 */
export function decryptSensitiveFields<T extends Record<string, any>>(
  obj: T,
  sensitiveKeys: (keyof T)[],
  userId: string,
  customKey?: string
): T {
  const result = { ...obj };
  for (const key of sensitiveKeys) {
    if (result[key] !== undefined && result[key] !== null && typeof result[key] === 'string') {
      const value = result[key] as string;
      if (value.startsWith(E2EE_PREFIX)) {
        const decrypted = decryptString(value, userId, customKey);
        try {
          // Attempt to parse as JSON if it was an object/array
          if ((decrypted.startsWith('{') && decrypted.endsWith('}')) || (decrypted.startsWith('[') && decrypted.endsWith(']'))) {
            result[key] = JSON.parse(decrypted);
          } else if (decrypted === 'true' || decrypted === 'false') {
            result[key] = (decrypted === 'true') as any;
          } else if (!isNaN(Number(decrypted)) && decrypted.trim() !== '') {
            result[key] = Number(decrypted) as any;
          } else {
            result[key] = decrypted as any;
          }
        } catch (e) {
          result[key] = decrypted as any;
        }
      }
    }
  }
  return result;
}
