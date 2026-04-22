# Douyin Feishu Watcher Worker Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build a Cloudflare Worker skeleton that polls Douyin creator feeds and pushes new-video notifications to Feishu without a dedicated server.

**Architecture:** A scheduled Worker polls subscriptions from D1, fetches creator aweme data via Cookie-authenticated HTTP requests, deduplicates videos in D1, and pushes text notifications to Feishu.

**Tech Stack:** TypeScript, Wrangler, Cloudflare Workers, Cloudflare D1, Vitest.

---

### Task 1: Scaffold project and quality gates
- [ ] Create TypeScript/Wrangler project files
- [ ] Add CI workflow
- [ ] Add README and design artifacts

### Task 2: Add D1 schema and repository helpers
- [ ] Create subscriptions/videos/failures/state schema
- [ ] Add typed D1 helper functions

### Task 3: Add Douyin fetch/parsing layer
- [ ] Port sec_user_id extraction and aweme API URL generation
- [ ] Parse aweme payloads into normalized video records
- [ ] Add unit tests for fetch URL and parser behavior

### Task 4: Add notifier and scheduled orchestration
- [ ] Implement Feishu notifier with optional signing
- [ ] Implement cron-driven polling flow
- [ ] Add health endpoint and startup/heartbeat handling

### Task 5: Verify and commit
- [ ] Run npm run check
- [ ] Commit with Lore protocol
