document.addEventListener("DOMContentLoaded", (async () => {
  const res = await fetch("data.json");
  /** @type {Schema[]} */
  const data = await res.json();
  /** @type {DateDiffs} */
  let lastDiff = {
    durationJp: 0,
    durationKr: 0,
    diff: 0
  };

  for (const [i, item] of data.entries()) {
    if (item.korea) {
      lastDiff = getDiffs(item);
      table.tBodies[0].appendChild(createRowAfterKorea(item, i, lastDiff));
    }
    else {
      const prediction = lastDiff.diff + lastDiff.durationKr - lastDiff.durationJp;
      table.tBodies[0].appendChild(createRowBeforeKorea(item.japan, i, prediction));
    }
  }
}));

/**
 * @param {Schema} item 
 */
function getDiffs(item) {
  if (!item.korea) {
    throw new Error("`korea` field must exist");
  }
  const durationJp = diffDate(item.japan) + 1;
  const durationKr = diffDate(item.korea) + 1;
  const diff = diffDate({ start: item.japan.start, end: item.korea.start });
  return { durationJp, durationKr, diff };
}

/**
 * @param {Schema} item
 * @param {number} i
 * @param {DateDiffs} diffs
 */
function createRowAfterKorea(item, i, diffs) {
  if (!item.korea) {
    throw new Error("`korea` field must exist");
  }
  const { element } = DOMLiner;
  return element("tr", undefined, [
    element("td", undefined, `${i + 1}`),
    element("td", undefined, [
      item.korea.title,
      document.createElement("br"),
      element("span", { class: "original" }, item.japan.title)
    ]),
    element("td", undefined, [
      item.japan.start,
      document.createElement("br"),
      `(${diffs.durationJp}일간)`
    ]),
    element("td", decorateByDuration(diffs), [
      item.korea.start,
      document.createElement("br"),
      `(${diffs.durationKr}일간)`
    ]),
    element("td", undefined, item.korea ? `${diffs.diff}일` : "")
  ]);
}

/**
 * 
 * @param {DateDiffs} param
 */
function decorateByDuration({ durationJp, durationKr }) {
  if (durationJp === durationKr) {
    return;
  }
  if (durationJp < durationKr) {
    return { class: "excess" };
  }
  return { class: "under" };
}

/**
 * @param {Region} japan
 * @param {number} i
 * @param {number} diff
 */
function createRowBeforeKorea(japan, i, diff) {
  const { element } = DOMLiner;
  const durationJp = diffDate(japan) + 1;
  return element("tr", { class: "prediction" }, [
    element("td", undefined, `${i + 1}`),
    element("td", undefined, [
      japan.title
    ]),
    element("td", undefined, [
      japan.start,
      document.createElement("br"),
      `(${durationJp}일간)`
    ]),
    element("td", undefined, [
      addDate(japan.start, diff) + "?"
    ]),
    element("td")
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
