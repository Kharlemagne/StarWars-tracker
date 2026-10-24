import { useState, useEffect, useMemo } from "react";
import { ERAS, EXTRAS_ERA, LIST, EXTRAS, NUM, STORAGE_KEY, UPCOMING, unitsOf } from "./data.js";
import { KOFI_URL, GITHUB_REPO_URL, APP_VERSION } from "./config.js";

/* ---------------- HELPERS ---------------- */
// Progress is stored as { done: { id: true }, eps: { id: { 1: true, 2: true } } }.
// Films use `done`; series, seasons and Clone Wars arcs use `eps` (episode numbers 1..N within the entry).
function isComplete(entry, state) {
  if (entry.eps > 0) {
    const set = state.eps[entry.id] || {};
    for (let i = 1; i <= entry.eps; i++) if (!set[i]) return false;
    return true;
  }
  return !!state.done[entry.id];
}
const epCount = (entry, state) => {
  const set = state.eps[entry.id] || {};
  let n = 0;
  for (let i = 1; i <= entry.eps; i++) if (set[i]) n++;
  return n;
};
const doneUnits = (entry, state) => (entry.eps > 0 ? epCount(entry, state) : state.done[entry.id] ? 1 : 0);
// Progress counts "films & episodes", so a 22-episode season weighs more than a single film.
const progress = (entries, state) => {
  const total = entries.reduce((n, x) => n + unitsOf(x), 0);
  const done = entries.reduce((n, x) => n + doneUnits(x, state), 0);
  return { done, total, pct: total === 0 ? 0 : done === total ? 100 : Math.floor((done / total) * 100) };
};

const SECTIONS = ERAS.map((era) => ({ ...era, entries: LIST.filter((x) => x.era === era.key) }));
const SERIES_IDS = [...LIST, ...EXTRAS].filter((x) => x.eps > 0 && !x.group).map((x) => x.id);
// Clone Wars rows are numbered 1..134 in Lucasfilm's chronological order (the film counts as one)
const CW_POS = {};
{
  let n = 0;
  LIST.filter((x) => x.group).forEach((x) => {
    if (x.eps > 0) x.epInfo.forEach((_, i) => { CW_POS[`${x.id}:${i + 1}`] = ++n; });
    else CW_POS[`${x.id}:0`] = ++n;
  });
}
const FILTERS = [
  { key: "all", label: "Everything" },
  { key: "todo", label: "To watch" },
  { key: "done", label: "Watched" },
];
const numLabel = (id) => String(NUM[id]).padStart(2, "0");

/* ---------------- COMPONENT ---------------- */
export default function StarWarsTracker() {
  const [state, setState] = useState({ done: {}, eps: {} });
  const [loaded, setLoaded] = useState(false);
  const [filter, setFilter] = useState("all");
  const [secOpen, setSecOpen] = useState({});
  const [expanded, setExpanded] = useState({});
  const [resetArm, setResetArm] = useState(false);
  const [backupMsg, setBackupMsg] = useState("");
  const [pendingJump, setPendingJump] = useState(null);
  const [flashKey, setFlashKey] = useState(null);
  const [pendingScroll, setPendingScroll] = useState(null);
  const [flashRow, setFlashRow] = useState(null);

  useEffect(() => {
    (async () => {
      try {
        const r = await window.storage.get(STORAGE_KEY);
        if (r && r.value) {
          const parsed = JSON.parse(r.value);
          if (parsed && parsed.done && parsed.eps) setState(parsed);
        }
      } catch (err) { /* first visit — nothing saved yet */ }
      setLoaded(true);
    })();
  }, []);

  useEffect(() => {
    if (!loaded) return;
    const t = setTimeout(() => {
      window.storage.set(STORAGE_KEY, JSON.stringify(state)).catch(() => {});
    }, 400);
    return () => clearTimeout(t);
  }, [state, loaded]);

  const toggleEntry = (entry) => {
    setState((prev) => {
      if (entry.eps > 0) {
        const full = isComplete(entry, prev);
        const eps = { ...prev.eps };
        if (full) delete eps[entry.id];
        else {
          const set = {};
          for (let i = 1; i <= entry.eps; i++) set[i] = true;
          eps[entry.id] = set;
        }
        return { ...prev, eps };
      }
      const done = { ...prev.done };
      if (done[entry.id]) delete done[entry.id]; else done[entry.id] = true;
      return { ...prev, done };
    });
  };

  const toggleGroup = (entries) => {
    setState((prev) => {
      const full = entries.every((en) => isComplete(en, prev));
      const eps = { ...prev.eps };
      const done = { ...prev.done };
      entries.forEach((en) => {
        if (en.eps > 0) {
          if (full) delete eps[en.id];
          else { const set = {}; for (let i = 1; i <= en.eps; i++) set[i] = true; eps[en.id] = set; }
        } else if (full) delete done[en.id];
        else done[en.id] = true;
      });
      return { ...prev, eps, done };
    });
  };

  const toggleEp = (key, n) => {
    setState((prev) => {
      const eps = { ...prev.eps };
      const set = { ...(eps[key] || {}) };
      if (set[n]) delete set[n]; else set[n] = true;
      if (Object.keys(set).length === 0) delete eps[key]; else eps[key] = set;
      return { ...prev, eps };
    });
  };

  const purge = () => {
    setState({ done: {}, eps: {} });
    setResetArm(false);
    window.storage.delete(STORAGE_KEY).catch(() => {});
  };

  const exportProgress = () => {
    try {
      const payload = { app: "starwars-tracker", version: 1, exportedAt: new Date().toISOString(), state };
      const blob = new Blob([JSON.stringify(payload, null, 2)], { type: "application/json" });
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = "starwars-tracker-progress.json";
      document.body.appendChild(a);
      a.click();
      a.remove();
      setTimeout(() => URL.revokeObjectURL(url), 1000);
      setBackupMsg("Progress exported.");
    } catch (err) {
      setBackupMsg("Export failed.");
    }
  };

  const importProgress = (ev) => {
    const file = ev.target.files && ev.target.files[0];
    ev.target.value = "";
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => {
      try {
        const s = JSON.parse(String(reader.result)).state;
        if (!s || typeof s.done !== "object" || typeof s.eps !== "object" || !s.done || !s.eps) throw new Error("bad file");
        const done = {};
        Object.keys(s.done).forEach((k) => { if (s.done[k] === true) done[k] = true; });
        const eps = {};
        Object.keys(s.eps).forEach((k) => {
          const set = {};
          Object.keys(s.eps[k] || {}).forEach((n) => { if (s.eps[k][n] === true) set[n] = true; });
          if (Object.keys(set).length) eps[k] = set;
        });
        setState({ done, eps });
        setBackupMsg("Progress imported.");
      } catch (err) {
        setBackupMsg("That file isn't a valid progress export.");
      }
    };
    reader.onerror = () => setBackupMsg("Couldn't read that file.");
    reader.readAsText(file);
  };

  const overall = useMemo(() => progress(LIST, state), [state]);
  const secProg = useMemo(() => SECTIONS.map((s) => ({ key: s.key, ...progress(s.entries, state) })), [state]);
  const progByKey = useMemo(() => Object.fromEntries(secProg.map((p) => [p.key, p])), [secProg]);
  const extrasProg = useMemo(() => progress(EXTRAS, state), [state]);

  // "Up next" follows your furthest point in the list, so skipping ahead is fine.
  // Furthest point = the last entry that is finished or partly watched.
  const upNext = useMemo(() => {
    const isPartial = (en) => !isComplete(en, state) && en.eps > 0 && epCount(en, state) > 0;
    let last = -1;
    let lastPartial = false;
    LIST.forEach((en, i) => {
      if (isComplete(en, state)) { last = i; lastPartial = false; }
      else if (isPartial(en)) { last = i; lastPartial = true; }
    });
    if (last === -1) return { mode: "start", entry: LIST[0] };
    if (lastPartial) {
      const en = LIST[last];
      const set = state.eps[en.id] || {};
      let nextEp = null;
      if (en.epInfo) {
        const idx = en.epInfo.findIndex((_, i) => !set[i + 1]);
        if (idx >= 0) nextEp = en.epInfo[idx];
      }
      return { mode: "continue", entry: en, eps: `${epCount(en, state)}/${en.eps} eps`, nextEp };
    }
    if (last + 1 < LIST.length) return { mode: "next", entry: LIST[last + 1] };
    return { mode: "end" };
  }, [state]);

  // Gem tap: open the section if it is hidden, then jump to it
  const jumpToSection = (key) => {
    setFilter("all");
    setSecOpen((x) => ({ ...x, [key]: true }));
    setPendingJump(key);
  };
  useEffect(() => {
    if (!pendingJump) return;
    const el = document.getElementById(`sec-${pendingJump}`);
    if (el) el.scrollIntoView({ block: "start" });
    const key = pendingJump;
    setFlashKey(key);
    setPendingJump(null);
    setTimeout(() => setFlashKey((k) => (k === key ? null : k)), 1500);
  }, [pendingJump, filter, secOpen]);

  // Tapping "Up next": open the section that holds the entry, scroll to it, and flash it
  const goToUpNext = () => {
    const en = upNext.entry;
    if (!en) return;
    setFilter("all");
    setSecOpen((x) => ({ ...x, [en.era]: true }));
    setPendingScroll(en.id);
  };
  useEffect(() => {
    if (!pendingScroll) return;
    const id = pendingScroll;
    const el = document.querySelector(`[data-entry="${id}"]`);
    setPendingScroll(null);
    if (!el) return;
    el.scrollIntoView({ block: "center" });
    setFlashRow(id);
    setTimeout(() => setFlashRow((r) => (r === id ? null : r)), 1500);
  }, [pendingScroll, secOpen, filter]);

  const allOpen = SERIES_IDS.every((id) => expanded[id]);
  const toggleAllOpen = () => setExpanded(allOpen ? {} : Object.fromEntries(SERIES_IDS.map((id) => [id, true])));

  const passes = (entry) => {
    if (filter === "all") return true;
    const c = isComplete(entry, state);
    return filter === "done" ? c : !c;
  };

  /* ---- row renderer ---- */
  const Row = (entry, label, color) => {
    const complete = isComplete(entry, state);
    const isSeries = entry.eps > 0;
    const open = !!expanded[entry.id];
    const watched = isSeries ? epCount(entry, state) : 0;
    const partial = isSeries && watched > 0 && !complete;
    const set = state.eps[entry.id] || {};
    const toggleOpen = () => isSeries && setExpanded((x) => ({ ...x, [entry.id]: !open }));
    return (
      <div key={entry.id} data-entry={entry.id} className={`row ${complete ? "rowDone" : ""}${flashRow === entry.id ? " rowFlash" : ""}`}>
        <div
          className="rowMain"
          onClick={toggleOpen}
          {...(isSeries ? { role: "button", tabIndex: 0, "aria-expanded": open, onKeyDown: (ev) => { if (ev.key === "Enter" || ev.key === " ") { ev.preventDefault(); toggleOpen(); } } } : {})}
        >
          <div className="rail">
            {label != null && <span className="num">{label}</span>}
            <span className="node" style={{ background: complete ? "#FFE347" : partial ? color : "#232B3D", boxShadow: complete ? "0 0 8px rgba(255,227,71,.55)" : "none" }} />
          </div>
          <div className="info">
            <div className="titleLine">
              <span className="title">{entry.title}</span>
              <span className="badge" style={{ borderColor: color, color }}>{entry.type}</span>
              {entry.optional && <span className="srcTag">Optional</span>}
            </div>
            <div className="meta">
              {entry.date}
              {isSeries && <span className="metaSep">·</span>}
              {isSeries && <span className={partial || complete ? "metaHot" : ""}>{watched}/{entry.eps} eps</span>}
              {isSeries && <span className="chev">{open ? "▾" : "▸"}</span>}
            </div>
            {entry.note && <div className="note">↳ {entry.note}</div>}
          </div>
          <button
            className={`check ${complete ? "checkOn" : ""}`}
            aria-label={complete ? `Mark ${entry.title} unwatched` : `Mark ${entry.title} watched`}
            onClick={(ev) => { ev.stopPropagation(); toggleEntry(entry); }}
          >
            {complete ? "✓" : ""}
          </button>
        </div>
        {isSeries && open && (
          entry.epInfo ? (
            <div className="epList">
              {entry.epInfo.map((ep, i) => {
                const n = i + 1;
                const on = !!set[n];
                return (
                  <button key={n} className={`epRow ${on ? "epRowOn" : ""}`} onClick={() => toggleEp(entry.id, n)} aria-pressed={on} aria-label={`${ep.code} ${ep.title}`}>
                    <span className="epBox">{on ? "✓" : ""}</span>
                    <span className="epCode">{ep.code}</span>
                    <span className="epName">{ep.title}</span>
                  </button>
                );
              })}
              <button className="epAll" onClick={() => toggleEntry(entry)}>{complete ? "Clear these" : "Mark all"}</button>
            </div>
          ) : (
            <div className="epGrid">
              {Array.from({ length: entry.eps }, (_, i) => i + 1).map((n) => {
                const on = !!set[n];
                return (
                  <button key={n} className={`ep ${on ? "epOn" : ""}`} onClick={() => toggleEp(entry.id, n)} aria-label={`Episode ${n}`} aria-pressed={on}>
                    {n}
                  </button>
                );
              })}
              <button className="epAll" onClick={() => toggleEntry(entry)}>{complete ? "Clear season" : "Mark season"}</button>
            </div>
          )
        )}
      </div>
    );
  };

  /* ---- Clone Wars group renderer: a heading, then every episode as its own row ---- */
  const epPasses = (entry, n) => {
    if (filter === "all") return true;
    const c = entry.eps > 0 ? !!(state.eps[entry.id] || {})[n] : !!state.done[entry.id];
    return filter === "done" ? c : !c;
  };
  const GroupBlock = (entry, showHead) => {
    const members = LIST.filter((x) => x.group === entry.group);
    const gp = progress(members, state);
    const full = gp.done === gp.total;
    const set = state.eps[entry.id] || {};
    const rows = entry.eps > 0
      ? entry.epInfo.map((ep, i) => ({ n: i + 1, code: ep.code, title: ep.title, on: !!set[i + 1], pos: CW_POS[`${entry.id}:${i + 1}`], pill: false }))
      : [{ n: 0, code: "Movie", title: entry.title.replace("Star Wars: ", ""), on: !!state.done[entry.id], pos: CW_POS[`${entry.id}:0`], pill: true }];
    const visible = rows.filter((r) => epPasses(entry, r.n));
    if (visible.length === 0 && !showHead) return null;
    return (
      <div key={entry.id} data-entry={entry.id} className={`grp${flashRow === entry.id ? " rowFlash" : ""}`}>
        {showHead && (
          <div className="grpHead">
            <span className="grpName">{entry.group}</span>
            <span className="grpLine" />
            <button className="grpAll" onClick={() => toggleGroup(members)}>{full ? "Clear" : "Mark all"}</button>
            <span className="grpCount">{gp.done}/{gp.total}</span>
          </div>
        )}
        {visible.map((r) => (
          <button
            key={r.n}
            className={`gRow ${r.on ? "gRowOn" : ""}`}
            aria-pressed={r.on}
            aria-label={`${r.code} ${r.title}`}
            onClick={() => (entry.eps > 0 ? toggleEp(entry.id, r.n) : toggleEntry(entry))}
          >
            <span className="gBox">{r.on ? "✓" : ""}</span>
            <span className="gNum">{r.pos}</span>
            <span className={`gPill ${r.pill ? "gPillMovie" : ""}`}>{r.code}</span>
            <span className="gTitle">{r.title}</span>
          </button>
        ))}
      </div>
    );
  };

  const renderSection = (sec, entries, prog, withNumbers) => {
    // grouped entries show an episode row when ANY of their episodes matches the filter
    const matches = (en) => (en.group ? (en.eps > 0 ? en.epInfo.some((_, i) => epPasses(en, i + 1)) : epPasses(en, 0)) : passes(en));
    const shown = entries.filter(matches);
    if (shown.length === 0) return null;
    const open = secOpen[sec.key] !== false;
    let prevGroup = null;
    return (
      <section key={sec.key} id={`sec-${sec.key}`} className={`phase${flashKey === sec.key ? " flash" : ""}`}>
        <div className="phaseHead">
          <h2 style={{ color: sec.color }}>{sec.title}</h2>
          <span className="phaseCount">{prog.done}/{prog.total}</span>
          {sec.span && <span className="secBadge">{sec.span}</span>}
          <button className="p0Toggle" aria-expanded={open} onClick={() => setSecOpen((x) => ({ ...x, [sec.key]: !open }))}>{open ? "Hide" : "Show"}</button>
        </div>
        <p className="p0Blurb">{sec.blurb}</p>
        {open && shown.map((en) => {
          if (en.group) {
            const showHead = en.group !== prevGroup;
            prevGroup = en.group;
            return GroupBlock(en, showHead);
          }
          prevGroup = null;
          return Row(en, withNumbers && sec.key !== "clonewars" ? numLabel(en.id) : null, sec.color);
        })}
      </section>
    );
  };

  const sections = SECTIONS.map((s) => renderSection(s, s.entries, progByKey[s.key], true));
  const nothingShown = sections.every((s) => s === null);
  const done = overall.pct === 100;

  return (
    <div className="app">
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Bebas+Neue&family=DM+Sans:wght@400;500;600;700&family=JetBrains+Mono:wght@400;500;700&display=swap');
        * { box-sizing: border-box; margin: 0; padding: 0; }
        .app {
          min-height: 100vh; background: #07080C; color: #EDEEF4;
          font-family: 'DM Sans', system-ui, sans-serif;
          background-image:
            radial-gradient(1100px 480px at 50% -12%, rgba(74,158,255,0.13), transparent 62%),
            radial-gradient(700px 420px at 100% 0%, rgba(255,227,71,0.06), transparent 60%);
        }
        .wrap { max-width: 760px; margin: 0 auto; padding: 28px 16px 80px; }
        /* header */
        .kicker { font-size: 11px; letter-spacing: 0.28em; text-transform: uppercase; color: #8B93AD; }
        h1 {
          font-family: 'Bebas Neue', 'Anton', sans-serif; font-weight: 400;
          font-size: clamp(40px, 9vw, 68px); line-height: 0.98; letter-spacing: 0.02em;
          text-transform: uppercase; margin: 6px 0 6px;
        }
        h1 em { font-style: normal; color: #FFE347; }
        .sub { color: #8B93AD; font-size: 13.5px; line-height: 1.5; margin-bottom: 18px; }
        .betaBar { display: flex; align-items: center; gap: 10px; flex-wrap: wrap; margin: 14px 0 4px; padding: 9px 12px;
                   background: #0F1218; border: 1px solid #1E2430; border-radius: 12px; font-size: 12.5px; color: #A9B0C8; }
        .betaPill { font-size: 10px; font-weight: 700; letter-spacing: .14em; color: #07080C; background: #FFE347; border-radius: 5px; padding: 2px 7px; }
        .betaText a { color: #FFE347; }
        .kofi { margin-left: auto; padding: 6px 13px; border-radius: 99px; background: #FF5E5B; color: #fff; font-size: 12.5px;
                font-weight: 700; text-decoration: none; white-space: nowrap; }
        .kofi:hover { filter: brightness(1.1); }
        .kofi:focus-visible, .betaText a:focus-visible { outline: 2px solid #FFE347; outline-offset: 2px; }
        /* gems */
        .gems { display: grid; grid-template-columns: repeat(8, minmax(0, 1fr)); gap: 18px 6px; justify-items: center; margin: 20px 0 6px; }
        @media (max-width: 620px) { .gems { grid-template-columns: repeat(4, minmax(0, 1fr)); } }
        .gemHint { font-size: 11px; color: #5B6588; margin-top: 4px; }
        .gem { position: relative; width: 22px; height: 22px; border-radius: 7px; transform: rotate(45deg);
               border: 1.5px solid; overflow: hidden; background: #0F1218; flex: none; }
        .gem i { position: absolute; left: 0; right: 0; bottom: 0; display: block; }
        .gemWrap { display: flex; flex-direction: column; align-items: center; gap: 9px; background: none; border: 0; padding: 4px 0 0; margin: 0; cursor: pointer; font: inherit; color: inherit; text-align: center; }
        .gemWrap:hover .gem { filter: brightness(1.25); }
        .gemWrap:focus-visible { outline: 2px solid #FFE347; outline-offset: 3px; border-radius: 8px; }
        .gemName { font-size: 10px; color: #A9B0C8; line-height: 1.2; }
        .gemLabel { font-size: 10px; color: #5B6588; font-variant-numeric: tabular-nums; }
        .bigBar { height: 10px; background: #0F1218; border: 1px solid #1E2430; border-radius: 99px; overflow: hidden; margin-top: 16px; }
        .bigBar div { height: 100%; background: linear-gradient(90deg, #4A9EFF, #FFE347); border-radius: 99px; transition: width .5s cubic-bezier(.2,.8,.2,1); }
        .barMeta { display: flex; justify-content: space-between; font-size: 12px; color: #8B93AD; margin-top: 6px; font-variant-numeric: tabular-nums; }
        .upNext { display: inline-flex; align-items: center; gap: 8px; margin-top: 14px; padding: 8px 14px; flex-wrap: wrap; row-gap: 2px;
                  background: #0F1218; border: 1px solid #1E2430; border-radius: 14px; font-size: 13px;
                  font-family: inherit; color: inherit; text-align: left; cursor: pointer; }
        .upNext b { color: #FFE347; font-weight: 600; }
        .upNext:hover:not(:disabled) { border-color: #FFE347; }
        .upNext:disabled { cursor: default; }
        .upNext:focus-visible { outline: 2px solid #FFE347; outline-offset: 2px; }
        .upNextList { color: #8B93AD; font-size: 12px; }
        .upNextGo { color: #FFE347; font-weight: 700; }
        .sagaDone { margin-top: 14px; padding: 10px 14px; border-radius: 12px; font-size: 14px;
                    background: linear-gradient(90deg, rgba(74,158,255,.18), rgba(255,227,71,.18)); border: 1px solid #FFE347; }
        .rowFlash { animation: rowFlash 1.5s ease-out; }
        @keyframes rowFlash { 0% { box-shadow: 0 0 0 3px rgba(255,227,71,.7); border-color: #FFE347; } 100% { box-shadow: 0 0 0 3px transparent; } }
        /* toolbar */
        .navWrap { position: sticky; top: 0; z-index: 5; padding: 14px 0 8px; margin-top: 8px;
                   background: linear-gradient(#07080C 82%, transparent); }
        .chips { display: flex; flex-wrap: wrap; gap: 6px; align-items: center; }
        .chip { padding: 6px 13px; border-radius: 99px; border: 1px solid #1E2430; background: #0F1218; color: #8B93AD;
                font-size: 12.5px; font-weight: 600; cursor: pointer; font-family: inherit; }
        .chip:hover { border-color: #3a4468; }
        .chipOn { border-color: #FFE347; color: #FFE347; }
        .chipRight { margin-left: auto; }
        .chip:focus-visible, .p0Toggle:focus-visible, .check:focus-visible, .ep:focus-visible, .epRow:focus-visible, .reset:focus-visible, .epAll:focus-visible, .rowMain:focus-visible
          { outline: 2px solid #FFE347; outline-offset: 2px; }
        /* sections + rows */
        .phase { margin-top: 26px; scroll-margin-top: 64px; border-radius: 12px; }
        .phase.flash { animation: sagaFlash 1.5s ease-out; }
        @keyframes sagaFlash { 0% { background: rgba(255,227,71,.14); box-shadow: 0 0 0 6px rgba(255,227,71,.14); } 100% { background: transparent; box-shadow: 0 0 0 6px transparent; } }
        .phaseHead { display: flex; align-items: baseline; gap: 10px; margin-bottom: 8px; flex-wrap: wrap; }
        .phaseHead h2 { font-family: 'Bebas Neue', sans-serif; font-weight: 400; font-size: 26px; letter-spacing: .06em; text-transform: uppercase; }
        .phaseCount { font-size: 12px; color: #8B93AD; font-variant-numeric: tabular-nums; }
        .secBadge { font-size: 11px; color: #8B93AD; border: 1px solid #1E2430; padding: 2px 8px; border-radius: 99px; }
        .p0Blurb { font-size: 13px; color: #A9B0C8; line-height: 1.55; margin: 0 0 12px; }
        .p0Toggle { margin-left: auto; padding: 3px 10px; border-radius: 99px; border: 1px solid #1E2430; background: transparent;
                    color: #8B93AD; font-size: 11px; font-weight: 600; cursor: pointer; font-family: inherit; }
        .p0Toggle:hover { border-color: #3a4468; color: #EDEEF4; }
        .row { background: #0F1218; border: 1px solid #1B212D; border-radius: 14px; margin-bottom: 8px; overflow: hidden; transition: border-color .2s; }
        .row:hover { border-color: #2A3342; }
        .rowDone { opacity: .62; }
        .rowMain { display: flex; align-items: center; gap: 12px; padding: 12px 12px 12px 10px; cursor: pointer; }
        .rail { display: flex; flex-direction: column; align-items: center; gap: 4px; width: 30px; flex: none; }
        .num { font-size: 10px; color: #5B6588; font-variant-numeric: tabular-nums; letter-spacing: .05em; }
        .node { width: 10px; height: 10px; border-radius: 99px; transition: background .25s, box-shadow .25s; }
        .info { flex: 1; min-width: 0; }
        .titleLine { display: flex; align-items: center; gap: 8px; flex-wrap: wrap; }
        .title { font-weight: 600; font-size: 15px; }
        .badge { font-size: 10px; letter-spacing: .08em; text-transform: uppercase; border: 1px solid; border-radius: 5px; padding: 1px 6px; flex: none; }
        .srcTag { font-size: 10px; color: #8B93AD; border: 1px solid #1E2430; border-radius: 5px; padding: 1px 6px; flex: none; }
        .meta { font-size: 12px; color: #8B93AD; margin-top: 3px; display: flex; gap: 6px; align-items: center; flex-wrap: wrap; font-variant-numeric: tabular-nums; }
        .metaHot { color: #FFE347; }
        .metaSep { color: #3a4468; }
        .chev { color: #5B6588; font-size: 10px; }
        .note { font-size: 12px; color: #C9A93A; margin-top: 5px; line-height: 1.45; }
        .check { width: 34px; height: 34px; flex: none; border-radius: 99px; border: 1.5px solid #2A3342; background: transparent;
                 color: #07080C; font-size: 16px; font-weight: 700; cursor: pointer; transition: all .18s; }
        .check:hover { border-color: #FFE347; }
        .checkOn { background: #FFE347; border-color: #FFE347; box-shadow: 0 0 10px rgba(255,227,71,.4); }
        /* episodes */
        .epList { display: flex; flex-direction: column; gap: 4px; padding: 0 12px 12px 52px; }
        .epRow { display: flex; align-items: center; gap: 10px; width: 100%; padding: 7px 10px; border-radius: 9px; border: 1px solid #1B212D;
                 background: #0B0E14; color: #A9B0C8; text-align: left; font-family: inherit; font-size: 13px; cursor: pointer; transition: all .15s; }
        .epRow:hover { border-color: #FFE347; color: #EDEEF4; }
        .epRowOn { background: rgba(255,227,71,.07); border-color: rgba(255,227,71,.4); color: #EDEEF4; }
        .epRowOn .epName { text-decoration: line-through; text-decoration-color: #5B6588; opacity: .7; }
        .epBox { width: 18px; height: 18px; flex: none; border-radius: 99px; border: 1.5px solid #2A3342; display: flex; align-items: center;
                 justify-content: center; font-size: 11px; font-weight: 700; color: #07080C; }
        .epRowOn .epBox { background: #FFE347; border-color: #FFE347; }
        .epCode { flex: none; width: 52px; font-size: 11px; color: #5B6588; font-variant-numeric: tabular-nums; letter-spacing: .04em; }
        .epName { flex: 1; min-width: 0; }
        .epGrid { display: flex; flex-wrap: wrap; gap: 6px; padding: 0 12px 14px 52px; }
        .ep { width: 32px; height: 32px; border-radius: 8px; border: 1px solid #1E2430; background: #0B0E14; color: #8B93AD;
              font-size: 12px; font-weight: 600; cursor: pointer; font-variant-numeric: tabular-nums; font-family: inherit; transition: all .15s; }
        .ep:hover { border-color: #FFE347; color: #EDEEF4; }
        .epOn { background: #FFE347; border-color: #FFE347; color: #07080C; }
        .epAll { height: 32px; padding: 0 12px; border-radius: 8px; border: 1px dashed #3a4468; background: transparent;
                 color: #8B93AD; font-size: 12px; font-weight: 600; cursor: pointer; font-family: inherit; align-self: flex-start; margin-top: 4px; }
        .epAll:hover { color: #FFE347; border-color: #FFE347; }
        .grp { margin: 0; }
        .grpHead { display: flex; align-items: center; gap: 10px; margin: 26px 2px 6px; font-family: 'JetBrains Mono', ui-monospace, Menlo, monospace; }
        .grp:first-of-type .grpHead { margin-top: 14px; }
        .grpName { font-size: 11px; letter-spacing: .14em; text-transform: uppercase; color: #8B93AD; flex: none; }
        .grpLine { flex: 1; height: 1px; background: #1B212D; min-width: 12px; }
        .grpCount { font-size: 11px; color: #5B6588; font-variant-numeric: tabular-nums; flex: none; }
        .grpAll { background: none; border: 0; font: inherit; font-size: 10px; letter-spacing: .08em; text-transform: uppercase; color: #5B6588; cursor: pointer; padding: 2px 4px; border-radius: 4px; flex: none; }
        .grpAll:hover { color: #FFE347; }
        .grpAll:focus-visible, .gRow:focus-visible { outline: 2px solid #FFE347; outline-offset: 2px; }
        .gRow { display: flex; align-items: center; gap: 12px; width: 100%; padding: 9px 6px; border: 0; border-radius: 10px; background: none; color: #EDEEF4;
          font: inherit; font-size: 14px; text-align: left; cursor: pointer; transition: background .15s; }
        .gRow:hover { background: rgba(255,255,255,.035); }
        .gBox { width: 22px; height: 22px; flex: none; border-radius: 99px; border: 1.5px solid #2A3342; display: flex; align-items: center; justify-content: center;
          font-size: 12px; font-weight: 700; color: #07080C; transition: background .2s, border-color .2s; }
        .gRow:hover .gBox { border-color: #FFE347; }
        .gRowOn .gBox { background: #FFE347; border-color: #FFE347; box-shadow: 0 0 8px rgba(255,227,71,.4); }
        .gNum { flex: none; width: 26px; text-align: right; font-family: 'JetBrains Mono', ui-monospace, Menlo, monospace; font-size: 11px; color: #5B6588; font-variant-numeric: tabular-nums; }
        .gPill { flex: none; font-family: 'JetBrains Mono', ui-monospace, Menlo, monospace; font-size: 11px; font-weight: 500; padding: 2px 8px; border-radius: 99px;
          border: 1px solid #2B4A7A; background: rgba(74,158,255,.1); color: #7DB4FF; letter-spacing: .02em; white-space: nowrap; min-width: 66px; text-align: center; }
        .gPillMovie { border-color: #6B5A12; background: rgba(255,227,71,.1); color: #FFE347; }
        .gTitle { flex: 1; min-width: 0; }
        .gRowOn .gTitle { text-decoration: line-through; text-decoration-color: #5B6588; opacity: .6; }
        .gRowOn .gNum, .gRowOn .gPill { opacity: .6; }
        @media (max-width: 520px) { .gRow { gap: 9px; font-size: 13.5px; } .gNum { width: 22px; } }
        .empty { margin-top: 28px; padding: 18px; text-align: center; color: #8B93AD; border: 1px dashed #1E2430; border-radius: 14px; font-size: 14px; }
        /* footer */
        .upcoming { margin-top: 34px; padding: 12px 14px; border: 1px solid #1E2430; border-radius: 12px; background: #0F1218; font-size: 12.5px; color: #A9B0C8; line-height: 1.55; }
        .upcoming b { color: #FFE347; }
        .foot { margin-top: 28px; display: flex; align-items: center; justify-content: space-between; gap: 12px; flex-wrap: wrap; }
        .footNote { font-size: 11.5px; color: #5B6588; max-width: 440px; line-height: 1.5; }
        .reset { padding: 9px 16px; border-radius: 99px; border: 1px solid #1E2430; background: transparent; color: #8B93AD;
                 font-size: 12.5px; font-weight: 600; cursor: pointer; font-family: inherit; }
        .reset:hover { border-color: #F87171; color: #F87171; }
        .resetArmed { background: #E23636; border-color: #E23636; color: #fff; }
        .backup { margin-top: 22px; display: flex; align-items: center; gap: 10px; flex-wrap: wrap; }
        .backup .kofi { margin-left: 0; }
        .importLbl { display: inline-block; cursor: pointer; }
        .backupMsg { font-size: 12px; color: #8B93AD; }
        .disclaimer { margin-top: 18px; font-size: 11px; color: #5B6588; line-height: 1.55; }
        @media (prefers-reduced-motion: reduce) { * { transition: none !important; animation: none !important; } }
      `}</style>

      <div className="wrap">
        <header>
          <div className="kicker">Chronological watch order · through Oct 2026</div>
          <h1>The Ultimate <em>Star Wars</em> Tracker</h1>
          <p className="sub">Every canon film and series in Lucasfilm's chronological order — with The Clone Wars broken out episode by episode. Check things off and your progress saves automatically.</p>

          <div className="betaBar">
            <span className="betaPill">BETA {APP_VERSION}</span>
            <span className="betaText">Free fan project — bugs expected. <a href={`${GITHUB_REPO_URL}/issues`} target="_blank" rel="noopener noreferrer">Report one</a></span>
            <a className="kofi" href={KOFI_URL} target="_blank" rel="noopener noreferrer">☕ Support on Ko-fi</a>
          </div>

          <div className="gems">
            {SECTIONS.map((s) => {
              const p = progByKey[s.key];
              return (
                <button
                  className="gemWrap"
                  key={s.key}
                  title={`${s.title}: ${p.done}/${p.total}`}
                  aria-label={`${s.title}: ${p.done} of ${p.total} watched. Jump to this era.`}
                  onClick={() => jumpToSection(s.key)}
                >
                  <span className="gem" style={{ borderColor: s.color, boxShadow: p.pct === 100 ? `0 0 10px ${s.color}` : "none" }}>
                    <i style={{ height: `${p.pct}%`, background: s.color, opacity: 0.85 }} />
                  </span>
                  <span className="gemName">{s.short}</span>
                  <span className="gemLabel">{p.done}/{p.total}</span>
                </button>
              );
            })}
          </div>
          <div className="gemHint">Tap a gem to jump to that era</div>

          <div className="bigBar"><div style={{ width: `${overall.pct}%` }} /></div>
          <div className="barMeta"><span>{overall.done} of {overall.total} films &amp; episodes watched</span><span>{overall.pct}%</span></div>

          {done
            ? <div className="sagaDone">🏆 You've watched the whole saga. May the Force be with you, always.</div>
            : <button className="upNext" onClick={goToUpNext} disabled={upNext.mode === "end"} aria-label={upNext.entry ? `Scroll to ${upNext.entry.title}` : "End of list"}>
                {upNext.mode === "end" ? (
                  <span>You've reached the end of the list</span>
                ) : (
                  <span>
                    {{ start: "Start with", continue: "Continue", next: "Up next" }[upNext.mode]}:{" "}
                    {upNext.entry.group ? (
                      <>
                        <b>{upNext.entry.group}</b>
                        {" — "}
                        {upNext.mode === "continue" && upNext.nextEp
                          ? `${upNext.nextEp.code} ${upNext.nextEp.title}`
                          : upNext.entry.epInfo ? `${upNext.entry.epInfo[0].code} ${upNext.entry.epInfo[0].title}` : upNext.entry.title}
                      </>
                    ) : (
                      <>
                        <b>#{NUM[upNext.entry.id]} {upNext.entry.title}</b>
                        {upNext.eps ? ` (${upNext.eps})` : ""}
                        {upNext.nextEp ? ` — next: ${upNext.nextEp.code} ${upNext.nextEp.title}` : ""}
                      </>
                    )}
                  </span>
                )}
                {upNext.mode !== "end" && <span className="upNextGo">↓</span>}
              </button>}
        </header>

        <div className="navWrap">
          <div className="chips">
            {FILTERS.map((f) => (
              <button key={f.key} className={`chip ${filter === f.key ? "chipOn" : ""}`} onClick={() => setFilter(f.key)}>{f.label}</button>
            ))}
            <button className="chip chipRight" onClick={toggleAllOpen}>{allOpen ? "Collapse all episodes" : "Expand all episodes"}</button>
          </div>
        </div>

        {sections}
        {renderSection(EXTRAS_ERA, EXTRAS, extrasProg, false)}
        {nothingShown && filter !== "all" && <div className="empty">{filter === "done" ? "Nothing checked off yet." : "You've watched everything on the list."}</div>}

        <div className="upcoming">
          <b>Not tracked yet:</b> {UPCOMING.join(" · ")}. They'll be added once they're released. Star Wars: Visions and the Legends-era material sit outside Lucasfilm's main timeline, so they aren't included.
        </div>

        <div className="foot">
          <p className="footNote">Progress is saved in this browser on this device — it stays until you clear it here or clear your browser's site data. Use Export to back it up or move it to another device. Order follows Lucasfilm's chronological guide on StarWars.com; anthology series are placed as whole series, as in the guide.</p>
          {resetArm ? (
            <span>
              <button className="reset resetArmed" onClick={purge}>Yes, erase everything</button>{" "}
              <button className="reset" onClick={() => setResetArm(false)}>Keep my progress</button>
            </span>
          ) : (
            <button className="reset" onClick={() => setResetArm(true)}>Clear all progress</button>
          )}
        </div>

        <div className="backup">
          <button className="reset" onClick={exportProgress}>Export progress</button>
          <label className="reset importLbl">
            Import progress
            <input type="file" accept="application/json,.json" hidden onChange={importProgress} />
          </label>
          <a className="kofi" href={KOFI_URL} target="_blank" rel="noopener noreferrer">☕ Support on Ko-fi</a>
          <span className="backupMsg" role="status">{backupMsg}</span>
        </div>
        <p className="disclaimer">
          Fan-made and unofficial. Not affiliated with, endorsed by, or sponsored by Lucasfilm, Disney, or any Star Wars rights holder. All titles and trademarks belong to their respective owners. This tracker is free; Ko-fi support goes to the developer and is not payment for any Star Wars content. v{APP_VERSION}
        </p>
      </div>
    </div>
  );
}
