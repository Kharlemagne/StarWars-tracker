// Sanity-checks the tracker data so a typo in src/data.js fails the build
// instead of silently breaking the live site. Run with: npm run check
import * as D from "../src/data.js";

const errors = [];
const err = (m) => errors.push(m);

// 1. every id must be unique (saved checkmarks are stored by id)
const seen = new Map();
[...D.LIST.map((x) => [x, "LIST"]), ...D.EXTRAS.map((x) => [x, "EXTRAS"])].forEach(([x, where]) => {
  if (seen.has(x.id)) err(`Duplicate id "${x.id}" in ${where} (also in ${seen.get(x.id)})`);
  else seen.set(x.id, where);
});

// 2. every entry needs a title, a date, a valid type and a real era
const TYPES = new Set(["Film", "Series", "Animated", "Anthology"]);
const eraKeys = new Set([...D.ERAS.map((x) => x.key), "extras"]);
[...D.LIST, ...D.EXTRAS].forEach((x) => {
  if (!x.title) err(`Entry "${x.id}" has no title`);
  if (!x.date) err(`Entry "${x.id}" has no date`);
  if (!TYPES.has(x.type)) err(`Entry "${x.id}" has unknown type "${x.type}"`);
  if (!eraKeys.has(x.era)) err(`Entry "${x.id}" points at unknown era "${x.era}"`);
  if (!Number.isInteger(x.eps) || x.eps < 0) err(`Entry "${x.id}" has a bad episode count`);
  if (x.epInfo && x.epInfo.length !== x.eps) err(`Entry "${x.id}" lists ${x.epInfo.length} episode titles but eps is ${x.eps}`);
});

// 3. the list must stay grouped by era, in era order, with no empty eras
const eraOrder = D.ERAS.map((x) => x.key);
let lastIdx = -1;
D.LIST.forEach((x) => {
  const i = eraOrder.indexOf(x.era);
  if (i === -1) return; // already reported above
  if (i < lastIdx) err(`"${x.id}" (${x.era}) appears after a later era — keep the list in era order`);
  lastIdx = Math.max(lastIdx, i);
});
D.ERAS.forEach((era) => {
  if (!D.LIST.some((x) => x.era === era.key)) err(`Era "${era.key}" has no entries`);
});

// 4. The Clone Wars: every one of the 133 episodes must appear exactly once
const SEASON_SIZES = { 1: 22, 2: 22, 3: 22, 4: 22, 5: 20, 6: 13, 7: 12 };
const cw = {};
D.LIST.filter((x) => x.id.startsWith("tcw-") && x.epInfo).forEach((x) =>
  x.epInfo.forEach((ep) => {
    const k = `${ep.season}-${ep.num}`;
    cw[k] = (cw[k] || 0) + 1;
  })
);
let cwTotal = 0;
Object.entries(SEASON_SIZES).forEach(([s, size]) => {
  for (let n = 1; n <= size; n++) {
    cwTotal++;
    const c = cw[`${s}-${n}`] || 0;
    if (c === 0) err(`Clone Wars S${s} E${String(n).padStart(2, "0")} is missing from the list`);
    if (c > 1) err(`Clone Wars S${s} E${String(n).padStart(2, "0")} appears ${c} times`);
  }
});
Object.keys(cw).forEach((k) => {
  const [s, n] = k.split("-").map(Number);
  if (!SEASON_SIZES[s] || n < 1 || n > SEASON_SIZES[s]) err(`Clone Wars has an episode that shouldn't exist: S${s} E${n}`);
});

// 4b. every Clone Wars entry needs a group name (the heading it is shown under)
D.LIST.filter((x) => x.id.startsWith("tcw-")).forEach((x) => { if (!x.group) err(`Clone Wars entry "${x.id}" has no group name in CW_GROUPS`); });

// 5. anchor order from Lucasfilm's published guide — these must stay in this relative order
const ANCHORS = [
  "acolyte", "tpm", "aotc", "tcw-prelude", "tcw-movie", "tcw-cadets", "tcw-siege", "rots",
  "bb1", "bb3", "maul1", "solo", "obiwan", "andor1", "rebels1", "rogueone",
  "anh", "esb", "rotj", "mando1", "bobf", "mando3", "ahsoka1", "skeletoncrew", "mandogrogu",
  "resistance1", "tfa", "resistance1finale", "resistance2", "tlj", "tros",
];
let prev = -1;
ANCHORS.forEach((id) => {
  const i = D.LIST.findIndex((x) => x.id === id);
  if (i === -1) return err(`Anchor "${id}" is missing from the list`);
  if (i < prev) err(`"${id}" is out of order relative to the official guide`);
  prev = i;
});
// the movie sits right after "Cat and Mouse" and "Hidden Enemy", before "Clone Cadets"
const mi = D.LIST.findIndex((x) => x.id === "tcw-movie");
if (D.LIST[mi - 1] && D.LIST[mi - 1].id !== "tcw-prelude") err("The Clone Wars movie must directly follow the Cat and Mouse / Hidden Enemy entry");
// Season 7's Martez arc comes before the Bad Batch arc
if (D.LIST.findIndex((x) => x.id === "tcw-walkabout") > D.LIST.findIndex((x) => x.id === "tcw-badbatch")) err("Ahsoka's Walkabout must come before the Season 7 Bad Batch arc");

// 6. the progress units add up
const units = D.LIST.reduce((n, x) => n + D.unitsOf(x), 0);

if (errors.length) {
  console.error(`\nData check FAILED (${errors.length} problem${errors.length === 1 ? "" : "s"}):\n`);
  errors.forEach((m) => console.error("  - " + m));
  process.exit(1);
}
console.log(`Data check passed: ${D.LIST.length} list entries, ${D.EXTRAS.length} extra, ${cwTotal} Clone Wars episodes verified, ${units} films & episodes in the main list.`);
