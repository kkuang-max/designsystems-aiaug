"use client";

import { useEffect, useRef, useState, type FormEvent, type ReactNode } from "react";
import { Icon } from "./components/studio-icon";
import { Microinteractions } from "./components/microinteractions";
import { Moodboard } from "./components/moodboard";
import { Modal } from "./components/modal";
import { CheckoutPreview, ComponentsPreview, DashboardPreview, MarketingPreview, themeStyle } from "./components/preview";
import { applyVibes, bodyFonts, colorRoles, contrast, darkSystem, displayFonts, explorePrompt, exportSystem, fixContrast, initialSystem, initialVibes, inkOn, isDesignSystem, mergeUnlocked, rollSystem, type ColorRole, type DesignSystem, type Group, type Locks, type Snapshot, type Vibes } from "@/lib/design-system";

type Tab = "Preview" | "Components" | "Accessibility" | "Moodboard" | "Microinteractions";
type History = { past: DesignSystem[]; present: DesignSystem; future: DesignSystem[] };
const storageKey = "vibecraft-studio-v1";
const initialLocks: Locks = { color: false, typography: false, shape: false, motion: false };

function Range({ label, value, min, max, step = 1, unit = "", onChange }: { label: string; value: number; min: number; max: number; step?: number; unit?: string; onChange: (value: number) => void }) {
  return <label className="range-control"><span><span>{label}</span><output>{value}{unit}</output></span><input type="range" aria-label={label} min={min} max={max} step={step} value={value} onChange={event => onChange(Number(event.target.value))}/></label>;
}
function TokenSection({ title, icon, group, open, onOpen, locked, onLock, summary, children }: { title: string; icon: ReactNode; group: Group; open: boolean; onOpen: () => void; locked: boolean; onLock: () => void; summary: ReactNode; children: ReactNode }) {
  return <section className={`token-section ${open ? "expanded" : ""}`}><div className="token-section-heading"><button className="token-disclosure" onClick={onOpen} aria-expanded={open} aria-controls={`panel-${group}`}><span className="token-symbol">{icon}</span><span><strong>{title}</strong><span className="token-summary">{summary}</span></span><Icon name="down" size={14} style={{ transform: open ? "rotate(180deg)" : undefined }}/></button><button className={`lock-button ${locked ? "locked" : ""}`} aria-label={`${locked ? "Unlock" : "Lock"} ${title.toLowerCase()}`} aria-pressed={locked} onClick={onLock} title={locked ? "Preserved when exploring or rolling" : "Lock to preserve while exploring"}><Icon name={locked ? "lock" : "unlock"} size={14}/></button></div>{open && <Modal title={title} onClose={onOpen}><div id={`panel-${group}`} className="token-section-body token-editor">{children}</div></Modal>}</section>;
}

export default function Home() {
  const [history, setHistory] = useState<History>({ past: [], present: initialSystem, future: [] });
  const system = history.present;
  const [vibes, setVibes] = useState(initialVibes);
  const [locks, setLocks] = useState(initialLocks);
  const [prompt, setPrompt] = useState("warm, tactile, quietly editorial");
  const [tab, setTab] = useState<Tab>("Preview");
  const [preview, setPreview] = useState("Marketing page");
  const [mobile, setMobile] = useState(false);
  const [dark, setDark] = useState(false);
  const [vibesOpen, setVibesOpen] = useState(false);
  const [openSections, setOpenSections] = useState<Group[]>([]);
  const [query, setQuery] = useState("");
  const [snapshots, setSnapshots] = useState<Snapshot[]>([]);
  const [modal, setModal] = useState<"snapshots" | "export" | "help" | null>(null);
  const [compareId, setCompareId] = useState("");
  const [snapshotName, setSnapshotName] = useState("");
  const [format, setFormat] = useState<"css" | "json">("css");
  const [notice, setNotice] = useState("");
  const [ready, setReady] = useState(false);
  const [mode, setMode] = useState<"ai" | "local">("ai");
  const [aiConfigured, setAiConfigured] = useState<boolean | null>(null);
  const [generating, setGenerating] = useState(false);
  const [generationError, setGenerationError] = useState("");
  const [toolsOpen, setToolsOpen] = useState(false);
  const activeRequest = useRef<AbortController | null>(null);
  const liveDesign = useRef({ system, locks });
  liveDesign.current = { system, locks };
  const [saveState, setSaveState] = useState("Saved on this device");
  const [vision, setVision] = useState("none");
  const [reducedMotion, setReducedMotion] = useState(false);
  const canvasRef = useRef<HTMLElement>(null);
  useEffect(() => { if (canvasRef.current) canvasRef.current.scrollTop = 0; }, [tab]);
  const noticeTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    const controller = new AbortController();
    fetch("/api/design", { signal: controller.signal, cache: "no-store" })
      .then(response => response.ok ? response.json() : Promise.reject())
      .then(data => setAiConfigured(data.configured === true))
      .catch(() => {});
    return () => { controller.abort(); activeRequest.current?.abort(); };
  }, []);

  useEffect(() => {
    try {
      const saved = JSON.parse(localStorage.getItem(storageKey) || "null");
      if (saved && isDesignSystem(saved.system)) {
        setHistory({ past: [], present: saved.system, future: [] });
        if (typeof saved.prompt === "string") setPrompt(saved.prompt.slice(0, 4000));
        if (saved.vibes && Object.keys(initialVibes).every(k => typeof saved.vibes[k] === "number" && saved.vibes[k] >= 0 && saved.vibes[k] <= 100)) setVibes(saved.vibes);
        if (saved.locks && Object.keys(initialLocks).every(k => typeof saved.locks[k] === "boolean")) setLocks(saved.locks);
        if (Array.isArray(saved.snapshots)) setSnapshots(saved.snapshots.filter((s: Snapshot) => typeof s.id === "string" && typeof s.name === "string" && typeof s.created === "string" && isDesignSystem(s.system)).slice(0, 20));
      }
    } catch { setSaveState("Device storage unavailable"); }
    setReady(true);
    return () => { if (noticeTimer.current) clearTimeout(noticeTimer.current); };
  }, []);
  useEffect(() => {
    if (!ready) return;
    const timer = setTimeout(() => {
      try { localStorage.setItem(storageKey, JSON.stringify({ system, vibes, locks, prompt, snapshots })); setSaveState("Saved on this device"); }
      catch { setSaveState("Couldn’t save · export a copy"); }
    }, 300);
    return () => clearTimeout(timer);
  }, [ready, system, vibes, locks, prompt, snapshots]);

  function notify(message: string) {
    setNotice(message);
    if (noticeTimer.current) clearTimeout(noticeTimer.current);
    noticeTimer.current = setTimeout(() => setNotice(""), 4200);
  }
  function commit(next: DesignSystem | ((current: DesignSystem) => DesignSystem)) {
    setHistory(h => ({ past: [...h.past.slice(-59), h.present], present: typeof next === "function" ? next(h.present) : next, future: [] }));
  }
  function patch<K extends keyof DesignSystem>(key: K, value: DesignSystem[K]) { commit(d => ({ ...d, [key]: value })); }
  function setColor(role: ColorRole, color: string) { commit(d => ({ ...d, colors: { ...d.colors, [role]: color } })); }
  function undo() { setHistory(h => h.past.length ? { past: h.past.slice(0,-1), present: h.past[h.past.length-1], future: [h.present, ...h.future] } : h); }
  function redo() { setHistory(h => h.future.length ? { past: [...h.past, h.present], present: h.future[0], future: h.future.slice(1) } : h); }
  function changeVibe(key: keyof Vibes, value: number) { const next = { ...vibes, [key]: value }; setVibes(next); commit(d => applyVibes(d, next, locks)); }
  function toggleSection(group: Group) { setOpenSections(s => s.includes(group) ? [] : [group]); }
  async function generate(event: FormEvent) {
    event.preventDefault();
    if (!prompt.trim() || activeRequest.current) return;
    setGenerationError("");
    if (mode === "local") {
      const next = explorePrompt(system, prompt, vibes, locks);
      setVibes(next.vibes); commit(next.system);
      notify("Local direction explored. No API credits used.");
      return;
    }
    if (aiConfigured === false) {
      setGenerationError("Claude isn’t connected. Add the server key or choose Local mode.");
      return;
    }
    if (!Object.values(locks).some(locked => !locked)) {
      setGenerationError("Unlock a token category so Claude can change it.");
      return;
    }
    const controller = new AbortController();
    activeRequest.current = controller;
    setGenerating(true);
    try {
      const response = await fetch("/api/design", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ prompt, system, vibes, locks }), signal: AbortSignal.any([controller.signal, AbortSignal.timeout(55_000)]) });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || "AI couldn’t generate a direction. Try Local mode.");
      if (!isDesignSystem(data.system) || !data.vibes || !Object.keys(initialVibes).every(key => typeof data.vibes[key] === "number" && data.vibes[key] >= 0 && data.vibes[key] <= 100)) throw new Error("AI returned unsupported options. Your current design is unchanged.");
      if (controller.signal.aborted) return;
      commit(mergeUnlocked(liveDesign.current.system, data.system, liveDesign.current.locks));
      setVibes(data.vibes); setTab("Preview");
      notify("Your AI direction is ready. Locked tokens were preserved.");
    } catch (error) {
      if (!controller.signal.aborted) setGenerationError(error instanceof Error ? error.message : "Generation failed. Try Local mode.");
    } finally {
      if (activeRequest.current === controller) { activeRequest.current = null; setGenerating(false); }
    }
  }
  function cancelGeneration() { activeRequest.current?.abort(); activeRequest.current = null; setGenerating(false); notify("Generation cancelled. A request already sent may still use credits."); }
  function saveSnapshot(event: FormEvent) {
    event.preventDefault();
    if (snapshots.length >= 20) { notify("You have 20 snapshots. Remove one to make room."); return; }
    const snapshot: Snapshot = { id: crypto.randomUUID(), name: snapshotName.trim().slice(0,80) || `Exploration ${snapshots.length + 1}`, system: structuredClone(system), created: new Date().toISOString() };
    setSnapshots(s => [snapshot, ...s]); setSnapshotName(""); notify("Snapshot saved on this device.");
  }
  async function copyExport() {
    try { await navigator.clipboard.writeText(exportSystem(system, format)); notify("Tokens copied to clipboard."); }
    catch { notify("Clipboard unavailable. Use Download instead."); }
  }
  function downloadExport() {
    const url = URL.createObjectURL(new Blob([exportSystem(system, format)], { type: format === "css" ? "text/css" : "application/json" }));
    const a = document.createElement("a"); a.href = url; a.download = `vibecraft-tokens.${format}`; a.click(); URL.revokeObjectURL(url); notify("Your design tokens have been exported.");
  }
  const visibleSystem = dark ? darkSystem(system) : system;
  const pairs: { name: string; role: ColorRole; foreground: string; background: string; target: number; detail: string }[] = [
    { name: "Body text", role: "text", foreground: visibleSystem.colors.text, background: visibleSystem.colors.background, target: 4.5, detail: "Text on background" },
    { name: "Secondary text", role: "muted", foreground: visibleSystem.colors.muted, background: visibleSystem.colors.background, target: 4.5, detail: "Muted text on background" },
    { name: "Card text", role: "text", foreground: visibleSystem.colors.text, background: visibleSystem.colors.surface, target: 4.5, detail: "Text on surface" },
    { name: "Primary button", role: "primary", foreground: inkOn(visibleSystem.colors.primary), background: visibleSystem.colors.primary, target: 4.5, detail: "Automatic ink on primary" },
    { name: "Text link", role: "primary", foreground: visibleSystem.colors.primary, background: visibleSystem.colors.background, target: 4.5, detail: "Primary on background" },
  ];
  const failing = pairs.filter(p => contrast(p.foreground, p.background) < p.target).length;
  const comparison = snapshots.find(s => s.id === compareId);
  const unlocked = Object.values(locks).filter(v => !v).length;
  const activeFilter = vision === "none" ? undefined : vision === "monochrome" ? "grayscale(1)" : `url(#vision-${vision})`;
  function canvas(d: DesignSystem, mini = false) {
    const themed = dark ? darkSystem(d) : d;
    return <div className={`preview-surface ${mobile && !mini ? "mobile-canvas" : ""} ${mini ? "comparison-surface" : ""} ${reducedMotion ? "reduce-motion" : ""}`} style={{ ...themeStyle(themed), filter: activeFilter }}>
      {preview === "Marketing page" ? <MarketingPreview onAction={notify}/> : preview === "App dashboard" ? <DashboardPreview onAction={notify}/> : <CheckoutPreview/>}
    </div>;
  }

  return <div className="studio-shell studio-viewport">
    <a href="#canvas" className="skip-link">Skip to preview</a>
    <header className="studio-header"><div className="studio-identity"><a href="/" className="studio-wordmark" aria-label="VibeCraft home"><span className="logo-shape"><span/><span/><span/><span/></span>VibeCraft<span className="beta-label">STUDIO</span></a><span className="header-divider"/><span className="project-label" title={system.name}>{system.name}</span></div><nav className="workspace-tabs" aria-label="Workspace">{(["Preview", "Components", "Microinteractions", "Accessibility", "Moodboard"] as Tab[]).map(t => <button key={t} className={tab === t ? "active" : ""} onClick={() => setTab(t)} aria-current={tab === t ? "page" : undefined}><Icon name={t === "Preview" ? "eye" : t === "Components" ? "grid" : t === "Moodboard" ? "layers" : t === "Microinteractions" ? "play" : "shield"} size={15}/>{t}{t === "Accessibility" && failing > 0 && <span className="issue-count">{failing}</span>}</button>)}</nav><div className="header-actions"><button className="button tools-toggle" aria-controls="design-tools" aria-expanded={toolsOpen} onClick={() => setToolsOpen(!toolsOpen)}><Icon name="grid" size={14}/>Tools</button><button className="button subtle snapshots-trigger" onClick={() => setModal("snapshots")}><Icon name="layers" size={15}/><span>Snapshots</span>{snapshots.length > 0 && <span className="count">{snapshots.length}</span>}</button><button className="button dark" onClick={() => setModal("export")}><Icon name="export" size={15}/><span>Export</span></button></div></header>
    <div className="workspace studio-workspace">
      {toolsOpen && <button className="tools-backdrop" aria-label="Close design tools" onClick={() => setToolsOpen(false)}/>}
      <aside id="design-tools" className={`controls-panel studio-tools ${toolsOpen ? "tools-open" : ""}`} aria-label="Design controls">
        <div className="panel-intro"><h1>What should it feel like?</h1><button type="button" className="icon-button small" aria-label="About exploration" onClick={() => setModal("help")}><Icon name="info" size={14}/></button></div>
        <form className="vibe-form" onSubmit={generate} aria-busy={generating}>
          <label className="vibe-search"><Icon name="search" size={17}/><textarea aria-label="Describe your design vibe" aria-describedby="vibe-search-help" placeholder="Describe a specific vibe, audience, or style…" value={prompt} maxLength={4000} rows={2} onChange={e => setPrompt(e.target.value)} onKeyDown={e => { if (e.key === "Enter" && !e.shiftKey && !e.nativeEvent.isComposing) { e.preventDefault(); e.currentTarget.form?.requestSubmit(); } }}/></label>
          <div className="generation-mode"><label>Explore with<select aria-label="Generation mode" value={mode} disabled={generating} onChange={e => { setMode(e.target.value as "ai" | "local"); setGenerationError(""); }}><option value="ai">AI · uses API credits</option><option value="local">Local · no credits</option></select></label>{mode === "ai" && <span>{aiConfigured === true ? "Key connected" : aiConfigured === false ? "Key missing" : "AI generation"}</span>}</div>
          <button className="button dark generate-button" type="submit" disabled={generating || !prompt.trim() || (mode === "ai" && (aiConfigured === false || !Object.values(locks).some(locked => !locked)))}><Icon name="sparkle" size={14}/>{generating ? "Creating your direction…" : mode === "ai" ? "Generate with AI" : "Explore locally"}</button>
          <p id="vibe-search-help" className="generation-hint">Enter to apply · Shift + Enter for a new line. Updates unlocked colors, type, shape, and motion.</p>
          {generating && <button className="text-button" type="button" onClick={cancelGeneration}>Cancel generation</button>}
          {mode === "ai" && !Object.values(locks).some(locked => !locked) && <p className="generation-hint">Unlock a token category to generate.</p>}
          {mode === "ai" && aiConfigured === false && <p className="generation-hint">Configure the server key or select Local mode.</p>}
          {generationError && <div className="generation-error" role="alert">{generationError}<button type="button" onClick={() => { setMode("local"); setGenerationError(""); }}>Use Local mode instead →</button></div>}
        </form>
        <details className="starting-points"><summary>Try a starting point</summary><div className="prompt-starters">{["warm ceramic studio", "bold playful pink", "cool minimal tech"].map(idea => <button key={idea} onClick={() => { setPrompt(idea); const next = explorePrompt(system, idea, vibes, locks); setVibes(next.vibes); commit(next.system); notify(`Exploring ${idea}.`); }}>{idea}<span>↗</span></button>)}</div></details>
        <div className="vibe-tags">{prompt.split(/[,·]/).map(s => s.trim()).filter(Boolean).slice(0,3).map((tag,i) => <span key={`${tag}-${i}`}>{tag.slice(0,28)}<button aria-label={`Remove keyword ${tag}`} onClick={() => setPrompt(prompt.split(/[,·]/).filter((_,j) => j !== i).join(", "))}><Icon name="close" size={10}/></button></span>)}</div>
        <section className="vibe-sliders"><button className="section-toggle" aria-expanded={vibesOpen} onClick={() => setVibesOpen(!vibesOpen)}><Icon name="sparkle" size={14}/><span>Vibe continuum</span><Icon name="down" size={13} style={{ transform: vibesOpen ? "rotate(180deg)" : undefined }}/></button>{vibesOpen ? <Modal title="Vibe continuum" onClose={() => setVibesOpen(false)}><div className="vibe-ranges">{([ ["warmth", "Cool", "Warm"], ["density", "Airy", "Dense"], ["contrast", "Soft", "Bold"], ["playfulness", "Restrained", "Playful"], ["tactility", "Flat", "Tactile"] ] as [keyof Vibes,string,string][]).map(([key,left,right]) => <label key={key}><span><span>{left}</span><span>{right}</span></span><input aria-label={key} type="range" min="0" max="100" value={vibes[key]} onChange={e => changeVibe(key, +e.target.value)}/></label>)}<p>Locked categories stay as they are.</p></div></Modal> : <p className="vibe-summary">{vibes.warmth > 50 ? "Warm" : "Cool"}<span>·</span>{vibes.density < 50 ? "Airy" : "Compact"}<span>·</span>{vibes.playfulness > 50 ? "Expressive" : "Considered"}</p>}</section>
        <div className="tokens-heading"><h2>Tokens</h2><button disabled={!unlocked} onClick={() => { commit(d => rollSystem(d, vibes, locks)); notify(`${unlocked} unlocked categories reimagined.`); }} className="roll-button"><Icon name="roll" size={13}/> Roll {unlocked} unlocked</button></div>
        <div className="token-stack">
          <TokenSection title="Color palette" icon={<span className="palette-icon"><i/><i/><i/></span>} group="color" open={openSections.includes("color")} onOpen={() => toggleSection("color")} locked={locks.color} onLock={() => setLocks({ ...locks, color: !locks.color })} summary="A world in six colors">
            <div className="palette-strip">{colorRoles.map(role => <label key={role} style={{ background: system.colors[role] }} title={`${role}: ${system.colors[role]}`}><input type="color" aria-label={`${role} color`} value={system.colors[role]} onChange={e => setColor(role,e.target.value)}/></label>)}</div><div className="color-fields">{colorRoles.map(role => <label key={role}><span className="color-dot" style={{ background: system.colors[role] }}><input type="color" aria-label={`Edit ${role} color`} value={system.colors[role]} onChange={e => setColor(role,e.target.value)}/></span><span>{role}</span><input aria-label={`${role} hex code`} key={`${role}-${system.colors[role]}`} defaultValue={system.colors[role].toUpperCase()} maxLength={7} onBlur={e => { if (/^#[\da-f]{6}$/i.test(e.target.value)) setColor(role,e.target.value); else { e.target.value = system.colors[role].toUpperCase(); notify("Use a six-digit hex color, like #A4472F."); } }} onKeyDown={e => { if (e.key === "Enter") e.currentTarget.blur(); }}/></label>)}</div>
          </TokenSection>
          <TokenSection title="Typography" icon={<span className="aa-symbol">Aa</span>} group="typography" open={openSections.includes("typography")} onOpen={() => toggleSection("typography")} locked={locks.typography} onLock={() => setLocks({ ...locks, typography: !locks.typography })} summary={`${system.displayFont} / ${system.bodyFont}`}><label className="select-control">Display font<select value={system.displayFont} onChange={e => patch("displayFont",e.target.value)}>{displayFonts.map(font => <option key={font}>{font}</option>)}</select></label><label className="select-control">Body font<select value={system.bodyFont} onChange={e => patch("bodyFont",e.target.value)}>{bodyFonts.map(font => <option key={font}>{font}</option>)}</select></label><Range label="Type scale" min={1.05} max={1.6} step={0.01} value={system.typeScale} onChange={v => patch("typeScale",v)}/><Range label="Letter spacing" min={-0.08} max={0.1} step={0.005} unit="em" value={system.tracking} onChange={v => patch("tracking",v)}/></TokenSection>
          <TokenSection title="Shape & depth" icon={<span className="shape-symbol"><i/><i/></span>} group="shape" open={openSections.includes("shape")} onOpen={() => toggleSection("shape")} locked={locks.shape} onLock={() => setLocks({ ...locks, shape: !locks.shape })} summary={`${system.radius}px corners · ${system.depth} shadows`}><Range label="Corner radius" min={0} max={32} value={system.radius} unit="px" onChange={v => patch("radius",v)}/><Range label="Border weight" min={0} max={4} step={0.5} value={system.border} unit="px" onChange={v => patch("border",v)}/><Range label="Spacing" min={12} max={40} value={system.spacing} unit="px" onChange={v => patch("spacing",v)}/><div className="segmented depth-options" aria-label="Shadow style">{(["flat", "soft", "offset", "glass"] as const).map(depth => <button key={depth} aria-pressed={system.depth === depth} className={system.depth === depth ? "selected" : ""} onClick={() => patch("depth",depth)}>{depth}</button>)}</div></TokenSection>
          <section className="token-section"><div className="token-section-heading"><button className="token-disclosure" aria-current={tab === "Microinteractions" ? "page" : undefined} onClick={() => { setTab("Microinteractions"); setToolsOpen(false); }}><span className="token-symbol"><Icon name="play" size={21}/></span><span><strong>Microinteractions</strong><span className="token-summary">{system.duration}ms · {system.easing} · Open playground</span></span><Icon name="arrow" size={14}/></button><button className={`lock-button ${locks.motion ? "locked" : ""}`} aria-label={`${locks.motion ? "Unlock" : "Lock"} motion`} aria-pressed={locks.motion} onClick={() => setLocks({ ...locks, motion: !locks.motion })}><Icon name={locks.motion ? "lock" : "unlock"} size={14}/></button></div></section>
        </div><div className="panel-footnote"><Icon name="lock" size={12}/><p>Love something? Lock it.<br/>Keep exploring the rest.</p></div>
      </aside>
      <div className="studio-main-column">
        {tab !== "Moodboard" && <div className="canvas-toolbar"><div className="canvas-toolbar-left">{tab === "Preview" ? <div className="segmented scene-tabs">{["Marketing page", "App dashboard", "Checkout form"].map(scene => <button key={scene} className={preview === scene ? "selected" : ""} aria-pressed={preview === scene} onClick={() => setPreview(scene)}>{scene}</button>)}</div> : tab === "Components" ? <label className="component-search"><Icon name="search" size={15}/><input type="search" placeholder="Find a component…" aria-label="Find a component" value={query} onChange={e => setQuery(e.target.value)}/></label> : tab === "Microinteractions" ? <div className="toolbar-label"><Icon name="play" size={15}/> Give every interaction a little intention.</div> : <div className="toolbar-label"><Icon name="shield" size={15}/> A little care goes a long way.</div>}</div><div className="canvas-toolbar-right">{tab === "Preview" && <div className="segmented icon-segment"><button aria-label="Desktop preview" aria-pressed={!mobile} className={!mobile ? "selected" : ""} onClick={() => setMobile(false)}><Icon name="desktop" size={15}/></button><button aria-label="Mobile preview" aria-pressed={mobile} className={mobile ? "selected" : ""} onClick={() => setMobile(true)}><Icon name="mobile" size={15}/></button></div>}<div className="segmented icon-segment"><button aria-label="Light preview" aria-pressed={!dark} className={!dark ? "selected" : ""} onClick={() => setDark(false)}><Icon name="sun" size={15}/></button><button aria-label="Dark preview" aria-pressed={dark} className={dark ? "selected" : ""} onClick={() => setDark(true)}><Icon name="moon" size={15}/></button></div><span className="toolbar-divider"/><button className="icon-button" aria-label="Undo token change" disabled={!history.past.length} onClick={undo}><Icon name="undo" size={15}/></button><button className="icon-button" aria-label="Redo token change" disabled={!history.future.length} onClick={redo}><Icon name="redo" size={15}/></button></div></div>}
        <main ref={canvasRef} id="canvas" className="canvas-area studio-scroll-content" tabIndex={-1}>
        {tab === "Microinteractions" ? <Microinteractions system={visibleSystem} reducedMotion={reducedMotion} onReducedMotion={setReducedMotion} onChange={tokens => commit(current => ({ ...current, ...tokens }))}/> : tab === "Moodboard" ? <Moodboard onNotice={notify} onExplore={words => { const next = explorePrompt(system, words, vibes, locks); setPrompt(words); setVibes(next.vibes); commit(next.system); setTab("Preview"); notify("Exploring your reference notes. Locked tokens are preserved."); }}/> : comparison && tab === "Preview" ? <div className="comparison-grid"><div><div className="compare-label"><span>Current exploration</span><span>LIVE</span></div>{canvas(system,true)}</div><div><div className="compare-label"><span>{comparison.name}</span><button onClick={() => setCompareId("")} aria-label="Close comparison"><Icon name="close" size={14}/></button></div>{canvas(comparison.system,true)}</div></div> : tab === "Preview" ? <div className={`canvas-stage ${mobile ? "device-stage" : ""}`}>{canvas(system)}</div> : tab === "Components" ? <div className={`preview-surface gallery-surface ${reducedMotion ? "reduce-motion" : ""}`} style={{ ...themeStyle(visibleSystem), filter: activeFilter }}><div className="gallery-heading"><span className="sample-eyebrow">THE BUILDING BLOCKS</span><h1>Details make the difference.</h1><p>Your tokens, in all their everyday forms.</p></div><ComponentsPreview query={query} onAction={notify}/></div> : <div className="accessibility-view"><div className="accessibility-heading"><span className="eyebrow">DESIGN THAT WELCOMES EVERYONE</span><h1>Good looks. <em>Better access.</em></h1><p>Check the small details that make your system work for more people.</p></div><div className="a11y-summary"><div><span className={`summary-icon ${failing ? "needs-care" : ""}`}><Icon name={failing ? "info" : "check"} size={22}/></span><div><h2>{failing ? `${failing} ${failing === 1 ? "pair needs" : "pairs need"} a little care` : "Your checked pairs look good"}</h2><p>{pairs.length-failing} of {pairs.length} color pairs meet WCAG AA for normal text · {dark ? "dark" : "light"} preview</p></div></div><span className="a11y-label">CONTRAST CHECK</span></div><section className="contrast-list" aria-label="Contrast results">{pairs.map(pair => { const ratio = contrast(pair.foreground,pair.background); const pass = ratio >= pair.target; return <article className="contrast-row" key={pair.name}><span className="contrast-swatch" style={{ color: pair.foreground, background: pair.background }}>Aa</span><div className="contrast-name"><h3>{pair.name}</h3><p>{pair.detail}</p></div><span className="contrast-ratio">{ratio.toFixed(2)}<small>:1</small></span><span className={`result-badge ${pass ? "pass" : "fail"}`}>{pass ? <Icon name="check" size={12}/> : <Icon name="info" size={12}/>} {pass ? ratio >= 7 ? "AAA" : "AA" : "Needs care"}</span>{!pass && !dark ? <button className="button small" onClick={() => { if (pair.name === "Primary button") setColor("primary",fixContrast(system.colors.primary,pair.foreground)); else setColor(pair.role,fixContrast(pair.foreground,pair.background)); notify("Color adjusted to meet 4.5:1 contrast. Review the other pairs too."); }}>Auto-fix <Icon name="sparkle" size={12}/></button> : <span className="contrast-check">{pass ? "4.5:1 minimum" : "Adjust light tokens first"}</span>}</article>; })}</section><div className="a11y-tools"><section><Icon name="eye" size={22}/><h2>A different point of view.</h2><p>Approximate how your palette may appear with different types of color vision.</p><label className="select-control">Color vision simulation<select value={vision} onChange={e => setVision(e.target.value)}><option value="none">Standard vision</option><option value="protanopia">Protanopia (red-blind)</option><option value="deuteranopia">Deuteranopia (green-blind)</option><option value="tritanopia">Tritanopia (blue-blind)</option><option value="monochrome">Monochromacy</option></select></label><div className="simulation-swatches" style={{ filter: activeFilter }}>{colorRoles.map(role => <span key={role} style={{ background: visibleSystem.colors[role] }}/>)}</div><small>Simulation is approximate, not a diagnostic tool.</small></section><section><Icon name="play" size={22}/><h2>A gentler pace.</h2><p>Motion should add delight without getting in the way. Preview a calmer version.</p><label className="motion-setting"><span>Reduce preview motion</span><input type="checkbox" role="switch" checked={reducedMotion} onChange={e => setReducedMotion(e.target.checked)}/></label><p className="motion-detail">Your device’s reduced motion preference is always respected.</p><button className="text-button" onClick={() => { setTab("Microinteractions"); setOpenSections([]); }}>Open motion playground <span>↗</span></button></section></div><p className="a11y-disclaimer"><Icon name="info" size={14}/> These checks cover selected text/color pairs, not a complete accessibility audit. Test keyboard use, content, and semantics in your final product.</p></div>}
        <div className="canvas-status"><span><span className="live-dot"/> All changes, live.</span><button onClick={() => setTab("Accessibility")}><Icon name="shield" size={13}/>{failing ? `${failing} contrast ${failing === 1 ? "pair" : "pairs"} to review` : "Checked colors meet AA"}<Icon name="arrow" size={12}/></button><span className="status-save">{ready ? saveState : "Opening your studio…"}</span></div>
        </main>
      </div>
    </div>
    <footer className="studio-footer"><span>A space for your next <em>something.</em></span><div><span>EXPLORE. REFINE. MAKE IT YOURS.</span><button className="icon-button small" onClick={() => setModal("help")} aria-label="Studio guide"><Icon name="info" size={14}/></button></div></footer>
    {notice && <div className="toast" role="status"><Icon name="check" size={16}/>{notice}<button aria-label="Dismiss notification" onClick={() => setNotice("")}><Icon name="close" size={13}/></button></div>}
    {modal === "export" && <Modal title="Take your system with you." onClose={() => setModal(null)}><p className="modal-description">Your current light-mode tokens, ready for your next project. Load the selected fonts in your destination app.</p><div className="segmented export-tabs"><button className={format === "css" ? "selected" : ""} onClick={() => setFormat("css")}>CSS variables</button><button className={format === "json" ? "selected" : ""} onClick={() => setFormat("json")}>Design Tokens JSON</button></div><pre className="export-code" tabIndex={0}>{exportSystem(system,format)}</pre><div className="modal-actions"><button className="button" onClick={copyExport}><Icon name="copy" size={15}/> Copy tokens</button><button className="button dark" onClick={downloadExport}><Icon name="export" size={15}/> Download .{format}</button></div></Modal>}
    {modal === "snapshots" && <Modal title="Keep the good ones." onClose={() => setModal(null)} wide><p className="modal-description">Save an exploration, come back to it, or put two directions side by side. Stored on this device.</p><form className="snapshot-form" onSubmit={saveSnapshot}><input aria-label="Snapshot name" placeholder={`Name this exploration…`} value={snapshotName} maxLength={80} onChange={e => setSnapshotName(e.target.value)}/><button className="button dark" disabled={snapshots.length >= 20}><Icon name="plus" size={15}/> Save snapshot</button></form>{snapshots.length === 0 ? <div className="empty-state"><Icon name="layers" size={32}/><h3>A little room for possibility.</h3><p>Save your first exploration above. You can keep up to 20.</p></div> : <div className="snapshot-grid">{snapshots.map(snapshot => <article key={snapshot.id} className="snapshot-card"><div className="snapshot-colors">{colorRoles.map(role => <span key={role} style={{ background: snapshot.system.colors[role] }}/>)}</div><div className="snapshot-card-body"><h3>{snapshot.name}</h3><p>{snapshot.system.displayFont} · {snapshot.system.radius}px · {snapshot.system.depth}</p><div><button className="button small" onClick={() => { commit(structuredClone(snapshot.system)); setModal(null); notify(`Restored “${snapshot.name}”.`); }}>Restore</button><button className="button small" onClick={() => { setCompareId(snapshot.id); setTab("Preview"); setMobile(false); setModal(null); }}><Icon name="compare" size={13}/> Compare</button><button className="icon-button" aria-label={`Delete snapshot ${snapshot.name}`} onClick={() => { setSnapshots(s => s.filter(x => x.id !== snapshot.id)); if (compareId === snapshot.id) setCompareId(""); }}><Icon name="trash" size={14}/></button></div></div></article>)}</div>}</Modal>}
    {modal === "help" && <Modal title="A little room to explore." onClose={() => setModal(null)}><div className="help-content"><p>VibeCraft is your space to turn an abstract feeling into a design system you can see and touch.</p><ol><li><strong>Describe a feeling.</strong> Select AI and click Generate with AI to use the configured server key. It generates supported studio tokens from your brief and current options. Local mode uses keywords without API calls or credits.</li><li><strong>Follow your curiosity.</strong> Adjust color, type, shape, and motion. Every preview shares the same tokens.</li><li><strong>Keep what works.</strong> Lock categories, roll the rest, and save snapshots to compare.</li><li><strong>Make it usable.</strong> Review contrast, try reduced motion, then export your CSS or design tokens.</li></ol><p><strong>Keep asking:</strong> Who is this for? Should it feel established or experimental? Do you want the same personality in a dashboard and a checkout? Try changing one quality at a time and compare snapshots.</p><p>Snapshots and your current system are saved in this browser. Export a copy to keep them beyond this device.</p></div></Modal>}
    <svg className="vision-filters" aria-hidden="true"><defs><filter id="vision-protanopia" colorInterpolationFilters="sRGB"><feColorMatrix type="matrix" values=".152286 1.052583 -.204868 0 0 .114503 .786281 .099216 0 0 -.003882 -.048116 1.051998 0 0 0 0 0 1 0"/></filter><filter id="vision-deuteranopia" colorInterpolationFilters="sRGB"><feColorMatrix type="matrix" values=".367322 .860646 -.227968 0 0 .280085 .672501 .047413 0 0 -.011820 .042940 .968881 0 0 0 0 0 1 0"/></filter><filter id="vision-tritanopia" colorInterpolationFilters="sRGB"><feColorMatrix type="matrix" values="1.255528 -.076749 -.178779 0 0 -.078411 .930809 .147602 0 0 .004733 .691367 .303900 0 0 0 0 0 1 0"/></filter></defs></svg>
  </div>;
}
