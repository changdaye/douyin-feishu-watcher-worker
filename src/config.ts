import type { AppConfig, Env } from "./types";
import { toBoolean, toInt } from "./lib/value";

export function parseConfig(env: Env): AppConfig {
  return {
    douyinCookie: env.DOUYIN_COOKIE?.trim() ?? "",
    feishuWebhookUrl: env.FEISHU_WEBHOOK_URL?.trim() ?? "",
    feishuBotSecret: env.FEISHU_BOT_SECRET?.trim() ?? "",
    pollIntervalMinutes: toInt(env.POLL_INTERVAL_MINUTES, 30, 1),
    requestTimeoutMs: toInt(env.REQUEST_TIMEOUT_MS, 15000, 1),
    failureAlertThreshold: toInt(env.FAILURE_ALERT_THRESHOLD, 3, 1),
    heartbeatEnabled: toBoolean(env.HEARTBEAT_ENABLED, true),
    heartbeatIntervalHours: toInt(env.HEARTBEAT_INTERVAL_HOURS, 6, 1),
    startupNotificationEnabled: toBoolean(env.STARTUP_NOTIFICATION_ENABLED, true)
  };
}
