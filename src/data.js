/* ---------------- DATA ---------------- */
// e(id, era, type, title, date, eps, note, extra)
//   eps = 0 means a single watch (a film); eps > 0 means a series/season with that many episodes.
export const e = (id, era, type, title, date, eps = 0, note = "", extra = {}) => ({ id, era, type, title, date, eps, note, ...extra });

/* ---------- The Clone Wars helpers ----------
   Episodes are written as "<season><2-digit episode> <title>", e.g. "216 Cat and Mouse" = Season 2, Episode 16.
   An "arc" is a run of episodes that sit next to each other in Lucasfilm's chronological order. */
const parseEp = (s) => {
  const m = /^(\d)(\d{2}) (.+)$/.exec(s);
  if (!m) throw new Error(`Bad Clone Wars episode string: "${s}"`);
  return { season: +m[1], num: +m[2], title: m[3], code: `S${m[1]} E${m[2]}` };
};
const pad2 = (n) => String(n).padStart(2, "0");
// "S2 E16 · S1 E16" or "S1 E02–04": a short season/episode label for the row
const spanOf = (infos) => {
  const out = [];
  infos.forEach((i) => {
    const last = out[out.length - 1];
    if (last && last.season === i.season && last.to + 1 === i.num) last.to = i.num;
    else out.push({ season: i.season, from: i.num, to: i.num });
  });
  return out.map((r) => `S${r.season} E${pad2(r.from)}${r.to > r.from ? "–" + pad2(r.to) : ""}`).join(" · ");
};
const arc = (id, title, list, note = "") => {
  const epInfo = list.map(parseEp);
  return { id, era: "clonewars", type: "Animated", title, date: spanOf(epInfo), eps: epInfo.length, note, epInfo };
};

/* ---------------- ERAS (the sections of the list, top to bottom) ---------------- */
export const ERAS = [
  { key: "highrepublic", short: "High Republic", title: "The High Republic", span: "", color: "#5EEAD4",
    blurb: "Set roughly a century before The Phantom Menace — long before the Skywalker saga." },
  { key: "prequels", short: "Prequels", title: "The Prequel Era", span: "32–22 BBY", color: "#60A5FA",
    blurb: "The two films that open the story of Anakin Skywalker and set up the Clone Wars." },
  { key: "clonewars", short: "Clone Wars", title: "The Clone Wars", span: "22–19 BBY", color: "#A78BFA",
    blurb: "The 2008 film, then every episode in Lucasfilm's chronological order — not release order — ending with the Siege of Mandalore. The list jumps between seasons on purpose, so just follow the numbers. Group names are editorial: arcs keep a story name, and one-off episodes get a title of their own." },
  { key: "empire", short: "Rise of the Empire", title: "Rise of the Empire", span: "19 BBY onward", color: "#F87171",
    blurb: "Revenge of the Sith, the birth of the Empire, and and the stories that follow: the Bad Batch and Maul." },
  { key: "imperial", short: "Imperial Era", title: "The Imperial Era", span: "13–0 BBY", color: "#FB923C",
    blurb: "From Solo to Rogue One, as the Rebellion takes shape." },
  { key: "original", short: "Original Trilogy", title: "The Original Trilogy", span: "0–4 ABY", color: "#E5E7EB",
    blurb: "A New Hope through Return of the Jedi." },
  { key: "newrepublic", short: "New Republic", title: "The New Republic Era", span: "", color: "#34D399",
    blurb: "The Mandalorian and the shows that grew out of it, after the fall of the Empire." },
  { key: "sequels", short: "Sequels", title: "The Sequel Era", span: "~34–35 ABY", color: "#F472B6",
    blurb: "Resistance and the sequel trilogy." },
];
export const ERA_BY_KEY = Object.fromEntries(ERAS.map((x) => [x.key, x]));
export const EXTRAS_ERA = { key: "extras", short: "Extras", title: "Optional Extras", span: "", color: "#94A3B8",
  blurb: "Canon, but not part of Lucasfilm's chronological list — so these don't count toward your progress bar. Watch them whenever you like." };

/* ---------------- THE LIST (Lucasfilm's chronological order) ----------------
   Series-level order follows the official guide on StarWars.com. Two deliberate splits for accuracy:
   The Mandalorian is split by season (Season 3 comes after The Book of Boba Fett), and
   The Clone Wars is listed episode by episode in Lucasfilm's chronological order. */
export const LIST = [
  /* ---- The High Republic ---- */
  e("acolyte", "highrepublic", "Series", "The Acolyte", "Jun–Jul 2024", 8, "Canceled after one season"),

  /* ---- The Prequel Era ---- */
  e("tpm", "prequels", "Film", "Star Wars: The Phantom Menace", "May 19, 1999"),
  e("aotc", "prequels", "Film", "Star Wars: Attack of the Clones", "May 16, 2002"),

  /* ---- The Clone Wars ---- */
  arc("tcw-prelude", "Cat and Mouse & Hidden Enemy", [
    "216 Cat and Mouse", "116 Hidden Enemy",
  ], "Both take place a few months after Geonosis, before the movie"),
  e("tcw-movie", "clonewars", "Film", "Star Wars: The Clone Wars (2008 film)", "Aug 15, 2008", 0, "Introduces Ahsoka Tano"),
  arc("tcw-cadets", "Clone Cadets & Supply Lines", ["301 Clone Cadets", "303 Supply Lines"]),
  arc("tcw-ambush", "Ambush", ["101 Ambush"]),
  arc("tcw-malevolence", "The Malevolence", ["102 Rising Malevolence", "103 Shadow of Malevolence", "104 Destroy Malevolence"]),
  arc("tcw-rookies", "Rookies", ["105 Rookies"]),
  arc("tcw-r3s6", "R3-S6 Droid Arc", ["106 Downfall of a Droid", "107 Duel of the Droids"]),
  arc("tcw-bombad", "Bombad Jedi", ["108 Bombad Jedi", "109 Cloak of Darkness", "110 Lair of Grievous"]),
  arc("tcw-dooku", "Dooku Captured", ["111 Dooku Captured", "112 The Gungan General"]),
  arc("tcw-crash", "Jedi Crash", ["113 Jedi Crash", "114 Defenders of Peace"]),
  arc("tcw-trespass", "Trespass", ["115 Trespass"]),
  arc("tcw-virus", "Blue Shadow Virus", ["117 Blue Shadow Virus", "118 Mystery of a Thousand Moons"]),
  arc("tcw-ryloth", "Battle of Ryloth", ["119 Storm Over Ryloth", "120 Innocents of Ryloth", "121 Liberty on Ryloth"]),
  arc("tcw-holocron", "Holocron Heist", ["201 Holocron Heist", "202 Cargo of Doom", "203 Children of the Force"]),
  arc("tcw-bountyhunters", "Bounty Hunters", ["217 Bounty Hunters"]),
  arc("tcw-zillo", "The Zillo Beast", ["218 The Zillo Beast", "219 The Zillo Beast Strikes Back"]),
  arc("tcw-senatespy", "Senate Spy", ["204 Senate Spy"]),
  arc("tcw-geonosis", "Return to Geonosis", ["205 Landing at Point Rain", "206 Weapons Factory", "207 Legacy of Terror", "208 Brain Invaders"]),
  arc("tcw-grievous", "Grievous Intrigue & The Deserter", ["209 Grievous Intrigue", "210 The Deserter"]),
  arc("tcw-lightsaber", "Lightsaber Lost", ["211 Lightsaber Lost"]),
  arc("tcw-mandalore", "The Mandalore Plot", ["212 The Mandalore Plot", "213 Voyage of Temptation", "214 Duchess of Mandalore"]),
  arc("tcw-deathtrap", "Death Trap", ["220 Death Trap", "221 R2 Come Home", "222 Lethal Trackdown"]),
  arc("tcw-corruption", "Corruption & The Academy", ["305 Corruption", "306 The Academy"]),
  arc("tcw-assassin", "Assassin", ["307 Assassin"]),
  arc("tcw-arctroopers", "ARC Troopers", ["302 ARC Troopers"]),
  arc("tcw-sphere", "Sphere of Influence", ["304 Sphere of Influence"]),
  arc("tcw-evilplans", "Evil Plans", ["308 Evil Plans"]),
  arc("tcw-hostage", "Hostage Crisis", ["122 Hostage Crisis"], "Season 1's finale, placed here in the chronology"),
  arc("tcw-ziro", "Hunt for Ziro", ["309 Hunt for Ziro"]),
  arc("tcw-heroes", "Heroes on Both Sides", ["310 Heroes on Both Sides", "311 Pursuit of Peace"]),
  arc("tcw-senatemurders", "Senate Murders", ["215 Senate Murders"]),
  arc("tcw-nightsisters", "Nightsisters", ["312 Nightsisters", "313 Monster", "314 Witches of the Mist"]),
  arc("tcw-mortis", "Mortis", ["315 Overlords", "316 Altar of Mortis", "317 Ghosts of Mortis"]),
  arc("tcw-citadel", "The Citadel", ["318 The Citadel", "319 Counter Attack", "320 Citadel Rescue"]),
  arc("tcw-padawan", "Padawan Lost", ["321 Padawan Lost", "322 Wookiee Hunt"]),
  arc("tcw-moncala", "Battle of Mon Cala", ["401 Water War", "402 Gungan Attack", "403 Prisoners"]),
  arc("tcw-shadowwarrior", "Shadow Warrior", ["404 Shadow Warrior"]),
  arc("tcw-mercy", "Mercy Mission", ["405 Mercy Mission", "406 Nomad Droids"]),
  arc("tcw-umbara", "Umbara", ["407 Darkness on Umbara", "408 The General", "409 Plan of Dissent", "410 Carnage of Krell"]),
  arc("tcw-zygerria", "Slaves of Zygerria", ["411 Kidnapped", "412 Slaves of the Republic", "413 Escape from Kadavo"]),
  arc("tcw-friend", "A Friend in Need", ["414 A Friend in Need"]),
  arc("tcw-undercover", "Obi-Wan Undercover", ["415 Deception", "416 Friends and Enemies", "417 The Box", "418 Crisis on Naboo"]),
  arc("tcw-massacre", "Massacre", ["419 Massacre"]),
  arc("tcw-bounty", "Bounty", ["420 Bounty"]),
  arc("tcw-brothers", "Brothers & Revenge", ["421 Brothers", "422 Revenge"]),
  arc("tcw-onderon", "Onderon", ["502 A War on Two Fronts", "503 Front Runners", "504 The Soft War", "505 Tipping Points"]),
  arc("tcw-younglings", "Young Jedi", ["506 The Gathering", "507 A Test of Strength", "508 Bound for Rescue", "509 A Necessary Bond"]),
  arc("tcw-dsquad", "D-Squad", ["510 Secret Weapons", "511 A Sunny Day in the Void", "512 Missing in Action", "513 Point of No Return"]),
  arc("tcw-revival", "Revival", ["501 Revival"], "Season 5's premiere — it belongs here in the chronology, not at the start of the season"),
  arc("tcw-eminence", "Eminence", ["514 Eminence", "515 Shades of Reason", "516 The Lawless"]),
  arc("tcw-trial", "Ahsoka's Trial", ["517 Sabotage", "518 The Jedi Who Knew Too Much", "519 To Catch a Jedi", "520 The Wrong Jedi"]),
  arc("tcw-conspiracy", "The Clone Conspiracy", ["601 The Unknown", "602 Conspiracy", "603 Fugitive", "604 Orders"]),
  arc("tcw-clovis", "Rush Clovis", ["605 An Old Friend", "606 The Rise of Clovis", "607 Crisis at the Heart"]),
  arc("tcw-disappeared", "The Disappeared", ["608 The Disappeared", "609 The Disappeared: Pt. II"]),
  arc("tcw-yoda", "Yoda's Journey", ["610 The Lost One", "611 Voices", "612 Destiny", "613 Sacrifice"]),
  arc("tcw-walkabout", "Ahsoka's Walkabout", ["705 Gone with a Trace", "706 Deal No Deal", "707 Dangerous Debt", "708 Together Again"],
    "Season 7's Martez sisters arc. It comes before the Bad Batch arc even though those episodes are numbered first"),
  arc("tcw-badbatch", "The Bad Batch Arc", ["701 The Bad Batch", "702 A Distant Echo", "703 On the Wings of Keeradaks", "704 Unfinished Business"],
    "Season 7's opening arc — a different thing from the Bad Batch series later in this list"),
  arc("tcw-siege", "The Siege of Mandalore", ["709 Old Friends Not Forgotten", "710 The Phantom Apprentice", "711 Shattered", "712 Victory and Death"],
    "Runs at the same time as Revenge of the Sith, and Order 66 happens during it. Lucasfilm's guide puts Revenge of the Sith right after the series"),

  /* ---- Rise of the Empire ---- */
  e("rots", "empire", "Film", "Star Wars: Revenge of the Sith", "May 19, 2005"),
  e("bb1", "empire", "Animated", "The Bad Batch — Season 1", "May–Aug 2021", 16),
  e("bb2", "empire", "Animated", "The Bad Batch — Season 2", "Jan–Mar 2023", 16),
  e("bb3", "empire", "Animated", "The Bad Batch — Season 3", "Feb–May 2024", 15),
  e("maul1", "empire", "Animated", "Maul – Shadow Lord — Season 1", "Apr–May 2026", 10, "Set about a year after Maul's defeat at the end of The Clone Wars"),

  /* ---- The Imperial Era ---- */
  e("solo", "imperial", "Film", "Solo: A Star Wars Story", "May 25, 2018"),
  e("obiwan", "imperial", "Series", "Obi-Wan Kenobi", "May–Jun 2022", 6),
  e("andor1", "imperial", "Series", "Andor — Season 1", "Sep–Nov 2022", 12, "Happens at the same time as Rebels; both lead into Rogue One"),
  e("andor2", "imperial", "Series", "Andor — Season 2", "Apr–May 2025", 12),
  e("rebels1", "imperial", "Animated", "Star Wars Rebels — Season 1", "Oct 2014–Mar 2015", 15, "Includes the TV movie Spark of Rebellion as episodes 1–2"),
  e("rebels2", "imperial", "Animated", "Star Wars Rebels — Season 2", "Jun 2015–Mar 2016", 22),
  e("rebels3", "imperial", "Animated", "Star Wars Rebels — Season 3", "Sep 2016–Mar 2017", 22),
  e("rebels4", "imperial", "Animated", "Star Wars Rebels — Season 4", "Oct 2017–Mar 2018", 16),
  e("rogueone", "imperial", "Film", "Rogue One: A Star Wars Story", "Dec 16, 2016"),

  /* ---- The Original Trilogy ---- */
  e("anh", "original", "Film", "Star Wars: A New Hope", "May 25, 1977"),
  e("esb", "original", "Film", "Star Wars: The Empire Strikes Back", "May 21, 1980"),
  e("rotj", "original", "Film", "Star Wars: Return of the Jedi", "May 25, 1983"),

  /* ---- The New Republic Era ---- */
  e("mando1", "newrepublic", "Series", "The Mandalorian — Season 1", "Nov–Dec 2019", 8),
  e("mando2", "newrepublic", "Series", "The Mandalorian — Season 2", "Oct–Dec 2020", 8),
  e("bobf", "newrepublic", "Series", "The Book of Boba Fett", "Dec 2021–Feb 2022", 7, "Its Mandalorian-focused episodes set up Season 3, which is why Season 3 comes next"),
  e("mando3", "newrepublic", "Series", "The Mandalorian — Season 3", "Mar–Apr 2023", 8, "Placed after The Book of Boba Fett. Lucasfilm's series-level guide lists The Mandalorian as one block ahead of it"),
  e("ahsoka1", "newrepublic", "Series", "Ahsoka — Season 1", "Aug–Oct 2023", 8),
  e("skeletoncrew", "newrepublic", "Series", "Skeleton Crew", "Dec 2024–Jan 2025", 8),
  e("mandogrogu", "newrepublic", "Film", "Star Wars: The Mandalorian and Grogu", "May 22, 2026", 0, "Continues the story from The Mandalorian Season 3"),

  /* ---- The Sequel Era ---- */
  e("resistance1", "sequels", "Animated", "Star Wars Resistance — Season 1", "Oct 2018–Mar 2019", 21, "Starts before The Force Awakens and runs past it. Lucasfilm's guide lists the whole series first"),
  e("resistance2", "sequels", "Animated", "Star Wars Resistance — Season 2", "Oct 2019–Jan 2020", 19),
  e("tfa", "sequels", "Film", "Star Wars: The Force Awakens", "Dec 18, 2015"),
  e("tlj", "sequels", "Film", "Star Wars: The Last Jedi", "Dec 15, 2017"),
  e("tros", "sequels", "Film", "Star Wars: The Rise of Skywalker", "Dec 20, 2019"),
];

// Optional canon that isn't in Lucasfilm's chronological list. Not counted toward progress.
export const EXTRAS = [
  e("tojedi", "extras", "Anthology", "Star Wars: Tales of the Jedi", "Oct 26, 2022", 6,
    "Anthology shorts that jump around in time. Watch after you finish, or slot in once the exact placement is confirmed",
    { optional: true }),
  e("tote", "extras", "Anthology", "Star Wars: Tales of the Empire", "May 4, 2024", 6,
    "Follows Morgan Elsbeth and Barriss Offee. Episodes are spread across the timeline, so it's an optional watch for now",
    { optional: true }),
  e("totu", "extras", "Anthology", "Star Wars: Tales of the Underworld", "May 4, 2025", 6,
    "Follows Asajj Ventress and Cad Bane. Episodes are spread across the timeline, so it's an optional watch for now",
    { optional: true }),
  e("yja", "extras", "Animated", "Young Jedi Adventures", "2023–2025", 55,
    "A preschool series set in the High Republic era, centuries before the films. Seasons of 25, 23 and 7 episodes",
    { optional: true }),
];

// Things that exist but aren't tracked yet (shown in the footer)
export const UPCOMING = [
  "Ahsoka — Season 2 (premieres Jan 20, 2027)",
  "Maul – Shadow Lord — Season 2 (2027)",
  "Star Wars: Starfighter (2027)",
];

export const STORAGE_KEY = "starwars-tracker-v1";

/* ---------------- DERIVED ---------------- */
/* ---------------- CLONE WARS GROUP NAMES ----------------
   Each Clone Wars entry is shown under a group heading. Entries that share a name sit under one heading
   (the 2008 film joins "Opening Moves"). Names are editorial: "... Arc" for multi-episode stories,
   evocative titles for one-off episodes. Changing a name never affects saved progress. */
const CW_GROUPS = {
  "tcw-prelude": "Opening Moves", "tcw-movie": "Opening Moves",
  "tcw-cadets": "Kamino Arc", "tcw-ambush": "Early Campaigns", "tcw-malevolence": "Malevolence Arc",
  "tcw-rookies": "Clone Rookies", "tcw-r3s6": "R3-S6 Arc", "tcw-bombad": "Nute Gunray Arc",
  "tcw-dooku": "Florrum Arc", "tcw-crash": "Maridun Arc", "tcw-trespass": "Uninvited Guests",
  "tcw-virus": "Blue Shadow Virus Arc", "tcw-ryloth": "Ryloth Arc", "tcw-holocron": "Holocron Arc",
  "tcw-bountyhunters": "Hired Guns", "tcw-zillo": "Zillo Beast Arc", "tcw-senatespy": "Mole in the Senate",
  "tcw-geonosis": "Geonosis Arc", "tcw-grievous": "Saleucami Arc", "tcw-lightsaber": "The Missing Blade",
  "tcw-mandalore": "Mandalore Arc I", "tcw-deathtrap": "Boba Fett Arc", "tcw-corruption": "Mandalore Arc II",
  "tcw-assassin": "Fatal Premonition", "tcw-arctroopers": "Kamino Defense", "tcw-sphere": "Quiet Diplomacy",
  "tcw-evilplans": "Ziro's Scheme", "tcw-hostage": "Cad Bane Strikes", "tcw-ziro": "Fugitive Hutt",
  "tcw-heroes": "Senate Arc", "tcw-senatemurders": "Murder in the Senate", "tcw-nightsisters": "Nightsisters Arc",
  "tcw-mortis": "Mortis Arc", "tcw-citadel": "Citadel Arc", "tcw-padawan": "Wookiee Hunt Arc",
  "tcw-moncala": "Mon Cala Arc", "tcw-shadowwarrior": "Warrior in the Shadows", "tcw-mercy": "C-3PO & R2-D2 Arc",
  "tcw-umbara": "Umbara Arc", "tcw-zygerria": "Zygerria Arc", "tcw-friend": "Call for Help",
  "tcw-undercover": "Obi-Wan Undercover Arc", "tcw-massacre": "Fall of the Nightsisters",
  "tcw-bounty": "A Price on Their Heads", "tcw-brothers": "Maul Returns Arc", "tcw-onderon": "Onderon Arc",
  "tcw-younglings": "Young Jedi Arc", "tcw-dsquad": "D-Squad Arc", "tcw-revival": "Return of the Shadow",
  "tcw-eminence": "Shadow Collective Arc", "tcw-trial": "Ahsoka's Trial Arc", "tcw-conspiracy": "Protocol 66 Arc",
  "tcw-clovis": "Rush Clovis Arc", "tcw-disappeared": "The Disappeared Arc", "tcw-yoda": "Yoda's Journey",
  "tcw-walkabout": "Ahsoka's Walkabout Arc", "tcw-badbatch": "Bad Batch Arc", "tcw-siege": "Siege of Mandalore",
};
LIST.forEach((x) => { if (CW_GROUPS[x.id]) x.group = CW_GROUPS[x.id]; });

export const ALL_ENTRIES = LIST; // the main chronological list, in order
export const ENTRY_BY_ID = Object.fromEntries([...LIST, ...EXTRAS].map((x) => [x.id, x]));
// 1-based position of each entry in the chronological list (shown as #01, #02 …)
export const NUM = Object.fromEntries(LIST.map((x, i) => [x.id, i + 1]));
// "watch units": a film is 1, a season is its episode count. Progress bars count units.
export const unitsOf = (entry) => (entry.eps > 0 ? entry.eps : 1);
