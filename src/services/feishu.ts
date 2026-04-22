import type { AppConfig, VideoRecord } from "../types";

function formatPublishTime(value?: string): string {
  if (!value) return "未知";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;
  const formatter = new Intl.DateTimeFormat("sv-SE", {
    timeZone: "Asia/Shanghai",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
    hour12: false
  });
  return formatter.format(date).replace(" ", " ");
}

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
  if (text) {
    try {
      const data = JSON.parse(text) as { code?: number; msg?: string };
      if ((data.code ?? 0) !== 0) {
        throw new Error(`Feishu webhook error ${data.code}: ${data.msg ?? "unknown"}`);
      }
    } catch (error) {
      if (error instanceof SyntaxError) {
        return;
      }
      throw error;
    }
  }
}

export function buildCardPayload(video: VideoRecord): Record<string, unknown> {
  return {
    msg_type: "interactive",
    card: {
      header: {
        title: {
          tag: "plain_text",
          content: "抖音更新提醒"
        }
      },
      elements: [
        { tag: "markdown", content: `**博主**：${video.creatorName}` },
        { tag: "markdown", content: `**标题**：${video.title}` },
        { tag: "markdown", content: `**发布时间**：${formatPublishTime(video.publishTime)}` },
        { tag: "markdown", content: `**链接**：[打开抖音](${video.videoUrl})` }
      ]
    }
  };
}

export function buildTextPayload(video: VideoRecord): Record<string, unknown> {
  return {
    msg_type: "text",
    content: {
      text: `抖音更新提醒\n博主：${video.creatorName}\n标题：${video.title}\n发布时间：${formatPublishTime(video.publishTime)}\n链接：${video.videoUrl}`
    }
  };
}

export async function sendVideo(config: AppConfig, video: VideoRecord): Promise<void> {
  try {
    await post(config, buildCardPayload(video));
  } catch {
    await post(config, buildTextPayload(video));
  }
}

export async function sendAlert(config: AppConfig, text: string): Promise<void> {
  await post(config, { msg_type: "text", content: { text } });
}
