export interface Env {
  WATCHER_DB: D1Database;
  DOUYIN_COOKIE?: string;
  FEISHU_WEBHOOK_URL?: string;
  FEISHU_BOT_SECRET?: string;
  POLL_INTERVAL_MINUTES?: string;
  REQUEST_TIMEOUT_MS?: string;
  FAILURE_ALERT_THRESHOLD?: string;
  HEARTBEAT_ENABLED?: string;
  HEARTBEAT_INTERVAL_HOURS?: string;
  STARTUP_NOTIFICATION_ENABLED?: string;
}

export interface AppConfig {
  douyinCookie: string;
  feishuWebhookUrl: string;
  feishuBotSecret: string;
  pollIntervalMinutes: number;
  requestTimeoutMs: number;
  failureAlertThreshold: number;
  heartbeatEnabled: boolean;
  heartbeatIntervalHours: number;
  startupNotificationEnabled: boolean;
}

export interface Subscription {
  id: string;
  name: string;
  profileUrl: string;
  enabled: boolean;
}

export interface VideoRecord {
  videoId: string;
  creatorId: string;
  creatorName: string;
  title: string;
  videoUrl: string;
  coverUrl?: string;
  publishTime?: string;
}

export interface RuntimeState {
  lastStartupAt?: string;
  lastHeartbeatAt?: string;
}
