import { parseConfig } from "./config";
import { getRuntimeState, hasAnyVideosForCreator, hasVideo, listEnabledSubscriptions, recordFailure, resetFailures, saveVideo, setRuntimeState } from "./db";
import { sendAlert, sendVideo } from "./services/feishu";
import { DouyinClient } from "./services/douyin";
import type { Env, Subscription } from "./types";

function nowIso(now = new Date()): string {
  return now.toISOString();
}

function shouldHeartbeat(last: string | undefined, hours: number, now = new Date()): boolean {
  if (!last) return true;
  const previous = new Date(last);
  if (Number.isNaN(previous.getTime())) return true;
  return now.getTime() >= previous.getTime() + hours * 60 * 60 * 1000;
}

async function pollCreator(env: Env, creator: Subscription): Promise<{ creator: string; sent: number; baseline: boolean; error?: string }> {
  const config = parseConfig(env);
  const douyin = new DouyinClient(config);
  try {
    const videos = await douyin.fetchCreatorVideos(creator);
    await resetFailures(env.WATCHER_DB, creator.id);

    if (!(await hasAnyVideosForCreator(env.WATCHER_DB, creator.id))) {
      for (const video of videos) {
        await saveVideo(env.WATCHER_DB, video, false);
      }
      return { creator: creator.name, sent: 0, baseline: true };
    }

    let sent = 0;
    for (const video of videos) {
      if (await hasVideo(env.WATCHER_DB, video.videoId)) continue;
      await sendVideo(config, video);
      await saveVideo(env.WATCHER_DB, video, true);
      sent += 1;
    }
    return { creator: creator.name, sent, baseline: false };
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    const count = await recordFailure(env.WATCHER_DB, creator.id, message);
    if (count >= config.failureAlertThreshold) {
      await sendAlert(config, `监控异常提醒\n博主：${creator.name}\n链接：${creator.profileUrl}\n连续失败次数：${count}\n最近错误：${message}`);
    }
    return { creator: creator.name, sent: 0, baseline: false, error: message };
  }
}

async function runScheduled(env: Env): Promise<Record<string, unknown>> {
  const config = parseConfig(env);
  const runtime = await getRuntimeState(env.WATCHER_DB);
  if (config.startupNotificationEnabled && !runtime.lastStartupAt && config.feishuWebhookUrl) {
    await sendAlert(config, "服务启动成功\nDouyin Feishu Watcher Worker 已启动");
    runtime.lastStartupAt = nowIso();
  }
  if (config.heartbeatEnabled && shouldHeartbeat(runtime.lastHeartbeatAt, config.heartbeatIntervalHours) && config.feishuWebhookUrl) {
    await sendAlert(config, "健康心跳\nDouyin Feishu Watcher Worker 正在运行");
    runtime.lastHeartbeatAt = nowIso();
  }
  await setRuntimeState(env.WATCHER_DB, runtime);

  const subscriptions = await listEnabledSubscriptions(env.WATCHER_DB);
  const results = [];
  for (const creator of subscriptions) {
    results.push(await pollCreator(env, creator));
  }
  return { ok: true, subscriptions: subscriptions.length, results };
}

export default {
  async fetch(request: Request, env: Env): Promise<Response> {
    const url = new URL(request.url);
    if (request.method === "GET" && (url.pathname === "/" || url.pathname === "/health")) {
      return Response.json({ ok: true, runtime: await getRuntimeState(env.WATCHER_DB) });
    }
    if (request.method === "POST" && url.pathname === "/admin/run-once") {
      return Response.json(await runScheduled(env));
    }
    return Response.json({ ok: false, error: "not found" }, { status: 404 });
  },

  async scheduled(_controller: ScheduledController, env: Env, _ctx: ExecutionContext): Promise<void> {
    await runScheduled(env);
  }
};
