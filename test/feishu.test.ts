import { describe, expect, it } from "vitest";
import { buildCardPayload, buildTextPayload } from "../src/services/feishu";
import type { VideoRecord } from "../src/types";

const sample: VideoRecord = {
  videoId: "7631441258435642566",
  creatorId: "creator-1",
  creatorName: "口罩哥研报60秒",
  title: "美元指数跌下来之后，亚太货币并不是都涨了",
  videoUrl: "https://www.douyin.com/video/7631441258435642566",
  publishTime: "2026-04-22T04:49:40.000Z"
};

describe("buildCardPayload", () => {
  it("builds an interactive card with formatted fields", () => {
    const payload = buildCardPayload(sample) as any;
    expect(payload.msg_type).toBe("interactive");
    expect(payload.card.header.title.content).toBe("抖音更新提醒");
    const contents = payload.card.elements.map((element: any) => element.content);
    expect(contents[0]).toContain("**博主**：口罩哥研报60秒");
    expect(contents[1]).toContain("**标题**：美元指数跌下来之后，亚太货币并不是都涨了");
    expect(contents[2]).toContain("2026-04-22 12:49:40");
    expect(contents[3]).toContain("[打开抖音](https://www.douyin.com/video/7631441258435642566)");
  });
});

describe("buildTextPayload", () => {
  it("falls back to formatted text payload", () => {
    const payload = buildTextPayload(sample) as any;
    expect(payload.msg_type).toBe("text");
    expect(payload.content.text).toContain("发布时间：2026-04-22 12:49:40");
  });
});
