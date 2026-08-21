import { describe, it, expect } from "vitest";
import { hashPassword, verifyPassword } from "@/lib/auth-utils";

describe("auth-utils", () => {
  it("hashes and verifies passwords correctly", async () => {
    const password = "test-password-123";
    const hash = await hashPassword(password);

    expect(hash).toBeDefined();
    expect(hash).not.toBe(password);

    const isValid = await verifyPassword(password, hash);
    expect(isValid).toBe(true);

    const isInvalid = await verifyPassword("wrong-password", hash);
    expect(isInvalid).toBe(false);
  }, 10000);

  it("produces different hashes for the same password", async () => {
    const password = "same-password";
    const hash1 = await hashPassword(password);
    const hash2 = await hashPassword(password);

    expect(hash1).not.toBe(hash2);

    expect(await verifyPassword(password, hash1)).toBe(true);
    expect(await verifyPassword(password, hash2)).toBe(true);
  }, 10000);
});