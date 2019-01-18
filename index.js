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

  for (const [i, item] of data.entries()) {
    const baseItem = item[base];
    const targetItem = item[target];
    if (!baseItem) {
      break;
    }
    if (targetItem) {
      lastTargetItem = targetItem;
      const diffs = getDiffs(baseItem, targetItem);
      rows[i] = createRowAfterTargetArea(baseItem, targetItem, i, diffs);
    }
  }

  if (!lastTargetItem) {
    throw new Error("No last event");
  }

  for (const [i, item] of data.entries()) {
    const baseItem = item[base];
    if (!baseItem) {
      break;
    }
    const previousBaseItem = data[i - 1] && data[i - 1][base];
    if (!item[target] && previousBaseItem && lastTargetItem) {
      const blank = diffDate({ start: previousBaseItem.end, end: baseItem.start });
      const duration = diffDate(baseItem);
      /** @type {Region} */
      const newTargetItem = {
        title: baseItem.title,
        start: addDate(lastTargetItem.end, blank),
        end: addDate(lastTargetItem.end, blank + duration)
      };

      const lastDiff = getDiffs(baseItem, newTargetItem);
      const prediction = lastDiff.diff + lastDiff.durationTarget - lastDiff.durationBase;
      rows[i] = createRowBeforeTargetArea(baseItem, i, prediction);

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
