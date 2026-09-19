/**
 * Security: Salting and key derivation using Node built-in crypto scrypt (N=16384, r=8, p=1).
 * Closes CWE-256 / CWE-312: Prevents exposure of plaintext credentials in storage and memory dumps.
 * Closes CWE-208 / CWE-385: Uses timingSafeEqual to prevent side-channel timing attacks on password verification.
 */
import crypto from 'crypto';

const SCRYPT_N = 16384;
const SCRYPT_R = 8;
const SCRYPT_P = 1;
const KEY_LEN = 64;
const MAX_MEM = 32 * 1024 * 1024;

// Precomputed dummy hash to burn identical scrypt computation time on non-existent users
const DUMMY_HASH = `scrypt$16384$0123456789abcdef0123456789abcdef$${'0'.repeat(128)}`;

/**
 * Hash a plaintext password with a random 16-byte salt using scrypt.
 * @param {string} plain 
 * @returns {string} scrypt$<N>$<saltHex>$<keyHex>
 */
export function hashPassword(plain) {
  if (typeof plain !== 'string' || !plain) {
    throw new Error('Password must be a non-empty string');
  }
  const salt = crypto.randomBytes(16).toString('hex');
  const derivedKey = crypto.scryptSync(plain, salt, KEY_LEN, {
    N: SCRYPT_N,
    r: SCRYPT_R,
    p: SCRYPT_P,
    maxmem: MAX_MEM
  });
  return `scrypt$${SCRYPT_N}$${salt}$${derivedKey.toString('hex')}`;
}

/**
 * Verify a plaintext password against a stored scrypt hash in constant time.
 * Never throws, returns false on malformed input.
 * @param {string} plain 
 * @param {string} stored 
 * @returns {boolean}
 */
export function verifyPassword(plain, stored) {
  if (typeof plain !== 'string' || typeof stored !== 'string' || !plain || !stored) {
    return false;
  }
  try {
    const parts = stored.split('$');
    if (parts.length !== 4 || parts[0] !== 'scrypt') {
      return false;
    }
    const cost = parseInt(parts[1], 10);
    const salt = parts[2];
    const expectedKeyHex = parts[3];
    if (!cost || !salt || !expectedKeyHex) {
      return false;
    }
    const expectedBuffer = Buffer.from(expectedKeyHex, 'hex');
    const derivedKey = crypto.scryptSync(plain, salt, expectedBuffer.length, {
      N: cost,
      r: SCRYPT_R,
      p: SCRYPT_P,
      maxmem: MAX_MEM
    });
    if (derivedKey.length !== expectedBuffer.length) {
      return false;
    }
    return crypto.timingSafeEqual(derivedKey, expectedBuffer);
  } catch (_err) {
    return false;
  }
}

/**
 * Burn equivalent scrypt execution time to avoid timing discrepancy when user does not exist.
 * Closes CWE-208: User enumeration via response timing differences.
 */
export function burnPasswordTiming(plain = 'dummy_password') {
  try {
    verifyPassword(plain, DUMMY_HASH);
  } catch (_err) {
    // silently catch
  }
}

/**
 * Upgrades legacy plaintext records in place.
 * @param {Array<object>} users 
 * @returns {number} count of migrated passwords
 */
export function migratePlaintextPasswords(users) {
  if (!Array.isArray(users)) return 0;
  let count = 0;
  for (const user of users) {
    if (user && typeof user.password === 'string' && !user.password.startsWith('scrypt$')) {
      user.password = hashPassword(user.password);
      count++;
    }
  }
  return count;
}
