import crypto from 'crypto';

const ALGORITHM = 'aes-256-gcm';
const IV_LENGTH = 16;
const TAG_LENGTH = 16;

/**
 * Normalizes the encryption key to exactly 32 bytes (256 bits).
 * This ensures that even if the .env key is too short or not hex, it still works.
 */
function getSecureKey(secret) {
  return crypto.createHash('sha256').update(String(secret)).digest();
}

/**
 * Encrypts text using AES-256-GCM
 */
export function encrypt(text) {
  if (!text) return null;
  
  const secret = process.env.ENCRYPTION_KEY || 'startup_sphere_default_secret_key_32';
  const key = getSecureKey(secret);

  const iv = crypto.randomBytes(IV_LENGTH);
  const cipher = crypto.createCipheriv(ALGORITHM, key, iv);
  
  let encrypted = cipher.update(text, 'utf8', 'hex');
  encrypted += cipher.final('hex');
  
  const tag = cipher.getAuthTag();
  
  // Return format: iv:tag:encrypted
  return `${iv.toString('hex')}:${tag.toString('hex')}:${encrypted}`;
}

/**
 * Decrypts text using AES-256-GCM
 */
export function decrypt(encryptedData) {
  if (!encryptedData) return null;
  
  const secret = process.env.ENCRYPTION_KEY || 'startup_sphere_default_secret_key_32';
  const key = getSecureKey(secret);

  try {
    const [ivHex, tagHex, encryptedText] = encryptedData.split(':');
    if (!ivHex || !tagHex || !encryptedText) return encryptedData; // Fallback for plaintext

    const iv = Buffer.from(ivHex, 'hex');
    const tag = Buffer.from(tagHex, 'hex');
    const decipher = crypto.createDecipheriv(ALGORITHM, key, iv);
    
    decipher.setAuthTag(tag);
    
    let decrypted = decipher.update(encryptedText, 'hex', 'utf8');
    decrypted += decipher.final('utf8');
    
    return decrypted;
  } catch (err) {
    console.error('Decryption failed:', err.message);
    return encryptedData; // Return as-is if decryption fails
  }
}

