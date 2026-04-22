# douyin-feishu-watcher-worker

Cloudflare Worker 版抖音博主更新监控骨架项目。

## 目标

- 不依赖常驻服务器
- 通过 Douyin Web API + Cookie 拉取博主作品列表
- 用 D1 做订阅、去重、失败计数和运行状态
- 把新视频推送到飞书机器人
- 用 Cron 定时轮询

## 当前定位

这是一个 **Worker 化骨架**，优先验证在 Cloudflare 环境下：

1. 抖音 API + Cookie 是否稳定可用
2. D1 去重 / 基线逻辑是否能替代 SQLite
3. 飞书推送和心跳是否可工作

## 架构

- `scheduled`: 按 cron 触发并把订阅任务入队
- `queue consumer`: 逐个博主抓取抖音 API、去重、发飞书
- `D1`: 保存 subscriptions / videos / creator_failures / app_state
- `fetch`: 提供健康检查与基础管理接口骨架
- `Feishu webhook`: 发送新视频提醒、启动通知、失败告警

## 运行所需 Secrets

- `DOUYIN_COOKIE`（短 cookie 可直接用）
- `DOUYIN_COOKIE_PART_1` / `DOUYIN_COOKIE_PART_2` / `DOUYIN_COOKIE_PART_3`（超长 cookie 推荐拆分）
- `FEISHU_WEBHOOK_URL`
- `FEISHU_BOT_SECRET`（可选）

## 运行所需 Variables

- `POLL_INTERVAL_MINUTES`
- `REQUEST_TIMEOUT_MS`
- `FAILURE_ALERT_THRESHOLD`
- `HEARTBEAT_ENABLED`
- `HEARTBEAT_INTERVAL_HOURS`
- `STARTUP_NOTIFICATION_ENABLED`

## D1 / Queue 初始化

```bash
npx wrangler d1 create douyin-feishu-watcher
npx wrangler queues create douyin-feishu-watcher-queue
npx wrangler d1 migrations apply douyin-feishu-watcher --local
npx wrangler d1 migrations apply douyin-feishu-watcher --remote
```

把生成的 `database_id` 回填到 `wrangler.jsonc`。

## 订阅数据

第一版把订阅保存在 D1 的 `subscriptions` 表里。

示例插入：

```sql
INSERT INTO subscriptions (id, name, profile_url, enabled)
VALUES ('creator-1', '示例博主', 'https://www.douyin.com/user/replace-me', 1);
```

## 本地开发

```bash
npm install
npm run check
npx wrangler dev
```

## 健康检查

```bash
curl http://127.0.0.1:8787/health
```

## 当前风险

- 抖音 Web API 在 Cloudflare 出口环境下可能比普通云服务器更容易触发风控
- Cookie 有时效性，失效后需要重新配置 secret
- 第一版还没有 Browser Run 兜底抓取逻辑

## 超长 Douyin Cookie 说明

Cloudflare 单个 secret 有大小限制。
如果你的 `DOUYIN_COOKIE` 太长，推荐拆成多段：

- `DOUYIN_COOKIE_PART_1`
- `DOUYIN_COOKIE_PART_2`
- `DOUYIN_COOKIE_PART_3`

Worker 启动时会自动把这些片段按顺序拼回完整 Cookie。

## Queue 设计

当前 Worker 版按“每个博主一条消息”入队：

- `scheduled` 不直接抓抖音
- 它只负责读取订阅列表并发送 queue 消息
- `queue consumer` 负责逐个博主抓取、去重和推送

这样后续博主数量增加时更容易横向扩展。
