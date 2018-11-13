document.addEventListener("DOMContentLoaded", (async () => {

  const res = await fetch("data.json")
  /** @type {Schema[]} */
  const data = await res.json();
  /** @type {number} */
  let lastDiff = 0;

  for (const [i, item] of data.entries()) {
    if (item.korea) {
      const result = createRowAfterKorea(item, i);
      lastDiff = result.diff;
      table.tBodies[0].appendChild(result.row);
    }
    else {
      table.tBodies[0].appendChild(createRowBeforeKorea(item, i, lastDiff));
    }
  }
}));

/**
 * @param {Schema} item
 * @param {number} i
 */
function createRowAfterKorea(item, i) {
  if (!item.korea) {
    throw new Error("`korea` field must exist");
  }
  const { element } = DOMLiner;
  const durationJp = diffDate(item.japan) + 1;
  const durationKr = diffDate(item.korea) + 1;
  const diff = diffDate({ start: item.japan.start, end: item.korea.start });
  const row = element("tr", undefined, [
    element("td", undefined, `${i + 1}`),
    element("td", undefined, [
      item.korea.title,
      document.createElement("br"),
      element("span", { class: "original" }, item.japan.title)
    ]),
    element("td", undefined, [
      item.japan.start,
      document.createElement("br"),
      `(${durationJp}일간)`
    ]),
    element("td", decorateByDuration(durationJp, durationKr), [
      item.korea.start,
      document.createElement("br"),
      `(${durationKr}일간)`
    ]),
    element("td", undefined, item.korea ? `${diff}일` : "")
  ]);
  return { row, diff };
}

/**
 * 
 * @param {number} japan 
 * @param {number} korea 
 */
function decorateByDuration(japan, korea) {
  if (japan === korea) {
    return;
  }
  if (japan < korea) {
    return { class: "excess" };
  }
  return { class: "under" };
}

/**
 * @param {Schema} item
 * @param {number} i
 * @param {number} diff
 */
function createRowBeforeKorea(item, i, diff) {
  const { element } = DOMLiner;
  const durationJp = diffDate(item.japan) + 1;
  return element("tr", { class: "prediction" }, [
    element("td", undefined, `${i + 1}`),
    element("td", undefined, [
      item.japan.title
    ]),
    element("td", undefined, [
      item.japan.start,
      document.createElement("br"),
      `(${durationJp}일간)`
    ]),
    element("td", undefined, [
      addDate(item.japan.start, diff) + "?"
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
