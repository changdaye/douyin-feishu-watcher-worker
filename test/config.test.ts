import { describe, expect, it } from "vitest";
import { parseConfig } from "../src/config";

describe("parseConfig", () => {
  it("reads worker environment values with defaults", () => {
    expect(parseConfig({ WATCHER_DB: {} as D1Database, DOUYIN_COOKIE: "cookie", FEISHU_WEBHOOK_URL: "https://example.com/hook" })).toMatchObject({
      douyinCookie: "cookie",
      feishuWebhookUrl: "https://example.com/hook",
      pollIntervalMinutes: 30,
      requestTimeoutMs: 15000,
      failureAlertThreshold: 3,
      heartbeatEnabled: true,
      heartbeatIntervalHours: 6,
      startupNotificationEnabled: true
    });
  });
});
