document.addEventListener("DOMContentLoaded", (async () => {
  const { base, target } = getComparisonBaseTarget();

  const res = await fetch("data.json");
  /** @type {Schema[]} */
  const data = await res.json();
  /** @type {DateDiffs} */
  let lastDiff = {
    durationBase: 0,
    durationTarget: 0,
    diff: 0
  };

  for (const [i, item] of data.entries()) {
    const baseItem = item[base];
    const targetItem = item[target];
    if (!baseItem) {
      break;
    }
    if (targetItem) {
      lastDiff = getDiffs(baseItem, targetItem);
      table.tBodies[0].appendChild(createRowAfterTargetArea(baseItem, targetItem, i, lastDiff));
    }
    else {
      const prediction = lastDiff.diff + lastDiff.durationTarget - lastDiff.durationBase;
      table.tBodies[0].appendChild(createRowBeforeTargetArea(baseItem, i, prediction));
    }
  }
}));

function getComparisonBaseTarget() {
  const params = new URLSearchParams(location.search);
  const base = /** @type {keyof Schema} */ (params.get("base") || "japan");
  const target = /** @type {keyof Schema} */ (params.get("target") || "korea");
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
 * @param {Region} base
 * @param {Region} target
 * @param {number} i
 * @param {DateDiffs} diffs
 */
function createRowAfterTargetArea(base, target, i, diffs) {
  const { element } = DOMLiner;
  return element("tr", undefined, [
    element("td", undefined, `${i + 1}`),
    element("td", undefined, [
      target.title,
      document.createElement("br"),
      element("span", { class: "original", lang: "ja" }, base.title)
    ]),
    element("td", undefined, [
      base.start,
      document.createElement("br"),
      `(${diffs.durationBase}일간)`
    ]),
    element("td", decorateByDuration(diffs), [
      target.start,
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
function decorateByDuration({ durationBase: durationJp, durationTarget: durationKr }) {
  if (durationJp === durationKr) {
    return;
  }
  if (durationJp < durationKr) {
    return { class: "excess" };
  }
  return { class: "under" };
}

/**
 * @param {Region} base
 * @param {number} i
 * @param {number} diff
 */
function createRowBeforeTargetArea(base, i, diff) {
  const { element } = DOMLiner;
  const durationJp = diffDate(base) + 1;
  return element("tr", { class: "prediction" }, [
    element("td", undefined, `${i + 1}`),
    element("td", { lang: "ja" }, [
      base.title
    ]),
    element("td", undefined, [
      base.start,
      document.createElement("br"),
      `(${durationJp}일간)`
    ]),
    element("td", undefined, [
      addDate(base.start, diff) + "?"
    ]),
    element("td", undefined, `${diff}일?`)
  ]);
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
