/// <reference path="../../static/types.d.ts" />

import fetch from "node-fetch";
import { promises as fs } from "fs";
import { createRequire } from "module";
const require = createRequire(import.meta.url);

/**
 * @param {string} url
 */
async function fetchAsText(url) {
  console.log(url);
  const res = await fetch(url);
  const text = await res.text();
  if (!res.ok && !text.includes("search the related logs")) {
    throw new Error(res.statusText);
  }
  return text;
}

/**
 * @param {string} htmlStr
 */
async function checkRedirect(htmlStr) {
  const regex = /href="([^"]+)">search the related logs<\/a>/;
  const match = htmlStr.match(regex);
  if (!match) {
    return null;
  }
  const logText = fetchAsText(match[1]);
  const redirectRegex = /to <a href="\/wiki\/([^"]+)"/;
  const redirectMatch = (await logText).match(redirectRegex);
  if (!redirectMatch) {
    throw new Error("Cannot follow redirection!");
  }
  return decodeURI(redirectMatch[1]);
}

/**
 * @param {string} wikiId
 */
async function fetchFromWiki(wikiId) {
  return fetchAsText(`https://bandori.fandom.com/wiki/${encodeURIComponent(wikiId)}`);
}

async function getTitle(htmlStr) {
  const titleRegex = /<title>([^|]+) \|/;
  const titleMatch = htmlStr.match(titleRegex);
  if (!titleMatch) {
    throw new Error("Cannot detect the title!");
  }
  return titleMatch[1];
}

async function getDate(htmlStr, rowTitle) {
  const dateRegex = new RegExp(`${rowTitle}[^A-Z]+">(\\w+ \\d\\d?, \\d{4} \\d{2}:\\d{2} UTC)`);
  const dateMatch = htmlStr.match(dateRegex);
  if (!dateMatch) {
    throw new Error("Cannot detect the date!");
  }
  const parsed = new Date(dateMatch[1]);
  const year = parsed.getUTCFullYear().toString().padStart(4, "0");
  const month = (parsed.getUTCMonth() + 1).toString().padStart(2, "0");
  const date = parsed.getUTCDate().toString().padStart(2, "0");
  return `${year}-${month}-${date}`;
}

/**
 * @param {string} wikiId
 */
async function extractFromWiki(wikiId) {
  let html = await fetchFromWiki(wikiId);
  while (true) {
    const redirectId = await checkRedirect(html);
    if (!redirectId) {
      break;
    }
    wikiId = redirectId;
    html = await fetchFromWiki(wikiId);
  }

  const title = await getTitle(html);
  if (html.includes("Event Start (WW)")) {
    const startDate = await getDate(html, "Event Start \\(WW\\)");
    const endDate = await getDate(html, "Event End \\(WW\\)");
    return { wikiId, title, startDate, endDate };
  }
  return { wikiId, title };
}

/**
 * @param {Schema[]} data
 */
async function tryUpdatingData(data) {
  const noGlobal = data.filter((d) => !d.region.global);
  for (const item of noGlobal) {
    if (!item.linkId) {
      break;
    }
    const eventData = await extractFromWiki(item.linkId);
    item.linkId = eventData.wikiId;
    if (!eventData.startDate) {
      break;
    }
    item.region.global = {
      title: eventData.title,
      start: eventData.startDate,
      end: eventData.endDate
    };
  }
}

/**
 * @param {string} prevLinkId
 */
async function getNextLinkId(prevLinkId) {
  const html = await fetchFromWiki(prevLinkId);
  const regex = /href="\/wiki\/([^"]+)" title=".+">Next Event →<\/a>/;
  const match = html.match(regex);
  if (match) {
    return decodeURIComponent(match[1]);
  }
}

/**
 * @param {Schema[]} data
 */
async function tryGettingLinkId(data) {
  const firstIndex = data.findIndex((d) => !d.linkId);
  if (firstIndex === -1) {
    return;
  }
  for (const [i, item] of data.slice(firstIndex).entries()) {
    const next = await getNextLinkId(data[firstIndex + i - 1].linkId);
    if (next) {
      item.linkId = next;
    }
  }
}

export default async function update() {
  const data = require("../../static/data.json");

  await tryUpdatingData(data);
  await tryGettingLinkId(data);

  await fs.writeFile(
    new URL("../../static/data.json", import.meta.url),
    JSON.stringify(data, null, 2) + "\n"
  );
}
