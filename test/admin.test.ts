import { describe, expect, it } from "vitest";
import { authorizeAdminRequest, readBearerToken } from "../src/lib/admin";

describe("readBearerToken", () => {
  it("extracts bearer token", () => {
    const request = new Request("https://example.com/admin/run-once", {
      method: "POST",
      headers: { Authorization: "Bearer token-123" }
    });
    expect(readBearerToken(request)).toBe("token-123");
  });
});

describe("authorizeAdminRequest", () => {
  it("rejects missing token", () => {
    const request = new Request("https://example.com/admin/run-once", { method: "POST" });
    expect(authorizeAdminRequest(request, "token-123")).toEqual({
      ok: false,
      status: 401,
      error: "missing bearer token"
    });
  });

  it("accepts matching token", () => {
    const request = new Request("https://example.com/admin/run-once", {
      method: "POST",
      headers: { Authorization: "Bearer token-123" }
    });
    expect(authorizeAdminRequest(request, "token-123")).toEqual({ ok: true, status: 200 });
  });
});
