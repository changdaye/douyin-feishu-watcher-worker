# douyin-feishu-watcher-worker

A **Cloudflare Workers + Queues + D1** project for monitoring Douyin creators and pushing new video notifications to a Feishu bot.

> 中文说明请看 [README.md](./README.md)

---

## Highlights

- **No dedicated server required**
- **Queue-first architecture** for better scaling as subscriptions grow
- **D1-backed persistence** for subscriptions, deduplication, baseline state, and failure tracking
- **Feishu card notifications** with optional signature support
- **Baseline mode** to avoid flooding Feishu with historical videos on first sync
- **Manual verification endpoints** for run-once polling and baseline sample pushes
- **Pinned-video safe** latest-video selection based on publish time, not API return order

---

## Architecture

### `scheduled`
Reads subscriptions from D1 and enqueues one job per creator.

### `queue consumer`
Processes one creator at a time:
- fetches the Douyin API
- parses returned videos
- deduplicates against D1
- sends Feishu notifications
- records failure counts

### `D1`
Stores:
- `subscriptions`
- `videos`
- `creator_failures`
- `app_state`

---

## Required Secrets

Configure the following Worker secrets:

- `DOUYIN_COOKIE` (for short cookies)
- `DOUYIN_COOKIE_PART_1`
- `DOUYIN_COOKIE_PART_2`
- `DOUYIN_COOKIE_PART_3`
- `FEISHU_WEBHOOK_URL`
- `FEISHU_BOT_SECRET` (optional)
- `MANUAL_TRIGGER_TOKEN`

### Long cookie support

Cloudflare imposes a size limit on individual secrets.  
If your Douyin cookie is too large, split it into:

- `DOUYIN_COOKIE_PART_1`
- `DOUYIN_COOKIE_PART_2`
- `DOUYIN_COOKIE_PART_3`

The Worker will concatenate them automatically at runtime.

---

## Required Variables

- `POLL_INTERVAL_MINUTES`
- `REQUEST_TIMEOUT_MS`
- `FAILURE_ALERT_THRESHOLD`
- `HEARTBEAT_ENABLED`
- `HEARTBEAT_INTERVAL_HOURS`
- `STARTUP_NOTIFICATION_ENABLED`

---

## D1 / Queue setup

```bash
npx wrangler d1 create douyin-feishu-watcher
npx wrangler queues create douyin-feishu-watcher-queue
npx wrangler d1 migrations apply douyin-feishu-watcher --local
npx wrangler d1 migrations apply douyin-feishu-watcher --remote
```

Then update `wrangler.jsonc` with the generated `database_id`.

---

## Subscription data

Subscriptions are currently stored in the D1 `subscriptions` table.

Example:

```sql
INSERT INTO subscriptions (id, name, profile_url, enabled)
VALUES ('creator-1', 'Example Creator', 'https://www.douyin.com/user/replace-me', 1);
```

---

## Local development

```bash
npm install
npm run check
npx wrangler dev
```

Health check:

```bash
curl http://127.0.0.1:8787/health
```

---

## Admin endpoints

### Enqueue one polling round

```bash
curl -X POST \
  -H "Authorization: Bearer YOUR_MANUAL_TRIGGER_TOKEN" \
  "https://douyin-feishu-watcher-worker.wanggejiancai822.workers.dev/admin/run-once"
```

### Send baseline sample notifications

```bash
curl -X POST \
  -H "Authorization: Bearer YOUR_MANUAL_TRIGGER_TOKEN" \
  "https://douyin-feishu-watcher-worker.wanggejiancai822.workers.dev/admin/send-pending-samples?limit=5"
```

This sends the latest pending video per creator and marks those videos as sent.

---

## Latest video selection

Videos are sorted by `publish_time` descending.  
Pinned older videos will not be mistaken for the latest update.

---

## Feishu notification format

The Worker tries to send an **interactive card** first.  
If card delivery fails, it falls back to a plain text message.

Each message includes:
- creator name
- title
- publish time
- Douyin video link

---

## Risks and limitations

- Douyin Web APIs may be less stable from Cloudflare egress than from a normal VPS
- Some creators may occasionally return empty responses and require retry/fallback logic
- Cookies expire and must be rotated manually
- No browser-based fallback is included yet

---

## Roadmap

- HTML fallback fetching
- Browser Run fallback
- richer retry/error classification
- subscription management endpoints
- stronger deployment automation and public-repo docs
