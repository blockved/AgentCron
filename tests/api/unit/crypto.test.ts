import { describe, it, expect } from "vitest";
import { encrypt, decrypt } from "@agentcron/shared";

const TEST_KEY = "0123456789abcdef0123456789abcdef0123456789abcdef0123456789abcdef";

describe("crypto", () => {
  it("encrypts and decrypts a string", () => {
    const plaintext = "sk-secret-api-key-12345";
    const encrypted = encrypt(plaintext, TEST_KEY);
    expect(encrypted).not.toEqual(plaintext);
    expect(encrypted).toMatch(/^enc:v1:/);
    const decrypted = decrypt(encrypted, TEST_KEY);
    expect(decrypted).toEqual(plaintext);
  });

  it("produces different ciphertext for same plaintext (random IV)", () => {
    const plaintext = "same-input";
    const a = encrypt(plaintext, TEST_KEY);
    const b = encrypt(plaintext, TEST_KEY);
    expect(a).not.toEqual(b);
  });

  it("returns plaintext unchanged if not encrypted (no enc: prefix)", () => {
    const plaintext = "not-encrypted-value";
    const result = decrypt(plaintext, TEST_KEY);
    expect(result).toEqual(plaintext);
  });

  it("handles empty string", () => {
    const encrypted = encrypt("", TEST_KEY);
    const decrypted = decrypt(encrypted, TEST_KEY);
    expect(decrypted).toEqual("");
  });

  it("handles unicode content", () => {
    const plaintext = "你好世界 🌍";
    const encrypted = encrypt(plaintext, TEST_KEY);
    const decrypted = decrypt(encrypted, TEST_KEY);
    expect(decrypted).toEqual(plaintext);
  });

  it("throws on tampered ciphertext", () => {
    const encrypted = encrypt("secret", TEST_KEY);
    const parts = encrypted.split(":");
    parts[3] = "00" + parts[3].slice(2);
    const tampered = parts.join(":");
    expect(() => decrypt(tampered, TEST_KEY)).toThrow();
  });
});
