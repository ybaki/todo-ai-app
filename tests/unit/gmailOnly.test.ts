import { describe, expect, it, beforeEach, afterEach } from "vitest";
import { isAllowedGmailAddress } from "@/lib/auth/gmailOnly";

describe("isAllowedGmailAddress", () => {
  const originalDomains = process.env.ALLOWED_EMAIL_DOMAINS;

  afterEach(() => {
    if (originalDomains === undefined) {
      delete process.env.ALLOWED_EMAIL_DOMAINS;
    } else {
      process.env.ALLOWED_EMAIL_DOMAINS = originalDomains;
    }
  });

  it("accepts @gmail.com and @googlemail.com", () => {
    expect(isAllowedGmailAddress("user@gmail.com")).toBe(true);
    expect(isAllowedGmailAddress("user@googlemail.com")).toBe(true);
  });

  it("accepts domains listed in ALLOWED_EMAIL_DOMAINS", () => {
    process.env.ALLOWED_EMAIL_DOMAINS = "yigitbaki.com";
    expect(isAllowedGmailAddress("ben@yigitbaki.com")).toBe(true);
  });

  it("rejects other corporate domains", () => {
    process.env.ALLOWED_EMAIL_DOMAINS = "yigitbaki.com";
    expect(isAllowedGmailAddress("user@trendyol.com")).toBe(false);
    expect(isAllowedGmailAddress(null)).toBe(false);
  });
});
