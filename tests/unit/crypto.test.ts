import { describe, it, expect, beforeAll } from 'vitest';
import crypto from 'node:crypto';

beforeAll(() => {
  process.env.ENCRYPTION_KEY = crypto.randomBytes(32).toString('base64');
});

describe('encrypt/decrypt', () => {
  it('round-trips ASCII', async () => {
    const { encrypt, decrypt } = await import('@/lib/crypto');
    const x = 'plaid-access-token-abcdef';
    expect(decrypt(encrypt(x))).toBe(x);
  });

  it('round-trips unicode', async () => {
    const { encrypt, decrypt } = await import('@/lib/crypto');
    const x = '🔐 secret — Rayan';
    expect(decrypt(encrypt(x))).toBe(x);
  });

  it('round-trips empty string', async () => {
    const { encrypt, decrypt } = await import('@/lib/crypto');
    expect(decrypt(encrypt(''))).toBe('');
  });

  it('throws on tampered ciphertext', async () => {
    const { encrypt, decrypt } = await import('@/lib/crypto');
    const ct = encrypt('hello');
    const buf = Buffer.from(ct, 'base64');
    buf[buf.length - 1] ^= 0xff;
    const tampered = buf.toString('base64');
    expect(() => decrypt(tampered)).toThrow();
  });

  it('produces different ciphertexts for same input (IV is random)', async () => {
    const { encrypt } = await import('@/lib/crypto');
    const a = encrypt('hello');
    const b = encrypt('hello');
    expect(a).not.toBe(b);
  });
});
