import { describe, expect, it } from "vitest";
import { buildAwemePostApiUrl, extractSecUserId, parseAwemeList } from "../src/services/douyin";

describe("extractSecUserId", () => {
  it("extracts sec_user_id from creator profile url", () => {
    expect(extractSecUserId("https://www.douyin.com/user/MS4wLjABAAAAxxx")).toBe("MS4wLjABAAAAxxx");
  });
});

describe("buildAwemePostApiUrl", () => {
  it("builds the aweme api url", () => {
    expect(buildAwemePostApiUrl("https://www.douyin.com/user/MS4wLjABAAAAxxx")).toContain("sec_user_id=MS4wLjABAAAAxxx");
  });
});

describe("parseAwemeList", () => {
  it("parses aweme payloads into normalized videos", () => {
    const creator = { id: "c1", name: "博主A", profileUrl: "https://www.douyin.com/user/u1", enabled: true };
    const videos = parseAwemeList(creator, {
      aweme_list: [
        {
          aweme_id: "123",
          desc: "新作品",
          create_time: 1776816000,
          video: { cover: { url_list: ["https://example.com/cover.jpg"] } }
        }
      ]
    });
    expect(videos).toEqual([
      {
        videoId: "123",
        creatorId: "c1",
        creatorName: "博主A",
        title: "新作品",
        videoUrl: "https://www.douyin.com/video/123",
        coverUrl: "https://example.com/cover.jpg",
        publishTime: new Date(1776816000 * 1000).toISOString()
      }
    ]);
  });
});


describe("pinned ordering", () => {
  it("sorts by publish time instead of pinned order", () => {
    const creator = { id: "c1", name: "Alice", profileUrl: "https://www.douyin.com/user/u1", enabled: true };
    const videos = parseAwemeList(creator, {
      aweme_list: [
        { aweme_id: "old-top", desc: "置顶旧视频", create_time: 1700000000, is_top: 1 },
        { aweme_id: "newest-normal", desc: "真正最新视频", create_time: 1800000000, is_top: 0 },
        { aweme_id: "mid-normal", desc: "中间视频", create_time: 1750000000, is_top: 0 }
      ]
    });
    expect(videos.map((video) => video.videoId)).toEqual(["newest-normal", "mid-normal", "old-top"]);
  });
});
