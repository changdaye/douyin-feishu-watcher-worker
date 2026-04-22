import { describe, expect, it } from "vitest";
import { parseConfig } from "../src/config";

describe("parseConfig", () => {
  it("reads worker environment values with defaults", () => {
    expect(parseConfig({ WATCHER_DB: {} as D1Database, WATCHER_QUEUE: {} as Queue<any>, DOUYIN_COOKIE: "cookie", FEISHU_WEBHOOK_URL: "https://example.com/hook" })).toMatchObject({
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

  it("joins split cookie parts when direct cookie is absent", () => {
    expect(parseConfig({ WATCHER_DB: {} as D1Database, WATCHER_QUEUE: {} as Queue<any>, DOUYIN_COOKIE_PART_1: "a=1;", DOUYIN_COOKIE_PART_2: "b=2;", DOUYIN_COOKIE_PART_3: "c=3", FEISHU_WEBHOOK_URL: "https://example.com/hook" }).douyinCookie).toBe("a=1;b=2;c=3");
  });
});
