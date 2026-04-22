import type { AppConfig, VideoRecord } from "../types";

async function signPayload(secret: string): Promise<{ timestamp: string; sign: string }> {
  const timestamp = Math.floor(Date.now() / 1000).toString();
  const encoder = new TextEncoder();
  const content = `${timestamp}\n${secret}`;
  const key = await crypto.subtle.importKey("raw", encoder.encode(content), { name: "HMAC", hash: "SHA-256" }, false, ["sign"]);
  const signature = await crypto.subtle.sign("HMAC", key, new Uint8Array());
  const bytes = Array.from(new Uint8Array(signature));
  return { timestamp, sign: btoa(String.fromCharCode(...bytes)) };
}

async function post(config: AppConfig, payload: Record<string, unknown>): Promise<void> {
  if (!config.feishuWebhookUrl) return;
  const body = { ...payload } as Record<string, unknown>;
  if (config.feishuBotSecret) {
    Object.assign(body, await signPayload(config.feishuBotSecret));
  }
  const response = await fetch(config.feishuWebhookUrl, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body)
  });
  const text = await response.text();
  if (!response.ok) throw new Error(`Feishu webhook HTTP ${response.status}: ${text}`);
}

export async function sendVideo(config: AppConfig, video: VideoRecord): Promise<void> {
  await post(config, {
    msg_type: "text",
    content: {
      text: `抖音更新提醒\n博主：${video.creatorName}\n标题：${video.title}\n发布时间：${video.publishTime ?? "未知"}\n链接：${video.videoUrl}`
    }
  });
}

export async function sendAlert(config: AppConfig, text: string): Promise<void> {
  await post(config, { msg_type: "text", content: { text } });
}
