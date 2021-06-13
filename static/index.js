const { element: el } = DOMLiner;

const lang = {
  "japan": "ja",
  "taiwan": "zh-tw",
  "korea": "ko",
  "global": "en",
  "china": "zh-cn"
}

const l10n = {
  ko: {
    type: {
      normal: "일반",
      challenge: "챌린지",
      versus: "합동",
      try: "트라이",
      mission: "미션"
    },
    gacha: {
      dreamFestival: "드림 페스티벌",
      dreamFestivalShort: "드페"
    }
  }
};

const baseLinkUrl = "https://bandori.fandom.com/wiki/";

document.addEventListener("DOMContentLoaded", (async () => {
  const { baseArea, targetArea } = getComparisonAreas();
  showSelection(baseArea, targetArea);
  nameHeads(baseArea, targetArea);
  attachChangeListener();

  const res = await fetch(new URL("data.json", import.meta.url).toString());
  /** @type {Schema[]} */
  const data = await res.json();

  let { lastTargetItem, rows } = createRowsAfterTargetArea(data, baseArea, targetArea);

  if (!lastTargetItem) {
    throw new Error("No last event");
  }

  createRowsBeforeTargetArea(data, baseArea, targetArea, lastTargetItem, rows);

  table.tBodies[0].append(...rows.slice().reverse());
}));

/**
 * @param {Schema[]} data
 * @param {keyof Schema["region"]} baseArea
 * @param {keyof Schema["region"]} targetArea
 */
function createRowsAfterTargetArea(data, baseArea, targetArea) {
  /** @type {Region | null} */
  let lastTargetItem = null;
  /** @type {HTMLTableRowElement[]} */
  const rows = [];

  for (const event of yieldEventData(data, baseArea, targetArea)) {
    const { index, targetRegion } = event;
    if (targetRegion) {
      if (!lastTargetItem || diffDate({ start: lastTargetItem.start, end: targetRegion.start }) > 0) {
        lastTargetItem = targetRegion;
      }
      rows[index] = createRowAfterTargetArea(event);
    }
  }
  return { lastTargetItem, rows };
}

/**
 * @param {Schema[]} data
 * @param {keyof Schema["region"]} baseArea
 * @param {keyof Schema["region"]} targetArea
 * @param {Region} lastTargetItem
 * @param {HTMLTableRowElement[]} rows
 */
function createRowsBeforeTargetArea(data, baseArea, targetArea, lastTargetItem, rows) {
  for (const event of yieldEventData(data, baseArea, targetArea)) {
    const { index, targetRegion, baseRegion } = event;
    const previousBaseItem = data[index - 1] && data[index - 1].region[baseArea];
    if (!targetRegion && previousBaseItem && lastTargetItem) {
      const blank = diffDate({ start: previousBaseItem.end, end: baseRegion.start });
      const duration = diffDate(baseRegion);
      /** @type {Region} */
      const newTargetItem = {
        title: baseRegion.title,
        start: addDate(lastTargetItem.end, blank),
        end: addDate(lastTargetItem.end, blank + duration)
      };

      const lastDiff = getDiffs(baseRegion, newTargetItem);
      const prediction = lastDiff.diff + lastDiff.durationTarget - lastDiff.durationBase;
      rows[index] = createRowBeforeTargetArea(event, prediction);

      lastTargetItem = newTargetItem;
    }
  }
}

function attachChangeListener() {
  const baseSelect = document.getElementById("baseSelect");
  const targetSelect = document.getElementById("targetSelect");

  baseSelect.addEventListener("change", reloadWithSelection);
  targetSelect.addEventListener("change", reloadWithSelection);
}

function reloadWithSelection() {
  /** @type {HTMLSelectElement} */
  const baseSelect = document.getElementById("baseSelect");
  /** @type {HTMLSelectElement} */
  const targetSelect = document.getElementById("targetSelect");

  const base = baseSelect.selectedOptions[0];
  const target = targetSelect.selectedOptions[0];
  location.href = `./?base=${base.value}&target=${target.value}`;
}

/**
 * @param {string} base
 * @param {string} target
 */
function showSelection(base, target) {
  /** @type {HTMLSelectElement} */
  const baseSelect = document.getElementById("baseSelect");
  /** @type {HTMLSelectElement} */
  const targetSelect = document.getElementById("targetSelect");
  baseSelect.value = base;
  targetSelect.value = target;
}

/**
 * @param {string} base
 * @param {string} target
 */
function nameHeads(base, target) {
  const baseHead = document.getElementById("baseHead");
  const targetHead = document.getElementById("targetHead");
  baseHead.textContent = nameHead(base);
  targetHead.textContent = nameHead(target);
}

/**
 * @param {string} name
 */
function nameHead(name) {
  /** @type {HTMLSelectElement} */
  const baseSelect = document.getElementById("baseSelect");
  const option = [...baseSelect.options].find(o => o.value === name);
  if (!option) {
    throw new Error("Unknown value");
  }
  return option.textContent;
}

function getComparisonAreas() {
  const params = new URLSearchParams(location.search);
  const baseArea = /** @type {keyof Schema["region"]} */ (params.get("base") || "japan");
  const targetArea = /** @type {keyof Schema["region"]} */ (params.get("target") || "korea");
  return { baseArea, targetArea };
}

/**
 * @param {Region} base
 * @param {Region} target
 * @return {DateDiffs}
 */
function getDiffs(base, target) {
  const durationBase = diffDate(base) + 1;
  const durationTarget = diffDate(target) + 1;
  const diff = diffDate({ start: base.start, end: target.start });
  return { durationBase, durationTarget, diff };
}

/**
 * @param {Meta["attribute"]} attr
 */
function createAttributeIcon(attr) {
  if (attr) {
    return [el("img", { class: "attribute", src: new URL(`./assets/${attr}.svg`, import.meta.url) })]
  }
}

/**
 * @param {Meta} eventMeta
 */
function createGachaIcons({ dreamFestival }) {
  if (!dreamFestival) {
    return;
  }

  return [el("a", {
    title: l10n.ko.gacha.dreamFestival,
    ...dreamFestival.linkId ? {
      href: `${baseLinkUrl}${encodeURI(dreamFestival.linkId)}`
    } : undefined,
    class: "gacha dream-festival",
    target: "_blank"
  }, l10n.ko.gacha.dreamFestivalShort)];
}

/**
 * @param {IteratorParameter<ReturnType<typeof yieldEventData>>} event
 */
function createRowAfterTargetArea(event) {
  const { baseRegion, targetRegion, baseLang, targetLang, index, diffs, meta } = event;
  if (!targetRegion) {
    throw new Error("Target region data is required");
  }
  if (!diffs) {
    throw new Error("Diff data is required");
  }
  return el("tr", undefined, [
    el("td", undefined, `${index + 1}`),
    el("td", undefined, [
      wrapAnchor(event.externalLink, [
        el("span", { lang: targetLang }, targetRegion.title),
        el("span", { class: "original", lang: baseLang }, baseRegion.title)
      ])]
    ),
    el("td", undefined, l10n.ko.type[event.type]),
    el("td", undefined, meta && createAttributeIcon(meta.attribute)),
    el("td", undefined, meta && createGachaIcons(meta)),
    el("td", undefined, [
      baseRegion.start,
      document.createElement("br"),
      `(${diffs.durationBase}일간)`
    ]),
    el("td", decorateByDuration(diffs), [
      targetRegion.start,
      document.createElement("br"),
      `(${diffs.durationTarget}일간)`
    ]),
    el("td", undefined, `${diffs.diff}일`)
  ]);
}

/**
 * @param {DateDiffs} param
 */
function decorateByDuration({ durationBase, durationTarget }) {
  if (durationBase === durationTarget) {
    return;
  }
  if (durationBase < durationTarget) {
    return { class: "excess" };
  }
  return { class: "under" };
}

/**
 * @param {IteratorParameter<ReturnType<typeof yieldEventData>>} event
 * @param {number} diff
 */
function createRowBeforeTargetArea(event, diff) {
  const { baseRegion, baseLang, index, externalLink, meta } = event;
  const durationJp = diffDate(baseRegion) + 1;
  return el("tr", { class: "prediction" }, [
    el("td", undefined, `${index + 1}`),
    el("td", { lang: baseLang }, [
      wrapAnchor(externalLink, [baseRegion.title])
    ]),
    el("td", undefined, l10n.ko.type[event.type]),
    el("td", undefined, meta && createAttributeIcon(meta.attribute)),
    el("td", undefined, meta && createGachaIcons(meta)),
    el("td", undefined, [
      baseRegion.start,
      document.createElement("br"),
      `(${durationJp}일간)`
    ]),
    el("td", undefined, [
      addDate(baseRegion.start, diff) + "?"
    ]),
    el("td", undefined, `${diff}일?`)
  ]);
}

/**
 * @param {Schema} schema
 * @param {keyof Schema["region"]} target
 */
function getNoticeUrl(schema, target) {
  const id = schema.region[target]?.noticeId;
  if (!id) {
    return;
  }
  switch (target) {
    case "japan":
      return `https://web.star.craftegg.jp/information/${id}`;
  }
  throw new Error(`noticeId not supported for ${target}`);
}

/**
 * @param {Schema[]} data
 * @param {keyof Schema["region"]} base
 * @param {keyof Schema["region"]} target
 */
function* yieldEventData(data, base, target) {
  for (const [index, schema] of data.entries()) {
    const baseRegion = schema.region[base];
    const targetRegion = schema.region[target];
    if (!baseRegion) {
      break;
    }
    const diffs = targetRegion && getDiffs(baseRegion, targetRegion);

    const externalLink = schema.linkId
      ? `${baseLinkUrl}${schema.linkId}`
      : (getNoticeUrl(schema, target) ?? getNoticeUrl(schema, base));

    yield {
      index,
      externalLink,
      meta: schema.meta,
      type: schema.type,
      baseLang: lang[base],
      targetLang: lang[target],
      baseRegion,
      targetRegion,
      diffs
    };
  }
}

/**
 *
 * @param {string} date
 * @param {number} diff
 */
function addDate(date, diff) {
  const newDate = new Date(parseDate(date) + diff * 1000 * 3600 * 24 + 1000 * 3600 * 9);
  const yyyy = newDate.getUTCFullYear();
  const mm = padZero(newDate.getUTCMonth() + 1, 2);
  const dd = padZero(newDate.getUTCDate(), 2);
  return `${yyyy}-${mm}-${dd}`;
}

/**
 *
 * @param {number} num
 * @param {number} length
 */
function padZero(num, length) {
  const str = num.toString();
  return "0".repeat(length - str.length) + str;
}

/**
 * @param {string} str
 * @return milliseconds
 */
function parseDate(str) {
  return Date.parse(`${str}T00:00+09:00`)
}

/**
 * @param {Duration} obj
 */
function diffDate({ start, end }) {
  const ms = parseDate(end) - parseDate(start);
  return ms / (1000 * 3600 * 24);
}

/**
 * @param {string | undefined} externalLink
 * @param {(string | Node)[]} children
 */
function wrapAnchor(externalLink, children) {
  if (!externalLink) {
    return el("div", { class: "titlebox" }, children);
  }
  const hitbox = el("div", { class: "titlebox hitbox" }, children);
  const anchor = el("a", { href: externalLink, target: "_blank" }, [hitbox]);
  return anchor;
}
