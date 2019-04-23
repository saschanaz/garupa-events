const { element } = DOMLiner;

const lang = {
  "japan": "ja",
  "taiwan": "zh",
  "korea": "ko",
  "global": "en"
}

const baseLinkUrl = "https://bandori.fandom.com/wiki/";

document.addEventListener("DOMContentLoaded", (async () => {
  const { base, target } = getComparisonBaseTarget();
  showSelection(base, target);
  nameHeads(base, target);
  attachChangeListener();

  const res = await fetch("data.json");
  /** @type {Schema[]} */
  const data = await res.json();
  /** @type {Region | null} */
  let lastTargetItem = null;

  /** @type {HTMLTableRowElement[]} */
  const rows = [];

  for (const event of yieldEventData(data, base, target)) {
    const { index, targetRegion } = event;
    if (targetRegion) {
      if (!lastTargetItem || diffDate({ start: lastTargetItem.start, end: targetRegion.start }) > 0) {
        lastTargetItem = targetRegion;
      }
      rows[index] = createRowAfterTargetArea(event);
    }
  }

  if (!lastTargetItem) {
    throw new Error("No last event");
  }

  for (const event of yieldEventData(data, base, target)) {
    const { index, targetRegion, baseRegion } = event;
    const previousBaseItem = data[index - 1] && data[index - 1].region[base];
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

  table.tBodies[0].append(...rows);
}));

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

function getComparisonBaseTarget() {
  const params = new URLSearchParams(location.search);
  const base = /** @type {keyof Schema["region"]} */ (params.get("base") || "japan");
  const target = /** @type {keyof Schema["region"]} */ (params.get("target") || "korea");
  return { base, target };
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
 * @param {IteratorParameter<ReturnType<typeof yieldEventData>>} event
 */
function createRowAfterTargetArea({ baseRegion, targetRegion, baseLang, targetLang, index, diffs, externalLink }) {
  if (!targetRegion) {
    throw new Error("Target region data is required");
  }
  if (!diffs) {
    throw new Error("Diff data is required");
  }
  return element("tr", undefined, [
    element("td", undefined, `${index + 1}`),
    element("td", undefined, [
      wrapAnchor(externalLink, [
        element("span", { lang: targetLang }, targetRegion.title),
        document.createElement("br"),
        element("span", { class: "original", lang: baseLang }, baseRegion.title)
      ])]
    ),
    element("td", undefined, [
      baseRegion.start,
      document.createElement("br"),
      `(${diffs.durationBase}일간)`
    ]),
    element("td", decorateByDuration(diffs), [
      targetRegion.start,
      document.createElement("br"),
      `(${diffs.durationTarget}일간)`
    ]),
    element("td", undefined, `${diffs.diff}일`)
  ]);
}

/**
 * 
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
function createRowBeforeTargetArea({ baseRegion, baseLang, index, externalLink }, diff) {
  const durationJp = diffDate(baseRegion) + 1;
  return element("tr", { class: "prediction" }, [
    element("td", undefined, `${index + 1}`),
    element("td", { lang: baseLang }, [
      wrapAnchor(externalLink, [
        baseRegion.title
      ])
    ]),
    element("td", undefined, [
      baseRegion.start,
      document.createElement("br"),
      `(${durationJp}일간)`
    ]),
    element("td", undefined, [
      addDate(baseRegion.start, diff) + "?"
    ]),
    element("td", undefined, `${diff}일?`)
  ]);
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

    yield {
      index,
      externalLink: schema.linkId && `${baseLinkUrl}${schema.linkId}`,
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
  return ms / (1000 * 3600 * 24)
}

/**
 * @param {string?} externalLink
 * @param {(string | Node)[]} children
 */
function wrapAnchor(externalLink, children) {
  if (!externalLink) {
    const wrapper = document.createDocumentFragment();
    wrapper.append(...children);
    return wrapper;
  }
  const hitbox = element("div", { class: "hitbox" }, children)
  const anchor = element("a", { href: externalLink }, [hitbox]);
  return anchor;
}
