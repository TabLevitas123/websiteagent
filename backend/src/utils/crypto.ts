import crypto from 'crypto';
import bcrypt from 'bcrypt';
import { promisify } from 'util';

const randomBytes = promisify(crypto.randomBytes);
const SALT_ROUNDS = 10;

export async function hashPassword(password: string): Promise<string> {
  return bcrypt.hash(password, SALT_ROUNDS);
}

export async function validatePassword(password: string, hash: string): Promise<boolean> {
  return bcrypt.compare(password, hash);
}

export async function generateSecureId(length: number = 32): Promise<string> {
  const bytes = await randomBytes(length);
  return bytes.toString('hex');
}

export async function generateSalt(): Promise<string> {
  return bcrypt.genSalt(SALT_ROUNDS);
}

export function hashData(data: string): string {
  return crypto.createHash('sha256').update(data).digest('hex');
}

export async function generateSecureToken(length: number = 32): Promise<string> {
  const bytes = await randomBytes(length);
  return bytes.toString('base64').replace(/[+/=]/g, '');
}

export function encryptData(data: string, key: string): string {
  const iv = crypto.randomBytes(16);
  const cipher = crypto.createCipheriv('aes-256-gcm', Buffer.from(key, 'hex'), iv);
  
  let encrypted = cipher.update(data, 'utf8', 'hex');
  encrypted += cipher.final('hex');
  
  const authTag = cipher.getAuthTag();
  return `${iv.toString('hex')}:${encrypted}:${authTag.toString('hex')}`;
}

export function decryptData(encryptedData: string, key: string): string {
  const [ivHex, encrypted, authTagHex] = encryptedData.split(':');
  
  const iv = Buffer.from(ivHex, 'hex');
  const authTag = Buffer.from(authTagHex, 'hex');
  const decipher = crypto.createDecipheriv('aes-256-gcm', Buffer.from(key, 'hex'), iv);
  
  decipher.setAuthTag(authTag);
  let decrypted = decipher.update(encrypted, 'hex', 'utf8');
  decrypted += decipher.final('utf8');
  
  return decrypted;
}
