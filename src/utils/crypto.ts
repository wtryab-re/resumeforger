/**
 * Encrypted Local Storage Utility for API Keys
 * Uses Web Crypto API (AES-GCM 256-bit encryption with PBKDF2 key derivation).
 *
 * Keys are strictly scoped per Firebase user id. A key saved by one account is
 * never readable by another account on the same browser: every read derives the
 * key material from the *caller's* uid only, and never falls back to another
 * uid's stored ciphertext.
 *
 * Note on threat model: the passphrase is derived from the uid and hostname,
 * both of which are public, and the salt lives in localStorage next to the
 * ciphertext. This protects against casual inspection of localStorage and
 * against key reuse across accounts — it is not protection against an attacker
 * who can already run script on this origin.
 */

const BASE_STORAGE_KEY = "ats_tailor_encrypted_api_key";
const BASE_SALT_KEY = "ats_tailor_crypto_salt";
const BASE_IV_KEY = "ats_tailor_crypto_iv";

function getStorageKeys(userId: string) {
  return {
    storageKey: `${BASE_STORAGE_KEY}_${userId}`,
    saltKey: `${BASE_SALT_KEY}_${userId}`,
    ivKey: `${BASE_IV_KEY}_${userId}`,
  };
}

function toHex(bytes: Uint8Array): string {
  return Array.from(bytes)
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");
}

function fromHex(hex: string): Uint8Array | null {
  const match = hex.match(/.{1,2}/g);
  if (!match) return null;
  return new Uint8Array(match.map((byte) => parseInt(byte, 16)));
}

// Get or generate a persistent device salt for the user
function getOrCreateSalt(userId: string): Uint8Array {
  const { saltKey } = getStorageKeys(userId);
  let saltStr = localStorage.getItem(saltKey);
  if (!saltStr) {
    const saltBytes = new Uint8Array(16);
    window.crypto.getRandomValues(saltBytes);
    saltStr = toHex(saltBytes);
    localStorage.setItem(saltKey, saltStr);
  }
  return fromHex(saltStr) ?? new Uint8Array([1, 2, 3, 4]);
}

// Derive a cryptographic key using PBKDF2
async function deriveKey(userId: string): Promise<CryptoKey> {
  const salt = getOrCreateSalt(userId);
  // Device and user-bound passkey phrase
  const passPhrase = `ats-studio-key-${userId}-${window.location.hostname || "local"}`;
  const enc = new TextEncoder();
  const keyMaterial = await window.crypto.subtle.importKey(
    "raw",
    enc.encode(passPhrase),
    { name: "PBKDF2" },
    false,
    ["deriveBits", "deriveKey"]
  );

  return window.crypto.subtle.deriveKey(
    {
      name: "PBKDF2",
      salt: salt,
      iterations: 100000,
      hash: "SHA-256",
    },
    keyMaterial,
    { name: "AES-GCM", length: 256 },
    false,
    ["encrypt", "decrypt"]
  );
}

// Encrypt plaintext and store to localStorage scoped to user
export async function saveEncryptedApiKey(plainApiKey: string, userId?: string): Promise<boolean> {
  if (!userId) return false;

  try {
    const { storageKey, ivKey } = getStorageKeys(userId);

    if (!plainApiKey || !plainApiKey.trim()) {
      clearEncryptedApiKey(userId);
      return true;
    }

    const key = await deriveKey(userId);
    const iv = new Uint8Array(12);
    window.crypto.getRandomValues(iv);

    const enc = new TextEncoder();
    const encryptedBuffer = await window.crypto.subtle.encrypt(
      { name: "AES-GCM", iv },
      key,
      enc.encode(plainApiKey.trim())
    );

    localStorage.setItem(storageKey, toHex(new Uint8Array(encryptedBuffer)));
    localStorage.setItem(ivKey, toHex(iv));
    return true;
  } catch (err) {
    console.error("Failed to encrypt API key:", err);
    return false;
  }
}

// Decrypt and retrieve the stored API key for this user, and only this user.
export async function getDecryptedApiKey(userId?: string): Promise<string | null> {
  if (!userId) return null;

  try {
    const { storageKey, ivKey } = getStorageKeys(userId);
    const cipherHex = localStorage.getItem(storageKey);
    const ivHex = localStorage.getItem(ivKey);
    if (!cipherHex || !ivHex) return null;

    const iv = fromHex(ivHex);
    const cipherBytes = fromHex(cipherHex);
    if (!iv || !cipherBytes) return null;

    const key = await deriveKey(userId);
    const decryptedBuffer = await window.crypto.subtle.decrypt(
      { name: "AES-GCM", iv },
      key,
      cipherBytes
    );

    const result = new TextDecoder().decode(decryptedBuffer).trim();
    return result || null;
  } catch {
    // Wrong key, corrupted ciphertext, or storage unavailable
    return null;
  }
}

// Remove stored key for user
export function clearEncryptedApiKey(userId?: string): void {
  if (!userId) return;
  try {
    const { storageKey, ivKey, saltKey } = getStorageKeys(userId);
    localStorage.removeItem(storageKey);
    localStorage.removeItem(ivKey);
    localStorage.removeItem(saltKey);
  } catch (e) {
    console.error("Failed to clear API key:", e);
  }
}

// Clean legacy unscoped / globally-scoped keys left by earlier versions.
export function clearLegacyUnscopedKeys(): void {
  try {
    for (const k of [BASE_STORAGE_KEY, BASE_SALT_KEY, BASE_IV_KEY]) {
      localStorage.removeItem(k);
      localStorage.removeItem(`${k}_global`);
    }
  } catch (e) {
    console.error(e);
  }
}

// Check whether *this* user has a key stored in this browser.
export function hasCustomEncryptedApiKey(userId?: string): boolean {
  if (!userId) return false;
  try {
    const { storageKey, ivKey } = getStorageKeys(userId);
    return !!(localStorage.getItem(storageKey) && localStorage.getItem(ivKey));
  } catch {
    return false;
  }
}

// Mask key for safe UI display (e.g. "AIzaSy••••4x0b")
export function maskApiKey(key: string): string {
  if (!key) return "";
  if (key.length <= 8) return "••••••••";
  return `${key.slice(0, 6)}••••${key.slice(-4)}`;
}
