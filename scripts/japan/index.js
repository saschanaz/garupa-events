import fetch from "node-fetch";
import { promises as fs } from "fs";
import { createRequire } from "module";
const require = createRequire(import.meta.url);

/**
 * @param {string} url
 */
async function fetchAsJson(url) {
  const res = await fetch(url);
  if (!res.ok) {
    throw new Error(res.statusText);
  }
  return await res.json();
}

/**
 * @param {string} titleProse
 */
function extractEventAbstract(titleProse) {
  const titleRegex = /(?:次回、)?(?:新イベント形式の)?(.+)イベント(?:『.+)?「(.+)」/;
  const [, typeJpn, title] = titleProse.match(titleRegex);
  const type = (() => {
    switch (typeJpn) {
      case "チャレンジライブ":
        return "challenge";
      case "対バンライブ":
        return "versus";
      case "ライブトライ！":
        return "try";
      case "ミッションライブ":
        return "mission";
      case "チームライブフェス":
        return "team";
      case "メドレーライブ":
        return "medley";
    }
    throw new Error(`Couldn't detect the type: ${typeJpn}`);
  })();
  const isPreNotice = titleProse.includes("次回、");
  return { title, type, isPreNotice };
}

/**
 * @param {string} htmlStr
 */
function extractEventInfo(htmlStr, startYear) {
  const timeRangeRegex =
    /開催期間】<br>\s+(\d\d?)月(\d\d?)日\d+時 [～〜] (?:\d{4}年)?(\d\d?)月(\d\d?)日/;
  const [, startMonth, startDate, endMonth, endDate] =
    htmlStr.match(timeRangeRegex);
  if (!startMonth) {
    throw new Error("Could not detect the event time range");
  }
  const endYear = endMonth < startMonth ? Number(startYear) + 1 : startYear;

  const attribute = (() => {
    if (htmlStr.includes("次回、")) {
      return null; // pre-event notice lacks the attribute
    }
    const attributeRegex = /([^\s]+)タイプの全メンバー/;
    const [, attributeJpn] = htmlStr.match(attributeRegex);
    switch (attributeJpn) {
      case "ピュア":
        return "pure";
      case "クール":
        return "cool";
      case "ハッピー":
        return "happy";
      case "パワフル":
        return "powerful";
    }
    throw new Error("Couldn't detect the attribute");
  })();

  return {
    start: `${startYear}-${startMonth.padStart(2, "0")}-${startDate.padStart(
      2,
      "0"
    )}`,
    end: `${endYear}-${endMonth.padStart(2, "0")}-${endDate.padStart(2, "0")}`,
    attribute,
  };
}

export default async function update() {
  const data = require("../../static/data.json");

  /**
   * @type {BandoriInformations}
   *
   * @typedef {object} BandoriInformations
   * @property {BandoriInformation[]} NOTICE
   * @property {BandoriInformation[]} TOPIC
   *
   * @typedef {object} BandoriInformation
   * @property {string} title
   */
  const info = await fetchAsJson(
    "https://api.star.craftegg.jp/api/information"
  );

  const events = info.NOTICE.filter(
    (notice) => notice.informationType === "EVENT"
  );
  if (info.TOPIC) {
    events.push(
      ...info.TOPIC.filter((topic) => topic.title.includes("イベント"))
    );
  }

  for (const event of events.slice().reverse()) {
    if (event.title.includes("先行公開")) {
      continue;
    }
    const abstract = extractEventAbstract(event.title);
    const existing = data.find((d) => d.region.japan.title === abstract.title);
    if (existing && (existing.meta?.attribute || abstract.isPreNotice)) {
      console.log(
        `Already exists, skipping: [${abstract.title}](${event.linkUrl})`
      );
      continue;
    }
    const [, date] = event.linkUrl.match(/_(\d{6,})_/);
    if (!date) {
      throw new Error(`Unexpected link URL format: ${event.linkUrl}`);
    }
    const year = "20" + date.slice(0, 2);
    const html = await (
      await fetch(
        new URL(event.linkUrl, "https://web.star.craftegg.jp/information/")
      )
    ).text();

    const eventInfo = extractEventInfo(html, year);
    if (existing) {
      existing.meta = { ...existing.meta, attribute: eventInfo.attribute };
      existing.region.japan.noticeId = event.linkUrl;
    } else {
      data.push({
        linkId: null,
        meta: eventInfo.attribute ? { attribute: eventInfo.attribute } : null,
        type: abstract.type,
        region: {
          japan: {
            title: abstract.title,
            start: eventInfo.start,
            end: eventInfo.end,
            noticeId: event.linkUrl,
          },
          taiwan: null,
          korea: null,
          global: null,
          china: null,
        },
      });
    }
  }

  await fs.writeFile(
    new URL("../../static/data.json", import.meta.url),
    JSON.stringify(data, null, 2) + "\n"
  );
}
