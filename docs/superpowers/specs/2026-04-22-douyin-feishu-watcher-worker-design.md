# Douyin Feishu Watcher Worker 设计

## 目标

为 `douyin-feishu-watcher` 提供一个独立的 Cloudflare Worker 版本骨架，用于验证抖音 Cookie + Web API 抓取在 Cloudflare 环境中的可行性，并替代现有 Python + SQLite + APScheduler 的常驻运行模式。

## 架构

- `scheduled` 轮询 D1 里的订阅列表
- `DouyinClient` 调用 `aweme/v1/web/aweme/post` 拉取作品列表
- `D1` 保存订阅、视频去重、失败计数、应用状态
- `FeishuNotifier` 发送新视频通知、启动通知和异常提醒

## 关键风险

- 抖音反爬 / 风控可能导致 Worker 环境比普通服务器更不稳定
- Cookie 是必要依赖，并且需要通过 Worker secret 注入
- 第一版只走 API 抓取，不做浏览器兜底

## 第一版范围

- 健康检查接口
- D1 schema
- 订阅列表读取
- 新视频去重
- 飞书文本通知
- 启动通知、心跳、失败计数
