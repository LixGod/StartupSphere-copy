import crypto from "crypto"

const ENCRYPTION_KEY = process.env.ENCRYPTION_KEY || "" // Must be 32 bytes
const IV_LENGTH = 12 // For AES-256-GCM

/**
 * Encrypts a string using AES-256-GCM
 */
export function encrypt(text: string): string {
  if (!ENCRYPTION_KEY || ENCRYPTION_KEY.length !== 32) {
    throw new Error("Invalid ENCRYPTION_KEY. Must be 32 characters.")
  }

  const iv = crypto.randomBytes(IV_LENGTH)
  const cipher = crypto.createCipheriv("aes-256-gcm", Buffer.from(ENCRYPTION_KEY), iv)
  
  let encrypted = cipher.update(text, "utf8", "hex")
  encrypted += cipher.final("hex")
  
  const authTag = cipher.getAuthTag().toString("hex")
  
  // Return IV + AuthTag + EncryptedText
  return `${iv.toString("hex")}:${authTag}:${encrypted}`
}

/**
 * Decrypts a string using AES-256-GCM
 */
export function decrypt(hash: string): string {
  if (!ENCRYPTION_KEY || ENCRYPTION_KEY.length !== 32) {
    throw new Error("Invalid ENCRYPTION_KEY. Must be 32 characters.")
  }

  const [ivHex, authTagHex, encryptedText] = hash.split(":")
  
  const iv = Buffer.from(ivHex, "hex")
  const authTag = Buffer.from(authTagHex, "hex")
  const decipher = crypto.createDecipheriv("aes-256-gcm", Buffer.from(ENCRYPTION_KEY), iv)
  
  decipher.setAuthTag(authTag)
  
  let decrypted = decipher.update(encryptedText, "hex", "utf8")
  decrypted += decipher.final("utf8")
  
  return decrypted
}
