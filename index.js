document.addEventListener("DOMContentLoaded", (async () => {
  const { element } = DOMLiner;

  const res = await fetch("data.json")
  /** @type {Schema[]} */
  const data = await res.json();

  for (const [i, item] of data.entries()) {
    const durationJp = diffDate(item.japan) + 1;
    const durationKr = diffDate(item.korea) + 1;
    const diff = diffDate({ start: item.japan.start, end: item.korea.start });
    table.appendChild(element("tr", undefined, [
      element("td", undefined, `${i + 1}`),
      element("td", undefined, item.title),
      element("td", undefined, [
        item.japan.start,
        document.createElement("br"),
        durationKr < durationJp ?
          element("strong", undefined, `(${durationJp}일간)`) :
          `(${durationJp}일간)`
      ]),
      element("td", undefined, [
        item.korea.start,
        document.createElement("br"),
        durationJp < durationKr ?
          element("strong", undefined, `(${durationKr}일간)`) :
          `(${durationKr}일간)`
      ]),
      element("td", undefined, `${diff}일`)
    ]))
  }
}));

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
