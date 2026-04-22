# douyin-feishu-watcher-worker

一个基于 **Cloudflare Workers + Queues + D1** 的抖音博主更新监控项目。  
它会定时抓取你订阅的抖音博主作品列表，把新视频推送到飞书机器人，并用 D1 保存去重、基线和失败状态。

> English version: see [README.en.md](./README.en.md)

---

## 项目特点

- **无需常驻服务器**：运行在 Cloudflare Workers
- **队列优先架构**：每个博主单独入队，适合后续订阅量增长
- **D1 持久化**：保存订阅、视频去重、失败计数、应用状态
- **飞书通知**：支持卡片推送和签名校验
- **基线机制**：首次抓到历史视频时默认只入库，不刷屏
- **手动验证**：支持手动入队巡检、手动发送基线样例消息
- **置顶兼容**：按发布时间排序，不会把置顶旧视频误判成最新视频

---

## 当前状态

当前版本已经完成：

- 定时调度（Cron）
- Queue 生产 / 消费链路
- Douyin Web API + Cookie 抓取路径
- D1 去重与失败计数
- 飞书卡片消息格式
- 基线样例消息发送
- Admin 接口 Bearer Token 鉴权

当前版本还没有加入：

- HTML fallback 抓取
- Browser Run / 浏览器兜底
- Dashboard 管理界面
- 自动部署工作流的稳定收尾

---

## 架构说明

### 1. `scheduled`
负责按 cron 触发巡检，并把订阅中的博主任务逐条发送到 Queue。

### 2. `queue consumer`
每次处理一个博主：
- 调用抖音 API 抓取作品列表
- 解析视频数据
- 做去重 / 建基线
- 推送飞书消息
- 记录失败次数

### 3. `D1`
保存以下数据：
- `subscriptions`：订阅博主列表
- `videos`：已抓取视频与通知状态
- `creator_failures`：每个博主的失败次数与最近错误
- `app_state`：启动时间、心跳时间等运行状态

---

## 运行所需 Secrets

需要在 Cloudflare Worker 中配置以下 secrets：

- `DOUYIN_COOKIE`（短 Cookie 可直接使用）
- `DOUYIN_COOKIE_PART_1`
- `DOUYIN_COOKIE_PART_2`
- `DOUYIN_COOKIE_PART_3`
- `FEISHU_WEBHOOK_URL`
- `FEISHU_BOT_SECRET`（可选）
- `MANUAL_TRIGGER_TOKEN`（推荐，保护 admin 接口）

### 超长 Cookie 说明

Cloudflare 单个 secret 有大小限制。  
如果你的 `DOUYIN_COOKIE` 太长，推荐拆分成：

- `DOUYIN_COOKIE_PART_1`
- `DOUYIN_COOKIE_PART_2`
- `DOUYIN_COOKIE_PART_3`

Worker 会在运行时自动拼接还原成完整 Cookie。

---

## 运行所需 Variables

可在 `wrangler.jsonc` 或 Dashboard 中配置：

- `POLL_INTERVAL_MINUTES`
- `REQUEST_TIMEOUT_MS`
- `FAILURE_ALERT_THRESHOLD`
- `HEARTBEAT_ENABLED`
- `HEARTBEAT_INTERVAL_HOURS`
- `STARTUP_NOTIFICATION_ENABLED`

---

## D1 / Queue 初始化

```bash
npx wrangler d1 create douyin-feishu-watcher
npx wrangler queues create douyin-feishu-watcher-queue
npx wrangler d1 migrations apply douyin-feishu-watcher --local
npx wrangler d1 migrations apply douyin-feishu-watcher --remote
```

然后把生成的 `database_id` 回填到 `wrangler.jsonc`。

---

## 订阅数据

当前版本的订阅列表保存在 D1 的 `subscriptions` 表中。

示例：

```sql
INSERT INTO subscriptions (id, name, profile_url, enabled)
VALUES ('creator-1', '示例博主', 'https://www.douyin.com/user/replace-me', 1);
```

---

## 本地开发

```bash
npm install
npm run check
npx wrangler dev
```

本地健康检查：

```bash
curl http://127.0.0.1:8787/health
```

---

## Admin 接口

### 1. 手动入队一轮巡检

```bash
curl -X POST \
  -H "Authorization: Bearer YOUR_MANUAL_TRIGGER_TOKEN" \
  "https://douyin-feishu-watcher-worker.wanggejiancai822.workers.dev/admin/run-once"
```

作用：
- 读取所有订阅博主
- 将它们逐条发送到 Queue
- 由 consumer 异步抓取与处理

### 2. 手动发送基线样例消息

```bash
curl -X POST \
  -H "Authorization: Bearer YOUR_MANUAL_TRIGGER_TOKEN" \
  "https://douyin-feishu-watcher-worker.wanggejiancai822.workers.dev/admin/send-pending-samples?limit=5"
```

作用：
- 从 `pending` 视频里按博主各取最新 1 条
- 立即推送到飞书
- 推送后标记为 `sent`

这个接口适合：
- 首次接入后，想马上在飞书里确认格式和效果
- 不想等博主自然发新视频

---

## 最新视频判定

Worker 版按 `publish_time` 倒序处理视频列表。  
这意味着：

- 不依赖抖音接口返回顺序
- 不会把置顶旧视频误判成“最新一条”

---

## 飞书消息格式

当前使用：
- **interactive card**（优先）
- 如果卡片发送失败，则回退到纯文本消息

卡片内容包括：
- 博主
- 标题
- 发布时间
- 打开抖音链接

发布时间会格式化为 **Asia/Shanghai** 本地时间，例如：

```text
2026-04-22 12:49:40
```

---

## 适用场景

适合：
- 监控少量到中量抖音博主更新
- 想摆脱常驻服务器
- 需要飞书机器人通知
- 可以接受抖音接口偶发抖动

不太适合：
- 强依赖极高稳定性
- 大规模高频抓取
- 需要完整反爬对抗能力

---

## 当前风险与限制

- 抖音 Web API 在 Cloudflare 出口环境下，可能比普通服务器更容易触发风控
- 某些博主请求可能偶发返回空 body，需要依赖重试或后续 fallback
- Cookie 有时效性，失效后需要重新更新 Worker secrets
- 当前还没有浏览器兜底抓取能力

---

## Roadmap

后续建议继续补：

- HTML fallback 抓取
- Browser Run / 浏览器兜底
- 更细粒度的失败分类与重试
- 订阅管理接口
- 自动部署与公开仓库配套文档完善
