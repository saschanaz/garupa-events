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
        `(${durationJp}일간)`
      ]),
      element("td", undefined, [
        item.korea.start,
        document.createElement("br"),
        `(${durationKr}일간)`
      ]),
      element("td", undefined, `${diff}일`)
    ]))
  }
}));

/**
 * @param {Duration} obj
 */
function diffDate({start, end}) {
  const ms = new Date(`${end}+09:00`).valueOf() - new Date(`${start}+09:00`).valueOf();
  return ms / (1000 * 3600 * 24)
}
