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

- `scheduled`: 按 cron 触发巡检
- `D1`: 保存 subscriptions / videos / creator_failures / app_state
- `fetch`: 提供健康检查与基础管理接口骨架
- `Feishu webhook`: 发送新视频提醒、启动通知、失败告警

## 运行所需 Secrets

- `DOUYIN_COOKIE`
- `FEISHU_WEBHOOK_URL`
- `FEISHU_BOT_SECRET`（可选）

## 运行所需 Variables

- `POLL_INTERVAL_MINUTES`
- `REQUEST_TIMEOUT_MS`
- `FAILURE_ALERT_THRESHOLD`
- `HEARTBEAT_ENABLED`
- `HEARTBEAT_INTERVAL_HOURS`
- `STARTUP_NOTIFICATION_ENABLED`

## D1 初始化

```bash
npx wrangler d1 create douyin-feishu-watcher
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
