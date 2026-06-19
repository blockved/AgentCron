import { describe, it, expect } from "vitest";
import { sanitize } from "@agentcron/shared";

describe("sanitize", () => {
  it("redacts OpenAI API keys", () => {
    expect(sanitize("key is sk-abc123def456")).toBe("key is [REDACTED]");
  });

  it("redacts GitHub tokens", () => {
    expect(sanitize("token: ghp_1234567890abcdef1234567890abcdef12345678")).toBe(
      "token: [REDACTED]"
    );
  });

  it("redacts Bearer tokens", () => {
    expect(sanitize("Authorization: Bearer eyJhbGciOiJIUzI1NiJ9.payload.sig")).toBe(
      "Authorization: Bearer [REDACTED]"
    );
  });

  it("redacts generic key-xxx patterns", () => {
    expect(sanitize("using key-abc123def456ghi789")).toBe("using [REDACTED]");
  });

  it("redacts Anthropic API keys", () => {
    expect(sanitize("sk-ant-api03-abcdefghijklmnop")).toBe("[REDACTED]");
  });

  it("handles multiple secrets in one string", () => {
    const input = "key1=sk-abc123def456 key2=ghp_xyz789abcdef012345678901234567890123";
    const result = sanitize(input);
    expect(result).not.toContain("sk-abc123");
    expect(result).not.toContain("ghp_xyz789");
  });

  it("leaves normal text unchanged", () => {
    const input = "this is normal log output with no secrets";
    expect(sanitize(input)).toBe(input);
  });

  it("handles empty string", () => {
    expect(sanitize("")).toBe("");
  });
});
