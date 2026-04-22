import { cleanString } from "../lib/value";
import type { AppConfig, Subscription, VideoRecord } from "../types";

const DEFAULT_USER_AGENT =
  "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/135.0.0.0 Safari/537.36";

export function extractSecUserId(profileUrl: string): string | undefined {
  try {
    const parsed = new URL(profileUrl);
    const parts = parsed.pathname.split("/").filter(Boolean);
    if (parts.length >= 2 && parts[0] === "user") {
      return parts[1];
    }
  } catch {
    return undefined;
  }
  return undefined;
}

export function buildAwemePostApiUrl(profileUrl: string): string {
  const secUserId = extractSecUserId(profileUrl);
  if (!secUserId) throw new Error(`Unsupported Douyin profile URL: ${profileUrl}`);
  return (
    "https://www.douyin.com/aweme/v1/web/aweme/post/" +
    "?device_platform=webapp&aid=6383&channel=channel_pc_web" +
    `&sec_user_id=${encodeURIComponent(secUserId)}` +
    "&max_cursor=0&locate_query=false&show_live_replay_strategy=1" +
    "&need_time_list=1&time_list_query=0&whale_cut_token=&cut_version=1" +
    "&count=18&publish_video_strategy_type=2&from_user_page=1" +
    "&version_code=290100&version_name=29.1.0"
  );
}

function publishTimestampToIso(value: unknown): string | undefined {
  const num = Number(value);
  if (!Number.isFinite(num) || num <= 0) return undefined;
  return new Date(num * 1000).toISOString();
}

export function parseAwemeList(creator: Subscription, payload: Record<string, unknown>): VideoRecord[] {
  const awemeList = Array.isArray(payload.aweme_list) ? payload.aweme_list : [];
  return awemeList
    .filter((item): item is Record<string, unknown> => !!item && typeof item === "object" && !Array.isArray(item))
    .map((item) => {
      const awemeId = cleanString(item.aweme_id);
      const desc = cleanString(item.desc) || "抖音新作品";
      const videoUrl = awemeId ? `https://www.douyin.com/video/${awemeId}` : creator.profileUrl;
      const video = item.video && typeof item.video === "object" && !Array.isArray(item.video) ? item.video as Record<string, unknown> : undefined;
      const cover = video?.cover && typeof video.cover === "object" && !Array.isArray(video.cover) ? video.cover as Record<string, unknown> : undefined;
      const urlList = Array.isArray(cover?.url_list) ? cover?.url_list : [];
      return {
        videoId: awemeId,
        creatorId: creator.id,
        creatorName: creator.name,
        title: desc,
        videoUrl,
        coverUrl: typeof urlList[0] === "string" ? urlList[0] : undefined,
        publishTime: publishTimestampToIso(item.create_time)
      } satisfies VideoRecord;
    })
    .filter((video) => video.videoId)
    .sort((left, right) => {
      const l = left.publishTime ? Date.parse(left.publishTime) : 0;
      const r = right.publishTime ? Date.parse(right.publishTime) : 0;
      return r - l;
    });
}

export class DouyinClient {
  constructor(private readonly config: AppConfig) {}

  async fetchCreatorVideos(creator: Subscription): Promise<VideoRecord[]> {
    if (!this.config.douyinCookie) {
      throw new Error("missing DOUYIN_COOKIE");
    }
    const response = await fetch(buildAwemePostApiUrl(creator.profileUrl), {
      headers: {
        "User-Agent": DEFAULT_USER_AGENT,
        "Accept-Language": "zh-CN,zh;q=0.9,en;q=0.8",
        Referer: "https://www.douyin.com/",
        Cookie: this.config.douyinCookie
      },
      signal: AbortSignal.timeout(this.config.requestTimeoutMs)
    });
    const text = await response.text();
    if (!response.ok) {
      throw new Error(`Douyin API HTTP ${response.status}: ${text.slice(0, 200)}`);
    }
    const data = JSON.parse(text) as Record<string, unknown>;
    return parseAwemeList(creator, data);
  }
}
