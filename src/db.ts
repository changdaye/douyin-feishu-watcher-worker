import type { RuntimeState, Subscription, VideoRecord } from "./types";

function nowIso(now = new Date()): string {
  return now.toISOString();
}

export async function listEnabledSubscriptions(db: D1Database): Promise<Subscription[]> {
  const rows = await db.prepare("SELECT id, name, profile_url, enabled FROM subscriptions WHERE enabled = 1 ORDER BY name ASC").all<Record<string, unknown>>();
  return rows.results.map((row) => ({
    id: String(row.id),
    name: String(row.name),
    profileUrl: String(row.profile_url),
    enabled: Number(row.enabled ?? 0) === 1
  }));
}

export async function hasVideo(db: D1Database, videoId: string): Promise<boolean> {
  const row = await db.prepare("SELECT 1 FROM videos WHERE video_id = ? LIMIT 1").bind(videoId).first();
  return !!row;
}

export async function hasAnyVideosForCreator(db: D1Database, creatorId: string): Promise<boolean> {
  const row = await db.prepare("SELECT 1 FROM videos WHERE creator_id = ? LIMIT 1").bind(creatorId).first();
  return !!row;
}

export async function saveVideo(db: D1Database, video: VideoRecord, notified: boolean, now = new Date()): Promise<void> {
  await db.prepare(`INSERT OR REPLACE INTO videos (
    video_id, creator_id, creator_name, title, video_url, cover_url, publish_time, first_seen_at, notified_at, notify_status
  ) VALUES (?, ?, ?, ?, ?, ?, ?, COALESCE((SELECT first_seen_at FROM videos WHERE video_id = ?), ?), ?, ?)`)
    .bind(
      video.videoId,
      video.creatorId,
      video.creatorName,
      video.title,
      video.videoUrl,
      video.coverUrl ?? null,
      video.publishTime ?? null,
      video.videoId,
      nowIso(now),
      notified ? nowIso(now) : null,
      notified ? "sent" : "pending"
    )
    .run();
}

export async function recordFailure(db: D1Database, creatorId: string, error: string, now = new Date()): Promise<number> {
  const existing = await db.prepare("SELECT failure_count FROM creator_failures WHERE creator_id = ?").bind(creatorId).first<{ failure_count: number }>();
  const next = Number(existing?.failure_count ?? 0) + 1;
  await db.prepare(`INSERT INTO creator_failures (creator_id, failure_count, last_error, updated_at)
    VALUES (?, ?, ?, ?)
    ON CONFLICT(creator_id) DO UPDATE SET failure_count = excluded.failure_count, last_error = excluded.last_error, updated_at = excluded.updated_at`)
    .bind(creatorId, next, error, nowIso(now))
    .run();
  return next;
}

export async function resetFailures(db: D1Database, creatorId: string, now = new Date()): Promise<void> {
  await db.prepare(`INSERT INTO creator_failures (creator_id, failure_count, last_error, updated_at)
    VALUES (?, 0, NULL, ?)
    ON CONFLICT(creator_id) DO UPDATE SET failure_count = 0, last_error = NULL, updated_at = excluded.updated_at`)
    .bind(creatorId, nowIso(now))
    .run();
}

export async function getRuntimeState(db: D1Database): Promise<RuntimeState> {
  const row = await db.prepare("SELECT state_value FROM app_state WHERE state_key = 'runtime'").first<{ state_value: string }>();
  if (!row?.state_value) return {};
  return JSON.parse(row.state_value) as RuntimeState;
}

export async function setRuntimeState(db: D1Database, state: RuntimeState, now = new Date()): Promise<void> {
  await db.prepare(`INSERT INTO app_state (state_key, state_value, updated_at)
    VALUES ('runtime', ?, ?)
    ON CONFLICT(state_key) DO UPDATE SET state_value = excluded.state_value, updated_at = excluded.updated_at`)
    .bind(JSON.stringify(state), nowIso(now))
    .run();
}
