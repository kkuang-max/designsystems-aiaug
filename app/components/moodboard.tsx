"use client";

import { useEffect, useRef, useState, type FormEvent } from "react";
import { Icon } from "./studio-icon";
import { Modal } from "./modal";

const categories = ["Color", "Typography", "Texture", "Layout", "Feeling"] as const;
type Category = typeof categories[number];
type Reference = { id: string; title: string; category: Category; notes: string; source: string; image: string };
const storageKey = "vibecraft-moodboard-v1";
const starters: Reference[] = [
  { id: "starter-type", title: "A little editorial warmth", category: "Typography", notes: "Warm, quietly editorial, airy. Expressive serif headings paired with a simple everyday sans.", source: "", image: "" },
  { id: "starter-color", title: "Colors from the everyday", category: "Color", notes: "Earthy clay, soft cream, and muted moss. Organic, calm, tactile.", source: "", image: "" },
  { id: "starter-texture", title: "Leave a little texture", category: "Texture", notes: "Tactile, layered, soft. Natural surfaces and small imperfections that feel human.", source: "", image: "" },
];
const blank = (): Reference => ({ id: "", title: "", category: "Feeling", notes: "", source: "", image: "" });
function webUrl(value: string) {
  try { return ["https:", "http:"].includes(new URL(value).protocol); } catch { return false; }
}
function validReference(value: unknown): value is Reference {
  if (!value || typeof value !== "object") return false;
  const r = value as Reference;
  return [r.id, r.title, r.notes, r.source, r.image].every(v => typeof v === "string")
    && r.id.length > 0 && r.title.length > 0 && r.title.length <= 100 && r.notes.length <= 1000
    && categories.includes(r.category) && (!r.source || webUrl(r.source))
    && (!r.image || webUrl(r.image) || /^data:image\/(png|jpeg|webp|gif);base64,[A-Za-z0-9+/=]+$/.test(r.image));
}
function ReferenceImage({ reference }: { reference: Reference }) {
  const [failed, setFailed] = useState(false);
  if (reference.image && !failed) {
    // User-provided remote images and local data URLs cannot use a fixed Next image allowlist.
    // eslint-disable-next-line @next/next/no-img-element
    return <img src={reference.image} alt={reference.title} loading="lazy" referrerPolicy="no-referrer" onError={() => setFailed(true)}/>;
  }
  return <div className={`reference-art art-${reference.category.toLowerCase()}`}>
    {failed ? <><Icon name="eye" size={28}/><span>Image unavailable · edit to replace</span></> : reference.category === "Typography" ? <><span className="reference-aa">Aa.</span><span>Thoughtful by nature.</span></> : reference.category === "Color" ? <><div className="reference-palette">{["#a76145", "#d2b797", "#eee7d7", "#7d8969", "#3c4734"].map(color => <span key={color} style={{ background: color }}/>)}</div><span>Clay. Cream. A little green.</span></> : reference.category === "Texture" ? <><div className="texture-orb"/><span>Perfectly imperfect.</span></> : <><Icon name={reference.category === "Layout" ? "grid" : "sparkle"} size={30}/><span>A feeling worth keeping.</span></>}
  </div>;
}

export function Moodboard({ onExplore, onNotice }: { onExplore: (words: string) => void; onNotice: (message: string) => void }) {
  const [references, setReferences] = useState<Reference[]>(starters);
  const [ready, setReady] = useState(false);
  const [filter, setFilter] = useState("All");
  const [query, setQuery] = useState("");
  const [draft, setDraft] = useState<Reference | null>(null);
  const [error, setError] = useState("");
  const [reading, setReading] = useState(false);
  const fileGeneration = useRef(0);
  const initialNotice = useRef(onNotice);

  useEffect(() => {
    try {
      const raw = localStorage.getItem(storageKey);
      if (raw !== null) {
        const saved: unknown = JSON.parse(raw);
        if (!Array.isArray(saved) || !saved.every(validReference)) throw new Error("invalid board");
        setReferences(saved.slice(0, 30));
      }
    } catch { initialNotice.current("Couldn’t open the saved moodboard. Starter references are shown."); }
    setReady(true);
  }, []);

  function persist(next: Reference[]) {
    try {
      const serialized = JSON.stringify(next);
      if (serialized.length > 2_500_000) throw new Error("board full");
      localStorage.setItem(storageKey, serialized);
      setReferences(next);
      return true;
    } catch { setError("Your board couldn’t be saved. Try a smaller image or remove an older reference."); return false; }
  }
  function open(reference?: Reference) { fileGeneration.current++; setReading(false); setDraft(reference ? { ...reference } : blank()); setError(""); }
  function close() { fileGeneration.current++; setDraft(null); setReading(false); setError(""); }
  function save(event: FormEvent) {
    event.preventDefault();
    if (!draft || reading) return;
    if (draft.source && !webUrl(draft.source)) { setError("Use a full http or https source link."); return; }
    if (draft.image && !draft.image.startsWith("data:image/") && !webUrl(draft.image)) { setError("Use a full http or https image link, or upload a file."); return; }
    const next = { ...draft, title: draft.title.trim(), notes: draft.notes.trim(), id: draft.id || crypto.randomUUID() };
    if (!next.title) { setError("Give this reference a title."); return; }
    if (!draft.id && references.length >= 30) { setError("Your board has 30 references. Remove one to make room."); return; }
    if (persist(draft.id ? references.map(r => r.id === draft.id ? next : r) : [next, ...references])) { close(); onNotice("Reference saved to your moodboard."); }
  }
  function upload(file?: File) {
    if (!file) return;
    if (!["image/png", "image/jpeg", "image/webp", "image/gif"].includes(file.type) || file.size > 600_000) {
      setError("Choose a PNG, JPG, WebP, or GIF under 600 KB."); return;
    }
    const request = ++fileGeneration.current;
    setError(""); setReading(true);
    const reader = new FileReader();
    reader.onload = () => { if (request === fileGeneration.current) { setDraft(d => d ? { ...d, image: String(reader.result) } : null); setReading(false); } };
    reader.onerror = () => { if (request === fileGeneration.current) { setError("Couldn’t read this image. Try another file."); setReading(false); } };
    reader.readAsDataURL(file);
  }
  function download() {
    const url = URL.createObjectURL(new Blob([JSON.stringify({ name: "VibeCraft moodboard", references }, null, 2)], { type: "application/json" }));
    const a = document.createElement("a"); a.href = url; a.download = "vibecraft-moodboard.json"; a.click(); URL.revokeObjectURL(url);
  }
  const visible = references.filter(r => (filter === "All" || r.category === filter) && `${r.title} ${r.notes} ${r.category}`.toLowerCase().includes(query.toLowerCase()));
  return <section className="moodboard-view" aria-label="Inspiration moodboard">
    <div className="moodboard-heading"><div><span className="eyebrow">FOLLOW WHAT CATCHES YOUR EYE</span><h1>A place for <em>possibility.</em></h1><p>Collect the details you love. Find the feeling that connects them.</p></div><div><button className="button" onClick={download} disabled={!ready}><Icon name="export" size={14}/> Save board</button><button className="button dark" disabled={!ready || references.length >= 30} onClick={() => open()}><Icon name="plus" size={14}/> Add reference</button></div></div>
    <div className="board-tools"><div className="board-filters" aria-label="Reference categories">{["All", ...categories].map(category => <button key={category} className={filter === category ? "active" : ""} aria-pressed={filter === category} onClick={() => setFilter(category)}>{category}</button>)}</div><label className="component-search"><Icon name="search" size={14}/><input aria-label="Search references" placeholder="Find a little inspiration…" value={query} onChange={e => setQuery(e.target.value)}/></label></div>
    <div className="board-hint"><Icon name="info" size={14}/><p>Start with the sample references, or add your own. “Explore these words” uses your written notes to shape a direction; images are visual references.</p></div>
    {error && !draft && <p className="board-error" role="alert">{error}</p>}
    {!ready ? <p className="board-hint" role="status">Opening your board…</p> : visible.length ? <div className="reference-grid">{visible.map(reference => <article className="reference-card" key={reference.id}>
      <ReferenceImage key={reference.image} reference={reference}/><div className="reference-content"><div className="reference-meta"><span>{reference.category}</span><button className="icon-button small" aria-label={`Edit ${reference.title}`} onClick={() => open(reference)}><Icon name="edit" size={13}/></button></div><h2>{reference.title}</h2><p>{reference.notes || "What caught your eye? Add a note to remember."}</p>{reference.source && <a href={reference.source} target="_blank" rel="noopener noreferrer">View original reference <span>↗</span></a>}<div className="reference-actions"><button className="text-button" disabled={!reference.notes.trim()} onClick={() => onExplore(reference.notes)}><Icon name="sparkle" size={13}/> Explore these words</button><button className="icon-button small" aria-label={`Remove ${reference.title}`} onClick={() => { if (persist(references.filter(r => r.id !== reference.id))) onNotice("Reference removed."); }}><Icon name="trash" size={13}/></button></div></div>
    </article>)}</div> : <div className="empty-state"><Icon name="layers" size={30}/><h2>{references.length ? "Nothing here just yet." : "Make room for inspiration."}</h2><p>{references.length ? "Try another category or search term." : "Add an image, a link, or a feeling worth remembering."}</p><button className="button" onClick={() => references.length ? (setFilter("All"), setQuery("")) : open()}>{references.length ? "Show all references" : "Add your first reference"}</button></div>}
    <p className="board-storage">{references.length}/30 references · Saved in this browser · Save board to download a copy</p>
    {draft && <Modal title={draft.id ? "A detail worth keeping." : "What caught your eye?"} onClose={close}><form className="reference-form" onSubmit={save}>
      <label>Give it a name<input required maxLength={100} value={draft.title} placeholder="A sun-washed palette, an unexpected type pairing…" onChange={e => setDraft({ ...draft, title: e.target.value })}/></label>
      <label>What inspires you?<select value={draft.category} onChange={e => setDraft({ ...draft, category: e.target.value as Category })}>{categories.map(category => <option key={category}>{category}</option>)}</select></label>
      <label>Image link <span>optional</span><input type="url" value={draft.image.startsWith("data:") ? "" : draft.image} placeholder="https://example.com/inspiration.jpg" onChange={e => { fileGeneration.current++; setReading(false); setDraft({ ...draft, image: e.target.value }); }}/></label>
      <label className="reference-upload"><Icon name="plus" size={16}/><span>{reading ? "Reading image…" : draft.image.startsWith("data:") ? "Image attached · choose another" : "Or upload an image"}</span><input type="file" accept="image/png,image/jpeg,image/webp,image/gif" onChange={e => upload(e.target.files?.[0])}/><small>PNG, JPG, WebP, GIF · up to 600 KB</small></label>
      {draft.image && <div className="reference-image-status"><span>{draft.image.startsWith("data:") ? "Local image attached" : "Image link added"}</span><button type="button" onClick={() => setDraft({ ...draft, image: "" })}>Remove image</button></div>}
      <label>Original source <span>optional</span><input type="url" maxLength={2000} value={draft.source} placeholder="Link to the creator, website, or original work" onChange={e => setDraft({ ...draft, source: e.target.value })}/></label>
      <label>What should this bring to your design?<textarea maxLength={1000} rows={3} value={draft.notes} placeholder="Warm, airy, tactile. I love the soft contrast and generous spacing…" onChange={e => setDraft({ ...draft, notes: e.target.value })}/></label><p className="reference-form-note">Describe the feeling in words to explore it in your design system.</p>
      {error && <p role="alert" className="board-error">{error}</p>}<div className="modal-actions"><button className="button" type="button" onClick={close}>Cancel</button><button className="button dark" disabled={reading} type="submit">{draft.id ? "Save changes" : "Add to moodboard"}</button></div>
    </form></Modal>}
  </section>;
}
